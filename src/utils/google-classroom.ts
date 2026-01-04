/**
 * Google Classroom API Utility Functions
 * Handles OAuth token management and API calls
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

/**
 * Create OAuth2 client for Google Classroom
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-classroom/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Get authorization URL for Google OAuth
 */
export function getAuthorizationUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.profile.emails',
    'https://www.googleapis.com/auth/classroom.profile.photos',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state: userId, // Pass user ID in state for security
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const oauth2Client = createOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600000, // Default 1 hour if not provided
  };
}

/**
 * Get authenticated OAuth2 client from stored tokens
 */
export function getAuthenticatedClient(
  accessToken: string,
  refreshToken: string
): OAuth2Client {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
}

/**
 * Refresh access token if expired
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  access_token: string;
  expiry_date: number;
}> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  return {
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date || Date.now() + 3600000,
  };
}

/**
 * Get Google Classroom API client
 */
export function getClassroomClient(oauth2Client: OAuth2Client) {
  return google.classroom({ version: 'v1', auth: oauth2Client });
}

/**
 * Fetch courses from Google Classroom
 */
export async function fetchGoogleClassroomCourses(oauth2Client: OAuth2Client) {
  const classroom = getClassroomClient(oauth2Client);
  
  const response = await classroom.courses.list({
    courseStates: ['ACTIVE', 'ARCHIVED'],
    pageSize: 100,
  });

  return response.data.courses || [];
}

/**
 * Fetch course details from Google Classroom
 */
export async function fetchGoogleClassroomCourse(
  oauth2Client: OAuth2Client,
  courseId: string
) {
  const classroom = getClassroomClient(oauth2Client);
  
  const response = await classroom.courses.get({
    id: courseId,
  });

  return response.data;
}

/**
 * Fetch students for a course
 */
export async function fetchCourseStudents(
  oauth2Client: OAuth2Client,
  courseId: string
) {
  const classroom = getClassroomClient(oauth2Client);
  
  const students: any[] = [];
  let pageToken: string | undefined;

  do {
    const response = await classroom.courses.students.list({
      courseId,
      pageSize: 100,
      pageToken,
    });

    if (response.data.students) {
      students.push(...response.data.students);
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return students;
}

/**
 * Fetch coursework (assignments) for a course
 */
export async function fetchCoursework(
  oauth2Client: OAuth2Client,
  courseId: string
) {
  const classroom = getClassroomClient(oauth2Client);
  
  const coursework: any[] = [];
  let pageToken: string | undefined;

  do {
    const response = await classroom.courses.courseWork.list({
      courseId,
      pageSize: 100,
      pageToken,
    });

    if (response.data.courseWork) {
      coursework.push(...response.data.courseWork);
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return coursework;
}

/**
 * Fetch student submissions for an assignment
 */
export async function fetchStudentSubmissions(
  oauth2Client: OAuth2Client,
  courseId: string,
  courseWorkId: string
) {
  const classroom = getClassroomClient(oauth2Client);
  
  const submissions: any[] = [];
  let pageToken: string | undefined;

  do {
    const response = await classroom.courses.courseWork.studentSubmissions.list({
      courseId,
      courseWorkId,
      pageSize: 100,
      pageToken,
    });

    if (response.data.studentSubmissions) {
      submissions.push(...response.data.studentSubmissions);
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return submissions;
}


