import { supabase } from './supabase'
import { hojeISO } from './datas'

const TABELAS = [
  'listas', 'tarefas', 'metas', 'habitos', 'habito_registros', 'eventos', 'agenda_cores', 'diario',
  'materias', 'avaliacoes', 'topicos', 'notas', 'ideias', 'wishlist', 'receitas',
  'midia', 'links', 'adesivos', 'adesivos_colados',
]

// Exporta todas as tabelas para um arquivo .json (as imagens dos adesivos não entram; ficam no Storage)
export async function baixarBackup() {
  const dados = { criado_em: new Date().toISOString() }
  for (const t of TABELAS) {
    // Busca paginada em blocos de 1000 linhas (limite padrão do Supabase por consulta)
    const linhas = []
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabase.from(t).select('*').range(de, de + 999)
      if (error) throw new Error(`${t}: ${error.message}`)
      linhas.push(...data)
      if (data.length < 1000) break
    }
    dados[t] = linhas
  }
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `journal-backup-${hojeISO()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
