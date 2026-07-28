import nodemailer from 'nodemailer';

/**
 * Sends a 6-digit OTP Verification Email from Sabha.ai to user's real inbox.
 * Prioritizes Brevo REST API v3 (Fast, HTTPS Port 443, no SMTP blocking) with Nodemailer fallback.
 */
export async function sendOtpEmail({ email, name, otp, subject = 'Verify Your Email — Sabha.ai' }) {
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  const senderEmail = process.env.BREVO_SMTP_USER || process.env.EMAIL_USER || 'mbind0363@gmail.com';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #0f172a; color: #f8fafc;">
      <h2 style="color: #38bdf8; text-align: center; font-size: 24px; margin-bottom: 5px;">Sabha<span style="color: #818cf8;">.ai</span></h2>
      <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-top: 0;">Multi-Agent Consensus Platform</p>
      <hr style="border-color: #334155;" />
      <p style="font-size: 16px;">Hello <strong>${name || 'User'}</strong>,</p>
      <p style="font-size: 15px; color: #cbd5e1;">Welcome to <strong>Sabha.ai</strong>! Please use the following 6-digit verification code to complete your registration:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; background: #1e293b; padding: 12px 24px; border-radius: 8px; border: 1px solid #334155; display: inline-block;">
          ${otp}
        </span>
      </div>

      <p style="font-size: 13px; color: #94a3b8; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border-color: #334155; margin-top: 30px;" />
      <p style="font-size: 12px; color: #64748b; text-align: center;">© 2026 Sabha.ai — Multi-Agent AI Platform</p>
    </div>
  `;

  // 1. Primary Route: Brevo API v3 (High Speed HTTPS Direct API)
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': brevoApiKey
        },
        body: JSON.stringify({
          sender: { name: 'Sabha.ai Council', email: senderEmail },
          to: [{ email: email, name: name || 'User' }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      const resData = await response.json();
      if (response.ok) {
        console.log(`✉️ [Brevo API Email Success] Sent OTP to ${email}: ${resData.messageId}`);
        return { success: true, messageId: resData.messageId };
      } else {
        console.warn(`⚠️ Brevo API Warning (${resData.code || response.status}): ${resData.message || JSON.stringify(resData)}`);
      }
    } catch (brevoErr) {
      console.warn('⚠️ Brevo API call failed, attempting Nodemailer fallback:', brevoErr.message);
    }
  }

  // 2. Secondary Fallback Route: Nodemailer Transporter
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false }
    });

    const info = await transporter.sendMail({
      from: `"Sabha.ai Council" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: htmlContent
    });

    console.log(`✉️ [Nodemailer Fallback Success] OTP Email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send OTP Email:', error.message);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

/**
 * Sends an Onboarding Welcome Email when a user completes registration/verification.
 * Link for "Start Your First AI Debate ➔" is loaded dynamically from process.env.APP_FRONTEND_URL.
 */
export async function sendWelcomeEmail({ email, name }) {
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  const senderEmail = process.env.BREVO_SMTP_USER || process.env.EMAIL_USER || 'mbind0363@gmail.com';
  const appFrontendUrl = process.env.APP_FRONTEND_URL || 'http://localhost:3000';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: auto; padding: 25px; border-radius: 12px; background-color: #0f172a; color: #f8fafc; border: 1px solid #1e293b;">
      <h1 style="color: #38bdf8; text-align: center; font-size: 28px; margin-bottom: 5px;">
        Sabha<span style="color: #818cf8;">.ai</span>
      </h1>
      <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-top: 0;">
        Multi-Agent Consensus & Verification System
      </p>
      <hr style="border-color: #334155; margin: 20px 0;" />

      <p style="font-size: 16px; color: #f8fafc;">Welcome aboard, <strong>${name || 'User'}</strong>! 🎉</p>
      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
        Your account is officially verified. You now have full access to our multi-agent AI council platform.
      </p>

      <div style="background: #1e293b; padding: 16px; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 20px 0;">
        <h3 style="color: #38bdf8; margin-top: 0; font-size: 15px;">🏛️ What is Sabha.ai?</h3>
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0; line-height: 1.5;">
          Instead of relying on a single AI that can hallucinate, <strong>Sabha.ai</strong> automatically allocates a team of <strong>specialized AI expert personas</strong> (Architects, Security Auditors, System Leads) to debate, critique, and verify every response before giving you the final answer.
        </p>
      </div>

      <h3 style="color: #818cf8; font-size: 15px; margin-top: 25px;">🚀 Quick Start Guide — How to Use Sabha.ai:</h3>
      <ul style="font-size: 13px; color: #cbd5e1; line-height: 1.8; padding-left: 20px;">
        <li><strong>Ask Complex Prompts:</strong> Submit any engineering, architecture, code audit, or research question.</li>
        <li><strong>Watch Real-Time Debates:</strong> See expert personas debate and vote on solutions in real time.</li>
        <li><strong>Inspect Council Audits:</strong> Click <em>"Inspect Personas & Audit"</em> on any response to see detailed critique logs.</li>
        <li><strong>Upload Documents for Q&A:</strong> Attach PDFs or files to get context-aware analysis from your council.</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${appFrontendUrl}" style="background: #38bdf8; color: #0f172a; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
          Start Your First AI Debate ➔
        </a>
      </div>

      <hr style="border-color: #334155; margin-top: 30px;" />
      <p style="font-size: 12px; color: #64748b; text-align: center;">© 2026 Sabha.ai — Multi-Agent AI Consensus Platform</p>
    </div>
  `;

  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': brevoApiKey
        },
        body: JSON.stringify({
          sender: { name: 'Sabha.ai Council', email: senderEmail },
          to: [{ email: email, name: name || 'User' }],
          subject: 'Welcome to Sabha.ai — Your Multi-Agent AI Council is Ready 🚀',
          htmlContent: htmlContent
        })
      });
      const resData = await response.json();
      if (response.ok) {
        console.log(`✉️ [Welcome Email Sent] Delivered to ${email}: ${resData.messageId}`);
        return { success: true, messageId: resData.messageId };
      }
      return { success: false, error: resData.message || 'Brevo API error' };
    } catch (err) {
      console.warn('⚠️ Welcome Email Brevo API Warning:', err.message);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Brevo API key missing' };
}
