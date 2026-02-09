const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  getDashboardStats,
  getMyStudents,
  getProfile,
  updateProfile,
  updateCredentials
} = require("../controllers/professorDashboard.controller");

router.get("/stats", auth, getDashboardStats);
router.get("/students", auth, getMyStudents);
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);
router.put("/credentials", auth, updateCredentials);

module.exports = router;
