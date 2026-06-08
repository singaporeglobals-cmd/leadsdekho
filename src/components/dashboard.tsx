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
              <div className="h-16 rounded bg-gray-200" />
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalLeads as number}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today Follow-ups</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.todayFollowUps as number}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <CalendarCheck className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalProperties as number}
                </p>
              </div>
              <div className="rounded-lg bg-cyan-50 p-3">
                <Home className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Won Deals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statusCounts["Won"] || 0}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
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
              <p className="text-sm text-gray-500">No leads yet</p>
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
                    <span className="text-sm font-medium text-gray-700">
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
              <p className="text-sm text-gray-500">No data</p>
            ) : (
              Object.entries(sourceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-600">{source}</span>
                    <span className="text-sm font-medium text-gray-700">
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
              <p className="text-sm text-gray-500">No team members</p>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {member.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500">
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
            className="text-emerald-600"
            onClick={() => setPage("leads")}
          >
            View All <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-gray-500">
              No leads yet. Create your first lead!
            </p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {lead.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[lead.pipelineStatus] || ""}`}
                      >
                        {lead.pipelineStatus}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-sm text-gray-500">
                      {lead.phone} · Owner: {lead.currentOwner.name}
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
              <div className="h-16 rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard</div>;

  const statusCounts = (data.statusCounts || {}) as Record<string, number>;
  const todayFollowUps = (data.todayFollowUps || []) as Array<{
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">My Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.myLeadsCount as number}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">All Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.allLeadsCount as number}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today Follow-ups</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayFollowUps.length}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <CalendarCheck className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Calls Made</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.myCallLogsCount as number}
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3">
                <Phone className="h-5 w-5 text-purple-600" />
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
              <p className="text-sm text-gray-500">No leads yet</p>
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
                    <span className="text-sm font-medium text-gray-700">
                      {count as number}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Today's Follow-ups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Today&apos;s Follow-ups</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600"
              onClick={() => setPage("leads")}
            >
              View Leads
            </Button>
          </CardHeader>
          <CardContent>
            {todayFollowUps.length === 0 ? (
              <p className="text-sm text-gray-500">
                No follow-ups scheduled for today
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {todayFollowUps.map((fu) => (
                  <div
                    key={fu.id}
                    className="rounded-lg border border-gray-100 p-3"
                  >
                    <div className="font-medium text-gray-900">
                      {fu.lead.name}
                    </div>
                    <div className="text-sm text-gray-500">{fu.lead.phone}</div>
                    <div className="mt-1 text-xs text-gray-400">
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
            <p className="text-sm text-gray-500">No calls logged yet</p>
          ) : (
            <div className="space-y-2">
              {recentCallLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {log.lead.name}
                    </div>
                    <div className="text-sm text-gray-500">
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
              <div className="h-16 rounded bg-gray-200" />
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
  const todayFollowUps = (data.todayFollowUps || []) as Array<{
    id: string;
    scheduledAt: string;
    notes: string;
    lead: { id: string; name: string; phone: string };
  }>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">My Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.myLeadsCount as number}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Visits Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.visitsScheduled as number}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <MapPin className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Negotiation</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.dealsInNegotiation as number}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <Phone className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Won Deals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.wonDeals as number}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
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
              <p className="text-sm text-gray-500">No leads yet</p>
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
                    <span className="text-sm font-medium text-gray-700">
                      {count as number}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Today&apos;s Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {todayFollowUps.length === 0 ? (
              <p className="text-sm text-gray-500">
                No follow-ups for today
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {todayFollowUps.map((fu) => (
                  <div
                    key={fu.id}
                    className="rounded-lg border border-gray-100 p-3"
                  >
                    <div className="font-medium text-gray-900">
                      {fu.lead.name}
                    </div>
                    <div className="text-sm text-gray-500">{fu.lead.phone}</div>
                    <div className="mt-1 text-xs text-gray-400">{fu.notes}</div>
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
            className="text-emerald-600"
            onClick={() => setPage("leads")}
          >
            View All <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-gray-500">No leads yet</p>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {lead.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[lead.pipelineStatus] || ""}`}
                      >
                        {lead.pipelineStatus}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">{lead.phone}</div>
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
