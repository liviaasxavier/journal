import { useState } from 'react'
import { useTabela } from '../hooks/useTabela'
import { hojeISO, somarDiasISO, inicioSemanaISO, paraISO, deISO, DIAS_CURTOS, MESES, formatarLongo, formatarPrazo } from '../lib/datas'
import { Cabecalho, Erro, Chips } from '../components/ui'
import { LinhaHumor, BarrasHorizontais } from '../components/Graficos'

export const HUMORES = [
  { valor: 1, label: 'péssimo', cor: 'vermelho' },
  { valor: 2, label: 'meh', cor: 'amarelo' },
  { valor: 3, label: 'ok', cor: 'verde' },
  { valor: 4, label: 'bem', cor: 'azul' },
  { valor: 5, label: 'ótimo', cor: 'roxo' },
]

export default function Diario() {
  const diario = useTabela('diario', { ordem: 'dia' })
  const hoje = hojeISO()
  const [dia, setDia] = useState(hoje)
  const entrada = diario.linhas.find((e) => e.dia === dia)

  async function salvar(dados) {
    if (entrada) {
      await diario.atualizar(entrada.id, dados)
      return true
    }
    return !!(await diario.adicionar({ dia, ...dados }))
  }

  const recentes = [...diario.linhas].sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 8)

  return (
    <div className="pagina pagina-larga">
      <Cabecalho icone="diario" emoji="📔" etiqueta="querido diário" titulo="Diário" frase="como foi o dia? ♡" />
      <Erro>{diario.erro}</Erro>

      <div className="diario-layout">
        <div>
          <div className="diario-nav">
            <button className="btn-icone" onClick={() => setDia(somarDiasISO(dia, -1))} aria-label="dia anterior">
              ‹
            </button>
            <span className="etiqueta">{formatarLongo(dia)}</span>
            <button className="btn-icone" onClick={() => setDia(somarDiasISO(dia, 1))} disabled={dia >= hoje} aria-label="próximo dia">
              ›
            </button>
            {dia !== hoje && (
              <button className="link-acao" onClick={() => setDia(hoje)}>
                hoje
              </button>
            )}
          </div>
          {/* key={dia}: o editor é recriado a cada troca de dia, carregando os dados daquele dia */}
          {!diario.carregando && <EditorDia key={dia + (entrada ? 'x' : '')} entrada={entrada} onSalvar={salvar} />}
        </div>

        <aside className="diario-lado">
          <MiniCalendario diario={diario.linhas} selecionado={dia} onEscolher={setDia} />
          {recentes.length > 0 && (
            <div className="card recentes">
              <span className="etiqueta">últimas páginas</span>
              <ul>
                {recentes.map((e) => (
                  <li key={e.id}>
                    <button className="link-simples" onClick={() => setDia(e.dia)}>
                      <span className={`bolinha bg-${HUMORES.find((h) => h.valor === e.humor)?.cor || 'bege'}`} />
                      <b className="mao">{formatarPrazo(e.dia)}</b> {e.texto.slice(0, 40)}
                      {e.texto.length > 40 ? '…' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {diario.linhas.some((e) => e.humor) && <GraficosHumor diario={diario.linhas} />}
    </div>
  )
}

// Gráficos de humor: evolução diária e frequência de cada humor no período
function GraficosHumor({ diario }) {
  const [periodo, setPeriodo] = useState(30)
  const hoje = hojeISO()
  const porDia = Object.fromEntries(diario.map((e) => [e.dia, e]))
  const passoRotulo = periodo <= 31 ? 5 : 14

  const pontos = Array.from({ length: periodo }, (_, k) => {
    const dia = somarDiasISO(hoje, -(periodo - 1 - k))
    const h = HUMORES.find((x) => x.valor === porDia[dia]?.humor)
    const d = deISO(dia)
    return {
      dia,
      valor: h?.valor || null,
      cor: h ? `var(--${h.cor}-forte)` : null,
      rotulo: (periodo - 1 - k) % passoRotulo === 0 ? `${d.getDate()}/${d.getMonth() + 1}` : '',
      dica: `${formatarPrazo(dia)}: ${h ? h.label : 'sem registro'}`,
    }
  })

  const comHumor = pontos.filter((p) => p.valor)
  const total = comHumor.length
  const contas = HUMORES.map((h) => comHumor.filter((p) => p.valor === h.valor).length)
  const maior = Math.max(1, ...contas)
  const contagem = HUMORES.map((h, i) => {
    const n = contas[i]
    return {
      nome: h.label,
      valor: (n / maior) * 100, // escala relativa ao humor mais frequente (barra mais longa)
      cor: `var(--${h.cor}-forte)`,
      texto: `${n} dia${n === 1 ? '' : 's'}`,
      dica: `${h.label}: ${n} de ${total} dias registrados`,
    }
  }).reverse()
  const media = total ? comHumor.reduce((s, p) => s + p.valor, 0) / total : null
  const humorMedio = media ? HUMORES[Math.round(media) - 1] : null

  return (
    <section className="graficos-humor">
      <div className="grafico-titulo">
        <h2>como tenho me sentido</h2>
        <Chips
          valor={periodo}
          onChange={setPeriodo}
          opcoes={[
            { valor: 30, label: '30 dias' },
            { valor: 90, label: '90 dias' },
          ]}
        />
      </div>
      <div className="graficos-humor-grade">
        <div className="card fita fita-lavanda grafico-cartao">
          <span className="etiqueta">humor dia a dia</span>
          <LinhaHumor pontos={pontos} niveis={HUMORES.map((h) => h.label)} />
        </div>
        <div className="card fita grafico-cartao">
          <span className="etiqueta">quantas vezes</span>
          {total ? (
            <>
              <BarrasHorizontais itens={contagem} />
              <p className="mao humor-resumo">
                {total} de {periodo} dias registrados
                {humorMedio && (
                  <>
                    {' '}· na média: <span className={`tag-lista bg-${humorMedio.cor}`}>{humorMedio.label}</span>
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="mao suave">nenhum humor registrado nesse período</p>
          )}
        </div>
      </div>
    </section>
  )
}

function EditorDia({ entrada, onSalvar }) {
  const [humor, setHumor] = useState(entrada?.humor || null)
  const [gratidao, setGratidao] = useState(() => {
    const g = entrada?.gratidao || []
    return [g[0] || '', g[1] || '', g[2] || '']
  })
  const [texto, setTexto] = useState(entrada?.texto || '')
  const [estado, setEstado] = useState('salvo') // 'salvo' | 'mudou' | 'salvando'

  const mudou = (fn) => (...args) => {
    fn(...args)
    setEstado('mudou')
  }

  async function salvar() {
    setEstado('salvando')
    const ok = await onSalvar({ humor, gratidao: gratidao.map((g) => g.trim()).filter(Boolean), texto })
    setEstado(ok ? 'salvo' : 'mudou')
  }

  return (
    <div className="card diario-pagina fita">
      <div className="diario-secao">
        <span className="etiqueta">humor</span>
        <div className="humores">
          {HUMORES.map((h) => (
            <button
              key={h.valor}
              className={`humor bg-${h.cor} ${humor === h.valor ? 'escolhido' : ''}`}
              onClick={mudou(() => setHumor(humor === h.valor ? null : h.valor))}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div className="diario-secao">
        <span className="etiqueta">sou grata por…</span>
        {gratidao.map((g, i) => (
          <input
            key={i}
            className="gratidao"
            placeholder={`${i + 1}.`}
            value={g}
            onChange={mudou((e) => setGratidao(gratidao.map((x, j) => (j === i ? e.target.value : x))))}
          />
        ))}
      </div>

      <div className="diario-secao">
        <span className="etiqueta">querido diário</span>
        <textarea
          className="diario-texto pautado"
          placeholder="hoje…"
          value={texto}
          onChange={mudou((e) => setTexto(e.target.value))}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault()
              salvar()
            }
          }}
        />
      </div>

      <div className="modal-acoes">
        <span className="mao suave">{{ salvo: entrada ? 'guardado ✓' : '', mudou: 'não guardado ainda…', salvando: 'guardando…' }[estado]}</span>
        <button className="btn" onClick={salvar} disabled={estado !== 'mudou'}>
          guardar
        </button>
      </div>
    </div>
  )
}

function MiniCalendario({ diario, selecionado, onEscolher }) {
  const [mes, setMes] = useState(() => {
    const d = deISO(selecionado)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const hoje = hojeISO()
  const primeiro = inicioSemanaISO(paraISO(mes))
  const porDia = Object.fromEntries(diario.map((e) => [e.dia, e]))

  return (
    <div className="card mini-calendario">
      <div className="agenda-nav">
        <button className="btn-icone" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>
          ‹
        </button>
        <span className="mao">
          {MESES[mes.getMonth()]} {mes.getFullYear()}
        </span>
        <button className="btn-icone" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>
          ›
        </button>
      </div>
      <div className="mini-grade">
        {DIAS_CURTOS.map((n) => (
          <span key={n} className="mini-cabeca">
            {n[0]}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, i) => somarDiasISO(primeiro, i)).map((dia) => {
          const e = porDia[dia]
          const cor = e ? HUMORES.find((h) => h.valor === e.humor)?.cor || 'bege' : null
          return (
            <button
              key={dia}
              className={`mini-dia ${cor ? `bg-${cor} tem` : ''} ${deISO(dia).getMonth() !== mes.getMonth() ? 'fora' : ''} ${dia === selecionado ? 'selecionado' : ''} ${dia === hoje ? 'hoje' : ''}`}
              disabled={dia > hoje}
              onClick={() => onEscolher(dia)}
            >
              {deISO(dia).getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
