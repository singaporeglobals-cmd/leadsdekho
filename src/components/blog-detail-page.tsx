"use client";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { getBlogPost, blogPosts } from "@/lib/blog-posts";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Mail,
  Phone,
  User,
} from "lucide-react";

export function BlogDetailPage() {
  const { selectedBlogSlug, setPage, setSelectedBlogSlug } = useAppStore();

  const post = getBlogPost(selectedBlogSlug || "");

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Article not found
          </h1>
          <p className="text-muted-foreground mb-4">
            The article you are looking for does not exist.
          </p>
          <Button
            onClick={() => {
              setSelectedBlogSlug(null);
              setPage("blog");
              if (typeof window !== "undefined") window.scrollTo(0, 0);
            }}
          >
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  // Get up to 3 related posts (different slug, same category first, then any)
  const related = blogPosts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      const aMatch = a.category === post.category ? -1 : 0;
      const bMatch = b.category === post.category ? 1 : 0;
      return aMatch + bMatch;
    })
    .slice(0, 3);

  const backToBlog = () => {
    setSelectedBlogSlug(null);
    setPage("blog");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  const backToHome = () => {
    setSelectedBlogSlug(null);
    setPage("landing");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  const openPost = (slug: string) => {
    setSelectedBlogSlug(slug);
    setPage("blog-detail");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 lg:px-12 border-b border-border bg-background/95 backdrop-blur">
        <button
          onClick={backToBlog}
          className="flex items-center gap-2 text-foreground hover:text-brand transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-semibold">All Articles</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Leads Dekho" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-foreground hidden sm:inline">Leads Dekho</span>
        </div>
        <Button
          onClick={backToHome}
          variant="outline"
          className="hidden sm:inline-flex"
        >
          Home
        </Button>
      </nav>

      {/* Article header */}
      <article className="px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <span className="inline-flex items-center rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand-dark">
              {post.category}
            </span>
          </div>
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <p className="mb-6 text-lg text-muted-foreground">{post.excerpt}</p>
          <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(post.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>

          {/* Hero gradient banner */}
          <div
            className={`mb-10 h-48 sm:h-64 rounded-2xl bg-gradient-to-br ${post.image} flex items-center justify-center`}
          >
            <span className="text-white/90 text-sm font-semibold uppercase tracking-wider px-4 text-center">
              Leads Dekho · Real Estate CRM
            </span>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {post.content.map((paragraph, idx) => (
              <p
                key={idx}
                className="mb-5 text-base leading-relaxed text-foreground/90"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* CTA at end of article */}
          <div className="mt-12 rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">
              Ready to try Leads Dekho?
            </h2>
            <p className="mb-6 text-white/80">
              The Real Estate CRM built for Indian property businesses. Start
              your free trial today.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setPage("login")}
                className="bg-white text-brand-dark hover:bg-gray-100"
              >
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={backToHome}
                className="border-white text-white hover:bg-white/10"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="border-t border-border bg-muted/50 px-6 py-12 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              More from Leads Dekho
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rp) => (
                <div
                  key={rp.slug}
                  onClick={() => openPost(rp.slug)}
                  className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div
                    className={`mb-3 h-24 rounded-lg bg-gradient-to-br ${rp.image}`}
                  />
                  <span className="text-xs font-semibold text-brand">
                    {rp.category}
                  </span>
                  <h3 className="mb-2 mt-1 text-base font-bold text-foreground line-clamp-2">
                    {rp.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {rp.excerpt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
