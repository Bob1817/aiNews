const AUTH_EVENT = 'auth-change'

export function isAuthenticated() {
  return !!localStorage.getItem('user')
}

export function setAuthSession(user: unknown, profile?: unknown) {
  localStorage.setItem('user', JSON.stringify(user))

  if (profile !== undefined) {
    localStorage.setItem('userProfile', JSON.stringify(profile))
  }

  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function clearAuthSession() {
  localStorage.removeItem('user')
  localStorage.removeItem('userProfile')
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function subscribeToAuthChange(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback)
  window.addEventListener('storage', callback)

  return () => {
    window.removeEventListener(AUTH_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}
