"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  Download, Calendar, TrendingUp, Building2, Users, Phone,
  Clock, MapPin, ChevronDown, ChevronUp, FileSpreadsheet,
  BarChart3, Target, Pencil, ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const COLORS = ["#dfb338", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

const statusColors: Record<string, string> = {
  New: "#64748b",
  Contacted: "#3b82f6",
  Qualified: "#10b981",
  "Visit Scheduled": "#f59e0b",
  Visited: "#8b5cf6",
  Negotiation: "#f97316",
  Won: "#22c55e",
  Lost: "#ef4444",
};

// ─── KPI Card ───
function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: color }} />
      <CardContent className="p-4 pl-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: color + "18" }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Badge ───
function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || "#64748b";
  return (
    <Badge variant="secondary" className="text-xs font-medium" style={{ backgroundColor: color + "20", color }}>
      {status}
    </Badge>
  );
}

// ─── Custom Tooltip ───
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-1 font-semibold text-sm">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ─── HELPERS ───
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Lead Row with Update Button ───
function LeadRow({ lead }: { lead: Record<string, unknown> }) {
  const { setSelectedLeadId, setPage } = useAppStore();
  const handleUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadId(lead.id as string);
    setPage("lead-detail");
  };
  return (
    <TableRow>
      <TableCell className="font-medium">{lead.name as string}</TableCell>
      <TableCell>{lead.phone as string}</TableCell>
      <TableCell><Badge variant="outline" className="text-xs">{lead.source as string}</Badge></TableCell>
      <TableCell>{(lead.project as Record<string, string>)?.name || "-"}</TableCell>
      <TableCell><StatusBadge status={lead.pipelineStatus as string} /></TableCell>
      <TableCell>{(lead.currentOwner as Record<string, string>)?.name || "-"}</TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-brand hover:text-brand-dark" onClick={handleUpdate}>
          <Pencil className="h-3.5 w-3.5" /> Update
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Lead Row with Update Button (flexible columns) ───
function LeadRowSimple({ lead, showSource, showCreated }: { lead: Record<string, unknown>; showSource?: boolean; showCreated?: boolean }) {
  const { setSelectedLeadId, setPage } = useAppStore();
  const handleUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadId(lead.id as string);
    setPage("lead-detail");
  };
  return (
    <TableRow>
      <TableCell className="font-medium">{lead.name as string}</TableCell>
      <TableCell>{lead.phone as string}</TableCell>
      {showSource && <TableCell><Badge variant="outline" className="text-xs">{lead.source as string}</Badge></TableCell>}
      <TableCell>{(lead.project as Record<string, string>)?.name || "-"}</TableCell>
      <TableCell><StatusBadge status={lead.pipelineStatus as string} /></TableCell>
      <TableCell>{(lead.currentOwner as Record<string, string>)?.name || "-"}</TableCell>
      {showCreated && <TableCell className="text-xs text-muted-foreground">{formatDate(((lead.createdAt as string) || "").split("T")[0])}</TableCell>}
      <TableCell className="text-right">
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-brand hover:text-brand-dark" onClick={handleUpdate}>
          <Pencil className="h-3.5 w-3.5" /> Update
        </Button>
      </TableCell>
    </TableRow>
  );
}

