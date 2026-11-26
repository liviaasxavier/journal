import { useRef, useState } from 'react'
import { useTabela } from '../hooks/useTabela'
import { urlAdesivo, enviarArquivo, apagarArquivo, prepararImagem } from '../lib/adesivos'
import { Cabecalho, Erro, Vazio } from '../components/ui'
import Icone from '../components/Icone'

export default function Adesivos() {
  const adesivos = useTabela('adesivos')
  const colados = useTabela('adesivos_colados')
  const [enviando, setEnviando] = useState(0)
  const [erro, setErro] = useState('')
  const [removerFundo, setRemoverFundo] = useState(true)
  const [limpando, setLimpando] = useState(null) // id do adesivo tirando o fundo
  const entrada = useRef(null)

  async function enviar(arquivos) {
    setErro('')
    const lista = [...arquivos].filter((a) => a.type.startsWith('image/'))
    setEnviando(lista.length)
    for (const arquivo of lista) {
      if (arquivo.size > 8 * 1024 * 1024) {
        setErro(`"${arquivo.name}" é maior que 8 MB`)
      } else {
        try {
          const png = await prepararImagem(arquivo, removerFundo)
          const { caminho, error } = await enviarArquivo(png, arquivo.name)
          if (error) setErro(error.message)
          else await adesivos.adicionar({ caminho, nome: arquivo.name.replace(/\.[^.]+$/, '') })
        } catch (e) {
          setErro(`não consegui ler "${arquivo.name}" (${e.message})`)
        }
      }
      setEnviando((n) => n - 1)
    }
  }

  // Remove o fundo de um adesivo já enviado: baixa o arquivo, processa, envia o novo e apaga o antigo
  async function limparFundo(a) {
    setErro('')
    setLimpando(a.id)
    try {
      const original = await (await fetch(urlAdesivo(a.caminho))).blob()
      const png = await prepararImagem(original, true)
      const { caminho, error } = await enviarArquivo(png, a.nome || 'adesivo')
      if (error) throw error
      await adesivos.atualizar(a.id, { caminho })
      await apagarArquivo(a.caminho)
    } catch (e) {
      setErro(e.message)
    }
    setLimpando(null)
  }

  async function apagar(a) {
    const usos = colados.linhas.filter((c) => c.adesivo_id === a.id).length
    if (!confirm(usos ? `Esse adesivo está colado em ${usos} lugar(es). Apagar mesmo assim?` : 'Apagar este adesivo?')) return
    await apagarArquivo(a.caminho)
    adesivos.apagar(a.id)
  }

  return (
    <div className="pagina">
      <Cabecalho icone="adesivos" emoji="🌸" etiqueta="adesivos" titulo="Adesivos" frase="para decorar!" />
      <Erro>{erro || adesivos.erro}</Erro>

      <div
        className="card quadriculado fita area-envio"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          enviar(e.dataTransfer.files)
        }}
        onClick={() => entrada.current.click()}
      >
        <input ref={entrada} type="file" accept="image/png,image/webp,image/gif,image/jpeg" multiple hidden onChange={(e) => enviar(e.target.files)} />
        <p className="mao">{enviando ? `enviando ${enviando}…` : 'arraste PNGs aqui ou clique para escolher'}</p>
        <p className="pequeno suave">PNG, JPG ou WEBP · até 8 MB cada</p>
      </div>
      <label className="opcao-fundo">
        <input type="checkbox" className="caixa" checked={removerFundo} onChange={(e) => setRemoverFundo(e.target.checked)} />
        tirar o fundo automaticamente (para imagens com fundo de uma cor só)
      </label>

      <div className="card pautado como-usar">
        <span className="etiqueta">como colar</span>
        <p>
          Em qualquer página, clique no botão <Icone nome="adesivos" emoji="🌸" className="icone-inline" /> no cantinho de baixo. Aparece a sua
          caixinha de adesivos: clique num adesivo para colar, arraste para mover, use a bolinha do canto para girar e mudar o tamanho, e o ✕ para
          tirar. Clique em "pronto" para guardar.
        </p>
      </div>

      {adesivos.carregando ? (
        <Vazio>carregando…</Vazio>
      ) : adesivos.linhas.length === 0 ? (
        <Vazio>sua caixinha de adesivos está vazia ✿</Vazio>
      ) : (
        <div className="grade-adesivos">
          {adesivos.linhas.map((a) => (
            <figure key={a.id} className="adesivo-item">
              <img src={urlAdesivo(a.caminho)} alt={a.nome} loading="lazy" />
              <figcaption>
                <span className="pequeno">{a.nome}</span>
                <span>
                  <button className="link-acao" onClick={() => limparFundo(a)} disabled={limpando === a.id}>
                    {limpando === a.id ? 'limpando…' : 'tirar fundo'}
                  </button>
                  <button className="link-acao perigo" onClick={() => apagar(a)}>
                    apagar
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
