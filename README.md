# Bulk Email Platform

A modern, serverless-optimized platform that allows users to send bulk emails using their own Gmail accounts with advanced batch processing for concurrent user support. Each user can authenticate with their own Gmail account and send emails from their personal email address.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Express API   │    │   Gmail API     │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Direct)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   MongoDB       │
                        │   (Cloud)       │
                        └─────────────────┘
```

## ✨ Features

### Core Features

- **Multi-User Support**: Each user can connect their own Gmail account
- **OAuth2 Authentication**: Secure Google OAuth integration
- **Campaign Management**: Create, track, and manage email campaigns
- **Real-time Status**: Track email delivery status and campaign progress
- **Template System**: Pre-built email templates for quick setup
- **Secure Storage**: Encrypted credential storage in MongoDB
- **Google Sheets Integration**: Import recipient lists from Google Sheets

### Advanced Features

- **Batch Processing**: Smart batch processing to handle large email lists
- **Concurrent Users**: Multiple users can send campaigns simultaneously
- **Serverless Optimized**: Designed for Vercel serverless functions
- **Auto-Continuation**: Campaigns automatically resume if interrupted
- **Retry Logic**: Intelligent retry mechanism for failed emails
- **Progress Tracking**: Real-time progress updates during sending
- **Non-Blocking Processing**: Each API call processes small batches (3-5 emails)

### Performance Features

- **Timeout Management**: Respects Vercel's 45-second timeout limits
- **Rate Limiting**: Prevents Gmail API rate limit violations
- **Memory Efficient**: Low memory footprint per serverless function
- **Fault Tolerant**: Handles network issues and temporary failures

## 🚀 Setup Instructions

### Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB Atlas Account** (free tier available)
3. **Google Cloud Project** with Gmail API enabled
4. **Google OAuth2 Credentials**
5. **Vercel Account** (for production deployment)

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs:
     - Development: `http://localhost:3001/auth/google/callback`
     - Production: `https://your-backend-url.vercel.app/auth/google/callback`
   - Save the Client ID and Client Secret

### 2. MongoDB Setup

