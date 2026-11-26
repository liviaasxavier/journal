// Páginas do tipo "coleção". Cada uma é uma configuração passada ao componente
// <Colecao>: campos do formulário, conteúdo do cartão, filtros, busca e ações.
import Colecao from '../components/Colecao'
import { Estrelas } from '../components/ui'
import { supabase } from '../lib/supabase'
import { markdownParaHTML } from '../lib/markdown'
import { Enfeite } from '../components/Enfeite'

const PRIORIDADES = [
  { valor: 'alta', label: 'alta' },
  { valor: 'media', label: 'média' },
  { valor: 'baixa', label: 'baixa' },
]

function Tags({ tags }) {
  return tags?.length ? (
    <div className="tags">
      {tags.map((t) => (
        <span key={t} className="tag">
          #{t}
        </span>
      ))}
    </div>
  ) : null
}

// ---------------------------------------------------------------- IDEIAS
const IDEIAS = {
  tabela: 'ideias',
  icone: 'ideias',
  emoji: '💡',
  etiqueta: 'banco de ideias',
  titulo: 'Ideias',
  frase: 'pra não esquecer!',
  nomeItem: 'ideia',
  tituloNovo: 'nova ideia',
  busca: ['titulo', 'descricao'],
  campos: [
    { nome: 'titulo', label: 'ideia', tipo: 'texto', obrigatorio: true, largo: true },
    { nome: 'descricao', label: 'detalhes', tipo: 'textarea', linhas: 4 },
    { nome: 'tags', label: 'tags', tipo: 'tags' },
  ],
  status: {
    campo: 'status',
    opcoes: [
      { valor: 'ideia', label: 'ideia', cor: 'bege' },
      { valor: 'testando', label: 'testando', cor: 'pessego' },
      { valor: 'feito', label: 'feito', cor: 'salvia' },
      { valor: 'descartado', label: 'descartado', cor: 'lavanda' },
    ],
  },
  get filtros() {
    return [this.status]
  },
  esmaecer: (i) => i.status === 'descartado',
  resumo: (i) => (
    <>
      <h3>{i.titulo}</h3>
      {i.descricao && <p className="cartao-texto">{i.descricao}</p>}
      <Tags tags={i.tags} />
    </>
  ),
  acoes: (i, ctx) => [
    {
      label: '→ tarefa',
      fn: async () => {
        const { error } = await supabase.from('tarefas').insert({ titulo: i.titulo })
        if (error) ctx.avisar('ops: ' + error.message)
        else {
          ctx.avisar('virou tarefa no to-do ✓')
          if (i.status === 'ideia') ctx.atualizar(i.id, { status: 'testando' })
        }
      },
    },
    {
      label: '→ meta',
      fn: async () => {
        const { error } = await supabase.from('metas').insert({ titulo: i.titulo, descricao: i.descricao })
        if (error) ctx.avisar('ops: ' + error.message)
        else {
          ctx.avisar('virou meta ✓')
          if (i.status === 'ideia') ctx.atualizar(i.id, { status: 'testando' })
        }
      },
    },
  ],
}

