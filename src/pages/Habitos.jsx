import { useState } from 'react'
import { useHabitos, sequencia, progressoSemana, semanaDoHabito, taxaPeriodo } from '../lib/habitos'
import { BarrasVerticais, BarrasHorizontais } from '../components/Graficos'
import { useTabela } from '../hooks/useTabela'
import { hojeISO, somarDiasISO, inicioSemanaISO, DIAS_CURTOS, formatarPrazo, deISO } from '../lib/datas'
import { Cabecalho, Modal, Erro, Vazio, EscolherCor, Chips } from '../components/ui'

const SEMANAS_NO_MAPA = 18

export default function Habitos() {
  const { habitos, diasPorHabito, alternarDia, carregando, erro } = useHabitos()
  const metas = useTabela('metas')
  const [editando, setEditando] = useState(null) // null | 'novo' | hábito
  const [verArquivados, setVerArquivados] = useState(false)

  const ativos = habitos.linhas.filter((h) => !h.arquivado)
  const arquivados = habitos.linhas.filter((h) => h.arquivado)

  async function salvar(dados) {
    if (editando === 'novo') {
      if (await habitos.adicionar(dados)) setEditando(null)
    } else {
      await habitos.atualizar(editando.id, dados)
      setEditando(null)
    }
  }

  return (
    <div className="pagina">
      <Cabecalho icone="habitos" emoji="🔁" etiqueta="habit tracker" titulo="Hábitos" frase="um pouquinho todo dia ♡">
        <button className="btn" onClick={() => setEditando('novo')}>
          + hábito
        </button>
      </Cabecalho>

      <Erro>{erro}</Erro>

      {carregando ? (
        <Vazio>carregando…</Vazio>
      ) : ativos.length === 0 ? (
        <Vazio>nenhum hábito ainda… que tal começar com um bem pequenininho? ✿</Vazio>
      ) : (
        <div className="grade-habitos">
          {ativos.map((h) => (
            <CartaoHabito
              key={h.id}
              habito={h}
              dias={diasPorHabito[h.id]}
              meta={metas.linhas.find((m) => m.id === h.meta_id)}
              onAlternar={(dia) => alternarDia(h.id, dia)}
              onEditar={() => setEditando(h)}
            />
          ))}
        </div>
      )}

      {ativos.length > 0 && <GraficosHabitos habitos={ativos} diasPorHabito={diasPorHabito} />}

      {arquivados.length > 0 && (
        <div className="arquivados">
          <button className="link-acao" onClick={() => setVerArquivados(!verArquivados)}>
            {verArquivados ? 'esconder' : 'ver'} arquivados ({arquivados.length})
          </button>
          {verArquivados &&
            arquivados.map((h) => (
              <div key={h.id} className="arquivado-linha">
                <span>{h.nome}</span>
                <button className="link-acao" onClick={() => habitos.atualizar(h.id, { arquivado: false })}>
                  desarquivar
                </button>
                <button
                  className="link-acao perigo"
                  onClick={() => confirm(`Apagar "${h.nome}" e todo o histórico?`) && habitos.apagar(h.id)}
                >
                  apagar
                </button>
              </div>
            ))}
        </div>
      )}

      {editando && (
        <Modal titulo={editando === 'novo' ? 'novo hábito' : 'editar hábito'} onFechar={() => setEditando(null)}>
          <FormHabito
            inicial={editando === 'novo' ? {} : editando}
            metas={metas.linhas}
            onSalvar={salvar}
            onArquivar={
              editando !== 'novo'
                ? () => {
                    habitos.atualizar(editando.id, { arquivado: true })
                    setEditando(null)
                  }
                : null
            }
          />
        </Modal>
      )}
    </div>
  )
}

