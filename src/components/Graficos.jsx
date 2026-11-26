// Gráficos desenhados com HTML/SVG, sem biblioteca externa.
// Convenções: marcas finas e arredondadas, grade discreta, rótulo de texto ao lado
// de cada cor (a cor nunca é a única forma de identificar um dado) e
// tooltip ao passar o mouse ou tocar.
import { useState } from 'react'

// Barras verticais com valores de 0 a 100 (%). dados = [{ rotulo, valor, dica }]
export function BarrasVerticais({ dados, cor = 'var(--rosa-forte)', altura = 160, sufixo = '%' }) {
  const [foco, setFoco] = useState(null)
  const larguraBarra = 100 / dados.length
  return (
    <div className="grafico">
      <div className="grafico-area" style={{ height: altura }}>
        {/* linhas de 0, 50 e 100% */}
        {[0, 50, 100].map((v) => (
          <div key={v} className="grafico-grade" style={{ bottom: `${v}%` }}>
            <span>
              {v}
              {sufixo}
            </span>
          </div>
        ))}
        <div className="grafico-barras">
          {dados.map((d, i) => (
            <div
              key={i}
              className="grafico-coluna"
              style={{ width: `${larguraBarra}%` }}
              onMouseEnter={() => setFoco(i)}
              onMouseLeave={() => setFoco(null)}
              onClick={() => setFoco(foco === i ? null : i)}
            >
              <div
                className={`grafico-barra ${foco === i ? 'foco' : ''}`}
                style={{ height: `${Math.max(d.valor, d.valor > 0 ? 2 : 0)}%`, background: cor }}
              />
              {foco === i && (
                <div className="grafico-dica" style={{ bottom: `${Math.min(d.valor, 80)}%` }}>
                  {d.dica}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={`grafico-eixo-x ${dados.length > 8 ? 'muitos' : ''}`}>
        {dados.map((d, i) => (
          <span key={i} style={{ width: `${larguraBarra}%` }}>
            {d.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}

// Barras horizontais com nome e valor escritos. itens = [{ nome, valor (0–100), cor, texto }]
export function BarrasHorizontais({ itens }) {
  return (
    <div className="barras-h">
      {itens.map((it) => (
        <div key={it.nome} className="barra-h-linha" title={it.dica || `${it.nome}: ${it.texto}`}>
          <span className="barra-h-nome">{it.nome}</span>
          <div className="barra-h-trilho">
            <div className="barra-h-valor" style={{ width: `${Math.max(it.valor, it.valor > 0 ? 1.5 : 0)}%`, background: it.cor }} />
          </div>
          <span className="barra-h-texto">{it.texto}</span>
        </div>
      ))}
    </div>
  )
}

// Linha de humor: um ponto por dia na altura do humor (1 a 5).
// pontos = [{ dia, rotulo, valor (1–5 ou null), cor, dica }], niveis = ['péssimo', …, 'ótimo']
export function LinhaHumor({ pontos, niveis, altura = 170 }) {
  const [foco, setFoco] = useState(null)
  const L = 600 // largura do viewBox; o SVG é esticado para a largura real do contêiner
  const margemEsq = 4
  const passo = pontos.length > 1 ? (L - margemEsq * 2) / (pontos.length - 1) : 0
  const x = (i) => margemEsq + i * passo
  const y = (v) => 10 + ((5 - v) / 4) * (altura - 20)

  // Divide a linha em trechos: dias sem registro interrompem a linha
  const trechos = []
  let atual = []
  pontos.forEach((p, i) => {
    if (p.valor) atual.push(`${x(i)},${y(p.valor)}`)
    else if (atual.length) {
      trechos.push(atual)
      atual = []
    }
  })
  if (atual.length) trechos.push(atual)

  const focado = foco !== null ? pontos[foco] : null

  return (
    <div className="grafico grafico-humor">
      <div className="humor-eixo-y" style={{ height: altura }}>
        {[...niveis].reverse().map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <div className="humor-area">
        <svg viewBox={`0 0 ${L} ${altura}`} preserveAspectRatio="none" style={{ height: altura }} onMouseLeave={() => setFoco(null)}>
          {[1, 2, 3, 4, 5].map((v) => (
            <line key={v} x1="0" x2={L} y1={y(v)} y2={y(v)} className="humor-grade" />
          ))}
          {trechos.map((t, i) => (
            <polyline key={i} points={t.join(' ')} className="humor-linha" vectorEffect="non-scaling-stroke" />
          ))}
          {/* retângulos invisíveis por dia, que ampliam a área sensível ao mouse */}
          {pontos.map((p, i) => (
            <rect key={i} x={x(i) - passo / 2} y="0" width={Math.max(passo, 8)} height={altura} fill="transparent" onMouseEnter={() => setFoco(i)} onClick={() => setFoco(i)} />
          ))}
        </svg>
        {/* pontos em HTML: dentro do SVG esticado eles ficariam ovais */}
        {pontos.map(
          (p, i) =>
            p.valor && (
              <span
                key={i}
                className={`humor-ponto ${foco === i ? 'foco' : ''}`}
                style={{ left: `${(x(i) / L) * 100}%`, top: y(p.valor), background: p.cor }}
              />
            )
        )}
        {focado && (
          <div className="grafico-dica humor-dica" style={{ left: `${(x(foco) / L) * 100}%`, top: focado.valor ? y(focado.valor) - 12 : altura / 2 }}>
            {focado.dica}
          </div>
        )}
        <div className="grafico-eixo-x humor-eixo-x">
          {pontos.map((p, i) => (
            <span key={i} style={{ left: `${(x(i) / L) * 100}%` }}>
              {p.rotulo}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
