import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTabela } from '../hooks/useTabela'
import { useHabitos, sequencia } from '../lib/habitos'
import { formatarPrazo, hojeISO } from '../lib/datas'
import { Cabecalho, Modal, Erro, Vazio, Progresso, EscolherCor, Chips } from '../components/ui'
import { enfeitar } from '../components/Enfeite'

// Progresso = (etapas feitas + tarefas ligadas concluídas) / total
export function progressoMeta(meta, tarefas) {
  const etapas = meta.etapas || []
  const ligadas = tarefas.filter((t) => t.meta_id === meta.id)
  const total = etapas.length + ligadas.length
  if (meta.concluida) return 100
  if (!total) return 0
  const feitas = etapas.filter((e) => e.feita).length + ligadas.filter((t) => t.concluida).length
  return Math.round((feitas / total) * 100)
}

export default function Metas() {
  const metas = useTabela('metas')
  const tarefas = useTabela('tarefas')
  const { habitos, diasPorHabito } = useHabitos()
  const [filtro, setFiltro] = useState('ativas')
  const [editando, setEditando] = useState(null)

  const visiveis = metas.linhas.filter((m) => (filtro === 'ativas' ? !m.concluida : m.concluida))

  async function salvar(dados) {
    if (editando === 'nova') {
      if (await metas.adicionar(dados)) setEditando(null)
    } else {
      await metas.atualizar(editando.id, dados)
      setEditando(null)
    }
  }

  return (
    <div className="pagina">
      <Cabecalho icone="metas" emoji="🎯" etiqueta="metas" titulo="Metas" frase="sonhos com passinhos ♡">
        <button className="btn" onClick={() => setEditando('nova')}>
          + meta
        </button>
      </Cabecalho>
      <Erro>{metas.erro || tarefas.erro}</Erro>

      <Chips
        valor={filtro}
        onChange={setFiltro}
        opcoes={[
          { valor: 'ativas', label: 'em andamento', numero: metas.linhas.filter((m) => !m.concluida).length },
          { valor: 'concluidas', label: 'conquistadas ✓', numero: metas.linhas.filter((m) => m.concluida).length },
        ]}
      />

      {metas.carregando ? (
        <Vazio>carregando…</Vazio>
      ) : visiveis.length === 0 ? (
        <Vazio>{filtro === 'ativas' ? 'qual é o próximo sonho? ✿' : 'ainda nenhuma… mas vai ter ♡'}</Vazio>
      ) : (
        <div className="lista-metas">
          {visiveis.map((m) => (
            <CartaoMeta
              key={m.id}
              meta={m}
              tarefas={tarefas}
              habitos={habitos.linhas.filter((h) => h.meta_id === m.id && !h.arquivado)}
              diasPorHabito={diasPorHabito}
              onAtualizar={(d) => metas.atualizar(m.id, d)}
              onEditar={() => setEditando(m)}
            />
          ))}
        </div>
      )}

      {editando && (
        <Modal titulo={editando === 'nova' ? 'nova meta' : 'editar meta'} onFechar={() => setEditando(null)}>
          <FormMeta
            inicial={editando === 'nova' ? {} : editando}
            onSalvar={salvar}
            onApagar={
              editando !== 'nova'
                ? () => {
                    if (confirm('Apagar esta meta? (tarefas e hábitos ligados continuam existindo)')) {
                      metas.apagar(editando.id)
                      setEditando(null)
                    }
                  }
                : null
            }
          />
        </Modal>
      )}
    </div>
  )
}

