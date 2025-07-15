const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { validationResult } = require("express-validator");

// Helper function for sending consistent error responses
const sendErrorResponse = (res, statusCode, message) => {
  res.status(statusCode);
  throw new Error(message);
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return sendErrorResponse(
      res,
      400,
      "Pengguna dengan email ini sudah terdaftar."
    );
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    sendErrorResponse(res, 400, "Data pengguna tidak valid.");
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    sendErrorResponse(res, 401, "Email atau kata sandi tidak valid.");
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (user) {
    res.json(user);
  } else {
    sendErrorResponse(res, 404, "Pengguna tidak ditemukan.");
  }
});

// @desc    Register a new admin user (for initial setup or internal use)
// @route   POST /api/auth/register-admin
// @access  Public (or Private for specific setup)
const registerAdminUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, adminSecretKey } = req.body;

  if (
    process.env.ADMIN_REGISTRATION_SECRET &&
    adminSecretKey !== process.env.ADMIN_REGISTRATION_SECRET
  ) {
    return sendErrorResponse(res, 403, "Kunci rahasia admin tidak valid.");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return sendErrorResponse(
      res,
      400,
      "Pengguna dengan email ini sudah terdaftar."
    );
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "admin",
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    sendErrorResponse(res, 400, "Data pengguna admin tidak valid.");
  }
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  registerAdminUser,
};
