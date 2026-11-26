import { useMemo, useState } from 'react'
import { useTarefas } from '../hooks/useTarefas'
import { useTabela } from '../hooks/useTabela'
import { hojeISO, formatarPrazo } from '../lib/datas'
import Icone from '../components/Icone'
import { CORES } from '../components/ui'
import { enfeitar } from '../components/Enfeite'

const PRIORIDADES = {
  alta: { label: 'alta', ordem: 0 },
  media: { label: 'média', ordem: 1 },
  baixa: { label: 'baixa', ordem: 2 },
}
const PROXIMA_PRIORIDADE = { alta: 'media', media: 'baixa', baixa: 'alta' }

// Cores atribuídas às listas novas, em rodízio
const CORES_LISTAS = CORES

// Cada filtro é uma função que decide se a tarefa aparece.
// "recemFeita" = concluída nesta visita: continua visível, riscada,
// até a troca de aba ou o recarregamento da página.
const FILTROS = [
  { id: 'pendentes', label: 'pendentes', teste: (t, c) => !t.concluida || c.recemFeita },
  { id: 'hoje', label: 'hoje', teste: (t, c) => (!t.concluida || c.recemFeita) && t.prazo === c.hoje },
  {
    id: 'semana',
    label: 'semana',
    teste: (t, c) => (!t.concluida || c.recemFeita) && t.prazo && t.prazo >= c.hoje && t.prazo <= c.daqui7,
  },
  { id: 'atrasadas', label: 'atrasadas', teste: (t, c) => (!t.concluida || c.recemFeita) && t.prazo && t.prazo < c.hoje },
  { id: 'concluidas', label: 'feitas', teste: (t) => t.concluida },
]

// Pendentes primeiro; entre elas, prazo mais próximo (sem prazo no fim) e depois prioridade.
// Feitas: as concluídas mais recentemente primeiro.
function ordenar(a, b) {
  if (a.concluida !== b.concluida) return a.concluida ? 1 : -1
  if (a.concluida) return (b.concluida_em || '').localeCompare(a.concluida_em || '')
  if (a.prazo !== b.prazo) {
    if (!a.prazo) return 1
    if (!b.prazo) return -1
    return a.prazo.localeCompare(b.prazo)
  }
  if (a.prioridade !== b.prioridade) return PRIORIDADES[a.prioridade].ordem - PRIORIDADES[b.prioridade].ordem
  return a.criada_em.localeCompare(b.criada_em)
}

