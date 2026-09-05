import type { AppState, AuthUser, SystemMember, SystemRole, SystemSummary } from './types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Some responses carry no body; the status is enough.
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && typeof (body as { error?: string }).error === 'string'
        ? (body as { error: string }).error
        : `${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// --- auth -------------------------------------------------------------------

export const fetchMe = () => request<{ user: AuthUser | null }>('/api/auth/me');

export const signIn = (username: string, password: string) =>
  request<{ user: AuthUser }>('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const signUp = (username: string, password: string) =>
  request<{ user: AuthUser }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const signOut = () => request<{ ok: true }>('/api/auth/signout', { method: 'POST' });

// --- systems ----------------------------------------------------------------

export const fetchSystems = () => request<{ systems: SystemSummary[] }>('/api/systems');

export const createSystem = (name: string, seed: boolean) =>
  request<{ id: string; name: string }>('/api/systems', {
    method: 'POST',
    body: JSON.stringify({ name, seed }),
  });

export const renameSystem = (id: string, name: string) =>
  request<{ ok: true }>(`/api/systems/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });

export const deleteSystem = (id: string) =>
  request<{ ok: true }>(`/api/systems/${id}`, { method: 'DELETE' });

export const fetchSystemState = (id: string) =>
  request<{ state: AppState; updatedAt: string | null; role: SystemRole }>(`/api/systems/${id}/state`);

export const saveSystemState = (id: string, state: AppState) =>
  request<{ ok: true; updatedAt: string | null }>(`/api/systems/${id}/state`, {
    method: 'PUT',
    body: JSON.stringify(state),
  });

// --- sharing ----------------------------------------------------------------

export const fetchMembers = (id: string) =>
  request<{ members: SystemMember[]; role: SystemRole }>(`/api/systems/${id}/members`);

export const shareSystem = (id: string, username: string) =>
  request<{ members: SystemMember[] }>(`/api/systems/${id}/members`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

export const removeMember = (id: string, userId: string) =>
  request<{ ok: true }>(`/api/systems/${id}/members`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
