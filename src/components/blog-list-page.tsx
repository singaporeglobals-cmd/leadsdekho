"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { blogPosts, getAllCategories } from "@/lib/blog-posts";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Search,
  Mail,
  Phone,
} from "lucide-react";

export function BlogListPage() {
  const { setPage, setSelectedBlogSlug } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const categories = ["All", ...getAllCategories()];

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "All" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const openPost = (slug: string) => {
    setSelectedBlogSlug(slug);
    setPage("blog-detail");
    // Scroll to top when navigating to detail
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  const backToHome = () => {
    setPage("landing");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-steel-light">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12 border-b border-border bg-card/60 backdrop-blur">
        <button
          onClick={backToHome}
          className="flex items-center gap-2 text-foreground hover:text-brand transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-semibold">Back to Home</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Leads Dekho" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-foreground">Leads Dekho Blog</span>
        </div>
        <Button
          variant="outline"
          onClick={() => setPage("login")}
          className="hidden sm:inline-flex"
        >
          Sign In
        </Button>
      </nav>

      {/* Header */}
      <section className="px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-muted px-4 py-1.5 text-sm font-medium text-brand-dark">
            Insights for Real Estate Teams
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            The Leads Dekho <span className="text-brand">Blog</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Real-world strategies, integration guides, and operator stories
            about running a Real Estate CRM that actually converts. Written by
            the PSC Tech Solutions team.
          </p>

          {/* Search */}
          <div className="mx-auto max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Category filter */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  activeCategory === cat
                    ? "bg-brand text-white"
                    : "bg-card text-muted-foreground hover:bg-brand-muted hover:text-brand-dark"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="px-6 pb-16 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No articles found. Try a different search or category.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <Card
                  key={post.slug}
                  className="border-border bg-card/80 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden"
                  onClick={() => openPost(post.slug)}
                >
                  {/* Image header (gradient) */}
                  <div
                    className={`h-40 bg-gradient-to-br ${post.image} flex items-end p-4`}
                  >
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800">
                      {post.category}
                    </span>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="mb-2 text-lg font-bold text-foreground line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted px-6 py-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src="/logo.png" alt="Leads Dekho" className="h-7 w-7 rounded-md object-cover" />
                <span className="font-semibold text-foreground">Leads Dekho</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A Real Estate CRM built in India, for Indian property businesses.
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-foreground">Contact</h4>
              <a
                href="mailto:contact@leadsdekho.in"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
              >
                <Mail className="h-4 w-4" />
                contact@leadsdekho.in
              </a>
              <a
                href="tel:7605804832"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
              >
                <Phone className="h-4 w-4" />
                7605804832
              </a>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-foreground">Developed by</h4>
              <p className="text-sm font-medium text-foreground">PSC TECH SOLUTIONS</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Leads Dekho · PSC Tech Solutions. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
