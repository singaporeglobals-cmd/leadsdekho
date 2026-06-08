"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Calendar, TrendingUp } from "lucide-react";
import { useAppStore } from "@/lib/store";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

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

export function ReportsPage() {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState("daily");
  const [dailyDate, setDailyDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [monthlyMonth, setMonthlyMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [dailyData, setDailyData] = useState<Record<string, unknown> | null>(
    null
  );
  const [monthlyData, setMonthlyData] = useState<Record<string, unknown> | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "daily") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/reports/daily?date=${dailyDate}`);
      if (!cancelled && res.ok) setDailyData(await res.json());
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dailyDate, activeTab]);

  useEffect(() => {
    if (activeTab !== "monthly") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/reports/monthly?month=${monthlyMonth}`);
      if (!cancelled && res.ok) setMonthlyData(await res.json());
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [monthlyMonth, activeTab]);

  const handleExport = async (type: string) => {
    const res = await fetch(`/api/reports/export?type=${type}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const renderDailyReport = () => {
    if (!dailyData) return <p className="text-gray-500">No data</p>;

    const statusCounts = (dailyData.statusCounts || {}) as Record<string, number>;
    const chartData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      fill: statusColors[name] || "#64748b",
    }));

    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Leads Created</p>
              <p className="text-2xl font-bold">
                {dailyData.leadsCreated as number}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Call Logs</p>
              <p className="text-2xl font-bold">
                {dailyData.callLogs as number}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Follow-ups</p>
              <p className="text-2xl font-bold">
                {dailyData.followUps as number}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Site Visits</p>
              <p className="text-2xl font-bold">
                {dailyData.siteVisits as number}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Assignments</p>
              <p className="text-2xl font-bold">
                {dailyData.assignments as number}
              </p>
            </CardContent>
          </Card>
        </div>

        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderMonthlyReport = () => {
    if (!monthlyData) return <p className="text-gray-500">No data</p>;

    const statusCounts = (monthlyData.statusCounts || {}) as Record<string, number>;
    const sourceCounts = (monthlyData.sourceCounts || {}) as Record<string, number>;

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
    const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({
      name,
      value,
    }));

    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Leads Created</p>
              <p className="text-2xl font-bold">
                {monthlyData.leadsCreated as number}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Won Deals</p>
              <p className="text-2xl font-bold text-green-600">
                {monthlyData.wonLeads as number}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Lost Deals</p>
              <p className="text-2xl font-bold text-red-600">
                {monthlyData.lostLeads as number}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Call Logs</p>
              <p className="text-2xl font-bold">
                {monthlyData.callLogsCount as number}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold">
                {monthlyData.leadsCreated
                  ? Math.round(
                      ((monthlyData.wonLeads as number) /
                        (monthlyData.leadsCreated as number)) *
                        100
                    )
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {statusData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Leads by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        dataKey="value"
                      >
                        {statusData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {sourceData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("leads")}
        >
          <Download className="mr-1 h-3 w-3" /> Export Leads
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("callLogs")}
        >
          <Download className="mr-1 h-3 w-3" /> Export Call Logs
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("siteVisits")}
        >
          <Download className="mr-1 h-3 w-3" /> Export Site Visits
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daily">
            <Calendar className="mr-1 h-3 w-3" /> Daily
          </TabsTrigger>
          <TabsTrigger value="monthly">
            <TrendingUp className="mr-1 h-3 w-3" /> Monthly
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            <Label>Select Date:</Label>
            <Input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="w-48 h-9"
            />
          </div>
          {loading ? (
            <div className="animate-pulse h-48 rounded-lg bg-gray-200" />
          ) : (
            renderDailyReport()
          )}
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            <Label>Select Month:</Label>
            <Input
              type="month"
              value={monthlyMonth}
              onChange={(e) => setMonthlyMonth(e.target.value)}
              className="w-48 h-9"
            />
          </div>
          {loading ? (
            <div className="animate-pulse h-48 rounded-lg bg-gray-200" />
          ) : (
            renderMonthlyReport()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
