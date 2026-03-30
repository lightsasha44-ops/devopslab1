import { safeJson } from './http'

export async function registerUser(authBaseUrl, login, password) {
  return fetch(`${authBaseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  })
}

export async function loginUser(authBaseUrl, login, password) {
  const response = await fetch(`${authBaseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  })
  const body = await safeJson(response)
  return { response, body }
}