export default function Tarefas() {
  const { tarefas, carregando, erro, adicionar, atualizar, alternarConcluida, apagar } = useTarefas()
  const listas = useTabela('listas')
  const [filtro, setFiltro] = useState('pendentes')
  const [listaAtual, setListaAtual] = useState('tudo') // 'tudo' ou o id de uma lista
  const [recemFeitas, setRecemFeitas] = useState(() => new Set())

  const hoje = hojeISO()
  const daqui7 = hojeISO(6)
  const listaPorId = Object.fromEntries(listas.linhas.map((l) => [l.id, l]))

  function trocarFiltro(id) {
    setFiltro(id)
    setRecemFeitas(new Set()) // ao trocar de aba, as riscadas passam para "feitas"
  }

  function concluir(t) {
    // Alterna a conclusão e registra a tarefa como recém-concluída (para não sumir da lista)
    setRecemFeitas((atual) => {
      const novo = new Set(atual)
      if (t.concluida) novo.delete(t.id)
      else novo.add(t.id)
      return novo
    })
    alternarConcluida(t)
  }

  // useMemo: recalcula apenas quando alguma dependência muda
  const { visiveis, contagem } = useMemo(() => {
    const daLista = listaAtual === 'tudo' ? tarefas : tarefas.filter((t) => t.lista_id === listaAtual)
    const contagem = {}
    for (const f of FILTROS) {
      // Contador das abas: só tarefas pendentes (exceto na aba de feitas)
      contagem[f.id] = daLista.filter(
        (t) => f.teste(t, { hoje, daqui7, recemFeita: false }) && (f.id === 'concluidas' || !t.concluida)
      ).length
    }
    const atual = FILTROS.find((f) => f.id === filtro)
    const visiveis = daLista
      .filter((t) => atual.teste(t, { hoje, daqui7, recemFeita: recemFeitas.has(t.id) }))
      .sort(ordenar)
    return { visiveis, contagem }
  }, [tarefas, filtro, listaAtual, recemFeitas, hoje, daqui7])

  async function criarLista(nome) {
    const cor = CORES_LISTAS[listas.linhas.length % CORES_LISTAS.length]
    const nova = await listas.adicionar({ nome, cor })
    if (nova) setListaAtual(nova.id)
  }

  async function apagarLista(lista) {
    if (!confirm(`Apagar a lista "${lista.nome}"? As tarefas dela continuam, só ficam sem lista.`)) return
    setListaAtual('tudo')
    await listas.apagar(lista.id)
    // O banco já desvinculou as tarefas (on delete set null); aqui o estado local é atualizado
    for (const t of tarefas) if (t.lista_id === lista.id) atualizar(t.id, { lista_id: null })
  }

  const erroGeral = erro || listas.erro

  return (
    <div className="pagina">
      <header className="cabecalho">
        <span className="etiqueta">to-do</span>
        <h1>
          <Icone nome="todo" emoji="✅" className="icone-titulo" /> Tarefas
        </h1>
        <p className="mao">{enfeitar('uma coisinha de cada vez ♡')}</p>
      </header>

      <BarraListas
        listas={listas.linhas}
        atual={listaAtual}
        onEscolher={setListaAtual}
        onCriar={criarLista}
        onRenomear={(id, nome) => listas.atualizar(id, { nome })}
        onApagar={apagarLista}
      />

      <NovaTarefa
        key={listaAtual} // recria o formulário ao trocar de lista, já com a lista selecionada
        listas={listas.linhas}
        listaInicial={listaAtual === 'tudo' ? '' : listaAtual}
        onAdicionar={adicionar}
      />

      <nav className="abas">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            className={`aba ${filtro === f.id ? 'ativa' : ''} ${f.id === 'atrasadas' && contagem.atrasadas ? 'alerta' : ''}`}
            onClick={() => trocarFiltro(f.id)}
          >
            {f.label} <span className="aba-numero">{contagem[f.id]}</span>
          </button>
        ))}
      </nav>

      <div className="card lista-tarefas">
        {erroGeral && <p className="erro">ops: {erroGeral}</p>}
        {carregando ? (
          <p className="mao vazio">carregando…</p>
        ) : visiveis.length === 0 ? (
          <p className="mao vazio">{enfeitar(filtro === 'concluidas' ? 'nada feito ainda… bora? ♡' : 'nada por aqui ✿')}</p>
        ) : (
          <ul>
            {visiveis.map((t) => (
              <ItemTarefa
                key={t.id}
                tarefa={t}
                hoje={hoje}
                lista={listaAtual === 'tudo' ? listaPorId[t.lista_id] : null}
                podeApagar={filtro === 'concluidas'}
                onConcluir={() => concluir(t)}
                onPrioridade={() => atualizar(t.id, { prioridade: PROXIMA_PRIORIDADE[t.prioridade] })}
                onRenomear={(titulo) => atualizar(t.id, { titulo })}
                onPrazo={(prazo) => atualizar(t.id, { prazo: prazo || null })}
                onApagar={() => {
                  if (confirm(`Apagar "${t.titulo}" de vez?`)) apagar(t.id)
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Fileira de etiquetas: "tudo", uma por lista e "+ lista"
function BarraListas({ listas, atual, onEscolher, onCriar, onRenomear, onApagar }) {
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [editandoId, setEditandoId] = useState(null)

  function salvarNova() {
    if (nome.trim()) onCriar(nome.trim())
    setNome('')
    setCriando(false)
  }

  return (
    <div className="barra-listas">
      <button className={`chip-lista ${atual === 'tudo' ? 'ativa' : ''}`} onClick={() => onEscolher('tudo')}>
        tudo
      </button>

      {listas.map((l) =>
        editandoId === l.id ? (
          <EditarNome
            key={l.id}
            inicial={l.nome}
            onSalvar={(novo) => {
              if (novo && novo !== l.nome) onRenomear(l.id, novo)
              setEditandoId(null)
            }}
          />
        ) : (
          <span key={l.id} className={`chip-lista bg-${l.cor} ${atual === l.id ? 'ativa' : ''}`}>
            <button
              onClick={() => onEscolher(l.id)}
              onDoubleClick={() => setEditandoId(l.id)}
              title="clique duas vezes para renomear"
            >
              {l.nome}
            </button>
            {atual === l.id && (
              <button className="chip-apagar" onClick={() => onApagar(l)} aria-label="apagar lista">
                ✕
              </button>
            )}
          </span>
        )
      )}

      {criando ? (
        <input
          className="chip-input"
          autoFocus
          placeholder="nome da lista"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={salvarNova}
          onKeyDown={(e) => {
            if (e.key === 'Enter') salvarNova()
            if (e.key === 'Escape') {
              setNome('')
              setCriando(false)
            }
          }}
        />
      ) : (
        <button className="chip-lista chip-nova" onClick={() => setCriando(true)}>
          + lista
        </button>
      )}
    </div>
  )
}

function EditarNome({ inicial, onSalvar }) {
  const [texto, setTexto] = useState(inicial)
  return (
    <input
      className="chip-input"
      autoFocus
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => onSalvar(texto.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSalvar(texto.trim())
        if (e.key === 'Escape') onSalvar(inicial)
      }}
    />
  )
}

function NovaTarefa({ listas, listaInicial, onAdicionar }) {
  const [titulo, setTitulo] = useState('')
  const [prazo, setPrazo] = useState('')
  const [prioridade, setPrioridade] = useState('media')
  const [listaId, setListaId] = useState(listaInicial)
  const [salvando, setSalvando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    setSalvando(true)
    const ok = await onAdicionar({
      titulo: titulo.trim(),
      prazo: prazo || null,
      prioridade,
      lista_id: listaId || null,
    })
    setSalvando(false)
    if (ok) {
      setTitulo('')
      setPrazo('')
      setPrioridade('media')
    }
  }

  return (
    <form className="card fita fita-malva nova-tarefa" onSubmit={enviar}>
      <input
        className="nova-titulo"
        placeholder="nova tarefa…"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <div className="nova-opcoes">
        <label>
          <span className="etiqueta">prazo</span>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>
        {listas.length > 0 && (
          <label>
            <span className="etiqueta">lista</span>
            <select value={listaId} onChange={(e) => setListaId(e.target.value)}>
              <option value="">sem lista</option>
              {listas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="escolha-prioridade">
          {Object.entries(PRIORIDADES).map(([valor, p]) => (
            <button
              type="button"
              key={valor}
              className={`prioridade prioridade-${valor} ${prioridade === valor ? 'escolhida' : ''}`}
              onClick={() => setPrioridade(valor)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button className="btn" disabled={salvando || !titulo.trim()}>
          {salvando ? 'salvando…' : 'adicionar'}
        </button>
      </div>
    </form>
  )
}

function ItemTarefa({ tarefa, hoje, lista, podeApagar, onConcluir, onPrioridade, onRenomear, onPrazo, onApagar }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(tarefa.titulo)
  const atrasada = !tarefa.concluida && tarefa.prazo && tarefa.prazo < hoje

  function salvarTitulo() {
    setEditando(false)
    const novo = texto.trim()
    if (novo && novo !== tarefa.titulo) onRenomear(novo)
    else setTexto(tarefa.titulo)
  }

  return (
    <li className={`tarefa ${tarefa.concluida ? 'feita' : ''}`}>
      <button
        className="checkbox"
        onClick={onConcluir}
        aria-label={tarefa.concluida ? 'desmarcar' : 'concluir'}
      >
        {tarefa.concluida && '✓'}
      </button>

      <div className="tarefa-corpo">
        {editando ? (
          <input
            className="tarefa-editar"
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={salvarTitulo}
            onKeyDown={(e) => {
              if (e.key === 'Enter') salvarTitulo()
              if (e.key === 'Escape') {
                setTexto(tarefa.titulo)
                setEditando(false)
              }
            }}
          />
        ) : (
          <span className="tarefa-titulo" onDoubleClick={() => setEditando(true)} title="clique duas vezes para editar">
            {tarefa.titulo}
          </span>
        )}

        <div className="tarefa-detalhes">
          {/* input de data invisível sobre o texto: clicar no prazo abre o seletor de data */}
          <label className={`prazo ${atrasada ? 'atrasada' : ''}`}>
            {tarefa.prazo ? formatarPrazo(tarefa.prazo) : '+ prazo'}
            <input type="date" value={tarefa.prazo || ''} onChange={(e) => onPrazo(e.target.value)} />
          </label>
          <button
            className={`prioridade prioridade-${tarefa.prioridade}`}
            onClick={onPrioridade}
            title="clique para trocar a prioridade"
          >
            {PRIORIDADES[tarefa.prioridade].label}
          </button>
          {lista && <span className={`tag-lista bg-${lista.cor}`}>{lista.nome}</span>}
        </div>
      </div>

      {podeApagar && (
        <button className="tarefa-apagar" onClick={onApagar} aria-label="apagar de vez">
          ✕
        </button>
      )}
    </li>
  )
}
