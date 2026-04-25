import { useState, useEffect, createContext, useContext } from 'react'
import { login as apiLogin } from '../api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('nfn_token'))
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('nfn_user')) } catch { return null }
  })

  const login = async (email, password) => {
    const data = await apiLogin(email, password)
    localStorage.setItem('nfn_token', data.access_token)
    const u = { email }
    localStorage.setItem('nfn_user', JSON.stringify(u))
    setToken(data.access_token)
    setUser(u)
    return data
  }

  const logout = () => {
    localStorage.removeItem('nfn_token')
    localStorage.removeItem('nfn_user')
    setToken(null)
    setUser(null)
  }

  return <AuthCtx.Provider value={{ token, user, login, logout }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
