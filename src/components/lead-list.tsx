"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore, isAdminRole } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Send,
  UserPlus,
  UsersRound,
  Sparkles,
  CalendarClock,
  Pencil,
  Copy,
  Calendar,
  RotateCcw,
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

const LEAD_STATUSES = [
  "Not Connected",
  "Site Visit Done",
  "Prospect",
  "Not Interested",
  "Site Visit Promised",
  "Booked",
];

const SOURCES = [
  "Manual",
  "Website",
  "Referral",
  "Social Media",
  "Walk-in",
  "Call",
  "Housing.com",
  "99acres",
  "MagicBricks",
];

const DATE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "This Month", days: -1 },
  { label: "Last Month", days: -2 },
];

function getDateRange(preset: number): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  let from: string;
  if (preset === -1) {
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  } else if (preset === -2) {
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    from = firstDayLastMonth.toISOString().split("T")[0];
    return { from, to: lastDayLastMonth.toISOString().split("T")[0] };
  } else {
    from = new Date(now.getTime() - preset * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  }
  return { from, to };
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

const dotColors: Record<string, string> = {
  New: "bg-slate-500",
  Contacted: "bg-blue-500",
  Qualified: "bg-cyan-500",
  "Visit Scheduled": "bg-amber-500",
  Visited: "bg-purple-500",
  Negotiation: "bg-orange-500",
  Won: "bg-emerald-500",
  Lost: "bg-red-500",
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
  leadStatus: string | null;
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
  email?: string;
  role: string;
  isActive: boolean;
}

interface Project {
  id: string;
  name: string;
}

interface PropertyItem {
  id: string;
  name: string;
  type: string;
  status: string;
  price: number | null;
  location: string | null;
  project: { id: string; name: string } | null;
}

export function LeadList() {
  const { user, setPage, setSelectedLeadId } = useAppStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refresh, setRefresh] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  // Handle date preset click
  const handleDatePreset = (preset: number) => {
    const { from, to } = getDateRange(preset);
    setDateFrom(from);
    setDateTo(to);
  };

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
    propertyId: "",
    assignTo: "",
  });

  // Feedback dialog (for dropdown menu + direct button)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLead, setFeedbackLead] = useState<Lead | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    notes: "",
    callType: "Feedback",
    callDate: new Date().toISOString().slice(0, 16),
    assignTo: "",
    followUpDate: "",
    dropLead: false,
    leadStatus: "",
  });

  // Assign dialog (for dropdown menu + direct button)
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLead, setAssignLead] = useState<Lead | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [assignReason, setAssignReason] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Inline feedback state per lead
  const [inlineFeedback, setInlineFeedback] = useState<Record<string, string>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<Record<string, boolean>>({});

  // Inline assign state per lead
  const [inlineAssign, setInlineAssign] = useState<Record<string, string>>({});
  const [submittingAssign, setSubmittingAssign] = useState<Record<string, boolean>>({});

  // Bulk select & assign
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const doRefresh = () => setRefresh((r) => r + 1);

  // Fetch leads
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (leadStatusFilter !== "all") params.set("leadStatus", leadStatusFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (userFilter !== "all" && isAdminRole(user?.role || "")) params.set("owner", userFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotal(data.total || 0);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debouncedSearch, statusFilter, leadStatusFilter, sourceFilter, userFilter, dateFrom, dateTo, refresh, user?.role]);

  // Fetch users, projects, and properties for ALL roles - parallel for speed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [uRes, pRes, propRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/projects"),
        fetch("/api/properties"),
      ]);
      if (!cancelled && uRes.ok) {
        const userData = await uRes.json();
        if (isAdminRole(user?.role || "")) {
          setUsers(userData);
        } else {
          setUsers(userData.filter((u: UserItem) => u.isActive));
        }
      }
      if (!cancelled && pRes.ok) {
        setProjects(await pRes.json());
      }
      if (!cancelled && propRes.ok) {
        const propData = await propRes.json();
        setProperties(propData.properties || []);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.role]);

  const handleCreateLead = async () => {
    const body: Record<string, string> = {
      name: createForm.name,
      phone: createForm.phone,
      email: createForm.email,
      source: createForm.source,
      budget: createForm.budget,
      notes: createForm.notes,
      projectId: createForm.projectId,
      assignTo: createForm.assignTo,
    };

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const lead = await res.json();
      // If property selected, link it to the lead
      if (createForm.propertyId && lead.id) {
        await fetch(`/api/leads/${lead.id}/properties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: createForm.propertyId }),
        });
      }
      setCreateOpen(false);
      setCreateForm({
        name: "",
        phone: "",
        email: "",
        source: "Manual",
        budget: "",
        notes: "",
        projectId: "",
        propertyId: "",
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
      body: JSON.stringify({
        notes: feedbackForm.notes,
        callType: feedbackForm.callType,
        callDate: feedbackForm.callDate,
        assignTo: feedbackForm.assignTo || undefined,
      }),
    });

    if (res.ok) {
      // If follow-up date set, schedule it
      if (feedbackForm.followUpDate) {
        await fetch(`/api/leads/${feedbackLead.id}/follow-ups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: feedbackForm.followUpDate,
            notes: `Follow-up after feedback: ${feedbackForm.notes.substring(0, 100)}`,
          }),
        });
      }

      // If lead status selected, update it
      if (feedbackForm.leadStatus) {
        await fetch(`/api/leads/${feedbackLead.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadStatus: feedbackForm.leadStatus }),
        });
      }

      // If drop lead selected
      if (feedbackForm.dropLead) {
        await fetch(`/api/leads/${feedbackLead.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pipelineStatus: "Lost",
            lostReason: "Dropped after feedback",
          }),
        });
      }

      setFeedbackOpen(false);
      setFeedbackLead(null);
      setFeedbackForm({
        notes: "",
        callType: "Feedback",
        callDate: new Date().toISOString().slice(0, 16),
        assignTo: "",
        followUpDate: "",
        dropLead: false,
        leadStatus: "",
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

  // Inline feedback submit
  const handleInlineFeedback = async (leadId: string) => {
    const notes = inlineFeedback[leadId];
    if (!notes?.trim()) return;

    setSubmittingFeedback((prev) => ({ ...prev, [leadId]: true }));
    const res = await fetch(`/api/leads/${leadId}/call-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim(), callType: "Feedback" }),
    });
    if (res.ok) {
      setInlineFeedback((prev) => ({ ...prev, [leadId]: "" }));
      doRefresh();
    }
    setSubmittingFeedback((prev) => ({ ...prev, [leadId]: false }));
  };

  // Inline assign submit
  const handleInlineAssign = async (leadId: string) => {
    const toUserId = inlineAssign[leadId];
    if (!toUserId) return;

    setSubmittingAssign((prev) => ({ ...prev, [leadId]: true }));
    const res = await fetch(`/api/leads/${leadId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId, reason: "Quick assign from lead list" }),
    });
    if (res.ok) {
      setInlineAssign((prev) => ({ ...prev, [leadId]: "" }));
      doRefresh();
    }
    setSubmittingAssign((prev) => ({ ...prev, [leadId]: false }));
  };

  // Bulk assign handler
  const handleBulkAssign = async () => {
    if (!bulkAssignTo || selectedLeadIds.size === 0) return;

    for (const leadId of selectedLeadIds) {
      await fetch(`/api/leads/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: bulkAssignTo, reason: "Bulk assignment" }),
      });
    }
    setBulkAssignOpen(false);
    setBulkAssignTo("");
    setSelectedLeadIds(new Set());
    doRefresh();
  };

  // Toggle select lead
  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
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

  // Whether current user can assign this lead (admin always can, current owner can, primary owner can reassign)
  const canAssign = (lead: Lead) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (lead.currentOwnerId === user.id) return true;
    // Primary owner who is not current owner can also assign
    if (lead.primaryOwnerId === user.id) return true;
    return false;
  };

  // Filter users for assign dropdown based on role
  const getAssignableUsers = (excludeUserId?: string) => {
    return users.filter((u) => u.isActive && u.id !== excludeUserId && u.role !== "admin");
  };

  // Open feedback dialog for a lead
  const openFeedbackDialog = (lead: Lead) => {
    setFeedbackLead(lead);
    setFeedbackForm({
      notes: "",
      callType: "Feedback",
      callDate: new Date().toISOString().slice(0, 16),
      assignTo: "",
      followUpDate: "",
      dropLead: false,
      leadStatus: "",
    });
    setFeedbackOpen(true);
  };

  // Open assign dialog for a lead
  const openAssignDialog = (lead: Lead) => {
    setAssignLead(lead);
    setAssignTo("");
    setAssignReason("");
    setAssignOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {/* User/Assignee filter - Admin only */}
          {isAdminRole(user?.role || "") && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <UsersRound className="mr-1 h-3 w-3" />
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.filter((u) => u.isActive && u.role !== "admin").map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="mr-1 h-3 w-3" />
              <SelectValue placeholder="Lead Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lead Status</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Date filter with presets */}
          <div className="flex items-center gap-1">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-9 text-xs px-2"
                onClick={() => handleDatePreset(preset.days)}
              >
                <Calendar className="mr-1 h-3 w-3" />
                {preset.label}
              </Button>
            ))}
          </div>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[130px]" placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[130px]" placeholder="To" />
          {/* Clear all filters */}
          {(statusFilter !== "all" || leadStatusFilter !== "all" || sourceFilter !== "all" || userFilter !== "all" || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground hover:text-foreground"
              onClick={() => { setStatusFilter("all"); setLeadStatusFilter("all"); setSourceFilter("all"); setUserFilter("all"); setDateFrom(""); setDateTo(""); setSearch(""); setDebouncedSearch(""); }}
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Clear
            </Button>
          )}
          {/* Fresh Leads quick filter for telecaller/sales */}
          {(user?.role === "telecalling" || user?.role === "sales") && (
            <Button
              variant={statusFilter === "New" ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => setStatusFilter(statusFilter === "New" ? "all" : "New")}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Fresh Leads
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={doRefresh}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
          {/* Import only for admin */}
          {isAdminRole(user?.role || "") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage("lead-import")}
            >
              <Upload className="mr-1 h-3 w-3" />
              Import
            </Button>
          )}

          {/* Bulk Assign button (admin only, when leads selected) */}
          {isAdminRole(user?.role || "") && selectedLeadIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-brand border-brand hover:bg-brand hover:text-white"
              onClick={() => setBulkAssignOpen(true)}
            >
              <UsersRound className="mr-1 h-3 w-3" />
              Assign ({selectedLeadIds.size})
            </Button>
          )}

          {/* Bulk Delete button (admin only, when leads selected) */}
          {isAdminRole(user?.role || "") && selectedLeadIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete ({selectedLeadIds.size})
            </Button>
          )}

          {/* Create Lead Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-brand hover:bg-brand-dark">
                <Plus className="mr-1 h-3 w-3" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                        setCreateForm({ ...createForm, projectId: v, propertyId: "" })
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
                {/* Property dropdown - shows properties (filtered by selected project if any) */}
                <div className="space-y-1">
                  <Label>Property</Label>
                  <Select
                    value={createForm.propertyId}
                    onValueChange={(v) =>
                      setCreateForm({ ...createForm, propertyId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties
                        .filter((p) =>
                          !createForm.projectId || p.project?.id === createForm.projectId
                        )
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.project ? `(${p.project.name})` : ""} {p.price ? `- ₹${p.price.toLocaleString()}` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {isAdminRole(user?.role || "") && users.length > 0 && (
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
                  className="w-full bg-brand hover:bg-brand-dark"
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
      <div className="text-sm text-muted-foreground">
        {total} lead{total !== 1 ? "s" : ""} found
      </div>

      {/* Lead List - Flat Line-by-Line Layout */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">No leads found</p>
          <p className="text-sm text-muted-foreground">
            Create a new lead or adjust your filters
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Header row */}
          <div className="hidden md:grid md:grid-cols-[auto_1fr_1fr_auto] gap-4 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            <div className="w-8">
              {isAdminRole(user?.role || "") && (
                <Checkbox
                  checked={selectedLeadIds.size === leads.length && leads.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              )}
            </div>
            <div>Lead Info</div>
            <div>Details</div>
            <div className="min-w-[340px]">Actions</div>
          </div>

          {/* Lead rows */}
          {leads.map((lead) => (
            <div
              key={lead.id}
              className={`border-b border-border last:border-b-0 px-4 py-3 transition-colors ${
                selectedLeadIds.has(lead.id) ? "bg-brand/5" : "hover:bg-muted/30"
              }`}
            >
              {/* Row 1: Main info */}
              <div className="flex flex-col md:grid md:grid-cols-[auto_1fr_1fr_auto] gap-2 md:gap-4">
                {/* Checkbox column (admin only) */}
                <div className="hidden md:flex items-center w-8">
                  {isAdminRole(user?.role || "") && (
                    <Checkbox
                      checked={selectedLeadIds.has(lead.id)}
                      onCheckedChange={() => toggleSelectLead(lead.id)}
                    />
                  )}
                </div>

                {/* Left: Lead Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Mobile checkbox for admin */}
                    {isAdminRole(user?.role || "") && (
                      <Checkbox
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={() => toggleSelectLead(lead.id)}
                        className="md:hidden"
                      />
                    )}
                    <div className={`h-2 w-2 rounded-full shrink-0 ${dotColors[lead.pipelineStatus] || "bg-gray-400"}`} />
                    <span className="font-semibold text-foreground text-sm truncate">
                      {lead.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 shrink-0 ${statusColors[lead.pipelineStatus] || ""}`}
                    >
                      {lead.pipelineStatus}
                    </Badge>
                    {lead.leadStatus && lead.leadStatus !== "New" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-brand/30 text-brand">
                        {lead.leadStatus}
                      </Badge>
                    )}
                    {canViewOnly(lead) && (
                      <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 inline-flex">{lead.phone}<button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(lead.phone); }} className="inline-flex text-muted-foreground hover:text-brand transition-colors"><Copy className="h-3 w-3" /></button></span>
                    {lead.email && ` · ${lead.email}`}
                  </div>
                </div>

                {/* Middle: Details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>Source: {lead.source}</span>
                    {lead.project && <span>· {lead.project.name}</span>}
                    {lead.budget && <span>· {lead.budget}</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      Owner: <span className="text-foreground font-medium">{lead.currentOwner.name}</span>
                    </span>
                    {canViewOnly(lead) && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        (View Only)
                      </span>
                    )}
                  </div>
                  {/* Last feedback */}
                  {lead.callLogs.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground truncate max-w-md">
                      Last: &quot;{lead.callLogs[0].notes}&quot;
                    </div>
                  )}
                </div>

                {/* Right: Inline Actions */}
                <div className="flex items-center gap-1.5 min-w-0 md:min-w-[340px] flex-wrap">
                  {/* Quick Feedback button - visible for all roles who can edit */}
                  {canEdit(lead) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 shrink-0"
                      onClick={() => openFeedbackDialog(lead)}
                    >
                      <MessageSquare className="mr-1 h-3 w-3" />
                      Feedback
                    </Button>
                  )}

                  {/* Follow-up button - visible for all roles who can edit */}
                  {canEdit(lead) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 shrink-0"
                      onClick={() => {
                        setFeedbackLead(lead);
                        setFeedbackForm({
                          notes: "",
                          callType: "Follow-up",
                          callDate: new Date().toISOString().slice(0, 16),
                          assignTo: "",
                          followUpDate: "",
                          dropLead: false,
                          leadStatus: "",
                        });
                        setFeedbackOpen(true);
                      }}
                    >
                      <CalendarClock className="mr-1 h-3 w-3" />
                      Follow Up
                    </Button>
                  )}

                  {/* Assign button - visible if user can assign this lead */}
                  {canAssign(lead) && getAssignableUsers(lead.currentOwnerId).length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 shrink-0"
                      onClick={() => openAssignDialog(lead)}
                    >
                      <UserPlus className="mr-1 h-3 w-3" />
                      Assign
                    </Button>
                  )}

                  {/* Update button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2 gap-1 shrink-0 text-brand hover:text-brand-dark hover:bg-brand/10 border-brand/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSelectedLeadId(lead.id);
                      setPage("lead-detail");
                    }}
                  >
                    <Pencil className="h-3 w-3" /> Update
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                        <MoreVertical className="h-3.5 w-3.5" />
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
                          <DropdownMenuItem onClick={() => openFeedbackDialog(lead)}>
                            <MessageSquare className="mr-2 h-3 w-3" /> Quick Feedback
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setFeedbackLead(lead);
                              setFeedbackForm({
                                notes: "",
                                callType: "Follow-up",
                                callDate: new Date().toISOString().slice(0, 16),
                                assignTo: "",
                                followUpDate: "",
                                dropLead: false,
                                leadStatus: "",
                              });
                              setFeedbackOpen(true);
                            }}
                          >
                            <CalendarClock className="mr-2 h-3 w-3" /> Follow Up
                          </DropdownMenuItem>
                          {canAssign(lead) && (
                            <DropdownMenuItem onClick={() => openAssignDialog(lead)}>
                              <UserPlus className="mr-2 h-3 w-3" /> Assign Lead
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                      {isAdminRole(user?.role || "") && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(lead.id)}
                        >
                          <Trash2 className="mr-2 h-3 w-3" /> Delete Lead
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {feedbackForm.callType === "Follow-up" ? "Follow Up" : "Quick Feedback"} — {feedbackLead?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {feedbackLead?.callLogs && feedbackLead.callLogs.length > 0 && (
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Last Feedback
                </div>
                <div className="text-sm text-foreground">
                  {feedbackLead.callLogs[0].notes}
                </div>
                <div className="text-xs text-muted-foreground">
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
              <Label>Lead Status</Label>
              <Select
                value={feedbackForm.leadStatus}
                onValueChange={(v) => setFeedbackForm({ ...feedbackForm, leadStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Connected">Not Connected</SelectItem>
                  <SelectItem value="Site Visit Done">Site Visit Done</SelectItem>
                  <SelectItem value="Prospect">Prospect</SelectItem>
                  <SelectItem value="Not Interested">Not Interested</SelectItem>
                  <SelectItem value="Site Visit Promised">Site Visit Promised</SelectItem>
                  <SelectItem value="Booked">Booked</SelectItem>
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

            {/* Follow-up Date Option */}
            <div className="space-y-1">
              <Label>Schedule Follow-up Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={feedbackForm.followUpDate}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, followUpDate: e.target.value })
                }
                placeholder="Select follow-up date & time"
              />
            </div>

            {/* Drop Lead Option */}
            <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 p-3">
              <Checkbox
                id="dropLead"
                checked={feedbackForm.dropLead}
                onCheckedChange={(checked) =>
                  setFeedbackForm({ ...feedbackForm, dropLead: !!checked })
                }
              />
              <label htmlFor="dropLead" className="text-sm text-red-600 dark:text-red-400 cursor-pointer">
                Drop this lead (mark as Lost)
              </label>
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
                    {getAssignableUsers()
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
              className="w-full bg-brand hover:bg-brand-dark"
              disabled={!feedbackForm.notes}
            >
              Submit {feedbackForm.callType === "Follow-up" ? "Follow Up" : "Feedback"}
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
            <div className="text-sm text-muted-foreground">
              Current Owner: {assignLead?.currentOwner.name}
            </div>
            <div className="space-y-1">
              <Label>Assign To *</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user to assign" />
                </SelectTrigger>
                <SelectContent>
                  {assignLead && getAssignableUsers(assignLead.currentOwnerId).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason (Optional)</Label>
              <Textarea
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="Reason for assignment"
                rows={2}
              />
            </div>
            <Button
              onClick={handleAssign}
              className="w-full bg-brand hover:bg-brand-dark"
              disabled={!assignTo}
            >
              Assign Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign — {selectedLeadIds.size} leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Assign All Selected Leads To *</Label>
              <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
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
            <Button
              onClick={handleBulkAssign}
              className="w-full bg-brand hover:bg-brand-dark"
              disabled={!bulkAssignTo}
            >
              Assign {selectedLeadIds.size} Leads
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this lead? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
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

      {/* Bulk Delete Confirm Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Delete — {selectedLeadIds.size} leads</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {selectedLeadIds.size} selected lead{selectedLeadIds.size !== 1 ? "s" : ""}? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                for (const leadId of selectedLeadIds) {
                  await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
                }
                setBulkDeleteOpen(false);
                setSelectedLeadIds(new Set());
                doRefresh();
              }}
            >
              Delete {selectedLeadIds.size} Lead{selectedLeadIds.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
