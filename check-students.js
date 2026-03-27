import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function checkStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const students = await User.find({ role: "student" }).select("name email profileCompleted gradeLevel specializations");
    console.log(`Found ${students.length} students:`);
    console.log(JSON.stringify(students, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

checkStudents();
