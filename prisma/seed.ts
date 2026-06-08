import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default users
  const hashedPassword1 = await bcrypt.hash('admin123', 10);
  const hashedPassword2 = await bcrypt.hash('tele123', 10);
  const hashedPassword3 = await bcrypt.hash('sales123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      email: 'admin@crm.com',
      name: 'Admin User',
      password: hashedPassword1,
      role: 'admin',
      isActive: true,
    },
  });

  const telecaller = await prisma.user.upsert({
    where: { email: 'telecaller@crm.com' },
    update: {},
    create: {
      email: 'telecaller@crm.com',
      name: 'Tele Caller',
      password: hashedPassword2,
      role: 'telecalling',
      isActive: true,
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@crm.com' },
    update: {},
    create: {
      email: 'sales@crm.com',
      name: 'Sales Person',
      password: hashedPassword3,
      role: 'sales',
      isActive: true,
    },
  });

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

  console.log({ admin, telecaller, sales, project1, project2, project3 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
