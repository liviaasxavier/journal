import Icone from '../components/Icone'

export default function EmConstrucao({ modulo }) {
  return (
    <div className="pagina">
      <header className="cabecalho">
        <span className="etiqueta">em construção</span>
        <h1><Icone nome={modulo.icone} emoji={modulo.emoji} className="icone-titulo" /> {modulo.label}</h1>
      </header>
      <div className="card quadriculado fita fita-lavanda aviso-construcao">
        <span className="selo selo-dourado"><Icone nome="construcao" emoji="🧸" /></span>
        <p className="mao">logo logo essa página fica pronta…</p>
      </div>
    </div>
  )
}
