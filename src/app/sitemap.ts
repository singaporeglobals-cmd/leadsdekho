import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-posts";

const SITE_URL = "https://leadsdekho.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static top-level pages (the landing page is the only public route;
  // blog listing + blog detail are rendered client-side, but we still
  // surface them as separate URLs so Google indexes them as distinct pages)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/#features`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/#dashboard`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/#contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // One entry per blog post — these are the pages most likely to rank
  // for long-tail real estate CRM queries.
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages];
}
