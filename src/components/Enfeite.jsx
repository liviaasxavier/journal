// Enfeites: substitui os símbolos ♡ e ✿ pelos PNGs de public/icones/extras.
const ARQUIVOS = { '♡': 'coracao', '✿': 'flor' }

export function Enfeite({ tipo = 'coracao', className = '' }) {
  return <img className={`enfeite ${className}`} src={`${import.meta.env.BASE_URL}icones/extras/${tipo}.png`} alt="" aria-hidden="true" />
}

// Divide o texto nos símbolos ♡ e ✿ e troca cada um pela imagem correspondente.
// Ex.: enfeitar('nada por aqui ✿') → ['nada por aqui ', <img flor>, '']
export function enfeitar(texto) {
  if (typeof texto !== 'string') return texto
  return texto.split(/([♡✿])/).map((parte, i) => (ARQUIVOS[parte] ? <Enfeite key={i} tipo={ARQUIVOS[parte]} /> : parte))
}
