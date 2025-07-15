const asyncHandler = require("express-async-handler");
const Post = require("../models/Post");
const Category = require("../models/Category");
const Comment = require("../models/Comment");
const { validationResult } = require("express-validator");

// Helper function for sending consistent error responses
const sendErrorResponse = (res, statusCode, message) => {
  res.status(statusCode);
  throw new Error(message);
};

// NEW: Helper function to convert plain text newlines to HTML paragraphs/breaks
const convertNewlinesToHtml = (text) => {
  if (!text) return "";

  // Check if content already contains HTML tags (e.g., from a rich text editor)
  // If it does, return as is to prevent re-processing.
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  // Normalize newlines to \n and trim overall leading/trailing whitespace
  text = text.replace(/\r\n/g, "\n").trim();

  // Split the text by two or more newlines to identify distinct paragraphs.
  // This treats blocks of text separated by empty lines as separate paragraphs.
  // Filter out any empty strings that might result from multiple newlines at start/end or in between.
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim() !== "");

  let htmlContent = paragraphs
    .map((p) => {
      // For each identified paragraph, replace single newlines with <br>
      // This maintains line breaks *within* a paragraph, if the user pressed Enter once.
      let paragraphContent = p.replace(/\n/g, "<br>");
      // Wrap each non-empty paragraph in <p> tags.
      return `<p>${paragraphContent.trim()}</p>`;
    })
    .join("");

  // If after processing, the content is still just whitespace or empty, return empty string
  if (!htmlContent.trim()) {
    return "";
  }

  return htmlContent;
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public (for published), Private/Admin (for draft/all based on query)
const getPosts = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;
  const keyword = req.query.keyword
    ? { title: { $regex: req.query.keyword, $options: "i" } }
    : {};

  let findQuery = { ...keyword };

  if (req.user && req.user.role === "admin") {
    if (req.query.status && ["published", "draft"].includes(req.query.status)) {
      findQuery.status = req.query.status;
    }
  } else {
    findQuery.status = "published";
  }

  const count = await Post.countDocuments(findQuery);
  const posts = await Post.find(findQuery)
    .populate("author", "name")
    .populate("category", "name")
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt: -1 });

  res.json({ posts, page, pages: Math.ceil(count / pageSize), count });
});

// @desc    Get single post by slug
// @route   GET /api/posts/:slug
// @access  Public (only published posts via slug), Admin (any status by ID)
const getPostBySlug = asyncHandler(async (req, res) => {
  let findQuery = { slug: req.params.slug };

  if (!req.user || req.user.role !== "admin") {
    findQuery.status = "published";
  }

  const post = await Post.findOne(findQuery)
    .populate("author", "name")
    .populate("category", "name");

  if (post) {
    res.json(post);
  } else {
    sendErrorResponse(res, 404, "Postingan tidak ditemukan.");
  }
});

// @desc    Get single post by ID (for admin editing)
// @route   GET /api/posts/id/:id
// @access  Private/Admin
const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate("author", "name")
    .populate("category", "name");

  if (post) {
    res.json(post);
  } else {
    sendErrorResponse(res, 404, "Postingan tidak ditemukan.");
  }
});

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private/Admin
const createPost = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let { title, content, category, status, image } = req.body;

  const existingCategory = await Category.findById(category);
  if (!existingCategory) {
    return sendErrorResponse(res, 400, "Kategori tidak ditemukan.");
  }

  // NEW: Convert content newlines to HTML before saving
  content = convertNewlinesToHtml(content);

  const post = new Post({
    title,
    slug: title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, ""),
    content,
    category,
    author: req.user._id,
    status: status || "draft",
    image: image || "/uploads/default-post.jpg",
  });

  const createdPost = await post.save();
  res.status(201).json(createdPost);
});

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private/Admin
const updatePost = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let { title, content, category, status, image } = req.body;

  const post = await Post.findById(req.params.id);

  if (post) {
    if (category) {
      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
        return sendErrorResponse(res, 400, "Kategori tidak ditemukan.");
      }
    }

    // NEW: Convert content newlines to HTML before updating
    content = convertNewlinesToHtml(content);

    post.title = title || post.title;
    post.slug = title
      ? title
          .toLowerCase()
          .replace(/ /g, "-")
          .replace(/[^\w-]+/g, "")
      : post.slug;
    post.content = content || post.content;
    post.category = category || post.category;
    post.status = status || post.status;
    post.image = image || post.image;

    const updatedPost = await post.save();
    res.json(updatedPost);
  } else {
    sendErrorResponse(res, 404, "Postingan tidak ditemukan.");
  }
});

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private/Admin
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (post) {
    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ message: "Postingan berhasil dihapus." });
  } else {
    sendErrorResponse(res, 404, "Postingan tidak ditemukan.");
  }
});

