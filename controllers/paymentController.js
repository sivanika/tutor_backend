import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";
import SubscriptionPlan from "../models/SubscriptionPlan.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Create Razorpay Order ───────────────────────────────────────────────────
export const createOrder = async (req, res) => {
    try {
        const { planId } = req.body; // Changed from 'plan' string to 'planId' Mongo ObjectId
        
        const selectedPlan = await SubscriptionPlan.findById(planId);

        if (!selectedPlan || !selectedPlan.isActive) {
            return res.status(400).json({ message: "Invalid or inactive plan selected" });
        }

        // Free plans don't need a payment order
        if (selectedPlan.price === 0) {
            return res.json({
                free: true,
                planId: selectedPlan._id,
                planName: selectedPlan.name,
                message: `${selectedPlan.name} activated successfully (Payment not required)`,
            });
        }

        const options = {
            amount: selectedPlan.price, // already in paise in DB
            currency: selectedPlan.currency || "INR",
            receipt: `receipt_${selectedPlan._id}_${Date.now()}`,
            notes: {
                planId: String(selectedPlan._id),
                userId: req.user.id,
            },
        };

        const order = await razorpay.orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            planId: selectedPlan._id,
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
            planId,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        const selectedPlan = await SubscriptionPlan.findById(planId);
        if(!selectedPlan) return res.status(404).json({ message: "Plan not found" });

        // Payment verified — update user subscription
        const updateData = {
            subscriptionPlan: selectedPlan._id,
            subscriptionTier: selectedPlan.name, // Legacy fallback
            subscriptionStatus: "active",
            subscriptionStartDate: new Date(),
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            // Reset limits
            currentPlanSessionsBooked: 0,
            viewedProfessors: [],
        };

        // Set expiry logic
        const expiry = new Date();
        if (selectedPlan.period && selectedPlan.period.includes("month")) {
            expiry.setMonth(expiry.getMonth() + 1);
        } else if (selectedPlan.period && selectedPlan.period.includes("day")) {
            // e.g. "7 days"
            const days = parseInt(selectedPlan.period) || 30;
            expiry.setDate(expiry.getDate() + days);
        } else {
            expiry.setMonth(expiry.getMonth() + 1); // default 1 month
        }
        updateData.subscriptionExpiryDate = expiry;

        const user = await User.findByIdAndUpdate(
            req.user._id || req.user.id,
            { $set: updateData },
            { new: true, runValidators: false }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            success: true,
            message: "Payment verified and subscription activated",
            planId,
            planName: selectedPlan.name,
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
        const { planId, legacyPlan } = req.body;
        let selectedPlan;
        
        if (legacyPlan === "pay_per_session") {
             // Let them keep pay_per_session logic
             const user = await User.findByIdAndUpdate(
                req.user._id || req.user.id,
                { $set: { subscriptionTier: "pay_per_session", subscriptionStatus: "active", commissionRate: 18, subscriptionStartDate: new Date() } },
                { new: true, runValidators: false }
            );
            return res.json({ success: true, message: "Pay per session plan activated" });
        }

        selectedPlan = await SubscriptionPlan.findById(planId);
        if (!selectedPlan || selectedPlan.price !== 0) {
            return res.status(400).json({ message: "Invalid dynamic free plan" });
        }

        const updateData = {
            subscriptionPlan: selectedPlan._id,
            subscriptionTier: selectedPlan.name,
            subscriptionStatus: "active",
            subscriptionStartDate: new Date(),
            // Reset limits
            currentPlanSessionsBooked: 0,
            viewedProfessors: [],
        };

        const expiry = new Date();
        if (selectedPlan.period && selectedPlan.period.includes("day")) {
            const days = parseInt(selectedPlan.period) || 7;
            expiry.setDate(expiry.getDate() + days);
        } else if (selectedPlan.period && selectedPlan.period.includes("month")) {
            expiry.setMonth(expiry.getMonth() + 1);
        }
        updateData.subscriptionExpiryDate = expiry;

        const user = await User.findByIdAndUpdate(
            req.user._id || req.user.id,
            { $set: updateData },
            { new: true, runValidators: false }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            success: true,
            message: `${selectedPlan.name} plan activated`,
            planId: selectedPlan._id,
        });
    } catch (error) {
        console.error("Activate free plan error:", error);
        res.status(500).json({ message: "Failed to activate plan" });
    }
};

// ─── Professor: Activate Platform Listing ─────────────────────────
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
        const user = await User.findById(req.user.id)
            .populate("subscriptionPlan")
            .select("subscriptionTier subscriptionPlan subscriptionStatus subscriptionStartDate subscriptionExpiryDate commissionRate currentPlanSessionsBooked viewedProfessors");
            
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            subscriptionPlanId: user.subscriptionPlan?._id || null,
            subscriptionPlan: user.subscriptionPlan || null,
            subscriptionTier: user.subscriptionTier || null,
            subscriptionStatus: user.subscriptionStatus || "inactive",
            subscriptionStartDate: user.subscriptionStartDate,
            subscriptionExpiryDate: user.subscriptionExpiryDate,
            commissionRate: user.commissionRate,
            currentPlanSessionsBooked: user.currentPlanSessionsBooked || 0,
            viewedProfessorsCount: user.viewedProfessors?.length || 0,
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to get subscription" });
    }
};
