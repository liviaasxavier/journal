// Funções de data. O banco guarda datas como texto 'AAAA-MM-DD' (sem hora).
// Nesse formato, comparar strings equivale a comparar datas, porque a ordem
// vai da maior unidade para a menor (ano, mês, dia).

// Date → 'AAAA-MM-DD' no fuso local (toISOString usaria UTC e poderia mudar o dia)
export function paraISO(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// 'AAAA-MM-DD' → Date às 12h, para que a conversão de fuso não caia no dia anterior
export function deISO(iso) {
  return new Date(`${iso}T12:00`)
}

// 'AAAA-MM-DD' de hoje, ou de hoje + N dias
export function hojeISO(somarDias = 0) {
  return somarDias ? somarDiasISO(paraISO(new Date()), somarDias) : paraISO(new Date())
}

export function somarDiasISO(iso, n) {
  const d = deISO(iso)
  d.setDate(d.getDate() + n)
  return paraISO(d)
}

// Domingo da semana que contém o dia (as semanas começam no domingo)
export function inicioSemanaISO(iso) {
  return somarDiasISO(iso, -deISO(iso).getDay())
}

// Diferença em dias entre duas datas ISO (b - a)
export function diasEntre(a, b) {
  return Math.round((deISO(b) - deISO(a)) / 86400000)
}

export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// 'AAAA-MM-DD' → "hoje", "amanhã", "ontem" ou "qui., 3 de dez."
export function formatarPrazo(iso) {
  if (!iso) return ''
  if (iso === hojeISO()) return 'hoje'
  if (iso === hojeISO(1)) return 'amanhã'
  if (iso === hojeISO(-1)) return 'ontem'
  return deISO(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

// 'AAAA-MM-DD' → "quarta-feira, 25 de novembro"
export function formatarLongo(iso) {
  return deISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// '14:30:00' → '14:30'
export function hora(h) {
  return h ? h.slice(0, 5) : ''
}