async function handleExport(type: string, from?: string, to?: string) {
  const params = new URLSearchParams({ type });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`/api/reports/export?${params}`);
  if (res.ok) {
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// ─── DATE-WISE REPORT ───
function DateWiseReport() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/date-wise?from=${fromDate}&to=${toDate}`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!data && !loading) return null;

  const summary = (data?.summary || {}) as Record<string, number>;
  const byDate = (data?.byDate || []) as Array<Record<string, unknown>>;
  const dailyTrend = (data?.dailyTrend || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-44 h-9" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-44 h-9" />
        </div>
        <Button onClick={fetchData} className="bg-brand hover:bg-brand-dark text-white h-9">
          <Calendar className="mr-1.5 h-3.5 w-3.5" /> Generate
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("leads", fromDate, toDate)} className="h-9">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Total Leads" value={summary.totalLeads || 0} icon={Users} color="#dfb338" />
            <KpiCard label="Won Deals" value={summary.won || 0} icon={Target} color="#22c55e" sub={`${summary.totalLeads ? Math.round(((summary.won || 0) / summary.totalLeads) * 100) : 0}% win rate`} />
            <KpiCard label="Total Calls" value={summary.totalCalls || 0} icon={Phone} color="#3b82f6" />
            <KpiCard label="Follow-ups" value={summary.totalFollowUps || 0} icon={Clock} color="#8b5cf6" />
            <KpiCard label="Site Visits" value={summary.totalSiteVisits || 0} icon={MapPin} color="#f59e0b" />
          </div>

          {dailyTrend.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand" /> Daily Lead Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="leads" stroke="#dfb338" strokeWidth={2.5} dot={{ r: 4, fill: "#dfb338" }} name="Leads" />
                      <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} name="Calls" />
                      <Line type="monotone" dataKey="followUps" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6" }} name="Follow-ups" />
                      <Line type="monotone" dataKey="siteVisits" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} name="Site Visits" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand" /> Date-wise Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Leads</TableHead>
                      <TableHead className="text-center">New</TableHead>
                      <TableHead className="text-center">Won</TableHead>
                      <TableHead className="text-center">Lost</TableHead>
                      <TableHead>Status Breakdown</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byDate.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No leads found in this date range</TableCell>
                      </TableRow>
                    )}
                    {byDate.map((day) => {
                      const dateStr = day.date as string;
                      const isExpanded = expandedDate === dateStr;
                      const leads = (day.leads || []) as Array<Record<string, unknown>>;
                      const statusBreakdown = (day.statusBreakdown || {}) as Record<string, number>;
                      return (
                        <Fragment key={dateStr}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedDate(isExpanded ? null : dateStr)}>
                            <TableCell>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-medium">{formatDate(dateStr)}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-brand/15 text-brand font-bold">{day.total as number}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{statusBreakdown["New"] || 0}</TableCell>
                            <TableCell className="text-center text-green-600 font-semibold">{statusBreakdown["Won"] || 0}</TableCell>
                            <TableCell className="text-center text-red-600 font-semibold">{statusBreakdown["Lost"] || 0}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(statusBreakdown).map(([status]) => (
                                  <StatusBadge key={status} status={status} />
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/30 p-0">
                                <div className="p-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {leads.map((lead) => (
                                        <LeadRow key={lead.id as string} lead={lead} />
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── SOURCE-WISE REPORT ───
function SourceWiseReport() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/source-wise?from=${fromDate}&to=${toDate}`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!data && !loading) return null;

  const bySource = (data?.bySource || []) as Array<Record<string, unknown>>;
  const sourceLeadCounts = (data?.sourceLeadCounts || []) as Array<Record<string, unknown>>;
  const sourceWinRate = (data?.sourceWinRate || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-44 h-9" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-44 h-9" />
        </div>
        <Button onClick={fetchData} className="bg-brand hover:bg-brand-dark text-white h-9">
          <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Generate
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Total Leads" value={(data?.totalLeads as number) || 0} icon={Users} color="#dfb338" />
            <KpiCard label="Total Sources" value={(data?.totalSources as number) || 0} icon={BarChart3} color="#3b82f6" />
            <KpiCard label="Best Source" value={(bySource[0]?.source as string) || "-"} icon={Target} color="#22c55e" sub={`${(bySource[0]?.total as number) || 0} leads`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {sourceLeadCounts.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-brand" /> Leads by Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sourceLeadCounts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" allowDecimals={false} fontSize={11} />
                        <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="leads" fill="#dfb338" name="Total Leads" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="won" fill="#22c55e" name="Won" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="lost" fill="#ef4444" name="Lost" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {sourceWinRate.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" /> Win Rate by Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sourceWinRate}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="winRate" fill="#22c55e" name="Win Rate %" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" /> Source-wise Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-center">Total Leads</TableHead>
                      <TableHead className="text-center">Won</TableHead>
                      <TableHead className="text-center">Lost</TableHead>
                      <TableHead className="text-center">Win Rate</TableHead>
                      <TableHead className="text-center">Calls</TableHead>
                      <TableHead className="text-center">Follow-ups</TableHead>
                      <TableHead className="text-center">Site Visits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bySource.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No leads found</TableCell>
                      </TableRow>
                    )}
                    {bySource.map((src) => {
                      const srcName = src.source as string;
                      const isExpanded = expandedSource === srcName;
                      const leads = (src.leads || []) as Array<Record<string, unknown>>;
                      const total = src.total as number;
                      const wonCount = src.wonCount as number;
                      return (
                        <Fragment key={srcName}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedSource(isExpanded ? null : srcName)}>
                            <TableCell>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-semibold">{srcName}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-brand/15 text-brand font-bold">{total}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-green-600 font-semibold">{wonCount}</TableCell>
                            <TableCell className="text-center text-red-600 font-semibold">{src.lostCount as number}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={total > 0 && (wonCount / total) >= 0.2 ? "border-green-500 text-green-600" : "border-muted-foreground text-muted-foreground"}>
                                {total > 0 ? Math.round((wonCount / total) * 100) : 0}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{src.callCount as number}</TableCell>
                            <TableCell className="text-center">{src.followUpCount as number}</TableCell>
                            <TableCell className="text-center">{src.siteVisitCount as number}</TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 p-0">
                                <div className="p-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {leads.map((lead) => (
                                        <LeadRowSimple key={lead.id as string} lead={lead} showCreated showSource={false} />
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── PROJECT-WISE REPORT ───
function ProjectWiseReport() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/project-wise?from=${fromDate}&to=${toDate}`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!data && !loading) return null;

  const byProject = (data?.byProject || []) as Array<Record<string, unknown>>;
  const projectLeadCounts = (data?.projectLeadCounts || []) as Array<Record<string, unknown>>;
  const projectWinRate = (data?.projectWinRate || []) as Array<Record<string, unknown>>;
  const projectSourceMatrix = (data?.projectSourceMatrix || []) as Array<Record<string, unknown>>;
  const allSources = (data?.allSources || []) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-44 h-9" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-44 h-9" />
        </div>
        <Button onClick={fetchData} className="bg-brand hover:bg-brand-dark text-white h-9">
          <Building2 className="mr-1.5 h-3.5 w-3.5" /> Generate
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Total Leads" value={(data?.totalLeads as number) || 0} icon={Users} color="#dfb338" />
            <KpiCard label="Total Projects" value={(data?.totalProjects as number) || 0} icon={Building2} color="#8b5cf6" />
            <KpiCard label="Top Project" value={(byProject[0]?.projectName as string) || "-"} icon={Target} color="#22c55e" sub={`${(byProject[0]?.total as number) || 0} leads`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {projectLeadCounts.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand" /> Leads by Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectLeadCounts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" allowDecimals={false} fontSize={11} />
                        <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="leads" fill="#dfb338" name="Total Leads" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="won" fill="#22c55e" name="Won" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="lost" fill="#ef4444" name="Lost" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {projectWinRate.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" /> Win Rate by Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectWinRate}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="winRate" fill="#22c55e" name="Win Rate %" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {projectSourceMatrix.length > 0 && allSources.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-brand" /> Source Distribution by Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectSourceMatrix}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {allSources.map((src, i) => (
                        <Bar key={src} dataKey={src} stackId="a" fill={COLORS[i % COLORS.length]} name={src} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand" /> Project-wise Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Total Leads</TableHead>
                      <TableHead className="text-center">Won</TableHead>
                      <TableHead className="text-center">Lost</TableHead>
                      <TableHead className="text-center">Win Rate</TableHead>
                      <TableHead className="text-center">Calls</TableHead>
                      <TableHead className="text-center">Site Visits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byProject.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No leads found</TableCell>
                      </TableRow>
                    )}
                    {byProject.map((proj) => {
                      const projName = proj.projectName as string;
                      const isExpanded = expandedProject === projName;
                      const leads = (proj.leads || []) as Array<Record<string, unknown>>;
                      const total = proj.total as number;
                      const wonCount = proj.wonCount as number;
                      return (
                        <Fragment key={projName}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedProject(isExpanded ? null : projName)}>
                            <TableCell>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-semibold">{projName}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{(proj.projectLocation as string) || "-"}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-brand/15 text-brand font-bold">{total}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-green-600 font-semibold">{wonCount}</TableCell>
                            <TableCell className="text-center text-red-600 font-semibold">{proj.lostCount as number}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={total > 0 && (wonCount / total) >= 0.2 ? "border-green-500 text-green-600" : "border-muted-foreground text-muted-foreground"}>
                                {total > 0 ? Math.round((wonCount / total) * 100) : 0}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{proj.callCount as number}</TableCell>
                            <TableCell className="text-center">{proj.siteVisitCount as number}</TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 p-0">
                                <div className="p-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {leads.map((lead) => (
                                        <LeadRowSimple key={lead.id as string} lead={lead} showCreated showSource />
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── MAIN REPORTS PAGE ───
export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("date-wise");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand" /> Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Analyze leads by date, source, and project</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("leads")} className="h-8">
            <Download className="mr-1 h-3 w-3" /> Export Leads
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("callLogs")} className="h-8">
            <Download className="mr-1 h-3 w-3" /> Export Calls
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="date-wise" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Date-wise
          </TabsTrigger>
          <TabsTrigger value="source-wise" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Source-wise
          </TabsTrigger>
          <TabsTrigger value="project-wise" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Project-wise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="date-wise" className="mt-4">
          <DateWiseReport />
        </TabsContent>

        <TabsContent value="source-wise" className="mt-4">
          <SourceWiseReport />
        </TabsContent>

        <TabsContent value="project-wise" className="mt-4">
          <ProjectWiseReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
