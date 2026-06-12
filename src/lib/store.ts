"use client";

import { create } from "zustand";
import { signIn, signOut } from "next-auth/react";

export type AppPage =
  | "landing"
  | "login"
  | "dashboard"
  | "leads"
  | "lead-detail"
  | "lead-import"
  | "projects"
  | "site-visits"
  | "reports"
  | "users";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AppState {
  // Auth
  currentPage: AppPage;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Selected items
  selectedLeadId: string | null;

  // Sidebar
  sidebarOpen: boolean;

  // Actions
  setPage: (page: AppPage) => void;
  setUser: (user: UserInfo | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setSelectedLeadId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: "landing",
  user: null,
  isAuthenticated: false,
  isLoading: true,
  selectedLeadId: null,
  sidebarOpen: true,

  setPage: (page) => set({ currentPage: page }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  login: async (email, password) => {
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.ok) {
        // Fetch session to get user info
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user) {
          const userInfo: UserInfo = {
            id: (session.user as { id?: string }).id || "",
            email: session.user.email || "",
            name: session.user.name || "",
            role: (session.user as { role?: string }).role || "telecalling",
          };
          set({ user: userInfo, isAuthenticated: true, currentPage: "dashboard" });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // ignore
    }
    set({ user: null, isAuthenticated: false, currentPage: "landing", selectedLeadId: null });
  },

  checkAuth: async () => {
    try {
      const res = await fetch("/api/auth/session");
      const session = await res.json();

      if (session?.user) {
        const userInfo: UserInfo = {
          id: (session.user as { id?: string }).id || "",
          email: session.user.email || "",
          name: session.user.name || "",
          role: (session.user as { role?: string }).role || "telecalling",
        };
        set({ user: userInfo, isAuthenticated: true, currentPage: "dashboard", isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, currentPage: "landing", isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
