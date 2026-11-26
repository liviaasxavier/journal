import { useState } from 'react'
import { useTabela } from '../hooks/useTabela'
import { hojeISO, formatarPrazo, DIAS_LONGOS, DIAS_CURTOS } from '../lib/datas'
import { Cabecalho, Modal, Erro, Vazio, EscolherCor, Progresso, Chips } from '../components/ui'
import { enfeitar } from '../components/Enfeite'

const TIPOS = ['prova', 'trabalho', 'entrega', 'outro']

// Média ponderada (0 a 10) das avaliações que já têm nota
export function media(avaliacoes) {
  const comNota = avaliacoes.filter((a) => a.nota !== null && a.nota !== undefined)
  const pesos = comNota.reduce((s, a) => s + Number(a.peso), 0)
  if (!pesos) return null
  return comNota.reduce((s, a) => s + (Number(a.nota) / Number(a.nota_max)) * 10 * Number(a.peso), 0) / pesos
}

export default function Faculdade() {
  const materias = useTabela('materias', { ordem: 'nome' })
  const avaliacoes = useTabela('avaliacoes', { ordem: 'data' })
  const [aba, setAba] = useState('materias')
  const [editandoMateria, setEditandoMateria] = useState(null)
  const [editandoAvaliacao, setEditandoAvaliacao] = useState(null)
  const [verArquivadas, setVerArquivadas] = useState(false)

  const ativas = materias.linhas.filter((m) => !m.arquivada)
  const lista = verArquivadas ? materias.linhas : ativas

  async function salvarMateria(dados) {
    if (editandoMateria === 'nova') {
      if (await materias.adicionar(dados)) setEditandoMateria(null)
    } else {
      await materias.atualizar(editandoMateria.id, dados)
      setEditandoMateria(null)
    }
  }

  async function salvarAvaliacao(dados) {
    if (editandoAvaliacao.nova) {
      if (await avaliacoes.adicionar(dados)) setEditandoAvaliacao(null)
    } else {
      await avaliacoes.atualizar(editandoAvaliacao.id, dados)
      setEditandoAvaliacao(null)
    }
  }

  return (
    <div className="pagina pagina-larga">
      <Cabecalho icone="faculdade" emoji="🎓" etiqueta="painel da faculdade" titulo="Faculdade" frase="bora passar em tudo ♡">
        <button className="btn" onClick={() => (aba === 'avaliacoes' ? setEditandoAvaliacao({ nova: true }) : setEditandoMateria('nova'))}>
          {aba === 'avaliacoes' ? '+ avaliação' : '+ matéria'}
        </button>
      </Cabecalho>
      <Erro>{materias.erro || avaliacoes.erro}</Erro>

      <Chips
        valor={aba}
        onChange={setAba}
        opcoes={[
          { valor: 'materias', label: 'matérias' },
          { valor: 'horario', label: 'horário' },
          { valor: 'avaliacoes', label: 'provas & entregas' },
        ]}
      />

      {aba === 'materias' &&
        (ativas.length === 0 && !verArquivadas ? (
          <Vazio>cadastre as matérias do período para começar ✿</Vazio>
        ) : (
          <>
            <div className="grade-materias">
              {lista.map((m) => (
                <CartaoMateria
                  key={m.id}
                  materia={m}
                  avaliacoes={avaliacoes.linhas.filter((a) => a.materia_id === m.id)}
                  onFalta={(n) => materias.atualizar(m.id, { faltas: Math.max(0, (m.faltas || 0) + n) })}
                  onEditar={() => setEditandoMateria(m)}
                />
              ))}
            </div>
            {materias.linhas.some((m) => m.arquivada) && (
              <button className="link-acao" onClick={() => setVerArquivadas(!verArquivadas)}>
                {verArquivadas ? 'esconder' : 'mostrar'} matérias de períodos passados
              </button>
            )}
          </>
        ))}

      {aba === 'horario' && <GradeHorario materias={ativas} />}

      {aba === 'avaliacoes' && (
        <ListaAvaliacoes
          avaliacoes={avaliacoes.linhas}
          materias={materias.linhas}
          onEditar={setEditandoAvaliacao}
          onNota={(a, nota) => avaliacoes.atualizar(a.id, { nota })}
        />
      )}

      {editandoMateria && (
        <Modal titulo={editandoMateria === 'nova' ? 'nova matéria' : 'editar matéria'} onFechar={() => setEditandoMateria(null)} largo>
          <FormMateria
            inicial={editandoMateria === 'nova' ? {} : editandoMateria}
            onSalvar={salvarMateria}
            onApagar={
              editandoMateria !== 'nova'
                ? () => {
                    if (confirm(`Apagar "${editandoMateria.nome}" e as provas dela? (Para guardar o histórico, use "arquivar".)`)) {
                      materias.apagar(editandoMateria.id)
                      setEditandoMateria(null)
                    }
                  }
                : null
            }
          />
        </Modal>
      )}

      {editandoAvaliacao && (
        <Modal titulo={editandoAvaliacao.nova ? 'nova avaliação' : 'editar avaliação'} onFechar={() => setEditandoAvaliacao(null)}>
          <FormAvaliacao
            inicial={editandoAvaliacao}
            materias={ativas.length ? ativas : materias.linhas}
            onSalvar={salvarAvaliacao}
            onApagar={
              !editandoAvaliacao.nova
                ? () => {
                    avaliacoes.apagar(editandoAvaliacao.id)
                    setEditandoAvaliacao(null)
                  }
                : null
            }
          />
        </Modal>
      )}
    </div>
  )
}

