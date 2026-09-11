/**
 * Test lead import parsing locally (no DB needed).
 * Simulates what /api/leads/import does with CSV and XLS files.
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// --- parseImportDate copied from src/lib/parse-import-date.ts ---
function excelSerialToDate(serial) {
  if (!Number.isFinite(serial) || serial < 1 || serial > 60000) return null;
  const excelEpoch = Date.UTC(1899, 11, 30);
  const ms = excelEpoch + serial * 24 * 60 * 60 * 1000;
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
}

function parseImportDate(input) {
  if (input == null) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : new Date(input);
  if (typeof input === "number") return excelSerialToDate(input);
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num >= 1 && num <= 60000) return excelSerialToDate(num);
    }
    const datePart = trimmed.split(/[\sT]/)[0];
    const isoMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }
    const ddMatch = datePart.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
    if (ddMatch) {
      const [, d, m, y] = ddMatch;
      let year = Number(y);
      if (year < 100) year = year <= 29 ? 2000 + year : 1900 + year;
      const date = new Date(year, Number(m) - 1, Number(d), 12, 0, 0);
      if (
        isNaN(date.getTime()) ||
        date.getDate() !== Number(d) ||
        date.getMonth() !== Number(m) - 1 ||
        date.getFullYear() !== year
      ) {
        return null;
      }
      return date;
    }
  }
  return null;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) { result.push(current); current = ""; }
    else current += char;
  }
  result.push(current);
  return result;
}

function normalizeAndMap(rows, headers) {
  const normalizedRows = [];
  const projectNames = new Set();
  for (const row of rows) {
    const normalizedRow = {};
    const lowerRow = {};
    Object.keys(row).forEach((key) => {
      lowerRow[key.toLowerCase().trim()] = String(row[key] || "").trim();
    });
    if (lowerRow["date"] || lowerRow["lead_date"]) {
      normalizedRow.date = lowerRow["date"] || lowerRow["lead_date"] || "";
    }
    if (lowerRow["lead_source"] || lowerRow["lead source"] || lowerRow["source"]) {
      normalizedRow.source = lowerRow["lead_source"] || lowerRow["lead source"] || lowerRow["source"] || "Manual";
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
      if (normalizedRow.projectName) projectNames.add(normalizedRow.projectName);
    }
    if (lowerRow["budget"]) normalizedRow.budget = lowerRow["budget"];
    if (lowerRow["notes"]) normalizedRow.notes = lowerRow["notes"];
    normalizedRows.push(normalizedRow);
  }
  return { normalizedRows, projectNames: Array.from(projectNames) };
}

const uploadDir = "/home/z/my-project/upload";
const files = ["test_leads.csv", "test_leads.xls", "test_leads.xlsx"];

for (const fname of files) {
  const fp = path.join(uploadDir, fname);
  if (!fs.existsSync(fp)) { console.log(`SKIP ${fname} (missing)`); continue; }
  console.log(`\n========== ${fname} ==========`);
  try {
    const isXls = fname.endsWith(".xlsx") || fname.endsWith(".xls");
    let rows = [], headers = [];
    if (isXls) {
      const buf = fs.readFileSync(fp);
      let workbook = null;
      try { workbook = XLSX.read(buf, { type: "buffer" }); }
      catch (e1) {
        try { workbook = XLSX.read(buf.toString("base64"), { type: "base64" }); }
        catch (e2) {
          workbook = XLSX.read(new Uint8Array(buf), { type: "array" });
        }
      }
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: "dd.mm.yyyy" });
      headers = jsonData.length ? Object.keys(jsonData[0]) : [];
      rows = jsonData.map((r) => {
        const out = {};
        Object.entries(r).forEach(([k, v]) => { out[k] = String(v ?? "").trim(); });
        return out;
      });
    } else {
      const text = fs.readFileSync(fp, "utf8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, idx) => { row[header] = (values[idx] || "").trim(); });
        rows.push(row);
      }
    }
    console.log("Headers:", JSON.stringify(headers));
    console.log("Raw row count:", rows.length);
    const { normalizedRows, projectNames } = normalizeAndMap(rows, headers);
    console.log("Normalized rows:", JSON.stringify(normalizedRows, null, 2).slice(0, 1200));
    console.log("Project names:", projectNames);
    // Check date parsing for each row
    normalizedRows.forEach((r, i) => {
      const parsed = parseImportDate(r.date);
      console.log(`Row ${i}: date="${r.date}" → parsed=${parsed ? parsed.toISOString().slice(0, 10) : "NULL (falls back to now)"}`);
    });
  } catch (e) {
    console.log(`ERROR parsing ${fname}:`, e.message);
  }
}
