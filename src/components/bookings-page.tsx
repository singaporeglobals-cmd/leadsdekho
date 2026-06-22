"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore, isAdminRole } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Calendar,
  Eye,
  TrendingUp,
  User,
  Plus,
  Upload,
  X,
  Download,
  Pencil,
  Trash2,
  Phone,
  Mail,
  IndianRupee,
  Image as ImageIcon,
  Filter,
  RotateCcw,
} from "lucide-react";

interface BookingImage {
  name: string;
  dataUrl: string;
  type: string;
  size: number;
}

interface BookingListItem {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  propertyName: string | null;
  unitNumber: string | null;
  bookingAmount: number | null;
  totalValue: number | null;
  paymentMode: string | null;
  bookingDate: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  leadId: string | null;
  images: { name?: string; type?: string; size?: number }[];
  imageCount: number;
  user: { id: string; name: string; role: string };
  project: { id: string; name: string } | null;
  lead: { id: string; name: string; phone: string } | null;
}

interface BookingDetail extends BookingListItem {
  images: BookingImage[];
}

interface UserOption { id: string; name: string; role: string; isActive: boolean; }
interface ProjectItem { id: string; name: string; }

const BOOKING_STATUS_OPTIONS = [
  "Confirmed",
  "Pending",
  "Cancelled",
  "Refunded",
];

const PAYMENT_MODE_OPTIONS = [
  "Cash",
  "Cheque",
  "Bank Transfer",
  "UPI",
  "Card",
  "Loan",
  "Other",
];

/**
 * Resize and compress an image file client-side so the upload payload stays
 * under Vercel's 4.5MB body limit even with multiple images.
 * - Max dimension: 1400px
 * - Output: JPEG quality 0.8 (preserves PNG transparency by flattening to white)
 */
