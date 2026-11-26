import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTabela } from '../hooks/useTabela'
import { hojeISO, somarDiasISO, inicioSemanaISO, paraISO, deISO, DIAS_CURTOS, MESES, formatarLongo, hora } from '../lib/datas'
import { Cabecalho, Modal, Erro, CORES } from '../components/ui'
import { enfeitar } from '../components/Enfeite'

// Cores dos compromissos (tons definidos no theme.css)
export const CORES_AGENDA = CORES.map((cor) => ({ cor }))

// Reúne tudo o que tem data: compromissos, prazos do to-do e avaliações da faculdade
export function useItensComData() {
  const eventos = useTabela('eventos', { ordem: 'data' })
  const tarefas = useTabela('tarefas')
  const avaliacoes = useTabela('avaliacoes')
  const materias = useTabela('materias')

  function itensDoDia(dia) {
    const lista = []
    for (const e of eventos.linhas.filter((e) => e.data === dia).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || '')))
      lista.push({ tipo: 'evento', id: e.id, titulo: e.titulo, hora: hora(e.hora_inicio), cor: e.cor, original: e })
    for (const a of avaliacoes.linhas.filter((a) => a.data === dia)) {
      const m = materias.linhas.find((m) => m.id === a.materia_id)
      lista.push({ tipo: 'avaliacao', id: a.id, titulo: `${a.tipo}: ${a.nome}${m ? ` (${m.nome})` : ''}`, cor: m?.cor || 'lavanda', original: a })
    }
    for (const t of tarefas.linhas.filter((t) => t.prazo === dia && !t.concluida))
      lista.push({ tipo: 'tarefa', id: t.id, titulo: t.titulo, cor: 'bege', original: t })
    return lista
  }

  return {
    eventos,
    tarefas,
    avaliacoes,
    materias,
    itensDoDia,
    carregando: eventos.carregando,
    erro: eventos.erro || tarefas.erro || avaliacoes.erro || materias.erro,
  }
}

// Legenda das cores ({ azul: 'faculdade', … }), salva na tabela agenda_cores
function useLegenda() {
  const tabela = useTabela('agenda_cores')
  const nomes = Object.fromEntries(tabela.linhas.map((l) => [l.cor, l.nome]))

  async function salvar(novos) {
    for (const { cor } of CORES_AGENDA) {
      const nome = (novos[cor] || '').trim()
      const linha = tabela.linhas.find((l) => l.cor === cor)
      if (linha && !nome) await tabela.apagar(linha.id)
      else if (linha && nome !== linha.nome) await tabela.atualizar(linha.id, { nome })
      else if (!linha && nome) await tabela.adicionar({ cor, nome })
    }
  }

  return { nomes, salvar, erro: tabela.erro }
}