function CartaoMeta({ meta, tarefas, habitos, diasPorHabito, onAtualizar, onEditar }) {
  const [novaEtapa, setNovaEtapa] = useState('')
  const [novaTarefa, setNovaTarefa] = useState('')
  const etapas = meta.etapas || []
  const ligadas = tarefas.linhas.filter((t) => t.meta_id === meta.id)
  const pct = progressoMeta(meta, tarefas.linhas)
  const hoje = hojeISO()

  const salvarEtapas = (lista) => onAtualizar({ etapas: lista })

  return (
    <article className={`card cartao-meta fita bg-${meta.cor} ${meta.concluida ? 'esmaecido' : ''}`}>
      <div className="cartao-linha entre">
        <h3>{meta.titulo}</h3>
        <button className="link-acao" onClick={onEditar}>
          editar
        </button>
      </div>
      {meta.descricao && <p className="cartao-texto">{meta.descricao}</p>}
      <div className="cartao-linha">
        <Progresso valor={pct} cor="vinho" />
        <span className="mao">{pct}%</span>
        {meta.prazo && <span className={`mao ${meta.prazo < hoje && !meta.concluida ? 'atrasada' : 'suave'}`}>até {formatarPrazo(meta.prazo)}</span>}
      </div>

      <div className="meta-colunas">
        <div>
          <span className="etiqueta">etapas</span>
          <ul className="etapas">
            {etapas.map((e, i) => (
              <li key={i} className={e.feita ? 'feita' : ''}>
                <button className="checkbox" onClick={() => salvarEtapas(etapas.map((x, j) => (j === i ? { ...x, feita: !x.feita } : x)))}>
                  {e.feita && '✓'}
                </button>
                <span>{e.texto}</span>
                <button className="link-acao" onClick={() => salvarEtapas(etapas.filter((_, j) => j !== i))} aria-label="tirar etapa">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              if (novaEtapa.trim()) salvarEtapas([...etapas, { texto: novaEtapa.trim(), feita: false }])
              setNovaEtapa('')
            }}
          >
            <input className="input-pequeno" placeholder="+ etapa" value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)} />
          </form>
        </div>

        <div>
          <span className="etiqueta">tarefas ligadas</span>
          <ul className="etapas">
            {ligadas.map((t) => (
              <li key={t.id} className={t.concluida ? 'feita' : ''}>
                <button
                  className="checkbox"
                  onClick={() => tarefas.atualizar(t.id, { concluida: !t.concluida, concluida_em: t.concluida ? null : new Date().toISOString() })}
                >
                  {t.concluida && '✓'}
                </button>
                <span>{t.titulo}</span>
                {t.prazo && <span className="mao pequeno">{formatarPrazo(t.prazo)}</span>}
              </li>
            ))}
          </ul>
          <form
            onSubmit={async (ev) => {
              ev.preventDefault()
              if (novaTarefa.trim()) await tarefas.adicionar({ titulo: novaTarefa.trim(), meta_id: meta.id })
              setNovaTarefa('')
            }}
          >
            <input className="input-pequeno" placeholder="+ tarefa (vai pro to-do)" value={novaTarefa} onChange={(e) => setNovaTarefa(e.target.value)} />
          </form>

          {habitos.length > 0 && (
            <>
              <span className="etiqueta">hábitos ligados</span>
              <ul className="etapas">
                {habitos.map((h) => {
                  const s = sequencia(h, diasPorHabito[h.id])
                  return (
                    <li key={h.id}>
                      <Link to="/habitos">{h.nome}</Link>
                      <span className="mao pequeno">
                        {s.valor} {s.unidade}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="modal-acoes">
        <button className={meta.concluida ? 'link-acao' : 'btn'} onClick={() => onAtualizar({ concluida: !meta.concluida })}>
          {meta.concluida ? 'reabrir' : enfeitar('conquistei! ♡')}
        </button>
      </div>
    </article>
  )
}

function FormMeta({ inicial, onSalvar, onApagar }) {
  const [v, setV] = useState({
    titulo: inicial.titulo || '',
    descricao: inicial.descricao || '',
    prazo: inicial.prazo || '',
    cor: inicial.cor || 'rosa',
  })
  const mudar = (campo) => (e) => setV({ ...v, [campo]: e.target.value })

  return (
    <form
      className="formulario"
      onSubmit={(e) => {
        e.preventDefault()
        onSalvar({ ...v, titulo: v.titulo.trim(), descricao: v.descricao.trim() || null, prazo: v.prazo || null })
      }}
    >
      <label className="campo campo-largo">
        <span className="etiqueta">meta</span>
        <input autoFocus value={v.titulo} onChange={mudar('titulo')} required />
      </label>
      <label className="campo campo-largo">
        <span className="etiqueta">por quê / detalhes</span>
        <textarea rows={3} value={v.descricao} onChange={mudar('descricao')} />
      </label>
      <label className="campo">
        <span className="etiqueta">prazo</span>
        <input type="date" value={v.prazo} onChange={mudar('prazo')} />
      </label>
      <div className="campo">
        <span className="etiqueta">cor</span>
        <EscolherCor valor={v.cor} onChange={(cor) => setV({ ...v, cor })} />
      </div>
      <div className="modal-acoes">
        {onApagar && (
          <button type="button" className="link-acao perigo" onClick={onApagar}>
            apagar
          </button>
        )}
        <button className="btn">salvar</button>
      </div>
    </form>
  )
}
