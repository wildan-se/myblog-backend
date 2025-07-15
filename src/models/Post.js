const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      // <<< Pastikan definisi ini benar untuk populate
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    author: {
      // <<< Pastikan definisi ini benar untuk populate
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      type: String, // URL gambar
      default: "/uploads/default-post.jpg", // Placeholder gambar
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", PostSchema);
module.exports = Post;
