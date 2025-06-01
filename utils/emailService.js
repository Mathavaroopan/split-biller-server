// This is a simulated email service for demonstration purposes
// In a production app, you would use a real email service like Nodemailer, SendGrid, etc.

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an invite email to a user
 * @param {string} email - Recipient email address
 * @param {string} inviterName - Name of the user who sent the invite
 * @param {string} groupName - Name of the group they're invited to
 * @param {string} inviteLink - Link to accept the invitation
 * @returns {Promise} - Promise that resolves when email is sent
 */
const sendInviteEmail = async (email, inviterName, groupName, inviteLink) => {
  try {
    // Create full invite link with base URL for frontend
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const fullInviteLink = `${baseUrl}${inviteLink}`;
    
    // Email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Split-Biller" <noreply@split-biller.com>',
      to: email,
      subject: `You've been invited to join a group on Split-Biller`,
      text: `
        Hello,
        
        ${inviterName} has invited you to join the group "${groupName}" on Split-Biller.
        
        Click the link below to accept the invitation:
        ${fullInviteLink}
        
        This invitation link will expire in 48 hours.
        
        Best regards,
        The Split-Biller Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to Split-Biller</h2>
          <p><strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on Split-Biller.</p>
          <p>Click the button below to accept the invitation:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${fullInviteLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666;">This invitation link will expire in 48 hours.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            ${fullInviteLink}
          </p>
        </div>
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Invite email sent: ${info.messageId}`);
    
    return info;
  } catch (error) {
    console.error('Error sending invite email:', error);
    throw new Error('Failed to send invitation email');
  }
};

/**
 * Send a notification email to a user
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email content
 * @returns {Promise} - Promise that resolves when email is sent
 */
const sendNotificationEmail = async (email, subject, message) => {
  try {
    // Email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Split-Biller" <noreply@split-biller.com>',
      to: email,
      subject,
      text: `
        Hello,
        
        ${message}
        
        Best regards,
        The Split-Biller Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${subject}</h2>
          <p>${message}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from Split-Biller.
          </p>
        </div>
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notification email sent: ${info.messageId}`);
    
    return info;
  } catch (error) {
    console.error('Error sending notification email:', error);
    throw new Error('Failed to send notification email');
  }
};

module.exports = { sendInviteEmail, sendNotificationEmail }; 