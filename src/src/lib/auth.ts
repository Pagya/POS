import { DEMO_MODE, DEMO_USER, DEMO_BUSINESS, DEMO_TOKEN } from './demo';

export const getToken = () =>
  DEMO_MODE ? DEMO_TOKEN : localStorage.getItem('token');

export const getUser = () =>
  DEMO_MODE ? DEMO_USER : JSON.parse(localStorage.getItem('user') || 'null');

export const getBusiness = () =>
  DEMO_MODE ? DEMO_BUSINESS : JSON.parse(localStorage.getItem('business') || 'null');

export function setSession(token: string, user: object, business?: object) {
  if (DEMO_MODE) return; // no-op in demo mode
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  if (business) localStorage.setItem('business', JSON.stringify(business));
}

export function clearSession() {
  if (DEMO_MODE) return; // no-op in demo mode
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('business');
}

// In demo mode, always "logged in"
export const isLoggedIn = () => DEMO_MODE || !!getToken();
