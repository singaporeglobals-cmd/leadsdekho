"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import { blogPosts } from "@/lib/blog-posts";
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
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Zap,
  Database,
  Workflow,
} from "lucide-react";

export function LandingPage() {
  const { setPage, setSelectedBlogSlug } = useAppStore();
  const [contactOpen, setContactOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const openBlog = () => {
    setPage("blog");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  const openPost = (slug: string) => {
    setSelectedBlogSlug(slug);
    setPage("blog-detail");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  // Show only the 6 most recent posts on the landing page
  const recentPosts = [...blogPosts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div className={darkMode ? "dark" : ""}>
    <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-steel-light dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 lg:px-12 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Leads Dekho" className="h-9 w-9 rounded-lg object-cover" />
          <span className="text-xl font-bold text-foreground">Leads Dekho</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={() => {
              const el = document.getElementById("features");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Features
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("dashboard");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </button>
          <button
            onClick={openBlog}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Blog
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("contact");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Contact
          </button>
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
      <section className="px-6 py-16 lg:px-12 lg:py-24 relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl text-center">
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
            analytics. Built in India, for Indian property businesses.
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

          {/* Quick badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              MagicBricks & Housing.com ready
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Setup in 7 days
            </span>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard" className="px-6 py-16 lg:px-12 lg:py-24 bg-card/60 border-y border-border">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-muted px-4 py-1.5 text-sm font-medium text-brand-dark">
              <Zap className="h-4 w-4" />
              Built for Operators
            </div>
            <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
              A Dashboard Your Team Will Actually Use
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three screenshots from the Leads Dekho Real Estate CRM —
              the dashboard, lead management, and reports. No clutter, no
              confusing menus, just the tools your team needs to close deals.
            </p>
          </div>

          {/* Dashboard screenshots grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                src: "/dashboard-1.png",
                title: "Smart Dashboard",
                desc: "Fresh leads, follow-ups, and site visits — all on one screen. Red alerts for leads that have not been called within 30 minutes.",
                label: "Admin Dashboard",
              },
              {
                src: "/dashboard-2.png",
                title: "Lead Management",
                desc: "Filter by user, project, source, or status. Inline feedback buttons, quick assignment, and full timeline history per lead.",
                label: "Leads Page",
              },
              {
                src: "/dashboard-3.png",
                title: "Reports & Analytics",
                desc: "Daily, monthly, source-wise, project-wise, and user-wise reports. Export to CSV in one click for stakeholder reviews.",
                label: "Reports Page",
              },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="border-border bg-background overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover object-top"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    {item.label}
                  </span>
                </div>
                <CardContent className="p-5">
                  <h3 className="mb-2 text-lg font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA below dashboards */}
          <div className="mt-12 text-center">
            <Button
              size="lg"
              onClick={() => setPage("login")}
              className="bg-brand hover:bg-brand-dark text-white"
            >
              Try the Dashboard Yourself
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="px-6 py-12 lg:px-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "500+", label: "Active Teams" },
            { value: "50K+", label: "Leads Managed" },
            { value: "35%", label: "Higher Conversion" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-extrabold text-brand lg:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-muted px-4 py-1.5 text-sm font-medium text-brand-dark">
              <Workflow className="h-4 w-4" />
              Everything in One Place
            </div>
            <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
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
              {
                icon: Database,
                title: "MagicBricks & Housing Integration",
                desc: "Webhooks for automatic lead capture from MagicBricks, Housing.com, Facebook Ads, and more.",
                color: "indigo",
              },
              {
                icon: Phone,
                title: "WhatsApp Ready",
                desc: "Quick-action WhatsApp templates, call-logging, and complete activity timeline per lead.",
                color: "green",
              },
              {
                icon: TrendingUp,
                title: "Source-wise ROI Reports",
                desc: "See exactly which lead sources convert best, so you can spend your marketing budget wisely.",
                color: "orange",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="border-border bg-card/80 transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-${feature.color}-100 dark:bg-${feature.color}-950`}
                  >
                    <feature.icon
                      className={`h-6 w-6 text-${feature.color}-600 dark:text-${feature.color}-400`}
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
      <section className="bg-card px-6 py-16 lg:px-12 lg:py-24 border-y border-border">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="text-muted-foreground">Get started in minutes</p>
          </div>
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Capture Leads",
                desc: "Add leads manually, import via CSV, or capture from multiple sources like MagicBricks, Housing.com, and Facebook Ads. Auto-assign to team members.",
              },
              {
                step: "2",
                title: "Nurture & Track",
                desc: "Log calls, schedule follow-ups, and track site visits. Every interaction is recorded in the timeline so nothing falls through the cracks.",
              },
              {
                step: "3",
                title: "Close Deals",
                desc: "Move leads through your pipeline. Get insights on conversion rates and team performance. Export reports for stakeholders in one click.",
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

      {/* Blog Section */}
      <section id="blog" className="px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-muted px-4 py-1.5 text-sm font-medium text-brand-dark">
                <Database className="h-4 w-4" />
                Insights & Strategy
              </div>
              <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
                From the Leads Dekho Blog
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                Real-world strategies, integration guides, and operator stories
                about running a Real Estate CRM that actually converts.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={openBlog}
              className="shrink-0"
            >
              View All Articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((post) => (
              <Card
                key={post.slug}
                className="border-border bg-card/80 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden"
                onClick={() => openPost(post.slug)}
              >
                <div
                  className={`h-36 bg-gradient-to-br ${post.image} flex items-end p-4`}
                >
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800">
                    {post.category}
                  </span>
                </div>
                <CardContent className="p-5">
                  <h3 className="mb-2 text-base font-bold text-foreground line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button
              variant="ghost"
              onClick={openBlog}
              className="text-brand hover:text-brand-dark"
            >
              Read all 15 articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Contact / CTA Section */}
      <section id="contact" className="bg-brand px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to Transform Your Sales Process?
          </h2>
          <p className="mb-8 text-white/80">
            Join hundreds of real estate teams already using Leads Dekho to close
            more deals. Talk to us today.
          </p>

          <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <a
              href="mailto:contact@leadsdekho.in"
              className="flex items-center gap-2 text-white hover:text-white/80 transition"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Mail className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium">contact@leadsdekho.in</span>
            </a>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setContactOpen(true)}
              className="bg-white text-brand-dark hover:bg-gray-100 px-8"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setPage("login")}
              className="border-white text-white hover:bg-white/10 px-8"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.png" alt="Leads Dekho" className="h-7 w-7 rounded-md object-cover" />
                <span className="font-semibold text-foreground">Leads Dekho</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A Real Estate CRM built in India, for Indian property businesses.
                Capture leads from MagicBricks, Housing.com, and Facebook Ads —
                all in one pipeline.
              </p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button
                    onClick={() => {
                      const el = document.getElementById("features");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="hover:text-brand"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      const el = document.getElementById("dashboard");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="hover:text-brand"
                  >
                    Dashboard
                  </button>
                </li>
                <li>
                  <button onClick={() => setPage("login")} className="hover:text-brand">
                    Sign In
                  </button>
                </li>
                <li>
                  <button onClick={() => setContactOpen(true)} className="hover:text-brand">
                    Get Started
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-foreground">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button onClick={openBlog} className="hover:text-brand">
                    Blog
                  </button>
                </li>
                <li>
                  <a href="mailto:contact@leadsdekho.in" className="hover:text-brand flex items-center gap-1">
                    <Mail className="h-3 w-3" /> contact@leadsdekho.in
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Leads Dekho. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="mailto:contact@leadsdekho.in" className="hover:text-brand">
                contact@leadsdekho.in
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Form Dialog */}
      <ContactFormDialog open={contactOpen} onOpenChange={setContactOpen} />
    </div>
    </div>
  );
}
