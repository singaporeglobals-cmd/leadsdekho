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
  Users, Phone, TrendingUp, CalendarCheck, MapPin, Building2,
  AlertCircle, UserCheck, UserX, Clock, BarChart3, CalendarDays, Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

interface UserOption {
  id: string;
  name: string;
  role: string;
}

interface UserReportData {
  totalLeads: number;
  followUpLeads: number;
  freshLeadsToday: number;
  totalFreshLeadsInRange: number;
  freshLeadsByDate: Array<{ date: string; count: number }>;
  connectedLeads: number;
  notConnectedLeads: number;
  siteVisitArranged: number;
  visitDone: number;
  bookingCount: number;
  totalCalls?: number;
  lostLeads?: number;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`relative overflow-hidden ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: color }} />
      <CardContent className="p-4 pl-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: color + "18" }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDefaultDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  return { firstDay, lastDay };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

export function UserReportPage() {
  const { setPage } = useAppStore();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const { firstDay: defaultFrom, lastDay: defaultTo } = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [data, setData] = useState<UserReportData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch active telecalling/sales users
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const allUsers = await res.json();
          const filtered = (allUsers || []).filter(
            (u: UserOption) => u.role === "telecalling" || u.role === "sales"
          );
          setUsers(filtered);
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Fetch user report data
  useEffect(() => {
    if (!selectedUser || selectedUser === "all") {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ userId: selectedUser });
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);

        const res = await fetch(`/api/reports/user?${params}`);
        if (!cancelled && res.ok) {
          setData(await res.json());
        }
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedUser, fromDate, toDate]);

  const navigateToLeads = (leadStatus?: string) => {
    // Navigate to leads page - the leads page should handle filtering
    setPage("leads");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-brand" /> User Report
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">View individual user performance metrics</p>
      </div>

      {/* Filter Bar */}
      <Card className="border-brand/20">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Quick Date Presets */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quick Date Range</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setFromDate(todayStr()); setToDate(todayStr()); }}>Today</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().split("T")[0]; setFromDate(s); setToDate(s); }}>Yesterday</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 2); setFromDate(d.toISOString().split("T")[0]); setToDate(todayStr()); }}>Last 3 Days</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setFromDate(d.toISOString().split("T")[0]); setToDate(todayStr()); }}>Last 7 Days</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 29); setFromDate(d.toISOString().split("T")[0]); setToDate(todayStr()); }}>Last 30 Days</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { const d = new Date(); setFromDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]); setToDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]); }}>This Month</Button>
              </div>
            </div>
            {/* User + Custom Date Range */}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-52 h-9">
                    <Users className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40 h-9" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40 h-9" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No user selected */}
      {selectedUser === "all" && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Select a user to view their report</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && selectedUser !== "all" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* User Dashboard */}
      {data && !loading && selectedUser !== "all" && (
        <div className="space-y-6">
          {/* User name display */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-brand/15 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {users.find(u => u.id === selectedUser)?.name || "Unknown User"}
              </p>
              <p className="text-sm text-muted-foreground">
                {users.find(u => u.id === selectedUser)?.role || ""}
              </p>
            </div>
          </div>

          {/* Summary Cards - Row 1: Fresh leads prominent */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Total Fresh Leads (in range)</p>
                    <p className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                      {data.totalFreshLeadsInRange ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fromDate} to {toDate}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900 p-3">
                    <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <MetricCard
              label="Total Leads"
              value={data.totalLeads}
              icon={Users}
              color="#dfb338"
              onClick={() => navigateToLeads()}
            />
            <MetricCard
              label="Fresh Leads Today"
              value={data.freshLeadsToday}
              icon={CalendarCheck}
              color="#f59e0b"
              onClick={() => navigateToLeads()}
            />
            <MetricCard
              label="Follow-up Leads"
              value={data.followUpLeads}
              icon={Clock}
              color="#8b5cf6"
              onClick={() => navigateToLeads()}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Connected"
              value={data.connectedLeads}
              icon={Phone}
              color="#3b82f6"
              onClick={() => navigateToLeads()}
            />
            <MetricCard
              label="Not Connected"
              value={data.notConnectedLeads}
              icon={UserX}
              color="#ef4444"
              onClick={() => navigateToLeads("Not Connected")}
            />
            <MetricCard
              label="Site Visit Arranged"
              value={data.siteVisitArranged}
              icon={MapPin}
              color="#f97316"
              onClick={() => navigateToLeads("Site Visit Promised")}
            />
            <MetricCard
              label="Visit Done"
              value={data.visitDone}
              icon={Building2}
              color="#8b5cf6"
              onClick={() => navigateToLeads("Site Visit Done")}
            />
          </div>

          {/* Per-day Fresh Lead Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand" /> Day-wise Fresh Lead Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                How many fresh leads were assigned to this user each day in the selected range
              </p>
            </CardHeader>
            <CardContent>
              {(!data.freshLeadsByDate || data.freshLeadsByDate.length === 0) ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto opacity-30" />
                  <p className="mt-2">No fresh leads found in this date range</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                  {/* Bar chart visualization + table */}
                  {data.freshLeadsByDate.map((row) => {
                    const maxCount = Math.max(...data.freshLeadsByDate.map((r) => r.count), 1);
                    const barWidth = (row.count / maxCount) * 100;
                    const isToday = row.date === todayStr();
                    return (
                      <div
                        key={row.date}
                        className={`flex items-center gap-3 p-2 rounded-lg ${isToday ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" : "hover:bg-muted/40"}`}
                      >
                        <div className="w-32 shrink-0">
                          <div className="text-sm font-medium text-foreground">
                            {formatDateLabel(row.date)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(row.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        </div>
                        <div className="flex-1 h-8 bg-muted/30 rounded relative overflow-hidden">
                          <div
                            className={`h-full rounded transition-all ${isToday ? "bg-amber-500" : "bg-brand"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="w-16 shrink-0 text-right">
                          <span className={`text-lg font-bold ${isToday ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                            {row.count}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            {row.count === 1 ? "lead" : "leads"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total row */}
                  <div className="flex items-center gap-3 p-3 mt-2 rounded-lg bg-brand/10 border-t-2 border-brand/30">
                    <div className="w-32 shrink-0">
                      <div className="text-sm font-bold text-foreground">Total</div>
                      <div className="text-xs text-muted-foreground">{data.freshLeadsByDate.length} days</div>
                    </div>
                    <div className="flex-1" />
                    <div className="w-16 shrink-0 text-right">
                      <span className="text-lg font-bold text-brand">
                        {data.freshLeadsByDate.reduce((sum, r) => sum + r.count, 0)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">leads</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Call Report — between Day-wise Fresh Lead Breakdown and Performance Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand" /> Overall Call Report
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Calls made by this user between {fromDate} and {toDate}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {/* Total Calls */}
                <div className="flex flex-col items-start p-4 rounded-lg border border-brand/20 bg-brand/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-brand" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Calls</p>
                  </div>
                  <p className="text-3xl font-bold text-brand">{data.totalCalls ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">All calls (fresh + follow-up)</p>
                </div>
                {/* Connected */}
                <div className="flex flex-col items-start p-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connected</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.connectedLeads ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Leads that picked up</p>
                </div>
                {/* Not Connected */}
                <div className="flex flex-col items-start p-4 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <UserX className="h-4 w-4 text-red-600" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Not Connected</p>
                  </div>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{data.notConnectedLeads ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Calls that didn&apos;t connect</p>
                </div>
                {/* Site Visit Promised */}
                <div className="flex flex-col items-start p-4 rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Site Visit Promised</p>
                  </div>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{data.siteVisitArranged ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Visits promised on call</p>
                </div>
                {/* Lost Lead */}
                <div className="flex flex-col items-start p-4 rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lost Lead</p>
                  </div>
                  <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{data.lostLeads ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Truly lost only (not &quot;Not Connected&quot;)</p>
                </div>
              </div>

              {/* Conversion summary */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Connection Rate</span>
                  <span className="font-semibold">
                    {(data.totalCalls ?? 0) > 0 ? Math.round(((data.connectedLeads ?? 0) / (data.totalCalls ?? 0)) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Visit Promise Rate</span>
                  <span className="font-semibold">
                    {(data.totalCalls ?? 0) > 0 ? Math.round(((data.siteVisitArranged ?? 0) / (data.totalCalls ?? 0)) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Loss Rate (of total leads)</span>
                  <span className="font-semibold">
                    {data.totalLeads > 0 ? Math.round(((data.lostLeads ?? 0) / data.totalLeads) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand" /> Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Connection Rate</span>
                  <span className="font-semibold text-foreground">
                    {data.totalLeads > 0 ? Math.round((data.connectedLeads / data.totalLeads) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Visit Conversion Rate</span>
                  <span className="font-semibold text-foreground">
                    {data.siteVisitArranged > 0 ? Math.round((data.visitDone / data.siteVisitArranged) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Booking Rate</span>
                  <span className="font-semibold text-foreground">
                    {data.totalLeads > 0 ? Math.round((data.bookingCount / data.totalLeads) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Follow-up Rate</span>
                  <span className="font-semibold text-foreground">
                    {data.totalLeads > 0 ? Math.round((data.followUpLeads / data.totalLeads) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
