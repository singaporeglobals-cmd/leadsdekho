"use client";

import { useEffect, useState } from "react";
import { useAppStore, isAdminRole } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Users,
  Building2,
  Filter,
  RotateCcw,
} from "lucide-react";

const visitStatusColors: Record<string, string> = {
  Scheduled: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  "No Show": "bg-gray-100 text-gray-700",
};

interface SiteVisitItem {
  id: string;
  leadId: string;
  scheduledAt: string;
  notes: string;
  status: string;
  feedback: string | null;
  user: { id: string; name: string };
  lead: {
    id: string;
    name: string;
    phone: string;
    source?: string;
    projectId?: string | null;
    project?: { id: string; name: string } | null;
  };
  isViaLeadStatus?: boolean;
}

interface UserOption { id: string; name: string; role: string; isActive: boolean; }
interface ProjectItem { id: string; name: string; }

export function SiteVisitModule() {
  const { setSelectedLeadId, setPage, user } = useAppStore();
  const [allVisits, setAllVisits] = useState<SiteVisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refresh, setRefresh] = useState(0);

  // New filters
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Update visit dialog
  const [updateDialog, setUpdateDialog] = useState<SiteVisitItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateFeedback, setUpdateFeedback] = useState("");

  // Fetch users, projects, sources (admin only) - parallel for speed
  useEffect(() => {
    if (!isAdminRole(user?.role || "")) return;
    (async () => {
      try {
        const [uRes, pRes, srcRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/projects"),
          fetch("/api/lead-sources"),
        ]);
        if (uRes.ok) setUsers(await uRes.json());
        if (pRes.ok) setProjects(await pRes.json());
        if (srcRes.ok) {
          const data = await srcRes.json();
          if (Array.isArray(data)) setSources(data.map((s: { name: string }) => s.name));
        }
      } catch (e) { console.error(e); }
    })();
  }, [user?.role]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (isAdminRole(user?.role || "") && userFilter !== "all") params.set("userId", userFilter);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        if (projectFilter !== "all") params.set("projectId", projectFilter);
        if (sourceFilter !== "all") params.set("source", sourceFilter);

        const res = await fetch(`/api/site-visits?${params.toString()}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setAllVisits(data.visits || []);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refresh, userFilter, dateFrom, dateTo, projectFilter, sourceFilter, user?.role]);

  const handleUpdateVisit = async () => {
    if (!updateDialog || updateDialog.isViaLeadStatus) return;
    const res = await fetch(`/api/leads/${updateDialog.leadId}/site-visits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitId: updateDialog.id,
        status: updateStatus,
        feedback: updateFeedback,
      }),
    });
    if (res.ok) {
      setUpdateDialog(null);
      setRefresh(r => r + 1);
    }
  };

  // Quick date presets
  const applyPreset = (preset: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (preset === "today") { setDateFrom(today); setDateTo(today); }
    else if (preset === "yesterday") {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const s = d.toISOString().split("T")[0];
      setDateFrom(s); setDateTo(s);
    } else if (preset === "last7") {
      const d = new Date(); d.setDate(d.getDate() - 6);
      setDateFrom(d.toISOString().split("T")[0]); setDateTo(today);
    } else if (preset === "last30") {
      const d = new Date(); d.setDate(d.getDate() - 29);
      setDateFrom(d.toISOString().split("T")[0]); setDateTo(today);
    } else if (preset === "thismonth") {
      const d = new Date();
      setDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]);
      setDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]);
    }
  };

  const clearAllFilters = () => {
    setStatusFilter("all");
    setUserFilter("all");
    setProjectFilter("all");
    setSourceFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // Filter visits by status (client-side)
  const visits = statusFilter === "all"
    ? allVisits
    : allVisits.filter((v) => v.status === statusFilter);

  const upcomingVisits = visits.filter(
    (v) => v.status === "Scheduled" && new Date(v.scheduledAt) >= new Date()
  );
  const pastVisits = visits.filter(
    (v) => v.status !== "Scheduled" || new Date(v.scheduledAt) < new Date()
  );

  const virtualVisitCount = visits.filter((v) => v.isViaLeadStatus).length;

  const hasActiveFilters = statusFilter !== "all" || userFilter !== "all" || projectFilter !== "all" || sourceFilter !== "all" || dateFrom !== "" || dateTo !== "";

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-foreground">{upcomingVisits.length}</p>
              </div>
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {visits.filter((v) => v.status === "Completed").length}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold text-foreground">
                  {visits.filter((v) => v.status === "Cancelled").length}
                </p>
              </div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Via Lead Status</p>
                <p className="text-2xl font-bold text-foreground">
                  {virtualVisitCount}
                </p>
              </div>
              <MapPin className="h-5 w-5 text-brand" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar - Admin sees all 4 filters, sales sees only date+project+source */}
      <Card className="border-brand/20">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Quick Date Presets */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quick Date Range</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("today")}>Today</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("yesterday")}>Yesterday</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("last7")}>Last 7 Days</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("last30")}>Last 30 Days</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("thismonth")}>This Month</Button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Status filter (existing) */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="No Show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User filter - admin only */}
              {isAdminRole(user?.role || "") && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">User</Label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-[180px] h-9">
                      <Users className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.filter(u => u.isActive).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom Date Range */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-9" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-9" />
              </div>

              {/* Project filter */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Project</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-[180px] h-9">
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

              {/* Source filter */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Source</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[160px] h-9">
                    <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground" onClick={clearAllFilters}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>

            {/* Active filter indicators */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1.5">
                {dateFrom && dateTo && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Calendar className="h-3 w-3" /> {dateFrom} — {dateTo}
                  </Badge>
                )}
                {userFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="h-3 w-3" /> {users.find(u => u.id === userFilter)?.name || "User"}
                  </Badge>
                )}
                {projectFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Building2 className="h-3 w-3" /> {projects.find(p => p.id === projectFilter)?.name || "Project"}
                  </Badge>
                )}
                {sourceFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Filter className="h-3 w-3" /> {sourceFilter}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visits List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <MapPin className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">No site visits found</p>
            <p className="text-sm text-muted-foreground">
              Schedule visits from a lead detail page or set lead status to &quot;Site Visit Done&quot;
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Showing {visits.length} visit{visits.length !== 1 ? "s" : ""}
          </div>
          {visits.map((visit) => (
            <Card key={visit.id} className={`hover:shadow-md transition-shadow ${visit.isViaLeadStatus ? "border-l-4 border-l-brand" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {visit.lead.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${visitStatusColors[visit.status] || ""}`}
                      >
                        {visit.status}
                      </Badge>
                      {visit.isViaLeadStatus && (
                        <Badge variant="outline" className="text-xs border-brand/30 text-brand">
                          Via Lead Status
                        </Badge>
                      )}
                      {/* Show owner (admin view) */}
                      {isAdminRole(user?.role || "") && visit.user?.name && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" /> {visit.user.name}
                        </Badge>
                      )}
                      {/* Show project */}
                      {visit.lead.project && (
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" /> {visit.lead.project.name}
                        </Badge>
                      )}
                      {/* Show source */}
                      {visit.lead.source && (
                        <Badge variant="outline" className="text-xs">
                          {visit.lead.source}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {visit.lead.phone}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(visit.scheduledAt).toLocaleString()}
                    </div>
                    {visit.notes && !visit.isViaLeadStatus && (
                      <div className="mt-1 text-sm text-foreground">
                        {visit.notes}
                      </div>
                    )}
                    {visit.feedback && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Feedback: {visit.feedback}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {visit.status === "Scheduled" && !visit.isViaLeadStatus && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setUpdateDialog(visit);
                          setUpdateStatus("Completed");
                          setUpdateFeedback("");
                        }}
                      >
                        Update
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSelectedLeadId(visit.leadId);
                        setPage("lead-detail");
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Visit Dialog */}
      <Dialog
        open={!!updateDialog && !updateDialog?.isViaLeadStatus}
        onOpenChange={() => setUpdateDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Site Visit</DialogTitle>
          </DialogHeader>
          {updateDialog && !updateDialog.isViaLeadStatus && (
            <div className="space-y-3">
              <div>
                <div className="font-medium">
                  {updateDialog.lead.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Scheduled:{" "}
                  {new Date(updateDialog.scheduledAt).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="No Show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Feedback</Label>
                <Textarea
                  value={updateFeedback}
                  onChange={(e) => setUpdateFeedback(e.target.value)}
                  placeholder="Visit feedback..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleUpdateVisit}
                className="w-full bg-brand hover:bg-brand-dark"
              >
                Update Visit
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
