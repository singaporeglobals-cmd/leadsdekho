"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Building2,
  AlertTriangle,
  XCircle,
  Users,
} from "lucide-react";

// Sources are fetched dynamically from the database - no hardcoded fallback

interface ParsedRow {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  date?: string;
  projectName?: string;
  budget?: string;
  notes?: string;
  isDuplicate?: boolean;
  duplicateOf?: string | null;
  duplicateId?: string | null;
  projectId?: string;
  assignToId?: string;
}

interface ProjectItem {
  id: string;
  name: string;
  location?: string | null;
}

// Step 1: Upload, Step 2: Edit & Review, Step 3: Map Projects, Step 4: Confirm, Step 5: Done
type ImportStep = 1 | 2 | 3 | 4 | 5;

export function LeadImport() {
  const { user, setPage } = useAppStore();
  const [step, setStep] = useState<ImportStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string; isActive: boolean }>>([]);
  const [error, setError] = useState("");
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Bulk selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [bulkProject, setBulkProject] = useState("");
  const [bulkSource, setBulkSource] = useState("");
  const [bulkAssignTo, setBulkAssignTo] = useState("");

  // Project mapping: projectName -> projectId
  const [propertyMapping, setPropertyMapping] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  // Fetch users, projects, and lead sources
  useEffect(() => {
    if (user?.role === "admin") {
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => setUsers(data))
        .catch(() => {});

      fetch("/api/projects")
        .then((r) => r.json())
        .then((data) => setProjects(data))
        .catch(() => {});
    }

    // Fetch lead sources for all authenticated users
    fetch("/api/lead-sources")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const dbSources = data.map((s: { name: string }) => s.name);
          setSources(dbSources);
        }
      })
      .catch((err) => {
        console.error("Error fetching lead sources:", err);
      });
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
        const rows = data.rows as ParsedRow[];
        // Auto-match project names to DB projects
        const autoMapping: Record<string, string> = {};
        for (const projectName of data.projectNames || []) {
          const matchedProject = projects.find(
            (p) => p.name.toLowerCase() === projectName.toLowerCase()
          );
          if (matchedProject) {
            autoMapping[projectName] = matchedProject.id;
            // Also set projectId on matching rows
            rows.forEach((row) => {
              if (row.projectName?.toLowerCase() === projectName.toLowerCase()) {
                row.projectId = matchedProject.id;
              }
            });
          }
        }
        setParsedRows(rows);
        setProjectNames(data.projectNames || []);
        setDuplicateCount(data.duplicateCount || 0);
        setPropertyMapping(autoMapping);
        // Select all non-duplicate rows by default
        const defaultSelected = new Set<number>();
        rows.forEach((row, i) => {
          if (!row.isDuplicate) defaultSelected.add(i);
        });
        setSelectedRows(defaultSelected);
        setStep(2);
      } else {
        setError(data.error || "Failed to parse file");
      }
    } catch {
      setError("Failed to parse file");
    } finally {
      setParsing(false);
    }
  };

  // Update a specific row's field
  const updateRow = (index: number, field: string, value: string) => {
    setParsedRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Remove a row
  const removeRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
    setSelectedRows((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  };

  // Toggle row selection
  const toggleRowSelection = (index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Select/deselect all rows
  const toggleSelectAll = () => {
    if (selectedRows.size === parsedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(parsedRows.map((_, i) => i)));
    }
  };

  // Select only non-duplicate rows
  const selectNonDuplicates = () => {
    const nonDup = new Set<number>();
    parsedRows.forEach((row, i) => {
      if (!row.isDuplicate) nonDup.add(i);
    });
    setSelectedRows(nonDup);
  };

  // Apply bulk project to selected rows
  const applyBulkProject = () => {
    if (!bulkProject || selectedRows.size === 0) return;
    const projName = projects.find((p) => p.id === bulkProject)?.name || "";
    setParsedRows((prev) =>
      prev.map((row, i) =>
        selectedRows.has(i)
          ? { ...row, projectName: projName, projectId: bulkProject }
          : row
      )
    );
    setProjectNames((prev) => {
      const newNames = new Set(prev);
      if (projName) newNames.add(projName);
      return Array.from(newNames);
    });
    setPropertyMapping((prev) => ({ ...prev, [projName]: bulkProject }));
    setBulkProject("");
  };

  // Apply bulk source to selected rows
  const applyBulkSource = () => {
    if (!bulkSource || selectedRows.size === 0) return;
    setParsedRows((prev) =>
      prev.map((row, i) =>
        selectedRows.has(i) ? { ...row, source: bulkSource } : row
      )
    );
    setBulkSource("");
  };

  // Apply bulk assignee to selected rows
  const applyBulkAssignTo = () => {
    if (!bulkAssignTo || selectedRows.size === 0) return;
    setParsedRows((prev) =>
      prev.map((row, i) =>
        selectedRows.has(i) ? { ...row, assignToId: bulkAssignTo } : row
      )
    );
    setBulkAssignTo("");
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
          projectMapping: propertyMapping,
          skipDuplicates,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setImported(data.imported);
        setSkippedCount(data.skipped || 0);
        setStep(5);
      } else {
        setError(data.error || "Import failed");
      }
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Get the project name for display
  const getProjectName = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    return proj ? proj.name : "Unknown";
  };

  // Get user name
  const getUserName = (userId: string) => {
    const u = users.find((u) => u.id === userId);
    return u ? u.name : "Unknown";
  };

  // If not admin, don't render
  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setPage("leads")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Leads
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { num: 1, label: "Upload File" },
          { num: 2, label: "Review & Edit" },
          { num: 3, label: "Map Projects" },
          { num: 4, label: "Confirm" },
          { num: 5, label: "Done" },
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
            {i < 4 && (
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
            <CardTitle className="text-lg">Import Leads from CSV or XLS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Upload a CSV or XLS/XLSX file with lead data
              </p>
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <p className="font-medium text-gray-500 dark:text-gray-300">File Format:</p>
                <p>Column order: <strong>DATE (DD.MM.YY)</strong>, <strong>LEAD SOURCE</strong>, <strong>NAME</strong>, <strong>NUMBER</strong>, <strong>MAIL ID</strong>, <strong>PROJECT NAME</strong></p>
                <p className="mt-1">Example: 15.01.24, Housing.com, Raj Kumar, 9876543210, raj@email.com, Sunshine Green City</p>
              </div>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="mt-4 max-w-xs mx-auto"
              />
            </div>

            {parsing && (
              <div className="text-center text-sm text-gray-500">
                Parsing file...
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

      {/* Step 2: Review & Edit */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review & Edit — {parsedRows.length} leads found
              {duplicateCount > 0 && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 ml-2">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {duplicateCount} Duplicate{duplicateCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {duplicateCount > 0 && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300 space-y-2">
                <div className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Duplicate leads detected!
                </div>
                <p>Leads highlighted in <span className="text-red-600 font-bold">RED</span> already exist in the system or are duplicated in the file.</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(checked) => setSkipDuplicates(!!checked)}
                  />
                  <label htmlFor="skipDuplicates" className="cursor-pointer">
                    Skip duplicate leads during import (recommended)
                  </label>
                </div>
              </div>
            )}

            {/* ─── BULK SELECT & APPLY CONTROLS ─── */}
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Selection:</span>
                  <Button size="sm" variant="outline" onClick={toggleSelectAll} className="h-7 text-xs">
                    {selectedRows.size === parsedRows.length ? "Deselect All" : "Select All"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={selectNonDuplicates} className="h-7 text-xs">
                    Select Non-Duplicates
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {selectedRows.size} of {parsedRows.length} selected
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-brand">Bulk Apply to Selected:</span>

                {/* Bulk Project */}
                <Select value={bulkProject} onValueChange={setBulkProject}>
                  <SelectTrigger className="w-[180px] h-8">
                    <Building2 className="mr-1 h-3 w-3 shrink-0" />
                    <SelectValue placeholder="Set Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={applyBulkProject} disabled={!bulkProject || selectedRows.size === 0} className="h-8 text-xs">
                  Apply Project
                </Button>

                {/* Bulk Source */}
                <Select value={bulkSource} onValueChange={setBulkSource}>
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue placeholder="Set Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={applyBulkSource} disabled={!bulkSource || selectedRows.size === 0} className="h-8 text-xs">
                  Apply Source
                </Button>

                {/* Bulk Assign */}
                <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
                  <SelectTrigger className="w-[160px] h-8">
                    <Users className="mr-1 h-3 w-3 shrink-0" />
                    <SelectValue placeholder="Set Assignee" />
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
                <Button size="sm" variant="outline" onClick={applyBulkAssignTo} disabled={!bulkAssignTo || selectedRows.size === 0} className="h-8 text-xs">
                  Apply Assignee
                </Button>
              </div>
            </div>

            {/* Editable table */}
            <div className="max-h-[500px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={selectedRows.size === parsedRows.length && parsedRows.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Mail ID</TableHead>
                    <TableHead>Project (from file)</TableHead>
                    <TableHead>Project (select)</TableHead>
                    <TableHead>Assign To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={`${row.isDuplicate ? "bg-red-50 dark:bg-red-950/50" : ""} ${selectedRows.has(i) ? "bg-brand/5" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(i)}
                          onCheckedChange={() => toggleRowSelection(i)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs">{row.date || "\u2014"}</TableCell>
                      <TableCell>
                        <Select
                          value={row.source || ""}
                          onValueChange={(v) => updateRow(i, "source", v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[120px]">
                            <SelectValue placeholder="Source" />
                          </SelectTrigger>
                          <SelectContent>
                            {sources.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(i, "name", e.target.value)}
                          className={`h-7 text-xs ${row.isDuplicate ? "border-red-300 dark:border-red-700" : ""}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.phone}
                          onChange={(e) => updateRow(i, "phone", e.target.value)}
                          className={`h-7 text-xs ${row.isDuplicate ? "border-red-300 dark:border-red-700" : ""}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.email || ""}
                          onChange={(e) => updateRow(i, "email", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Email"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.projectName || "\u2014"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.projectId || ""}
                          onValueChange={(v) => {
                            updateRow(i, "projectId", v);
                            const projName = projects.find((p) => p.id === v)?.name || "";
                            updateRow(i, "projectName", projName);
                            setProjectNames((prev) => {
                              const newNames = new Set(prev);
                              if (projName) newNames.add(projName);
                              return Array.from(newNames);
                            });
                            setPropertyMapping((prev) => ({ ...prev, [projName]: v }));
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-[140px]">
                            <Building2 className="mr-1 h-3 w-3 shrink-0" />
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.assignToId || ""}
                          onValueChange={(v) => updateRow(i, "assignToId", v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[120px]">
                            <Users className="mr-1 h-3 w-3 shrink-0" />
                            <SelectValue placeholder="Assign..." />
                          </SelectTrigger>
                          <SelectContent>
                            {users
                              .filter((u) => u.isActive && u.role !== "admin")
                              .map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs">
                            <XCircle className="mr-1 h-3 w-3" />
                            Dup
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                            New
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(i)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-brand hover:bg-brand-dark"
              >
                Next: Map Projects <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Map Projects */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Map Project Names to Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300">
              Match the project names from your leads to your listed projects. This will automatically link the correct project to each lead.
            </div>

            {/* Project Mapping Section */}
            {projectNames.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Map Project Names to Projects
                </h3>
                {projectNames.map((projectName) => (
                  <div
                    key={projectName}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        Project: &quot;{projectName}&quot;
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
                          <Building2 className="mr-1 h-3 w-3 shrink-0" />
                          <SelectValue placeholder="Select project..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} {p.location ? `- ${p.location}` : ""}
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
            ) : (
              <div className="text-sm text-muted-foreground">
                No project names found in the imported data. You can skip this step.
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-brand hover:bg-brand-dark"
              >
                Next: Confirm <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm & Assign */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirm Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-foreground">
                  {skipDuplicates ? parsedRows.filter((r) => !r.isDuplicate).length : parsedRows.length}
                </div>
                <div className="text-sm text-muted-foreground">Leads to import</div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-foreground">
                  {Object.keys(propertyMapping).length}
                </div>
                <div className="text-sm text-muted-foreground">Projects mapped</div>
              </div>
              {duplicateCount > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 p-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {duplicateCount}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Duplicates {skipDuplicates ? "(will skip)" : "(will import anyway)"}
                  </div>
                </div>
              )}
            </div>

            {/* Assignment Summary */}
            <div className="space-y-2">
              <Label>Assignment Summary</Label>
              {(() => {
                const assigneeCounts: Record<string, number> = {};
                const noAssigneeCount = parsedRows.filter((r) => !r.isDuplicate || !skipDuplicates).filter((r) => !r.assignToId).length;
                parsedRows.forEach((r) => {
                  if ((skipDuplicates && r.isDuplicate) || !r.assignToId) return;
                  assigneeCounts[r.assignToId!] = (assigneeCounts[r.assignToId!] || 0) + 1;
                });
                return (
                  <div className="space-y-1">
                    {Object.entries(assigneeCounts).map(([userId, count]) => (
                      <div key={userId} className="flex items-center gap-2 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground font-medium">{getUserName(userId)}</span>
                        <span className="text-muted-foreground">— {count} leads</span>
                      </div>
                    ))}
                    {noAssigneeCount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <Users className="h-3 w-3" />
                        <span>Not assigned — {noAssigneeCount} leads (will be assigned to you)</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Project mapping summary */}
            {projectNames.length > 0 && (
              <div className="space-y-2">
                <Label>Project Mapping Summary</Label>
                {projectNames.map((pn) => (
                  <div key={pn} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">File: &quot;{pn}&quot;</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {propertyMapping[pn] ? (
                      <span className="text-foreground font-medium">
                        {getProjectName(propertyMapping[pn])}
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
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                className="bg-brand hover:bg-brand-dark"
                disabled={importing}
              >
                {importing
                  ? "Importing..."
                  : `Import ${skipDuplicates ? parsedRows.filter((r) => !r.isDuplicate).length : parsedRows.length} Leads`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Done */}
      {step === 5 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 text-lg font-medium text-foreground">
              Successfully imported {imported} leads!
            </p>
            {skippedCount > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                {skippedCount} duplicate leads were skipped.
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Projects and assignees have been linked to leads based on your settings.
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