// --- Comment Controllers ---

// @desc    Get comments for a specific post
// @route   GET /api/posts/:postId/comments
// @access  Public
const getPostComments = asyncHandler(async (req, res) => {
  const postId = req.params.postId;
  const comments = await Comment.find({ post: postId })
    .populate("user", "name")
    .sort({ createdAt: 1 });

  res.json(comments);
});

// @desc    Add a comment to a post
// @route   POST /api/posts/:postId/comments
// @access  Private (User must be logged in to comment)
const addCommentToPost = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content } = req.body;
  const postId = req.params.postId;
  const userId = req.user._id;

  const postExists = await Post.findById(postId);
  if (!postExists) {
    return sendErrorResponse(res, 404, "Postingan tidak ditemukan.");
  }

  const comment = new Comment({
    post: postId,
    user: userId,
    content,
  });

  const createdComment = await comment.save();

  const populatedComment = await Comment.findById(createdComment._id).populate(
    "user",
    "name"
  );

  res.status(201).json(populatedComment);
});

// @desc    Update a comment
// @route   PUT /api/posts/:postId/comments/:commentId
// @access  Private (Owner of comment or Admin)
const updateComment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content } = req.body;
  const { postId, commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return sendErrorResponse(res, 404, "Komentar tidak ditemukan.");
  }

  // Pastikan komentar ini milik postingan yang benar
  if (comment.post.toString() !== postId) {
    return sendErrorResponse(
      res,
      400,
      "Komentar tidak terkait dengan postingan ini."
    );
  }

  // Hanya pemilik komentar atau admin yang bisa mengedit
  if (
    comment.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return sendErrorResponse(
      res,
      403,
      "Tidak diotorisasi untuk mengedit komentar ini."
    );
  }

  comment.content = content || comment.content; // Pastikan content tidak kosong

  const updatedComment = await comment.save();

  // Populate user info before sending response
  const populatedComment = await Comment.findById(updatedComment._id).populate(
    "user",
    "name"
  );

  res.json(populatedComment);
});

// @desc    Delete a comment
// @route   DELETE /api/posts/:postId/comments/:commentId
// @access  Private (Owner of comment or Admin)
const deleteComment = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return sendErrorResponse(res, 404, "Komentar tidak ditemukan.");
  }

  // Pastikan komentar ini milik postingan yang benar
  if (comment.post.toString() !== postId) {
    return sendErrorResponse(
      res,
      400,
      "Komentar tidak terkait dengan postingan ini."
    );
  }

  // Hanya pemilik komentar atau admin yang bisa menghapus
  if (
    comment.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return sendErrorResponse(
      res,
      403,
      "Tidak diotorisasi untuk menghapus komentar ini."
    );
  }

  await comment.deleteOne();
  res.json({ message: "Komentar berhasil dihapus." });
});

module.exports = {
  getPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getPostComments,
  addCommentToPost,
  updateComment, // Export fungsi baru
  deleteComment, // Export fungsi baru
};
