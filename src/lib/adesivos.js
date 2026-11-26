import { supabase } from './supabase'

// URL pública de um arquivo do bucket de adesivos
export function urlAdesivo(caminho) {
  return supabase.storage.from('adesivos').getPublicUrl(caminho).data.publicUrl
}

// Prepara a imagem antes do upload: reduz para no máximo 900px, remove o fundo
// (opcional) e recorta as bordas vazias. Sempre retorna um PNG.
export async function prepararImagem(arquivo, removerFundo = true) {
  const bmp = await createImageBitmap(arquivo)
  const escala = Math.min(1, 900 / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * escala)
  const h = Math.round(bmp.height * escala)
  let canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, w, h)

  if (removerFundo) {
    const img = ctx.getImageData(0, 0, w, h)
    if (tirarFundo(img.data, w, h)) ctx.putImageData(img, 0, 0)
    canvas = recortarVazio(canvas)
  }
  return new Promise((ok) => canvas.toBlob(ok, 'image/png'))
}

// Remoção de fundo por preenchimento (flood fill): parte das bordas da imagem e
// torna transparentes os pixels de cor próxima à do fundo, até encontrar o desenho.
// Retorna false se as bordas já eram transparentes (nada a fazer).
function tirarFundo(d, w, h) {
  const borda = []
  for (let x = 0; x < w; x++) borda.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) borda.push(y * w, y * w + w - 1)

  // Imagem já transparente nas bordas: mantém como está
  const transparentes = borda.filter((i) => d[i * 4 + 3] < 128).length
  if (transparentes > borda.length * 0.3) return false

  // Cor do fundo = mediana de cada canal (R, G, B) dos pixels da borda
  const mediana = (canal) => {
    const v = borda.map((i) => d[i * 4 + canal]).sort((a, b) => a - b)
    return v[v.length >> 1]
  }
  const fundo = [mediana(0), mediana(1), mediana(2)]
  const distancia = (i) => Math.hypot(d[i * 4] - fundo[0], d[i * 4 + 1] - fundo[1], d[i * 4 + 2] - fundo[2])

  const TOLERANCIA = 42
  const visitado = new Uint8Array(w * h)
  const vizinhosDe = (i) => {
    const x = i % w
    return [i - w, i + w, x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1].filter((v) => v >= 0 && v < w * h)
  }

  // Apaga uma região a partir dos pixels iniciais, expandindo para vizinhos de cor parecida
  function apagarRegiao(inicio, tolerancia) {
    const pilha = [...inicio]
    for (const i of pilha) visitado[i] = 1
    while (pilha.length) {
      const i = pilha.pop()
      d[i * 4 + 3] = 0
      for (const v of vizinhosDe(i)) {
        if (visitado[v]) continue
        const dist = distancia(v)
        if (dist <= tolerancia) {
          visitado[v] = 1
          pilha.push(v)
        } else if (dist < TOLERANCIA * 2.5 && d[v * 4 + 3] === 255) {
          // Pixel de contorno: transparência parcial, para suavizar a borda (anti-aliasing)
          d[v * 4 + 3] = Math.round(255 * Math.min(1, (dist - TOLERANCIA) / (TOLERANCIA * 1.5)))
        }
      }
    }
  }

  // 1) Fundo externo, a partir das bordas da imagem
  apagarRegiao(borda.filter((i) => distancia(i) <= TOLERANCIA), TOLERANCIA)

  // 2) Áreas de fundo cercadas pelo desenho (ex.: o vão das alças de um laço).
  //    Usa tolerância menor para não apagar contornos escuros do próprio desenho.
  const ESTRITA = TOLERANCIA / 2
  for (let i = 0; i < w * h; i++) {
    if (visitado[i] || d[i * 4 + 3] === 0 || distancia(i) > ESTRITA) continue
    // Mede a região antes de apagar; regiões muito pequenas são mantidas
    const regiao = [i]
    const marcado = new Set([i])
    for (let k = 0; k < regiao.length && regiao.length < 200000; k++)
      for (const v of vizinhosDe(regiao[k]))
        if (!marcado.has(v) && !visitado[v] && distancia(v) <= ESTRITA) {
          marcado.add(v)
          regiao.push(v)
        }
    if (regiao.length >= 40) apagarRegiao(regiao, ESTRITA)
    else for (const v of regiao) visitado[v] = 1
  }

  // 3) Remove a cor do fundo misturada nos pixels semitransparentes do contorno
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3] / 255
    if (a <= 0 || a >= 1) continue
    for (let c = 0; c < 3; c++) d[i * 4 + c] = Math.max(0, Math.min(255, Math.round((d[i * 4 + c] - (1 - a) * fundo[c]) / a)))
  }
  return true
}

// Recorta as margens totalmente transparentes ao redor do desenho
function recortarVazio(canvas) {
  const { width: w, height: h } = canvas
  const d = canvas.getContext('2d').getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return canvas // imagem inteira transparente: retorna sem recortar
  const novo = document.createElement('canvas')
  novo.width = x1 - x0 + 1
  novo.height = y1 - y0 + 1
  novo.getContext('2d').drawImage(canvas, -x0, -y0)
  return novo
}

// Upload para a pasta da usuária no bucket (ex.: "<user-id>/1732567-laco.png").
// A política do Storage só permite escrever na pasta com o próprio id.
export async function enviarArquivo(blob, nome) {
  const { data } = await supabase.auth.getUser()
  const limpo = nome.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-')
  const caminho = `${data.user.id}/${Date.now()}-${limpo}.png`
  const { error } = await supabase.storage.from('adesivos').upload(caminho, blob, { contentType: 'image/png' })
  return { caminho, error }
}

export async function apagarArquivo(caminho) {
  return supabase.storage.from('adesivos').remove([caminho])
}
