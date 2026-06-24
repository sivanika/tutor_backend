// Run once: node seedPositions.js
import "./config/env.js";
import connectDB from "./config/db.js";
import JobPosition from "./models/JobPosition.js";

await connectDB();

const positions = [
  {
    title: "Technical Support Specialist",
    type: "Full-time",
    location: "Remote",
    dept: "Support",
    description:
      "Help students and professors resolve platform issues, troubleshoot technical problems, and ensure a smooth learning experience. You will triage support tickets, maintain FAQs, and liaise with the engineering team.",
    skills: ["Customer support", "Basic troubleshooting", "Communication", "Ticketing systems"],
    isOpen: true,
  },
  {
    title: "Senior Technical Support Engineer",
    type: "Full-time",
    location: "Hybrid",
    dept: "Support",
    description:
      "Own complex technical issues escalated from Tier-1 support. Debug API problems, assist with account integrations, write internal runbooks, and mentor junior support staff.",
    skills: ["REST APIs", "Node.js basics", "MongoDB", "Debugging", "Mentoring"],
    isOpen: true,
  },
  {
    title: "Support Operations Analyst",
    type: "Part-time",
    location: "Remote",
    dept: "Support",
    description:
      "Analyse support data, identify recurring pain points, build dashboards for KPIs (response time, CSAT), and recommend process improvements to reduce ticket volume.",
    skills: ["Data analysis", "Excel / Sheets", "Reporting", "Process improvement"],
    isOpen: true,
  },
  {
    title: "Platform QA Tester",
    type: "Contract",
    location: "Remote",
    dept: "Quality Assurance",
    description:
      "Write and execute test cases for new features, perform regression testing, and help maintain a bug-free tutoring platform for thousands of students and professors.",
    skills: ["Manual testing", "Bug reporting", "Selenium basics", "Attention to detail"],
    isOpen: true,
  },
];

const existing = await JobPosition.countDocuments();
if (existing > 0) {
  console.log(`✅ ${existing} positions already in DB. Skipping seed.`);
  process.exit(0);
}

await JobPosition.insertMany(positions);
console.log("✅ Seeded 4 job positions successfully.");
process.exit(0);
