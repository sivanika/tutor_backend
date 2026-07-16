import Razorpay from "razorpay";
import crypto from "crypto";
import LiveClass from "../models/LiveClass.js";
import LiveClassEnrollment from "../models/LiveClassEnrollment.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Create Razorpay Order for Live Class ───────────────────────────────────────────
export const createLiveClassOrder = async (req, res) => {
  try {
    const { liveClassId } = req.body;
    const studentId = req.user.id || req.user._id;

    if (!liveClassId) {
      return res.status(400).json({ message: "liveClassId is required" });
    }

    const liveClass = await LiveClass.findById(liveClassId);
    if (!liveClass) {
      return res.status(404).json({ message: "Live Class not found" });
    }

    if (!liveClass.isPublished) {
      return res.status(400).json({ message: "Live Class is not available for enrollment" });
    }

    // Check if student is already enrolled
    const existingEnrollment = await LiveClassEnrollment.findOne({ student: studentId, liveClass: liveClassId });
    if (existingEnrollment && existingEnrollment.status === "paid") {
      return res.status(400).json({ message: "You are already enrolled in this live class" });
    }

    // If live class is free
    if (liveClass.price === 0) {
      return res.json({
        free: true,
        liveClassId: liveClass._id,
        liveClassName: liveClass.title,
        message: "This live class is free. Payment not required.",
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(liveClass.price * 100), // in paise
      currency: "INR",
      receipt: `live_rcpt_${Date.now()}`,
      notes: {
        liveClassId: String(liveClass._id),
        userId: String(studentId),
      },
    };

    const order = await razorpay.orders.create(options);

    // Log the pending enrollment record
    if (existingEnrollment) {
      existingEnrollment.razorpayOrderId = order.id;
      existingEnrollment.status = "pending";
      existingEnrollment.amountPaid = liveClass.price;
      await existingEnrollment.save();
    } else {
      await LiveClassEnrollment.create({
        student: studentId,
        liveClass: liveClass._id,
        amountPaid: liveClass.price,
        razorpayOrderId: order.id,
        status: "pending",
      });
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      liveClassId: liveClass._id,
      liveClassName: liveClass.title,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create live class order error:", error);
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

// ─── Verify Razorpay Live Class Payment ─────────────────────────────────────────────
export const verifyLiveClassPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      liveClassId,
    } = req.body;
    const studentId = req.user.id || req.user._id;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Mark payment as failed
      await LiveClassEnrollment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "failed" }
      );
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const liveClass = await LiveClass.findById(liveClassId);
    if (!liveClass) {
      return res.status(404).json({ message: "Live Class not found" });
    }

    // Update enrollment to success
    const enrollment = await LiveClassEnrollment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "paid",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        enrolledAt: new Date(),
      },
      { new: true }
    );

    // Update seats filled and seats left in LiveClass
    liveClass.seatsFilled = (liveClass.seatsFilled || 0) + 1;
    liveClass.seatsLeft = Math.max(0, liveClass.seatsTotal - liveClass.seatsFilled);
    await liveClass.save();

    // Notify via Socket.IO if active
    if (global.io) {
      global.io.to(String(studentId)).emit("live_class_payment_verified", {
        success: true,
        liveClassName: liveClass.title,
        paymentId: razorpay_payment_id,
      });
    }

    res.json({
      success: true,
      message: "Payment verified and enrollment activated",
      enrollment,
    });
  } catch (error) {
    console.error("Verify live class payment error:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

// ─── Cancel Live Class Payment ──────────────────────────────────────────────────────
export const cancelLiveClassPayment = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;

    const enrollment = await LiveClassEnrollment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: "failed" },
      { new: true }
    );

    res.json({ success: true, message: "Payment marked as failed/cancelled", enrollment });
  } catch (error) {
    console.error("Cancel live class payment error:", error);
    res.status(500).json({ message: "Failed to log cancelled payment" });
  }
};

// ─── Activate Free Live Class Directly ──────────────────────────────────────────────
export const activateFreeLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.body;
    const studentId = req.user.id || req.user._id;

    const liveClass = await LiveClass.findById(liveClassId);
    if (!liveClass) {
      return res.status(404).json({ message: "Live Class not found" });
    }

    if (liveClass.price !== 0) {
      return res.status(400).json({ message: "This live class is not free" });
    }

    // Check duplicate enrollment
    let enrollment = await LiveClassEnrollment.findOne({ student: studentId, liveClass: liveClassId });
    if (enrollment) {
      if (enrollment.status === "paid" || enrollment.status === "free") {
        return res.json({ success: true, message: "Already enrolled", enrollment });
      }
      enrollment.status = "free";
      enrollment.enrolledAt = new Date();
      await enrollment.save();
    } else {
      enrollment = await LiveClassEnrollment.create({
        student: studentId,
        liveClass: liveClassId,
        status: "free",
        amountPaid: 0,
        enrolledAt: new Date(),
      });
    }

    // Update seats filled and seats left in LiveClass
    liveClass.seatsFilled = (liveClass.seatsFilled || 0) + 1;
    liveClass.seatsLeft = Math.max(0, liveClass.seatsTotal - liveClass.seatsFilled);
    await liveClass.save();

    res.json({
      success: true,
      message: "Enrolled in free live class successfully",
      enrollment,
    });
  } catch (error) {
    console.error("Activate free live class error:", error);
    res.status(500).json({ message: "Failed to enroll in live class" });
  }
};

// ─── Check Enrollment Status ────────────────────────────────────────────────────────
export const checkLiveClassEnrollment = async (req, res) => {
  try {
    const { liveClassId } = req.params;
    const studentId = req.user.id || req.user._id;

    const enrollment = await LiveClassEnrollment.findOne({
      student: studentId,
      liveClass: liveClassId,
      status: { $in: ["paid", "free"] },
    });

    res.json({
      success: true,
      isEnrolled: !!enrollment,
    });
  } catch (error) {
    console.error("Check live class enrollment error:", error);
    res.status(500).json({ message: "Failed to check enrollment" });
  }
};

// ─── Get Enrolled Live Classes for a Student ─────────────────────────────────────────
export const getEnrolledLiveClasses = async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    const enrollments = await LiveClassEnrollment.find({
      student: studentId,
      status: { $in: ["paid", "free"] },
    }).populate("liveClass");

    const liveClasses = enrollments.map(e => e.liveClass).filter(Boolean);

    res.json({
      success: true,
      liveClasses,
    });
  } catch (error) {
    console.error("Get enrolled live classes error:", error);
    res.status(500).json({ message: "Failed to get enrolled live classes" });
  }
};
