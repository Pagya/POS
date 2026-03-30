export const getToken = () => localStorage.getItem('token');
export const getUser  = () => JSON.parse(localStorage.getItem('user') || 'null');
export const getBusiness = () => JSON.parse(localStorage.getItem('business') || 'null');

export function setSession(token: string, user: object, business?: object) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  if (business) localStorage.setItem('business', JSON.stringify(business));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('business');
}

export const isLoggedIn = () => !!getToken();
