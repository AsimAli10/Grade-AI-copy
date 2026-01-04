# Google Classroom Integration - Quick Start

## ✅ What's Been Implemented

The Google Classroom API integration has been fully implemented in your codebase:

### 1. **API Routes Created**
- `/api/google-classroom/authorize` - Initiates OAuth flow
- `/api/google-classroom/callback` - Handles OAuth callback
- `/api/google-classroom/sync` - Syncs courses, students, and assignments

### 2. **Utility Functions**
- `src/utils/google-classroom.ts` - Complete Google Classroom API wrapper
- Handles OAuth token management, refresh, and API calls

### 3. **UI Components Updated**
- **Dashboard** - Shows connection status and sync button
- **Courses Page** - Fetches real courses and allows syncing
- **Hero Section** - Connect button now functional

### 4. **Database Integration**
- Uses existing `google_classroom_integrations` table
- Automatically syncs courses, students, and assignments
- Stores OAuth tokens securely

## 🚀 Next Steps

### Step 1: Install Dependencies

```bash
npm install googleapis
# or
bun add googleapis
```

### Step 2: Set Up Google Cloud Console

Follow the detailed guide in `GOOGLE_CLASSROOM_SETUP.md`:

1. Create a Google Cloud Project
2. Enable Google Classroom API
3. Configure OAuth Consent Screen
4. Create OAuth 2.0 Credentials
5. Copy Client ID and Client Secret

### Step 3: Add Environment Variables

Add to your `.env.local` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-classroom/callback
```

For production, update `GOOGLE_REDIRECT_URI` to your production URL.

### Step 4: Test the Integration

1. Start your dev server: `npm run dev`
2. Navigate to `/dashboard` or `/courses`
3. Click "Connect Google Classroom"
4. Authorize the app in Google
5. You'll be redirected back and courses will be available to sync
6. Click "Sync Courses" to import from Google Classroom

## 📋 Features

- ✅ **OAuth 2.0 Flow** - Secure authentication with Google
- ✅ **Token Management** - Automatic refresh of expired tokens
- ✅ **Course Sync** - Import courses from Google Classroom
- ✅ **Student Sync** - Automatically sync student rosters
- ✅ **Assignment Sync** - Import coursework/assignments
- ✅ **UI Integration** - Seamless connection in dashboard and courses pages

## 🔧 How It Works

1. **Connection**: User clicks "Connect Google Classroom" → Redirects to Google OAuth → User authorizes → Tokens stored in database
2. **Sync**: User clicks "Sync Courses" → Fetches courses from Google Classroom → Creates/updates courses in database → Syncs students and assignments
3. **Auto-Refresh**: Tokens are automatically refreshed when expired during API calls

## 📝 API Scopes Used

- `classroom.courses.readonly` - Read courses
- `classroom.coursework.me.readonly` - Read assignments
- `classroom.coursework.students.readonly` - Read submissions
- `classroom.rosters.readonly` - Read student rosters
- `classroom.profile.emails` - Access user email
- `classroom.profile.photos` - Access profile photos

## 🐛 Troubleshooting

### "Redirect URI mismatch"
- Ensure `GOOGLE_REDIRECT_URI` matches exactly what's in Google Console
- Check for trailing slashes

### "Access blocked"
- Add your email as a test user in OAuth consent screen
- Ensure consent screen is properly configured

### "API not enabled"
- Verify Google Classroom API is enabled in Google Cloud Console

### Token refresh fails
- User needs to reconnect (tokens may have been revoked)
- Check that refresh token is still valid

## 📚 Files Created/Modified

### New Files
- `GOOGLE_CLASSROOM_SETUP.md` - Complete setup guide
- `GOOGLE_CLASSROOM_QUICKSTART.md` - This file
- `src/utils/google-classroom.ts` - API utilities
- `app/api/google-classroom/authorize/route.ts` - OAuth initiation
- `app/api/google-classroom/callback/route.ts` - OAuth callback
- `app/api/google-classroom/sync/route.ts` - Sync endpoint

### Modified Files
- `src/components/Dashboard/DashboardClient.tsx` - Added connection UI
- `src/components/Courses/CoursesClient.tsx` - Added real data fetching
- `src/components/Home/Hero.tsx` - Made connect button functional

## 🎯 Next Enhancements (Optional)

- [ ] Sync submissions from Google Classroom
- [ ] Push grades back to Google Classroom
- [ ] Real-time sync with webhooks
- [ ] Batch sync for multiple courses
- [ ] Sync status indicators per course
- [ ] Manual course selection before sync


