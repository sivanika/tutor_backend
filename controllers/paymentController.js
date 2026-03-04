import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Plan definitions matching the home page pricing
const PLANS = {
    free_trial: {
        name: "Free Trial",
        amount: 0,          // ₹0
        currency: "INR",
        period: "7 days",
        description: "7-day free trial — access to limited tutors, 2 demo sessions",
    },
    premium: {
        name: "Premium",
        amount: 9900,       // ₹99 in paise (Razorpay uses smallest currency unit)
        currency: "INR",
        period: "monthly",
        description: "Unlimited sessions, all verified professors, priority booking",
    },
    pay_per_session: {
        name: "Pay Per Session",
        amount: 0,          // No upfront fee; 18% commission applied per session
        currency: "INR",
        period: "per session",
        description: "18% platform commission per session — no monthly fee",
    },
};

// ─── Create Razorpay Order ───────────────────────────────────────────────────
export const createOrder = async (req, res) => {
    try {
        const { plan } = req.body;

        if (!PLANS[plan]) {
            return res.status(400).json({ message: "Invalid plan selected" });
        }

        const selectedPlan = PLANS[plan];

        // Free plans don't need a payment order
        if (selectedPlan.amount === 0) {
            return res.json({
                free: true,
                plan,
                planName: selectedPlan.name,
                message: `${selectedPlan.name} activated successfully`,
            });
        }

        const options = {
            amount: selectedPlan.amount, // in paise
            currency: selectedPlan.currency,
            receipt: `receipt_${plan}_${Date.now()}`,
            notes: {
                plan,
                userId: req.user.id,
            },
        };

        const order = await razorpay.orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            plan,
            planName: selectedPlan.name,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ message: "Failed to create payment order" });
    }
};

// ─── Verify Payment Signature ────────────────────────────────────────────────
export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // Payment verified — update user subscription
        const updateData = {
            subscriptionTier: plan,
            subscriptionStatus: "active",
            subscriptionStartDate: new Date(),
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
        };

        // Set expiry for premium monthly plan
        if (plan === "premium") {
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + 1);
            updateData.subscriptionExpiryDate = expiry;
        } else if (plan === "free_trial") {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 7);
            updateData.subscriptionExpiryDate = expiry;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id || req.user.id,
            { $set: updateData },
            { new: true, runValidators: false }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            success: true,
            message: "Payment verified and subscription activated",
            plan,
            paymentId: razorpay_payment_id,
        });
    } catch (error) {
        console.error("Verify payment error:", error);
        res.status(500).json({ message: "Payment verification failed" });
    }
};

// ─── Activate Free / Commission Plan (no payment required) ──────────────────
export const activateFreePlan = async (req, res) => {
    try {
        const { plan } = req.body;

        if (!["free_trial", "pay_per_session"].includes(plan)) {
            return res.status(400).json({ message: "Invalid free plan" });
        }

        const updateData = {
            subscriptionTier: plan,
            subscriptionStatus: "active",
            subscriptionStartDate: new Date(),
        };

        if (plan === "free_trial") {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 7);
            updateData.subscriptionExpiryDate = expiry;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id || req.user.id,
            { $set: updateData },
            { new: true, runValidators: false }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            success: true,
            message: `${PLANS[plan].name} plan activated`,
            plan,
        });
    } catch (error) {
        console.error("Activate free plan error:", error);
        res.status(500).json({ message: "Failed to activate plan" });
    }
};

// ─── Professor: Activate Platform Listing (free — 18% commission per session) 
export const activateProfessorListing = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id || req.user.id,
            {
                $set: {
                    subscriptionTier: "pay_per_session",
                    subscriptionStatus: "active",
                    commissionRate: 18,
                    subscriptionStartDate: new Date(),
                },
            },
            { new: true, runValidators: false }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            success: true,
            message: "Professor listing activated with 18% commission model",
            commissionRate: 18,
        });
    } catch (error) {
        console.error("Activate professor listing error:", error);
        res.status(500).json({ message: "Failed to activate listing" });
    }
};

// ─── Get Current Subscription ────────────────────────────────────────────────
export const getSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "subscriptionTier subscriptionStatus subscriptionStartDate subscriptionExpiryDate commissionRate razorpayPaymentId"
        );
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            subscriptionTier: user.subscriptionTier || null,
            subscriptionStatus: user.subscriptionStatus || "inactive",
            subscriptionStartDate: user.subscriptionStartDate,
            subscriptionExpiryDate: user.subscriptionExpiryDate,
            commissionRate: user.commissionRate,
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to get subscription" });
    }
};
