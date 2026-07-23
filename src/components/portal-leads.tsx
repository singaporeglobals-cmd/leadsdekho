"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Building2,
  Users,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Copy,
  Check,
  CloudDownload,
  Save,
  Settings2,
  Plus,
  Pencil,
  X,
  PlugZap,
  Activity,
} from "lucide-react";

interface PortalLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  budget: string | null;
  notes: string | null;
  projectName: string | null;
  portalRef: string | null;
  assignedTo: string | null;
  projectId: string | null;
  status: string;
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface ProjectItem {
  id: string;
  name: string;
  location?: string | null;
}

interface HousingAccount {
  id: string;
  label: string;
  profileId: string;
  encryptionKeyMasked: string;
  endpointUrl: string;
  defaultProjectId: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  createdAt: string;
}

export function PortalLeads() {
  const { user } = useAppStore();
  const [portalLeads, setPortalLeads] = useState<PortalLead[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"pending" | "confirmed" | "discarded">("pending");

  // Per-row editable fields (kept in a local map keyed by portal lead ID)
  const [rowAssign, setRowAssign] = useState<Record<string, string>>({});
  const [rowProject, setRowProject] = useState<Record<string, string>>({});
  const [rowSource, setRowSource] = useState<Record<string, string>>({});

  // Bulk-apply state
  const [bulkProject, setBulkProject] = useState("");
  const [bulkAssign, setBulkAssign] = useState("");
  const [bulkSource, setBulkSource] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Confirm / discard action state
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<{ confirmed: number; duplicated: number; failed: number } | null>(null);

  // Copy API URL state
  const [copied, setCopied] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [copiedMagic, setCopiedMagic] = useState(false);

  // Diagnostics panel state
  const [showDiag, setShowDiag] = useState(false);
  const [diag, setDiag] = useState<null | {
    recent: Array<{ id: string; name: string; phone: string; source: string; projectName: string | null; portalRef: string | null; status: string; createdAt: string; rawPayload: unknown }>;
    bySource: Array<{ source: string; count: number }>;
    pendingTotal: number;
    last24h: number;
    last7d: number;
    endpoints: {
      generic: string;
      magicbricks: string;
      housing: Array<{ label: string; profileId: string; url: string; lastSyncAt: string | null; lastSyncStatus: string | null; lastSyncMessage: string | null }>;
    };
  }>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Housing.com multi-account integration state
  const [showHousing, setShowHousing] = useState(false);
  const [housingAccounts, setHousingAccounts] = useState<HousingAccount[]>([]);
  // Form state for add/edit
  const [editingId, setEditingId] = useState<string | null>(null); // null = create mode
  const [showForm, setShowForm] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formProfileId, setFormProfileId] = useState("");
  const [formEncryptionKey, setFormEncryptionKey] = useState("");
  const [formEndpointUrl, setFormEndpointUrl] = useState("");
  const [formDefaultProjectId, setFormDefaultProjectId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  // Sync state
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null); // "all" | "<id>" | null
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string; url: string } | null>>({});
  const [housingMsg, setHousingMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const apiUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/portal-leads`;
  const magicbricksUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/portal-leads/magicbricks`;

  const fetchPortalLeads = useCallback(async (status: "pending" | "confirmed" | "discarded") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal-leads?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setPortalLeads(data.portalLeads || []);
      setPendingCount(data.pendingCount || 0);
      // Reset per-row state for the freshly fetched rows
      const assignMap: Record<string, string> = {};
      const projectMap: Record<string, string> = {};
      const sourceMap: Record<string, string> = {};
      (data.portalLeads as PortalLead[]).forEach((p) => {
        if (p.assignedTo) assignMap[p.id] = p.assignedTo;
        if (p.projectId) projectMap[p.id] = p.projectId;
        sourceMap[p.id] = p.source;
      });
      setRowAssign(assignMap);
      setRowProject(projectMap);
      setRowSource(sourceMap);
      // Default-select all pending rows
      if (status === "pending") {
        setSelectedRows(new Set((data.portalLeads as PortalLead[]).map((p) => p.id)));
      } else {
        setSelectedRows(new Set());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user?.role === "admin" || user?.role === "super_admin") {
      fetchPortalLeads(filterStatus);
    }
  }, [user, filterStatus, fetchPortalLeads]);

  // Fetch users + projects + sources
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch(() => {});
    fetch("/api/lead-sources").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setSources(data.map((s: { name: string }) => s.name));
    }).catch(() => {});
  }, []);

  // Fetch Housing.com accounts list
  const fetchHousingAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/portal-leads/housing-accounts");
      if (!res.ok) return;
      const data = await res.json();
      setHousingAccounts(data.accounts || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "super_admin") {
      fetchHousingAccounts();
    }
  }, [user, fetchHousingAccounts]);

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormLabel("");
    setFormProfileId("");
    setFormEncryptionKey("");
    setFormEndpointUrl("");
    setFormDefaultProjectId("");
    setFormIsActive(true);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (acct: HousingAccount) => {
    setEditingId(acct.id);
    setShowForm(true);
    setFormLabel(acct.label);
    setFormProfileId(acct.profileId);
    setFormEncryptionKey(""); // never pre-fill the key
    setFormEndpointUrl(acct.endpointUrl || "");
    setFormDefaultProjectId(acct.defaultProjectId || "");
    setFormIsActive(acct.isActive);
  };

  const saveAccount = async () => {
    if (!formLabel.trim() || !formProfileId.trim() || !formEncryptionKey.trim()) {
      setHousingMsg({ type: "error", text: "Label, Profile ID, and Encryption Key are all required." });
      return;
    }
    setSavingAccount(true);
    setHousingMsg(null);
    try {
      const payload: Record<string, unknown> = {
        label: formLabel.trim(),
        profileId: formProfileId.trim(),
        encryptionKey: formEncryptionKey.trim(),
        endpointUrl: formEndpointUrl.trim() || null,
        defaultProjectId: formDefaultProjectId || null,
        isActive: formIsActive,
      };

      let res: Response;
      if (editingId) {
        // Update existing
        res = await fetch(`/api/portal-leads/housing-accounts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        res = await fetch("/api/portal-leads/housing-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setHousingMsg({
        type: "success",
        text: editingId ? "Account updated." : `Account "${formLabel.trim()}" added.`,
      });
      resetForm();
      await fetchHousingAccounts();
    } catch (err) {
      setHousingMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save account",
      });
    } finally {
      setSavingAccount(false);
    }
  };

  const deleteAccount = async (id: string, label: string) => {
    if (!confirm(`Delete account "${label}"? Already-synced leads are NOT affected.`)) return;
    try {
      const res = await fetch(`/api/portal-leads/housing-accounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setHousingMsg({ type: "success", text: `Account "${label}" deleted.` });
      await fetchHousingAccounts();
    } catch (err) {
      setHousingMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete account",
      });
    }
  };

  const syncOne = async (accountId: string, label: string) => {
    setSyncingAccountId(accountId);
    setHousingMsg(null);
    try {
      const res = await fetch(`/api/portal-leads/housing-sync?accountId=${accountId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = await res.json();
      if (!res.ok && !data.ok) {
        throw new Error(data.message || data.error || "Sync failed");
      }
      setHousingMsg({
        type: data.imported > 0 ? "success" : "info",
        text: `[${label}] ${data.message}`,
      });
      await Promise.all([fetchHousingAccounts(), fetchPortalLeads(filterStatus)]);
    } catch (err) {
      setHousingMsg({
        type: "error",
        text: `[${label}] ${err instanceof Error ? err.message : "Failed to sync"}`,
      });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const syncAll = async () => {
    if (housingAccounts.filter((a) => a.isActive).length === 0) {
      setHousingMsg({ type: "error", text: "No active accounts to sync. Add one first." });
      return;
    }
    setSyncingAccountId("all");
    setHousingMsg(null);
    try {
      const res = await fetch("/api/portal-leads/housing-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = await res.json();
      if (!res.ok && !data.ok) {
        throw new Error(data.message || data.error || "Sync failed");
      }
      setHousingMsg({
        type: data.totalImported > 0 ? "success" : "info",
        text: data.message,
      });
      await Promise.all([fetchHousingAccounts(), fetchPortalLeads(filterStatus)]);
    } catch (err) {
      setHousingMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to sync",
      });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const testConnection = async (accountId: string) => {
    setTestingAccountId(accountId);
    setTestResult((prev) => ({ ...prev, [accountId]: null }));
    try {
      const res = await fetch(`/api/portal-leads/housing-accounts/${accountId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [accountId]: {
          ok: !!data.ok,
          message: data.message || (data.ok ? "Connection OK" : "Connection failed"),
          url: data.url || "",
        },
      }));
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [accountId]: {
          ok: false,
          message: err instanceof Error ? err.message : "Test failed",
          url: "",
        },
      }));
    } finally {
      setTestingAccountId(null);
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === portalLeads.length && portalLeads.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(portalLeads.map((p) => p.id)));
    }
  };

  const applyBulkProject = () => {
    if (!bulkProject || selectedRows.size === 0) return;
    const map: Record<string, string> = { ...rowProject };
    selectedRows.forEach((id) => { map[id] = bulkProject; });
    setRowProject(map);
    setBulkProject("");
  };

  const applyBulkAssign = () => {
    if (!bulkAssign || selectedRows.size === 0) return;
    const map: Record<string, string> = { ...rowAssign };
    selectedRows.forEach((id) => { map[id] = bulkAssign; });
    setRowAssign(map);
    setBulkAssign("");
  };

  const applyBulkSource = () => {
    if (!bulkSource || selectedRows.size === 0) return;
    const map: Record<string, string> = { ...rowSource };
    selectedRows.forEach((id) => { map[id] = bulkSource; });
    setRowSource(map);
    setBulkSource("");
  };

  const handleConfirm = async () => {
    if (selectedRows.size === 0) return;
    setConfirming(true);
    setLastResult(null);
    try {
      const payload = Array.from(selectedRows).map((id) => {
        const lead = portalLeads.find((p) => p.id === id);
        return {
          id,
          assignToId: rowAssign[id] || undefined,
          projectId: rowProject[id] || undefined,
          source: rowSource[id] || lead?.source || "Portal",
        };
      });
      const res = await fetch("/api/portal-leads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirm failed");
      setLastResult({
        confirmed: data.confirmed || 0,
        duplicated: data.duplicated || 0,
        failed: data.failed || 0,
      });
      // Refresh the list
      await fetchPortalLeads(filterStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  const handleDiscard = async (id: string) => {
    if (!confirm("Discard this portal lead? You can find it later under the 'Discarded' filter.")) return;
    try {
      const res = await fetch(`/api/portal-leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to discard");
      }
      await fetchPortalLeads(filterStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard");
    }
  };

  const handleDeleteForever = async (id: string) => {
    if (!confirm("PERMANENTLY delete this portal lead? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/portal-leads/${id}?hard=true`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      await fetchPortalLeads(filterStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const copyApiUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyMagicbricksUrl = () => {
    navigator.clipboard.writeText(magicbricksUrl);
    setCopiedMagic(true);
    setTimeout(() => setCopiedMagic(false), 2000);
  };

  const fetchDiag = useCallback(async () => {
    setDiagLoading(true);
    try {
      const res = await fetch("/api/portal-leads/diagnostics?limit=10");
      if (!res.ok) throw new Error("Failed to load diagnostics");
      const data = await res.json();
      setDiag(data);
    } catch (err) {
      console.error("Diagnostics fetch failed", err);
    } finally {
      setDiagLoading(false);
    }
  }, []);

  if (user?.role !== "admin" && user?.role !== "super_admin") return null;

  return (
    <div className="space-y-4">
      {/* Live Integration Diagnostics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Integration Diagnostics
              {diag && (
                <Badge className="ml-2 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {diag.last24h} in 24h · {diag.last7d} in 7d
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  if (!showDiag) {
                    fetchDiag();
                  }
                  setShowDiag((v) => !v);
                }}
              >
                {showDiag ? "Hide" : "Check Live Status"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showDiag && (
          <CardContent className="space-y-3">
            {diagLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!diagLoading && diag && (
              <>
                {/* Counts row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Pending</div>
                    <div className="text-xl font-semibold text-amber-600">{diag.pendingTotal}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Last 24h</div>
                    <div className="text-xl font-semibold text-emerald-600">{diag.last24h}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Last 7d</div>
                    <div className="text-xl font-semibold text-blue-600">{diag.last7d}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Sources seen</div>
                    <div className="text-xl font-semibold">{diag.bySource.length}</div>
                  </div>
                </div>

                {/* Counts by source */}
                {diag.bySource.length > 0 ? (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Leads by source (all time)</div>
                    <div className="flex flex-wrap gap-2">
                      {diag.bySource.map((s) => (
                        <Badge key={s.source} variant="outline" className="text-xs">
                          {s.source}: <span className="ml-1 font-semibold">{s.count}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                    No inbound leads yet. Once MagicBricks / Housing starts pushing, they will appear here.
                  </div>
                )}

                {/* Recent inbound leads */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">
                    Most recent {diag.recent.length} inbound leads (any status)
                  </div>
                  {diag.recent.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">No leads received yet.</div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {diag.recent.map((r) => (
                        <div key={r.id} className="rounded border p-2 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="text-[10px]" variant="outline">{r.source}</Badge>
                            <span className="font-medium">{r.name}</span>
                            <span className="text-muted-foreground">{r.phone}</span>
                            <span className="text-muted-foreground ml-auto">
                              {new Date(r.createdAt).toLocaleString("en-IN")}
                            </span>
                          </div>
                          {(r.projectName || r.portalRef) && (
                            <div className="mt-0.5 text-muted-foreground">
                              {r.projectName && <>Project: {r.projectName}</>}
                              {r.projectName && r.portalRef && " · "}
                              {r.portalRef && <>Ref: {r.portalRef}</>}
                            </div>
                          )}
                          {r.rawPayload && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[10px] text-blue-600 hover:underline">
                                View raw payload
                              </summary>
                              <pre className="mt-1 p-1.5 bg-muted rounded text-[10px] overflow-x-auto">
                                {JSON.stringify(r.rawPayload, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Webhook URLs summary */}
                <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-xs space-y-1.5 border border-blue-200 dark:border-blue-900">
                  <div className="font-medium text-blue-700 dark:text-blue-300">Webhook URLs (share with portal partners)</div>
                  <div className="space-y-1">
                    <div><span className="text-muted-foreground">Generic:</span> <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">POST {diag.endpoints.generic}</code></div>
                    <div><span className="text-muted-foreground">MagicBricks:</span> <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">POST {diag.endpoints.magicbricks}</code></div>
                    {diag.endpoints.housing.map((h) => (
                      <div key={h.profileId}>
                        <span className="text-muted-foreground">Housing ({h.label}):</span>{" "}
                        <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">POST {h.url}</code>
                        {h.lastSyncAt && (
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            Last push: {new Date(h.lastSyncAt).toLocaleString("en-IN")}
                            {h.lastSyncMessage && ` · ${h.lastSyncMessage}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
      {/* Housing.com multi-account integration card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Housing.com Accounts
              {housingAccounts.length > 0 && (
                <Badge className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {housingAccounts.length} account{housingAccounts.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {housingAccounts.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setShowHousing((v) => !v)}
                >
                  {showHousing ? "Hide" : "Show"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {showHousing || housingAccounts.length === 0 ? (
          <CardContent className="space-y-3">
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 p-3 space-y-2">
              <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <PlugZap className="h-4 w-4" />
                Housing.com uses a PUSH API (Webhook)
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Housing.com <strong>pushes leads to your webhook URL</strong> — you don&apos;t pull them.
                Each Housing account below has its own webhook URL. Share that URL with your Housing.com
                account manager and ask them to configure lead push for your profile.
                Once configured, leads will automatically appear in the pending queue below — no &quot;Sync&quot; button needed.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              The &quot;Sync Now&quot; button tries Housing&apos;s pull API (rarely enabled for partners).
              For most accounts, webhook push is the only working path.
            </p>

            {/* Accounts list */}
            {housingAccounts.length > 0 ? (
              <div className="space-y-2">
                {housingAccounts.map((acct) => (
                  <div
                    key={acct.id}
                    className={`rounded-md border p-3 space-y-2 ${
                      acct.isActive ? "border-border bg-card" : "border-dashed opacity-70 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{acct.label}</span>
                          {!acct.isActive && (
                            <Badge className="text-xs bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              inactive
                            </Badge>
                          )}
                          {acct.lastSyncStatus && (
                            <Badge className={`text-xs ${
                              acct.lastSyncStatus === "success"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                : acct.lastSyncStatus === "partial"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            }`}>
                              {acct.lastSyncStatus}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <div>
                            Profile ID: <code>{acct.profileId}</code>
                            {" · "}
                            Key: <code>{acct.encryptionKeyMasked || "—"}</code>
                          </div>
                          {acct.defaultProjectId && (
                            <div>
                              Default project:{" "}
                              <span className="font-medium">
                                {projects.find((p) => p.id === acct.defaultProjectId)?.name || "(deleted project)"}
                              </span>
                              <span className="text-muted-foreground"> (auto-applied to incoming webhook leads)</span>
                            </div>
                          )}
                        </div>
                        {/* Webhook URL — the main thing admin needs to share with Housing.com */}
                        <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                              Webhook URL — give this to Housing.com
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px] text-blue-700 dark:text-blue-300 hover:text-blue-900"
                              onClick={() => {
                                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/portal-leads/housing/${acct.profileId}`;
                                navigator.clipboard.writeText(url);
                                setCopiedWebhook(acct.id);
                                setTimeout(() => setCopiedWebhook(null), 2000);
                              }}
                              title="Copy webhook URL"
                            >
                              {copiedWebhook === acct.id ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" /> Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <code className="block text-[11px] text-blue-900 dark:text-blue-100 break-all">
                            POST {typeof window !== "undefined" ? window.location.origin : ""}/api/portal-leads/housing/{acct.profileId}
                          </code>
                          <p className="text-[10px] text-blue-700 dark:text-blue-300">
                            Housing&apos;s account manager configures lead push to this URL. Leads will auto-appear in the pending queue — no manual sync needed.
                          </p>
                        </div>
                        {acct.endpointUrl && (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Pull endpoint (optional): <code className="break-all">{acct.endpointUrl}</code>
                          </div>
                        )}
                        {acct.lastSyncMessage && (
                          <div className={`text-[11px] mt-1.5 rounded p-1.5 ${
                            acct.lastSyncStatus === "success"
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : acct.lastSyncStatus === "partial"
                              ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                              : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                          }`}>
                            {acct.lastSyncAt && (
                              <span>
                                Last sync: {new Date(acct.lastSyncAt).toLocaleString("en-IN")}
                                {" — "}
                              </span>
                            )}
                            {acct.lastSyncMessage}
                          </div>
                        )}
                        {testResult[acct.id] && (
                          <div className={`text-[11px] mt-1.5 rounded p-1.5 ${
                            testResult[acct.id]?.ok
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                          }`}>
                            <span className="font-semibold">Test result:</span>{" "}
                            {testResult[acct.id]?.message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testConnection(acct.id)}
                          disabled={testingAccountId !== null || syncingAccountId !== null || !acct.isActive}
                          className="h-7 text-xs"
                          title="Test connectivity to Housing.com (does not import leads)"
                        >
                          <PlugZap className={`h-3 w-3 mr-1 ${testingAccountId === acct.id ? "animate-pulse" : ""}`} />
                          {testingAccountId === acct.id ? "Testing..." : "Test"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncOne(acct.id, acct.label)}
                          disabled={syncingAccountId !== null || !acct.isActive}
                          className="h-7 text-xs"
                        >
                          <CloudDownload className={`h-3 w-3 mr-1 ${syncingAccountId === acct.id ? "animate-spin" : ""}`} />
                          {syncingAccountId === acct.id ? "Syncing..." : "Sync"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditForm(acct)}
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteAccount(acct.id, acct.label)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No Housing.com accounts connected yet. Add your first account below.
              </div>
            )}

            {/* Message */}
            {housingMsg && (
              <div className={`rounded-md p-2.5 text-xs ${
                housingMsg.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : housingMsg.type === "error"
                  ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                  : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
              }`}>
                {housingMsg.text}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={openCreateForm}
                disabled={showForm}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Account
              </Button>
              <Button
                size="sm"
                onClick={syncAll}
                disabled={syncingAccountId !== null || housingAccounts.filter((a) => a.isActive).length === 0}
                className="h-8 bg-blue-600 hover:bg-blue-700"
              >
                <CloudDownload className={`h-3 w-3 mr-1 ${syncingAccountId === "all" ? "animate-spin" : ""}`} />
                {syncingAccountId === "all" ? "Syncing all..." : `Sync All (last 7 days)`}
              </Button>
              <span className="text-xs text-muted-foreground">
                Pulls leads into the pending queue. Project &amp; assignee are picked per-row below.
              </span>
            </div>

            {/* Add/Edit form */}
            {showForm && (
              <div className="rounded-md border border-blue-300 dark:border-blue-700 p-3 space-y-3 bg-blue-50/50 dark:bg-blue-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {editingId ? "Edit Account" : "New Housing.com Account"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={resetForm}
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Account Label *</label>
                    <Input
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      placeholder="e.g. Royal Aura Account, Multi-Project Account"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Profile ID *</label>
                    <Input
                      value={formProfileId}
                      onChange={(e) => setFormProfileId(e.target.value)}
                      placeholder="e.g. 22239545"
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Encryption Key *
                      {editingId && (
                        <span className="ml-2 text-muted-foreground font-normal">
                          Saved: <code className="text-[10px]">{housingAccounts.find((a) => a.id === editingId)?.encryptionKeyMasked}</code>
                          {" "}(leave blank to keep)
                        </span>
                      )}
                    </label>
                    <Input
                      value={formEncryptionKey}
                      onChange={(e) => setFormEncryptionKey(e.target.value)}
                      placeholder={editingId ? "Enter new key to replace" : "e.g. f8bd5d47a7932ad40f9ebbe2278a5f2f"}
                      className="h-8 text-sm font-mono"
                      type="password"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Default Project <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Select value={formDefaultProjectId} onValueChange={setFormDefaultProjectId}>
                      <SelectTrigger className="h-8 text-sm">
                        <Building2 className="mr-1 h-3 w-3 shrink-0" />
                        <SelectValue placeholder="None — pick per lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium flex items-center gap-2">
                    Endpoint URL
                    <span className="text-muted-foreground font-normal">
                      (optional but recommended — paste the exact partner API URL from your Housing.com account manager)
                    </span>
                  </label>
                  <Input
                    value={formEndpointUrl}
                    onChange={(e) => setFormEndpointUrl(e.target.value)}
                    placeholder="e.g. https://partner.housing.com/api/v1/leads/get"
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    If left blank, we&apos;ll try a few common Housing URL patterns (most don&apos;t exist anymore —
                    the partner API URL is account-specific and is provided by Housing&apos;s partner team).
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={formIsActive}
                    onCheckedChange={(v) => setFormIsActive(v === true)}
                  />
                  <span>Active (include in "Sync All")</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={saveAccount}
                    disabled={savingAccount}
                    className="h-8"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {savingAccount ? "Saving..." : editingId ? "Update Account" : "Save Account"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetForm}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Leave Default Project empty if this account has multiple projects —
                    you'll pick per lead after sync.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        ) : null}
      </Card>

      {/* API endpoint info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Portal Leads — Pending Review
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-sm space-y-2">
            <div className="font-medium text-blue-700 dark:text-blue-300">
              External Portal API Endpoint
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1 bg-white dark:bg-gray-900 rounded border text-xs">
                POST {apiUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyApiUrl} className="h-8">
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Send leads from Housing.com, MagicBricks, 99acres, or any portal to this endpoint. Required fields: <code>name</code>, <code>phone</code>. Optional: <code>email</code>, <code>source</code>, <code>budget</code>, <code>notes</code>, <code>projectName</code>, <code>portalRef</code>.
            </p>
          </div>

          {/* MagicBricks dedicated webhook URL */}
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950 p-3 text-sm space-y-2 border border-emerald-200 dark:border-emerald-900">
            <div className="font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <PlugZap className="h-4 w-4" />
              MagicBricks Webhook URL (dedicated)
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1 bg-white dark:bg-gray-900 rounded border text-xs">
                POST {magicbricksUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyMagicbricksUrl} className="h-8">
                {copiedMagic ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copiedMagic ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Share this URL with your MagicBricks account manager. MagicBricks will POST leads here in JSON format.
              Required fields: <code>BuyerName</code> (or <code>Name</code>), <code>ContactNo</code> (or <code>Mobile</code>/<code>Phone</code>).
              Optional: <code>EmailID</code>, <code>CityName</code>, <code>ProjectName</code>, <code>Budget</code>, <code>Remark</code>, <code>RequirementID</code>, <code>LeadSource</code>.
              Both PascalCase (MagicBricks style) and lowercase field names are accepted.
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
              Incoming MagicBricks leads will appear in the pending queue below with source = <code>MagicBricks</code>.
              Admin can then assign project + assignee and confirm them into the main lead list.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {(["pending", "confirmed", "discarded"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterStatus === s ? "default" : "outline"}
                onClick={() => setFilterStatus(s)}
                className="h-8 capitalize"
              >
                {s}
                {s === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">
                    {pendingCount}
                  </span>
                )}
              </Button>
            ))}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchPortalLeads(filterStatus)}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {lastResult && (
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-950 p-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                <strong>{lastResult.confirmed}</strong> lead(s) added to Lead Management
                {lastResult.duplicated > 0 && (
                  <span>, <strong>{lastResult.duplicated}</strong> skipped (duplicate phone)</span>
                )}
                {lastResult.failed > 0 && (
                  <span>, <strong>{lastResult.failed}</strong> failed</span>
                )}
              </span>
            </div>
          )}

          {portalLeads.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No {filterStatus} portal leads.
              {filterStatus === "pending" && " When a portal sends a new lead, it will appear here."}
            </div>
          ) : (
            <>
              {/* Bulk-apply bar (only show in pending view) */}
              {filterStatus === "pending" && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Selection:</span>
                      <Button size="sm" variant="outline" onClick={toggleAll} className="h-7 text-xs">
                        {selectedRows.size === portalLeads.length ? "Deselect All" : "Select All"}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {selectedRows.size} of {portalLeads.length} selected
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-brand">Bulk Apply to Selected:</span>

                    <Select value={bulkProject} onValueChange={setBulkProject}>
                      <SelectTrigger className="w-[180px] h-8">
                        <Building2 className="mr-1 h-3 w-3 shrink-0" />
                        <SelectValue placeholder="Set Project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={applyBulkProject} disabled={!bulkProject || selectedRows.size === 0} className="h-8 text-xs">
                      Apply Project
                    </Button>

                    <Select value={bulkSource} onValueChange={setBulkSource}>
                      <SelectTrigger className="w-[150px] h-8">
                        <SelectValue placeholder="Set Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={applyBulkSource} disabled={!bulkSource || selectedRows.size === 0} className="h-8 text-xs">
                      Apply Source
                    </Button>

                    <Select value={bulkAssign} onValueChange={setBulkAssign}>
                      <SelectTrigger className="w-[160px] h-8">
                        <Users className="mr-1 h-3 w-3 shrink-0" />
                        <SelectValue placeholder="Set Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => u.isActive && u.role !== "admin" && u.role !== "super_admin")
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={applyBulkAssign} disabled={!bulkAssign || selectedRows.size === 0} className="h-8 text-xs">
                      Apply Assignee
                    </Button>

                    <div className="flex-1" />

                    <Button
                      onClick={handleConfirm}
                      disabled={confirming || selectedRows.size === 0}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {confirming ? "Confirming..." : `Confirm ${selectedRows.size} Lead${selectedRows.size !== 1 ? "s" : ""} → Lead Management`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Portal leads table */}
              <div className="max-h-[600px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {filterStatus === "pending" && (
                        <TableHead className="w-8">
                          <Checkbox
                            checked={selectedRows.size === portalLeads.length && portalLeads.length > 0}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                      )}
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Project (file)</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Notes</TableHead>
                      {filterStatus === "pending" && <TableHead>Source (pick)</TableHead>}
                      {filterStatus === "pending" && <TableHead>Project (select)</TableHead>}
                      {filterStatus === "pending" && <TableHead>Assign To</TableHead>}
                      {(filterStatus === "confirmed" || filterStatus === "discarded") && <TableHead>Status</TableHead>}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portalLeads.map((lead, i) => (
                      <TableRow key={lead.id} className={selectedRows.has(lead.id) ? "bg-brand/5" : ""}>
                        {filterStatus === "pending" && (
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(lead.id)}
                              onCheckedChange={() => toggleRow(lead.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                            {lead.source}
                          </Badge>
                          {lead.portalRef && (
                            <div className="text-[10px] text-muted-foreground mt-1">Ref: {lead.portalRef}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{lead.name}</TableCell>
                        <TableCell className="text-xs">{lead.phone}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.email || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.projectName || "—"}</TableCell>
                        <TableCell className="text-xs">{lead.budget || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={lead.notes || ""}>
                          {lead.notes || "—"}
                        </TableCell>

                        {filterStatus === "pending" && (
                          <TableCell>
                            <Select
                              value={rowSource[lead.id] || lead.source}
                              onValueChange={(v) => setRowSource((prev) => ({ ...prev, [lead.id]: v }))}
                            >
                              <SelectTrigger className="h-7 text-xs w-[120px]">
                                <SelectValue placeholder="Source" />
                              </SelectTrigger>
                              <SelectContent>
                                {sources.map((s) => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        {filterStatus === "pending" && (
                          <TableCell>
                            <Select
                              value={rowProject[lead.id] || ""}
                              onValueChange={(v) => setRowProject((prev) => ({ ...prev, [lead.id]: v }))}
                            >
                              <SelectTrigger className="h-7 text-xs w-[140px]">
                                <Building2 className="mr-1 h-3 w-3 shrink-0" />
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {projects.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        {filterStatus === "pending" && (
                          <TableCell>
                            <Select
                              value={rowAssign[lead.id] || ""}
                              onValueChange={(v) => setRowAssign((prev) => ({ ...prev, [lead.id]: v }))}
                            >
                              <SelectTrigger className="h-7 text-xs w-[120px]">
                                <Users className="mr-1 h-3 w-3 shrink-0" />
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {users
                                  .filter((u) => u.isActive && u.role !== "admin" && u.role !== "super_admin")
                                  .map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        {(filterStatus === "confirmed" || filterStatus === "discarded") && (
                          <TableCell>
                            <Badge className={`text-xs ${
                              lead.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}>
                              {lead.status}
                            </Badge>
                          </TableCell>
                        )}

                        <TableCell>
                          <div className="flex items-center gap-1">
                            {filterStatus === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600"
                                onClick={() => handleDiscard(lead.id)}
                                title="Discard"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(filterStatus === "discarded" || filterStatus === "confirmed") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteForever(lead.id)}
                                title="Delete forever"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
