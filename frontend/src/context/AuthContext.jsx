import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('skillsnexis_token')
    if (!token) return setLoading(false)
    api.get('/auth/me')
      .then(({ data }) => setUser(data.data))
      .catch(() => {
        localStorage.removeItem('skillsnexis_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const authenticate = async (endpoint, credentials) => {
    const { data } = await api.post(endpoint, credentials)
    localStorage.setItem('skillsnexis_token', data.data.token)
    setUser(data.data.user)
  }

  return <AuthContext.Provider value={{ user, loading, login: (data) => authenticate('/auth/login', data), register: (data) => authenticate('/auth/register', data), logout: () => { localStorage.removeItem('skillsnexis_token'); setUser(null) } }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }