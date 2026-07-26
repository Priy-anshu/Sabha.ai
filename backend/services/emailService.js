import nodemailer from 'nodemailer';

/**
 * Creates Nodemailer Transporter using Port 587 (STARTTLS)
 * Avoids port 465 ETIMEDOUT blocks on Windows networks
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Sends a 6-digit OTP Verification Email to user's real inbox
 */
export async function sendOtpEmail({ email, name, otp }) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Multi-Agent Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email — Multi-Agent AI Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #0f172a; color: #f8fafc;">
          <h2 style="color: #38bdf8; text-align: center;">Multi-Agent AI Platform</h2>
          <hr style="border-color: #334155;" />
          <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 15px; color: #cbd5e1;">Thank you for registering! Please use the following 6-digit verification code to complete your registration:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; background: #1e293b; padding: 12px 24px; border-radius: 8px; border: 1px solid #334155; display: inline-block;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 13px; color: #94a3b8; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border-color: #334155; margin-top: 30px;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">© 2026 Multi-Agent AI Debate System</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ OTP Email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send OTP Email:', error.message);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}
