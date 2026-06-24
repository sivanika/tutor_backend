import express from "express";
import multer from "multer";
import BlogPost from "../models/BlogPost.js";
import AdminLog from "../models/AdminLog.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js";

const router = express.Router();

/* Multer — accept a single cover image field */
const upload = multer({ dest: "uploads/" });

/* ============================
   PUBLIC — GET ALL PUBLISHED POSTS
   GET /api/blog
============================ */
router.get("/", async (req, res) => {
  try {
    const posts = await BlogPost.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .select("-content"); // listing doesn't need full content
    res.json(posts);
  } catch (err) {
    console.error("BLOG FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to load blog posts" });
  }
});

/* ============================
   PUBLIC — GET SINGLE POST
   GET /api/blog/:id
============================ */
router.get("/:id", async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Failed to load post" });
  }
});

/* ============================
   ADMIN — GET ALL POSTS (including drafts)
   GET /api/blog/admin/all
============================ */
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    const posts = await BlogPost.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");
    res.json(posts);
  } catch (err) {
    console.error("ADMIN BLOG FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to load blog posts" });
  }
});

/* ============================
   ADMIN — CREATE POST
   POST /api/blog
============================ */
router.post("/", protect, adminOnly, upload.single("coverImage"), async (req, res) => {
  try {
    const { title, excerpt, content, category, author, img, isPublished } = req.body;

    if (!title || !excerpt || !category || !author) {
      return res.status(400).json({ message: "Title, excerpt, category, and author are required" });
    }

    // File upload takes priority over URL
    let imageUrl = img || "";
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, "tutor-hours/blog");
      imageUrl = uploadResult.secure_url;
    }

    const post = await BlogPost.create({
      title,
      excerpt,
      content: content || "",
      category,
      author,
      img: imageUrl,
      isPublished: isPublished !== undefined ? (isPublished === "true" || isPublished === true) : true,
      createdBy: req.user.id,
    });

    await AdminLog.create({
      admin: req.user.id,
      action: "Created Blog Post",
      target: title,
      description: `Blog post "${title}" created in category "${category}"`,
    });

    res.status(201).json(post);
  } catch (err) {
    console.error("BLOG CREATE ERROR:", err);
    res.status(500).json({ message: "Failed to create blog post" });
  }
});

/* ============================
   ADMIN — UPDATE POST
   PUT /api/blog/:id
============================ */
router.put("/:id", protect, adminOnly, upload.single("coverImage"), async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const { title, excerpt, content, category, author, img, isPublished } = req.body;

    if (title !== undefined) post.title = title;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (content !== undefined) post.content = content;
    if (category !== undefined) post.category = category;
    if (author !== undefined) post.author = author;
    if (img !== undefined) post.img = img;
    if (isPublished !== undefined) post.isPublished = (isPublished === "true" || isPublished === true);

    // File upload takes priority over URL
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, "tutor-hours/blog");
      post.img = uploadResult.secure_url;
    }

    await post.save();

    await AdminLog.create({
      admin: req.user.id,
      action: "Updated Blog Post",
      target: post.title,
      description: `Blog post "${post.title}" updated`,
    });

    res.json(post);
  } catch (err) {
    console.error("BLOG UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update blog post" });
  }
});

/* ============================
   ADMIN — DELETE POST
   DELETE /api/blog/:id
============================ */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const title = post.title;
    await BlogPost.findByIdAndDelete(req.params.id);

    await AdminLog.create({
      admin: req.user.id,
      action: "Deleted Blog Post",
      target: title,
      description: `Blog post "${title}" permanently deleted`,
    });

    res.json({ success: true, message: "Blog post deleted" });
  } catch (err) {
    console.error("BLOG DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete blog post" });
  }
});

/* ============================
   ADMIN — TOGGLE PUBLISH STATUS
   PUT /api/blog/:id/toggle-publish
============================ */
router.put("/:id/toggle-publish", protect, adminOnly, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.isPublished = !post.isPublished;
    await post.save();

    await AdminLog.create({
      admin: req.user.id,
      action: `${post.isPublished ? "Published" : "Unpublished"} Blog Post`,
      target: post.title,
      description: `Blog post "${post.title}" ${post.isPublished ? "published" : "set to draft"}`,
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle publish status" });
  }
});

export default router;
