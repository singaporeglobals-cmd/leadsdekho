"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Home,
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Building2,
  BedDouble,
  Bath,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Plot",
  "Commercial",
  "Farmhouse",
  "Other",
];

const PROPERTY_STATUSES = ["Available", "Reserved", "Booked", "Sold"];

const statusColors: Record<string, string> = {
  Available: "bg-emerald-100 text-emerald-700",
  Reserved: "bg-amber-100 text-amber-700",
  Booked: "bg-violet-100 text-violet-700",
  Sold: "bg-red-100 text-red-700",
};

const typeIcons: Record<string, string> = {
  Apartment: "🏢",
  Villa: "🏡",
  Plot: "📐",
  Commercial: "🏬",
  Farmhouse: "🌿",
  Other: "🏠",
};

interface Property {
  id: string;
  name: string;
  type: string;
  location: string | null;
  price: number | null;
  size: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
  description: string | null;
  project: { id: string; name: string } | null;
  createdAt: string;
}

export function PropertyManagement() {
  const { user } = useAppStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "Apartment",
    location: "",
    price: "",
    size: "",
    bedrooms: "",
    bathrooms: "",
    status: "Available",
    description: "",
    projectId: "",
  });

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProperties = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);

    const res = await fetch(`/api/properties?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setProperties(data.properties || []);
      setSummary(data.summary || {});
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/properties?${params.toString()}`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
        setSummary(data.summary || {});
      }
      if (!cancelled) setLoading(false);

      const pRes = await fetch("/api/projects");
      if (!cancelled && pRes.ok) setProjects(await pRes.json());
    })();
    return () => { cancelled = true; };
  }, [search, typeFilter, statusFilter]);

  const openCreateDialog = () => {
    setEditingProperty(null);
    setForm({
      name: "",
      type: "Apartment",
      location: "",
      price: "",
      size: "",
      bedrooms: "",
      bathrooms: "",
      status: "Available",
      description: "",
      projectId: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (property: Property) => {
    setEditingProperty(property);
    setForm({
      name: property.name,
      type: property.type,
      location: property.location || "",
      price: property.price?.toString() || "",
      size: property.size || "",
      bedrooms: property.bedrooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      status: property.status,
      description: property.description || "",
      projectId: property.project?.id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingProperty) {
      // Update
      const res = await fetch(`/api/properties/${editingProperty.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchProperties();
      }
    } else {
      // Create
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchProperties();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteId(null);
      fetchProperties();
    }
  };

  if (user?.role !== "admin") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">
            Only administrators can manage properties.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROPERTY_STATUSES.map((status) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{status}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary[status] || 0}
                  </p>
                </div>
                <Badge className={statusColors[status]}>{status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {PROPERTY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          className="bg-brand hover:bg-brand-dark"
          onClick={openCreateDialog}
        >
          <Plus className="mr-1 h-3 w-3" /> Add Property
        </Button>
      </div>

      {/* Property Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-40 rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Home className="h-10 w-10 text-gray-300" />
            <p className="mt-2 text-gray-500">No properties found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-brand-muted to-steel-light flex items-center justify-center">
                <span className="text-4xl">
                  {typeIcons[property.type] || "🏠"}
                </span>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {property.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={`text-xs mt-1 ${statusColors[property.status]}`}
                    >
                      {property.status}
                    </Badge>
                  </div>
                  <Badge variant="outline">{property.type}</Badge>
                </div>

                {property.location && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {property.location}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  {property.price && (
                    <span className="font-medium text-gray-700">
                      ₹{property.price.toLocaleString()}
                    </span>
                  )}
                  {property.size && <span>{property.size}</span>}
                  {property.bedrooms && (
                    <span className="flex items-center gap-0.5">
                      <BedDouble className="h-3 w-3" /> {property.bedrooms}
                    </span>
                  )}
                  {property.bathrooms && (
                    <span className="flex items-center gap-0.5">
                      <Bath className="h-3 w-3" /> {property.bathrooms}
                    </span>
                  )}
                </div>

                {property.project && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <Building2 className="h-3 w-3" />
                    {property.project.name}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openEditDialog(property)}
                  >
                    <Edit className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700"
                    onClick={() => setDeleteId(property.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProperty ? "Edit Property" : "Add Property"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Property name"
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="Location"
                />
              </div>
              <div className="space-y-1">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="Price"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Size</Label>
                <Input
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder="e.g. 1200 sqft"
                />
              </div>
              <div className="space-y-1">
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  value={form.bedrooms}
                  onChange={(e) =>
                    setForm({ ...form, bedrooms: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Bathrooms</Label>
                <Input
                  type="number"
                  value={form.bathrooms}
                  onChange={(e) =>
                    setForm({ ...form, bathrooms: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Project</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No project" />
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
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <Button
              onClick={handleSave}
              className="w-full bg-brand hover:bg-brand-dark"
              disabled={!form.name}
            >
              {editingProperty ? "Update Property" : "Add Property"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this property?
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
