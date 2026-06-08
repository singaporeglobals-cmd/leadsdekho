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
import {
  Upload,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Home,
} from "lucide-react";

interface ParsedRow {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  date?: string;
  projectName?: string;
  budget?: string;
  notes?: string;
}

interface PropertyItem {
  id: string;
  name: string;
  type: string;
  status: string;
  price: number | null;
  project: { id: string; name: string } | null;
}

// Step 1: Upload, Step 2: Preview & Property Mapping, Step 3: Confirm, Step 4: Done
type ImportStep = 1 | 2 | 3 | 4;

export function LeadImport() {
  const { user, setPage } = useAppStore();
  const [step, setStep] = useState<ImportStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string; isActive: boolean }>>([]);
  const [error, setError] = useState("");

  // Property mapping: projectName -> propertyId
  const [propertyMapping, setPropertyMapping] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<PropertyItem[]>([]);

  // Fetch users and properties for admin
  useEffect(() => {
    if (user?.role === "admin") {
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => setUsers(data))
        .catch(() => {});

      fetch("/api/properties")
        .then((r) => r.json())
        .then((data) => setProperties(data.properties || []))
        .catch(() => {});
    }
  }, [user?.role]);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "admin") {
      setPage("leads");
    }
  }, [user, setPage]);

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
        setProjectNames(data.projectNames || []);
        // Auto-match project names to properties
        const autoMapping: Record<string, string> = {};
        for (const projectName of data.projectNames || []) {
          const matchedProperty = properties.find(
            (p) =>
              p.name.toLowerCase().includes(projectName.toLowerCase()) ||
              (p.project && p.project.name.toLowerCase() === projectName.toLowerCase())
          );
          if (matchedProperty) {
            autoMapping[projectName] = matchedProperty.id;
          }
        }
        setPropertyMapping(autoMapping);
        setStep(2);
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
        body: JSON.stringify({
          rows: parsedRows,
          assignTo: assignTo || undefined,
          propertyMapping,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setImported(data.imported);
        setStep(4);
      } else {
        setError(data.error || "Import failed");
      }
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Get the property name for display
  const getPropertyName = (propertyId: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    return prop ? prop.name : "Unknown";
  };

  // If not admin, don't render
  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setPage("leads")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Leads
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { num: 1, label: "Upload CSV" },
          { num: 2, label: "Map Properties" },
          { num: 3, label: "Confirm" },
          { num: 4, label: "Done" },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${
                step >= s.num
                  ? "bg-brand text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s.num}
            </div>
            <span
              className={`text-sm ${
                step >= s.num
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < 3 && (
              <div
                className={`w-8 h-0.5 ${
                  step > s.num ? "bg-brand" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Leads from CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Upload a CSV file with lead data
              </p>
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <p className="font-medium text-gray-500 dark:text-gray-300">CSV Format:</p>
                <p>Column order: <strong>date, lead_source, lead_name, number, project_name</strong></p>
                <p>Example: 2024-01-15, Housing.com, Raj Kumar, 9876543210, Sunshine Green City Phase 1</p>
              </div>
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
              <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview & Property Mapping */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {parsedRows.length} leads found — Map Properties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300">
              Match the project names from your CSV to your listed properties. This will automatically link the correct property to each lead.
            </div>

            {/* Property Mapping Section */}
            {projectNames.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Map Project Names to Properties
                </h3>
                {projectNames.map((projectName) => (
                  <div
                    key={projectName}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        CSV Project: &quot;{projectName}&quot;
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {parsedRows.filter((r) => r.projectName === projectName).length} leads with this project
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={propertyMapping[projectName] || ""}
                        onValueChange={(v) =>
                          setPropertyMapping((prev) => ({ ...prev, [projectName]: v }))
                        }
                      >
                        <SelectTrigger className="w-[250px]">
                          <Home className="mr-1 h-3 w-3 shrink-0" />
                          <SelectValue placeholder="Select your property..." />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} {p.project ? `(${p.project.name})` : ""} {p.price ? `- ₹${p.price.toLocaleString()}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {propertyMapping[projectName] && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 shrink-0">
                        Mapped
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Preview Table */}
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Property Mapped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 20).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.date || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {row.source || "CSV Import"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.projectName || "—"}</TableCell>
                      <TableCell>
                        {row.projectName && propertyMapping[row.projectName] ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                            {getPropertyName(propertyMapping[row.projectName])}
                          </Badge>
                        ) : row.projectName ? (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            Not mapped
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedRows.length > 20 && (
                <div className="p-2 text-center text-xs text-muted-foreground">
                  Showing 20 of {parsedRows.length} rows
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-brand hover:bg-brand-dark"
              >
                Next: Confirm <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm & Assign */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirm Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-foreground">{parsedRows.length}</div>
                <div className="text-sm text-muted-foreground">Leads to import</div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-foreground">
                  {Object.keys(propertyMapping).length}
                </div>
                <div className="text-sm text-muted-foreground">Properties mapped</div>
              </div>
            </div>

            {/* Assign To dropdown */}
            <div className="space-y-1">
              <Label>Assign All Leads To</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Assign to yourself" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.isActive && u.role !== "admin")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property mapping summary */}
            {projectNames.length > 0 && (
              <div className="space-y-2">
                <Label>Property Mapping Summary</Label>
                {projectNames.map((pn) => (
                  <div key={pn} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">CSV: &quot;{pn}&quot;</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {propertyMapping[pn] ? (
                      <span className="text-foreground font-medium">
                        {getPropertyName(propertyMapping[pn])}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Not mapped</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                className="bg-brand hover:bg-brand-dark"
                disabled={importing}
              >
                {importing
                  ? "Importing..."
                  : `Import ${parsedRows.length} Leads`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 text-lg font-medium text-foreground">
              Successfully imported {imported} leads!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Properties have been linked to leads based on your mapping.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setPage("leads")}
            >
              Go to Leads
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
