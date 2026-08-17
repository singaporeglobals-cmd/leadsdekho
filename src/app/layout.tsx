import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://leadsdekho.in";
const SITE_NAME = "Leads Dekho";
const SITE_TAGLINE = "Real Estate CRM";
const SITE_DESCRIPTION =
  "Leads Dekho is a Real Estate CRM built in India for property brokers, builders, and sales teams. Capture leads from MagicBricks, Housing.com, and walk-ins, auto-assign them to your telecalling and sales team, track site visits and follow-ups, and close more deals with powerful analytics.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE} | Manage Leads, Site Visits & Bookings`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  keywords: [
    "Leads Dekho",
    "LeadsDekho",
    "Real Estate CRM",
    "CRM for Real Estate India",
    "Property CRM",
    "Real Estate Lead Management",
    "MagicBricks CRM",
    "Housing.com CRM",
    "Telecalling CRM",
    "Site Visit Tracking",
    "Real Estate Sales Software",
    "Property Broker Software",
    "Builder CRM India",
    "Lead Distribution Software",
    "Real Estate Analytics",
  ],
  authors: [{ name: "Leads Dekho", url: SITE_URL }],
  creator: "Leads Dekho",
  publisher: "Leads Dekho",
  category: "Real Estate Software",
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Favicons are auto-detected by Next.js from src/app/icon.png and
  // src/app/apple-icon.png (app router convention). No manual icons
  // config needed — Next.js injects the correct <link rel="icon"> tags.
  icons: {
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - ${SITE_TAGLINE} Built for Indian Property Businesses`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Leads Dekho - Real Estate CRM Dashboard",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@leadsdekho",
  },
  // NOTE: After the user verifies leadsdekho.in in Google Search Console,
  // we can add the `verification: { google: "<code>" }` field back here.
  // Until then, ownership is best verified via DNS TXT record at the registrar.
  other: {
    "theme-color": "#0F4C81",
    "msapplication-TileColor": "#0F4C81",
  },
};

// JSON-LD structured data — helps Google understand the brand & product
const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Leads Dekho",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: SITE_DESCRIPTION,
  email: "contact@leadsdekho.in",
  foundingDate: "2024",
  founders: [{ "@type": "Organization", name: "Leads Dekho" }],
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "contact@leadsdekho.in",
      availableLanguage: ["English", "Hindi", "Bengali"],
    },
  ],
  sameAs: [SITE_URL],
};

const jsonLdSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Leads Dekho",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "CRM",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Free trial available. No credit card required.",
  },
  publisher: {
    "@type": "Organization",
    name: "Leads Dekho",
    email: "contact@leadsdekho.in",
  },
  featureList: [
    "Lead capture from MagicBricks & Housing.com",
    "Auto lead distribution to telecalling & sales teams",
    "Site visit scheduling & tracking",
    "Follow-up reminders with 30-minute SLA alerts",
    "Daily, monthly, source-wise, project-wise reports",
    "CSV import & export",
    "Role-based access control (admin, telecalling, sales)",
    "Lead timeline & call logs",
    "Bookings & revenue tracking",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "120",
    reviewCount: "120",
  },
};

const jsonLdWebsite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Leads Dekho",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "Leads Dekho",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data — visible to Googlebot */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdOrganization),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        {/* SEO fallback: crawlers that don't execute JS still see rich content */}
        <noscript>
          <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
            <h1>Leads Dekho - Real Estate CRM</h1>
            <p>
              Leads Dekho is a Real Estate CRM built in India for property
              brokers, builders, and sales teams. From first call to closed
              deal, manage your entire real estate sales pipeline with
              intelligent tracking, team collaboration, and powerful analytics.
            </p>
            <h2>Key Features</h2>
            <ul>
              <li>
                Lead capture from MagicBricks, Housing.com, and walk-ins
              </li>
              <li>Automatic lead distribution to telecalling and sales teams</li>
              <li>Site visit scheduling and tracking</li>
              <li>Follow-up reminders with 30-minute SLA alerts</li>
              <li>Daily, monthly, source-wise, project-wise reports</li>
              <li>CSV import and export</li>
              <li>Role-based access control (admin, telecalling, sales)</li>
              <li>Lead timeline and call logs</li>
              <li>Bookings and revenue tracking</li>
            </ul>
            <h2>Why Real Estate Teams Choose Leads Dekho</h2>
            <p>
              Built in India for Indian property businesses, Leads Dekho helps
              brokers and builders convert more leads into bookings. Capture
              leads from portals like MagicBricks and Housing.com, auto-assign
              them to your team, and never miss a follow-up again.
            </p>
            <h2>Contact</h2>
            <p>
              Email: <a href="mailto:contact@leadsdekho.in">contact@leadsdekho.in</a>
              <br />
              Website: <a href="https://leadsdekho.in">leadsdekho.in</a>
            </p>
            <h2>Real Estate CRM Blog</h2>
            <p>
              Read our latest articles on Real Estate CRM strategy, lead
              management, telecalling productivity, MagicBricks &amp; Housing.com
              integrations, and more on the Leads Dekho blog.
            </p>
          </div>
        </noscript>
      </body>
    </html>
  );
}
