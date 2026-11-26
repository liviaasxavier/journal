import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Hook genérico para qualquer tabela do Supabase: carrega as linhas e expõe
// adicionar / atualizar / apagar. Todos os módulos usam este mesmo hook.
// Opções:
//   ordem  → coluna usada para ordenar
//   filtro → função que recebe a consulta e a devolve filtrada,
//            ex.: (q) => q.gte('dia', '2026-01-01')
export function useTabela(tabela, { ordem = 'criada_em', filtro } = {}) {
  const [linhas, setLinhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar() {
    let consulta = supabase.from(tabela).select('*').order(ordem)
    if (filtro) consulta = filtro(consulta)
    const { data, error } = await consulta
    if (error) setErro(error.message)
    else setLinhas(data)
    setCarregando(false)
  }

  // Executa ao montar o componente (e se o nome da tabela mudar)
  useEffect(() => {
    carregar()
  }, [tabela])

  // Retorna a linha criada (com id e valores padrão do banco) ou null em caso de erro
  async function adicionar(nova) {
    setErro('')
    const { data, error } = await supabase.from(tabela).insert(nova).select().single()
    if (error) {
      setErro(error.message)
      return null
    }
    setLinhas((atuais) => [...atuais, data])
    return data
  }

  // Atualização otimista: altera o estado local imediatamente e depois envia ao banco.
  // Em caso de erro, recarrega os dados para voltar ao estado real.
  async function atualizar(id, mudancas) {
    setErro('')
    setLinhas((atuais) => atuais.map((l) => (l.id === id ? { ...l, ...mudancas } : l)))
    const { error } = await supabase.from(tabela).update(mudancas).eq('id', id)
    if (error) {
      setErro(error.message)
      carregar()
    }
  }

  async function apagar(id) {
    setErro('')
    setLinhas((atuais) => atuais.filter((l) => l.id !== id))
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) {
      setErro(error.message)
      carregar()
    }
  }

  return { linhas, setLinhas, carregando, erro, adicionar, atualizar, apagar, recarregar: carregar }
}
