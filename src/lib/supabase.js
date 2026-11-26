import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sem as variáveis do .env, o cliente fica null e o App exibe uma tela de configuração.
export const supabase = url && key ? createClient(url, key) : null
