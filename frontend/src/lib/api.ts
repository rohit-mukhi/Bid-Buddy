/**
 * API Configuration
 * Dynamically constructs API base URL from environment variables
 * Falls back to localhost for development
 */

export const getApiBaseUrl = (): string => {
  // Check for Vite environment variable first (production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Fallback to localhost for development
  return 'http://localhost:3000';
};

export const apiBaseUrl = getApiBaseUrl();

/**
 * Helper function to construct API endpoints
 * @param endpoint - API endpoint path (e.g., '/api/auctions/all')
 * @returns Full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${apiBaseUrl}${endpoint}`;
};

/**
 * Helper function for API requests with error handling
 */
export const apiFetch = async (
  endpoint: string,
  options?: RequestInit
): Promise<Response> => {
  const url = getApiUrl(endpoint);
  return fetch(url, options);
};
