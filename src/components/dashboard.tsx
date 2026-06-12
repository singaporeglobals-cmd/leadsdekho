"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Phone,
  TrendingUp,
  CalendarCheck,
  Building2,
  Home,
  ArrowUpRight,
  Eye,
  MapPin,
  Clock,
  AlertCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  role: string;
  [key: string]: unknown;
}

const statusColors: Record<string, string> = {
  New: "bg-slate-500 text-white",
  Contacted: "bg-blue-500 text-white",
  Qualified: "bg-cyan-500 text-white",
  "Visit Scheduled": "bg-amber-500 text-white",
  Visited: "bg-purple-500 text-white",
  Negotiation: "bg-orange-500 text-white",
  Won: "bg-emerald-500 text-white",
  Lost: "bg-red-500 text-white",
};

export function AdminDashboard() {
  const { setPage } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard</div>;

  const statusCounts = (data.statusCounts || {}) as Record<string, number>;
  const sourceCounts = (data.sourceCounts || {}) as Record<string, number>;
  const recentLeads = (data.recentLeads || []) as Array<{
    id: string;
    name: string;
    phone: string;
    pipelineStatus: string;
    currentOwner: { name: string };
    primaryOwner: { name: string };
    createdAt: string;
  }>;
  const teamMembers = (data.teamMembers || []) as Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    _count: { currentLeads: number; primaryLeads: number; callLogs: number };
  }>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-brand">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.totalLeads as number}
                </p>
              </div>
              <div className="rounded-lg bg-brand-light p-3">
                <Users className="h-5 w-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today Follow-ups</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.todayFollowUps as number}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                <CalendarCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.pendingFollowUps as number}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.totalProjects as number}
                </p>
              </div>
              <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950 p-3">
                <Home className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-brand">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won Deals</p>
                <p className="text-2xl font-bold text-foreground">
                  {statusCounts["Won"] || 0}
                </p>
              </div>
              <div className="rounded-lg bg-brand-light p-3">
                <TrendingUp className="h-5 w-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leads by Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leads by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads yet</p>
            ) : (
              Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <Badge
                      variant="secondary"
                      className={statusColors[status] || ""}
                    >
                      {status}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {count as number}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(sourceCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              Object.entries(sourceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">{source}</span>
                    <span className="text-sm font-medium text-foreground">
                      {count as number}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members</p>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {member.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{member._count.currentLeads} owned</span>
                    <span>{member._count.callLogs} calls</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Leads</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-brand"
            onClick={() => setPage("leads")}
          >
            View All <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads yet. Create your first lead!
            </p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {lead.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[lead.pipelineStatus] || ""}`}
                      >
                        {lead.pipelineStatus}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">{lead.phone}<button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(lead.phone); }} className="inline-flex text-muted-foreground hover:text-brand transition-colors"><Copy className="h-3 w-3" /></button></span> · Owner: {lead.currentOwner.name}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      useAppStore.getState().setSelectedLeadId(lead.id);
                      setPage("lead-detail");
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function TelecallingDashboard() {
  const { setPage } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard</div>;

  const statusCounts = (data.statusCounts || {}) as Record<string, number>;
  const todayFollowUps = (data.todayFollowUps || 0) as number;
  const pendingFollowUps = (data.pendingFollowUps || 0) as number;
  const pendingFollowUpsList = (data.pendingFollowUpsList || []) as Array<{
    id: string;
    scheduledAt: string;
    notes: string;
    lead: { id: string; name: string; phone: string };
  }>;
  const recentCallLogs = (data.recentCallLogs || []) as Array<{
    id: string;
    notes: string;
    callType: string;
    createdAt: string;
    lead: { id: string; name: string };
  }>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-brand">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Leads</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.myLeadsCount as number}
                </p>
              </div>
              <div className="rounded-lg bg-brand-light p-3">
                <Users className="h-5 w-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">All Leads</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.allLeadsCount as number}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today Follow-ups</p>
                <p className="text-2xl font-bold text-foreground">
                  {todayFollowUps}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                <CalendarCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
                <p className="text-2xl font-bold text-foreground">
                  {pendingFollowUps}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calls Made</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.myCallLogsCount as number}
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-3">
                <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Leads by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads yet</p>
            ) : (
              Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <Badge
                      variant="secondary"
                      className={statusColors[status] || ""}
                    >
                      {status}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {count as number}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Pending Follow-ups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Pending Follow-ups ({pendingFollowUps})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-brand"
              onClick={() => setPage("leads")}
            >
              View Leads
            </Button>
          </CardHeader>
          <CardContent>
            {pendingFollowUpsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending follow-ups
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingFollowUpsList.map((fu) => (
                  <div
                    key={fu.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-foreground">
                        {fu.lead.name}
                      </div>
                      <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(fu.scheduledAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">{fu.lead.phone}<button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(fu.lead.phone); }} className="inline-flex text-muted-foreground hover:text-brand transition-colors"><Copy className="h-3 w-3" /></button></div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fu.notes}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCallLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls logged yet</p>
          ) : (
            <div className="space-y-2">
              {recentCallLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {log.lead.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.notes.substring(0, 80)}
                      {log.notes.length > 80 ? "..." : ""}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {log.callType}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SalesDashboard() {
  const { setPage } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard</div>;

  const statusCounts = (data.statusCounts || {}) as Record<string, number>;
  const recentLeads = (data.recentLeads || []) as Array<{
    id: string;
    name: string;
    phone: string;
    pipelineStatus: string;
    currentOwner: { name: string };
    primaryOwner: { name: string };
  }>;
  const todayFollowUps = (data.todayFollowUps || 0) as number;
  const pendingFollowUps = (data.pendingFollowUps || 0) as number;
  const pendingFollowUpsList = (data.pendingFollowUpsList || []) as Array<{
    id: string;
    scheduledAt: string;
    notes: string;
    lead: { id: string; name: string; phone: string };
  }>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-brand">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Leads</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.myLeadsCount as number}
                </p>
              </div>
              <div className="rounded-lg bg-brand-light p-3">
                <Users className="h-5 w-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Visits Scheduled</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.visitsScheduled as number}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
                <p className="text-2xl font-bold text-foreground">
                  {pendingFollowUps}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Negotiation</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.dealsInNegotiation as number}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-3">
                <Phone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-brand">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won Deals</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.wonDeals as number}
                </p>
              </div>
              <div className="rounded-lg bg-brand-light p-3">
                <TrendingUp className="h-5 w-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Leads by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads yet</p>
            ) : (
              Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <Badge
                      variant="secondary"
                      className={statusColors[status] || ""}
                    >
                      {status}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {count as number}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Pending Follow-ups ({pendingFollowUps})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingFollowUpsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending follow-ups
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingFollowUpsList.map((fu) => (
                  <div
                    key={fu.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-foreground">
                        {fu.lead.name}
                      </div>
                      <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(fu.scheduledAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">{fu.lead.phone}<button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(fu.lead.phone); }} className="inline-flex text-muted-foreground hover:text-brand transition-colors"><Copy className="h-3 w-3" /></button></div>
                    <div className="mt-1 text-xs text-muted-foreground">{fu.notes}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">My Recent Leads</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-brand"
            onClick={() => setPage("leads")}
          >
            View All <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet</p>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {lead.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[lead.pipelineStatus] || ""}`}
                      >
                        {lead.pipelineStatus}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">{lead.phone}<button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(lead.phone); }} className="inline-flex text-muted-foreground hover:text-brand transition-colors"><Copy className="h-3 w-3" /></button></div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      useAppStore.getState().setSelectedLeadId(lead.id);
                      setPage("lead-detail");
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
