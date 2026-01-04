# Google Classroom API Integration Guide

This guide will walk you through integrating Google Classroom API into your GradeAI application.

## Prerequisites

- Access to Google Cloud Console
- A Google Workspace account (or personal Google account with Classroom access)
- Ability to create classes in Google Classroom

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `GradeAI-Classroom-Integration`
5. Click **"Create"**
6. Select the newly created project

## Step 2: Enable Google Classroom API

1. In the Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for **"Google Classroom API"**
3. Click on it and press **"Enable"**
4. Wait for the API to be enabled (usually takes a few seconds)

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: `GradeAI`
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. On **Scopes** page:
   - Click **"Add or Remove Scopes"**
   - Search and add these scopes:
     - `https://www.googleapis.com/auth/classroom.courses.readonly`
     - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
     - `https://www.googleapis.com/auth/classroom.coursework.students.readonly`
     - `https://www.googleapis.com/auth/classroom.rosters.readonly`
     - `https://www.googleapis.com/auth/classroom.profile.emails`
     - `https://www.googleapis.com/auth/classroom.profile.photos`
   - Click **"Update"** then **"Save and Continue"**
7. On **Test users** page (if in testing mode):
   - Add your Google account email
   - Click **"Save and Continue"**
8. Click **"Back to Dashboard"**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "OAuth client ID"**
3. Choose **"Web application"** as the application type
4. Fill in:
   - **Name**: `GradeAI Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/google-classroom/callback` (for local)
     - `https://yourdomain.com/api/google-classroom/callback` (for production)
5. Click **"Create"**
6. **IMPORTANT**: Copy the **Client ID** and **Client Secret** - you'll need these for environment variables

## Step 5: Set Environment Variables

Add these to your `.env.local` file (or your environment configuration):

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# OAuth Redirect URL (should match what you set in Google Console)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-classroom/callback
# For production: https://yourdomain.com/api/google-classroom/callback
```

## Step 6: Install Dependencies

The project will need the Google APIs client library. Run:

```bash
npm install googleapis
```

## Step 7: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to your dashboard or courses page
3. Click "Connect Google Classroom" button
4. You should be redirected to Google's OAuth consent screen
5. After authorizing, you'll be redirected back to your app
6. Your courses should start syncing from Google Classroom

## Step 8: Publish Your App (Production)

When ready for production:

1. Go back to **OAuth consent screen** in Google Cloud Console
2. Click **"Publish App"** (if you want it available to all users)
3. Or keep it in testing mode and add specific test users
4. Update environment variables with production URLs
5. Deploy your application

## API Scopes Explained

- `classroom.courses.readonly` - Read course information
- `classroom.coursework.me.readonly` - Read assignments you created
- `classroom.coursework.students.readonly` - Read student submissions
- `classroom.rosters.readonly` - Read student rosters
- `classroom.profile.emails` - Access user email
- `classroom.profile.photos` - Access user profile photos

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in your `.env` matches exactly what's in Google Console
- Check for trailing slashes or protocol mismatches (http vs https)

### "Access blocked" error
- Make sure you added your email as a test user (if in testing mode)
- Check that the OAuth consent screen is properly configured

### "API not enabled" error
- Verify Google Classroom API is enabled in your project
- Check that you're using the correct project in Google Console

### Token refresh issues
- The integration automatically handles token refresh
- If tokens expire, users will need to reconnect

## Next Steps

After setup, the integration will:
- ✅ Store OAuth tokens securely in the database
- ✅ Sync courses from Google Classroom
- ✅ Sync assignments and submissions
- ✅ Automatically refresh expired tokens
- ✅ Handle multiple users' integrations

## Security Notes

- Never commit `.env.local` to version control
- Store Client Secret securely
- Use HTTPS in production
- Tokens are encrypted in the database
- Implement proper error handling for token refresh failures