function CartaoHabito({ habito, dias = new Set(), meta, onAlternar, onEditar }) {
  const hoje = hojeISO()
  const inicio = inicioSemanaISO(hoje)
  const seq = sequencia(habito, dias)
  const { feitos, meta: metaSemana } = progressoSemana(habito, dias)

  return (
    <article className={`card cartao-habito fita`} style={{ '--cor-habito': `var(--${corForte(habito.cor)})` }}>
      <div className="cartao-linha entre">
        <h3>{habito.nome}</h3>
        <button className="link-acao" onClick={onEditar}>
          editar
        </button>
      </div>
      <p className="suave pequeno">
        {habito.frequencia === 'diaria' ? 'todo dia' : `${habito.vezes_semana}× por semana`}
        {meta && <> · meta: {meta.titulo}</>}
      </p>

      <div className="sequencia">
        <span className="sequencia-numero">{seq.valor}</span>
        <span className="mao">
          {seq.unidade} seguid{seq.unidade.startsWith('semana') ? 'a' : 'o'}
          {seq.valor === 1 ? '' : 's'}
        </span>
        <span className="etiqueta sequencia-semana">
          {feitos}/{metaSemana} esta semana
        </span>
      </div>

      {/* semana atual: clique para marcar/desmarcar o dia */}
      <div className="semana-habito">
        {DIAS_CURTOS.map((nome, i) => {
          const dia = somarDiasISO(inicio, i)
          const futuro = dia > hoje
          return (
            <button
              key={dia}
              className={`dia-habito ${dias.has(dia) ? 'feito' : ''} ${dia === hoje ? 'hoje' : ''}`}
              disabled={futuro}
              onClick={() => onAlternar(dia)}
              title={formatarPrazo(dia)}
            >
              <span>{nome}</span>
              <span className="dia-numero">{deISO(dia).getDate()}</span>
            </button>
          )
        })}
      </div>

      <MapaCalor dias={dias} />
    </article>
  )
}

// Quadradinhos estilo GitHub: cada coluna é uma semana, cada linha um dia
function MapaCalor({ dias }) {
  const hoje = hojeISO()
  const primeiro = somarDiasISO(inicioSemanaISO(hoje), -7 * (SEMANAS_NO_MAPA - 1))
  const semanas = []
  for (let s = 0; s < SEMANAS_NO_MAPA; s++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const dia = somarDiasISO(primeiro, s * 7 + d)
      col.push(
        <span
          key={dia}
          className={`quadradinho ${dias.has(dia) ? 'feito' : ''} ${dia > hoje ? 'futuro' : ''}`}
          title={formatarPrazo(dia)}
        />
      )
    }
    semanas.push(
      <div key={s} className="mapa-coluna">
        {col}
      </div>
    )
  }
  return <div className="mapa-calor">{semanas}</div>
}

// Gráficos: % da meta cumprida por semana (todos os hábitos somados) e taxa de cada hábito
function GraficosHabitos({ habitos, diasPorHabito }) {
  const [semanas, setSemanas] = useState(12)
  const [diasTaxa, setDiasTaxa] = useState(30)
  const hoje = hojeISO()
  const semanaAtual = inicioSemanaISO(hoje)

  const porSemana = Array.from({ length: semanas }, (_, k) => {
    const inicio = somarDiasISO(semanaAtual, -7 * (semanas - 1 - k))
    let feitos = 0
    let esperado = 0
    for (const h of habitos) {
      const r = semanaDoHabito(h, diasPorHabito[h.id], inicio)
      feitos += r.feitos
      esperado += r.esperado
    }
    const pct = esperado ? Math.round((feitos / esperado) * 100) : 0
    const dia = deISO(inicio)
    return {
      rotulo: `${dia.getDate()}/${dia.getMonth() + 1}`,
      valor: pct,
      dica: `semana de ${formatarPrazo(inicio)}: ${pct}% (${feitos} de ${esperado})`,
    }
  })

  const porHabito = habitos
    .map((h) => {
      const t = taxaPeriodo(h, diasPorHabito[h.id], diasTaxa)
      return {
        nome: h.nome,
        valor: t.pct,
        cor: `var(--${corForte(h.cor)})`,
        texto: `${t.pct}%`,
        dica: `${h.nome}: ${t.feitos} de ${t.esperado} ${h.frequencia === 'semanal' ? 'vezes' : 'dias'}`,
      }
    })
    .sort((a, b) => b.valor - a.valor)

  return (
    <section className="graficos-habitos">
      <div className="card fita fita-lavanda grafico-cartao">
        <div className="grafico-titulo">
          <span className="etiqueta">meta cumprida por semana</span>
          <Chips
            valor={semanas}
            onChange={setSemanas}
            opcoes={[
              { valor: 8, label: '8 sem.' },
              { valor: 12, label: '12 sem.' },
              { valor: 26, label: '6 meses' },
            ]}
          />
        </div>
        <BarrasVerticais dados={porSemana} cor="var(--rosa-forte)" />
      </div>

      <div className="card fita fita-bege grafico-cartao">
        <div className="grafico-titulo">
          <span className="etiqueta">cada hábito</span>
          <Chips
            valor={diasTaxa}
            onChange={setDiasTaxa}
            opcoes={[
              { valor: 7, label: '7 dias' },
              { valor: 30, label: '30 dias' },
              { valor: 90, label: '90 dias' },
            ]}
          />
        </div>
        <BarrasHorizontais itens={porHabito} />
      </div>
    </section>
  )
}

