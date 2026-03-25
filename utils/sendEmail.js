import { Resend } from "resend";

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Resend API key missing! Please set RESEND_API_KEY in your environment variables."
    );
  }
  return new Resend(apiKey);
};

// ─── Approval mail ────────────────────────────────────────────────────────────
export const sendApprovalMail = async (email, name) => {
  console.log("[sendApprovalMail] using Resend to:", email);

  const resend = getResendClient();

  try {
    const { data, error } = await resend.emails.send({
      from: "TutorHours <onboarding@resend.dev>", // Resend's default testing domain
      to: [email],
      subject: "Profile Approved — TutorHours",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:12px;background:#f9f9fb">
          <h2 style="color:#6A11CB;margin-bottom:8px">Profile Approved! 🎉</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your TutorHours profile has been <strong>approved</strong>. You can now log in and start teaching.</p>
          <a href="${process.env.CLIENT_URL || "http://localhost:5173"
        }/login"
             style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#6A11CB,#2575FC);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
            Go to Login →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:28px">TutorHours · Student-Teacher Portal</p>
        </div>
      `,
    });

    if (error) {
      console.error("[sendApprovalMail] Resend Error:", error);
      throw error;
    }

    console.log("[sendApprovalMail] ✅ sent via Resend, messageId:", data?.id);
  } catch (err) {
    console.error("[sendApprovalMail] Catch block error:", err);
    throw err;
  }
};

// ─── Password reset mail ───────────────────────────────────────────────────────
export const sendPasswordResetMail = async (email, resetLink) => {
  console.log("[sendPasswordResetMail] using Resend to:", email);

  const resend = getResendClient();

  try {
    const { data, error } = await resend.emails.send({
      from: "TutorHours <onboarding@resend.dev>", // Resend's default testing domain
      to: [email],
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
    });

    if (error) {
      console.error("[sendPasswordResetMail] Resend Error:", error);
      throw error;
    }

    console.log(
      "[sendPasswordResetMail] ✅ sent via Resend, messageId:",
      data?.id
    );
  } catch (err) {
    console.error("[sendPasswordResetMail] Catch block error:", err);
    throw err;
  } // Ensure this closing brace exists and properly closes the try/catch block
};
// ─── Profile pending-approval mail ────────────────────────────────────────────
export const sendPendingApprovalMail = async (email, name, role = "user") => {
  console.log("[sendPendingApprovalMail] sending to:", email, "| role:", role);

  // Guard — silently skip if no API key configured
  if (!process.env.RESEND_API_KEY) {
    console.warn("[sendPendingApprovalMail] RESEND_API_KEY not set – email skipped");
    return;
  }

  const resend = getResendClient();
  const roleLabel = role === "professor" ? "Tutor/Professor" : "Student";
  const iconEmoji = role === "professor" ? "🎓" : "📚";
  const nextStep =
    role === "professor"
      ? "Our admin team will review your credentials, teaching experience, and uploaded documents."
      : "Our admin team will review your profile and learning details.";

  try {
    const { data, error } = await resend.emails.send({
      from: "TutorHours <onboarding@resend.dev>",
      to: [email],
      subject: "Profile Submitted — Pending Admin Approval | TutorHours",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#f9f9fb;border-radius:14px;overflow:hidden">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#6A11CB,#2575FC);padding:32px 28px;text-align:center">
            <p style="font-size:36px;margin:0">${iconEmoji}</p>
            <h1 style="color:#fff;font-size:22px;margin:10px 0 4px">Profile Submitted!</h1>
            <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0">TutorHours · ${roleLabel} Portal</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 28px 12px">
            <p style="font-size:16px;color:#1a0e33;margin:0 0 16px">
              Hello <strong>${name || "there"}</strong>,
            </p>
            <p style="color:#374151;line-height:1.7;margin:0 0 16px">
              Thank you for completing your <strong>${roleLabel}</strong> profile on TutorHours.
              Your submission has been received and is currently
              <span style="background:#f3e8ff;color:#6A11CB;padding:2px 8px;border-radius:20px;font-weight:600;font-size:13px">⏳ Pending Admin Approval</span>.
            </p>
            <p style="color:#374151;line-height:1.7;margin:0 0 16px">
              ${nextStep}
              Once approved, you will receive a confirmation email and will be able to access your full dashboard.
            </p>

            <!-- Info box -->
            <div style="background:#eff6ff;border-left:4px solid #2575FC;border-radius:8px;padding:14px 16px;margin:20px 0">
              <p style="color:#1d4ed8;font-size:14px;font-weight:600;margin:0 0 6px">📋 What happens next?</p>
              <ul style="color:#374151;font-size:13px;margin:0;padding-left:18px;line-height:1.8">
                <li>Our admin team will review your profile within <strong>1–2 business days</strong>.</li>
                <li>You will receive an approval (or follow-up) email shortly after review.</li>
                <li>If additional information is needed, our team will reach out to you directly.</li>
              </ul>
            </div>

            <p style="color:#374151;line-height:1.7;margin:0 0 24px">
              If you have any questions in the meantime, feel free to reply to this email or
              reach out to our support team. We're happy to help!
            </p>

            <a href="${(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")}/login"
               style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6A11CB,#2575FC);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
              Go to Login →
            </a>
          </div>

          <!-- Footer -->
          <div style="padding:20px 28px;border-top:1px solid #e5e7eb;margin-top:20px">
            <p style="color:#9ca3af;font-size:12px;margin:0">
              TutorHours · Student-Teacher Portal<br/>
              You received this email because you created a ${roleLabel} profile on TutorHours.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[sendPendingApprovalMail] Resend error:", error);
      return; // non-blocking — don't throw
    }

    console.log("[sendPendingApprovalMail] ✅ sent, messageId:", data?.id);
  } catch (err) {
    console.error("[sendPendingApprovalMail] unexpected error:", err.message);
    // intentionally swallowed — email failure must not break profile save
  }
};