// ---------------------------------------------------------------- WISHLIST
const WISHLIST = {
  tabela: 'wishlist',
  icone: 'wishlist',
  emoji: '🎁',
  etiqueta: 'wishlist',
  titulo: 'Wishlist',
  frase: 'coisinhas que eu quero',
  nomeItem: 'desejo',
  tituloNovo: 'novo desejo',
  campoTitulo: 'nome',
  busca: ['nome', 'categoria'],
  campos: [
    { nome: 'nome', label: 'o quê', tipo: 'texto', obrigatorio: true, largo: true },
    { nome: 'link', label: 'link', tipo: 'url', largo: true },
    { nome: 'preco', label: 'preço (R$)', tipo: 'numero', min: 0 },
    { nome: 'prioridade', label: 'prioridade', tipo: 'select', opcoes: PRIORIDADES, obrigatorio: true },
    { nome: 'categoria', label: 'categoria', tipo: 'texto', placeholder: 'roupa, livro, casa…' },
  ],
  padrao: { prioridade: 'media' },
  status: {
    campo: 'status',
    opcoes: [
      { valor: 'quero', label: 'quero', cor: 'rosa' },
      { valor: 'comprado', label: 'comprado ✓', cor: 'salvia' },
    ],
  },
  get filtros() {
    return [this.status]
  },
  esmaecer: (i) => i.status === 'comprado',
  ordenar: (a, b) =>
    (a.status === 'comprado') - (b.status === 'comprado') ||
    ['alta', 'media', 'baixa'].indexOf(a.prioridade) - ['alta', 'media', 'baixa'].indexOf(b.prioridade) ||
    b.criada_em.localeCompare(a.criada_em),
  resumo: (i) => (
    <>
      <h3>{i.nome}</h3>
      <div className="cartao-linha">
        {i.preco != null && <span className="preco mao">R$ {Number(i.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
        <span className={`prioridade prioridade-${i.prioridade}`}>{PRIORIDADES.find((p) => p.valor === i.prioridade)?.label}</span>
        {i.categoria && <span className="tag">#{i.categoria}</span>}
      </div>
      {i.link && (
        <a className="link-externo" href={i.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          abrir loja ↗
        </a>
      )}
    </>
  ),
}

// ---------------------------------------------------------------- RECEITAS
const RECEITAS = {
  tabela: 'receitas',
  icone: 'receitas',
  emoji: '🍳',
  etiqueta: 'livro de receitas',
  titulo: 'Receitas',
  frase: 'pra fazer de novo e de novo',
  nomeItem: 'receita',
  tituloNovo: 'nova receita',
  formLargo: true,
  busca: ['titulo', 'categoria', 'ingredientes'],
  campos: [
    { nome: 'titulo', label: 'nome', tipo: 'texto', obrigatorio: true, largo: true },
    { nome: 'categoria', label: 'categoria', tipo: 'texto', placeholder: 'doce, almoço, lanche…' },
    { nome: 'tempo_min', label: 'tempo (min)', tipo: 'numero', min: 0 },
    { nome: 'porcoes', label: 'porções', tipo: 'numero', min: 1 },
    { nome: 'favorita', label: 'favorita', tipo: 'booleano' },
    { nome: 'ingredientes', label: 'ingredientes (um por linha)', tipo: 'textarea', linhas: 7 },
    { nome: 'preparo', label: 'modo de preparo (aceita markdown)', tipo: 'textarea', linhas: 9 },
  ],
  filtros: [
    {
      campo: 'favorita',
      opcoes: [{ valor: true, label: '♡ favoritas', cor: 'rosa' }],
    },
  ],
  ordenar: (a, b) => b.favorita - a.favorita || a.titulo.localeCompare(b.titulo),
  resumo: (r, ctx) => (
    <>
      <div className="cartao-linha entre">
        <h3>{r.titulo}</h3>
        <button
          className={`coracao ${r.favorita ? 'cheio' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            ctx.atualizar(r.id, { favorita: !r.favorita })
          }}
          aria-label={r.favorita ? 'desfavoritar' : 'favoritar'}
        >
          <Enfeite tipo={r.favorita ? 'coracao-cheio' : 'coracao'} />
        </button>
      </div>
      <div className="cartao-linha">
        {r.tempo_min ? <span className="mao">{r.tempo_min} min</span> : null}
        {r.porcoes ? <span className="mao">· {r.porcoes} porções</span> : null}
        {r.categoria && <span className="tag">#{r.categoria}</span>}
      </div>
    </>
  ),
  detalhe: (r) => (
    <div className="receita">
      <p className="mao">
        {[r.tempo_min && `${r.tempo_min} min`, r.porcoes && `${r.porcoes} porções`, r.categoria].filter(Boolean).join(' · ')}
      </p>
      <div className="receita-colunas">
        <div className="card pautado receita-ingredientes">
          <span className="etiqueta">ingredientes</span>
          <ul>
            {r.ingredientes
              .split('\n')
              .filter((l) => l.trim())
              .map((l, i) => (
                <li key={i}>{l.replace(/^[-*]\s*/, '')}</li>
              ))}
          </ul>
        </div>
        <div className="receita-preparo">
          <span className="etiqueta">preparo</span>
          <div className="markdown" dangerouslySetInnerHTML={{ __html: markdownParaHTML(r.preparo) }} />
        </div>
      </div>
    </div>
  ),
}

// ---------------------------------------------------------------- LIVROS & SÉRIES
const TIPOS_MIDIA = [
  { valor: 'livro', label: 'livro', cor: 'pessego' },
  { valor: 'filme', label: 'filme', cor: 'lavanda' },
  { valor: 'serie', label: 'série', cor: 'rosa' },
]
const MIDIA = {
  tabela: 'midia',
  icone: 'midia',
  emoji: '🎬',
  etiqueta: 'livros, filmes & séries',
  titulo: 'Livros & séries',
  frase: 'o que eu li, vi e quero ver',
  nomeItem: 'item',
  tituloNovo: 'novo livro/filme/série',
  busca: ['titulo', 'criador', 'comentario'],
  campos: [
    { nome: 'titulo', label: 'título', tipo: 'texto', obrigatorio: true, largo: true },
    { nome: 'tipo', label: 'tipo', tipo: 'select', opcoes: TIPOS_MIDIA, obrigatorio: true },
    { nome: 'criador', label: 'autora / direção', tipo: 'texto' },
    { nome: 'nota', label: 'nota', tipo: 'estrelas' },
    { nome: 'comentario', label: 'o que achei', tipo: 'textarea', linhas: 4 },
  ],
  padrao: { tipo: 'livro' },
  status: {
    campo: 'status',
    opcoes: [
      { valor: 'quero', label: 'quero ver', cor: 'bege' },
      { valor: 'vendo', label: 'vendo/lendo', cor: 'pessego' },
      { valor: 'visto', label: 'visto ✓', cor: 'salvia' },
    ],
  },
  get filtros() {
    return [{ campo: 'tipo', opcoes: TIPOS_MIDIA }, this.status]
  },
  resumo: (m, ctx) => (
    <>
      <span className={`tag-lista bg-${TIPOS_MIDIA.find((t) => t.valor === m.tipo)?.cor}`}>
        {TIPOS_MIDIA.find((t) => t.valor === m.tipo)?.label}
      </span>
      <h3>{m.titulo}</h3>
      {m.criador && <p className="suave">{m.criador}</p>}
      <div onClick={(e) => e.stopPropagation()}>
        <Estrelas valor={m.nota || 0} onChange={(n) => ctx.atualizar(m.id, { nota: n })} pequeno />
      </div>
      {m.comentario && <p className="cartao-texto mao">“{m.comentario}”</p>}
    </>
  ),
}

// ---------------------------------------------------------------- LINKS
const LINKS = {
  tabela: 'links',
  icone: 'links',
  emoji: '🔗',
  etiqueta: 'links salvos',
  titulo: 'Links salvos',
  frase: 'pra não perder',
  nomeItem: 'link',
  tituloNovo: 'novo link',
  layout: 'lista',
  busca: ['titulo', 'url', 'descricao', 'tags'],
  campos: [
    { nome: 'titulo', label: 'título', tipo: 'texto', obrigatorio: true, largo: true },
    { nome: 'url', label: 'endereço', tipo: 'url', obrigatorio: true, largo: true },
    { nome: 'descricao', label: 'anotação', tipo: 'textarea', linhas: 2 },
    { nome: 'tags', label: 'tags', tipo: 'tags' },
  ],
  resumo: (l) => (
    <>
      <a className="link-titulo" href={l.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        {l.titulo} ↗
      </a>
      <span className="link-dominio">{dominio(l.url)}</span>
      {l.descricao && <p className="cartao-texto">{l.descricao}</p>}
      <Tags tags={l.tags} />
    </>
  ),
}

function dominio(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export const Ideias = () => <Colecao config={IDEIAS} />
export const Wishlist = () => <Colecao config={WISHLIST} />
export const Receitas = () => <Colecao config={RECEITAS} />
export const Midia = () => <Colecao config={MIDIA} />
export const Links = () => <Colecao config={LINKS} />
