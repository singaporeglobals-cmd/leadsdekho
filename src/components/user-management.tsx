"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, UserCog, Shield, Phone, Users, Eye, EyeOff, Key, Crown } from "lucide-react";
import { useAppStore, isAdminRole, isSuperAdmin } from "@/lib/store";

interface UserItem {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  plainPassword?: string;
  _count?: {
    currentLeads: number;
    primaryLeads: number;
    callLogs: number;
  };
}

const roleColors: Record<string, string> = {
  super_admin: "bg-brand text-white",
  admin: "bg-steel-dark text-steel-light",
  telecalling: "bg-amber-100 text-amber-700",
  sales: "bg-sky-100 text-sky-700",
};

export function UserManagement() {
  const { user } = useAppStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState(false);
  const [newPasswordDialog, setNewPasswordDialog] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "telecalling",
    isActive: true,
  });

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (!user || !isAdminRole(user.role)) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!cancelled && res.ok) setUsers(await res.json());
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.role]);

  if (!user || !isAdminRole(user.role)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">
            Only administrators can manage users.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isSuper = isSuperAdmin(user.role);

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      name: "",
      email: "",
      password: "",
      role: isSuper ? "admin" : "telecalling",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (u: UserItem) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      isActive: u.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingUser) {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchUsers();
      }
    } else {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create user");
      }
    }
  };

  const handleDeactivate = async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
  };

  const handleResetPassword = async () => {
    if (!newPasswordDialog || !newPassword) return;
    const res = await fetch(`/api/users/${newPasswordDialog.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      setNewPasswordDialog(null);
      setNewPassword("");
      fetchUsers();
    }
  };

  // Filter users based on role: normal admin can't see super_admin
  const visibleUsers = isSuper ? users : users.filter(u => u.role !== "super_admin");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5 text-brand" /> Team Members
          </h2>
          <p className="text-sm text-gray-500">
            {visibleUsers.length} user{visibleUsers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuper && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-xs"
            >
              {showPasswords ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
              {showPasswords ? "Hide Passwords" : "Show Passwords"}
            </Button>
          )}
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-dark"
            onClick={openCreate}
          >
            <Plus className="mr-1 h-3 w-3" /> {isSuper ? "Add Admin" : "Add User"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-48 rounded-lg bg-gray-200" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email / ID</TableHead>
                  {isSuper && showPasswords && <TableHead>Password</TableHead>}
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {u.role === "super_admin" && <Crown className="h-4 w-4 text-brand" />}
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    {isSuper && showPasswords && (
                      <TableCell className="text-sm font-mono">
                        <Badge variant="outline" className="text-xs font-mono">
                          {u.plainPassword || "••••••••"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge className={roleColors[u.role] || ""}>
                        {u.role === "super_admin" ? "Super Admin" : u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.isActive ? "default" : "secondary"}
                        className={
                          u.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u._count?.currentLeads || 0}
                    </TableCell>
                    <TableCell>
                      {u._count?.callLogs || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isSuper && u.role !== "super_admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setNewPasswordDialog(u);
                              setNewPassword("");
                            }}
                            title="Reset Password"
                          >
                            <Key className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openEdit(u)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {u.isActive && u.id !== user?.id && u.role !== "super_admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600"
                            onClick={() => handleDeactivate(u.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : isSuper ? "Add Admin User" : "Add User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            <div className="space-y-1">
              <Label>
                {editingUser ? "New Password (leave blank to keep)" : "Password *"}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingUser ? "Leave blank to keep current" : "Password"}
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuper && (
                    <SelectItem value="super_admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-3 w-3" /> Super Admin
                      </div>
                    </SelectItem>
                  )}
                  {isSuper && (
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" /> Admin
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="telecalling">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> Telecalling
                    </div>
                  </SelectItem>
                  <SelectItem value="sales">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" /> Sales
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingUser && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label>Active</Label>
              </div>
            )}
            <Button
              onClick={handleSave}
              className="w-full bg-brand hover:bg-brand-dark"
              disabled={!form.name || !form.email || (!editingUser && !form.password)}
            >
              {editingUser ? "Update User" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!newPasswordDialog} onOpenChange={() => setNewPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {newPasswordDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Reset password for <strong>{newPasswordDialog.name}</strong>
              </p>
              <div className="space-y-1">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <Button
                onClick={handleResetPassword}
                className="w-full bg-brand hover:bg-brand-dark"
                disabled={!newPassword}
              >
                Reset Password
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