function CartaoMateria({ materia: m, avaliacoes, onFalta, onEditar }) {
  const med = media(avaliacoes)
  const hoje = hojeISO()
  const proxima = avaliacoes.filter((a) => a.data && a.data >= hoje).sort((a, b) => a.data.localeCompare(b.data))[0]
  const usoFaltas = m.max_faltas ? m.faltas / m.max_faltas : 0
  const alerta = m.max_faltas > 0 && usoFaltas >= 0.75

  return (
    <article className={`card cartao-materia bg-${m.cor} ${m.arquivada ? 'esmaecido' : ''}`}>
      <div className="cartao-linha entre">
        <h3>{m.nome}</h3>
        <button className="link-acao" onClick={onEditar}>
          editar
        </button>
      </div>
      {m.professor && <p className="suave pequeno">{m.professor}</p>}

      <div className="materia-numeros">
        <div>
          <span className="etiqueta">média</span>
          <span className={`numero-grande ${med !== null && med < 6 ? 'ruim' : ''}`}>{med === null ? '–' : med.toFixed(1)}</span>
        </div>
        <div>
          <span className="etiqueta">faltas</span>
          <div className="contador">
            <button onClick={() => onFalta(-1)} aria-label="tirar falta">
              −
            </button>
            <span className={`numero-grande ${alerta ? 'ruim' : ''}`}>
              {m.faltas}
              {m.max_faltas ? <small>/{m.max_faltas}</small> : null}
            </span>
            <button onClick={() => onFalta(1)} aria-label="adicionar falta">
              +
            </button>
          </div>
        </div>
      </div>
      {m.max_faltas > 0 && <Progresso valor={usoFaltas * 100} cor={alerta ? 'vinho' : 'malva'} />}
      {alerta && <p className="alerta mao">{m.faltas >= m.max_faltas ? 'limite de faltas atingido!' : 'cuidado com as faltas!'}</p>}
      {proxima && (
        <p className="pequeno">
          próxima: <b>{proxima.nome}</b> <span className="mao">{formatarPrazo(proxima.data)}</span>
        </p>
      )}
    </article>
  )
}

