import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base relativa: os arquivos gerados funcionam em qualquer caminho,
  // inclusive numa subpasta como usuario.github.io/journal/
  base: './',
})
