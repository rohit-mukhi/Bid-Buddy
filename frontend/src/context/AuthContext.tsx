import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getApiUrl } from '../lib/api'

interface User {
  email: string
  isAdmin: boolean
  isBidder: boolean
}

interface AuthContextType {
  session: Session | null
  user: User | null
  token: string | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: (navigate?: (path: string) => void) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchJWT = async (email: string) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) throw new Error('Failed to get JWT')

      const data = await response.json()
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('jwt_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    } catch (error) {
      console.error('Error fetching JWT:', error)
    }
  }

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)

      if (data.session?.user?.email) {
        await fetchJWT(data.session.user.email)
      }

      setLoading(false)
    }

    getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)

      if (session?.user?.email) {
        await fetchJWT(session.user.email)
      } else {
        setToken(null)
        setUser(null)
        localStorage.removeItem('jwt_token')
        localStorage.removeItem('user')
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async (navigate?: (path: string) => void) => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setToken(null)
    setUser(null)
    localStorage.removeItem('jwt_token')
    localStorage.removeItem('user')
    if (navigate) {
      navigate('/')
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, token, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
