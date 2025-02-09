const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async (email, resetToken) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Code - CupidCart",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ff4b6e;">Password Reset Code</h2>
                <p>You requested to reset your password for your CupidCart account.</p>
                <p>Your password reset code is:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #ff4b6e;">
                    ${resetToken}
                </div>
                <p style="color: #666; margin-top: 20px;">This code will expire in 10 minutes.</p>
                <p style="color: #666;">If you didn't request this, please ignore this email.</p>
            </div>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send reset email");
  }
};

const sendVerificationEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Email Verification - CupidCart",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4b6e;">Verify Your Email</h2>
        <p>Thank you for signing up with CupidCart!</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #ff4b6e;">
          ${otp}
        </div>
        <p style="color: #666; margin-top: 20px;">This code will expire in 10 minutes.</p>
        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send verification email");
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
};
