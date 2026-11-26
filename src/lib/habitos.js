// Cálculos de hábitos (usados nas páginas Hábitos, Início e Metas)
import { hojeISO, somarDiasISO, inicioSemanaISO, paraISO } from './datas'
import { useTabela } from '../hooks/useTabela'

// Carrega hábitos e registros do último ano e oferece a função de marcar/desmarcar um dia
export function useHabitos() {
  const habitos = useTabela('habitos')
  const desde = hojeISO(-370)
  const registros = useTabela('habito_registros', { ordem: 'dia', filtro: (q) => q.gte('dia', desde) })

  // Índice para consulta rápida: { idDoHabito: Set('2026-11-20', '2026-11-21', …) }
  const diasPorHabito = {}
  for (const r of registros.linhas) {
    if (!diasPorHabito[r.habito_id]) diasPorHabito[r.habito_id] = new Set()
    diasPorHabito[r.habito_id].add(r.dia)
  }

  function alternarDia(habitoId, dia) {
    const existente = registros.linhas.find((r) => r.habito_id === habitoId && r.dia === dia)
    if (existente) registros.apagar(existente.id)
    else registros.adicionar({ habito_id: habitoId, dia })
  }

  return {
    habitos,
    registros,
    diasPorHabito,
    alternarDia,
    carregando: habitos.carregando || registros.carregando,
    erro: habitos.erro || registros.erro,
  }
}

function contarNaSemana(dias, inicio) {
  let n = 0
  for (let i = 0; i < 7; i++) if (dias.has(somarDiasISO(inicio, i))) n++
  return n
}

// Sequência (streak): quantos dias, ou semanas, consecutivos o hábito foi cumprido
export function sequencia(habito, dias = new Set()) {
  const hoje = hojeISO()
  if (habito.frequencia === 'semanal') {
    let semana = inicioSemanaISO(hoje)
    // A semana atual só entra na contagem se a meta já foi atingida; senão, começa pela anterior
    if (contarNaSemana(dias, semana) < habito.vezes_semana) semana = somarDiasISO(semana, -7)
    let n = 0
    while (contarNaSemana(dias, semana) >= habito.vezes_semana) {
      n++
      semana = somarDiasISO(semana, -7)
    }
    return { valor: n, unidade: n === 1 ? 'semana' : 'semanas' }
  }
  let dia = dias.has(hoje) ? hoje : somarDiasISO(hoje, -1) // se hoje ainda não foi marcado, a sequência não é quebrada: conta a partir de ontem
  let n = 0
  while (dias.has(dia)) {
    n++
    dia = somarDiasISO(dia, -1)
  }
  return { valor: n, unidade: n === 1 ? 'dia' : 'dias' }
}

// Progresso da semana atual (usado no texto "2/3 esta semana")
export function progressoSemana(habito, dias = new Set()) {
  const feitos = contarNaSemana(dias, inicioSemanaISO(hojeISO()))
  return { feitos, meta: habito.frequencia === 'semanal' ? habito.vezes_semana : 7 }
}

// Define se o hábito aparece na lista de hoje: diário sempre; semanal enquanto a meta
// da semana não foi atingida (ou se já foi marcado hoje)
export function pendenteHoje(habito, dias = new Set()) {
  if (habito.arquivado) return false
  if (habito.frequencia === 'diaria') return true
  const { feitos, meta } = progressoSemana(habito, dias)
  return feitos < meta || dias.has(hojeISO())
}

// ---------- cálculos dos gráficos ----------

// Dia de início do hábito: a data de criação convertida para o fuso local (o banco
// guarda em UTC, então algo criado às 22h em Brasília já está no dia seguinte em UTC)
// ou o primeiro dia marcado, o que for anterior (é possível marcar dias retroativos).
function inicioDoHabito(habito, dias) {
  const criado = habito.criada_em ? paraISO(new Date(habito.criada_em)) : '0000-00-00'
  let primeiro = criado
  for (const d of dias) if (d < primeiro) primeiro = d
  return primeiro
}

// Feitos e esperados numa semana (que começa no domingo "inicio").
// Dias anteriores ao início do hábito e dias futuros são ignorados.
export function semanaDoHabito(habito, dias = new Set(), inicio) {
  const hoje = hojeISO()
  const criado = inicioDoHabito(habito, dias)
  let feitos = 0
  let diasValidos = 0
  for (let i = 0; i < 7; i++) {
    const d = somarDiasISO(inicio, i)
    if (d > hoje || d < criado) continue
    diasValidos++
    if (dias.has(d)) feitos++
  }
  if (!diasValidos) return { feitos: 0, esperado: 0 }
  const esperado = habito.frequencia === 'semanal' ? habito.vezes_semana : diasValidos
  return { feitos: Math.min(feitos, esperado), esperado }
}

// Taxa de cumprimento nos últimos N dias: { feitos, esperado, pct }
export function taxaPeriodo(habito, dias = new Set(), n = 30) {
  const hoje = hojeISO()
  const criado = inicioDoHabito(habito, dias)
  let feitos = 0
  let validos = 0
  for (let i = 0; i < n; i++) {
    const d = somarDiasISO(hoje, -i)
    if (d < criado) break
    validos++
    if (dias.has(d)) feitos++
  }
  // Semanal: a meta conta por semana iniciada (ex.: 3×/semana em 10 dias = 2 semanas = 6 vezes)
  const esperado = habito.frequencia === 'semanal' ? habito.vezes_semana * Math.ceil(validos / 7) : validos
  feitos = Math.min(feitos, esperado)
  return { feitos, esperado, pct: esperado ? Math.round((feitos / esperado) * 100) : 0 }
}
