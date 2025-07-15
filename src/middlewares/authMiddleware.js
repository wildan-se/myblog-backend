const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (err) {
      console.error(err);
      res.status(401);
      throw new Error("Tidak diotorisasi, token gagal.");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Tidak diotorisasi, tidak ada token.");
  }
});

// NEW: Optional Protect Middleware
// Middleware ini akan mencoba memverifikasi token jika ada.
// Jika valid, req.user akan diisi. Jika tidak ada token atau tidak valid,
// req.user akan tetap undefined, dan request akan tetap dilanjutkan.
const optionalProtect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      // Jika token valid, req.user diisi. Lanjutkan ke middleware/controller berikutnya.
    } catch (err) {
      // Jika token tidak valid/kadaluarsa, log error tetapi jangan hentikan request.
      // req.user akan tetap undefined, yang baik untuk akses publik.
      console.error(
        "Optional protect: Token tidak valid atau kadaluarsa, melanjutkan sebagai tidak terautentikasi."
      );
    }
  }
  // Jika tidak ada token, req.user tetap undefined.
  next(); // Lanjutkan request
});

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Tidak diotorisasi sebagai admin.");
  }
};

module.exports = { protect, admin, optionalProtect };
