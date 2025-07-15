const express = require("express");
const multer = require("multer");
const path = require("path");
const asyncHandler = require("express-async-handler");
const { protect, admin } = require("../middlewares/authMiddleware"); // Pastikan middleware diimpor

const router = express.Router();

// Konfigurasi penyimpanan Multer
const storage = multer.diskStorage({
  // destination: Fungsi untuk menentukan folder tujuan penyimpanan file.
  // req: Objek request Express.
  // file: Objek file yang diupload.
  // cb: Callback function (error, destination_path).
  destination(req, file, cb) {
    // cb(null, 'uploads/'): Menyimpan file di folder 'uploads/' yang ada di root backend.
    cb(null, "uploads/");
  },
  // filename: Fungsi untuk menentukan nama file yang disimpan.
  // req: Objek request Express.
  // file: Objek file yang diupload.
  // cb: Callback function (error, filename).
  filename(req, file, cb) {
    // cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`):
    // Membuat nama file unik:
    // - file.fieldname: Nama field dari form (misal: 'image').
    // - Date.now(): Timestamp saat ini untuk keunikan.
    // - path.extname(file.originalname): Ekstensi asli file (misal: .jpg, .png).
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// Fungsi untuk memfilter jenis file yang diizinkan (hanya gambar)
function checkFileType(file, cb) {
  // Tipe file yang diizinkan (regex).
  const filetypes = /jpe?g|png|gif|webp/;
  // Cek ekstensi file.
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Cek mime type.
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true); // Izinkan upload.
  } else {
    cb("Hanya gambar (JPG, JPEG, PNG, GIF, WEBP) yang diizinkan!"); // Tolak upload.
  }
}

// Inisialisasi Multer dengan konfigurasi penyimpanan dan filter file.
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Batasi ukuran file hingga 5MB.
});

// Rute POST untuk upload gambar.
// protect, admin: Middleware untuk memastikan hanya admin yang bisa mengupload.
// upload.single('image'): Middleware Multer untuk menangani upload satu file.
//                        'image' adalah nama field di form-data yang berisi file.
router.post(
  "/",
  protect, // Pastikan pengguna terautentikasi
  admin, // Pastikan pengguna adalah admin
  upload.single("image"), // 'image' adalah nama field di FormData dari frontend
  asyncHandler(async (req, res) => {
    // req.file: Objek yang berisi informasi tentang file yang diupload oleh Multer.
    if (req.file) {
      // Mengembalikan path file yang diupload.
      // Path disesuaikan agar dapat diakses publik melalui URL /uploads/.
      res.send({
        message: "Gambar berhasil diupload",
        image: `/uploads/${req.file.filename}`,
      });
    } else {
      res.status(400);
      throw new Error(
        "Tidak ada file gambar yang diupload atau format tidak didukung."
      );
    }
  })
);

module.exports = router;
