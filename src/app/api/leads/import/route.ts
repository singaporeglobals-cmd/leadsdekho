import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// POST /api/leads/import - Parse CSV/XLS and return preview with duplicate detection
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin can import
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();

  let rows: Record<string, string>[] = [];
  let headers: string[] = [];

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    // Parse XLS/XLSX file - must read as ArrayBuffer (binary), NOT as text
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(uint8Array, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

      if (jsonData.length === 0) {
        return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
      }

      headers = Object.keys(jsonData[0]);
      rows = jsonData;
    } catch (e) {
      console.error("XLS parse error:", e);
      return NextResponse.json({ error: "Failed to parse XLS/XLSX file. Please check the file format." }, { status: 400 });
    }
  } else {
    // Parse CSV file - read as text
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV file must have headers and at least one row" }, { status: 400 });
    }

    headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      rows.push(row);
    }
  }

  // Normalize headers to lowercase for matching
  const normalizedRows: Record<string, string>[] = [];
  const projectNames = new Set<string>();

  for (const row of rows) {
    const normalizedRow: Record<string, string> = {};
    const lowerRow: Record<string, string> = {};
    Object.keys(row).forEach((key) => {
      lowerRow[key.toLowerCase().trim()] = String(row[key] || "");
    });

    // Map columns: DATE, LEAD SOURCE, NAME, NUMBER, MAIL ID, PROJECT NAME
    if (lowerRow["date"] || lowerRow["lead_date"]) {
      normalizedRow.date = lowerRow["date"] || lowerRow["lead_date"] || "";
    }
    if (lowerRow["lead_source"] || lowerRow["source"]) {
      normalizedRow.source = lowerRow["lead_source"] || lowerRow["source"] || "CSV Import";
    }
    if (lowerRow["lead_name"] || lowerRow["name"]) {
      normalizedRow.name = lowerRow["lead_name"] || lowerRow["name"] || "";
    }
    if (lowerRow["number"] || lowerRow["phone"] || lowerRow["mobile"]) {
      normalizedRow.phone = lowerRow["number"] || lowerRow["phone"] || lowerRow["mobile"] || "";
    }
    if (lowerRow["mail id"] || lowerRow["mail_id"] || lowerRow["mail"] || lowerRow["email"]) {
      normalizedRow.email = lowerRow["mail id"] || lowerRow["mail_id"] || lowerRow["mail"] || lowerRow["email"] || "";
    }
    if (lowerRow["project_name"] || lowerRow["project"]) {
      normalizedRow.projectName = lowerRow["project_name"] || lowerRow["project"] || "";
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
