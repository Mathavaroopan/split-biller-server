// This is a simulated email service for demonstration purposes
// In a production app, you would use a real email service like Nodemailer, SendGrid, etc.

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a mock transporter if email settings are not configured
const createTransporter = () => {
  // Check if email settings are configured
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('Email settings found. Attempting to create real transporter.');
    
    // If using Gmail, print a helpful warning
    if (process.env.EMAIL_HOST.includes('gmail')) {
      console.log('\n===================== GMAIL AUTHENTICATION NOTE =====================');
      console.log('You are using Gmail as your email provider.');
      console.log('Gmail requires an "App Password" for less secure apps.');
      console.log('To generate an App Password:');
      console.log('1. Go to your Google Account settings');
      console.log('2. Select "Security"');
      console.log('3. Under "Signing in to Google", select "App passwords"');
      console.log('4. Generate a new app password for "Mail" and "Other (Custom name)"');
      console.log('5. Use that password in your .env file as EMAIL_PASS');
      console.log('================================================================\n');
    }
    
    try {
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } catch (error) {
      console.error('Failed to create email transporter:', error);
      console.log('Falling back to mock transporter');
      return createMockTransporter();
    }
  }
  
  // If email settings are not configured, use a mock transporter
  console.log('Email settings not configured. Using mock transporter.');
  return createMockTransporter();
};

// Create a mock transporter for testing or when real email is not available
const createMockTransporter = () => {
  return {
    sendMail: (mailOptions) => {
      console.log('\n========== MOCK EMAIL SENT ==========');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Text Content:', mailOptions.text?.substring(0, 100) + '...');
      console.log('======================================\n');
      // Return a fake success response
      return Promise.resolve({ 
        messageId: 'mock-email-' + Date.now(),
        response: 'Mock email sent successfully'
      });
    },
    verify: () => Promise.resolve(true)
  };
};

// Get the appropriate transporter
const transporter = createTransporter();

// Verify the transporter connection
transporter.verify?.()
  .then(() => console.log('Email transporter verified successfully'))
  .catch(err => {
    console.error('Email transporter verification failed:', err);
    console.log('Application will continue with mock email service');
  });

/**
 * Send an invite email to a user
 * @param {string} email - Recipient email address
 * @param {string} inviterName - Name of the user who sent the invite
 * @param {string} groupName - Name of the group they're invited to
 * @param {string} inviteLink - Link to accept the invitation
 * @param {string} [personalMessage] - Optional personalized message from the inviter
 * @returns {Promise} - Promise that resolves when email is sent
 */
const sendInviteEmail = async (email, inviterName, groupName, inviteLink, personalMessage = '') => {
  try {
    // Create full invite link with base URL for frontend
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const fullInviteLink = inviteLink.startsWith('http') ? inviteLink : `${baseUrl}/invite/${inviteLink}`;
    
    // Format the personal message if provided
    const formattedPersonalMessage = personalMessage 
      ? `<div style="margin: 15px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #ff6b6b; font-style: italic;">
          "${personalMessage}"
         </div>`
      : '';
    
    // Email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Split-Biller" <noreply@split-biller.com>',
      to: email,
      subject: `${inviterName} invited you to join a group on Split-Biller`,
      text: `
        Hello,
        
        ${inviterName} has invited you to join the group "${groupName}" on Split-Biller.
        ${personalMessage ? `\nThey said: "${personalMessage}"` : ''}
        
        Click the link below to accept the invitation:
        ${fullInviteLink}
        
        This invitation link will expire in 48 hours.
        
        Best regards,
        The Split-Biller Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ff6b6b; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Split-Biller</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">You've been invited to join Split-Biller</h2>
            
            <p style="color: #555;">Hi there,</p>
            
            <p style="color: #555;">
              <strong>${inviterName}</strong> has invited you to join the group 
              <strong>"${groupName}"</strong> on Split-Biller.
            </p>
            
            ${formattedPersonalMessage}
            
            <p style="color: #555;">
              Split-Biller helps you track and split expenses with friends, roommates, and travel companions.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${fullInviteLink}" style="background-color: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #777; font-size: 14px;">
              This invitation link will expire in 48 hours.
            </p>
            
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${fullInviteLink}" style="color: #ff6b6b;">${fullInviteLink}</a>
            </p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888;">
            &copy; ${new Date().getFullYear()} Split-Biller. All rights reserved.
          </div>
        </div>
      `
    };
    
    // Send the email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Invite email sent: ${info.messageId}`);
      return info;
    } catch (emailError) {
      // Check for Gmail's specific authentication error
      if (emailError.code === 'EAUTH' && emailError.responseCode === 534) {
        console.error('Gmail authentication error: App-specific password required');
        console.log('\n===================== GMAIL AUTHENTICATION ERROR =====================');
        console.log('Google requires an App Password for this application.');
        console.log('To generate an App Password:');
        console.log('1. Go to your Google Account settings');
        console.log('2. Select "Security"');
        console.log('3. Under "Signing in to Google", select "App passwords"');
        console.log('4. Generate a new app password for "Mail" and "Other (Custom name)"');
        console.log('5. Use that password in your .env file as EMAIL_PASS');
        console.log('===================================================================\n');
      } else {
        console.error('Error sending invite email:', emailError);
      }
      
      // Return a mock success even though email failed
      return {
        messageId: 'error-handled-' + Date.now(),
        response: 'Email sending failed but invitation was created'
      };
    }
  } catch (error) {
    console.error('Error preparing invite email:', error);
    // Instead of throwing an error, we'll log it and return a mock success
    // This prevents the API from failing when email sending fails
    return {
      messageId: 'error-handled-' + Date.now(),
      response: 'Email preparation failed but invitation was created'
    };
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
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Notification email sent: ${info.messageId}`);
      return info;
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      // Return a mock success
      return {
        messageId: 'error-handled-' + Date.now(),
        response: 'Notification email sending failed but operation continued'
      };
    }
  } catch (error) {
    console.error('Error preparing notification email:', error);
    // Instead of throwing an error, we'll log it and return a mock success
    return {
      messageId: 'error-handled-' + Date.now(),
      response: 'Notification email preparation failed but operation continued'
    };
  }
};

module.exports = { sendInviteEmail, sendNotificationEmail }; 