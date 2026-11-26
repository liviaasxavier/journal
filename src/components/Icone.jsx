import { useState } from 'react'

// Exibe public/icones/<nome>.png. Se a imagem não carregar (evento onError),
// mostra o emoji recebido como alternativa.
export default function Icone({ nome, emoji, className = '' }) {
  const [faltando, setFaltando] = useState(false)

  return (
    <span className={`icone ${className}`} aria-hidden="true">
      {faltando ? emoji : <img src={`${import.meta.env.BASE_URL}icones/${nome}.png`} alt="" onError={() => setFaltando(true)} />}
    </span>
  )
}