// Versão mais saturada da cor, usada no mapa e nas marcações (o tom pastel tem pouco contraste)
export function corForte(cor) {
  if (['rosa', 'laranja', 'amarelo', 'verde', 'azul', 'roxo', 'vermelho'].includes(cor)) return `${cor}-forte`
  // cores da paleta anterior, mantidas para hábitos criados antes da troca
  return { 'rosa-claro': 'rosa-antigo', malva: 'malva', lavanda: 'lavanda-forte', pessego: 'pessego-forte', salvia: 'salvia-forte', bege: 'dourado' }[cor] || 'rosa-forte'
}

function FormHabito({ inicial, metas, onSalvar, onArquivar }) {
  const [nome, setNome] = useState(inicial.nome || '')
  const [cor, setCor] = useState(inicial.cor || 'rosa')
  const [frequencia, setFrequencia] = useState(inicial.frequencia || 'diaria')
  const [vezes, setVezes] = useState(inicial.vezes_semana || 3)
  const [metaId, setMetaId] = useState(inicial.meta_id || '')

  function enviar(e) {
    e.preventDefault()
    if (!nome.trim()) return
    onSalvar({
      nome: nome.trim(),
      cor,
      frequencia,
      vezes_semana: frequencia === 'semanal' ? Number(vezes) : 1,
      meta_id: metaId || null,
    })
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo campo-largo">
        <span className="etiqueta">hábito</span>
        <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="beber água, ler 10 páginas…" required />
      </label>
      <label className="campo">
        <span className="etiqueta">frequência</span>
        <select value={frequencia} onChange={(e) => setFrequencia(e.target.value)}>
          <option value="diaria">todo dia</option>
          <option value="semanal">X vezes por semana</option>
        </select>
      </label>
      {frequencia === 'semanal' && (
        <label className="campo">
          <span className="etiqueta">vezes por semana</span>
          <input type="number" min="1" max="7" value={vezes} onChange={(e) => setVezes(e.target.value)} />
        </label>
      )}
      <div className="campo campo-largo">
        <span className="etiqueta">cor</span>
        <EscolherCor valor={cor} onChange={setCor} />
      </div>
      {metas.length > 0 && (
        <label className="campo campo-largo">
          <span className="etiqueta">ligado à meta</span>
          <select value={metaId} onChange={(e) => setMetaId(e.target.value)}>
            <option value="">nenhuma</option>
            {metas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.titulo}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="modal-acoes">
        {onArquivar && (
          <button type="button" className="link-acao" onClick={onArquivar}>
            arquivar
          </button>
        )}
        <button className="btn">salvar</button>
      </div>
    </form>
  )
}
