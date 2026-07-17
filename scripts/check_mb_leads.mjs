import { PrismaClient } from "@prisma/client";
process.env.POSTGRES_PRISMA_URL = "postgresql://neondb_owner:npg_yQBMrKEHk3D6@ep-winter-base-aon3lo6d-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15";
process.env.POSTGRES_URL_NON_POOLING = "postgresql://neondb_owner:npg_yQBMrKEHk3D6@ep-winter-base-aon3lo6d-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const prisma = new PrismaClient();
try {
  const recent = await prisma.portalLead.findMany({
    where: { OR: [
      { source: { contains: "MagicBricks", mode: "insensitive" } },
      { source: { contains: "Magic", mode: "insensitive" } },
    ]},
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, name: true, phone: true, email: true, source: true, projectName: true, budget: true, notes: true, portalRef: true, status: true, createdAt: true },
  });
  console.log(`MagicBricks leads found: ${recent.length}`);
  for (const r of recent) {
    console.log("---");
    console.log(`  id: ${r.id}`);
    console.log(`  createdAt: ${r.createdAt.toISOString()}`);
    console.log(`  name: ${r.name}`);
    console.log(`  phone: ${r.phone}`);
    console.log(`  email: ${r.email || "n/a"}`);
    console.log(`  source: ${r.source}`);
    console.log(`  project: ${r.projectName || "n/a"}`);
    console.log(`  budget: ${r.budget || "n/a"}`);
    console.log(`  notes: ${(r.notes || "").slice(0, 100)}`);
    console.log(`  portalRef: ${r.portalRef || "n/a"}`);
    console.log(`  status: ${r.status}`);
  }
  const all = await prisma.portalLead.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  console.log("\n=== PortalLead counts by source ===");
  for (const g of all) {
    console.log(`  ${g.source}: ${g._count._all}`);
  }
  const total = await prisma.portalLead.count();
  console.log(`\nTotal portal leads: ${total}`);
  const pending = await prisma.portalLead.count({ where: { status: "pending" }});
  console.log(`Pending: ${pending}`);
  
  // Most recent 10 leads across ALL sources to see what's coming in
  const recentAll = await prisma.portalLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { name: true, phone: true, source: true, createdAt: true, status: true },
  });
  console.log("\n=== Most recent 10 portal leads (any source) ===");
  for (const r of recentAll) {
    console.log(`  ${r.createdAt.toISOString()} | ${r.source} | ${r.name} | ${r.phone} | ${r.status}`);
  }
} catch (e) {
  console.error("ERROR:", e.message);
} finally {
  await prisma.$disconnect();
}
