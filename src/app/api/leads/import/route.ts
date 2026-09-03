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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data. Please upload the file again." }, { status: 400 });
  }

  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Vercel serverless has a ~4.5MB request body limit — catch it early with a clear message
  if (file.size > 4.5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File is too large (over 4.5 MB). Please split it into smaller files or remove unnecessary columns/rows." },
      { status: 413 }
    );
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
      } catch {
        // Approach 2: Read from base64
        try {
          const base64 = buffer.toString("base64");
          workbook = XLSX.read(base64, { type: "base64" });
        } catch {
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

      // Auto-detect the delimiter by counting candidates in the header line.
      // Excel in some locales exports semicolon- or tab-separated CSVs.
      const headerLine = lines[0];
      const candidates = [",", ";", "\t"];
      let delimiter = ",";
      let bestCount = 0;
      for (const d of candidates) {
        const count = headerLine.split(d).length - 1;
        if (count > bestCount) {
          bestCount = count;
          delimiter = d;
        }
      }

      headers = parseCSVLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVLine(lines[i], delimiter);
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

  // Normalize a phone number for storage/duplicate detection:
  // keep digits and leading "+", strip spaces, dashes, dots, parentheses
  const normalizePhone = (raw: string) => raw.replace(/[^\d+]/g, "");

  for (const row of rows) {
    const normalizedRow: Record<string, string> = {};
    const lowerRow: Record<string, string> = {};
    Object.keys(row).forEach((key) => {
      lowerRow[key.toLowerCase().trim()] = String(row[key] || "").trim();
    });

    // Map columns: DATE, LEAD SOURCE, NAME, NUMBER, MAIL ID, PROJECT NAME
    // NOTE: headers may use spaces or underscores — handle both ("LEAD SOURCE" and "LEAD_SOURCE")
    const dateVal = lowerRow["date"] || lowerRow["lead_date"] || lowerRow["lead date"] || "";
    if (dateVal) normalizedRow.date = dateVal;

    const sourceVal = lowerRow["lead_source"] || lowerRow["lead source"] || lowerRow["source"] || "";
    if (sourceVal) normalizedRow.source = sourceVal;

    const nameVal = lowerRow["lead_name"] || lowerRow["lead name"] || lowerRow["name"] || lowerRow["client name"] || lowerRow["customer name"] || "";
    if (nameVal) normalizedRow.name = nameVal;

    const phoneVal = lowerRow["number"] || lowerRow["phone"] || lowerRow["mobile"] || lowerRow["phone number"] || lowerRow["mobile number"] || lowerRow["contact"] || lowerRow["contact number"] || lowerRow["whatsapp"] || "";
    if (phoneVal) normalizedRow.phone = normalizePhone(phoneVal);

    const emailVal = lowerRow["mail id"] || lowerRow["mail_id"] || lowerRow["mail"] || lowerRow["email"] || lowerRow["email id"] || lowerRow["e-mail"] || "";
    if (emailVal) normalizedRow.email = emailVal;

    const projectVal = lowerRow["project_name"] || lowerRow["project name"] || lowerRow["project"] || "";
    if (projectVal) {
      normalizedRow.projectName = projectVal;
      projectNames.add(projectVal);
    }

    // Also carry over any standard fields
    if (lowerRow["budget"]) normalizedRow.budget = lowerRow["budget"];
    if (lowerRow["notes"]) normalizedRow.notes = lowerRow["notes"];

    normalizedRows.push(normalizedRow);
  }

  // Duplicate detection - check existing leads by phone number.
  // Check both the normalized phone and common variants (+91 prefixed, 0-prefixed)
  const phonesToCheck = new Set<string>();
  for (const r of normalizedRows) {
    if (!r.phone) continue;
    phonesToCheck.add(r.phone);
    // Variants that may exist in the DB from earlier imports or manual entry
    const digits = r.phone.replace(/^\+/, "").replace(/^0+/, "");
    phonesToCheck.add(digits);
    if (!r.phone.startsWith("+")) {
      phonesToCheck.add(`+91${digits}`);
      phonesToCheck.add(`91${digits}`);
      phonesToCheck.add(`0${digits}`);
    }
    // Last-10-digits form (Indian mobile numbers)
    if (digits.length > 10) {
      phonesToCheck.add(digits.slice(-10));
    }
  }
  const phoneList = Array.from(phonesToCheck).filter((p) => p.length >= 6);

  const existingPhoneMap: Record<string, { id: string; name: string }> = {};
  try {
    // Chunk the query to avoid oversized "IN" clauses on very large imports
    const CHUNK = 500;
    for (let i = 0; i < phoneList.length; i += CHUNK) {
      const chunk = phoneList.slice(i, i + CHUNK);
      const existingLeads = await db.lead.findMany({
        where: { phone: { in: chunk } },
        select: { id: true, phone: true, name: true },
      });
      existingLeads.forEach((lead) => {
        const key = normalizePhone(lead.phone);
        if (key && !existingPhoneMap[key]) {
          existingPhoneMap[key] = { id: lead.id, name: lead.name };
        }
      });
    }
  } catch (e) {
    console.error("Duplicate check failed (continuing without duplicate detection):", e);
    // Non-fatal: import can proceed without duplicate marking
  }

  const findDuplicate = (phone: string) => {
    if (!phone) return null;
    const key = normalizePhone(phone);
    return existingPhoneMap[key] || null;
  };

  // Mark duplicates in rows
  const rowsWithDuplicates = normalizedRows.map((row) => {
    const dup = findDuplicate(row.phone);
    return {
      ...row,
      isDuplicate: !!dup,
      duplicateOf: dup?.name || null,
      duplicateId: dup?.id || null,
    };
  });

  // Also check duplicates within the import file itself
  const phoneCountInFile: Record<string, number> = {};
  rowsWithDuplicates.forEach((row) => {
    if (row.phone) {
      const key = normalizePhone(row.phone);
      phoneCountInFile[key] = (phoneCountInFile[key] || 0) + 1;
    }
  });
  rowsWithDuplicates.forEach((row) => {
    if (row.phone && phoneCountInFile[normalizePhone(row.phone)] > 1) {
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

// Simple CSV line parser that handles quoted values, with configurable delimiter
function parseCSVLine(line: string, delimiter = ","): string[] {
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
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
