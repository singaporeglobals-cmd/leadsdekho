"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calendar,
  Eye,
  TrendingUp,
  User,
} from "lucide-react";

interface BookedLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  budget: string | null;
  leadStatus: string | null;
  project: { id: string; name: string } | null;
  currentOwner: { id: string; name: string };
  primaryOwner: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export function BookingsPage() {
  const { setSelectedLeadId, setPage } = useAppStore();
  const [leads, setLeads] = useState<BookedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/leads?leadStatus=Booked");
      if (!cancelled && res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredLeads = leads.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.phone.toLowerCase().includes(q) ||
      (lead.email?.toLowerCase().includes(q) ?? false) ||
      (lead.project?.name?.toLowerCase().includes(q) ?? false) ||
      lead.currentOwner.name.toLowerCase().includes(q)
    );
  });

  const today = new Date().toISOString().split("T")[0];
  const todayBookings = filteredLeads.filter(
    (l) => l.updatedAt.split("T")[0] === today || l.createdAt.split("T")[0] === today
  );
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthBookings = filteredLeads.filter((l) => {
    const d = new Date(l.updatedAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-foreground">{filteredLeads.length}</p>
              </div>
              <div className="rounded-lg bg-brand-light p-3">
                <Building2 className="h-5 w-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Bookings</p>
                <p className="text-2xl font-bold text-foreground">{todayBookings.length}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-3">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground">{thisMonthBookings.length}</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search bookings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Bookings List */}
      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">No bookings found</p>
            <p className="text-sm text-muted-foreground">
              Leads marked as &quot;Booked&quot; will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{lead.name}</span>
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        Booked
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {lead.phone}
                      {lead.email && ` · ${lead.email}`}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {lead.project && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.project.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {lead.currentOwner.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                      {lead.budget && <span>Budget: {lead.budget}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSelectedLeadId(lead.id);
                      setPage("lead-detail");
                    }}
                  >
                    <Eye className="mr-1 h-3 w-3" /> View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
