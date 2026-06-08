"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, ArrowLeft } from "lucide-react";

interface ParsedRow {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  budget?: string;
  notes?: string;
}

export function LeadImport() {
  const { user, setPage } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [error, setError] = useState("");

  // Fetch users for assign dropdown
  useEffect(() => {
    if (user?.role === "admin") {
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => setUsers(data))
        .catch(() => {});
    }
  }, [user?.role]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setParsing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setParsedRows(data.rows);
      } else {
        setError(data.error || "Failed to parse CSV");
      }
    } catch {
      setError("Failed to parse CSV file");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/leads/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, assignTo: assignTo || undefined }),
      });

      const data = await res.json();
      if (res.ok) {
        setImported(data.imported);
      } else {
        setError(data.error || "Import failed");
      }
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setPage("leads")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Leads
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Leads from CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <Upload className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Upload a CSV file with lead data
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Required columns: name, phone. Optional: email, source, budget,
              notes
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-4 max-w-xs mx-auto"
            />
          </div>

          {parsing && (
            <div className="text-center text-sm text-gray-500">
              Parsing CSV file...
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {parsedRows.length > 0 && imported === 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {parsedRows.length} leads found
                  </span>
                </div>
              </div>

              {user?.role === "admin" && users.length > 0 && (
                <div className="space-y-1">
                  <Label>Assign All Leads To</Label>
                  <Select value={assignTo} onValueChange={setAssignTo}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Assign to yourself" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((u) => u.isActive)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.source || "CSV Import"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button
                onClick={handleImport}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={importing}
              >
                {importing
                  ? "Importing..."
                  : `Import ${parsedRows.length} Leads`}
              </Button>
            </>
          )}

          {imported > 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-2 text-lg font-medium text-gray-900">
                Successfully imported {imported} leads!
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setPage("leads")}
              >
                Go to Leads
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
