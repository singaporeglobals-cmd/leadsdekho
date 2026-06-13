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
  AlertCircle, UserCheck, UserX, Clock, BarChart3,
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
  connectedLeads: number;
  notConnectedLeads: number;
  siteVisitArranged: number;
  visitDone: number;
  bookingCount: number;
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

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Leads"
              value={data.totalLeads}
              icon={Users}
              color="#dfb338"
              onClick={() => navigateToLeads()}
            />
            <MetricCard
              label="Follow-up Leads"
              value={data.followUpLeads}
              icon={Clock}
              color="#8b5cf6"
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
              label="Connected"
              value={data.connectedLeads}
              icon={Phone}
              color="#3b82f6"
              onClick={() => navigateToLeads()}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <MetricCard
              label="Booking"
              value={data.bookingCount}
              icon={TrendingUp}
              color="#22c55e"
              onClick={() => navigateToLeads("Booked")}
            />
          </div>

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
