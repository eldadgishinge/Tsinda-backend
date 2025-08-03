require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// Function to close transporter (for cleanup)
function closeTransporter() {
  if (transporter) {
    transporter.close();
  }
}
  

// Function to replace template placeholders
function replacePlaceholders(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

// Function to send verification email with specific parameters
async function sendVerificationEmail(userEmail, userName, verificationCode) {
  try {
    // Validate required parameters
    if (!userEmail) {
      throw new Error('User email is required');
    }
    
    if (!userName) {
      throw new Error('User name is required');
    }
    
    if (!verificationCode) {
      throw new Error('Verification code is required');
    }
    
    // Read the HTML template from the templates directory
    const templatePath = path.join(__dirname, 'templates', 'verification-email-template.html');
    const template = await fs.readFile(templatePath, 'utf8');
    
    // Replace placeholders in the template
    const htmlContent = replacePlaceholders(template, {
      userName,
      verificationCode
    });
    
    // Setup email options
    const mailOptions = {
      from: '"Tsinda cyane" <noreply@example.com>',
      to: userEmail,
      subject: 'Your Verification Code',
      text: `Hello ${userName}, your verification code is: ${verificationCode}. This code will expire in 1h66 minutes.`,
      html: htmlContent
      // No attachments needed since logo is embedded in HTML
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendVerificationEmail,
  closeTransporter,
};