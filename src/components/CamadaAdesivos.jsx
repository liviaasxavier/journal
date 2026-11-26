// Camada transparente sobre o conteúdo da página, onde os adesivos são desenhados.
// Posição salva no banco: x = fração da largura (0 a 1, para se adaptar a telas de
// tamanhos diferentes), y = pixels a partir do topo, além de escala e rotação.
import { useRef } from 'react'
import { useTabela } from '../hooks/useTabela'
import { urlAdesivo } from '../lib/adesivos'
import { enfeitar } from './Enfeite'

const LARGURA_BASE = 110 // px de um adesivo com escala 1

export default function CamadaAdesivos({ pagina, editando, onFechar }) {
  const adesivos = useTabela('adesivos')
  const colados = useTabela('adesivos_colados', { filtro: (q) => q.eq('pagina', pagina) })
  const camada = useRef(null)

  const imagem = Object.fromEntries(adesivos.linhas.map((a) => [a.id, urlAdesivo(a.caminho)]))
  const zMax = Math.max(0, ...colados.linhas.map((c) => c.z))

  async function colar(adesivo) {
    // Cola o adesivo no centro da área visível da página
    const caixa = camada.current.getBoundingClientRect()
    const y = Math.max(40, window.innerHeight / 2 - caixa.top)
    await colados.adicionar({ adesivo_id: adesivo.id, pagina, x: 0.5, y, escala: 1, rotacao: (Math.random() - 0.5) * 16, z: zMax + 1 })
  }

  // Arrastar: atualiza a posição na tela a cada movimento do ponteiro (mouse ou toque)
  // e grava no banco apenas ao soltar
  function comecarArrastar(e, c) {
    if (!editando) return
    e.preventDefault()
    const caixa = camada.current.getBoundingClientRect()
    const inicio = { px: e.clientX, py: e.clientY, x: c.x, y: c.y }
    let atual = { x: c.x, y: c.y }
    if (c.z < zMax) colados.atualizar(c.id, { z: zMax + 1 }) // traz o adesivo para a frente dos outros

    function mover(ev) {
      atual = {
        x: Math.min(1, Math.max(0, inicio.x + (ev.clientX - inicio.px) / caixa.width)),
        y: Math.max(0, inicio.y + (ev.clientY - inicio.py)),
      }
      colados.setLinhas((ls) => ls.map((l) => (l.id === c.id ? { ...l, ...atual } : l)))
    }
    function soltar() {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      colados.atualizar(c.id, atual)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  // Alça do canto: o ângulo do ponteiro em relação ao centro do adesivo define a rotação,
  // e a distância até o centro define a escala.
  function comecarGirar(e, c) {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget.parentElement.getBoundingClientRect()
    const centro = { x: el.left + el.width / 2, y: el.top + el.height / 2 }
    const ang0 = Math.atan2(e.clientY - centro.y, e.clientX - centro.x)
    const dist0 = Math.hypot(e.clientX - centro.x, e.clientY - centro.y)
    const ini = { rotacao: c.rotacao, escala: c.escala }
    let atual = ini

    function mover(ev) {
      const ang = Math.atan2(ev.clientY - centro.y, ev.clientX - centro.x)
      const dist = Math.hypot(ev.clientX - centro.x, ev.clientY - centro.y)
      atual = {
        rotacao: ini.rotacao + ((ang - ang0) * 180) / Math.PI,
        escala: Math.min(4, Math.max(0.3, (ini.escala * dist) / dist0)),
      }
      colados.setLinhas((ls) => ls.map((l) => (l.id === c.id ? { ...l, ...atual } : l)))
    }
    function soltar() {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      colados.atualizar(c.id, atual)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  return (
    <>
      <div ref={camada} className={`camada-adesivos ${editando ? 'editando' : ''}`}>
        {colados.linhas.map(
          (c) =>
            imagem[c.adesivo_id] && (
              <div
                key={c.id}
                className="adesivo-colado"
                style={{
                  left: `${c.x * 100}%`,
                  top: c.y,
                  width: LARGURA_BASE,
                  zIndex: c.z,
                  transform: `translate(-50%, -50%) rotate(${c.rotacao}deg) scale(${c.escala})`,
                }}
                onPointerDown={(e) => comecarArrastar(e, c)}
              >
                <img src={imagem[c.adesivo_id]} alt="" draggable={false} />
                {editando && (
                  <>
                    <button className="adesivo-tirar" onPointerDown={(e) => e.stopPropagation()} onClick={() => colados.apagar(c.id)} aria-label="tirar">
                      ✕
                    </button>
                    <span className="adesivo-girar" onPointerDown={(e) => comecarGirar(e, c)} title="girar / tamanho" />
                  </>
                )}
              </div>
            )
        )}
      </div>

      {editando && (
        <div className="bandeja-adesivos card">
          <span className="etiqueta">seus adesivos</span>
          <div className="bandeja-lista">
            {adesivos.linhas.length === 0 && <span className="mao suave">{enfeitar('suba PNGs na página Adesivos ✿')}</span>}
            {adesivos.linhas.map((a) => (
              <button key={a.id} onClick={() => colar(a)} title={`colar "${a.nome}"`}>
                <img src={imagem[a.id]} alt={a.nome} />
              </button>
            ))}
          </div>
          <button className="btn" onClick={onFechar}>
            pronto
          </button>
        </div>
      )}
    </>
  )
}
