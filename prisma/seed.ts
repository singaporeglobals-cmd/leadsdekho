import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create super admin
  const superAdminPassword = await bcrypt.hash('super123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@crm.com' },
    update: {},
    create: {
      email: 'superadmin@crm.com',
      name: 'Super Admin',
      password: superAdminPassword,
      role: 'super_admin',
      isActive: true,
    },
  });

  // Create default admin (if not exists)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      email: 'admin@crm.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
      isActive: true,
    },
  });

  // Create default telecaller
  const telePassword = await bcrypt.hash('tele123', 10);
  const telecaller = await prisma.user.upsert({
    where: { email: 'telecaller@crm.com' },
    update: {},
    create: {
      email: 'telecaller@crm.com',
      name: 'Tele Caller',
      password: telePassword,
      role: 'telecalling',
      isActive: true,
    },
  });

  // Create default sales
  const salesPassword = await bcrypt.hash('sales123', 10);
  const sales = await prisma.user.upsert({
    where: { email: 'sales@crm.com' },
    update: {},
    create: {
      email: 'sales@crm.com',
      name: 'Sales Person',
      password: salesPassword,
      role: 'sales',
      isActive: true,
    },
  });

  // Create default lead sources
  const defaultSources = [
    'Manual', 'Website', 'Referral', 'Social Media', 'Walk-in',
    'Call', 'Housing.com', '99acres', 'MagicBricks',
  ];

  for (const sourceName of defaultSources) {
    await prisma.leadSource.upsert({
      where: { name: sourceName },
      update: {},
      create: { name: sourceName, isActive: true },
    });
  }

  // Create default projects
  const project1 = await prisma.project.upsert({
    where: { id: 'project-1' },
    update: {},
    create: {
      id: 'project-1',
      name: 'Green Valley Residency',
      location: 'Sector 45, Gurgaon',
      description: 'Premium residential apartments with modern amenities',
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: 'project-2' },
    update: {},
    create: {
      id: 'project-2',
      name: 'Sunrise Villas',
      location: 'Dwarka Expressway, New Delhi',
      description: 'Luxury villas with private gardens',
    },
  });

  const project3 = await prisma.project.upsert({
    where: { id: 'project-3' },
    update: {},
    create: {
      id: 'project-3',
      name: 'Metro Heights',
      location: 'Noida Extension',
      description: 'Affordable apartments near metro station',
    },
  });

  console.log({ superAdmin, admin, telecaller, sales, project1, project2, project3 });
  console.log('Default lead sources created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
