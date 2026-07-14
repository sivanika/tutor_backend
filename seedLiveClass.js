import mongoose from "mongoose";
import dotenv from "dotenv";
import LiveClass from "./models/LiveClass.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tutorhours";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Remove any existing sample to avoid duplicates
    await LiveClass.deleteOne({ title: "Agentic AI Engineering — Cohort 1" });

    const sample = await LiveClass.create({
      title: "Agentic AI Engineering — Cohort 1",
      category: "Artificial Intelligence",
      level: "Intermediate",
      instructor: "Prof. V. M. Venkateswara Rao, Ph.D.",
      instructorRole: "Founder & Lead Instructor, Vishidh Academy",
      startDate: "21 July 2026",
      schedule: "Mon / Wed / Fri · 7:00 – 8:30 PM IST",
      durationWeeks: 8,
      cohort: "Cohort 1 · July 2026",
      days: "Mon, Wed, Fri",
      time: "7:00 – 8:30 PM IST",
      seatsTotal: 40,
      seatsFilled: 27,
      seatsLeft: 13,
      price: 4999,
      mrp: 9999,
      rating: 4.8,
      ratingCount: 15,
      gradient: "linear-gradient(135deg,#1E9E8C,#12283B)",
      shortDesc:
        "A comprehensive 8-week live cohort on agent anatomy, planning loops, tools & memory — from zero to production.",
      longDesc:
        "Learn how to design, build, and deploy production-grade AI agents that reason, plan, and act autonomously. This cohort covers the full stack: from prompt engineering and tool use, through multi-agent orchestration frameworks (CrewAI, AutoGen), all the way to deploying robust agent pipelines in the cloud. Every session is live, recorded, and followed by hands-on assignments with mentor feedback.",
      prerequisites: [
        "Solid Python programming (functions, classes, async)",
        "Basic familiarity with REST APIs and JSON",
        "Some exposure to LLM APIs (OpenAI / Gemini) is a plus",
      ],
      syllabus: [
        { week: 1, topic: "Foundations of Agentic Systems",       details: "Agent anatomy, the perception-action loop, prompt anatomy" },
        { week: 2, topic: "Tool Use & Function Calling",           details: "OpenAI function-calling spec, Gemini tool_use, building custom tools" },
        { week: 3, topic: "Memory & Retrieval",                    details: "Short-term vs long-term memory, vector DBs (Chroma, Pinecone), RAG pipelines" },
        { week: 4, topic: "Planning Loops & ReAct",               details: "ReAct, Plan-and-Execute, Tree of Thought, benchmarking" },
        { week: 5, topic: "Multi-Agent Orchestration",             details: "CrewAI roles, AutoGen group chats, custom inter-agent protocols" },
        { week: 6, topic: "Guardrails & Evaluation",              details: "Input/output guardrails, evals with RAGAS, safety patterns" },
        { week: 7, topic: "Cloud Deployment & Observability",     details: "LangSmith tracing, Docker packaging, deploying to GCP / AWS Lambda" },
        { week: 8, topic: "Capstone & Demo Day",                  details: "Build & present a full agentic project; peer review; certificates" },
      ],
      isPublished: true,
      statusOverride: "auto",
      platform: "Zoom",
      meetingLink: "https://zoom.us/j/00000000000",
      autoRecord: true,
      trainerBio:
        "Dr. Rao has 18 years of experience in AI research and has shipped production ML systems at Google, Zoho, and multiple AI startups. He specialises in autonomous systems and multi-agent architectures.",
      whatsIncluded: [
        "Recorded backup of every class",
        "Downloadable notes & slides",
        "Graded assignments + mentor feedback",
        "Live Q&A after every session",
        "Attendance-linked certificate of completion",
        "Private WhatsApp cohort group access",
      ],
    });

    console.log("🚀 Sample live class created:");
    console.log(`   Title    : ${sample.title}`);
    console.log(`   Category : ${sample.category}`);
    console.log(`   Level    : ${sample.level}`);
    console.log(`   Start    : ${sample.startDate}`);
    console.log(`   ID       : ${sample._id}`);
  } catch (err) {
    console.error("❌ Seed error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seed();
