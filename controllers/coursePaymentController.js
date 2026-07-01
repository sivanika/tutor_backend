import Razorpay from "razorpay"
import crypto from "crypto"
import Course from "../models/Course.js"
import Enrollment from "../models/Enrollment.js"
import CoursePayment from "../models/CoursePayment.js"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// ─── Create Razorpay Order for Course ───────────────────────────────────────────
export const createCourseOrder = async (req, res) => {
  try {
    const { courseId } = req.body
    const studentId = req.user.id || req.user._id

    if (!courseId) {
      return res.status(400).json({ message: "courseId is required" })
    }

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    if (course.status !== "published") {
      return res.status(400).json({ message: "Course is not available for purchase" })
    }

    // Check if student is already enrolled
    const existingEnrollment = await Enrollment.findOne({ studentId, courseId })
    if (existingEnrollment && (existingEnrollment.status === "approved" || existingEnrollment.status === "completed")) {
      return res.status(400).json({ message: "You are already enrolled in this course" })
    }

    // If course is free
    if (course.price === 0) {
      return res.json({
        free: true,
        courseId: course._id,
        courseName: course.title,
        message: "This course is free. Payment not required.",
      })
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(course.price * 100), // in paise
      currency: "INR",
      receipt: `crs_rcpt_${Date.now()}`,
      notes: {
        courseId: String(course._id),
        userId: String(studentId),
      },
    }

    const order = await razorpay.orders.create(options)

    // Log the pending payment record
    await CoursePayment.create({
      studentId,
      courseId: course._id,
      amount: course.price,
      razorpayOrderId: order.id,
      status: "pending",
    })

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      courseId: course._id,
      courseName: course.title,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error("Create course order error:", error)
    res.status(500).json({ message: "Failed to create payment order" })
  }
}

// ─── Verify Razorpay Course Payment ─────────────────────────────────────────────
export const verifyCoursePayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = req.body
    const studentId = req.user.id || req.user._id

    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      // Mark payment as failed
      await CoursePayment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "failed", errorDescription: "Signature verification failed" }
      )
      return res.status(400).json({ message: "Payment verification failed" })
    }

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Update payment record to success
    const payment = await CoursePayment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "success",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentDate: new Date(),
      },
      { new: true }
    )

    // Check duplicate enrollment before creating
    let enrollment = await Enrollment.findOne({ studentId, courseId })
    if (!enrollment) {
      enrollment = await Enrollment.create({
        studentId,
        courseId,
        status: "approved",
        approvedDate: new Date(),
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: "paid",
        paymentAmount: payment ? payment.amount : course.price,
      })
    } else {
      // Update existing enrollment
      enrollment.status = "approved"
      enrollment.approvedDate = new Date()
      enrollment.razorpayOrderId = razorpay_order_id
      enrollment.razorpayPaymentId = razorpay_payment_id
      enrollment.paymentStatus = "paid"
      enrollment.paymentAmount = payment ? payment.amount : course.price
      await enrollment.save()
    }

    // Notify via Socket.IO if active
    if (global.io) {
      global.io.to(String(studentId)).emit("course_payment_verified", {
        success: true,
        courseName: course.title,
        paymentId: razorpay_payment_id,
      })
    }

    res.json({
      success: true,
      message: "Payment verified and enrollment activated",
      enrollment,
    })
  } catch (error) {
    console.error("Verify course payment error:", error)
    res.status(500).json({ message: "Payment verification failed" })
  }
}

// ─── Cancel Course Payment ──────────────────────────────────────────────────────
export const cancelCoursePayment = async (req, res) => {
  try {
    const { razorpay_order_id, errorDescription } = req.body

    const payment = await CoursePayment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "cancelled",
        errorDescription: errorDescription || "Payment cancelled by user",
      },
      { new: true }
    )

    res.json({ success: true, message: "Payment marked as cancelled", payment })
  } catch (error) {
    console.error("Cancel course payment error:", error)
    res.status(500).json({ message: "Failed to log cancelled payment" })
  }
}

// ─── Activate Free Course Directly ──────────────────────────────────────────────
export const activateFreeCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const studentId = req.user.id || req.user._id

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    if (course.price !== 0) {
      return res.status(400).json({ message: "This course is not free" })
    }

    // Check duplicate enrollment
    let enrollment = await Enrollment.findOne({ studentId, courseId })
    if (enrollment) {
      if (enrollment.status === "approved" || enrollment.status === "completed") {
        return res.json({ success: true, message: "Already enrolled", enrollment })
      }
      enrollment.status = "approved"
      enrollment.approvedDate = new Date()
      await enrollment.save()
    } else {
      enrollment = await Enrollment.create({
        studentId,
        courseId,
        status: "approved",
        approvedDate: new Date(),
        paymentStatus: "paid",
        paymentAmount: 0,
      })
    }

    res.json({
      success: true,
      message: "Enrolled in free course successfully",
      enrollment,
    })
  } catch (error) {
    console.error("Activate free course error:", error)
    res.status(500).json({ message: "Failed to enroll in course" })
  }
}
