# journal 🌷

Site pessoal: agenda, to-do, hábitos, diário, faculdade, estudos, metas, ideias, wishlist, receitas, livros & séries, links e adesivos.

**Stack:** React + Vite (front) · Supabase (banco de dados, login e armazenamento das imagens)

## Como rodar (Fase 1)

### 1. Instale o Node.js
Baixe a versão **LTS** em https://nodejs.org e instale. No terminal, confira:
```
node -v
```

### 2. Crie o projeto no Supabase
1. Crie uma conta em https://supabase.com e clique em **New project** (o plano gratuito basta).
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon / publishable**.
3. Em **Authentication → Users → Add user**, crie o seu usuário (e-mail e senha). Marque "Auto confirm".
4. Em **Authentication → Sign In / Providers**, desative **"Allow new users to sign up"**, para que só você consiga entrar.

### 3. Configure o projeto
Na pasta do projeto, copie `.env.example` para um arquivo novo chamado `.env` e cole a URL e a chave.

### 4. Rode
```
npm install
npm run dev
```
Abra o endereço que aparecer (normalmente http://localhost:5173) e entre com o usuário que você criou.

### 5. Crie as tabelas no Supabase
No Supabase: **SQL Editor → New query**, cole todo o conteúdo de `supabase/journal.sql` e clique em **Run**.
Pode rodar de novo sempre que o arquivo for atualizado: ele só cria o que ainda não existe e não apaga nada.

## Estrutura
```
src/
  config.js        ← seu nome e a lista de módulos do menu
  App.jsx          ← rotas e login
  lib/supabase.js  ← conexão com a nuvem
  components/      ← peças reutilizáveis (Layout/menu)
  hooks/useTabela.js ← carrega/cria/edita/apaga linhas de qualquer tabela
  components/Colecao.jsx ← página genérica (ideias, wishlist, receitas, mídia, links)
  pages/colecoes.jsx ← as configurações dessas 5 páginas
  pages/           ← uma página por módulo
  styles/theme.css ← cores pastel e estilos (mude a paleta no topo!)
```

## Publicar no GitHub Pages (para abrir no celular)

1. **Crie o repositório** no GitHub (ex.: `journal`) e envie esta pasta (VS Code → Source Control, ou GitHub Desktop).
   O `.env` não vai junto (está no `.gitignore`) — e é assim mesmo.
2. **Cadastre as chaves** em *Settings → Secrets and variables → Actions → New repository secret*:
   - `VITE_SUPABASE_URL` = a mesma URL do seu `.env`
   - `VITE_SUPABASE_ANON_KEY` = a mesma chave do seu `.env`
3. **Ligue o Pages** em *Settings → Pages → Build and deployment → Source: GitHub Actions*.
4. Pronto: a cada envio para a branch `main`, o arquivo `.github/workflows/publicar.yml` constrói e publica o site.
   Acompanhe na aba **Actions**. O endereço fica `https://SEU-USUARIO.github.io/journal/`.

Os endereços das páginas usam `#` (ex.: `/#/agenda`) porque o GitHub Pages só sabe entregar o `index.html`.