1. Create a free MongoDB Atlas account at [mongodb.com](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Whitelist your IP addresses (or use 0.0.0.0/0 for development)

### 3. Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd bulk-email-platform/backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment file:

   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:

   ```env
   # Backend Environment Variables
   PORT=3001
   NODE_ENV=development

   # JWT Secret (generate a strong secret)
   JWT_SECRET=your-super-secret-jwt-key-here-change-in-production

   # Encryption Key (32-character string for credential encryption)
   ENCRYPTION_KEY=your-32-character-encryption-key-here

   # Google OAuth Credentials (from Step 1)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

   # Frontend URL
   FRONTEND_URL=http://localhost:3000

   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=bulk_email_platform

   # Email Processing Configuration
   EMAIL_BATCH_SIZE=3
   MAX_PROCESSING_TIME=30000
   EMAIL_DELAY_MS=1000
   MAX_RETRIES=2

   # Rate Limiting
   RATE_LIMIT_POINTS=50
   RATE_LIMIT_DURATION=60
   MAX_EMAILS_PER_CAMPAIGN=1000

   # System Configuration
   SYSTEM_SECRET_KEY=super_secret_system_key_2024
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

### 4. Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd bulk-email-platform/frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### 5. Production Deployment

#### Backend (Vercel)

1. Install Vercel CLI:

   ```bash
   npm install -g vercel
   ```

2. Deploy backend:

   ```bash
   cd backend
   vercel --prod
   ```

3. Set environment variables in Vercel dashboard

#### Frontend (Vercel)

1. Deploy frontend:

   ```bash
   cd frontend
   vercel --prod
   ```

2. Update backend environment with production frontend URL

## 📱 How to Use

### 1. User Registration & Gmail Connection

1. Open the application at `http://localhost:3000` (or your deployed URL)
2. Click "Connect with Gmail"
3. Authorize the application to send emails on your behalf
4. You'll be redirected back to the dashboard

### 2. Creating Email Campaigns

1. Go to "Create Campaign"
2. Fill in campaign details:
   - Campaign name
   - Email subject
   - Email body (supports personalization with {{name}})
   - Google Sheet URL with recipient data
3. Click "Create Campaign"
4. The system will automatically start batch processing

### 3. Google Sheet Format

Your Google Sheet should have these columns:

- **Name**: Recipient's name (for personalization)
- **Email Address**: Recipient's email (required)
- **Additional columns**: Can be used for future personalization

Example:

```
| Name        | Email Address        |
|-------------|---------------------|
| John Doe    | john@example.com    |
| Jane Smith  | jane@example.com    |
```

Make sure the Google Sheet is:

- Publicly accessible (Anyone with link can view)
- Has headers in the first row
- Contains valid email addresses

### 4. Campaign Execution Flow

The system now uses an advanced batch processing approach:

1. **Campaign Creation**: Creates campaign record in MongoDB
2. **Batch Processing**: Processes emails in small batches (3-5 emails per batch)
3. **Non-Blocking**: Each batch completes in ~10-15 seconds, allowing concurrent users
4. **Auto-Continuation**: If a batch times out, the next batch automatically continues
5. **Real-time Updates**: Progress is updated in real-time in the UI
6. **Completion**: Campaign status is updated when all emails are processed

### 5. Monitoring Campaigns

- **Campaign History**: View all your campaigns with send statistics
- **Campaign Details**: Click on any campaign to see detailed sending logs
- **Real-time Progress**: Watch campaigns progress in real-time
- **Error Handling**: Failed emails are automatically retried

## 🔧 Technical Details

### Batch Processing Architecture

The platform uses an innovative batch processing system designed for serverless environments:

- **Small Batches**: Processes 3-5 emails per API call
- **Non-Blocking**: Each batch completes quickly, allowing concurrent users
- **Auto-Resume**: Campaigns automatically continue from where they left off
- **Timeout Handling**: Respects Vercel's 45-second function timeout
- **Memory Efficient**: Minimal memory usage per function call

### Security Features

### Security Features

- **OAuth2 Flow**: Secure Google authentication
- **Token Encryption**: All OAuth tokens are encrypted before storage in MongoDB
- **JWT Authentication**: Secure API access with tokens
- **Rate Limiting**: Prevents API abuse and respects Gmail limits
- **Input Validation**: Protects against malicious data
- **CORS Protection**: Configured for secure cross-origin requests

### Database Schema

The system uses MongoDB with these main collections:

- **users**: User account information
- **gmail_credentials**: Encrypted OAuth tokens
- **email_campaigns**: Campaign metadata and progress
- **email_logs**: Individual email delivery logs

### API Endpoints

#### Authentication

- `GET /auth/google/url` - Get OAuth URL
- `POST /auth/google/callback` - Handle OAuth callback
- `GET /auth/gmail/status` - Check Gmail connection
- `POST /auth/gmail/refresh` - Refresh OAuth token
- `DELETE /auth/gmail/disconnect` - Disconnect Gmail

#### Campaigns

- `POST /api/campaigns` - Create campaign (returns immediately)
- `POST /api/campaigns/:id/process-batch` - Process email batch
- `GET /api/campaigns` - List user campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `DELETE /api/campaigns/:id` - Delete campaign

#### System

- `POST /api/campaigns/:id/continue-internal` - Internal continuation (system only)

## 🚨 Important Notes

### Gmail API Limits

- Google has daily sending limits for Gmail API
- Free accounts: ~100 emails/day
- Google Workspace: Higher limits available
- The platform includes built-in rate limiting and delay mechanisms

### Production Considerations

For production use:

1. **Serverless Deployment**: Optimized for Vercel serverless functions
2. **MongoDB Atlas**: Cloud database with automatic scaling
3. **Environment Variables**: Secure configuration management
4. **SSL/HTTPS**: Automatic with Vercel deployment
5. **Monitoring**: Built-in logging and error tracking
6. **Rate Limiting**: Configurable rate limits per user

### Compliance

- Ensure compliance with CAN-SPAM Act
- Include unsubscribe links in emails
- Respect user privacy and data protection laws
- Only send emails to users who have opted in

## 🐛 Troubleshooting

### Common Issues

1. **OAuth Redirect Error**

   - Check that redirect URI in Google Console matches exactly
   - Ensure frontend and backend URLs are correct
   - Verify OAuth credentials are properly configured

2. **MongoDB Connection Failed**

   - Verify MongoDB URI is correct
   - Check network access (IP whitelist)
   - Ensure database credentials are valid

3. **Email Sending Failed**

   - Check Gmail API is enabled in Google Console
   - Verify OAuth scopes include Gmail send permission
   - Check rate limits haven't been exceeded
   - Ensure Google Sheet is publicly accessible

4. **Batch Processing Issues**

   - Check campaign logs for specific error messages
   - Verify environment variables are set correctly
   - Monitor campaign progress in real-time

5. **Concurrent User Problems**

   - The new batch processing should handle multiple users
   - Check MongoDB connection limits
   - Monitor server resources

## 📚 Additional Resources

- [Google Gmail API Documentation](https://developers.google.com/gmail/api)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [OAuth 2.0 Flow Documentation](https://developers.google.com/identity/protocols/oauth2)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (both localhost and production)
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is provided as-is. Users are responsible for:

- Complying with email marketing laws and regulations
- Respecting Gmail's terms of service and API quotas
- Ensuring proper consent for email sending
- Managing their own rate limits and daily quotas
- Following email best practices and anti-spam guidelines

Use responsibly and ethically!

---

## 🎯 What's New - Concurrent User Support

### Previous Limitation

- ❌ Only one user could send campaigns at a time
- ❌ Serverless functions would timeout with large email lists
- ❌ Long-running processes blocked other users

### New Solution

- ✅ **Multiple users can send campaigns simultaneously**
- ✅ **Smart batch processing** - processes 3-5 emails per API call
- ✅ **Non-blocking architecture** - each batch completes in ~10-15 seconds
- ✅ **Auto-resume functionality** - campaigns continue automatically if interrupted
- ✅ **Real-time progress tracking** - see campaigns progress live
- ✅ **Fault tolerant** - handles failures gracefully with retry logic

### Technical Implementation

```
Traditional Approach:
User A starts campaign → Server busy for 45+ seconds → User B waits

New Batch Approach:
User A starts campaign → Processes in small batches → Server always available
User B starts campaign → Runs concurrently → Both users served simultaneously
```

This architectural improvement makes the platform truly scalable for multiple concurrent users while respecting serverless environment constraints.
