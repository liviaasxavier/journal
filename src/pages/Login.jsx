import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Icone from '../components/Icone'
import { enfeitar } from '../components/Enfeite'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro(error.message)
    setCarregando(false)
  }

  return (
    <div className="tela-centro">
      <form className="card pautado fita login" onSubmit={entrar}>
        <h1>oii!</h1>
        <p className="mao">{enfeitar('entre no seu journal ♡')}</p>
        <input type="email" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        {erro && <p className="erro">{erro}</p>}
        <button className="btn" disabled={carregando}>{carregando ? 'entrando…' : 'entrar'}</button>
        <span className="selo"><Icone nome="logo" emoji="🌷" /></span>
      </form>
    </div>
  )
}
