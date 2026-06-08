"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MessageSquare,
  Trash2,
  Eye,
  MoreVertical,
  Lock,
  Filter,
  Upload,
  RefreshCw,
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

const SOURCES = [
  "Manual",
  "Website",
  "Referral",
  "Social Media",
  "Walk-in",
  "Call",
  "CSV Import",
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

const borderColorMap: Record<string, string> = {
  New: "border-l-slate-500",
  Contacted: "border-l-blue-500",
  Qualified: "border-l-cyan-500",
  "Visit Scheduled": "border-l-amber-500",
  Visited: "border-l-purple-500",
  Negotiation: "border-l-orange-500",
  Won: "border-l-emerald-500",
  Lost: "border-l-red-500",
};

interface Lead {
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
  callLogs: Array<{
    id: string;
    notes: string;
    createdAt: string;
    user: { name: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Project {
  id: string;
  name: string;
}

export function LeadList() {
  const { user, setPage, setSelectedLeadId } = useAppStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [refresh, setRefresh] = useState(0);

  // Create lead dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Manual",
    budget: "",
    notes: "",
    projectId: "",
    assignTo: "",
  });

  // Feedback dialog
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLead, setFeedbackLead] = useState<Lead | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    notes: "",
    callType: "Feedback",
    callDate: new Date().toISOString().slice(0, 16),
    assignTo: "",
  });

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLead, setAssignLead] = useState<Lead | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [assignReason, setAssignReason] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const doRefresh = () => setRefresh((r) => r + 1);

  // Fetch leads
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotal(data.total || 0);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [search, statusFilter, sourceFilter, refresh]);

  // Fetch users and projects
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user?.role === "admin") {
        const res = await fetch("/api/users");
        if (!cancelled && res.ok) {
          setUsers(await res.json());
        }
      }
      const pRes = await fetch("/api/projects");
      if (!cancelled && pRes.ok) {
        setProjects(await pRes.json());
      }
    })();
    return () => { cancelled = true; };
  }, [user?.role]);

  const handleCreateLead = async () => {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });

    if (res.ok) {
      setCreateOpen(false);
      setCreateForm({
        name: "",
        phone: "",
        email: "",
        source: "Manual",
        budget: "",
        notes: "",
        projectId: "",
        assignTo: "",
      });
      doRefresh();
    }
  };

  const handleFeedback = async () => {
    if (!feedbackLead) return;

    const res = await fetch(`/api/leads/${feedbackLead.id}/call-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedbackForm),
    });

    if (res.ok) {
      setFeedbackOpen(false);
      setFeedbackLead(null);
      setFeedbackForm({
        notes: "",
        callType: "Feedback",
        callDate: new Date().toISOString().slice(0, 16),
        assignTo: "",
      });
      doRefresh();
    }
  };

  const handleAssign = async () => {
    if (!assignLead || !assignTo) return;

    const res = await fetch(`/api/leads/${assignLead.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: assignTo, reason: assignReason }),
    });

    if (res.ok) {
      setAssignOpen(false);
      setAssignLead(null);
      setAssignTo("");
      setAssignReason("");
      doRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteId(null);
      doRefresh();
    }
  };

  const canEdit = (lead: Lead) => {
    if (!user) return false;
    return user.role === "admin" || lead.currentOwnerId === user.id;
  };

  const canViewOnly = (lead: Lead) => {
    if (!user) return false;
    if (user.role === "admin") return false;
    if (user.role === "telecalling") return false;
    return lead.primaryOwnerId === user.id && lead.currentOwnerId !== user.id;
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="mr-1 h-3 w-3" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={doRefresh}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage("lead-import")}
          >
            <Upload className="mr-1 h-3 w-3" />
            Import
          </Button>

          {/* Create Lead Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-1 h-3 w-3" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name *</Label>
                    <Input
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, name: e.target.value })
                      }
                      placeholder="Lead name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone *</Label>
                    <Input
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, phone: e.target.value })
                      }
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, email: e.target.value })
                      }
                      placeholder="Email"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Source</Label>
                    <Select
                      value={createForm.source}
                      onValueChange={(v) =>
                        setCreateForm({ ...createForm, source: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Budget</Label>
                    <Input
                      value={createForm.budget}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, budget: e.target.value })
                      }
                      placeholder="e.g. 50L - 1Cr"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Project</Label>
                    <Select
                      value={createForm.projectId}
                      onValueChange={(v) =>
                        setCreateForm({ ...createForm, projectId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {user?.role === "admin" && users.length > 0 && (
                  <div className="space-y-1">
                    <Label>Assign To</Label>
                    <Select
                      value={createForm.assignTo}
                      onValueChange={(v) =>
                        setCreateForm({ ...createForm, assignTo: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => u.isActive && u.role !== "admin")
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea
                    value={createForm.notes}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, notes: e.target.value })
                    }
                    placeholder="Additional notes"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleCreateLead}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!createForm.name || !createForm.phone}
                >
                  Create Lead
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Count */}
      <div className="text-sm text-gray-500">
        {total} lead{total !== 1 ? "s" : ""} found
      </div>

      {/* Lead Cards */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-24 rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-gray-500">No leads found</p>
            <p className="text-sm text-gray-400">
              Create a new lead or adjust your filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <Card key={lead.id} className={`transition-all hover:shadow-md border-l-4 ${borderColorMap[lead.pipelineStatus] || "border-l-gray-300"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">
                        {lead.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${statusColors[lead.pipelineStatus] || ""}`}
                      >
                        {lead.pipelineStatus}
                      </Badge>
                      {canViewOnly(lead) && (
                        <Lock className="h-3 w-3 text-gray-400 shrink-0" />
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {lead.phone}
                      {lead.email && ` · ${lead.email}`}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setPage("lead-detail");
                        }}
                      >
                        <Eye className="mr-2 h-3 w-3" /> View Details
                      </DropdownMenuItem>
                      {canEdit(lead) && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setFeedbackLead(lead);
                              setFeedbackForm({
                                notes: "",
                                callType: "Feedback",
                                callDate: new Date().toISOString().slice(0, 16),
                                assignTo: "",
                              });
                              setFeedbackOpen(true);
                            }}
                          >
                            <MessageSquare className="mr-2 h-3 w-3" /> Quick Feedback
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAssignLead(lead);
                              setAssignTo("");
                              setAssignReason("");
                              setAssignOpen(true);
                            }}
                          >
                            Assign Lead
                          </DropdownMenuItem>
                        </>
                      )}
                      {user?.role === "admin" && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteId(lead.id)}
                        >
                          <Trash2 className="mr-2 h-3 w-3" /> Delete Lead
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>Source: {lead.source}</span>
                  {lead.project && <span>· {lead.project.name}</span>}
                  {lead.budget && <span>· {lead.budget}</span>}
                </div>

                <div className="mt-1 text-xs text-gray-400">
                  Owner: {lead.currentOwner.name}
                  {canViewOnly(lead) && (
                    <span className="ml-1 text-amber-600 font-medium">
                      (View Only)
                    </span>
                  )}
                </div>

                {/* Last feedback */}
                {lead.callLogs.length > 0 && (
                  <div className="mt-2 rounded-md bg-gray-50 p-2">
                    <div className="text-xs font-medium text-gray-500">
                      Last Feedback
                    </div>
                    <div className="text-xs text-gray-700 line-clamp-2">
                      {lead.callLogs[0].notes}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      by {lead.callLogs[0].user.name}
                    </div>
                  </div>
                )}

                {/* Quick action buttons */}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSelectedLeadId(lead.id);
                      setPage("lead-detail");
                    }}
                  >
                    <Eye className="mr-1 h-3 w-3" /> View
                  </Button>
                  {canEdit(lead) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setFeedbackLead(lead);
                        setFeedbackForm({
                          notes: "",
                          callType: "Feedback",
                          callDate: new Date().toISOString().slice(0, 16),
                          assignTo: "",
                        });
                        setFeedbackOpen(true);
                      }}
                    >
                      <MessageSquare className="mr-1 h-3 w-3" /> Feedback
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Feedback — {feedbackLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {feedbackLead?.callLogs && feedbackLead.callLogs.length > 0 && (
              <div className="rounded-md bg-gray-50 p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Last Feedback
                </div>
                <div className="text-sm text-gray-700">
                  {feedbackLead.callLogs[0].notes}
                </div>
                <div className="text-xs text-gray-400">
                  by {feedbackLead.callLogs[0].user.name}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={feedbackForm.callDate}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, callDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Call Type</Label>
              <Select
                value={feedbackForm.callType}
                onValueChange={(v) =>
                  setFeedbackForm({ ...feedbackForm, callType: v })
                }
              >
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
              <Label>Feedback Notes *</Label>
              <Textarea
                value={feedbackForm.notes}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, notes: e.target.value })
                }
                placeholder="Enter feedback details..."
                rows={3}
              />
            </div>

            {users.length > 0 && (
              <div className="space-y-1">
                <Label>Quick Assign To (Optional)</Label>
                <Select
                  value={feedbackForm.assignTo}
                  onValueChange={(v) =>
                    setFeedbackForm({ ...feedbackForm, assignTo: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => u.isActive)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleFeedback}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!feedbackForm.notes}
            >
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Lead — {assignLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              Current Owner: {assignLead?.currentOwner.name}
            </div>
            <div className="space-y-1">
              <Label>Assign To *</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.isActive)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="Reason for reassignment"
                rows={2}
              />
            </div>
            <Button
              onClick={handleAssign}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!assignTo}
            >
              Assign Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this lead? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
