const asyncHandler = require("express-async-handler");
const Category = require("../models/Category");
const { validationResult } = require("express-validator");

// Helper function for sending consistent error responses
const sendErrorResponse = (res, statusCode, message) => {
  res.status(statusCode);
  throw new Error(message);
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  res.json(categories);
});

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;

  const categoryExists = await Category.findOne({ name });
  if (categoryExists) {
    return sendErrorResponse(res, 400, "Kategori dengan nama ini sudah ada.");
  }

  const category = new Category({
    name,
    slug: name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, ""),
  });

  const createdCategory = await category.save();
  res.status(201).json(createdCategory);
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;

  const category = await Category.findById(req.params.id);

  if (category) {
    // Check if new name already exists for another category
    if (name && name !== category.name) {
      const categoryExists = await Category.findOne({ name });
      if (categoryExists) {
        return sendErrorResponse(
          res,
          400,
          "Kategori dengan nama ini sudah ada."
        );
      }
    }

    category.name = name || category.name;
    category.slug = name
      ? name
          .toLowerCase()
          .replace(/ /g, "-")
          .replace(/[^\w-]+/g, "")
      : category.slug;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } else {
    sendErrorResponse(res, 404, "Kategori tidak ditemukan.");
  }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (category) {
    // Optional: Check if there are any posts associated with this category
    // If so, you might want to prevent deletion or reassign posts to a default category
    // For simplicity, we'll just delete it.
    await category.deleteOne();
    res.json({ message: "Kategori berhasil dihapus." });
  } else {
    sendErrorResponse(res, 404, "Kategori tidak ditemukan.");
  }
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory, // Export the new function
  deleteCategory, // Export the new function
};
