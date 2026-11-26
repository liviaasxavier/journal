// Conversor simples de Markdown para HTML, sem biblioteca externa.
// Suporta: # títulos, **negrito**, *itálico*, ~~riscado~~, `código`,
// blocos ``` de código, listas (- e 1.), - [ ] caixas de seleção, > citação,
// [links](url), --- linha horizontal e parágrafos.
//
// Segurança: o texto é escapado antes da conversão (< vira &lt;), o que impede
// a inserção de HTML ou JavaScript dentro da nota (XSS).

function escapar(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function emLinha(t) {
  return t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

export function markdownParaHTML(md) {
  const linhas = escapar(md || '').split('\n')
  const html = []
  let lista = null // 'ul' | 'ol' | null
  let paragrafo = []
  let codigo = null

  const fecharParagrafo = () => {
    if (paragrafo.length) html.push(`<p>${emLinha(paragrafo.join('<br>'))}</p>`)
    paragrafo = []
  }
  const fecharLista = () => {
    if (lista) html.push(`</${lista}>`)
    lista = null
  }

  for (const linha of linhas) {
    if (codigo !== null) {
      if (linha.trim().startsWith('```')) {
        html.push(`<pre><code>${codigo.join('\n')}</code></pre>`)
        codigo = null
      } else codigo.push(linha)
      continue
    }
    if (linha.trim().startsWith('```')) {
      fecharParagrafo()
      fecharLista()
      codigo = []
      continue
    }

    const titulo = linha.match(/^(#{1,3})\s+(.*)/)
    const caixa = linha.match(/^\s*[-*]\s+\[( |x)\]\s+(.*)/i)
    const itemUl = linha.match(/^\s*[-*]\s+(.*)/)
    const itemOl = linha.match(/^\s*\d+[.)]\s+(.*)/)

    if (titulo) {
      fecharParagrafo()
      fecharLista()
      const n = titulo[1].length
      html.push(`<h${n + 1}>${emLinha(titulo[2])}</h${n + 1}>`)
    } else if (/^\s*(---|\*\*\*)\s*$/.test(linha)) {
      fecharParagrafo()
      fecharLista()
      html.push('<hr>')
    } else if (linha.startsWith('&gt;')) {
      fecharParagrafo()
      fecharLista()
      html.push(`<blockquote>${emLinha(linha.replace(/^&gt;\s?/, ''))}</blockquote>`)
    } else if (caixa || itemUl || itemOl) {
      fecharParagrafo()
      const tipo = itemOl && !itemUl ? 'ol' : 'ul'
      if (lista !== tipo) {
        fecharLista()
        html.push(`<${tipo}>`)
        lista = tipo
      }
      if (caixa) {
        const feita = caixa[1].toLowerCase() === 'x'
        html.push(`<li class="caixinha ${feita ? 'feita' : ''}">${feita ? '☑' : '☐'} ${emLinha(caixa[2])}</li>`)
      } else html.push(`<li>${emLinha((itemOl && !itemUl ? itemOl : itemUl)[1])}</li>`)
    } else if (!linha.trim()) {
      fecharParagrafo()
      fecharLista()
    } else {
      fecharLista()
      paragrafo.push(linha)
    }
  }
  if (codigo !== null) html.push(`<pre><code>${codigo.join('\n')}</code></pre>`)
  fecharParagrafo()
  fecharLista()
  return html.join('\n')
}
