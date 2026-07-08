import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// POST /api/leads/import - Parse CSV/XLS and return preview with duplicate detection
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin or super_admin can import
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  const isXls = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

  let rows: Record<string, string>[] = [];
  let headers: string[] = [];

  if (isXls) {
    // Parse XLS/XLSX file - binary format, must read as ArrayBuffer
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Try multiple parsing approaches for maximum compatibility
      let workbook: XLSX.WorkBook | null = null;

      // Approach 1: Read from Buffer with "buffer" type
      try {
        workbook = XLSX.read(buffer, { type: "buffer" });
      } catch (e1) {
        console.log("XLS approach 1 (buffer) failed, trying approach 2...");
        // Approach 2: Read from base64
        try {
          const base64 = buffer.toString("base64");
          workbook = XLSX.read(base64, { type: "base64" });
        } catch (e2) {
          console.log("XLS approach 2 (base64) failed, trying approach 3...");
          // Approach 3: Read from Uint8Array
          const uint8Array = new Uint8Array(arrayBuffer);
          workbook = XLSX.read(uint8Array, { type: "array" });
        }
      }

      if (!workbook) {
        return NextResponse.json({ error: "Failed to parse XLS/XLSX file. Please try saving it as .xlsx format or CSV." }, { status: 400 });
      }

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return NextResponse.json({ error: "File has no sheets" }, { status: 400 });
      }
      const sheet = workbook.Sheets[sheetName];
      // Use cellNF + raw:false for date cells so we get a human-readable string instead of
      // an Excel serial number (e.g. "15.01.2024" instead of "45658").
      // For other cell types (text/number), raw:false still returns the formatted value
      // which is usually what we want (e.g. phone numbers without scientific notation).
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
        defval: "",
        raw: false,
        dateNF: "dd.mm.yyyy",
      });

      if (jsonData.length === 0) {
        return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
      }

      headers = Object.keys(jsonData[0]);
      // Coerce all values to string for downstream processing
      rows = jsonData.map((r) => {
        const out: Record<string, string> = {};
        Object.entries(r).forEach(([k, v]) => {
          out[k] = String(v ?? "").trim();
        });
        return out;
      });
    } catch (e) {
      console.error("XLS parse error:", e);
      return NextResponse.json({
        error: "Failed to parse XLS/XLSX file. Please try exporting as CSV (.csv) or modern Excel (.xlsx) format and upload again."
      }, { status: 400 });
    }
  } else {
    // Parse CSV file - plain text
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length < 2) {
        return NextResponse.json({ error: "CSV file must have headers and at least one row" }, { status: 400 });
      }

      // Handle CSV with comma separation, respect quotes
      headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = (values[idx] || "").trim();
        });
        rows.push(row);
      }
    } catch (e) {
      console.error("CSV parse error:", e);
      return NextResponse.json({ error: "Failed to parse CSV file. Please check the format." }, { status: 400 });
    }
  }

  // Normalize headers to lowercase for matching
  const normalizedRows: Record<string, string>[] = [];
  const projectNames = new Set<string>();

  for (const row of rows) {
    const normalizedRow: Record<string, string> = {};
    const lowerRow: Record<string, string> = {};
    Object.keys(row).forEach((key) => {
      lowerRow[key.toLowerCase().trim()] = String(row[key] || "").trim();
    });

    // Map columns: DATE, LEAD SOURCE, NAME, NUMBER, MAIL ID, PROJECT NAME
    if (lowerRow["date"] || lowerRow["lead_date"]) {
      normalizedRow.date = lowerRow["date"] || lowerRow["lead_date"] || "";
    }
    if (lowerRow["lead_source"] || lowerRow["source"]) {
      normalizedRow.source = lowerRow["lead_source"] || lowerRow["source"] || "Manual";
    }
    if (lowerRow["lead_name"] || lowerRow["name"]) {
      normalizedRow.name = lowerRow["lead_name"] || lowerRow["name"] || "";
    }
    if (lowerRow["number"] || lowerRow["phone"] || lowerRow["mobile"]) {
      normalizedRow.phone = String(lowerRow["number"] || lowerRow["phone"] || lowerRow["mobile"] || "");
    }
    if (lowerRow["mail id"] || lowerRow["mail_id"] || lowerRow["mail"] || lowerRow["email"]) {
      normalizedRow.email = lowerRow["mail id"] || lowerRow["mail_id"] || lowerRow["mail"] || lowerRow["email"] || "";
    }
    if (lowerRow["project_name"] || lowerRow["project name"] || lowerRow["project"]) {
      normalizedRow.projectName = lowerRow["project_name"] || lowerRow["project name"] || lowerRow["project"] || "";
      if (normalizedRow.projectName) {
        projectNames.add(normalizedRow.projectName);
      }
    }

    // Also carry over any standard fields
    if (lowerRow["budget"]) normalizedRow.budget = lowerRow["budget"];
    if (lowerRow["notes"]) normalizedRow.notes = lowerRow["notes"];

    normalizedRows.push(normalizedRow);
  }

  // Duplicate detection - check existing leads by phone number
  const phones = normalizedRows
    .map((r) => r.phone)
    .filter((p) => p.trim() !== "");

  const existingLeads = await db.lead.findMany({
    where: {
      phone: { in: phones },
    },
    select: { id: true, phone: true, name: true },
  });

  const existingPhoneMap: Record<string, { id: string; name: string }> = {};
  existingLeads.forEach((lead) => {
    existingPhoneMap[lead.phone] = { id: lead.id, name: lead.name };
  });

  // Mark duplicates in rows
  const rowsWithDuplicates = normalizedRows.map((row) => ({
    ...row,
    isDuplicate: !!(row.phone && existingPhoneMap[row.phone]),
    duplicateOf: row.phone ? existingPhoneMap[row.phone]?.name || null : null,
    duplicateId: row.phone ? existingPhoneMap[row.phone]?.id || null : null,
  }));

  // Also check duplicates within the import file itself
  const phoneCountInFile: Record<string, number> = {};
  rowsWithDuplicates.forEach((row) => {
    if (row.phone) {
      phoneCountInFile[row.phone] = (phoneCountInFile[row.phone] || 0) + 1;
    }
  });
  rowsWithDuplicates.forEach((row) => {
    if (row.phone && phoneCountInFile[row.phone] > 1) {
      row.isDuplicate = true;
      if (!row.duplicateOf) {
        row.duplicateOf = "Duplicate in import file";
      }
    }
  });

  return NextResponse.json({
    headers,
    rows: rowsWithDuplicates,
    count: rowsWithDuplicates.length,
    duplicateCount: rowsWithDuplicates.filter((r) => r.isDuplicate).length,
    projectNames: Array.from(projectNames),
  });
}

// Simple CSV line parser that handles quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
