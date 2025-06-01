# Split-Biller Server

This is the backend server for the Split-Biller application, which helps groups track and split expenses.

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on the example below
4. Start the server: `npm run dev`

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/split-biller?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-secret-key-for-jwt-tokens
JWT_EXPIRATION=24h

# Frontend URL for links
FRONTEND_URL=http://localhost:3000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Split-Biller <your-email@gmail.com>
```

## Email Configuration

### For Gmail Users (Important)

If you're using Gmail as your email provider, you **must** use an app-specific password, not your regular account password.

To generate an app-specific password:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Select "Security" from the left menu
3. Under "Signing in to Google", select "App passwords" 
   (If you don't see this option, make sure 2-Step Verification is enabled)
4. Generate a new app password for "Mail" and "Other (Custom name)" - you can name it "Split-Biller"
5. Use the generated password in your `.env` file as `EMAIL_PASS`

### For Other Email Providers

For providers like Outlook, SendGrid, etc., use the appropriate SMTP settings:

```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
EMAIL_FROM=Split-Biller <your-email@outlook.com>
```

### Disabling Email Sending

If you want to disable real email sending and use mock emails instead, simply comment out or remove all the `EMAIL_*` variables from your `.env` file.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

### Groups
- `GET /api/groups` - Get all user's groups
- `POST /api/groups` - Create a new group
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/:id/invite` - Invite a user to a group
- `GET /api/groups/:id/invitations` - Get pending invitations for a group
- `POST /api/groups/:id/invite/resend/:inviteId` - Resend an invitation
- `GET /api/groups/join/:token` - Join a group via invitation token

### Expenses
- `POST /api/expenses` - Create a new expense
- `GET /api/groups/:id/expenses` - Get all expenses for a group
- `DELETE /api/expenses/:id` - Delete an expense 