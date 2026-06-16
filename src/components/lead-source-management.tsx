"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ShieldAlert,
  Radio,
  Loader2,
} from "lucide-react";
import { useAppStore, isAdminRole } from "@/lib/store";

interface LeadSource {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export function LeadSourceManagement() {
  const { user } = useAppStore();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSource, setEditSource] = useState<LeadSource | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);

  // Delete dialog
  const [deleteSource, setDeleteSource] = useState<LeadSource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead-sources?all=true");
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const filtered = sources.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Add handler
  const handleAdd = async () => {
    if (!addName.trim()) {
      setAddError("Name is required");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName }),
      });
      if (res.ok) {
        setAddDialogOpen(false);
        setAddName("");
        fetchSources();
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to add lead source");
      }
    } catch {
      setAddError("Failed to add lead source");
    }
    setAdding(false);
  };

  // Edit handler
  const openEditDialog = (source: LeadSource) => {
    setEditSource(source);
    setEditName(source.name);
    setEditIsActive(source.isActive);
    setEditError("");
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editSource) return;
    if (!editName.trim()) {
      setEditError("Name is required");
      return;
    }
    setEditing(true);
    setEditError("");
    try {
      const res = await fetch(`/api/lead-sources/${editSource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, isActive: editIsActive }),
      });
      if (res.ok) {
        setEditDialogOpen(false);
        fetchSources();
      } else {
        const data = await res.json();
        setEditError(data.error || "Failed to update lead source");
      }
    } catch {
      setEditError("Failed to update lead source");
    }
    setEditing(false);
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteSource) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/lead-sources/${deleteSource.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteSource(null);
        fetchSources();
      }
    } catch (e) {
      console.error(e);
    }
    setDeleting(false);
  };

  // Toggle active/inactive
  const handleToggleActive = async (source: LeadSource) => {
    try {
      const res = await fetch(`/api/lead-sources/${source.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !source.isActive }),
      });
      if (res.ok) {
        fetchSources();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Access denied for non-admin
  if (!isAdminRole(user?.role || "")) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ShieldAlert className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-3 text-lg font-semibold text-foreground">Access Denied</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Only administrators can manage lead sources.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search & Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search lead sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button
          size="sm"
          className="bg-brand hover:bg-brand-dark"
          onClick={() => {
            setAddName("");
            setAddError("");
            setAddDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-3 w-3" /> Add Source
        </Button>
      </div>

      {/* Lead Sources Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <span className="ml-2 text-sm text-muted-foreground">Loading lead sources...</span>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Radio className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-muted-foreground">
              {search ? "No lead sources match your search" : "No lead sources created yet"}
            </p>
            {!search && (
              <Button
                size="sm"
                className="mt-3 bg-brand hover:bg-brand-dark"
                onClick={() => {
                  setAddName("");
                  setAddError("");
                  setAddDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Your First Source
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-brand" />
              Lead Sources
              <Badge variant="secondary" className="ml-1 text-xs">
                {filtered.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="pl-6 font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              source.isActive ? "bg-emerald-500" : "bg-gray-300"
                            }`}
                          />
                          {source.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={source.isActive}
                            onCheckedChange={() => handleToggleActive(source)}
                            className={`${
                              source.isActive
                                ? "data-[state=checked]:bg-emerald-500"
                                : ""
                            }`}
                          />
                          <Badge
                            variant={source.isActive ? "default" : "secondary"}
                            className={`text-xs ${
                              source.isActive
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {source.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(source.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-brand-light hover:text-brand-dark"
                            onClick={() => openEditDialog(source)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteSource(source)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Source Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light">
                <Plus className="h-4 w-4 text-brand-dark" />
              </div>
              Add Lead Source
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Source Name *</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => {
                  setAddName(e.target.value);
                  setAddError("");
                }}
                placeholder="e.g. Facebook, Google, Referral"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}
            </div>
            <Button
              onClick={handleAdd}
              className="w-full bg-brand hover:bg-brand-dark"
              disabled={adding || !addName.trim()}
            >
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Source"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Source Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light">
                <Edit className="h-4 w-4 text-brand-dark" />
              </div>
              Edit Lead Source
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Source Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setEditError("");
                }}
                placeholder="Enter source name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                }}
              />
              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-xs text-muted-foreground">
                  {editIsActive
                    ? "This source is active and available for new leads"
                    : "This source is inactive and hidden from lead forms"}
                </p>
              </div>
              <Switch
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
                className={`${
                  editIsActive ? "data-[state=checked]:bg-emerald-500" : ""
                }`}
              />
            </div>
            <Button
              onClick={handleEdit}
              className="w-full bg-brand hover:bg-brand-dark"
              disabled={editing || !editName.trim()}
            >
              {editing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Source"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteSource}
        onOpenChange={(open) => {
          if (!open) setDeleteSource(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteSource?.name}
              </span>
              ? This action cannot be undone. Existing leads using this source
              will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
