/**
 * Blog Posts Data
 * ---------------
 * 15 blog posts about Real Estate CRM and Leads Dekho.
 * Each post mentions both "Real Estate CRM" and "Leads Dekho".
 *
 * Posts are stored as a static array (no DB needed) and served
 * by the /blog and /blog/[slug] routes.
 */

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string; // ISO yyyy-mm-dd
  readTime: string;
  image: string; // gradient style or image path
  content: string[]; // array of paragraph strings (each paragraph rendered as <p>)
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-real-estate-crm-is-essential-in-2026",
    title: "Why a Real Estate CRM Is Essential for Property Businesses in 2026",
    excerpt:
      "Spreadsheets and WhatsApp groups no longer cut it. Here is why every serious real estate team in India is moving to a dedicated Real Estate CRM like Leads Dekho.",
    category: "Industry",
    author: "PSC Tech Solutions",
    date: "2026-07-28",
    readTime: "6 min read",
    image: "from-amber-500 to-orange-600",
    content: [
      "The Indian real estate market in 2026 is more competitive than it has ever been. Buyers are smarter, brokers are faster, and lead sources like MagicBricks, Housing.com, and Facebook Ads are pumping in dozens of enquiries every single day. If your team is still managing leads in an Excel sheet or a WhatsApp group, you are losing deals — not because your agents are bad, but because the system itself is broken.",
      "A Real Estate CRM solves this problem at its root. It captures every lead from every source into one centralized pipeline, assigns them to the right agent automatically, and tracks every call, follow-up, and site visit in a single timeline. Instead of asking 'who is handling this lead?' on a group chat, your managers can simply open the CRM and see the answer in seconds.",
      "Leads Dekho was built specifically for this reality. As a Real Estate CRM designed for Indian property businesses, it understands that a lead from MagicBricks needs different handling than a walk-in at a project site. It understands that telecallers need quick feedback buttons, sales executives need site-visit scheduling, and admins need conversion reports that actually make sense.",
      "The numbers speak for themselves. Teams that move from spreadsheets to a Real Estate CRM typically see a 30–40% improvement in conversion rates within the first three months. They are not working harder — they are working with a system that prevents leads from falling through the cracks. A lead that comes in at 9:47 PM gets logged, assigned, and queued for follow-up the next morning. Nothing is forgotten.",
      "If you are still on the fence, consider this: your competitors who adopted a Real Estate CRM two years ago are now closing more deals with the same headcount. The gap widens every quarter. There has never been a better time to move your team to Leads Dekho — a Real Estate CRM built in India, for Indian real estate.",
    ],
  },
  {
    slug: "lead-distribution-strategy-for-real-estate",
    title: "How to Build a Lead Distribution Strategy That Actually Works",
    excerpt:
      "Round-robin, skill-based, or project-based? Here is how to assign leads in a Real Estate CRM without burning your best agents or starving your new ones.",
    category: "Strategy",
    author: "PSC Tech Solutions",
    date: "2026-07-25",
    readTime: "7 min read",
    image: "from-emerald-500 to-teal-600",
    content: [
      "Lead distribution is the silent killer of real estate conversion rates. Get it wrong and your best agents burn out while new hires sit idle. Get it right and every lead lands with the right person at the right time, every single time. The good news is that a modern Real Estate CRM makes this almost automatic — but only if you set up the rules correctly.",
      "The three most common distribution models are round-robin (each agent gets the next lead in turn), skill-based (the most experienced agent gets the highest-value lead), and project-based (agents specialized in a particular project get all leads for that project). None of them is universally 'best'. The right choice depends on your team size, your project portfolio, and how senior your agents are.",
      "In Leads Dekho, the Real Estate CRM we built at PSC Tech Solutions, lead distribution is role-aware. Telecallers get the first touch — they call the lead, log the feedback, and qualify the prospect. If the lead is hot, it gets assigned to a sales executive who handles the site visit and closing. Admins and super-admins can see the entire flow and reassign leads at any time if an agent is overloaded or unavailable.",
      "A practical tip: never let one agent own more than 40 active leads at a time. Beyond that number, follow-up quality collapses. A Real Estate CRM like Leads Dekho shows you the 'leads per agent' count on the dashboard, so you can rebalance before things go wrong. Some of our most successful clients do a weekly rebalancing meeting — every Monday, they look at the CRM reports and reassign leads that have been sitting untouched for more than 48 hours.",
      "Finally, remember that distribution is not the same as accountability. Distributing a lead to an agent does not mean the agent will follow up. You need both: the right assignment rule, and the right tracking system. That is why the Leads Dekho Real Estate CRM pairs every assignment with a follow-up reminder, a call-log requirement, and a timeline that admins can audit. Distribution gets the lead to the agent. Tracking makes sure the agent actually does the work.",
    ],
  },
  {
    slug: "magicbricks-housing-integration-guide",
    title: "Connecting MagicBricks and Housing.com Leads to Your CRM: A Complete Guide",
    excerpt:
      "Stop copy-pasting lead emails. Here is how to wire MagicBricks, Housing.com, and Facebook Ads straight into your Real Estate CRM so every enquiry lands in one pipeline.",
    category: "Integrations",
    author: "PSC Tech Solutions",
    date: "2026-07-22",
    readTime: "8 min read",
    image: "from-sky-500 to-blue-600",
    content: [
      "If your team is still copying lead details out of MagicBricks email notifications and pasting them into a spreadsheet, you are losing roughly 15% of your leads to human error. Typos in phone numbers, missed emails, duplicate entries — these are not edge cases, they are the daily reality of manual lead capture. The fix is integration: connect your lead sources directly to your Real Estate CRM so every enquiry is captured automatically, instantly, and without typos.",
      "Leads Dekho ships with dedicated webhook endpoints for MagicBricks and Housing.com. When a buyer fills out an enquiry on MagicBricks, MagicBricks sends a payload to your unique Leads Dekho URL, and within seconds the lead appears in the CRM — tagged with the source 'MagicBricks', assigned to the right agent, and ready to be called. The same flow works for Housing.com and for any other portal that supports webhook integration.",
      "Setting this up takes about 10 minutes. Inside Leads Dekho, an admin opens the Portal Leads settings page, copies the unique webhook URL for MagicBricks (for example, https://leadsdekho.in/api/portal-leads/magicbricks), and pastes it into the MagicBricks partner dashboard. From that moment on, every lead is captured automatically. The Real Estate CRM even handles field-name differences — MagicBricks sends PascalCase fields like BuyerName and ContactNo, while Housing.com uses different conventions. Leads Dekho's parser normalizes everything.",
      "For Facebook Ads and Google Ads lead forms, the workflow is slightly different. You connect your ad account to a tool like Zapier or Make, and route the lead through to the generic Leads Dekho webhook (https://leadsdekho.in/api/portal-leads). The Real Estate CRM tags the lead as 'Facebook' or 'Google' based on the source field you pass in. This means your paid ad leads land in the same pipeline as your portal leads — no more juggling two systems.",
      "The biggest win from integration is not speed — it is completeness. Once your Real Estate CRM is wired to every lead source, you can finally answer the question 'which source gives us the best ROI?' with real data. Leads Dekho's reports break down conversion rates, cost-per-lead, and cost-per-booking by source. Most of our clients are surprised to discover that their cheapest source (often a free portal) is also their best-converting one — and they only find this out after integration.",
    ],
  },
  {
    slug: "site-visit-tracking-best-practices",
    title: "Site Visit Tracking: The Metric Most Real Estate Teams Get Wrong",
    excerpt:
      "Site visits are the strongest buying signal in real estate. Yet most teams treat them as an afterthought. Here is how to track them properly in your Real Estate CRM.",
    category: "Sales",
    author: "PSC Tech Solutions",
    date: "2026-07-19",
    readTime: "5 min read",
    image: "from-violet-500 to-purple-600",
    content: [
      "In real estate, a site visit is the single strongest buying signal you will ever get. A lead who agrees to visit a property is roughly 8x more likely to book than one who only talks on the phone. And yet, most real estate teams treat site visits as a casual entry in a notebook — if they track them at all. This is a huge missed opportunity, and a Real Estate CRM exists precisely to fix it.",
      "The right way to track site visits is as a first-class entity, not a free-text note. Every site visit should have a date, a project, a sales executive, a status (scheduled / completed / cancelled / no-show), and a feedback note. When you track visits this way, your Real Estate CRM can answer questions like 'how many of last week's scheduled visits actually happened?' or 'which sales executive has the highest visit-to-booking ratio?' — questions that no spreadsheet can answer without 20 minutes of filtering.",
      "Leads Dekho treats site visits as a dedicated module. When a telecaller or sales executive schedules a visit, it appears on the dashboard of the assigned executive, with a reminder 2 hours before the scheduled time. After the visit, the executive logs feedback — usually a quick dropdown plus a one-line note — and the lead's status automatically updates. If the visit went well, the lead moves to 'Site Visit Done' or 'Prospect'. If it did not, the lead moves to 'Not Interested' with a sub-stage that explains why.",
      "One pattern we see in our highest-converting clients: they treat 'site visit no-show' as a critical event, not a dead end. When a lead does not show up to a scheduled visit, the Real Estate CRM automatically flags the lead for a re-engagement call within 24 hours. Often the lead simply forgot, or got stuck in traffic — and a single follow-up call recovers about 35% of no-shows. Without the CRM tracking this, those leads would just disappear.",
      "If you are running a real estate team and your Real Estate CRM does not have a dedicated site-visit module, you are working with one hand tied behind your back. Leads Dekho ships with this out of the box, and it is one of the features our clients tell us they cannot imagine working without.",
    ],
  },
  {
    slug: "telecalling-team-productivity",
    title: "How to Run a High-Performance Telecalling Team in Real Estate",
    excerpt:
      "Telecallers are the engine of any real estate CRM operation. Here is how to set daily targets, audit call quality, and keep your team productive without micromanaging.",
    category: "Telecalling",
    author: "PSC Tech Solutions",
    date: "2026-07-16",
    readTime: "6 min read",
    image: "from-rose-500 to-pink-600",
    content: [
      "Telecalling is the unglamorous backbone of every real estate business. While sales executives get the glory of closing deals, it is the telecallers who turn raw enquiries into qualified prospects. A good telecalling team can double your conversion rate; a bad one can burn through 500 leads a week with nothing to show for it. The difference, almost always, is the system they work in.",
      "A Real Estate CRM designed for telecallers needs three things: a fast way to log call feedback, a clear view of which leads need to be called today, and an easy way to escalate hot leads to sales. Without these three, telecallers end up spending more time on data entry than on actual calls — which is the most expensive mistake a real estate business can make.",
      "In Leads Dekho, the telecalling dashboard shows three numbers at the top: My Leads, Fresh Leads (not yet called), and Follow-Ups Due Today. These three numbers drive the entire workday. A telecaller logs in, sees 14 fresh leads, and knows exactly what to do. Each call takes about 90 seconds — 60 seconds on the phone, 30 seconds to log feedback via quick dropdown buttons. The Real Estate CRM records the call log, updates the lead status, and schedules the next follow-up automatically.",
      "Daily targets matter, but only if they are realistic. For a full-time telecaller, 60–80 calls per day is the sweet spot. Below 50, productivity is too low. Above 100, call quality collapses and you start burning leads. Leads Dekho's user report shows calls-per-day, calls-per-lead, and follow-up-completion-rate for each telecaller — so managers can spot both underperformers and over-performers (the ones logging fake calls) at a glance.",
      "Finally, do not micromanage. A Real Estate CRM is supposed to replace micromanagement with measurement. Instead of standing behind your telecallers, set the targets, set the audit cadence (we recommend listening to 5 random call recordings per telecaller per week), and let the system surface the patterns. You will be surprised how often the data tells you something your gut did not.",
    ],
  },
  {
    slug: "lead-nurture-sequence-real-estate",
    title: "The 7-Touch Lead Nurture Sequence Every Real Estate Agent Should Steal",
    excerpt:
      "Most leads are not ready to buy on day one. Here is a 7-touch nurture sequence — calls, WhatsApps, and site-visit invitations — built right into a Real Estate CRM.",
    category: "Sales",
    author: "PSC Tech Solutions",
    date: "2026-07-13",
    readTime: "7 min read",
    image: "from-amber-500 to-yellow-600",
    content: [
      "Real estate is not an impulse purchase. A lead who fills out a MagicBricks enquiry form today might book a flat in 3 weeks, 3 months, or 13 months. The job of your sales team is to stay in touch for as long as it takes, without being annoying. This is called lead nurturing, and it follows a well-tested 7-touch sequence that you can automate inside any modern Real Estate CRM.",
      "Touch 1 (Day 0, immediate): The first call within 5 minutes of lead arrival. Conversion rates drop 80% if the first call is delayed beyond 30 minutes. Your Real Estate CRM should ping the assigned telecaller the moment the lead lands.",
      "Touch 2 (Day 1): A WhatsApp message with project brochure and price range. This is a low-friction way to keep the conversation alive without forcing another phone call. Leads Dekho's Real Estate CRM lets you save WhatsApp templates so this takes 10 seconds to send.",
      "Touch 3 (Day 3): A follow-up call to answer questions and gauge intent. The telecaller logs the call outcome in the CRM — Interested / Not Interested / Not Connected / Site Visit Promised — and the lead's pipeline stage updates automatically.",
      "Touch 4 (Day 5): Site visit invitation. If the lead has shown any interest, this is the moment to push for a visit. The Real Estate CRM schedules the visit and sends a calendar invite.",
      "Touch 5 (Day 7): If the lead has not responded, send a 'just checking in' WhatsApp with a single relevant project photo. Do not pushy-sell. Just stay top of mind.",
      "Touch 6 (Day 14): Re-engage with new project launch or price update. This is where the Real Estate CRM's project-management module pays off — you can quickly pull up new inventory and send a targeted message.",
      "Touch 7 (Day 30): If still no response, move the lead to 'Cold Lead' status and add them to a monthly newsletter list. Many of these leads will revive 3–6 months later when their personal situation changes.",
      "Leads Dekho automates this entire sequence. Each touch is a follow-up task that appears on the assigned agent's dashboard on the right day. The Real Estate CRM does the remembering; the agent does the talking. This is how small teams compete with big developers — by being relentless about follow-up.",
    ],
  },
  {
    slug: "real-estate-crm-vs-spreadsheets",
    title: "Real Estate CRM vs Excel: The Honest Comparison Nobody Else Will Give You",
    excerpt:
      "Spreadsheets are free, flexible, and familiar. So why are real estate teams leaving them in droves? Here is an honest, no-sales-pitch comparison.",
    category: "Comparison",
    author: "PSC Tech Solutions",
    date: "2026-07-10",
    readTime: "6 min read",
    image: "from-slate-500 to-gray-700",
    content: [
      "Let's be honest: spreadsheets are not bad. They are free, infinitely flexible, and every team already knows how to use them. If you have 20 leads a month and one salesperson, a Google Sheet is genuinely a fine choice. So why are real estate teams across India abandoning spreadsheets for a Real Estate CRM? The answer is not 'because CRMs are trendy' — it is because spreadsheets break in very specific, very expensive ways as you scale.",
      "The first break is collaboration. A spreadsheet works fine for one person. The moment two people edit it simultaneously, you get conflicts, overwrites, and 'who deleted my row?' conversations. A Real Estate CRM like Leads Dekho solves this with row-level locking, role-based access, and an activity timeline that shows exactly who changed what, when. There is no 'version 47 final final real final.xlsx' in your shared drive.",
      "The second break is follow-up tracking. In a spreadsheet, the only way to know which leads need follow-up today is to manually filter by date and status. This takes 20 minutes every morning and is the first thing agents skip when they are busy. A Real Estate CRM surfaces today's follow-ups on the dashboard automatically — no filtering, no excuses. Leads Dekho even highlights overdue follow-ups in red.",
      "The third break is reporting. Spreadsheets can technically produce any report, but only if someone builds it. Want to see 'leads by source this month vs last month, broken down by agent'? That is a 2-hour pivot table project. In a Real Estate CRM, it is a single click. Leads Dekho ships with daily, monthly, source-wise, project-wise, and user-wise reports out of the box.",
      "The fourth break is lead capture. With a spreadsheet, every lead from MagicBricks, Housing.com, Facebook, and walk-ins has to be typed in by hand. With a Real Estate CRM, webhooks do it automatically. This alone is worth the switch — manual data entry is where 15% of leads die.",
      "So when does a spreadsheet still win? For teams under 20 leads/month, for solo agents who already have a system that works, and for pilots where you are testing a new market segment. For everyone else — and that is most real estate businesses in India in 2026 — a Real Estate CRM like Leads Dekho pays for itself within the first month.",
    ],
  },
  {
    slug: "lead-source-attribution-in-real-estate",
    title: "Lead Source Attribution: Stop Wasting Money on the Wrong Portals",
    excerpt:
      "If you cannot measure which lead source converts best, you are flying blind with your marketing budget. Here is how a Real Estate CRM fixes this.",
    category: "Marketing",
    author: "PSC Tech Solutions",
    date: "2026-07-07",
    readTime: "5 min read",
    image: "from-cyan-500 to-teal-600",
    content: [
      "Every real estate business in India spends a small fortune on lead sources — MagicBricks, Housing.com, 99acres, Facebook Ads, Google Ads, walk-ins, referrals, hoardings, and more. But ask most brokers which source gives them the best ROI, and you will get a vague answer based on gut feeling, not data. This is madness. You would never run a stock portfolio this way, and you should not run your marketing budget this way either.",
      "The fix is lead source attribution — tracking every lead from arrival to booking, broken down by source. A Real Estate CRM does this automatically if you set it up correctly. Every lead in Leads Dekho is tagged with a source the moment it enters the system. When that lead eventually books (or does not), the Real Estate CRM can roll the data up into a source-wise conversion report.",
      "Here is a real example from one of our clients. They were spending ₹80,000/month on MagicBricks and ₹40,000/month on Facebook Ads. Their gut said MagicBricks was the better source — those leads felt 'more serious'. But the Leads Dekho source-wise report told a different story: MagicBricks leads converted at 2.1%, Facebook Ads leads converted at 4.7%. The client shifted budget, and within two months their cost-per-booking dropped by 38%.",
      "The reason most teams cannot do this analysis without a Real Estate CRM is that the data is scattered. MagicBricks leads land in email. Facebook leads land in a separate spreadsheet. Walk-ins are scribbled in a register. By the time a booking happens, no one remembers where the lead came from. Leads Dekho fixes this by being the single source of truth — every lead, regardless of origin, lives in one pipeline with its source tagged forever.",
      "If you are spending more than ₹50,000/month on lead generation and you cannot pull a source-wise conversion report in 30 seconds, you have a problem. A Real Estate CRM like Leads Dekho is the cheapest marketing analytics tool you will ever buy.",
    ],
  },
  {
    slug: "role-based-access-control-real-estate",
    title: "Role-Based Access in Real Estate CRM: Who Should See What?",
    excerpt:
      "Admin, telecalling, sales, super-admin — getting role permissions right is the difference between a secure CRM and a leaky one. Here is the breakdown.",
    category: "Security",
    author: "PSC Tech Solutions",
    date: "2026-07-04",
    readTime: "6 min read",
    image: "from-indigo-500 to-blue-700",
    content: [
      "In a real estate business, not everyone should see everything. A telecaller needs to see the leads assigned to them, but not the company's revenue reports. A sales executive needs to see their own pipeline, but not another executive's commission numbers. An admin needs to see everything, but should not be able to delete users — that is a super-admin's job. Getting these permissions right is what separates a Real Estate CRM from a shared spreadsheet.",
      "Leads Dekho ships with four built-in roles, each with carefully scoped permissions. Super-admin is the top of the pyramid — they can do everything, including managing users, viewing all reports, and configuring the entire system. Admin is one step down — they can manage leads, projects, and reports, but cannot manage users. Telecalling users see only the leads assigned to them and the follow-ups due today. Sales users see their own pipeline and site visits, but not other sales users' pipelines.",
      "Why does this matter? Three reasons. First, security: a telecaller who leaves the company should not be able to export the entire lead database on their way out. Role-based access prevents this. Second, focus: when a telecaller logs in and sees only their own leads, they are not distracted by what other people are doing. The Real Estate CRM becomes a personal worklist, not a noisy dashboard. Third, accountability: when an admin views a report, they can be sure the numbers reflect reality — because only authorized users have been able to edit the underlying data.",
      "A common mistake is to give everyone admin access 'just to keep things simple'. This is never simple in the long run. Within 3 months, you will have leads that nobody owns, reports that contradict each other, and a security audit waiting to happen. The right time to set up roles is day one — before there is any data to protect.",
      "Leads Dekho makes role management easy. The super-admin opens User Management, adds a new user, picks a role from a dropdown, and the user immediately gets exactly the right level of access — no more, no less. The Real Estate CRM handles all the permission checks behind the scenes, so you do not have to think about it again.",
    ],
  },
  {
    slug: "real-estate-crm-implementation-guide",
    title: "Implementing a Real Estate CRM: A 7-Day Rollout Plan",
    excerpt:
      "Adopting a CRM does not have to be a 3-month IT project. Here is a day-by-day plan to get your team live on Leads Dekho in one week.",
    category: "Implementation",
    author: "PSC Tech Solutions",
    date: "2026-07-01",
    readTime: "8 min read",
    image: "from-orange-500 to-red-600",
    content: [
      "Most real estate teams put off adopting a Real Estate CRM because they assume it is a multi-month IT project. It is not. With the right plan, a small-to-mid-size real estate business can be fully live on Leads Dekho in seven working days. Here is the exact plan we walk our clients through.",
      "Day 1 — Account setup and roles. The super-admin creates the account, adds the company logo, and creates user accounts for every team member with the correct roles (telecalling, sales, admin). This takes about an hour. The Real Estate CRM sends welcome emails with login instructions.",
      "Day 2 — Project and source setup. An admin adds all active projects (name, location, configuration, price range) and configures lead sources (MagicBricks, Housing.com, Facebook, walk-in, referral, etc.). This is the foundation — without it, leads cannot be properly tagged.",
      "Day 3 — Lead import. Upload your existing lead list via the CSV import tool in Leads Dekho. Map columns (name, phone, email, project, source, status) and run a dry-run validation. Once the dry-run passes, do the real import. Most teams import 500–5,000 historical leads in one shot.",
      "Day 4 — Webhook integration. Connect MagicBricks and Housing.com webhooks to the Real Estate CRM. Test with a sample lead to make sure the data flows correctly. This is also the day to set up Facebook Ads lead routing if you run paid campaigns.",
      "Day 5 — Team training. Run a 90-minute training session. Cover: how to log in, how to call a lead, how to log feedback, how to schedule a site visit, how to reassign a lead. Do not try to teach every feature — teach the 5 things people will do 90% of the time. Leads Dekho's interface is designed to make these 5 things obvious.",
      "Day 6 — Soft launch. Have the team work in the Real Estate CRM for real, but keep the old spreadsheet open as a backup. The goal is to surface any setup issues (wrong project names, missing sources, role permission mistakes) before they cause real problems.",
      "Day 7 — Cutover. Close the spreadsheet. From this moment on, every lead lives in Leads Dekho. The first week after cutover is critical — the super-admin should check the dashboard daily to make sure follow-ups are happening, calls are being logged, and no leads are stuck.",
      "After 30 days, run the source-wise report and the user-wise report. You will see, for the first time, a clear picture of how your business actually operates. This is the moment most clients tell us 'I cannot believe we ever worked without this'. A Real Estate CRM is not magic — but seven days of disciplined setup will give you a system that pays for itself for years.",
    ],
  },
  {
    slug: "real-estate-dashboard-metrics-that-matter",
    title: "The 5 Dashboard Metrics Every Real Estate Team Should Track Daily",
    excerpt:
      "Most dashboards show 20 numbers and none of them are useful. Here are the 5 metrics that actually drive real estate revenue.",
    category: "Analytics",
    author: "PSC Tech Solutions",
    date: "2026-06-28",
    readTime: "5 min read",
    image: "from-emerald-500 to-green-600",
    content: [
      "Open most Real Estate CRM dashboards and you will see 20 different numbers — total leads, calls made, follow-ups done, conversions, revenue, pipeline value, and so on. It is overwhelming and, honestly, mostly useless. A dashboard should not show you everything; it should show you the few things that, if you act on them today, will move revenue this week.",
      "Metric 1: Fresh Leads (not yet called). This is the single most important number on the dashboard. If this number is growing, you have a problem — leads are arriving faster than your team can call them. Leads Dekho shows this number prominently in red if it goes above 20. The rule is simple: no fresh lead should be uncalled for more than 30 minutes during business hours.",
      "Metric 2: Follow-Ups Due Today. This is your team's worklist for the day. If the number is 0, your team has nothing to do (which usually means your follow-up rules are broken). If the number is more than 80 per telecaller, your team is overloaded. Leads Dekho's Real Estate CRM calculates this number automatically based on the lead's last-contact date and the next-follow-up schedule.",
      "Metric 3: Site Visits Scheduled This Week. This is your leading indicator for next week's bookings. If site visits are down 30% this week, bookings will be down 30% next week — guaranteed. Catch this early and you can intervene.",
      "Metric 4: Lead-to-Visit Ratio. Of the leads your team called this week, what percentage agreed to a site visit? This is the quality metric. If it is below 5%, either your leads are bad (lead source problem) or your telecallers are not pitching well (training problem). The Real Estate CRM shows this ratio by agent, so you can spot training gaps quickly.",
      "Metric 5: Visit-to-Booking Ratio. Of the site visits that happened this month, what percentage converted to bookings? This is your sales-executive quality metric. Top performers convert 25–35%. Average performers convert 10–15%. Below 10% usually means the executive needs coaching or the project itself has issues (price, location, inventory).",
      "Notice what is NOT on this list: total revenue, total leads, total calls, total follow-ups. These are vanity metrics — they feel important but do not drive action. The 5 metrics above are action metrics — each one tells you what to do next. A Real Estate CRM like Leads Dekho surfaces them on the dashboard by default, because we built it for real estate operators, not for IT departments.",
    ],
  },
  {
    slug: "whatsapp-integration-real-estate-crm",
    title: "WhatsApp + Real Estate CRM: The Conversion Combo Nobody Uses Properly",
    excerpt:
      "WhatsApp is where Indian buyers actually live. Here is how to use it with your Real Estate CRM without ending up with 50 untracked chats per lead.",
    category: "Integrations",
    author: "PSC Tech Solutions",
    date: "2026-06-25",
    readTime: "6 min read",
    image: "from-green-500 to-emerald-600",
    content: [
      "If you sell real estate in India, your buyers are on WhatsApp. Not email, not phone calls — WhatsApp. A typical buyer-seller conversation in 2026 happens across 20–30 WhatsApp messages spread over 3 weeks, with maybe 2 phone calls sprinkled in. If your Real Estate CRM does not have a WhatsApp strategy, your agents are managing 50+ untracked chats per lead, and your data is a mess.",
      "The mistake most teams make is treating WhatsApp as an 'off-CRM' channel — agents chat with leads on their personal WhatsApp, and nothing gets logged. Six months later, when the lead is ready to book, nobody in the company knows what was discussed. A Real Estate CRM fixes this by treating every WhatsApp conversation as a logged activity.",
      "Leads Dekho's approach is pragmatic rather than fancy. We do not try to replace WhatsApp — agents keep using the WhatsApp they already know. Instead, the Real Estate CRM provides quick-action buttons that log 'WhatsApp sent — brochure', 'WhatsApp sent — price list', 'WhatsApp sent — site visit confirmation' directly to the lead's timeline. This takes 5 seconds per message and creates a complete activity record.",
      "For teams that want deeper integration, Leads Dekho supports WhatsApp Business API through partners. This lets the Real Estate CRM send automated messages (visit reminders, follow-up nudges, birthday wishes) and log incoming replies to the right lead's timeline automatically. This is more setup work, but for high-volume teams it pays for itself quickly.",
      "A practical tip that pays off immediately: save WhatsApp message templates inside your Real Estate CRM. When a telecaller needs to send a brochure, they should not be typing a fresh message every time. They should click a button that opens WhatsApp Web with a pre-filled message. Leads Dekho ships with 6 default templates (brochure, price list, visit confirmation, follow-up reminder, new launch, festive offer) and you can add your own. This alone saves a telecaller 30 minutes per day.",
      "The lesson: WhatsApp is not the enemy of your Real Estate CRM. It is the channel your buyers prefer. The job of a Real Estate CRM is not to replace WhatsApp — it is to make sure every WhatsApp conversation is captured, tagged, and searchable. Leads Dekho does this, and that is why our clients close more deals without working longer hours.",
    ],
  },
  {
    slug: "real-estate-crm-for-small-brokers",
    title: "Why Solo Brokers and Small Agencies Need a CRM More Than the Big Developers",
    excerpt:
      "Big developers have brand and budget. Small brokers have neither — which is exactly why a Real Estate CRM is more valuable for them, not less.",
    category: "Industry",
    author: "PSC Tech Solutions",
    date: "2026-06-22",
    readTime: "5 min read",
    image: "from-blue-500 to-indigo-600",
    content: [
      "There is a common misconception that a Real Estate CRM is a tool for big developers with 50+ salespeople. The opposite is closer to the truth. Big developers have brand recognition, marketing budgets, and dedicated IT teams — they can survive for years on a messy spreadsheet. A solo broker or a 3-person agency cannot. For them, a Real Estate CRM is not a luxury; it is the only way to compete.",
      "Consider the typical solo broker. They get leads from MagicBricks, Housing.com, two or three builder referrals, and walk-ins. They juggle these leads in a notebook, a phone's contact list, and three WhatsApp groups. They forget follow-ups. They double-book site visits. They lose leads to competitors who simply called back 10 minutes faster. Sound familiar? A Real Estate CRM fixes every one of these problems for less than the cost of one chai per day.",
      "Leads Dekho was built with small brokers in mind. The free trial lets a solo broker import their existing leads, connect their MagicBricks account, and start calling — all in an afternoon. There is no IT setup, no monthly minimum, no enterprise sales call. The Real Estate CRM is designed to be useful from day one, not after a 3-month implementation.",
      "The biggest win for small brokers is follow-up discipline. A solo broker who tracks follow-ups properly can convert at the same rate as a 10-person team that does not. We have seen solo brokers on Leads Dekho outperform 8-person agencies simply because every lead got called within 5 minutes and every follow-up happened on time. The Real Estate CRM becomes the broker's memory — it remembers what no human brain can.",
      "Another underrated benefit: professionalism. When a solo broker uses a Real Estate CRM, they send automated visit reminders, proper email confirmations, and structured follow-up messages. To the buyer, this looks like a polished agency — not a one-person shop. Many of our solo brokers have won deals over bigger competitors purely because the buyer perceived them as more organized.",
      "If you are a solo broker or run a small agency and you have been telling yourself 'I will get a CRM when I am bigger', reverse the logic. You will get bigger because you got a CRM. Leads Dekho is built for exactly your stage.",
    ],
  },
  {
    slug: "real-estate-crm-data-migration",
    title: "Migrating Your Lead Data to a New CRM Without Losing Anything",
    excerpt:
      "Moving 5,000 leads from spreadsheets to a Real Estate CRM is scary. Here is the field-mapping checklist and dry-run process we use with every client.",
    category: "Implementation",
    author: "PSC Tech Solutions",
    date: "2026-06-19",
    readTime: "7 min read",
    image: "from-purple-500 to-violet-700",
    content: [
      "Data migration is the most feared part of adopting a new Real Estate CRM. 'Will I lose my leads?' 'Will phone numbers get mangled?' 'Will my historical follow-up notes survive the move?' These fears are reasonable — bad migrations do happen — but they are entirely preventable with the right process. Here is the exact playbook we use at PSC Tech Solutions to migrate clients onto Leads Dekho without losing a single lead.",
      "Step 1 — Export from your current system. Whether it is Excel, Google Sheets, Tally, or another CRM, export to CSV. Open the file and inspect it. Look for: rows with missing phone numbers, duplicate phone numbers, rows where the status column has free-text values instead of standardized ones, and rows with dates in mixed formats (some dd-mm-yyyy, some mm/dd/yyyy). All of these will cause issues if not cleaned up first.",
      "Step 2 — Clean the data. Standardize phone numbers to 10-digit Indian format (remove +91, remove leading 0, remove spaces and hyphens). Standardize status values to the Real Estate CRM's expected set (Fresh, Contacted, Not Connected, Site Visit Promised, Site Visit Done, Prospect, Booked, Not Interested, Lost). Standardize dates to yyyy-mm-dd. Remove obvious duplicates. This step takes 2–4 hours for a 5,000-lead list, and it is worth every minute.",
      "Step 3 — Map fields. Open Leads Dekho's CSV import tool and map your spreadsheet columns to the Real Estate CRM's fields. Common mappings: 'Customer Name' → name, 'Mobile' → phone, 'Email ID' → email, 'Project Name' → project, 'Source' → source, 'Status' → status, 'Last Follow-up Date' → lastContactDate, 'Next Follow-up Date' → nextFollowUpDate, 'Notes' → feedback. Save this mapping so you can reuse it for future imports.",
      "Step 4 — Dry run. Leads Dekho runs a validation pass on your CSV without actually importing anything. It tells you how many rows will succeed, how many will fail, and exactly why each failing row will fail. Fix the failing rows in your CSV and re-run the dry run. Repeat until the dry run reports 0 failures. This step prevents 95% of migration disasters.",
      "Step 5 — Real import. Once the dry run is clean, run the real import. The Real Estate CRM processes the file and assigns each lead to the right agent based on your distribution rules. For 5,000 leads, this takes about 5 minutes.",
      "Step 6 — Spot check. After import, search for 10 specific leads you know well — the big-deal customer from last year, the angry one, the one with the weird name spelling. Make sure each one is in the system with the correct phone, status, and notes. If all 10 look right, the migration almost certainly succeeded.",
      "Step 7 — Archive the old spreadsheet. Do not delete it — keep it as a backup in a clearly named folder. But from this moment on, the Real Estate CRM is the source of truth. Anyone caught updating the old spreadsheet gets a polite but firm reminder. Leads Dekho's migration playbook has been used on lists from 200 leads to 50,000 leads, and the process scales. The secret is discipline, not technology.",
    ],
  },
  {
    slug: "future-of-real-estate-crm-ai-automation",
    title: "The Future of Real Estate CRM: AI, Automation, and What Comes Next",
    excerpt:
      "AI is not going to replace real estate agents. But agents who use AI-enabled CRMs will replace agents who do not. Here is what is coming in 2026 and beyond.",
    category: "Future",
    author: "PSC Tech Solutions",
    date: "2026-06-16",
    readTime: "8 min read",
    image: "from-pink-500 to-rose-600",
    content: [
      "Every few years, a new technology wave hits real estate. In 2010 it was online portals. In 2015 it was WhatsApp. In 2020 it was virtual tours. In 2026, the wave is AI — and unlike previous waves, this one is going to fundamentally change how a Real Estate CRM works. Not in some distant future, but in the next 12–18 months.",
      "The first AI feature every Real Estate CRM will have by end of 2026 is lead scoring. Instead of treating every new lead equally, the CRM will look at the lead's source, the words used in their enquiry, the time of day, and their response pattern on the first call — and assign a score from 1 to 100. Hot leads (80+) get pushed to the front of the queue; cold leads (30-) get a deferred follow-up. Leads Dekho is already piloting this with select clients, and early results show a 22% lift in conversion rates simply because agents stop wasting time on dead leads.",
      "The second feature is AI-assisted call summarization. Today, a telecaller spends 30 seconds after each call typing feedback notes. Tomorrow, the Real Estate CRM will listen to the call (with consent), transcribe it, and auto-generate a 2-line summary that the telecaller just has to approve. This saves 30 seconds per call — which is 30 minutes per day per telecaller, which is roughly 10 hours per week per team. That is real money.",
      "The third feature is predictive follow-up timing. Today, the Real Estate CRM schedules follow-ups based on a fixed rule (call back in 3 days). Tomorrow, the CRM will analyze each lead's response pattern and suggest the optimal follow-up time — 'this lead responds best between 7 PM and 9 PM on weekdays' or 'this lead goes silent for 5 days after each call, do not chase too aggressively'. This is not science fiction — the data already exists in your CRM, we just need to mine it.",
      "The fourth feature is conversational AI for first-touch. When a lead arrives at 11 PM, no human is going to call them. But an AI agent can WhatsApp them within 30 seconds, qualify them with 4–5 questions, and schedule a follow-up call for the next morning. This is not replacing telecallers — it is making sure no lead goes cold overnight. Leads Dekho is integrating this for launch in Q4 2026.",
      "What does not change in this future? Human relationships. Real estate is still a high-trust, high-emotion purchase. Buyers will still want to talk to a person before booking. Site visits will still matter. Negotiation will still be an art. A Real Estate CRM — even an AI-powered one — is a tool that helps humans do this work better, not a replacement for the work itself.",
      "If you are evaluating a Real Estate CRM in 2026, ask the vendor about their AI roadmap. Not because you need every feature today, but because you want to know they are investing in the future. Leads Dekho is. We believe the next decade of real estate belongs to teams that combine human judgment with AI-powered systems — and we are building the Real Estate CRM to make that combination possible.",
    ],
  },
];

/**
 * Get all blog slugs (for static generation / route params).
 */
export function getAllBlogSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}

/**
 * Get a single blog post by slug.
 * Returns undefined if not found.
 */
export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

/**
 * Get the N most recent posts (sorted by date desc).
 */
export function getRecentPosts(n: number = 6): BlogPost[] {
  return [...blogPosts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, n);
}

/**
 * Get all unique categories.
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(blogPosts.map((p) => p.category)));
}
