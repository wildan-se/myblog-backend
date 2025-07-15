const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path"); // Added for static files
const { notFound, errorHandler } = require("./middlewares/errorHandler");

dotenv.config({ path: ".env" });

const app = express();

// Middleware
app.use(express.json()); // Untuk parsing application/json
app.use(express.urlencoded({ extended: true })); // Untuk parsing application/x-www-form-urlencoded (jika ada)
app.use(cors());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes")); // NEW: Tambahkan rute upload

// Static folder for uploads
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Menggunakan path.join(__dirname, '..', 'uploads') untuk memastikan path absolut yang benar
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"))); // NEW: Sajikan folder uploads sebagai statis

// Custom error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
