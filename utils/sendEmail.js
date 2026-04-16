import { Resend } from "resend";

// ✅ Use verified domain in production
const FROM_EMAIL =
  process.env.FROM_EMAIL || "TutorHours <onboarding@resend.dev>";

// ✅ Base URL (no repeating logic)
const BASE_URL = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

// ✅ Initialize Resend ONCE
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Resend API key missing! Please set RESEND_API_KEY in environment variables."
    );
  }

  return new Resend(apiKey);
};

const resend = getResendClient();

// ─────────────────────────────────────────────
// ✅ GENERIC EMAIL SENDER (Reusable)
// ─────────────────────────────────────────────
const send = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("[Resend Error]:", error);
      throw error;
    }

    console.log("✅ Email sent:", data?.id);
    return data;
  } catch (err) {
    console.error("❌ Email failed:", err.message);
    throw err;
  }
};

// ─────────────────────────────────────────────
// ✅ APPROVAL MAIL
// ─────────────────────────────────────────────
export const sendApprovalMail = (email, name) => {
  return send({
    to: email,
    subject: "Profile Approved — TutorHours",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:12px;background:#f9f9fb">
        <h2 style="color:#6A11CB;">Profile Approved! 🎉</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your profile has been approved. You can now log in and start using TutorHours.</p>

        <a href="${BASE_URL}/login"
          style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#6A11CB,#2575FC);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">
          Go to Login →
        </a>

        <p style="color:#9ca3af;font-size:12px;margin-top:28px">
          TutorHours · Student-Teacher Portal
        </p>
      </div>
    `,
  });
};

// ─────────────────────────────────────────────
// 🔐 PASSWORD RESET MAIL
// ─────────────────────────────────────────────
export const sendPasswordResetMail = (email, resetLink) => {
  return send({
    to: email,
    subject: "Reset Your TutorHours Password",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:12px;background:#f9f9fb">
        <h2 style="color:#6A11CB;">Password Reset 🔐</h2>

        <p>We received a request to reset your password.</p>
        <p>This link expires in <strong>15 minutes</strong>.</p>

        <a href="${resetLink}"
          style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#6A11CB,#2575FC);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">
          Reset Password →
        </a>

        <p style="margin-top:20px;font-size:13px;color:#6b7280">
          Or copy this link:<br/>
          <span style="word-break:break-all;color:#6A11CB">${resetLink}</span>
        </p>

        <p style="color:#9ca3af;font-size:12px;margin-top:28px">
          If you didn’t request this, ignore this email.
        </p>
      </div>
    `,
  });
};

// ─────────────────────────────────────────────
// ⏳ PENDING APPROVAL MAIL
// (Non-blocking — won't crash app)
// ─────────────────────────────────────────────
export const sendPendingApprovalMail = async (email, name, role = "user") => {
  const roleLabel = role === "professor" ? "Tutor/Professor" : "Student";
  const icon = role === "professor" ? "🎓" : "📚";

  try {
    await send({
      to: email,
      subject: "Profile Submitted — Pending Approval",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#f9f9fb;border-radius:14px;">
          
          <div style="background:linear-gradient(135deg,#6A11CB,#2575FC);padding:28px;text-align:center">
            <h2 style="color:white;margin:0">${icon} Profile Submitted</h2>
            <p style="color:#ddd;margin-top:6px">${roleLabel} Portal</p>
          </div>

          <div style="padding:24px">
            <p>Hello <strong>${name || "User"}</strong>,</p>

            <p>Your profile is currently under admin review.</p>

            <ul style="font-size:14px;color:#374151">
              <li>⏱ Review time: 1–2 days</li>
              <li>📩 You’ll get approval email soon</li>
              <li>📞 We may contact you if needed</li>
            </ul>

            <a href="${BASE_URL}/login"
              style="display:inline-block;margin-top:20px;padding:12px 28px;background:#6A11CB;color:#fff;border-radius:8px;text-decoration:none;">
              Go to Login →
            </a>
          </div>

          <p style="text-align:center;font-size:12px;color:#aaa;padding-bottom:20px">
            TutorHours Platform
          </p>

        </div>
      `,
    });

    console.log("✅ Pending approval email sent");
  } catch (err) {
    console.error("⚠️ Pending email failed (ignored):", err.message);
    // ❗ intentionally NOT throwing (non-critical)
  }
};