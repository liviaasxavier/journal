import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTabela } from '../hooks/useTabela'
import { hojeISO, formatarPrazo } from '../lib/datas'
import { Cabecalho, Modal, Erro, Vazio, Chips, Progresso } from '../components/ui'

export const STATUS_TOPICO = [
  { valor: 'nao_comecei', label: 'não comecei', cor: 'bege' },
  { valor: 'estudando', label: 'estudando', cor: 'pessego' },
  { valor: 'revisar', label: 'revisar', cor: 'rosa' },
  { valor: 'dominado', label: 'dominado ✓', cor: 'salvia' },
]

export default function Topicos() {
  const topicos = useTabela('topicos')
  const materias = useTabela('materias', { ordem: 'nome' })
  const notas = useTabela('notas')
  const [materiaFiltro, setMateriaFiltro] = useState('tudo')
  const [statusFiltro, setStatusFiltro] = useState('tudo')
  const [editando, setEditando] = useState(null)
  const hoje = hojeISO()

  const materiasAtivas = materias.linhas.filter((m) => !m.arquivada)
  const visiveis = topicos.linhas.filter(
    (t) => (materiaFiltro === 'tudo' || t.materia_id === materiaFiltro) && (statusFiltro === 'tudo' || t.status === statusFiltro)
  )
  const paraRevisar = topicos.linhas.filter((t) => t.proxima_revisao && t.proxima_revisao <= hoje && t.status !== 'dominado')

  // Agrupa por matéria (tópicos sem matéria ficam no fim)
  const grupos = [...materias.linhas, { id: null, nome: 'sem matéria', cor: 'bege' }]
    .map((m) => ({ materia: m, itens: visiveis.filter((t) => (t.materia_id || null) === m.id) }))
    .filter((g) => g.itens.length)

  function trocarStatus(t) {
    const i = STATUS_TOPICO.findIndex((s) => s.valor === t.status)
    const prox = STATUS_TOPICO[(i + 1) % STATUS_TOPICO.length].valor
    topicos.atualizar(t.id, { status: prox, ...(prox === 'dominado' ? { progresso: 100 } : {}) })
  }

  async function salvar(dados) {
    if (editando.novo) {
      if (await topicos.adicionar(dados)) setEditando(null)
    } else {
      await topicos.atualizar(editando.id, dados)
      setEditando(null)
    }
  }

  return (
    <div className="pagina">
      <Cabecalho icone="topicos" emoji="📚" etiqueta="tópicos para estudar" titulo="Tópicos" frase="devagar e sempre ♡">
        <button className="btn" onClick={() => setEditando({ novo: true, materia_id: materiaFiltro === 'tudo' ? '' : materiaFiltro })}>
          + tópico
        </button>
      </Cabecalho>
      <Erro>{topicos.erro || materias.erro}</Erro>

      {paraRevisar.length > 0 && (
        <div className="card fita fita-malva aviso-revisao">
          <span className="etiqueta">revisar hoje</span>
          {paraRevisar.map((t) => (
            <button key={t.id} className="chip bg-rosa" onClick={() => setEditando(t)}>
              {t.titulo}
            </button>
          ))}
        </div>
      )}

      <div className="barra-ferramentas">
        <Chips
          valor={materiaFiltro}
          onChange={setMateriaFiltro}
          opcoes={[{ valor: 'tudo', label: 'todas' }, ...materiasAtivas.map((m) => ({ valor: m.id, label: m.nome, cor: m.cor }))]}
        />
        <Chips
          valor={statusFiltro}
          onChange={setStatusFiltro}
          opcoes={[{ valor: 'tudo', label: 'tudo' }, ...STATUS_TOPICO.map((s) => ({ ...s, numero: topicos.linhas.filter((t) => t.status === s.valor).length }))]}
        />
      </div>

      {topicos.carregando ? (
        <Vazio>carregando…</Vazio>
      ) : grupos.length === 0 ? (
        <Vazio>{topicos.linhas.length ? 'nada com esse filtro ✿' : 'liste o que precisa estudar ✿'}</Vazio>
      ) : (
        grupos.map(({ materia, itens }) => {
          const media = Math.round(itens.reduce((s, t) => s + t.progresso, 0) / itens.length)
          return (
            <section key={materia.id || 'sem'} className="grupo-topicos">
              <div className="grupo-topicos-titulo">
                <span className={`tag-lista bg-${materia.cor}`}>{materia.nome}</span>
                <Progresso valor={media} />
                <span className="mao">{media}%</span>
              </div>
              <div className="card lista-topicos">
                {itens.map((t) => {
                  const st = STATUS_TOPICO.find((s) => s.valor === t.status)
                  const qtdNotas = notas.linhas.filter((n) => n.topico_id === t.id).length
                  return (
                    <div key={t.id} className={`topico ${t.status === 'dominado' ? 'dominado' : ''}`}>
                      <button className={`status-chip bg-${st.cor}`} onClick={() => trocarStatus(t)} title="clique para avançar">
                        {st.label}
                      </button>
                      <button className="link-simples topico-titulo" onClick={() => setEditando(t)}>
                        {t.titulo}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={t.progresso}
                        onChange={(e) => topicos.atualizar(t.id, { progresso: Number(e.target.value) })}
                        className="deslizante"
                        aria-label="progresso"
                      />
                      <span className="mao topico-pct">{t.progresso}%</span>
                      {t.proxima_revisao && (
                        <span className={`mao pequeno ${t.proxima_revisao <= hoje ? 'atrasada' : 'suave'}`}>revisar {formatarPrazo(t.proxima_revisao)}</span>
                      )}
                      <Link className="link-acao" to={`/caderninho?topico=${t.id}`}>
                        {qtdNotas ? `${qtdNotas} nota${qtdNotas > 1 ? 's' : ''}` : '+ nota'}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })
      )}

      {editando && (
        <Modal titulo={editando.novo ? 'novo tópico' : 'editar tópico'} onFechar={() => setEditando(null)}>
          <FormTopico
            inicial={editando}
            materias={materiasAtivas}
            onSalvar={salvar}
            onApagar={
              !editando.novo
                ? () => {
                    if (confirm('Apagar este tópico?')) {
                      topicos.apagar(editando.id)
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

function FormTopico({ inicial, materias, onSalvar, onApagar }) {
  const [v, setV] = useState({
    titulo: inicial.titulo || '',
    materia_id: inicial.materia_id || '',
    status: inicial.status || 'nao_comecei',
    progresso: inicial.progresso ?? 0,
    proxima_revisao: inicial.proxima_revisao || '',
    notas: inicial.notas || '',
  })
  const mudar = (campo) => (e) => setV({ ...v, [campo]: e.target.value })

  function enviar(e) {
    e.preventDefault()
    onSalvar({
      ...v,
      titulo: v.titulo.trim(),
      materia_id: v.materia_id || null,
      progresso: Number(v.progresso),
      proxima_revisao: v.proxima_revisao || null,
      notas: v.notas.trim() || null,
    })
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo campo-largo">
        <span className="etiqueta">tópico</span>
        <input autoFocus value={v.titulo} onChange={mudar('titulo')} required />
      </label>
      <label className="campo">
        <span className="etiqueta">matéria</span>
        <select value={v.materia_id} onChange={mudar('materia_id')}>
          <option value="">—</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span className="etiqueta">status</span>
        <select value={v.status} onChange={mudar('status')}>
          {STATUS_TOPICO.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span className="etiqueta">progresso: {v.progresso}%</span>
        <input type="range" min="0" max="100" step="10" value={v.progresso} onChange={mudar('progresso')} className="deslizante" />
      </label>
      <label className="campo">
        <span className="etiqueta">próxima revisão</span>
        <input type="date" value={v.proxima_revisao} onChange={mudar('proxima_revisao')} />
      </label>
      <label className="campo campo-largo">
        <span className="etiqueta">observações</span>
        <textarea rows={3} value={v.notas} onChange={mudar('notas')} />
      </label>
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
