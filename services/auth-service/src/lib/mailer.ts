import { isDev, config } from "../config";

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (isDev) {
    console.log("\n─────────────────────────────────");
    console.log("DEV EMAIL (not actually sent)");
    console.log(`   To:      ${opts.to}`);
    console.log(`   Subject: ${opts.subject}`);
    console.log(`   Body:    ${opts.text}`);
    console.log("─────────────────────────────────\n");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Lenda <${config.EMAIL_FROM}>`,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? opts.text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email failed: ${JSON.stringify(error)}`);
  }
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Lenda - Verify your email",
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2A4A;">Verify your email</h2>
        <p>Your Lenda verification code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #C8960C;
                    padding: 20px; background: #FFF8E7; border-radius: 8px; text-align: center;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          This code expires in 10 minutes. If you did not request this, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  otp: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Lenda — Reset your password",
    text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2A4A;">Reset your password</h2>
        <p>Your Lenda password reset code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #C8960C;
                    padding: 20px; background: #FFF8E7; border-radius: 8px; text-align: center;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          This code expires in 10 minutes. If you did not request a password reset, ignore this email.
        </p>
      </div>
    `,
  });
}
