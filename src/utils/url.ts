/**
 * Get the application URL from environment variable or fallback to window.location.origin
 * This ensures the correct URL is used in production vs development
 */
export const getAppUrl = (): string => {
  // Check for environment variable first (for production)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (envUrl) {
    // Clean and validate the URL
    let cleanUrl = envUrl.trim();
    // Remove quotes if present
    if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
        (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
      cleanUrl = cleanUrl.slice(1, -1);
    }
    // Ensure URL doesn't end with a slash
    cleanUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
    
    // Validate the URL format
    try {
      // Check if it starts with http:// or https://
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        // Validate it's a proper URL
        new URL(cleanUrl);
        return cleanUrl;
      } else {
      console.warn('NEXT_PUBLIC_APP_URL does not start with http:// or https://, using fallback');
      }
    } catch (e) {
      console.warn('NEXT_PUBLIC_APP_URL is not a valid URL, using fallback:', e);
    }
  }
  
  // Fallback to window.location.origin (for client-side)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for SSR/Server-side: use localhost for development
  // In production, NEXT_PUBLIC_APP_URL should be set
  return 'http://localhost:3000';
};

/**
 * Get the full URL for a given path
 * Works in both client-side and server-side contexts
 * @param path - The path to append to the base URL
 * @param request - Optional request object (server-side) to extract origin from
 */
export const getUrl = (path: string, request?: { url: string | URL }): string => {
  // If we have a request object (server-side), use it to get the origin
  if (request) {
    try {
      const url = typeof request.url === 'string' ? new URL(request.url) : request.url;
      const origin = `${url.protocol}//${url.host}`;
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${origin}${normalizedPath}`;
    } catch (e) {
      console.warn('Failed to extract origin from request, using fallback:', e);
    }
  }

  const baseUrl = getAppUrl();
  
  // If baseUrl is empty or invalid, use window.location.origin as fallback
  if (!baseUrl) {
    if (typeof window !== 'undefined') {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${window.location.origin}${normalizedPath}`;
    }
    // Server-side fallback
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `http://localhost:3000${normalizedPath}`;
  }
  
  // Validate baseUrl is a proper URL
  try {
    new URL(baseUrl);
  } catch (e) {
    // If baseUrl is invalid, fallback appropriately
    console.warn('Invalid baseUrl, using fallback:', baseUrl);
    if (typeof window !== 'undefined') {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${window.location.origin}${normalizedPath}`;
    }
    // Server-side fallback
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `http://localhost:3000${normalizedPath}`;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${normalizedPath}`;
  
  // Final validation
  try {
    new URL(fullUrl);
    return fullUrl;
  } catch (e) {
    console.error('Constructed invalid URL:', fullUrl, e);
    // Fallback appropriately
    if (typeof window !== 'undefined') {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${window.location.origin}${normalizedPath}`;
    }
    // Server-side fallback
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `http://localhost:3000${normalizedPath}`;
  }
};

