// Configurações gerais do site.
export const MEU_NOME = 'Lívia'

// Grupos e módulos do menu. O menu, as rotas e os atalhos do Início são gerados a partir desta lista.
// Campos de cada módulo:
//   path  → endereço da página
//   icone → nome do PNG em public/icones/ (sem .png); se o arquivo não existir, usa o emoji
//   cor   → cor do item ativo no menu e do atalho (classes bg-<cor> do theme.css)
// Para criar um módulo: adicionar um item aqui, criar a página em src/pages e registrá-la em App.jsx.
export const GRUPOS = [
  {
    titulo: 'Dia a dia',
    itens: [
      { path: '/', icone: 'inicio', label: 'Início', emoji: '🏡', cor: 'rosa' },
      { path: '/agenda', icone: 'agenda', label: 'Agenda', emoji: '📅', cor: 'pessego' },
      { path: '/tarefas', icone: 'todo', label: 'To-do', emoji: '✅', cor: 'rosa-claro' },
      { path: '/habitos', icone: 'habitos', label: 'Hábitos', emoji: '🔁', cor: 'malva' },
      { path: '/diario', icone: 'diario', label: 'Diário', emoji: '📔', cor: 'lavanda' },
    ],
  },
  {
    titulo: 'Estudos',
    itens: [
      { path: '/faculdade', icone: 'faculdade', label: 'Faculdade', emoji: '🎓', cor: 'rosa' },
      { path: '/topicos', icone: 'topicos', label: 'Tópicos', emoji: '📚', cor: 'pessego' },
      { path: '/caderninho', icone: 'caderninho', label: 'Caderninho', emoji: '📓', cor: 'lavanda' },
    ],
  },
  {
    titulo: 'Vida & coisas minhas',
    itens: [
      { path: '/metas', icone: 'metas', label: 'Metas', emoji: '🎯', cor: 'malva' },
      { path: '/ideias', icone: 'ideias', label: 'Ideias', emoji: '💡', cor: 'rosa-claro' },
      { path: '/wishlist', icone: 'wishlist', label: 'Wishlist', emoji: '🎁', cor: 'rosa' },
      { path: '/receitas', icone: 'receitas', label: 'Receitas', emoji: '🍳', cor: 'pessego' },
      { path: '/midia', icone: 'midia', label: 'Livros & séries', emoji: '🎬', cor: 'lavanda' },
      { path: '/links', icone: 'links', label: 'Links salvos', emoji: '🔗', cor: 'rosa-claro' },
      { path: '/adesivos', icone: 'adesivos', label: 'Adesivos', emoji: '🌸', cor: 'malva' },
    ],
  },
]

export const TODOS_MODULOS = GRUPOS.flatMap((g) => g.itens)

// Crédito exigido pela licença gratuita do Flaticon, exibido no rodapé do menu.
export const CREDITO_ICONES = {
  texto: 'ícones: Uicons by Flaticon',
  link: 'https://www.flaticon.com/uicons',
}
