"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, Calendar, BarChart3, Filter, FileSpreadsheet, Users, Phone, Mail,
  Building2, Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LEAD_STATUSES } from "@/components/lead-list";
import { getSubStagesForStatus } from "@/lib/lead-sub-stages";

// Sources are fetched dynamically from the database - no hardcoded fallback

interface ProjectItem {
  id: string;
  name: string;
}

interface LeadReportItem {
  id: string;
  createdAt: string;
  source: string;
  name: string;
  phone: string;
  email: string | null;
  project: { name: string } | null;
  currentOwner: { name: string };
  callLogs: Array<{ notes: string; createdAt: string }>;
}

function getDefaultDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  return { firstDay, lastDay };
}

export function LeadsReportPage() {
  const { user } = useAppStore();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const { firstDay: defaultFrom, lastDay: defaultTo } = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [leadStatusFilter, setLeadStatusFilter] = useState<string[]>([]);
  const [subStageFilter, setSubStageFilter] = useState<string[]>([]);
  const [leads, setLeads] = useState<LeadReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const PAGE_SIZE = 25;

  // Whether the lead status + sub-stage filters should be visible (admin & super_admin only)
  const canFilterByStatus = user?.role === "admin" || user?.role === "super_admin";

  // When user removes a lead status from the filter, drop any sub-stage selections
  // that no longer belong to any of the selected statuses. Prevents sending stale
  // sub-stage values to the backend.
  useEffect(() => {
    if (leadStatusFilter.length === 0) {
      if (subStageFilter.length > 0) setSubStageFilter([]);
      return;
    }
    // Collect all valid sub-stages for the currently selected lead statuses
    const validSubStages = new Set<string>();
    validSubStages.add("__none__"); // always allow "uncategorized"
    leadStatusFilter.forEach((s) => {
      getSubStagesForStatus(s).forEach((sub) => validSubStages.add(sub));
    });
    const next = subStageFilter.filter((s) => validSubStages.has(s));
    if (next.length !== subStageFilter.length) {
      setSubStageFilter(next);
    }
  }, [leadStatusFilter, subStageFilter]);

  // Fetch projects and lead sources for dropdown
  useEffect(() => {
    (async () => {
      try {
        const [pRes, srcRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/lead-sources"),
        ]);
        if (pRes.ok) setProjects(await pRes.json());
        if (srcRes.ok) {
          const data = await srcRes.json();
          if (Array.isArray(data)) {
            const dbSources = data.map((s: { name: string }) => s.name);
            setSources(dbSources);
          }
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Fetch leads for preview
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        if (sourceFilter.length > 0) params.set("source", sourceFilter.join(","));
        if (projectFilter.length > 0) params.set("project", projectFilter.join(","));
        if (canFilterByStatus && leadStatusFilter.length > 0) params.set("leadStatus", leadStatusFilter.join(","));
        if (canFilterByStatus && subStageFilter.length > 0) params.set("subStage", subStageFilter.join(","));
        params.set("limit", "100");
        params.set("allCallLogs", "true");

        const res = await fetch(`/api/leads?${params}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
          setPage(0);
        }
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fromDate, toDate, sourceFilter, projectFilter, leadStatusFilter, subStageFilter, canFilterByStatus]);

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: "leadsReport" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (sourceFilter.length > 0) params.set("source", sourceFilter.join(","));
      if (projectFilter.length > 0) params.set("project", projectFilter.join(","));
      if (canFilterByStatus && leadStatusFilter.length > 0) params.set("leadStatus", leadStatusFilter.join(","));
      if (canFilterByStatus && subStageFilter.length > 0) params.set("subStage", subStageFilter.join(","));

      const res = await fetch(`/api/reports/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leads-report-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const paginatedLeads = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(leads.length / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand" /> Leads Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Export detailed leads data with feedback history</p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || leads.length === 0}
          className="bg-brand hover:bg-brand-dark text-white"
        >
          <Download className="mr-1.5 h-4 w-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="border-brand/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40 h-9" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40 h-9" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Source</Label>
              <MultiSelect
                options={sources.map((s) => ({ value: s, label: s }))}
                value={sourceFilter}
                onChange={setSourceFilter}
                placeholder="Sources"
                allLabel="All Sources"
                className="w-44"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Project</Label>
              <MultiSelect
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                value={projectFilter}
                onChange={setProjectFilter}
                placeholder="Projects"
                allLabel="All Projects"
                className="w-48"
              />
            </div>
            {/* Lead Status filter — admin & super_admin only */}
            {canFilterByStatus && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Lead Status</Label>
                <MultiSelect
                  options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))}
                  value={leadStatusFilter}
                  onChange={setLeadStatusFilter}
                  placeholder="Lead Status"
                  allLabel="All Lead Status"
                  className="w-[170px]"
                />
              </div>
            )}
            {/* Sub-stage filter — only shown when at least one status with sub-stages is selected */}
            {canFilterByStatus && (leadStatusFilter.includes("Not Interested") || leadStatusFilter.includes("Not Connected")) && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Sub-stage</Label>
                <MultiSelect
                  options={[
                    // Uncategorized option (matches leads with subStage = null)
                    { value: "__none__", label: "— Uncategorized —" },
                    // Show sub-stages from every selected status that has sub-stages
                    ...Array.from(new Set(
                      leadStatusFilter.flatMap((s) => getSubStagesForStatus(s))
                    )).map((s) => ({ value: s, label: s })),
                  ]}
                  value={subStageFilter}
                  onChange={setSubStageFilter}
                  placeholder="Sub-stage"
                  allLabel="All Sub-stages"
                  className="w-[180px]"
                />
              </div>
            )}
          </div>

          {/* Active filter indicators */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <Calendar className="h-3 w-3" /> {formatDate(fromDate)} — {formatDate(toDate)}
            </Badge>
            {sourceFilter.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Filter className="h-3 w-3" /> {sourceFilter.length} source{sourceFilter.length > 1 ? "s" : ""}
              </Badge>
            )}
            {projectFilter.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Building2 className="h-3 w-3" /> {projectFilter.length} project{projectFilter.length > 1 ? "s" : ""}
              </Badge>
            )}
            {canFilterByStatus && leadStatusFilter.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Filter className="h-3 w-3" /> {leadStatusFilter.length} status{leadStatusFilter.length > 1 ? "es" : ""}: {leadStatusFilter.join(", ")}
              </Badge>
            )}
            {canFilterByStatus && subStageFilter.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Filter className="h-3 w-3" /> {subStageFilter.length} sub-stage{subStageFilter.length > 1 ? "s" : ""}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs gap-1">
              <FileSpreadsheet className="h-3 w-3" /> {leads.length} leads
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brand" /> Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="mt-2 text-muted-foreground">No leads found for the selected filters</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Mail ID</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Executive</TableHead>
                      <TableHead>Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.map((lead, idx) => {
                      const feedbackParts = lead.callLogs.map((log) => {
                        const logDate = new Date(log.createdAt).toISOString().split("T")[0];
                        const [ly, lm, ld] = logDate.split("-");
                        const shortDate = `${ld}.${lm}`;
                        return `${log.notes.toUpperCase()}...${shortDate}`;
                      });
                      const feedback = feedbackParts.join(" ") || "-";

                      return (
                        <TableRow key={lead.id}>
                          <TableCell className="text-muted-foreground text-xs">{page * PAGE_SIZE + idx + 1}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(lead.createdAt)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{lead.source}</Badge></TableCell>
                          <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                          <TableCell className="text-sm">{lead.phone}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{lead.email || "-"}</TableCell>
                          <TableCell className="text-sm">{lead.project?.name || "-"}</TableCell>
                          <TableCell className="text-sm">{lead.currentOwner.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={feedback}>{feedback}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, leads.length)} of {leads.length}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-8 text-xs">
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-8 text-xs">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
