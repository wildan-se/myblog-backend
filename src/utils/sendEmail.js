const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  console.log("📧 sendEmail function called");
  console.log("Nodemailer object:", typeof nodemailer);
  console.log("createTransporter exists?", typeof nodemailer.createTransport);

  try {
    // Create transporter - note: it's createTransport not createTransporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("✅ Transporter created successfully");

    // Define email options
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || "MyBlog"} <${
        process.env.EMAIL_USER
      }>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    console.log("📤 Sending email to:", options.email);

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

module.exports = sendEmail;
