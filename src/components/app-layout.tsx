"use client";

import { useState } from "react";
import { useAppStore, type AppPage, isAdminRole } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
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
  ChevronDown,
  Sun,
  Moon,
  FileSpreadsheet,
  Radio,
  Mail,
} from "lucide-react";

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ElementType;
  roles?: string[];
  children?: { id: AppPage; label: string; icon: React.ElementType; roles?: string[] }[];
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "lead-import", label: "Import Leads", icon: ChevronRight, roles: ["admin", "super_admin"] },
  { id: "site-visits", label: "Site Visits", icon: MapPin },
  { id: "bookings", label: "Bookings", icon: Building2 },
  { id: "projects", label: "Projects", icon: Home, roles: ["admin", "super_admin"] },
  { id: "lead-sources", label: "Lead Sources", icon: Radio, roles: ["admin", "super_admin"] },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["admin", "super_admin"],
    children: [
      { id: "leads-report", label: "Leads Report", icon: FileSpreadsheet, roles: ["admin", "super_admin"] },
      { id: "user-report", label: "User Report", icon: Users, roles: ["admin", "super_admin"] },
    ],
  },
  { id: "users", label: "User Management", icon: UserCog, roles: ["admin", "super_admin"] },
  { id: "enquiries", label: "Enquiries", icon: Mail, roles: ["super_admin"] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, currentPage, setPage, logout, sidebarOpen, setSidebarOpen } =
    useAppStore();
  const { theme, setTheme } = useTheme();
  const [reportsOpen, setReportsOpen] = useState(false);

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "")
  );

  // Filter children based on roles too
  const filteredNavItemsWithChildren = filteredNavItems.map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(
          (child) => !child.roles || child.roles.includes(user?.role || "")
        ),
      };
    }
    return item;
  });

  // Check if Reports or its children are active
  const isReportsActive = currentPage === "reports" || currentPage === "leads-report" || currentPage === "user-report";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const roleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
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
      case "super_admin":
        return "bg-brand text-white";
      case "admin":
        return "bg-steel-dark text-steel-light";
      case "telecalling":
        return "bg-amber-900 text-amber-300";
      case "sales":
        return "bg-sky-900 text-sky-300";
      default:
        return "bg-gray-700 text-gray-300";
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case "dashboard": return "Dashboard";
      case "leads": return "Lead Management";
      case "lead-detail": return "Lead Details";
      case "lead-import": return "Import Leads";
      case "projects": return "Projects";
      case "lead-sources": return "Lead Sources";
      case "site-visits": return "Site Visits";
      case "bookings": return "Bookings";
      case "reports": return "Reports";
      case "leads-report": return "Leads Report";
      case "user-report": return "User Report";
      case "users": return "User Management";
      case "enquiries": return "Enquiries";
      default: return "Dashboard";
    }
  };

  return (
    <div className="flex h-screen bg-background">
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
          <img src="/logo.png" alt="Leads Dekho" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-lg font-bold text-white">Leads Dekho</span>
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
            {filteredNavItemsWithChildren.map((item) => {
              // Check if item has children (Reports group)
              if (item.children && item.children.length > 0) {
                return (
                  <div key={item.id}>
                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          setPage(item.id);
                          setReportsOpen(true);
                          setSidebarOpen(false);
                        }}
                        className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          currentPage === item.id
                            ? "bg-brand text-white"
                            : isReportsActive
                              ? "bg-brand/20 text-brand"
                              : "text-gray-300 hover:bg-gray-800 hover:text-white"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                      <button
                        onClick={() => setReportsOpen(!reportsOpen)}
                        className={`flex items-center justify-center rounded-lg px-2 py-2.5 text-sm transition-colors ${
                          isReportsActive
                            ? "text-brand hover:bg-gray-800"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        }`}
                      >
                        {reportsOpen || isReportsActive ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {(reportsOpen || isReportsActive) && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => {
                          const isChildActive = currentPage === child.id;
                          return (
                            <button
                              key={child.id}
                              onClick={() => {
                                setPage(child.id);
                                setSidebarOpen(false);
                              }}
                              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                isChildActive
                                  ? "bg-brand text-white"
                                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                              }`}
                            >
                              <child.icon className="h-4 w-4" />
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

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
                      ? "bg-brand text-white"
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
              <AvatarFallback className="bg-brand text-white text-xs font-semibold">
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

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start text-gray-400 hover:text-red-400 hover:bg-gray-800"
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
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground flex-1">
            {getPageTitle()}
          </h1>
          {/* Header theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
