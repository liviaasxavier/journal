// Página genérica de "coleção": lista de cartões com busca, filtros, formulário
// de criação/edição e, opcionalmente, janela de detalhes. Ideias, Wishlist, Receitas,
// Livros & séries e Links usam este componente com configurações diferentes
// (definidas em src/pages/colecoes.jsx).
import { useMemo, useState } from 'react'
import { useTabela } from '../hooks/useTabela'
import { Cabecalho, Modal, Erro, Vazio, Chips, Estrelas, textoParaTags, tagsParaTexto } from './ui'

export default function Colecao({ config }) {
  const c = config
  const { linhas, carregando, erro, adicionar, atualizar, apagar } = useTabela(c.tabela)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState(() => Object.fromEntries((c.filtros || []).map((f) => [f.campo, 'tudo'])))
  const [editando, setEditando] = useState(null) // null | 'novo' | item
  const [vendo, setVendo] = useState(null)
  const [aviso, setAviso] = useState('')

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return linhas
      .filter((item) =>
        (c.filtros || []).every((f) => filtros[f.campo] === 'tudo' || item[f.campo] === filtros[f.campo])
      )
      .filter((item) => !b || (c.busca || []).some((campo) => String(item[campo] ?? '').toLowerCase().includes(b)))
      .sort(c.ordenar || ((a, b) => b.criada_em.localeCompare(a.criada_em)))
  }, [linhas, busca, filtros, c])

  async function salvar(valores) {
    const ok = editando === 'novo' ? await adicionar(valores) : (await atualizar(editando.id, valores), true)
    if (ok) setEditando(null)
  }

  function avisar(texto) {
    setAviso(texto)
    setTimeout(() => setAviso(''), 2500)
  }

  // Cada filtro da configuração vira uma fileira de etiquetas com a contagem de itens
  const fileirasFiltro = (c.filtros || []).map((f) => ({
    ...f,
    opcoes: [
      { valor: 'tudo', label: 'tudo', numero: linhas.length },
      ...f.opcoes.map((o) => ({ ...o, numero: linhas.filter((i) => i[f.campo] === o.valor).length })),
    ],
  }))

  const ctx = { atualizar, apagar, avisar, editar: setEditando }

  return (
    <div className="pagina">
      <Cabecalho icone={c.icone} emoji={c.emoji} etiqueta={c.etiqueta} titulo={c.titulo} frase={c.frase}>
        <button className="btn" onClick={() => setEditando('novo')}>
          + {c.nomeItem}
        </button>
      </Cabecalho>

      <div className="barra-ferramentas">
        <input className="busca" placeholder="buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {fileirasFiltro.map((f) => (
          <Chips
            key={f.campo}
            opcoes={f.opcoes}
            valor={filtros[f.campo]}
            onChange={(v) => setFiltros((atual) => ({ ...atual, [f.campo]: v }))}
          />
        ))}
      </div>

      <Erro>{erro}</Erro>
      {aviso && <p className="aviso mao">{aviso}</p>}

      {carregando ? (
        <Vazio>carregando…</Vazio>
      ) : visiveis.length === 0 ? (
        <Vazio>{linhas.length ? 'nada encontrado ✿' : c.vazio || 'nada por aqui ainda ✿'}</Vazio>
      ) : (
        <div className={c.layout === 'lista' ? 'colecao-lista' : 'colecao-grade'}>
          {visiveis.map((item, i) => (
            <article
              key={item.id}
              className={`card cartao fita ${c.corDoItem ? `bg-${c.corDoItem(item)}` : ''} ${c.esmaecer?.(item) ? 'esmaecido' : ''}`}
              style={{ '--fita-giro': `${((i * 37) % 9) - 4}deg` }}
            >
              <div
                className="cartao-corpo"
                onClick={() => (c.detalhe ? setVendo(item) : setEditando(item))}
                title={c.detalhe ? 'ver' : 'editar'}
              >
                {c.resumo(item, ctx)}
              </div>
              <div className="cartao-rodape">
                {c.status && <BotaoStatus item={item} status={c.status} onTrocar={(v) => atualizar(item.id, { [c.status.campo]: v })} />}
                {c.acoes?.(item, ctx).map((a) => (
                  <button key={a.label} className="link-acao" onClick={a.fn}>
                    {a.label}
                  </button>
                ))}
                <button className="link-acao" onClick={() => setEditando(item)}>
                  editar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {vendo && (
        <Modal titulo={vendo[c.campoTitulo || 'titulo']} onFechar={() => setVendo(null)} largo>
          {c.detalhe(linhas.find((l) => l.id === vendo.id) || vendo, ctx)}
          <div className="modal-acoes">
            <button
              className="btn"
              onClick={() => {
                setEditando(vendo)
                setVendo(null)
              }}
            >
              editar
            </button>
          </div>
        </Modal>
      )}

      {editando && (
        <Modal titulo={editando === 'novo' ? c.tituloNovo : 'editar'} onFechar={() => setEditando(null)} largo={c.formLargo}>
          <Formulario
            campos={c.campos}
            inicial={editando === 'novo' ? c.padrao || {} : editando}
            onSalvar={salvar}
            onApagar={
              editando !== 'novo'
                ? () => {
                    if (confirm('Apagar de vez?')) {
                      apagar(editando.id)
                      setEditando(null)
                    }
                  }
                : null
            }
          />
        </Modal>
      )}
    </div>
  )
}

// Botão de status: cada clique avança para o próximo status da lista
function BotaoStatus({ item, status, onTrocar }) {
  const i = status.opcoes.findIndex((o) => o.valor === item[status.campo])
  const atual = status.opcoes[i] || status.opcoes[0]
  const proximo = status.opcoes[(i + 1) % status.opcoes.length]
  return (
    <button className={`status-chip bg-${atual.cor || 'bege'}`} onClick={() => onTrocar(proximo.valor)} title={`mudar para "${proximo.label}"`}>
      {atual.label}
    </button>
  )
}

// Formulário gerado a partir da lista de campos da configuração.
// Tipos: texto, textarea, numero, url, data, select, tags, estrelas, booleano
export function Formulario({ campos, inicial, onSalvar, onApagar }) {
  const [valores, setValores] = useState(() => {
    const v = {}
    for (const campo of campos) {
      const atual = inicial[campo.nome]
      v[campo.nome] = campo.tipo === 'tags' ? tagsParaTexto(atual) : atual ?? (campo.tipo === 'booleano' ? false : '')
    }
    return v
  })
  const [salvando, setSalvando] = useState(false)
  const mudar = (nome, valor) => setValores((v) => ({ ...v, [nome]: valor }))

  async function enviar(e) {
    e.preventDefault()
    // Converte os valores do formulário (sempre texto) para os tipos das colunas do banco
    const dados = {}
    for (const campo of campos) {
      const v = valores[campo.nome]
      if (campo.tipo === 'numero') dados[campo.nome] = v === '' || v === null ? null : Number(v)
      else if (campo.tipo === 'tags') dados[campo.nome] = textoParaTags(v)
      else if (campo.tipo === 'data' || campo.tipo === 'url' || campo.tipo === 'select')
        dados[campo.nome] = v === '' ? (campo.padrao ?? null) : v
      else dados[campo.nome] = typeof v === 'string' ? v.trim() : v
    }
    setSalvando(true)
    await onSalvar(dados)
    setSalvando(false)
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      {campos.map((campo) => (
        <label key={campo.nome} className={`campo ${campo.largo || campo.tipo === 'textarea' ? 'campo-largo' : ''}`}>
          <span className="etiqueta">{campo.label}</span>
          <Entrada campo={campo} valor={valores[campo.nome]} onChange={(v) => mudar(campo.nome, v)} />
        </label>
      ))}
      <div className="modal-acoes">
        {onApagar && (
          <button type="button" className="link-acao perigo" onClick={onApagar}>
            apagar
          </button>
        )}
        <button className="btn" disabled={salvando}>
          {salvando ? 'salvando…' : 'salvar'}
        </button>
      </div>
    </form>
  )
}

function Entrada({ campo, valor, onChange }) {
  const comum = { value: valor ?? '', onChange: (e) => onChange(e.target.value), placeholder: campo.placeholder, required: campo.obrigatorio }
  switch (campo.tipo) {
    case 'textarea':
      return <textarea rows={campo.linhas || 5} {...comum} />
    case 'numero':
      return <input type="number" step="any" min={campo.min} {...comum} />
    case 'url':
      return <input type="url" {...comum} placeholder={campo.placeholder || 'https://…'} />
    case 'data':
      return <input type="date" {...comum} />
    case 'select':
      return (
        <select {...comum}>
          {!campo.obrigatorio && <option value="">—</option>}
          {campo.opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.label}
            </option>
          ))}
        </select>
      )
    case 'tags':
      return <input {...comum} placeholder={campo.placeholder || 'separe por vírgulas'} />
    case 'estrelas':
      return <Estrelas valor={Number(valor) || 0} onChange={onChange} />
    case 'booleano':
      return <input type="checkbox" checked={!!valor} onChange={(e) => onChange(e.target.checked)} className="caixa" />
    default:
      return <input {...comum} />
  }
}
