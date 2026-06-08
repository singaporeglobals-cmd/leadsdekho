"use client";

import { useAppStore, type AppPage } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  MapPin,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "lead-import", label: "Import Leads", icon: ChevronRight },
  { id: "site-visits", label: "Site Visits", icon: MapPin },
  { id: "properties", label: "Properties", icon: Home, roles: ["admin"] },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "users", label: "User Management", icon: UserCog, roles: ["admin"] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, currentPage, setPage, logout, sidebarOpen, setSidebarOpen } =
    useAppStore();

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "")
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "telecalling":
        return "Telecalling";
      case "sales":
        return "Sales";
      default:
        return role;
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-emerald-900 text-emerald-300";
      case "telecalling":
        return "bg-amber-900 text-amber-300";
      case "sales":
        return "bg-sky-900 text-sky-300";
      default:
        return "bg-gray-700 text-gray-300";
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gray-900 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-700 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-white">CRM Pro</span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setPage(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-gray-700" />

        {/* User info */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">
                {user ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-white">
                {user?.name}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${roleColor(
                    user?.role || ""
                  )}`}
                >
                  {roleLabel(user?.role || "")}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start text-gray-400 hover:text-red-400 hover:bg-gray-800"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {currentPage === "dashboard" && "Dashboard"}
            {currentPage === "leads" && "Lead Management"}
            {currentPage === "lead-detail" && "Lead Details"}
            {currentPage === "lead-import" && "Import Leads"}
            {currentPage === "properties" && "Property Management"}
            {currentPage === "site-visits" && "Site Visits"}
            {currentPage === "reports" && "Reports"}
            {currentPage === "users" && "User Management"}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
