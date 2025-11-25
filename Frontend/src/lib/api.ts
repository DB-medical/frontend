export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  token?: string | null;
  skipAuth?: boolean;
  json?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { token, skipAuth = false, json, headers, ...init }: ApiRequestOptions = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const composedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers ?? {}),
  };

  if (!skipAuth && token) {
    composedHeaders.Authorization = `Bearer ${token}`;
  }

  const requestInit: RequestInit = {
    ...init,
    headers: composedHeaders,
  };

  if (json !== undefined) {
    requestInit.body = JSON.stringify(json);
  }

  const response = await fetch(url, requestInit);
  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message =
      (typeof payload === 'string' && payload) ||
      (typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : '요청이 실패했습니다.');
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}
