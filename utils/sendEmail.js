import nodemailer from "nodemailer"

// ─── Transporter created per-call so it always reads live env vars ───────────
// (safe: nodemailer reuses the SMTP connection pool internally)
const buildTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.EMAIL
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD

  if (!user || !pass) {
    throw new Error(
      `Email credentials missing! EMAIL_USER="${user}", EMAIL_PASS loaded: ${!!pass}`
    )
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use TLS
    auth: { user, pass },
  })
}

// ─── Approval mail ────────────────────────────────────────────────────────────
export const sendApprovalMail = async (email, name) => {
  const user = process.env.EMAIL_USER || process.env.EMAIL
  console.log("[sendApprovalMail] to:", email, "| sender:", user)

  const transporter = buildTransporter()

  const info = await transporter.sendMail({
    from: `"TutorHours" <${user}>`,
    to: email,
    subject: "Profile Approved — TutorHours",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:12px;background:#f9f9fb">
        <h2 style="color:#6A11CB;margin-bottom:8px">Profile Approved! 🎉</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your TutorHours profile has been <strong>approved</strong>. You can now log in and start teaching.</p>
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/login"
           style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#6A11CB,#2575FC);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
          Go to Login →
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:28px">TutorHours · Student-Teacher Portal</p>
      </div>
    `,
  })

  console.log("[sendApprovalMail] ✅ sent, messageId:", info.messageId)
}

// ─── Password reset mail ───────────────────────────────────────────────────────
export const sendPasswordResetMail = async (email, resetLink) => {
  const user = process.env.EMAIL_USER || process.env.EMAIL
  console.log("[sendPasswordResetMail] to:", email, "| sender:", user)

  const transporter = buildTransporter()

  const info = await transporter.sendMail({
    from: `"TutorHours" <${user}>`,
    to: email,
    subject: "Reset Your TutorHours Password",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:12px;background:#f9f9fb">
        <h2 style="color:#6A11CB;margin-bottom:8px">Password Reset Request 🔐</h2>
        <p>We received a request to reset your TutorHours account password.</p>
        <p>Click the button below — this link expires in <strong>15 minutes</strong>.</p>
        <a href="${resetLink}"
           style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#6A11CB,#2575FC);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
          Reset My Password →
        </a>
        <p style="margin-top:20px;color:#6b7280;font-size:13px">
          Or copy this link:<br/>
          <span style="color:#6A11CB;word-break:break-all">${resetLink}</span>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:28px">
          If you did not request this, ignore this email.<br/>
          TutorHours · Student-Teacher Portal
        </p>
      </div>
    `,
  })

  console.log("[sendPasswordResetMail] ✅ sent, messageId:", info.messageId)
}