export default function Agenda() {
  const { eventos, itensDoDia, erro } = useItensComData()
  const legenda = useLegenda()
  const hoje = hojeISO()
  const [visao, setVisao] = useState('mes') // 'mes' | 'semana'
  const [foco, setFoco] = useState(hoje) // dia que define o mês/semana mostrado
  const [selecionado, setSelecionado] = useState(hoje)
  const [editando, setEditando] = useState(null) // null | {novo:true, data} | evento
  const [editandoLegenda, setEditandoLegenda] = useState(false)
  const painelDia = useRef(null)

  const d = deISO(foco)
  const inicioMes = paraISO(new Date(d.getFullYear(), d.getMonth(), 1))
  const primeiroDia = visao === 'mes' ? inicioSemanaISO(inicioMes) : inicioSemanaISO(foco)
  const totalDias = visao === 'mes' ? 42 : 7
  const dias = Array.from({ length: totalDias }, (_, i) => somarDiasISO(primeiroDia, i))

  function andar(direcao) {
    if (visao === 'mes') setFoco(paraISO(new Date(d.getFullYear(), d.getMonth() + direcao, 1)))
    else setFoco(somarDiasISO(foco, 7 * direcao))
  }

  function escolherDia(dia) {
    setSelecionado(dia)
    // Em telas estreitas o painel do dia fica abaixo do calendário: rola até ele
    if (window.innerWidth <= 760) setTimeout(() => painelDia.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const tituloPeriodo =
    visao === 'mes'
      ? `${MESES[d.getMonth()]} ${d.getFullYear()}`
      : `${deISO(dias[0]).getDate()} ${MESES[deISO(dias[0]).getMonth()].slice(0, 3)} – ${deISO(dias[6]).getDate()} ${MESES[deISO(dias[6]).getMonth()].slice(0, 3)}`

  async function salvar(dados) {
    if (editando.novo) {
      if (await eventos.adicionar(dados)) setEditando(null)
    } else {
      await eventos.atualizar(editando.id, dados)
      setEditando(null)
    }
  }

  const itensSelecionado = itensDoDia(selecionado)

  return (
    <div className="pagina pagina-larga">
      <Cabecalho icone="agenda" emoji="📅" etiqueta="agenda" titulo="Agenda" frase="um dia de cada vez">
        <button className="btn" onClick={() => setEditando({ novo: true, data: selecionado })}>
          + compromisso
        </button>
      </Cabecalho>
      <Erro>{erro || legenda.erro}</Erro>

      <div className="agenda-barra">
        <div className="agenda-nav">
          <button className="btn-icone" onClick={() => andar(-1)} aria-label="anterior">
            ‹
          </button>
          <h2 className="agenda-periodo">{tituloPeriodo}</h2>
          <button className="btn-icone" onClick={() => andar(1)} aria-label="próximo">
            ›
          </button>
          <button
            className="link-acao"
            onClick={() => {
              setFoco(hoje)
              setSelecionado(hoje)
            }}
          >
            hoje
          </button>
        </div>
        <div className="chips">
          <button className={`chip ${visao === 'mes' ? 'ativa' : ''}`} onClick={() => setVisao('mes')}>
            mês
          </button>
          <button className={`chip ${visao === 'semana' ? 'ativa' : ''}`} onClick={() => setVisao('semana')}>
            semana
          </button>
        </div>
      </div>

      <div className="agenda-layout">
        <div>
          <div className={`card calendario ${visao}`}>
            {DIAS_CURTOS.map((n) => (
              <div key={n} className="calendario-cabeca">
                {n}
              </div>
            ))}
            {dias.map((dia) => {
              const itens = itensDoDia(dia)
              const foraDoMes = visao === 'mes' && deISO(dia).getMonth() !== d.getMonth()
              return (
                <button
                  key={dia}
                  className={`calendario-dia ${foraDoMes ? 'fora' : ''} ${dia === hoje ? 'hoje' : ''} ${dia === selecionado ? 'selecionado' : ''}`}
                  onClick={() => escolherDia(dia)}
                  onDoubleClick={() => setEditando({ novo: true, data: dia })}
                  aria-label={`${formatarLongo(dia)}: ${itens.length} item(ns)`}
                >
                  <span className="calendario-numero">{deISO(dia).getDate()}</span>
                  {/* apenas pontos coloridos; os detalhes aparecem no painel ao clicar no dia */}
                  <span className="calendario-pontos">
                    {itens.map((it) => (
                      <span key={it.tipo + it.id} className={`ponto ponto-${it.tipo} bg-${it.cor}`} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          <Legenda nomes={legenda.nomes} onEditar={() => setEditandoLegenda(true)} />
        </div>

        <aside ref={painelDia} className="card pautado agenda-dia fita fita-lavanda">
          <span className="etiqueta">{selecionado === hoje ? 'hoje' : 'dia'}</span>
          <h3 className="agenda-dia-titulo">{formatarLongo(selecionado)}</h3>
          {itensSelecionado.length === 0 ? (
            <p className="mao suave">{enfeitar('nada marcado ✿')}</p>
          ) : (
            <ul className="agenda-lista">
              {itensSelecionado.map((it) => (
                <li key={it.tipo + it.id} className={`agenda-item tipo-${it.tipo}`}>
                  <span className={`ponto ponto-${it.tipo} bg-${it.cor}`} />
                  <span className="agenda-item-texto">
                    {it.hora && <b className="mao">{it.hora} </b>}
                    {it.tipo === 'evento' ? (
                      <button className="link-simples" onClick={() => setEditando(it.original)}>
                        {it.titulo}
                      </button>
                    ) : it.tipo === 'tarefa' ? (
                      <Link to="/tarefas">{it.titulo}</Link>
                    ) : (
                      <Link to="/faculdade">{it.titulo}</Link>
                    )}
                    {it.tipo === 'evento' && it.original.local && <span className="suave pequeno"> · {it.original.local}</span>}
                    {it.tipo === 'evento' && it.original.notas && <span className="agenda-notas pequeno suave">{it.original.notas}</span>}
                    <span className="etiqueta tipo-etiqueta">
                      {it.tipo === 'evento' ? legenda.nomes[it.cor] || 'compromisso' : it.tipo === 'tarefa' ? 'to-do' : 'faculdade'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button className="link-acao" onClick={() => setEditando({ novo: true, data: selecionado })}>
            + compromisso neste dia
          </button>
        </aside>
      </div>

      {editando && (
        <Modal titulo={editando.novo ? 'novo compromisso' : 'editar compromisso'} onFechar={() => setEditando(null)}>
          <FormEvento
            inicial={editando}
            nomes={legenda.nomes}
            onSalvar={salvar}
            onApagar={
              !editando.novo
                ? () => {
                    if (confirm('Apagar este compromisso?')) {
                      eventos.apagar(editando.id)
                      setEditando(null)
                    }
                  }
                : null
            }
          />
        </Modal>
      )}

      {editandoLegenda && (
        <Modal titulo="legenda das cores" onFechar={() => setEditandoLegenda(false)}>
          <FormLegenda
            nomes={legenda.nomes}
            onSalvar={async (novos) => {
              await legenda.salvar(novos)
              setEditandoLegenda(false)
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function Legenda({ nomes, onEditar }) {
  return (
    <div className="legenda">
      {CORES_AGENDA.map(({ cor }) => (
        <span key={cor} className="legenda-item">
          <span className={`ponto bg-${cor}`} />
          {nomes[cor] || <span className="suave">{cor}</span>}
        </span>
      ))}
      <span className="legenda-item">
        <span className="ponto ponto-avaliacao bg-lavanda" /> provas
      </span>
      <span className="legenda-item">
        <span className="ponto ponto-tarefa" /> to-do
      </span>
      <button className="link-acao" onClick={onEditar}>
        dar nomes às cores
      </button>
    </div>
  )
}

function FormLegenda({ nomes, onSalvar }) {
  const [v, setV] = useState(() => Object.fromEntries(CORES_AGENDA.map(({ cor }) => [cor, nomes[cor] || ''])))
  const [salvando, setSalvando] = useState(false)
  return (
    <form
      className="form-legenda"
      onSubmit={async (e) => {
        e.preventDefault()
        setSalvando(true)
        await onSalvar(v)
      }}
    >
      <p className="mao suave">o que cada cor quer dizer? (deixe em branco para não usar nome)</p>
      {CORES_AGENDA.map(({ cor }) => (
        <label key={cor} className="legenda-linha">
          <span className={`ponto ponto-grande bg-${cor}`} />
          <span className="legenda-cor">{cor}</span>
          <input value={v[cor]} onChange={(e) => setV({ ...v, [cor]: e.target.value })} placeholder="ex.: faculdade, saúde, amigos…" />
        </label>
      ))}
      <div className="modal-acoes">
        <button className="btn" disabled={salvando}>
          {salvando ? 'salvando…' : 'salvar'}
        </button>
      </div>
    </form>
  )
}

function FormEvento({ inicial, nomes, onSalvar, onApagar }) {
  const [v, setV] = useState({
    titulo: inicial.titulo || '',
    data: inicial.data || hojeISO(),
    hora_inicio: hora(inicial.hora_inicio),
    hora_fim: hora(inicial.hora_fim),
    local: inicial.local || '',
    notas: inicial.notas || '',
    cor: CORES_AGENDA.some((c) => c.cor === inicial.cor) ? inicial.cor : 'rosa',
  })
  const mudar = (campo) => (e) => setV({ ...v, [campo]: e.target.value })

  function enviar(e) {
    e.preventDefault()
    onSalvar({
      ...v,
      titulo: v.titulo.trim(),
      hora_inicio: v.hora_inicio || null,
      hora_fim: v.hora_fim || null,
      local: v.local.trim() || null,
      notas: v.notas.trim() || null,
    })
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo campo-largo">
        <span className="etiqueta">o quê</span>
        <input autoFocus value={v.titulo} onChange={mudar('titulo')} required />
      </label>
      <label className="campo">
        <span className="etiqueta">dia</span>
        <input type="date" value={v.data} onChange={mudar('data')} required />
      </label>
      <label className="campo">
        <span className="etiqueta">local</span>
        <input value={v.local} onChange={mudar('local')} />
      </label>
      <label className="campo">
        <span className="etiqueta">começa</span>
        <input type="time" value={v.hora_inicio} onChange={mudar('hora_inicio')} />
      </label>
      <label className="campo">
        <span className="etiqueta">termina</span>
        <input type="time" value={v.hora_fim} onChange={mudar('hora_fim')} />
      </label>
      <label className="campo campo-largo">
        <span className="etiqueta">notas</span>
        <textarea rows={3} value={v.notas} onChange={mudar('notas')} />
      </label>
      <div className="campo campo-largo">
        <span className="etiqueta">cor</span>
        <div className="escolher-cor-agenda">
          {CORES_AGENDA.map(({ cor }) => (
            <button
              key={cor}
              type="button"
              className={`cor-agenda ${v.cor === cor ? 'escolhida' : ''}`}
              onClick={() => setV({ ...v, cor })}
            >
              <span className={`ponto ponto-grande bg-${cor}`} />
              {nomes[cor] || cor}
            </button>
          ))}
        </div>
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
