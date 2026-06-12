"use client";

import { useEffect } from "react";
import { useAppStore, type AppPage } from "@/lib/store";
import { LandingPage } from "@/components/landing-page";
import { LoginPage } from "@/components/login-page";
import { AppLayout } from "@/components/app-layout";
import {
  AdminDashboard,
  TelecallingDashboard,
  SalesDashboard,
} from "@/components/dashboard";
import { LeadList } from "@/components/lead-list";
import { LeadDetail } from "@/components/lead-detail";
import { LeadImport } from "@/components/lead-import";
import { ProjectManagement } from "@/components/project-management";
import { SiteVisitModule } from "@/components/site-visit-module";
import { BookingsPage } from "@/components/bookings-page";
import { ReportsPage } from "@/components/reports-page";
import { UserManagement } from "@/components/user-management";

export default function Home() {
  const { currentPage, isAuthenticated, isLoading, checkAuth } = useAppStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated pages
  if (!isAuthenticated) {
    switch (currentPage) {
      case "login":
        return <LoginPage />;
      default:
        return <LandingPage />;
    }
  }

  // Authenticated pages
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": {
        const role = useAppStore.getState().user?.role;
        if (role === "admin") return <AdminDashboard />;
        if (role === "telecalling") return <TelecallingDashboard />;
        if (role === "sales") return <SalesDashboard />;
        return <AdminDashboard />;
      }
      case "leads":
        return <LeadList />;
      case "lead-detail":
        return <LeadDetail />;
      case "lead-import":
        return <LeadImport />;
      case "projects":
        return <ProjectManagement />;
      case "site-visits":
        return <SiteVisitModule />;
      case "bookings":
        return <BookingsPage />;
      case "reports":
        return <ReportsPage />;
      case "users":
        return <UserManagement />;
      default:
        return <AdminDashboard />;
    }
  };

  return <AppLayout>{renderPage()}</AppLayout>;
}