// Grade semanal (seg a sáb) com os horários de cada matéria
function GradeHorario({ materias }) {
  const aulas = materias.flatMap((m) => (m.horarios || []).map((h) => ({ ...h, materia: m })))
  if (!aulas.length) return <Vazio>adicione os horários nas matérias (botão "editar") ✿</Vazio>
  const dias = [1, 2, 3, 4, 5, 6].filter((d) => d < 6 || aulas.some((a) => Number(a.dia) === 6))
  return (
    <div className="grade-horario" style={{ gridTemplateColumns: `repeat(${dias.length}, 1fr)` }}>
      {dias.map((d) => (
        <div key={d} className="horario-dia">
          <span className="etiqueta">{DIAS_LONGOS[d]}</span>
          {aulas
            .filter((a) => Number(a.dia) === d)
            .sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''))
            .map((a, i) => (
              <div key={i} className={`card aula bg-${a.materia.cor}`}>
                <span className="mao">
                  {a.inicio}–{a.fim}
                </span>
                <b>{a.materia.nome}</b>
                {a.sala && <span className="pequeno suave">{a.sala}</span>}
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}

function ListaAvaliacoes({ avaliacoes, materias, onEditar, onNota }) {
  const hoje = hojeISO()
  const porId = Object.fromEntries(materias.map((m) => [m.id, m]))
  const proximas = avaliacoes.filter((a) => !a.data || a.data >= hoje).sort((a, b) => (a.data || '9').localeCompare(b.data || '9'))
  const passadas = avaliacoes.filter((a) => a.data && a.data < hoje).sort((a, b) => b.data.localeCompare(a.data))
  if (!avaliacoes.length) return <Vazio>nenhuma prova ou entrega cadastrada ✿</Vazio>

  const Linha = ({ a }) => {
    const m = porId[a.materia_id]
    return (
      <li className="avaliacao">
        <span className={`bolinha bg-${m?.cor || 'bege'}`} />
        <button className="link-simples avaliacao-nome" onClick={() => onEditar(a)}>
          <b>{a.nome}</b> <span className="suave pequeno">{m?.nome}</span>
        </button>
        <span className="etiqueta">{a.tipo}</span>
        <span className={`mao ${a.data && a.data < hoje && a.nota == null ? 'atrasada' : ''}`}>{a.data ? formatarPrazo(a.data) : 'sem data'}</span>
        <span className="nota-campo">
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="nota"
            defaultValue={a.nota ?? ''}
            onBlur={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value)
              if (v !== a.nota) onNota(a, v)
            }}
          />
          <span className="suave pequeno">/{a.nota_max}</span>
        </span>
      </li>
    )
  }

  return (
    <div className="card pautado lista-avaliacoes">
      {proximas.length > 0 && (
        <>
          <span className="etiqueta">vem aí</span>
          <ul>{proximas.map((a) => <Linha key={a.id} a={a} />)}</ul>
        </>
      )}
      {passadas.length > 0 && (
        <>
          <span className="etiqueta">já foram</span>
          <ul>{passadas.map((a) => <Linha key={a.id} a={a} />)}</ul>
        </>
      )}
    </div>
  )
}

function FormMateria({ inicial, onSalvar, onApagar }) {
  const [v, setV] = useState({
    nome: inicial.nome || '',
    professor: inicial.professor || '',
    periodo: inicial.periodo || '',
    cor: inicial.cor || 'rosa',
    max_faltas: inicial.max_faltas ?? 0,
    horarios: inicial.horarios || [],
    arquivada: inicial.arquivada || false,
  })
  const mudar = (campo) => (e) => setV({ ...v, [campo]: e.target.value })
  const mudarHorario = (i, campo, valor) =>
    setV({ ...v, horarios: v.horarios.map((h, j) => (j === i ? { ...h, [campo]: valor } : h)) })

  function enviar(e) {
    e.preventDefault()
    onSalvar({
      ...v,
      nome: v.nome.trim(),
      professor: v.professor.trim() || null,
      periodo: v.periodo.trim() || null,
      max_faltas: Number(v.max_faltas) || 0,
      horarios: v.horarios.filter((h) => h.inicio),
    })
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo campo-largo">
        <span className="etiqueta">matéria</span>
        <input autoFocus value={v.nome} onChange={mudar('nome')} required />
      </label>
      <label className="campo">
        <span className="etiqueta">professor(a)</span>
        <input value={v.professor} onChange={mudar('professor')} />
      </label>
      <label className="campo">
        <span className="etiqueta">período</span>
        <input value={v.periodo} onChange={mudar('periodo')} placeholder="2026.2" />
      </label>
      <label className="campo">
        <span className="etiqueta">máx. de faltas</span>
        <input type="number" min="0" value={v.max_faltas} onChange={mudar('max_faltas')} />
      </label>
      <label className="campo">
        <span className="etiqueta">arquivada</span>
        <input type="checkbox" className="caixa" checked={v.arquivada} onChange={(e) => setV({ ...v, arquivada: e.target.checked })} />
      </label>
      <div className="campo campo-largo">
        <span className="etiqueta">cor</span>
        <EscolherCor valor={v.cor} onChange={(cor) => setV({ ...v, cor })} />
      </div>
      <div className="campo campo-largo">
        <span className="etiqueta">horários</span>
        {v.horarios.map((h, i) => (
          <div key={i} className="linha-horario">
            <select value={h.dia} onChange={(e) => mudarHorario(i, 'dia', Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {DIAS_CURTOS[d]}
                </option>
              ))}
            </select>
            <input type="time" value={h.inicio || ''} onChange={(e) => mudarHorario(i, 'inicio', e.target.value)} />
            <span>às</span>
            <input type="time" value={h.fim || ''} onChange={(e) => mudarHorario(i, 'fim', e.target.value)} />
            <input placeholder="sala" value={h.sala || ''} onChange={(e) => mudarHorario(i, 'sala', e.target.value)} />
            <button type="button" className="link-acao" onClick={() => setV({ ...v, horarios: v.horarios.filter((_, j) => j !== i) })}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="link-acao" onClick={() => setV({ ...v, horarios: [...v.horarios, { dia: 1, inicio: '', fim: '', sala: '' }] })}>
          + horário
        </button>
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

function FormAvaliacao({ inicial, materias, onSalvar, onApagar }) {
  const [v, setV] = useState({
    materia_id: inicial.materia_id || materias[0]?.id || '',
    nome: inicial.nome || '',
    tipo: inicial.tipo || 'prova',
    data: inicial.data || '',
    peso: inicial.peso ?? 1,
    nota: inicial.nota ?? '',
    nota_max: inicial.nota_max ?? 10,
  })
  const mudar = (campo) => (e) => setV({ ...v, [campo]: e.target.value })
  if (!materias.length) return <p className="mao">{enfeitar('cadastre uma matéria primeiro ✿')}</p>

  function enviar(e) {
    e.preventDefault()
    onSalvar({
      ...v,
      nome: v.nome.trim(),
      data: v.data || null,
      peso: Number(v.peso) || 1,
      nota: v.nota === '' ? null : Number(v.nota),
      nota_max: Number(v.nota_max) || 10,
    })
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo campo-largo">
        <span className="etiqueta">matéria</span>
        <select value={v.materia_id} onChange={mudar('materia_id')} required>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span className="etiqueta">nome</span>
        <input autoFocus value={v.nome} onChange={mudar('nome')} placeholder="P1, trabalho final…" required />
      </label>
      <label className="campo">
        <span className="etiqueta">tipo</span>
        <select value={v.tipo} onChange={mudar('tipo')}>
          {TIPOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span className="etiqueta">data</span>
        <input type="date" value={v.data} onChange={mudar('data')} />
      </label>
      <label className="campo">
        <span className="etiqueta">peso</span>
        <input type="number" step="any" min="0" value={v.peso} onChange={mudar('peso')} />
      </label>
      <label className="campo">
        <span className="etiqueta">nota</span>
        <input type="number" step="any" min="0" value={v.nota} onChange={mudar('nota')} />
      </label>
      <label className="campo">
        <span className="etiqueta">vale</span>
        <input type="number" step="any" min="0" value={v.nota_max} onChange={mudar('nota_max')} />
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
