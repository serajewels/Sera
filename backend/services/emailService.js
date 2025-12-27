// services/emailService.js
const nodemailer = require('nodemailer');

// Create transporter with Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP Configuration Error:', error);
  } else {
    console.log('✅ SMTP Server is ready to send emails');
  }
});

// Send OTP Email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Sera Jewelry" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Sera - Email Verification OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #fdf2f8;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #c5a666 0%, #b09458 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 300;
            letter-spacing: 3px;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .content h2 {
            color: #333;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .content p {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .otp-box {
            background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
            border: 2px solid #c5a666;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            display: inline-block;
          }
          .otp-code {
            font-size: 48px;
            font-weight: bold;
            color: #c5a666;
            letter-spacing: 12px;
            margin: 0;
            font-family: 'Courier New', monospace;
          }
          .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 5px 0;
          }
          .note {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            color: #856404;
            font-size: 14px;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SERA</h1>
          </div>
          <div class="content">
            <h2>Welcome to Sera Jewelry! ✨</h2>
            <p>Thank you for registering with us. To complete your registration, please verify your email address using the OTP below:</p>
            
            <div class="otp-box">
              <p class="otp-code">${otp}</p>
            </div>
            
            <div class="note">
              <strong>⏱️ Important:</strong> This OTP is valid for <strong>10 minutes</strong> only. Please enter it on the registration page to verify your email.
            </div>
            
            <p style="margin-top: 30px; color: #999; font-size: 14px;">
              If you didn't request this verification, please ignore this email or contact our support team.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Sera Jewelry. All rights reserved.</p>
            <p>Timeless elegance for every occasion.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { sendOTPEmail };
