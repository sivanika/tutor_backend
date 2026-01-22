import nodemailer from "nodemailer"

export const sendApprovalMail = async (email, name) => {
  try {
    console.log("Using email:", process.env.EMAIL)
    console.log("Password loaded:", !!process.env.EMAIL_PASSWORD)

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"Student Teacher Portal" <${process.env.EMAIL}>`,
      to: email,
      subject: "Profile Approved",
      html: `
        <h3>Hello ${name},</h3>
        <p>Your profile is approved successfully.</p>
        <p>You can now login.</p>
      `,
    })

    console.log("Approval email sent to:", email)
  } catch (error) {
    console.error("Email sending failed:", error)
  }
}
