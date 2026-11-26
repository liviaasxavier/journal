import { useTabela } from './useTabela'

// Tarefas = tabela genérica + o jeitinho de concluir (que guarda a data).
export function useTarefas() {
  const tabela = useTabela('tarefas')

  function alternarConcluida(tarefa) {
    const concluida = !tarefa.concluida
    return tabela.atualizar(tarefa.id, {
      concluida,
      concluida_em: concluida ? new Date().toISOString() : null,
    })
  }

  return { ...tabela, tarefas: tabela.linhas, alternarConcluida }
}
