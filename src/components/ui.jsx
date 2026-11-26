// Componentes de interface reutilizados em várias páginas.
import { useEffect } from 'react'
import Icone from './Icone'
import { enfeitar } from './Enfeite'

// Paleta usada por agenda, listas, hábitos, matérias e metas
export const CORES = ['rosa', 'laranja', 'amarelo', 'verde', 'azul', 'roxo']

// Cabeçalho padrão das páginas: etiqueta, título com ícone e frase
export function Cabecalho({ icone, emoji, etiqueta, titulo, frase, children }) {
  return (
    <header className="cabecalho">
      {etiqueta && <span className="etiqueta">{etiqueta}</span>}
      <div className="cabecalho-linha">
        <h1>
          <Icone nome={icone} emoji={emoji} className="icone-titulo" /> {titulo}
        </h1>
        {children}
      </div>
      {frase && <p className="mao">{enfeitar(frase)}</p>}
    </header>
  )
}

// Janela modal. Fecha com Esc ou com clique fora dela.
export function Modal({ titulo, onFechar, children, largo = false }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onFechar])

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={`card fita modal ${largo ? 'modal-largo' : ''}`} role="dialog">
        <button className="modal-fechar" onClick={onFechar} aria-label="fechar">
          ✕
        </button>
        {titulo && <h2>{titulo}</h2>}
        {children}
      </div>
    </div>
  )
}

export function Erro({ children }) {
  return children ? <p className="erro">ops: {children}</p> : null
}

export function Vazio({ children }) {
  return <p className="mao vazio">{enfeitar(children)}</p>
}

// Fileira de etiquetas para escolher uma opção (filtros, abas)
export function Chips({ opcoes, valor, onChange }) {
  return (
    <div className="chips">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          className={`chip ${o.cor ? `bg-${o.cor}` : ''} ${valor === o.valor ? 'ativa' : ''}`}
          onClick={() => onChange(o.valor)}
        >
          {enfeitar(o.label)}
          {o.numero !== undefined && <span className="chip-numero">{o.numero}</span>}
        </button>
      ))}
    </div>
  )
}

// Seletor de cor da paleta
export function EscolherCor({ valor, onChange }) {
  return (
    <div className="escolher-cor">
      {CORES.map((c) => (
        <button
          key={c}
          type="button"
          className={`bolinha-cor bg-${c} ${valor === c ? 'escolhida' : ''}`}
          onClick={() => onChange(c)}
          aria-label={c}
        />
      ))}
    </div>
  )
}

// Nota de 0 a 5 estrelas; clicar na nota atual zera
export function Estrelas({ valor = 0, onChange, pequeno }) {
  return (
    <span className={`estrelas ${pequeno ? 'pequeno' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= valor ? 'cheia' : ''}
          onClick={onChange ? () => onChange(n === valor ? 0 : n) : undefined}
          disabled={!onChange}
          aria-label={`${n} estrelas`}
        >
          ★
        </button>
      ))}
    </span>
  )
}

// Barra de progresso (0 a 100)
export function Progresso({ valor, cor = 'rosa-antigo' }) {
  return (
    <div className="progresso">
      <div className="progresso-barra" style={{ width: `${Math.max(0, Math.min(100, valor))}%`, background: `var(--${cor})` }} />
    </div>
  )
}

// Conversão entre texto separado por vírgulas e array: 'a, b' ⇄ ['a', 'b']
export const textoParaTags = (t) =>
  (t || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
export const tagsParaTexto = (arr) => (arr || []).join(', ')
