const app = require("./app");
const connectDB = require("./config/db");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

const startServer = async () => {
  try {
    await connectDB(); // Tunggu koneksi DB selesai
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(
        `Server running in ${
          process.env.NODE_ENV || "development"
        } mode on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
