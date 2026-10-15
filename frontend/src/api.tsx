import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};
export const statuses = [
  'new',
  'contacted',
  'interested',
  'proposal_sent',
  'won',
  'lost',
] as const;
export type Status = (typeof statuses)[number];
export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string;
  source: string;
  status: Status;
  estimated_value: string;
  notes: string;
  created_at: string;
  updated_at: string;
};
export type LeadList = {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
let csrfFallback = '';
async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const csrf =
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('leadflow_csrf='))
      ?.slice(14) || csrfFallback;
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (options.method && !['GET', 'HEAD'].includes(options.method) && csrf)
    headers.set('X-CSRF-Token', decodeURIComponent(csrf));
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(
      0,
      'Unable to reach LeadFlow. Check your connection and try again.',
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      detail?: string | { loc: (string | number)[]; msg: string }[];
    };
    const fields: Record<string, string> = {};
    if (Array.isArray(body.detail))
      for (const issue of body.detail)
        fields[String(issue.loc.at(-1))] = issue.msg.replace(
          /^Value error, /,
          '',
        );
    const message =
      typeof body.detail === 'string'
        ? body.detail
        : response.status === 422
          ? 'Please check the highlighted fields.'
          : response.status === 401
            ? 'Your session has ended. Please sign in again.'
            : 'Something went wrong. Please try again.';
    throw new ApiError(response.status, message, fields);
  }
  if (response.status === 204) return undefined as T;
  if (
    path === '/csv/export' &&
    response.headers.get('Content-Type')?.includes('text/csv')
  ) {
    return (await response.text()) as T;
  }
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new ApiError(
      502,
      'LeadFlow received an invalid API response. Restart the frontend and API servers, then try again.',
    );
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      502,
      'LeadFlow received an unreadable API response. Please try again.',
    );
  }
}

type AuthContext = {
  user: User | null;
  pending: boolean;
  error: Error | null;
  retry: () => void;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  authenticate: (mode: string, values: unknown) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
};
const Context = createContext<AuthContext | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [switching, setSwitching] = useState(false);
  const auth = useQuery({
    queryKey: ['auth'],
    queryFn: async ({ signal }) => {
      try {
        return await fetchApi<User>('/auth/me', { signal });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    try {
      const result = await fetchApi<T>(path, options);
      if (
        path.startsWith('/leads') &&
        options?.method &&
        !['GET', 'HEAD'].includes(options.method)
      ) {
        await client.invalidateQueries({
          queryKey: ['dashboard', auth.data?.id],
        });
      }
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        client.setQueryData(['auth'], null);
        await client.cancelQueries({
          predicate: (q) => q.queryKey[0] !== 'auth',
        });
        client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
        csrfFallback = '';
      }
      throw error;
    }
  }
  async function authenticate(mode: string, values: unknown) {
    const result = await fetchApi<{ user: User; csrf_token: string }>(
      `/auth/${mode}`,
      { method: 'POST', body: JSON.stringify(values) },
    );
    setSwitching(true);
    await client.cancelQueries();
    client.clear();
    csrfFallback = result.csrf_token;
    client.setQueryData(['auth'], result.user);
    setSwitching(false);
  }
  async function logout() {
    await request<void>('/auth/logout', { method: 'POST' });
    setSwitching(true);
    await client.cancelQueries();
    client.clear();
    csrfFallback = '';
    client.setQueryData(['auth'], null);
    setSwitching(false);
  }
  return (
    <Context.Provider
      value={{
        user: switching ? null : (auth.data ?? null),
        pending: auth.isPending || switching,
        error: auth.error,
        retry: () => {
          void auth.refetch();
        },
        request,
        authenticate,
        logout,
        updateUser: (user) => client.setQueryData(['auth'], user),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing AuthProvider');
  return value;
}
export const labelStatus = (status: string) =>
  status.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
export function money(value: string) {
  const [whole, decimals = ''] = value.split('.');
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimals.padEnd(2, '0')}`;
}
export const date = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
