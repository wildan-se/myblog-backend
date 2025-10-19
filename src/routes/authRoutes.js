const express = require("express");
const { check } = require("express-validator");
const {
  registerUser,
  loginUser,
  getUserProfile,
  registerAdminUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post(
  "/register",
  [
    check("name", "Nama wajib diisi").notEmpty(),
    check("email", "Silakan sertakan email yang valid").isEmail(),
    check("password", "Kata sandi harus minimal 6 karakter").isLength({
      min: 6,
    }),
  ],
  registerUser
);
router.post(
  "/login",
  [
    check("email", "Silakan sertakan email yang valid").isEmail(),
    check("password", "Kata sandi wajib diisi").notEmpty(),
  ],
  loginUser
);
router.get("/profile", protect, getUserProfile);
router.post(
  "/register-admin",
  [
    check("name", "Nama wajib diisi").notEmpty(),
    check("email", "Silakan sertakan email yang valid").isEmail(),
    check("password", "Kata sandi harus minimal 6 karakter").isLength({
      min: 6,
    }),
    check("adminSecretKey", "Kunci rahasia admin wajib diisi").notEmpty(),
  ],
  registerAdminUser
);
router.post(
  "/forgot-password",
  [check("email", "Silakan sertakan email yang valid").isEmail()],
  forgotPassword
);
router.put(
  "/reset-password/:resetToken",
  [
    check("password", "Kata sandi harus minimal 6 karakter").isLength({
      min: 6,
    }),
  ],
  resetPassword
);

module.exports = router;
