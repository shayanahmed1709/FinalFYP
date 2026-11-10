const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { resolveDemoAdminPassword, logDemoAdminPassword } = require('./scripts/demo-admin-password.cjs');

const prisma = new PrismaClient();

// Email and display name can be overridden. The password is never written into source files.
const NEW_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ahmedshayan928@gmail.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin (Super Admin)';

async function updateAdminCredentials() {
  try {
    console.log('Starting admin credentials update...');
    console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
    console.log(`   Name: ${ADMIN_NAME}`);
    console.log('   Source files are not modified. Keep passwords in environment variables only.');

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    const passwordResult = resolveDemoAdminPassword({ generate: !admin });

    if (!admin) {
      const hashedPassword = await bcrypt.hash(passwordResult.password, 10);
      const newAdmin = await prisma.user.create({
        data: {
          email: NEW_ADMIN_EMAIL,
          password: hashedPassword,
          name: ADMIN_NAME,
          role: 'ADMIN',
          status: 'APPROVED',
          department: 'Administration',
          isActive: true
        }
      });

      console.log('Admin user created.');
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   Email: ${newAdmin.email}`);
      logDemoAdminPassword(passwordResult);
      return;
    }

    const updateData = {
      email: NEW_ADMIN_EMAIL,
      name: ADMIN_NAME
    };

    if (passwordResult) {
      updateData.password = await bcrypt.hash(passwordResult.password, 10);
    } else {
      console.log('   DEMO_ADMIN_PASSWORD is unset; existing password left unchanged.');
    }

    await prisma.user.update({
      where: { id: admin.id },
      data: updateData
    });

    console.log('Database updated.');
    console.log(`   Previous email: ${admin.email}`);
    console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
    if (passwordResult) {
      logDemoAdminPassword(passwordResult);
    }
  } catch (error) {
    console.error('Error updating admin credentials:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminCredentials()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
