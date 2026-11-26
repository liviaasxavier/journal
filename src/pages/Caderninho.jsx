import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTabela } from '../hooks/useTabela'
import { markdownParaHTML } from '../lib/markdown'
import { formatarPrazo, paraISO } from '../lib/datas'
import { Cabecalho, Erro, Vazio } from '../components/ui'
import { enfeitar } from '../components/Enfeite'

export default function Caderninho() {
  const notas = useTabela('notas', { ordem: 'atualizada_em' })
  const materias = useTabela('materias', { ordem: 'nome' })
  const topicos = useTabela('topicos')
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState('')
  const [materiaFiltro, setMateriaFiltro] = useState('tudo')
  const [selecionadaId, setSelecionadaId] = useState(params.get('nota'))

  const topicoParam = params.get('topico')
  const topicoAtual = topicos.linhas.find((t) => t.id === topicoParam)

  const b = busca.trim().toLowerCase()
  const visiveis = notas.linhas
    .filter((n) => !topicoParam || n.topico_id === topicoParam)
    .filter((n) => materiaFiltro === 'tudo' || n.materia_id === materiaFiltro)
    .filter((n) => !b || n.titulo.toLowerCase().includes(b) || n.conteudo.toLowerCase().includes(b))
    .sort((x, y) => y.atualizada_em.localeCompare(x.atualizada_em))

  const selecionada = notas.linhas.find((n) => n.id === selecionadaId)

  // Sem nota aberta: abre a mais recente (ou a primeira do tópico filtrado)
  useEffect(() => {
    if (!selecionada && visiveis.length) setSelecionadaId(visiveis[0].id)
  }, [topicoParam, visiveis.length, selecionada])

  async function novaNota() {
    const nova = await notas.adicionar({
      titulo: topicoAtual ? topicoAtual.titulo : 'nova nota',
      topico_id: topicoParam || null,
      materia_id: topicoAtual?.materia_id || (materiaFiltro !== 'tudo' ? materiaFiltro : null),
    })
    if (nova) setSelecionadaId(nova.id)
  }

  const nomeMateria = (id) => materias.linhas.find((m) => m.id === id)

  return (
    <div className="pagina pagina-larga">
      <Cabecalho icone="caderninho" emoji="📓" etiqueta="caderninho de estudos" titulo="Caderninho" frase="anota tudo, amiga ♡">
        <button className="btn" onClick={novaNota}>
          + nota
        </button>
      </Cabecalho>
      <Erro>{notas.erro}</Erro>

      <div className="caderno-layout">
        <aside className="card caderno-lista">
          <input className="busca" placeholder="buscar nas notas…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={materiaFiltro} onChange={(e) => setMateriaFiltro(e.target.value)}>
            <option value="tudo">todas as matérias</option>
            {materias.linhas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          {topicoAtual && (
            <p className="filtro-topico">
              tópico: <b>{topicoAtual.titulo}</b>{' '}
              <button className="link-acao" onClick={() => setParams({})}>
                ✕
              </button>
            </p>
          )}
          {notas.carregando ? (
            <Vazio>carregando…</Vazio>
          ) : visiveis.length === 0 ? (
            <Vazio>nenhuma nota ✿</Vazio>
          ) : (
            <ul>
              {visiveis.map((n) => {
                const m = nomeMateria(n.materia_id)
                return (
                  <li key={n.id}>
                    <button className={`nota-item ${n.id === selecionadaId ? 'ativa' : ''}`} onClick={() => setSelecionadaId(n.id)}>
                      <b>{n.titulo || 'sem título'}</b>
                      <span className="pequeno suave">
                        {m && <span className={`bolinha bg-${m.cor}`} />} {formatarPrazo(paraISO(new Date(n.atualizada_em)))}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {selecionada ? (
          <EditorNota
            key={selecionada.id}
            nota={selecionada}
            materias={materias.linhas}
            topicos={topicos.linhas}
            onSalvar={(dados) => notas.atualizar(selecionada.id, { ...dados, atualizada_em: new Date().toISOString() })}
            onApagar={() => {
              if (confirm('Apagar esta nota?')) {
                notas.apagar(selecionada.id)
                setSelecionadaId(null)
              }
            }}
          />
        ) : (
          <div className="card quadriculado caderno-vazio">
            <p className="mao">{enfeitar('escolha uma nota ou crie uma nova ✿')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Editor com salvamento automático: salva 0,8 s depois da última alteração.
function EditorNota({ nota, materias, topicos, onSalvar, onApagar }) {
  const [v, setV] = useState({
    titulo: nota.titulo,
    conteudo: nota.conteudo,
    materia_id: nota.materia_id || '',
    topico_id: nota.topico_id || '',
  })
  const [modo, setModo] = useState(nota.conteudo ? 'ver' : 'editar')
  const [estado, setEstado] = useState('salvo')
  const pendente = useRef(null) // alterações ainda não enviadas ao banco

  function mudar(campo, valor) {
    const novo = { ...v, [campo]: valor }
    setV(novo)
    pendente.current = novo
    setEstado('mudou')
  }

  function salvarAgora() {
    if (!pendente.current) return
    const d = pendente.current
    pendente.current = null
    onSalvar({ ...d, materia_id: d.materia_id || null, topico_id: d.topico_id || null })
    setEstado('salvo')
  }

  // Debounce: cada alteração reinicia o temporizador de 800 ms
  useEffect(() => {
    if (estado !== 'mudou') return
    const t = setTimeout(salvarAgora, 800)
    return () => clearTimeout(t)
  }, [v, estado])

  // Ao desmontar (troca de nota ou de página), salva alterações pendentes
  useEffect(() => () => salvarAgora(), [])

  const topicosDaMateria = topicos.filter((t) => !v.materia_id || t.materia_id === v.materia_id)

  return (
    <div className="card caderno-editor fita fita-lavanda">
      <input className="nota-titulo" value={v.titulo} onChange={(e) => mudar('titulo', e.target.value)} placeholder="título" />
      <div className="nota-meta">
        <select value={v.materia_id} onChange={(e) => mudar('materia_id', e.target.value)}>
          <option value="">sem matéria</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
        <select value={v.topico_id} onChange={(e) => mudar('topico_id', e.target.value)}>
          <option value="">sem tópico</option>
          {topicosDaMateria.map((t) => (
            <option key={t.id} value={t.id}>
              {t.titulo}
            </option>
          ))}
        </select>
        <div className="chips">
          <button className={`chip ${modo === 'editar' ? 'ativa' : ''}`} onClick={() => setModo('editar')}>
            escrever
          </button>
          <button className={`chip ${modo === 'ver' ? 'ativa' : ''}`} onClick={() => setModo('ver')}>
            ver
          </button>
        </div>
      </div>

      {modo === 'editar' ? (
        <textarea
          className="nota-texto quadriculado"
          autoFocus={!nota.conteudo}
          value={v.conteudo}
          onChange={(e) => mudar('conteudo', e.target.value)}
          placeholder={'# título\n\n**negrito**, *itálico*, - listas, - [ ] caixinhas, `código`…'}
        />
      ) : (
        <div className="markdown nota-ver" onDoubleClick={() => setModo('editar')} dangerouslySetInnerHTML={{ __html: markdownParaHTML(v.conteudo) || '<p class="suave">nota vazia — clique em "escrever"</p>' }} />
      )}

      <div className="modal-acoes">
        <button className="link-acao perigo" onClick={onApagar}>
          apagar
        </button>
        <span className="mao suave">{estado === 'salvo' ? 'salvo ✓' : 'salvando…'}</span>
      </div>
    </div>
  )
}
