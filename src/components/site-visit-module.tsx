"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  lead: { id: string; name: string; phone: string };
}

export function SiteVisitModule() {
  const { user, setSelectedLeadId, setPage } = useAppStore();
  const [visits, setVisits] = useState<SiteVisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Update visit dialog
  const [updateDialog, setUpdateDialog] = useState<SiteVisitItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateFeedback, setUpdateFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const leadsRes = await fetch("/api/leads?limit=100");
        const leadsData = await leadsRes.json();

        const allVisits: SiteVisitItem[] = [];
        for (const lead of leadsData.leads || []) {
          const vRes = await fetch(`/api/leads/${lead.id}/site-visits`);
          if (!cancelled && vRes.ok) {
            const vData = await vRes.json();
            for (const v of vData) {
              allVisits.push({ ...v, lead: { id: lead.id, name: lead.name, phone: lead.phone } });
            }
          }
        }

        allVisits.sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
        );

        if (!cancelled) {
          setVisits(
            statusFilter === "all"
              ? allVisits
              : allVisits.filter((v) => v.status === statusFilter)
          );
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [statusFilter]);

  const handleUpdateVisit = async () => {
    if (!updateDialog) return;
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
      fetchVisits();
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcomingVisits = visits.filter(
    (v) => v.status === "Scheduled" && new Date(v.scheduledAt) >= new Date()
  );
  const pastVisits = visits.filter(
    (v) => v.status !== "Scheduled" || new Date(v.scheduledAt) < new Date()
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingVisits.length}</p>
              </div>
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold">
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
                <p className="text-sm text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold">
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
                <p className="text-sm text-gray-500">No Show</p>
                <p className="text-2xl font-bold">
                  {visits.filter((v) => v.status === "No Show").length}
                </p>
              </div>
              <Clock className="h-5 w-5 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
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

      {/* Visits List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <MapPin className="h-10 w-10 text-gray-300" />
            <p className="mt-2 text-gray-500">No site visits found</p>
            <p className="text-sm text-gray-400">
              Schedule visits from a lead detail page
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Card key={visit.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {visit.lead.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${visitStatusColors[visit.status] || ""}`}
                      >
                        {visit.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {visit.lead.phone}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(visit.scheduledAt).toLocaleString()}
                    </div>
                    {visit.notes && (
                      <div className="mt-1 text-sm text-gray-600">
                        {visit.notes}
                      </div>
                    )}
                    {visit.feedback && (
                      <div className="mt-1 text-xs text-gray-500">
                        Feedback: {visit.feedback}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {visit.status === "Scheduled" && (
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
        open={!!updateDialog}
        onOpenChange={() => setUpdateDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Site Visit</DialogTitle>
          </DialogHeader>
          {updateDialog && (
            <div className="space-y-3">
              <div>
                <div className="font-medium">
                  {updateDialog.lead.name}
                </div>
                <div className="text-sm text-gray-500">
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
                className="w-full bg-emerald-600 hover:bg-emerald-700"
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
