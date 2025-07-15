const express = require("express");
const { check } = require("express-validator");
const {
  getCategories,
  createCategory,
  updateCategory, // Import the new function
  deleteCategory, // Import the new function
} = require("../controllers/categoryController");
const { protect, admin } = require("../middlewares/authMiddleware");
const router = express.Router();

router
  .route("/")
  .get(getCategories)
  .post(
    protect,
    admin,
    [check("name", "Nama kategori wajib diisi").notEmpty()],
    createCategory
  );

// New routes for updating and deleting categories by ID
router
  .route("/:id")
  .put(
    protect,
    admin,
    [check("name", "Nama kategori wajib diisi").notEmpty()],
    updateCategory
  )
  .delete(protect, admin, deleteCategory);

module.exports = router;
