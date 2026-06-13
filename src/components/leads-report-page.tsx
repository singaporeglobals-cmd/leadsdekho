"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const SOURCES = [
  "Manual", "Website", "Referral", "Social Media", "Walk-in",
  "Call", "Housing.com", "99acres", "MagicBricks",
];

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
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const { firstDay: defaultFrom, lastDay: defaultTo } = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [leads, setLeads] = useState<LeadReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Fetch projects for dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) setProjects(await res.json());
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
        if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter);
        if (projectFilter && projectFilter !== "all") params.set("project", projectFilter);
        params.set("limit", "100");

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
  }, [fromDate, toDate, sourceFilter, projectFilter]);

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: "leadsReport" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter);
      if (projectFilter && projectFilter !== "all") params.set("project", projectFilter);

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
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-44 h-9">
                  <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-48 h-9">
                  <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter indicators */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <Calendar className="h-3 w-3" /> {formatDate(fromDate)} — {formatDate(toDate)}
            </Badge>
            {sourceFilter !== "all" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Filter className="h-3 w-3" /> {sourceFilter}
              </Badge>
            )}
            {projectFilter !== "all" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Building2 className="h-3 w-3" /> {projects.find(p => p.id === projectFilter)?.name || "Project"}
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
