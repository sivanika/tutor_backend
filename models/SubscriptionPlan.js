import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true }, // price in smallest currency unit (e.g., paise)
  currency: { type: String, default: "INR" },
  period: { type: String, default: "monthly" },
  targetAudience: { type: String, enum: ["student", "professor", "all"], default: "student" },
  
  // Feature Limits
  maxSessions: { 
    type: Number, 
    default: null // null means unlimited
  },
  maxProfileViews: { 
    type: Number, 
    default: null 
  },
  priorityBooking: { type: Boolean, default: false },

  // Admin control
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
