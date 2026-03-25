import SubscriptionPlan from "../models/SubscriptionPlan.js"
import User from "../models/User.js"

// @desc    Get all active subscription plans (Public/Students)
// @route   GET /api/subscriptions/plans
// @access  Public (or protected)
export const getActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 })
    res.json(plans)
  } catch (err) {
    console.error("GET ACTIVE PLANS ERROR:", err)
    res.status(500).json({ message: "Failed to fetch plans" })
  }
}

// @desc    Get all subscription plans (Admin)
// @route   GET /api/subscriptions/admin/plans
// @access  Private/Admin
export const getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 })
    res.json(plans)
  } catch (err) {
    console.error("GET ALL PLANS ERROR:", err)
    res.status(500).json({ message: "Failed to fetch plans" })
  }
}

// @desc    Create new subscription plan
// @route   POST /api/subscriptions/admin/plans
// @access  Private/Admin
export const createPlan = async (req, res) => {
  try {
    const { name, description, price, currency, period, maxSessions, maxProfileViews, priorityBooking, isActive } = req.body

    const plan = await SubscriptionPlan.create({
      name,
      description,
      price,
      currency,
      period,
      maxSessions,
      maxProfileViews,
      priorityBooking,
      isActive
    })

    res.status(201).json(plan)
  } catch (err) {
    console.error("CREATE PLAN ERROR:", err)
    res.status(500).json({ message: "Failed to create plan" })
  }
}

// @desc    Update subscription plan
// @route   PUT /api/subscriptions/admin/plans/:id
// @access  Private/Admin
export const updatePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    
    if (!plan) return res.status(404).json({ message: "Plan not found" })
    
    res.json(plan)
  } catch (err) {
    console.error("UPDATE PLAN ERROR:", err)
    res.status(500).json({ message: "Failed to update plan" })
  }
}

// @desc    Delete subscription plan
// @route   DELETE /api/subscriptions/admin/plans/:id
// @access  Private/Admin
export const deletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id)
    
    if (!plan) return res.status(404).json({ message: "Plan not found" })
    
    res.json({ message: "Plan removed" })
  } catch (err) {
    console.error("DELETE PLAN ERROR:", err)
    res.status(500).json({ message: "Failed to delete plan" })
  }
}

// @desc    Manually update a user's subscription plan
// @route   PUT /api/subscriptions/admin/users/:userId/plan
// @access  Private/Admin
export const updateUserPlan = async (req, res) => {
  try {
    const { planId } = req.body
    
    const user = await User.findById(req.params.userId)
    if (!user) return res.status(404).json({ message: "User not found" })

    // If clearing the plan
    if (!planId) {
      user.subscriptionPlan = null
      user.subscriptionTier = "none"
      user.subscriptionStatus = "inactive"
      await user.save()
      return res.json({ message: "Plan removed from user", user })
    }

    const plan = await SubscriptionPlan.findById(planId)
    if (!plan) return res.status(404).json({ message: "Subscription plan not found" })

    user.subscriptionPlan = plan._id
    user.subscriptionTier = plan.name
    user.subscriptionStatus = "active"
    user.subscriptionStartDate = new Date()
    // Reset limits
    user.currentPlanSessionsBooked = 0
    user.viewedProfessors = []

    // Set expiry
    const expiry = new Date()
    if (plan.period && plan.period.includes("month")) {
        expiry.setMonth(expiry.getMonth() + 1)
    } else if (plan.period && plan.period.includes("day")) {
        const days = parseInt(plan.period) || 30
        expiry.setDate(expiry.getDate() + days)
    } else {
        expiry.setMonth(expiry.getMonth() + 1)
    }
    user.subscriptionExpiryDate = expiry

    await user.save()
    res.json({ message: `User upgraded to ${plan.name}`, user })
  } catch (err) {
    console.error("UPDATE USER PLAN ERROR:", err)
    res.status(500).json({ message: "Failed to update user plan" })
  }
}
