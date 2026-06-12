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
  isViaLeadStatus?: boolean;
}

interface LeadWithVisitDone {
  id: string;
  name: string;
  phone: string;
  leadStatus: string;
  currentOwner: { id: string; name: string };
  project: { id: string; name: string } | null;
  createdAt: string;
}

export function SiteVisitModule() {
  const { user, setSelectedLeadId, setPage } = useAppStore();
  const [visits, setVisits] = useState<SiteVisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refresh, setRefresh] = useState(0);

  // Update visit dialog
  const [updateDialog, setUpdateDialog] = useState<SiteVisitItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateFeedback, setUpdateFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Fetch actual site visits
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

        // Also fetch leads with leadStatus "Site Visit Done"
        const svDoneRes = await fetch("/api/leads?leadStatus=Site+Visit+Done");
        if (!cancelled && svDoneRes.ok) {
          const svDoneData = await svDoneRes.json();
          const svDoneLeads = (svDoneData.leads || []) as LeadWithVisitDone[];

          // Get lead IDs that already have actual site visit records
          const leadsWithVisits = new Set(allVisits.map((v) => v.leadId));

          // Add virtual visit entries for leads with "Site Visit Done" status but no actual visit record
          for (const lead of svDoneLeads) {
            if (!leadsWithVisits.has(lead.id)) {
              allVisits.push({
                id: `virtual-svd-${lead.id}`,
                leadId: lead.id,
                scheduledAt: lead.createdAt,
                notes: "Via Lead Status: Site Visit Done",
                status: "Completed",
                feedback: null,
                user: lead.currentOwner || { id: "", name: "Unknown" },
                lead: { id: lead.id, name: lead.name, phone: lead.phone },
                isViaLeadStatus: true,
              });
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
  }, [statusFilter, refresh]);

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

  const upcomingVisits = visits.filter(
    (v) => v.status === "Scheduled" && new Date(v.scheduledAt) >= new Date()
  );
  const pastVisits = visits.filter(
    (v) => v.status !== "Scheduled" || new Date(v.scheduledAt) < new Date()
  );

  const virtualVisitCount = visits.filter((v) => v.isViaLeadStatus).length;

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
              Schedule visits from a lead detail page
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Card key={visit.id} className={`hover:shadow-md transition-shadow ${visit.isViaLeadStatus ? "border-l-4 border-l-brand" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
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
