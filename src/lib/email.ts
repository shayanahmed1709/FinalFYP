import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailConfigError';
  }
}

function requireEmailCredentials(): { user: string; password: string } {
  const user = process.env.EMAIL_USER?.trim() ?? '';
  const password = process.env.EMAIL_PASSWORD?.trim() ?? '';
  const missing: string[] = [];
  if (!user) missing.push('EMAIL_USER');
  if (!password) missing.push('EMAIL_PASSWORD');
  if (missing.length > 0) {
    throw new EmailConfigError(
      `Email is not configured. Set ${missing.join(' and ')} in the server environment. Do not hardcode credentials or expose them with NEXT_PUBLIC_ variables.`
    );
  }
  return { user, password };
}

function readContactEmail(): string | null {
  try {
    const settingsPath = path.join(process.cwd(), 'data', 'system-settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      const contact = settings.general?.contactEmail;
      if (typeof contact === 'string' && contact.trim()) {
        return contact.trim();
      }
    }
  } catch (error) {
    console.error('Error reading contact email from settings:', error);
  }
  return null;
}

export function getEmailTransport() {
  const { user, password } = requireEmailCredentials();
  const port = Number(process.env.EMAIL_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST?.trim() || 'smtp.gmail.com',
    port: Number.isFinite(port) ? port : 587,
    secure: false, // Use TLS
    auth: {
      user,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return {
    transporter,
    fromAddress: user,
    contactEmail: readContactEmail() || user,
  };
}

export const createEmailTransporter = () => getEmailTransport().transporter;

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  verificationCode: string,
  userName: string
) {
  try {
    const { transporter, fromAddress, contactEmail } = getEmailTransport();
    const mailOptions = {
      from: {
        name: 'FYP Management System',
        address: fromAddress
      },
      to: email,
      replyTo: fromAddress,
      subject: 'Password Reset Code - FYP Management System',
      html: `<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
.content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
.code-box { background-color: #fff; border: 2px dashed #16a34a; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
.code { font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 5px; font-family: 'Courier New', monospace; }
.footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
.warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
</style>
</head>
<body>
<div class="container">
<div class="header"><h1>Password Reset Request</h1></div>
<div class="content">
<p>Hello ${userName},</p>
<p>We received a request to reset your password for your FYP Management System account.</p>
<p>Use the verification code below to reset your password:</p>
<div class="code-box">
<div class="code">${verificationCode}</div>
</div>
<p style="text-align: center; color: #666;">Enter this code on the password reset page</p>
<div class="warning">
<strong>⚠️ Security Notice:</strong>
<ul style="margin: 10px 0;">
<li>This code will expire in 1 hour</li>
<li>If you didn't request this reset, please ignore this email</li>
<li>Never share this code with anyone</li>
</ul>
</div>
<p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
<p>Best regards,<br>FYP Management System Team</p>
</div>
<div class="footer">
<p>This is an automated email from ${contactEmail}</p>
<p>&copy; ${new Date().getFullYear()} FYP Management System. All rights reserved.</p>
</div>
</div>
</body>
</html>`,
      text: `Password Reset Request

Hello ${userName},

We received a request to reset your password for your FYP Management System account.

Your verification code is: ${verificationCode}

This code will expire in 1 hour.

If you didn't request this reset, please ignore this email.

Best regards,
FYP Management System Team
Email: ${contactEmail}`,
    };

    console.log('📧 Attempting to send password reset email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully!');
    console.log('   To:', email);
    console.log('   Message ID:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to send password reset email');
    console.error('   To:', email);
    console.error('   Error:', error instanceof EmailConfigError ? error.message : (error.message || error));
    return { success: false, error };
  }
}

// Send password reset confirmation email
export async function sendPasswordResetConfirmationEmail(
  email: string,
  userName: string
) {
  try {
    const { transporter, fromAddress } = getEmailTransport();
    const mailOptions = {
      from: {
        name: 'FYP Management System',
        address: fromAddress
      },
      to: email,
      replyTo: fromAddress,
      subject: 'Password Successfully Reset - FYP Management System',
      html: `<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
.content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
.footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
</style>
</head>
<body>
<div class="container">
<div class="header"><h1>✓ Password Reset Successful</h1></div>
<div class="content">
<p>Hello ${userName},</p>
<p>Your password has been successfully reset.</p>
<p>You can now log in to your account using your new password.</p>
<p>If you did not make this change, please contact support immediately.</p>
<p>Best regards,<br>FYP Management System Team</p>
</div>
<div class="footer">
<p>This is an automated email. Please do not reply to this message.</p>
<p>&copy; ${new Date().getFullYear()} FYP Management System. All rights reserved.</p>
</div>
</div>
</body>
</html>`,
    };

    console.log('📧 Sending password reset confirmation to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent successfully to:', email);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending confirmation email to:', email);
    console.error('   Error:', error instanceof EmailConfigError ? error.message : (error.message || error));
    return { success: false, error };
  }
}

// Send welcome email after registration
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  userRole: string
) {
  try {
    const { transporter, fromAddress, contactEmail } = getEmailTransport();
    const roleNames: Record<string, string> = {
      'STUDENT': 'Student',
      'TEACHER': 'Teacher',
      'COMMITTEE_HEAD': 'Committee Head',
      'ADMIN': 'Administrator'
    };

    const roleName = roleNames[userRole] || userRole;

    const mailOptions = {
      from: {
        name: 'FYP Management System',
        address: fromAddress
      },
      to: email,
      replyTo: fromAddress,
      subject: 'Welcome to FYP Management System - Account Pending Approval',
      html: `<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
.content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
.footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
.info-box { background-color: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0; }
.success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>Welcome to FYP Management System!</h1>
</div>
<div class="content">
<div class="success-icon">✅</div>
<p>Hello ${userName},</p>
<p>Thank you for registering with the FYP Management System!</p>
<div class="info-box">
<strong>📋 Your Registration Details:</strong>
<ul style="margin: 10px 0;">
<li><strong>Name:</strong> ${userName}</li>
<li><strong>Email:</strong> ${email}</li>
<li><strong>Role:</strong> ${roleName}</li>
<li><strong>Status:</strong> Pending Approval</li>
</ul>
</div>
<p><strong>⏳ What's Next?</strong></p>
<p>Your account is currently pending approval from the system administrator. You will receive another email once your account has been reviewed and approved.</p>
<p><strong>✅ Once approved, you will be able to:</strong></p>
<ul>
<li>Access the FYP Management System</li>
<li>Manage your projects and submissions</li>
<li>Communicate with supervisors and team members</li>
<li>Track your FYP progress</li>
</ul>
<p>If you have any questions or didn't create this account, please contact us at ${contactEmail}</p>
<p>Best regards,<br>FYP Management System Team</p>
</div>
<div class="footer">
<p>This is an automated email from ${contactEmail}</p>
<p>&copy; ${new Date().getFullYear()} FYP Management System. All rights reserved.</p>
</div>
</div>
</body>
</html>`,
      text: `Welcome to FYP Management System!

Hello ${userName},

Thank you for registering with the FYP Management System!

Your Registration Details:
- Name: ${userName}
- Email: ${email}
- Role: ${roleName}
- Status: Pending Approval

What's Next?
Your account is currently pending approval from the system administrator. You will receive another email once your account has been reviewed and approved.

Once approved, you will be able to:
- Access the FYP Management System
- Manage your projects and submissions
- Communicate with supervisors and team members
- Track your FYP progress

If you have any questions or didn't create this account, please contact us at ${contactEmail}

Best regards,
FYP Management System Team
Email: ${contactEmail}`
    };

    console.log('📧 Sending welcome email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully to:', email);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending welcome email to:', email);
    console.error('   Error:', error instanceof EmailConfigError ? error.message : (error.message || error));
    return { success: false, error };
  }
}
