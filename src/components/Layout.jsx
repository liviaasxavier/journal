import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { GRUPOS, MEU_NOME, CREDITO_ICONES } from '../config'
import { supabase } from '../lib/supabase'
import { baixarBackup } from '../lib/backup'
import Icone from './Icone'
import CamadaAdesivos from './CamadaAdesivos'

function Logo() {
  return (
    <div className="logo">
      <span className="selo">
        <Icone nome="logo" emoji="🌷" />
      </span>
      <span>
        journal
        <span className="logo-sub">de {MEU_NOME}</span>
      </span>
    </div>
  )
}

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [colando, setColando] = useState(false) // modo de editar adesivos
  const [fazendoBackup, setFazendoBackup] = useState(false)
  const { pathname } = useLocation()

  async function backup() {
    setFazendoBackup(true)
    try {
      await baixarBackup()
    } catch (e) {
      alert('Não deu para fazer o backup: ' + e.message)
    }
    setFazendoBackup(false)
  }

  return (
    <div className="app">
      <header className="topo-mobile">
        <button className="btn-icone" onClick={() => setMenuAberto(!menuAberto)} aria-label="menu">
          <Icone nome="menu" emoji="☰" />
        </button>
        <Logo />
      </header>

      {/* menu lateral; a lombada xadrez é desenhada no CSS (.sidebar::before) */}
      <aside className={`sidebar ${menuAberto ? 'aberta' : ''}`}>
        <Logo />
        <nav>
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="grupo">
              <div className="grupo-titulo">{grupo.titulo}</div>
              {grupo.itens.map((m) => (
                <NavLink
                  key={m.path}
                  to={m.path}
                  end={m.path === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? `ativo bg-${m.cor}` : ''}`}
                  onClick={() => setMenuAberto(false)}
                >
                  {({ isActive }) => (
                    <>
                      <Icone nome={m.icone} emoji={m.emoji} className="nav-emoji" />
                      {m.label}
                      {isActive && <Icone nome="laco" emoji="🎀" className="laco" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-rodape">
          <button className="btn-sair" onClick={() => supabase.auth.signOut()}>
            sair <Icone nome="sair" emoji="👋" />
          </button>
          <button className="link-acao" onClick={backup} disabled={fazendoBackup}>
            {fazendoBackup ? 'baixando…' : 'baixar backup'}
          </button>
        </div>
        <a className="creditos" href={CREDITO_ICONES.link} target="_blank" rel="noreferrer">
          {CREDITO_ICONES.texto}
        </a>
      </aside>

      {menuAberto && <div className="fundo-escuro" onClick={() => setMenuAberto(false)} />}

      <main className="conteudo">
        <Outlet />
        {/* key={pathname}: a camada é recriada a cada troca de página, carregando os adesivos dela */}
        <CamadaAdesivos key={pathname} pagina={pathname} editando={colando} onFechar={() => setColando(false)} />
      </main>

      {!colando && (
        <button className="botao-adesivos selo" onClick={() => setColando(true)} title="colar adesivos nesta página">
          <Icone nome="adesivos" emoji="🌸" />
        </button>
      )}
    </div>
  )
}
