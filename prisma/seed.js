import { createRequire } from "module";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const { resolveDemoAdminPassword, logDemoAdminPassword } = require("../scripts/demo-admin-password.cjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo users...");

  const existingAdmin = await prisma.user.findUnique({
    where: { email: "ahmedshayan928@gmail.com" },
    select: { password: true },
  });

  let adminHash = existingAdmin?.password;
  if (!adminHash) {
    const adminPassword = resolveDemoAdminPassword();
    logDemoAdminPassword(adminPassword);
    adminHash = await bcrypt.hash(adminPassword.password, 10);
  } else {
    console.log("Admin user already exists; password left unchanged.");
  }

  const users = [
    {
      name: "Admin (Super Admin)",
      email: "ahmedshayan928@gmail.com",
      password: adminHash,
      role: "ADMIN",
    },
    {
      name: "Committee Head",
      email: "committee@hamdard.edu",
      password: await bcrypt.hash("committee123", 10),
      role: "COMMITTEE_HEAD",
    },
    {
      name: "Teacher",
      email: "teacher@hamdard.edu",
      password: await bcrypt.hash("teacher123", 10),
      role: "TEACHER",
    },
    {
      name: "Student",
      email: "student@hamdard.edu",
      password: await bcrypt.hash("student123", 10),
      role: "STUDENT",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  console.log("✅ Demo users created successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
