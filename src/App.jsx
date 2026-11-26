// HashRouter: as rotas ficam depois do # (ex.: /#/agenda). O servidor sempre recebe
// o pedido do index.html e o React Router escolhe a página pelo trecho após o #.
// Com BrowserRouter, abrir /agenda direto no GitHub Pages resultaria em erro 404.
import { HashRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useSession } from './hooks/useSession'
import { TODOS_MODULOS } from './config'
import Layout from './components/Layout'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import EmConstrucao from './pages/EmConstrucao'
import Tarefas from './pages/Tarefas'
import Habitos from './pages/Habitos'
import Agenda from './pages/Agenda'
import Diario from './pages/Diario'
import Faculdade from './pages/Faculdade'
import Topicos from './pages/Topicos'
import Caderninho from './pages/Caderninho'
import Metas from './pages/Metas'
import Adesivos from './pages/Adesivos'
import { Ideias, Wishlist, Receitas, Midia, Links } from './pages/colecoes'

// Mapa caminho → componente. Módulos sem página aqui usam <EmConstrucao>.
const PAGINAS = {
  '/tarefas': Tarefas,
  '/habitos': Habitos,
  '/agenda': Agenda,
  '/diario': Diario,
  '/faculdade': Faculdade,
  '/topicos': Topicos,
  '/caderninho': Caderninho,
  '/metas': Metas,
  '/ideias': Ideias,
  '/wishlist': Wishlist,
  '/receitas': Receitas,
  '/midia': Midia,
  '/links': Links,
  '/adesivos': Adesivos,
}

export default function App() {
  if (!supabase) return <FaltaConfigurar />
  return <PortaoDeLogin />
}

function PortaoDeLogin() {
  const session = useSession()
  if (session === undefined) return <div className="tela-centro">carregando…</div>
  if (!session) return <Login />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Inicio />} />
          {TODOS_MODULOS.filter((m) => m.path !== '/').map((m) => {
            const Pagina = PAGINAS[m.path]
            return (
              <Route
                key={m.path}
                path={m.path}
                element={Pagina ? <Pagina /> : <EmConstrucao modulo={m} />}
              />
            )
          })}
        </Route>
      </Routes>
    </HashRouter>
  )
}

function FaltaConfigurar() {
  return (
    <div className="tela-centro">
      <div className="card" style={{ maxWidth: 440 }}>
        <h2>quase lá! 🔧</h2>
        <p>
          Crie o arquivo <code>.env</code> (copiando o <code>.env.example</code>) e cole a URL e a
          chave do seu projeto Supabase. Depois reinicie o <code>npm run dev</code>.
        </p>
      </div>
    </div>
  )
}
