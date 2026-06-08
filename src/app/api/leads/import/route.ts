import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// POST /api/leads/import - Parse CSV and return preview with project name matching
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

  const text = await file.text();
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV file must have headers and at least one row" }, { status: 400 });
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // Support both old format and new format
  // New format: date, lead_source, lead_name, number, project_name
  // Old format: name, phone, email, source, budget, notes
  const rows = [];
  const projectNames = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    // Normalize fields for new format
    const normalizedRow: Record<string, string> = {};

    // Map new format columns to standard fields
    if (row.date || row.lead_date) {
      normalizedRow.date = row.date || row.lead_date || "";
    }
    if (row.lead_source || row.source) {
      normalizedRow.source = row.lead_source || row.source || "CSV Import";
    }
    if (row.lead_name || row.name) {
      normalizedRow.name = row.lead_name || row.name || "";
    }
    if (row.number || row.phone || row.mobile) {
      normalizedRow.phone = row.number || row.phone || row.mobile || "";
    }
    if (row.project_name || row.project) {
      normalizedRow.projectName = row.project_name || row.project || "";
      if (normalizedRow.projectName) {
        projectNames.add(normalizedRow.projectName);
      }
    }

    // Also carry over any standard fields
    if (row.email) normalizedRow.email = row.email;
    if (row.budget) normalizedRow.budget = row.budget;
    if (row.notes) normalizedRow.notes = row.notes;

    rows.push(normalizedRow);
  }

  return NextResponse.json({
    headers,
    rows,
    count: rows.length,
    projectNames: Array.from(projectNames),
  });
}
