import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MEU_NOME, TODOS_MODULOS } from '../config'
import { useItensComData } from './Agenda'
import { useHabitos, pendenteHoje, sequencia } from '../lib/habitos'
import { useTabela } from '../hooks/useTabela'
import { hojeISO, formatarLongo, formatarPrazo } from '../lib/datas'
import { HUMORES } from './Diario'
import Icone from '../components/Icone'
import { enfeitar } from '../components/Enfeite'

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return { texto: 'Bom dia', icone: 'manha', emoji: '☀️' }
  if (h < 18) return { texto: 'Boa tarde', icone: 'tarde', emoji: '🌤️' }
  return { texto: 'Boa noite', icone: 'noite', emoji: '🌙' }
}

export default function Inicio() {
  const s = saudacao()
  const hoje = hojeISO()
  const { tarefas, avaliacoes, materias, itensDoDia } = useItensComData()
  const { habitos, diasPorHabito, alternarDia } = useHabitos()
  const diario = useTabela('diario', { ordem: 'dia', filtro: (q) => q.eq('dia', hoje) })
  const topicos = useTabela('topicos')
  const [riscadas, setRiscadas] = useState(() => new Set()) // concluídas nesta visita: continuam visíveis, riscadas

  const compromissos = itensDoDia(hoje).filter((i) => i.tipo !== 'tarefa')
  const tarefasHoje = tarefas.linhas
    .filter((t) => t.prazo && t.prazo <= hoje && (!t.concluida || riscadas.has(t.id)))
    .sort((a, b) => a.prazo.localeCompare(b.prazo))
  const habitosHoje = habitos.linhas.filter((h) => pendenteHoje(h, diasPorHabito[h.id]))
  const entradaHoje = diario.linhas[0]
  const daqui7 = hojeISO(7)
  const proximasProvas = avaliacoes.linhas
    .filter((a) => a.data && a.data > hoje && a.data <= daqui7)
    .sort((a, b) => a.data.localeCompare(b.data))
  const revisar = topicos.linhas.filter((t) => t.proxima_revisao && t.proxima_revisao <= hoje && t.status !== 'dominado')

  function concluir(t) {
    setRiscadas((r) => new Set(r).add(t.id))
    tarefas.atualizar(t.id, { concluida: !t.concluida, concluida_em: t.concluida ? null : new Date().toISOString() })
  }

  return (
    <div className="pagina pagina-larga">
      <header className="cabecalho">
        <span className="etiqueta">{formatarLongo(hoje)}</span>
        <h1>
          {s.texto}, {MEU_NOME}! <Icone nome={s.icone} emoji={s.emoji} className="icone-titulo" />
        </h1>
        <p className="mao">{enfeitar('o que vamos fazer hoje? ♡')}</p>
      </header>

      <div className="painel">
        <section className="card pautado fita painel-bloco">
          <div className="painel-titulo">
            <span className="etiqueta">hoje na agenda</span>
            <Link className="link-acao" to="/agenda">
              ver agenda →
            </Link>
          </div>
          {compromissos.length === 0 ? (
            <p className="mao suave">{enfeitar('dia livre ✿')}</p>
          ) : (
            <ul className="agenda-lista">
              {compromissos.map((it) => (
                <li key={it.tipo + it.id} className="agenda-item">
                  <span className={`bolinha bg-${it.cor}`} />
                  <span>
                    {it.hora && <b className="mao">{it.hora} </b>}
                    {it.titulo}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {proximasProvas.length > 0 && (
            <>
              <span className="etiqueta">próximos 7 dias</span>
              <ul className="agenda-lista">
                {proximasProvas.map((a) => {
                  const m = materias.linhas.find((m) => m.id === a.materia_id)
                  return (
                    <li key={a.id} className="agenda-item">
                      <span className={`bolinha bg-${m?.cor || 'lavanda'}`} />
                      <span>
                        {a.tipo}: {a.nome} {m && <span className="suave pequeno">({m.nome})</span>}
                      </span>
                      <span className="mao">{formatarPrazo(a.data)}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        <section className="card fita fita-lavanda painel-bloco">
          <div className="painel-titulo">
            <span className="etiqueta">tarefas de hoje</span>
            <Link className="link-acao" to="/tarefas">
              to-do →
            </Link>
          </div>
          {tarefasHoje.length === 0 ? (
            <p className="mao suave">{enfeitar('nada pendente pra hoje ✿')}</p>
          ) : (
            <ul className="etapas">
              {tarefasHoje.map((t) => (
                <li key={t.id} className={t.concluida ? 'feita' : ''}>
                  <button className="checkbox" onClick={() => concluir(t)}>
                    {t.concluida && '✓'}
                  </button>
                  <span>{t.titulo}</span>
                  {t.prazo < hoje && !t.concluida && <span className="mao pequeno atrasada">{formatarPrazo(t.prazo)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card fita fita-bege painel-bloco">
          <div className="painel-titulo">
            <span className="etiqueta">hábitos de hoje</span>
            <Link className="link-acao" to="/habitos">
              hábitos →
            </Link>
          </div>
          {habitosHoje.length === 0 ? (
            <p className="mao suave">{enfeitar(habitos.linhas.length ? 'tudo em dia ✿' : 'nenhum hábito ainda ✿')}</p>
          ) : (
            <ul className="etapas">
              {habitosHoje.map((h) => {
                const feito = diasPorHabito[h.id]?.has(hoje)
                const seq = sequencia(h, diasPorHabito[h.id])
                return (
                  <li key={h.id} className={feito ? 'feita' : ''}>
                    <button className="checkbox" onClick={() => alternarDia(h.id, hoje)}>
                      {feito && '✓'}
                    </button>
                    <span>{h.nome}</span>
                    {seq.valor > 0 && (
                      <span className="mao pequeno">
                        {seq.valor} {seq.unidade}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card quadriculado fita fita-malva painel-bloco">
          <div className="painel-titulo">
            <span className="etiqueta">diário</span>
          </div>
          {entradaHoje ? (
            <>
              <p className="mao">
                {enfeitar('já escreveu hoje ♡')}{' '}
                {entradaHoje.humor && (
                  <span className={`tag-lista bg-${HUMORES.find((h) => h.valor === entradaHoje.humor)?.cor}`}>
                    {HUMORES.find((h) => h.valor === entradaHoje.humor)?.label}
                  </span>
                )}
              </p>
              <Link className="link-acao" to="/diario">
                continuar escrevendo →
              </Link>
            </>
          ) : (
            <>
              <p className="mao suave">como está sendo o dia?</p>
              <Link className="btn" to="/diario">
                escrever no diário
              </Link>
            </>
          )}
          {revisar.length > 0 && (
            <>
              <span className="etiqueta">revisar hoje</span>
              <p>
                <Link to="/topicos">
                  {revisar.length} tópico{revisar.length > 1 ? 's' : ''} para revisar →
                </Link>
              </p>
            </>
          )}
        </section>
      </div>

      <div className="grade-atalhos">
        {TODOS_MODULOS.filter((m) => m.path !== '/').map((m) => (
          // .fita fica no Link (externo) e .rasgado no div (interno),
          // porque o clip-path de .rasgado cortaria o ::before da fita
          <Link key={m.path} to={m.path} className="atalho fita">
            <div className={`recorte rasgado bg-${m.cor}`}>
              <Icone nome={m.icone} emoji={m.emoji} className="atalho-emoji" />
              {m.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
