import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Sessão de login: undefined = carregando | null = sem login | objeto = logada
export function useSession() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return session
}
