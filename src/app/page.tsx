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
import { PropertyManagement } from "@/components/property-management";
import { SiteVisitModule } from "@/components/site-visit-module";
import { ReportsPage } from "@/components/reports-page";
import { UserManagement } from "@/components/user-management";

export default function Home() {
  const { currentPage, isAuthenticated, isLoading, checkAuth } = useAppStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto"></div>
          <p className="text-sm text-gray-500">Loading...</p>
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
      case "properties":
        return <PropertyManagement />;
      case "site-visits":
        return <SiteVisitModule />;
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
