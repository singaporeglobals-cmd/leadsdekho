"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import {
  Users,
  TrendingUp,
  Phone,
  BarChart3,
  Shield,
  ArrowRight,
  MapPin,
  Target,
  Sun,
  Moon,
  Building2,
} from "lucide-react";

export function LandingPage() {
  const { setPage } = useAppStore();
  const [contactOpen, setContactOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className={darkMode ? "dark" : ""}>
    <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-steel-light dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Leads Dekho" className="h-9 w-9 rounded-lg object-cover" />
          <span className="text-xl font-bold text-foreground">Leads Dekho</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="h-9 w-9"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPage("login")}
            className="text-muted-foreground hover:text-foreground"
          >
            Sign In
          </Button>
          <Button
            onClick={() => setContactOpen(true)}
            className="bg-brand hover:bg-brand-dark text-white"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-muted px-4 py-1.5 text-sm font-medium text-brand-dark dark:text-brand">
            <Target className="h-4 w-4" />
            CRM Built for Growth
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Close More Deals with
            <span className="text-brand"> Smart Lead Management</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            From first call to closed deal — manage your entire real estate sales
            pipeline with intelligent tracking, team collaboration, and powerful
            analytics.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => setContactOpen(true)}
              className="bg-brand px-8 text-base hover:bg-brand-dark"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 text-base"
              onClick={() => {
                const el = document.getElementById("features");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See Features
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card/80 px-6 py-8 lg:px-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "500+", label: "Active Teams" },
            { value: "50K+", label: "Leads Managed" },
            { value: "35%", label: "Higher Conversion" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-brand lg:text-3xl">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              Everything You Need to Close Deals
            </h2>
            <p className="text-muted-foreground">
              Purpose-built features for real estate sales teams
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Lead Management",
                desc: "Track every lead from first contact to close with intelligent pipeline stages and role-based access.",
                color: "emerald",
              },
              {
                icon: Phone,
                title: "Quick Feedback",
                desc: "Log calls and feedback instantly. Quick assign leads while logging — no context switching.",
                color: "teal",
              },
              {
                icon: MapPin,
                title: "Site Visit Tracking",
                desc: "Schedule and track site visits with status updates and feedback collection.",
                color: "amber",
              },
              {
                icon: Building2,
                title: "Project Management",
                desc: "Manage your projects with add/delete functionality. Admin-only project management.",
                color: "violet",
              },
              {
                icon: BarChart3,
                title: "Reports & Analytics",
                desc: "Daily and monthly reports with export capabilities. Track team performance and conversion rates.",
                color: "rose",
              },
              {
                icon: Shield,
                title: "Role-Based Access",
                desc: "Admin, Telecalling, and Sales roles with granular permissions to protect your data.",
                color: "sky",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="border-border bg-card/80 transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-${feature.color}-100`}
                  >
                    <feature.icon
                      className={`h-6 w-6 text-${feature.color}-600`}
                    />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-card px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              How It Works
            </h2>
            <p className="text-muted-foreground">Get started in minutes</p>
          </div>
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Capture Leads",
                desc: "Add leads manually, import via CSV, or capture from multiple sources. Auto-assign to team members.",
              },
              {
                step: "2",
                title: "Nurture & Track",
                desc: "Log calls, schedule follow-ups, and track site visits. Every interaction is recorded in the timeline.",
              },
              {
                step: "3",
                title: "Close Deals",
                desc: "Move leads through your pipeline. Get insights on conversion rates and team performance.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-brand px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to Transform Your Sales Process?
          </h2>
          <p className="mb-8 text-white/80">
            Join hundreds of real estate teams already using Leads Dekho to close
            more deals.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setContactOpen(true)}
            className="bg-white text-brand-dark hover:bg-gray-100 px-8"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Leads Dekho" className="h-7 w-7 rounded-md object-cover" />
            <span className="font-semibold text-foreground">Leads Dekho</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Developed By Matrik Saha
          </div>
        </div>
      </footer>

      {/* Contact Form Dialog */}
      <ContactFormDialog open={contactOpen} onOpenChange={setContactOpen} />
    </div>
    </div>
  );
}
