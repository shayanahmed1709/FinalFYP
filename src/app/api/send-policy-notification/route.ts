import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { EmailConfigError, getEmailTransport } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    bucket: 'send-policy-notification',
    limit: 3,
    windowMs: 60 * 60 * 1000,
  })
  if (limited) return limited

  try {
    const { policyVersion, policyDescription } = await request.json()

    let transporter
    let fromAddress: string
    try {
      const transport = getEmailTransport()
      transporter = transport.transporter
      fromAddress = transport.fromAddress
    } catch (error) {
      const message = error instanceof EmailConfigError
        ? error.message
        : 'Email is not configured.'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        isActive: true
      },
      select: {
        email: true,
        name: true,
        role: true
      }
    })

    // Send email to each user
    const emailPromises = users.map(async (user) => {
      const mailOptions = {
        from: `"FYP Administration" <${fromAddress}>`,
        to: user.email,
        subject: `New FYP Policy Document Available - Version ${policyVersion}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              .highlight { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📋 New FYP Policy Document</h1>
              </div>
              <div class="content">
                <p>Dear ${user.name},</p>
                
                <p>A new FYP Policy Document has been uploaded to the system:</p>
                
                <div class="highlight">
                  <strong>Version:</strong> ${policyVersion}<br>
                  ${policyDescription ? `<strong>Description:</strong> ${policyDescription}<br>` : ''}
                  <strong>Uploaded:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                ${user.role === 'STUDENT' ? `
                  <p><strong>Action Required:</strong> You must review and acknowledge this policy document before proceeding with FYP registration.</p>
                ` : `
                  <p>Please review the updated policy document at your earliest convenience.</p>
                `}
                
                <center>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" class="button">
                    View Policy Document
                  </a>
                </center>
                
                <p>If you have any questions regarding the policy, please contact the FYP administration.</p>
                
                <p>Best regards,<br>
                FYP Administration Team<br>
                Hamdard University</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

      try {
        await transporter.sendMail(mailOptions)
        return { success: true, email: user.email }
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error)
        return { success: false, email: user.email, error }
      }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Emails sent: ${successCount} successful, ${failCount} failed`,
      results
    })
  } catch (error) {
    console.error('Error sending policy notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send policy notifications', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
