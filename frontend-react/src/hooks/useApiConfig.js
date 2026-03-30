import { useEffect, useState } from 'react'

export function useApiConfig() {
  const [cfg, setCfg] = useState(null)

  useEffect(() => {
    fetch('/config.json')
      .then((res) => res.json())
      .then((data) => {
        setCfg({
          authBaseUrl: import.meta.env.VITE_AUTH_BASE_URL || data.authBaseUrl,
          backendBaseUrl: import.meta.env.VITE_BACKEND_BASE_URL || data.backendBaseUrl
        })
      })
      .catch(() => {
        setCfg({ authBaseUrl: '/api/auth', backendBaseUrl: '' })
      })
  }, [])

  return cfg
}
