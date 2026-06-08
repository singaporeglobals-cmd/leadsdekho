"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  Phone,
  Calendar,
  MapPin,
  Clock,
  User,
  MessageSquare,
  Lock,
  Edit,
  Save,
  X,
  Plus,
  CheckCircle2,
  XCircle,
  Home,
  Trash2,
} from "lucide-react";

const PIPELINE_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Visit Scheduled",
  "Visited",
  "Negotiation",
  "Won",
  "Lost",
];

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

interface LeadProperty {
  id: string;
  property: {
    id: string;
    name: string;
    type: string;
    status: string;
    price: number | null;
    location: string | null;
    size: string | null;
  };
  createdAt: string;
}

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  budget: string | null;
  notes: string | null;
  pipelineStatus: string;
  lostReason: string | null;
  primaryOwnerId: string;
  currentOwnerId: string;
  primaryOwner: { id: string; name: string; email: string; role: string };
  currentOwner: { id: string; name: string; email: string; role: string };
  project: { id: string; name: string } | null;
  leadProperties: LeadProperty[];
  callLogs: Array<{
    id: string;
    notes: string;
    callType: string;
    callDate: string;
    createdAt: string;
    user: { id: string; name: string };
  }>;
  followUps: Array<{
    id: string;
    scheduledAt: string;
    notes: string;
    completed: boolean;
    completedAt: string | null;
    user: { id: string; name: string };
  }>;
  siteVisits: Array<{
    id: string;
    scheduledAt: string;
    notes: string;
    status: string;
    feedback: string | null;
    user: { id: string; name: string };
  }>;
  assignments: Array<{
    id: string;
    fromUser: { name: string };
    toUser: { name: string };
    reason: string | null;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    description: string;
    createdAt: string;
    user: { name: string } | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export function LeadDetail() {
  const { user, selectedLeadId, setPage } = useAppStore();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Dialogs
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [siteVisitOpen, setSiteVisitOpen] = useState(false);
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  // Properties
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [availableProperties, setAvailableProperties] = useState<Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    price: number | null;
  }>>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

  const fetchLead = async () => {
    if (!selectedLeadId) return;
    setLoading(true);
    const res = await fetch(`/api/leads/${selectedLeadId}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data);
      setEditForm({
        name: data.name,
        phone: data.phone,
        email: data.email || "",
        source: data.source,
        budget: data.budget || "",
        notes: data.notes || "",
        pipelineStatus: data.pipelineStatus,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedLeadId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await fetch(`/api/leads/${selectedLeadId}`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        setLead(data);
        setEditForm({
          name: data.name,
          phone: data.phone,
          email: data.email || "",
          source: data.source,
          budget: data.budget || "",
          notes: data.notes || "",
          pipelineStatus: data.pipelineStatus,
        });
      }
      if (!cancelled) setLoading(false);

      const uRes = await fetch("/api/users");
      if (!cancelled && uRes.ok) setUsers(await uRes.json());
    })();
    return () => { cancelled = true; };
  }, [selectedLeadId]);

  const canEdit =
    user?.role === "admin" || lead?.currentOwnerId === user?.id;

  const isViewOnly =
    lead &&
    user?.role === "sales" &&
    lead.primaryOwnerId === user.id &&
    lead.currentOwnerId !== user.id;

  const handleSaveEdit = async () => {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditing(false);
      fetchLead();
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!lead || !canEdit) return;
    if (status === "Lost") {
      setLostReasonOpen(true);
      return;
    }
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStatus: status }),
    });
    if (res.ok) fetchLead();
  };

  const handleMarkLost = async () => {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStatus: "Lost", lostReason }),
    });
    if (res.ok) {
      setLostReasonOpen(false);
      setLostReason("");
      fetchLead();
    }
  };

  const handleLogCall = async (notes: string, callType: string) => {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}/call-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, callType }),
    });
    if (res.ok) {
      setCallLogOpen(false);
      fetchLead();
    }
  };

  const handleScheduleFollowUp = async (
    scheduledAt: string,
    notes: string
  ) => {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}/follow-ups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt, notes }),
    });
    if (res.ok) {
      setFollowUpOpen(false);
      fetchLead();
    }
  };

  const handleScheduleSiteVisit = async (
    scheduledAt: string,
    notes: string
  ) => {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}/site-visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt, notes }),
    });
    if (res.ok) {
      setSiteVisitOpen(false);
      fetchLead();
    }
  };

  // Property management
  const handleAddProperty = async () => {
    if (!lead || !selectedPropertyId) return;
    const res = await fetch(`/api/leads/${lead.id}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: selectedPropertyId }),
    });
    if (res.ok) {
      setAddPropertyOpen(false);
      setSelectedPropertyId("");
      fetchLead();
    }
  };

  const handleRemoveProperty = async (propertyId: string) => {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}/properties`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });
    if (res.ok) {
      fetchLead();
    }
  };

  const fetchAvailableProperties = async () => {
    const res = await fetch("/api/properties");
    if (res.ok) {
      const data = await res.json();
      setAvailableProperties(data.properties || []);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setPage("leads")}>
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage("leads")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{lead.name}</h2>
          <p className="text-sm text-muted-foreground">{lead.phone}</p>
        </div>
        {canEdit && !editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Edit className="mr-1 h-3 w-3" /> Edit
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} className="bg-brand hover:bg-brand-dark">
              <Save className="mr-1 h-3 w-3" /> Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
            >
              <X className="mr-1 h-3 w-3" /> Cancel
            </Button>
          </div>
        )}
      </div>

      {/* View-only banner */}
      {isViewOnly && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Read-only — This lead is now with {lead.currentOwner.name}
          </span>
        </div>
      )}

      {/* Pipeline Status Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {PIPELINE_STAGES.map((stage) => (
              <button
                key={stage}
                onClick={() => canEdit && handleStatusChange(stage)}
                disabled={!canEdit}
                className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  lead.pipelineStatus === stage
                    ? `${statusColors[stage]} ring-2 ring-offset-1 ring-brand`
                    : "bg-muted text-muted-foreground hover:bg-accent"
                } ${!canEdit ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                {stage}
              </button>
            ))}
          </div>
          {lead.lostReason && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              Lost Reason: {lead.lostReason}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lead Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead Information</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Budget</Label>
                    <Input
                      value={editForm.budget}
                      onChange={(e) =>
                        setEditForm({ ...editForm, budget: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Source</Label>
                    <Select
                      value={editForm.source}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, source: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Manual",
                          "Website",
                          "Referral",
                          "Social Media",
                          "Walk-in",
                          "Call",
                          "CSV Import",
                        ].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Notes</Label>
                    <Textarea
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm({ ...editForm, notes: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm text-foreground">{lead.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Source</div>
                    <div className="text-sm text-foreground">{lead.source}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Budget</div>
                    <div className="text-sm text-foreground">{lead.budget || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Project</div>
                    <div className="text-sm text-foreground">
                      {lead.project?.name || "—"}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Notes</div>
                    <div className="text-sm text-foreground">{lead.notes || "—"}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Properties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4" />
                Properties ({lead.leadProperties?.length || 0})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchAvailableProperties();
                  setAddPropertyOpen(true);
                }}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Property
              </Button>
            </CardHeader>
            <CardContent>
              {!lead.leadProperties || lead.leadProperties.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No properties linked to this lead yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {lead.leadProperties.map((lp) => (
                    <div
                      key={lp.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">
                            {lp.property.name}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {lp.property.type}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              lp.property.status === "Available"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                : lp.property.status === "Sold"
                                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            }`}
                          >
                            {lp.property.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {lp.property.location && <span>{lp.property.location}</span>}
                          {lp.property.price && (
                            <span className="font-medium text-foreground">
                              ₹{lp.property.price.toLocaleString()}
                            </span>
                          )}
                          {lp.property.size && <span>{lp.property.size}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveProperty(lp.property.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCallLogOpen(true)}
              >
                <Phone className="mr-1 h-3 w-3" /> Log Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFollowUpOpen(true)}
              >
                <Calendar className="mr-1 h-3 w-3" /> Schedule Follow-up
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSiteVisitOpen(true)}
              >
                <MapPin className="mr-1 h-3 w-3" /> Schedule Visit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setLostReasonOpen(true)}
              >
                <XCircle className="mr-1 h-3 w-3" /> Mark Lost
              </Button>
            </div>
          )}

          {/* Tabs for Call Logs, Follow-ups, Site Visits, Timeline */}
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="calls">
                Calls ({lead.callLogs.length})
              </TabsTrigger>
              <TabsTrigger value="followups">
                Follow-ups ({lead.followUps.length})
              </TabsTrigger>
              <TabsTrigger value="visits">
                Visits ({lead.siteVisits.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-3">
              <Card>
                <CardContent className="p-4">
                  {lead.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No timeline events yet
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {lead.timeline.map((event) => (
                        <div
                          key={event.id}
                          className="flex gap-3 border-l-2 border-border pl-3"
                        >
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {event.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {event.user?.name || "System"} ·{" "}
                              {new Date(event.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="calls" className="mt-3">
              <Card>
                <CardContent className="p-4">
                  {lead.callLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No calls logged</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {lead.callLogs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{log.callType}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.callDate).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-foreground">
                            {log.notes}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            by {log.user.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="followups" className="mt-3">
              <Card>
                <CardContent className="p-4">
                  {lead.followUps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No follow-ups scheduled
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {lead.followUps.map((fu) => (
                        <div
                          key={fu.id}
                          className="flex items-start justify-between rounded-lg border border-border p-3"
                        >
                          <div>
                            <div className="text-sm text-foreground">
                              {fu.notes}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(fu.scheduledAt).toLocaleString()} · by{" "}
                              {fu.user.name}
                            </div>
                          </div>
                          {fu.completed ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="visits" className="mt-3">
              <Card>
                <CardContent className="p-4">
                  {lead.siteVisits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No site visits scheduled
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {lead.siteVisits.map((visit) => (
                        <div
                          key={visit.id}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className={
                                visit.status === "Completed"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : visit.status === "Cancelled"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                    : visit.status === "No Show"
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                              }
                            >
                              {visit.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(visit.scheduledAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-foreground">
                            {visit.notes}
                          </div>
                          {visit.feedback && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              Feedback: {visit.feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Owner Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ownership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Primary Owner</div>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {lead.primaryOwner.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {lead.primaryOwner.role}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground">Current Owner</div>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-brand" />
                  <span className="text-sm font-medium text-foreground">
                    {lead.currentOwner.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {lead.currentOwner.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment History */}
          {lead.assignments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Assignment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lead.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="text-xs text-foreground border-l-2 border-border pl-2"
                    >
                      <div>
                        {a.fromUser.name} → {a.toUser.name}
                      </div>
                      {a.reason && (
                        <div className="text-muted-foreground">{a.reason}</div>
                      )}
                      <div className="text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="text-foreground">{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span className="text-foreground">{new Date(lead.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Call Dialog */}
      <Dialog open={callLogOpen} onOpenChange={setCallLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
          </DialogHeader>
          <CallLogForm onSubmit={handleLogCall} />
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <FollowUpForm onSubmit={handleScheduleFollowUp} />
        </DialogContent>
      </Dialog>

      {/* Site Visit Dialog */}
      <Dialog open={siteVisitOpen} onOpenChange={setSiteVisitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Site Visit</DialogTitle>
          </DialogHeader>
          <SiteVisitForm onSubmit={handleScheduleSiteVisit} />
        </DialogContent>
      </Dialog>

      {/* Lost Reason Dialog */}
      <Dialog open={lostReasonOpen} onOpenChange={setLostReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reason for losing this lead *</Label>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            </div>
            <Button
              onClick={handleMarkLost}
              className="w-full bg-destructive hover:bg-destructive/90"
              disabled={!lostReason}
            >
              Mark as Lost
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Property Dialog */}
      <Dialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Select Property</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a property..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties
                    .filter(
                      (p) =>
                        !lead.leadProperties?.some(
                          (lp) => lp.property.id === p.id
                        )
                    )
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.type} {p.price ? `(₹${p.price.toLocaleString()})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddProperty}
              className="w-full bg-brand hover:bg-brand-dark"
              disabled={!selectedPropertyId}
            >
              Link Property
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-forms
function CallLogForm({
  onSubmit,
}: {
  onSubmit: (notes: string, callType: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [callType, setCallType] = useState("Feedback");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Call Type</Label>
        <Select value={callType} onValueChange={setCallType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Feedback">Feedback</SelectItem>
            <SelectItem value="Cold Call">Cold Call</SelectItem>
            <SelectItem value="Follow-up">Follow-up</SelectItem>
            <SelectItem value="Site Visit Call">Site Visit Call</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Notes *</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      <Button
        onClick={() => onSubmit(notes, callType)}
        className="w-full bg-brand hover:bg-brand-dark"
        disabled={!notes}
      >
        Log Call
      </Button>
    </div>
  );
}

function FollowUpForm({
  onSubmit,
}: {
  onSubmit: (scheduledAt: string, notes: string) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Scheduled Date & Time *</Label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Notes *</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      <Button
        onClick={() => onSubmit(scheduledAt, notes)}
        className="w-full bg-brand hover:bg-brand-dark"
        disabled={!notes || !scheduledAt}
      >
        Schedule Follow-up
      </Button>
    </div>
  );
}

function SiteVisitForm({
  onSubmit,
}: {
  onSubmit: (scheduledAt: string, notes: string) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Scheduled Date & Time *</Label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Visit details, location, etc."
        />
      </div>
      <Button
        onClick={() => onSubmit(scheduledAt, notes)}
        className="w-full bg-brand hover:bg-brand-dark"
        disabled={!scheduledAt}
      >
        Schedule Visit
      </Button>
    </div>
  );
}
