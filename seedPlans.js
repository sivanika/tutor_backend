import mongoose from "mongoose";
import dotenv from "dotenv";
import SubscriptionPlan from "./models/SubscriptionPlan.js";
import path from "path";
import { fileURLToPath } from "url";

// Load env
dotenv.config();

const plans = [
    // ── STUDENT PLANS ────────────────────────────────────────────────────────
    {
        name: "Basic Student",
        description: "Perfect for getting started",
        price: 0,
        currency: "INR",
        period: "monthly",
        targetAudience: "student",
        maxSessions: 2,
        maxProfileViews: 5,
        priorityBooking: false,
        isActive: true
    },
    {
        name: "Premium Student",
        description: "More sessions and faster bookings",
        price: 9900, // ₹99 in paise
        currency: "INR",
        period: "monthly",
        targetAudience: "student",
        maxSessions: 10,
        maxProfileViews: 30,
        priorityBooking: true,
        isActive: true
    },
    {
        name: "Pro Premium Student",
        description: "Unlimited learning and profile access",
        price: 49900, // ₹499 in paise
        currency: "INR",
        period: "monthly",
        targetAudience: "student",
        maxSessions: null, // Unlimited
        maxProfileViews: null, // Unlimited
        priorityBooking: true,
        isActive: true
    },
    // ── PROFESSOR PLANS ──────────────────────────────────────────────────────
    {
        name: "Basic Professor",
        description: "Essential listing for tutors",
        price: 49900, // ₹499 in paise
        currency: "INR",
        period: "monthly",
        targetAudience: "professor",
        isActive: true
    },
    {
        name: "Premium Professor",
        description: "Featured listing and advanced tools",
        price: 99900, // ₹999 in paise
        currency: "INR",
        period: "monthly",
        targetAudience: "professor",
        isActive: true
    },
    {
        name: "All Access",
        description: "Yearly membership with maximum visibility",
        price: 199900, // ₹1999 in paise
        currency: "INR",
        period: "yearly",
        targetAudience: "professor",
        isActive: true
    }
];

const seedDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in .env");
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        // Clear existing plans
        await SubscriptionPlan.deleteMany({});
        console.log("Cleared existing subscription plans.");

        // Insert new plans
        await SubscriptionPlan.insertMany(plans);
        console.log("Custom subscription plans seeded successfully!");

        mongoose.connection.close();
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedDB();
