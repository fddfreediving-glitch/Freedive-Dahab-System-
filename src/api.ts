// Client-side API fetcher with automatic Bearer token and credentials handling

let cachedToken: string | null = null;

export function setApiToken(token: string | null) {
  cachedToken = token;
  if (token) {
    localStorage.setItem('fd_session_token', token);
  } else {
    localStorage.removeItem('fd_session_token');
  }
}

export function getApiToken(): string | null {
  if (!cachedToken) {
    cachedToken = localStorage.getItem('fd_session_token');
  }
  return cachedToken;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getApiToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data && typeof data === 'object' && data.error ? data.error : `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}