async function resizeImage(file: File): Promise<BookingImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // For non-image files (shouldn't happen due to input accept), keep as-is
  if (!file.type.startsWith("image/")) {
    return {
      name: file.name,
      dataUrl,
      type: file.type,
      size: file.size,
    };
  }

  return new Promise<BookingImage>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback to original
        resolve({ name: file.name, dataUrl, type: file.type, size: file.size });
        return;
      }
      // White background so transparent PNGs don't go black when flattened to JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const out = canvas.toDataURL("image/jpeg", 0.8);
      // Estimate size: base64 length * 0.75 ≈ byte size
      const estimatedSize = Math.round((out.length - 22) * 0.75);
      resolve({
        name: file.name.replace(/\.(png|webp|gif|bmp)$/i, ".jpg"),
        dataUrl: out,
        type: "image/jpeg",
        size: estimatedSize,
      });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function downloadImage(image: BookingImage, index: number) {
  const a = document.createElement("a");
  a.href = image.dataUrl;
  // Preserve original extension if possible, fallback to jpg
  const name = image.name || `booking-image-${index + 1}.jpg`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function BookingsPage() {
  const { user, setSelectedLeadId, setPage } = useAppStore();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Admin filters
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [userFilter, setUserFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refresh, setRefresh] = useState(0);

  // Create / Edit dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BookingDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [fCustomerName, setFCustomerName] = useState("");
  const [fCustomerPhone, setFCustomerPhone] = useState("");
  const [fCustomerEmail, setFCustomerEmail] = useState("");
  const [fProjectId, setFProjectId] = useState("");
  const [fPropertyName, setFPropertyName] = useState("");
  const [fUnitNumber, setFUnitNumber] = useState("");
  const [fBookingAmount, setFBookingAmount] = useState("");
  const [fTotalValue, setFTotalValue] = useState("");
  const [fPaymentMode, setFPaymentMode] = useState("");
  const [fBookingDate, setFBookingDate] = useState(new Date().toISOString().split("T")[0]);
  const [fStatus, setFStatus] = useState("Confirmed");
  const [fNotes, setFNotes] = useState("");
  const [fLeadId, setFLeadId] = useState("");
  const [fImages, setFImages] = useState<BookingImage[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<BookingDetail | null>(null);

  // Fetch users + projects (admin only)
  useEffect(() => {
    if (!isAdminRole(user?.role || "")) return;
    (async () => {
      try {
        const [uRes, pRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/projects"),
        ]);
        if (uRes.ok) setUsers(await uRes.json());
        if (pRes.ok) setProjects(await pRes.json());
      } catch (e) { console.error(e); }
    })();
  }, [user?.role]);

  // Fetch bookings list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (isAdminRole(user?.role || "") && userFilter !== "all") params.set("userId", userFilter);
        if (projectFilter !== "all") params.set("projectId", projectFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        if (search) params.set("search", search);

        const res = await fetch(`/api/bookings?${params.toString()}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setBookings(data.bookings || []);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refresh, userFilter, projectFilter, statusFilter, dateFrom, dateTo, search, user?.role]);

  const openCreateForm = () => {
    setEditing(null);
    setFCustomerName("");
    setFCustomerPhone("");
    setFCustomerEmail("");
    setFProjectId("");
    setFPropertyName("");
    setFUnitNumber("");
    setFBookingAmount("");
    setFTotalValue("");
    setFPaymentMode("");
    setFBookingDate(new Date().toISOString().split("T")[0]);
    setFStatus("Confirmed");
    setFNotes("");
    setFLeadId("");
    setFImages([]);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = async (bookingId: string) => {
    setDetailOpen(false);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const b: BookingDetail = await res.json();
        setEditing(b);
        setFCustomerName(b.customerName);
        setFCustomerPhone(b.customerPhone);
        setFCustomerEmail(b.customerEmail || "");
        setFProjectId(b.project?.id || "");
        setFPropertyName(b.propertyName || "");
        setFUnitNumber(b.unitNumber || "");
        setFBookingAmount(b.bookingAmount?.toString() || "");
        setFTotalValue(b.totalValue?.toString() || "");
        setFPaymentMode(b.paymentMode || "");
        setFBookingDate(new Date(b.bookingDate).toISOString().split("T")[0]);
        setFStatus(b.status);
        setFNotes(b.notes || "");
        setFLeadId(b.leadId || "");
        setFImages((b.images || []).filter((img) => img && img.dataUrl));
        setFormError(null);
        setFormOpen(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = async (bookingId: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        setDetail(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImageUploading(true);
    try {
      const newImages: BookingImage[] = [];
      // Process sequentially to avoid memory spikes
      for (let i = 0; i < files.length; i++) {
        const img = await resizeImage(files[i]);
        newImages.push(img);
      }
      setFImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error(err);
      setFormError("Failed to process one or more images");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setFImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!fCustomerName || !fCustomerPhone) {
      setFormError("Customer name and phone are required");
      return;
    }

    // Total payload size check (warn if too large)
    const totalSize = fImages.reduce((sum, img) => sum + (img.size || 0), 0);
    if (totalSize > 4_000_000) {
      setFormError(
        `Total image size (${(totalSize / 1024 / 1024).toFixed(1)}MB) is too large. Please remove some images (max 4MB total).`
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        leadId: fLeadId || null,
        customerName: fCustomerName,
        customerPhone: fCustomerPhone,
        customerEmail: fCustomerEmail || null,
        projectId: fProjectId || null,
        propertyName: fPropertyName || null,
        unitNumber: fUnitNumber || null,
        bookingAmount: fBookingAmount || null,
        totalValue: fTotalValue || null,
        paymentMode: fPaymentMode || null,
        bookingDate: fBookingDate,
        notes: fNotes || null,
        status: fStatus,
        images: fImages,
      };

      const url = editing ? `/api/bookings/${editing.id}` : "/api/bookings";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormError(d.error || "Failed to save booking");
        return;
      }

      setFormOpen(false);
      setRefresh((r) => r + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFormError(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this booking? This cannot be undone.")) return;
    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    if (res.ok) {
      setDetailOpen(false);
      setRefresh((r) => r + 1);
    }
  };

  // Quick date presets
  const applyPreset = (preset: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (preset === "today") { setDateFrom(today); setDateTo(today); }
    else if (preset === "yesterday") {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const s = d.toISOString().split("T")[0];
      setDateFrom(s); setDateTo(s);
    } else if (preset === "last7") {
      const d = new Date(); d.setDate(d.getDate() - 6);
      setDateFrom(d.toISOString().split("T")[0]); setDateTo(today);
    } else if (preset === "last30") {
      const d = new Date(); d.setDate(d.getDate() - 29);
      setDateFrom(d.toISOString().split("T")[0]); setDateTo(today);
    } else if (preset === "thismonth") {
      const d = new Date();
      setDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]);
      setDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]);
    }
  };

  const clearAllFilters = () => {
    setUserFilter("all");
    setProjectFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  const today = new Date().toISOString().split("T")[0];
  const todayBookings = bookings.filter(
    (b) => b.bookingDate.split("T")[0] === today
  );
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthBookings = bookings.filter((b) => {
    const d = new Date(b.bookingDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalBookingValue = bookings.reduce(
    (sum, b) => sum + (b.totalValue || b.bookingAmount || 0),
    0
  );

  const hasActiveFilters =
    userFilter !== "all" ||
    projectFilter !== "all" ||
    statusFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    search !== "";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground">{formatINR(totalBookingValue)}</p>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-3">
                <IndianRupee className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search customer, phone, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <RotateCcw className="mr-1 h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        <Button onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-1 h-4 w-4" /> Add Booking
        </Button>
      </div>

      {/* Admin filters */}
      {isAdminRole(user?.role || "") && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" /> Filters
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label className="text-xs">User</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Users" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Project</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {BOOKING_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {["today", "yesterday", "last7", "last30", "thismonth"].map((p) => (
                <Button key={p} variant="outline" size="sm" className="h-6 text-xs" onClick={() => applyPreset(p)}>
                  {p === "today" ? "Today" : p === "yesterday" ? "Yesterday" : p === "last7" ? "Last 7 days" : p === "last30" ? "Last 30 days" : "This Month"}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">No bookings found</p>
            <p className="text-sm text-muted-foreground mb-3">
              Click &quot;Add Booking&quot; to create your first booking record
            </p>
            <Button onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-1 h-4 w-4" /> Add Booking
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-360px)] overflow-y-auto">
          {bookings.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{b.customerName}</span>
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        {b.status}
                      </Badge>
                      {b.imageCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <ImageIcon className="mr-1 h-3 w-3" /> {b.imageCount}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {b.customerPhone}
                      </span>
                      {b.customerEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {b.customerEmail}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {b.project && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {b.project.name}
                        </span>
                      )}
                      {b.propertyName && <span>Unit: {b.propertyName}{b.unitNumber ? ` - ${b.unitNumber}` : ""}</span>}
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {b.user.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(b.bookingDate).toLocaleDateString()}
                      </span>
                      {b.totalValue != null && <span>Value: {formatINR(b.totalValue)}</span>}
                      {b.bookingAmount != null && <span>Booking: {formatINR(b.bookingAmount)}</span>}
                      {b.paymentMode && <span>Mode: {b.paymentMode}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openDetail(b.id)}
                  >
                    <Eye className="mr-1 h-3 w-3" /> View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Booking" : "Add New Booking"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={fCustomerName}
                  onChange={(e) => setFCustomerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Customer Phone *</Label>
                <Input
                  id="customerPhone"
                  value={fCustomerPhone}
                  onChange={(e) => setFCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={fCustomerEmail}
                  onChange={(e) => setFCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label htmlFor="bookingDate">Booking Date</Label>
                <Input
                  id="bookingDate"
                  type="date"
                  value={fBookingDate}
                  onChange={(e) => setFBookingDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={fProjectId} onValueChange={setFProjectId}>
                  <SelectTrigger id="project"><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="propertyName">Property / Unit Name</Label>
                <Input
                  id="propertyName"
                  value={fPropertyName}
                  onChange={(e) => setFPropertyName(e.target.value)}
                  placeholder="e.g. Tower A, 3BHK"
                />
              </div>
              <div>
                <Label htmlFor="unitNumber">Unit Number</Label>
                <Input
                  id="unitNumber"
                  value={fUnitNumber}
                  onChange={(e) => setFUnitNumber(e.target.value)}
                  placeholder="e.g. A-1203"
                />
              </div>
              <div>
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select value={fPaymentMode} onValueChange={setFPaymentMode}>
                  <SelectTrigger id="paymentMode"><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {PAYMENT_MODE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bookingAmount">Booking Amount (₹)</Label>
                <Input
                  id="bookingAmount"
                  type="number"
                  value={fBookingAmount}
                  onChange={(e) => setFBookingAmount(e.target.value)}
                  placeholder="e.g. 500000"
                />
              </div>
              <div>
                <Label htmlFor="totalValue">Total Value (₹)</Label>
                <Input
                  id="totalValue"
                  type="number"
                  value={fTotalValue}
                  onChange={(e) => setFTotalValue(e.target.value)}
                  placeholder="e.g. 5500000"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BOOKING_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="leadId">Lead ID (optional)</Label>
                <Input
                  id="leadId"
                  value={fLeadId}
                  onChange={(e) => setFLeadId(e.target.value)}
                  placeholder="Link to existing lead (cuid)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                placeholder="Any additional notes about this booking..."
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label>Booking Documents / Photos</Label>
              <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="booking-images"
                />
                <label htmlFor="booking-images" className="cursor-pointer inline-flex flex-col items-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="mt-2 text-sm text-muted-foreground">
                    {imageUploading ? "Processing..." : "Click to upload images"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Multiple images allowed. Auto-resized to max 1400px.
                  </span>
                </label>
              </div>

              {fImages.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {fImages.map((img, i) => (
                    <div key={i} className="relative group aspect-square rounded-md overflow-hidden border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                        {img.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {fImages.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {fImages.length} image(s) · Total: {(fImages.reduce((s, i) => s + (i.size || 0), 0) / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>

            {formError && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || imageUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? "Saving..." : editing ? "Update Booking" : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold">{detail.customerName}</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {detail.status}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {detail.customerPhone}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{detail.customerEmail || "—"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="text-sm font-medium">{detail.project?.name || "—"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Property / Unit</p>
                  <p className="text-sm font-medium">
                    {detail.propertyName || "—"}{detail.unitNumber ? ` · ${detail.unitNumber}` : ""}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Booking Amount</p>
                  <p className="text-sm font-medium">{formatINR(detail.bookingAmount)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-sm font-medium">{formatINR(detail.totalValue)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Payment Mode</p>
                  <p className="text-sm font-medium">{detail.paymentMode || "—"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Booking Date</p>
                  <p className="text-sm font-medium">{new Date(detail.bookingDate).toLocaleDateString()}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="text-sm font-medium">{detail.user.name} ({detail.user.role})</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="text-sm font-medium">{new Date(detail.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {detail.lead && (
                <div className="rounded-md border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Linked Lead</p>
                  <button
                    className="text-sm font-medium text-brand hover:underline"
                    onClick={() => {
                      setSelectedLeadId(detail.lead!.id);
                      setPage("lead-detail");
                      setDetailOpen(false);
                    }}
                  >
                    {detail.lead.name} · {detail.lead.phone}
                  </button>
                </div>
              )}

              {detail.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted/30 rounded-md p-3 whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}

              {/* Images Gallery */}
              {detail.images && detail.images.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      Images ({detail.images.length})
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        detail.images.forEach((img, i) => downloadImage(img, i));
                      }}
                    >
                      <Download className="mr-1 h-3 w-3" /> Download All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detail.images.map((img, i) => (
                      <div key={i} className="relative group rounded-md overflow-hidden border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          <a
                            href={img.dataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/90 text-black rounded p-1"
                            title="View full size"
                          >
                            <Eye className="h-3 w-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => downloadImage(img, i)}
                            className="bg-white/90 text-black rounded p-1"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                          {img.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(detail.id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditForm(detail.id)}
                >
                  <Pencil className="mr-1 h-4 w-4" /> Edit Booking
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Failed to load booking</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
