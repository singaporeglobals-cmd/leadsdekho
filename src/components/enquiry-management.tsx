"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Search,
  Trash2,
  ShieldAlert,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  Loader2,
  Eye,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { useAppStore, isSuperAdmin } from "@/lib/store";

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string;
  createdAt: string;
}

export function EnquiryManagement() {
  const { user } = useAppStore();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // View dialog
  const [viewEnquiry, setViewEnquiry] = useState<Enquiry | null>(null);

  // Delete dialog
  const [deleteEnquiry, setDeleteEnquiry] = useState<Enquiry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contact");
      if (res.ok) {
        const data = await res.json();
        setEnquiries(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const filtered = enquiries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.phone && e.phone.toLowerCase().includes(q)) ||
      (e.company && e.company.toLowerCase().includes(q)) ||
      (e.message && e.message.toLowerCase().includes(q))
    );
  });

  const handleDelete = async () => {
    if (!deleteEnquiry) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contact/${deleteEnquiry.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteEnquiry(null);
        fetchEnquiries();
      }
    } catch (e) {
      console.error(e);
    }
    setDeleting(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Access denied for non-super_admin
  if (!isSuperAdmin(user?.role || "")) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ShieldAlert className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-3 text-lg font-semibold text-foreground">Access Denied</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Only super admins can view enquiries.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search & Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search enquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchEnquiries}
          disabled={loading}
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Enquiries Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <span className="ml-2 text-sm text-muted-foreground">Loading enquiries...</span>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Inbox className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-muted-foreground">
              {search ? "No enquiries match your search" : "No enquiries received yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Enquiries from the home page contact form will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" />
              Enquiries
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
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((enquiry) => (
                    <TableRow key={enquiry.id}>
                      <TableCell className="pl-6 font-medium">
                        {enquiry.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {enquiry.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {enquiry.phone || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {enquiry.company || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(enquiry.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-brand-light hover:text-brand-dark"
                            onClick={() => setViewEnquiry(enquiry)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteEnquiry(enquiry)}
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

      {/* View Enquiry Dialog */}
      <Dialog open={!!viewEnquiry} onOpenChange={(open) => { if (!open) setViewEnquiry(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light">
                <Mail className="h-4 w-4 text-brand-dark" />
              </div>
              Enquiry Details
            </DialogTitle>
          </DialogHeader>
          {viewEnquiry && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <span className="text-sm font-semibold text-brand">
                      {viewEnquiry.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{viewEnquiry.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDateTime(viewEnquiry.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-foreground">{viewEnquiry.email}</span>
                  </div>
                  {viewEnquiry.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium text-foreground">{viewEnquiry.phone}</span>
                    </div>
                  )}
                  {viewEnquiry.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Company:</span>
                      <span className="font-medium text-foreground">{viewEnquiry.company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="text-xs">
                      {viewEnquiry.source}
                    </Badge>
                  </div>
                </div>

                {viewEnquiry.message && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Message</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{viewEnquiry.message}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {viewEnquiry.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      window.open(`tel:${viewEnquiry.phone}`);
                    }}
                  >
                    <Phone className="mr-1 h-3 w-3" /> Call
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    window.open(`mailto:${viewEnquiry.email}`);
                  }}
                >
                  <Mail className="mr-1 h-3 w-3" /> Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteEnquiry}
        onOpenChange={(open) => {
          if (!open) setDeleteEnquiry(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the enquiry from{" "}
              <span className="font-semibold text-foreground">
                {deleteEnquiry?.name}
              </span>
              ? This action cannot be undone.
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
