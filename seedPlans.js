import mongoose from "mongoose"
import dotenv from "dotenv"
import SubscriptionPlan from "./models/SubscriptionPlan.js"

dotenv.config()

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("Connected to DB, seeding plans...")
  
  // Clear existing
  await SubscriptionPlan.deleteMany({})
  
  // Insert new plans
  await SubscriptionPlan.insertMany([
    {
      name: "Free Trial",
      description: "7-day free trial — 5 class bookings, 10 professor profile views",
      price: 0,
      currency: "INR",
      period: "7 days",
      maxSessions: 5,
      maxProfileViews: 10,
      priorityBooking: false,
      isActive: true
    },
    {
      name: "Basic",
      description: "Basic plan — view up to 20 profiles, book up to 10 sessions",
      price: 9900, // 99 INR
      currency: "INR",
      period: "monthly",
      maxSessions: 10,
      maxProfileViews: 20,
      priorityBooking: false,
      isActive: true
    },
    {
      name: "Premium",
      description: "Unlimited sessions, view up to 30 profiles, priority booking",
      price: 49900, // 499 INR
      currency: "INR",
      period: "monthly",
      maxSessions: null, // Unlimited
      maxProfileViews: 30,
      priorityBooking: true,
      isActive: true
    }
  ])
  
  console.log("Seed complete!")
  process.exit(0)
}).catch(err => {
  console.error("DB connection error", err)
  process.exit(1)
})
