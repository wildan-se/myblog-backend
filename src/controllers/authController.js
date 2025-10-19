const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
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

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  let user; // Declare user outside try block

  try {
    console.log("🔍 Forgot password request received");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    console.log("📧 Looking for user with email:", email);

    user = await User.findOne({ email });

    if (!user) {
      console.log("❌ User not found with email:", email);
      return sendErrorResponse(
        res,
        404,
        "Tidak ada akun yang terdaftar dengan email tersebut."
      );
    }

    console.log("✅ User found:", user.name);

    // Get reset token
    console.log("🔑 Generating reset token...");
    const resetToken = user.getResetPasswordToken();
    console.log(
      "✅ Reset token generated:",
      resetToken.substring(0, 10) + "..."
    );

    console.log("💾 Saving user with reset token...");
    await user.save({ validateBeforeSave: false });
    console.log("✅ User saved with reset token");

    // Create reset url
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/reset-password/${resetToken}`;
    console.log("🔗 Reset URL created:", resetUrl);

    // Email template
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          color: #374151;
        }
        .content h2 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning p {
          margin: 0;
          color: #92400e;
          font-size: 14px;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Reset Password</h1>
        </div>
        <div class="content">
          <h2>Halo, ${user.name}!</h2>
          <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah ini untuk membuat password baru:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password Saya</a>
          </div>
          
          <div class="warning">
            <p><strong>⏰ Link ini akan kedaluwarsa dalam 15 menit.</strong></p>
          </div>
          
          <p>Jika Anda tidak meminta reset password, abaikan email ini dan password Anda akan tetap aman.</p>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
            Jika tombol tidak berfungsi, copy dan paste link berikut ke browser Anda:<br>
            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>Email ini dikirim oleh <strong>My Blog</strong></p>
          <p>Jika Anda memerlukan bantuan, hubungi kami di <a href="mailto:support@myblog.com">support@myblog.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

    // Check if email is configured
    const isEmailConfigured =
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      process.env.EMAIL_USER !== "your-email@gmail.com";

    console.log("📧 Email configured:", isEmailConfigured);

    if (isEmailConfigured) {
      // Production mode: Send actual email
      console.log("📤 Attempting to send email to:", user.email);
      await sendEmail({
        email: user.email,
        subject: "Reset Password - My Blog",
        html,
      });

      console.log("✅ Email sent successfully!");
      res.status(200).json({
        success: true,
        message: "Email reset password telah dikirim. Silakan cek inbox Anda.",
      });
    } else {
      // Development mode: Return reset URL in response
      console.log("=".repeat(80));
      console.log("📧 DEVELOPMENT MODE - Email Not Configured");
      console.log("=".repeat(80));
      console.log(`Reset Password URL for ${user.email}:`);
      console.log(resetUrl);
      console.log("=".repeat(80));
      console.log(
        "ℹ️  To enable email sending, configure EMAIL_USER and EMAIL_PASS in .env"
      );
      console.log("=".repeat(80));

      res.status(200).json({
        success: true,
        message:
          "Mode Development: Link reset password telah dibuat. Cek console backend untuk link.",
        resetUrl: resetUrl, // Only in development
        devMode: true,
      });
    }
  } catch (error) {
    console.error("❌ ERROR in forgotPassword:", error);
    console.error("Error stack:", error.stack);

    // Rollback reset token if user was found
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }

    return sendErrorResponse(
      res,
      500,
      "Terjadi kesalahan saat memproses permintaan. Silakan coba lagi nanti."
    );
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resetToken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return sendErrorResponse(
      res,
      400,
      "Token reset password tidak valid atau sudah kedaluwarsa."
    );
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message:
      "Password berhasil direset. Silakan login dengan password baru Anda.",
    token: generateToken(user._id),
  });
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  registerAdminUser,
  forgotPassword,
  resetPassword,
};
