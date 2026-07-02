"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  RefreshCw,
  Building2,
  Users,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Copy,
  Check,
} from "lucide-react";

interface PortalLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  budget: string | null;
  notes: string | null;
  projectName: string | null;
  portalRef: string | null;
  assignedTo: string | null;
  projectId: string | null;
  status: string;
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface ProjectItem {
  id: string;
  name: string;
  location?: string | null;
}

export function PortalLeads() {
  const { user } = useAppStore();
  const [portalLeads, setPortalLeads] = useState<PortalLead[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"pending" | "confirmed" | "discarded">("pending");

  // Per-row editable fields (kept in a local map keyed by portal lead ID)
  const [rowAssign, setRowAssign] = useState<Record<string, string>>({});
  const [rowProject, setRowProject] = useState<Record<string, string>>({});
  const [rowSource, setRowSource] = useState<Record<string, string>>({});

  // Bulk-apply state
  const [bulkProject, setBulkProject] = useState("");
  const [bulkAssign, setBulkAssign] = useState("");
  const [bulkSource, setBulkSource] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Confirm / discard action state
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<{ confirmed: number; duplicated: number; failed: number } | null>(null);

  // Copy API URL state
  const [copied, setCopied] = useState(false);

  const apiUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/portal-leads`;

  const fetchPortalLeads = useCallback(async (status: "pending" | "confirmed" | "discarded") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal-leads?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setPortalLeads(data.portalLeads || []);
      setPendingCount(data.pendingCount || 0);
      // Reset per-row state for the freshly fetched rows
      const assignMap: Record<string, string> = {};
      const projectMap: Record<string, string> = {};
      const sourceMap: Record<string, string> = {};
      (data.portalLeads as PortalLead[]).forEach((p) => {
        if (p.assignedTo) assignMap[p.id] = p.assignedTo;
        if (p.projectId) projectMap[p.id] = p.projectId;
        sourceMap[p.id] = p.source;
      });
      setRowAssign(assignMap);
      setRowProject(projectMap);
      setRowSource(sourceMap);
      // Default-select all pending rows
      if (status === "pending") {
        setSelectedRows(new Set((data.portalLeads as PortalLead[]).map((p) => p.id)));
      } else {
        setSelectedRows(new Set());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user?.role === "admin" || user?.role === "super_admin") {
      fetchPortalLeads(filterStatus);
    }
  }, [user, filterStatus, fetchPortalLeads]);

  // Fetch users + projects + sources
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch(() => {});
    fetch("/api/lead-sources").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setSources(data.map((s: { name: string }) => s.name));
    }).catch(() => {});
  }, []);

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === portalLeads.length && portalLeads.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(portalLeads.map((p) => p.id)));
    }
  };

  const applyBulkProject = () => {
    if (!bulkProject || selectedRows.size === 0) return;
    const map: Record<string, string> = { ...rowProject };
    selectedRows.forEach((id) => { map[id] = bulkProject; });
    setRowProject(map);
    setBulkProject("");
  };

  const applyBulkAssign = () => {
    if (!bulkAssign || selectedRows.size === 0) return;
    const map: Record<string, string> = { ...rowAssign };
    selectedRows.forEach((id) => { map[id] = bulkAssign; });
    setRowAssign(map);
    setBulkAssign("");
  };

  const applyBulkSource = () => {
    if (!bulkSource || selectedRows.size === 0) return;
    const map: Record<string, string> = { ...rowSource };
    selectedRows.forEach((id) => { map[id] = bulkSource; });
    setRowSource(map);
    setBulkSource("");
  };

  const handleConfirm = async () => {
    if (selectedRows.size === 0) return;
    setConfirming(true);
    setLastResult(null);
    try {
      const payload = Array.from(selectedRows).map((id) => {
        const lead = portalLeads.find((p) => p.id === id);
        return {
          id,
          assignToId: rowAssign[id] || undefined,
          projectId: rowProject[id] || undefined,
          source: rowSource[id] || lead?.source || "Portal",
        };
      });
      const res = await fetch("/api/portal-leads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirm failed");
      setLastResult({
        confirmed: data.confirmed || 0,
        duplicated: data.duplicated || 0,
        failed: data.failed || 0,
      });
      // Refresh the list
      await fetchPortalLeads(filterStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  const handleDiscard = async (id: string) => {
    if (!confirm("Discard this portal lead? You can find it later under the 'Discarded' filter.")) return;
    try {
      const res = await fetch(`/api/portal-leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to discard");
      }
      await fetchPortalLeads(filterStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard");
    }
  };

  const handleDeleteForever = async (id: string) => {
    if (!confirm("PERMANENTLY delete this portal lead? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/portal-leads/${id}?hard=true`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      await fetchPortalLeads(filterStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const copyApiUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (user?.role !== "admin" && user?.role !== "super_admin") return null;

  return (
    <div className="space-y-4">
      {/* API endpoint info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Portal Leads — Pending Review
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-sm space-y-2">
            <div className="font-medium text-blue-700 dark:text-blue-300">
              External Portal API Endpoint
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1 bg-white dark:bg-gray-900 rounded border text-xs">
                POST {apiUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyApiUrl} className="h-8">
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Send leads from Housing.com, MagicBricks, 99acres, or any portal to this endpoint. Required fields: <code>name</code>, <code>phone</code>. Optional: <code>email</code>, <code>source</code>, <code>budget</code>, <code>notes</code>, <code>projectName</code>, <code>portalRef</code>.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {(["pending", "confirmed", "discarded"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterStatus === s ? "default" : "outline"}
                onClick={() => setFilterStatus(s)}
                className="h-8 capitalize"
              >
                {s}
                {s === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">
                    {pendingCount}
                  </span>
                )}
              </Button>
            ))}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchPortalLeads(filterStatus)}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {lastResult && (
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-950 p-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                <strong>{lastResult.confirmed}</strong> lead(s) added to Lead Management
                {lastResult.duplicated > 0 && (
                  <span>, <strong>{lastResult.duplicated}</strong> skipped (duplicate phone)</span>
                )}
                {lastResult.failed > 0 && (
                  <span>, <strong>{lastResult.failed}</strong> failed</span>
                )}
              </span>
            </div>
          )}

          {portalLeads.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No {filterStatus} portal leads.
              {filterStatus === "pending" && " When a portal sends a new lead, it will appear here."}
            </div>
          ) : (
            <>
              {/* Bulk-apply bar (only show in pending view) */}
              {filterStatus === "pending" && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Selection:</span>
                      <Button size="sm" variant="outline" onClick={toggleAll} className="h-7 text-xs">
                        {selectedRows.size === portalLeads.length ? "Deselect All" : "Select All"}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {selectedRows.size} of {portalLeads.length} selected
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-brand">Bulk Apply to Selected:</span>

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

                    <Select value={bulkAssign} onValueChange={setBulkAssign}>
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
                    <Button size="sm" variant="outline" onClick={applyBulkAssign} disabled={!bulkAssign || selectedRows.size === 0} className="h-8 text-xs">
                      Apply Assignee
                    </Button>

                    <div className="flex-1" />

                    <Button
                      onClick={handleConfirm}
                      disabled={confirming || selectedRows.size === 0}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {confirming ? "Confirming..." : `Confirm ${selectedRows.size} Lead${selectedRows.size !== 1 ? "s" : ""} → Lead Management`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Portal leads table */}
              <div className="max-h-[600px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {filterStatus === "pending" && (
                        <TableHead className="w-8">
                          <Checkbox
                            checked={selectedRows.size === portalLeads.length && portalLeads.length > 0}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                      )}
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Project (file)</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Notes</TableHead>
                      {filterStatus === "pending" && <TableHead>Source (pick)</TableHead>}
                      {filterStatus === "pending" && <TableHead>Project (select)</TableHead>}
                      {filterStatus === "pending" && <TableHead>Assign To</TableHead>}
                      {(filterStatus === "confirmed" || filterStatus === "discarded") && <TableHead>Status</TableHead>}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portalLeads.map((lead, i) => (
                      <TableRow key={lead.id} className={selectedRows.has(lead.id) ? "bg-brand/5" : ""}>
                        {filterStatus === "pending" && (
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(lead.id)}
                              onCheckedChange={() => toggleRow(lead.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                            {lead.source}
                          </Badge>
                          {lead.portalRef && (
                            <div className="text-[10px] text-muted-foreground mt-1">Ref: {lead.portalRef}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{lead.name}</TableCell>
                        <TableCell className="text-xs">{lead.phone}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.email || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.projectName || "—"}</TableCell>
                        <TableCell className="text-xs">{lead.budget || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={lead.notes || ""}>
                          {lead.notes || "—"}
                        </TableCell>

                        {filterStatus === "pending" && (
                          <TableCell>
                            <Select
                              value={rowSource[lead.id] || lead.source}
                              onValueChange={(v) => setRowSource((prev) => ({ ...prev, [lead.id]: v }))}
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
                        )}

                        {filterStatus === "pending" && (
                          <TableCell>
                            <Select
                              value={rowProject[lead.id] || ""}
                              onValueChange={(v) => setRowProject((prev) => ({ ...prev, [lead.id]: v }))}
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
                        )}

                        {filterStatus === "pending" && (
                          <TableCell>
                            <Select
                              value={rowAssign[lead.id] || ""}
                              onValueChange={(v) => setRowAssign((prev) => ({ ...prev, [lead.id]: v }))}
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
                        )}

                        {(filterStatus === "confirmed" || filterStatus === "discarded") && (
                          <TableCell>
                            <Badge className={`text-xs ${
                              lead.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}>
                              {lead.status}
                            </Badge>
                          </TableCell>
                        )}

                        <TableCell>
                          <div className="flex items-center gap-1">
                            {filterStatus === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600"
                                onClick={() => handleDiscard(lead.id)}
                                title="Discard"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(filterStatus === "discarded" || filterStatus === "confirmed") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteForever(lead.id)}
                                title="Delete forever"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
