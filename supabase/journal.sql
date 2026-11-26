-- =====================================================================
--  journal — esquema completo do banco (Supabase / PostgreSQL)
-- =====================================================================
--  Execução: Supabase → SQL Editor → New query → colar o arquivo → Run.
--
--  Script idempotente: usa "if not exists" e "drop ... if exists",
--  então pode ser executado várias vezes sem duplicar objetos nem apagar dados.
--
--  Padrão de todas as tabelas:
--    • user_id default auth.uid()  → preenchido com o usuário logado
--    • grant ... to authenticated  → permite acesso a usuários autenticados
--    • RLS + política              → cada usuário só lê e altera as próprias linhas
--
--  Índice:
--    1. To-do ............ listas, tarefas
--    2. Metas ............ metas
--    3. Hábitos .......... habitos, habito_registros
--    4. Agenda ........... eventos, agenda_cores
--    5. Diário ........... diario
--    6. Faculdade ........ materias, avaliacoes
--    7. Estudos .......... topicos, notas (caderninho)
--    8. Coleções ......... ideias, wishlist, receitas, midia, links
--    9. Adesivos ......... adesivos, adesivos_colados + Storage
-- =====================================================================


-- =====================================================================
--  1. TO-DO
-- =====================================================================

-- listas separadas (faculdade, casa…)
create table if not exists public.listas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  nome      text not null check (char_length(nome) > 0),
  cor       text not null default 'rosa'   -- uma das cores do tema
);
create index if not exists listas_user_id_idx on public.listas (user_id);
grant select, insert, update, delete on public.listas to authenticated;
alter table public.listas enable row level security;
drop policy if exists "cada usuária só acessa as próprias listas" on public.listas;
create policy "cada usuária só acessa as próprias listas" on public.listas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- as tarefas
create table if not exists public.tarefas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  titulo       text not null check (char_length(titulo) > 0),
  prazo        date,                                   -- opcional
  prioridade   text not null default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  concluida    boolean not null default false,
  concluida_em timestamptz
);
create index if not exists tarefas_user_id_idx on public.tarefas (user_id);
grant select, insert, update, delete on public.tarefas to authenticated;
alter table public.tarefas enable row level security;
drop policy if exists "cada usuária só acessa as próprias tarefas" on public.tarefas;
create policy "cada usuária só acessa as próprias tarefas" on public.tarefas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cada tarefa pode pertencer a uma lista.
-- "on delete set null": ao apagar a lista, as tarefas permanecem, sem lista.
alter table public.tarefas add column if not exists lista_id uuid references public.listas (id) on delete set null;
create index if not exists tarefas_lista_id_idx on public.tarefas (lista_id);


-- =====================================================================
--  2. METAS
-- =====================================================================

-- objetivos com etapas
create table if not exists public.metas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  titulo    text not null check (char_length(titulo) > 0),
  descricao text,
  prazo     date,
  etapas    jsonb not null default '[]',   -- lista de {"texto": "...", "feita": false}
  cor       text not null default 'rosa',
  concluida boolean not null default false
);
create index if not exists metas_user_id_idx on public.metas (user_id);
grant select, insert, update, delete on public.metas to authenticated;
alter table public.metas enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.metas;
create policy "cada usuária só acessa as próprias linhas" on public.metas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- tarefas podem ser ligadas a uma meta
alter table public.tarefas add column if not exists meta_id uuid references public.metas (id) on delete set null;


-- =====================================================================
--  3. HÁBITOS
-- =====================================================================

-- os hábitos
create table if not exists public.habitos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  nome         text not null check (char_length(nome) > 0),
  cor          text not null default 'rosa',
  frequencia   text not null default 'diaria' check (frequencia in ('diaria', 'semanal')),
  vezes_semana int not null default 1 check (vezes_semana between 1 and 7),
  meta_id      uuid references public.metas (id) on delete set null,
  arquivado    boolean not null default false
);
create index if not exists habitos_user_id_idx on public.habitos (user_id);
grant select, insert, update, delete on public.habitos to authenticated;
alter table public.habitos enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.habitos;
create policy "cada usuária só acessa as próprias linhas" on public.habitos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- um registro para cada dia marcado
create table if not exists public.habito_registros (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  habito_id uuid not null references public.habitos (id) on delete cascade,
  dia       date not null,
  unique (habito_id, dia)
);
create index if not exists habito_registros_user_id_idx on public.habito_registros (user_id);
grant select, insert, update, delete on public.habito_registros to authenticated;
alter table public.habito_registros enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.habito_registros;
create policy "cada usuária só acessa as próprias linhas" on public.habito_registros
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists habito_registros_dia_idx on public.habito_registros (dia);


-- =====================================================================
--  4. AGENDA
-- =====================================================================

-- compromissos (a agenda também mostra prazos do to-do e provas)
create table if not exists public.eventos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  titulo      text not null check (char_length(titulo) > 0),
  data        date not null,
  hora_inicio time,
  hora_fim    time,
  local       text,
  notas       text,
  cor         text not null default 'rosa'
);
create index if not exists eventos_user_id_idx on public.eventos (user_id);
grant select, insert, update, delete on public.eventos to authenticated;
alter table public.eventos enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.eventos;
create policy "cada usuária só acessa as próprias linhas" on public.eventos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- legenda das cores da agenda (ex.: azul = faculdade). Uma linha por cor.
create table if not exists public.agenda_cores (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  cor       text not null check (cor in ('rosa', 'laranja', 'amarelo', 'verde', 'azul', 'roxo')),
  nome      text not null check (char_length(nome) > 0),
  unique (user_id, cor)
);
create index if not exists agenda_cores_user_id_idx on public.agenda_cores (user_id);
grant select, insert, update, delete on public.agenda_cores to authenticated;
alter table public.agenda_cores enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.agenda_cores;
create policy "cada usuária só acessa as próprias linhas" on public.agenda_cores
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- =====================================================================
--  5. DIÁRIO
-- =====================================================================

-- uma entrada por dia
create table if not exists public.diario (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  dia      date not null,
  humor    int check (humor between 1 and 5),
  gratidao jsonb not null default '[]',   -- até 3 frases
  texto    text not null default '',
  unique (user_id, dia)
);
create index if not exists diario_user_id_idx on public.diario (user_id);
grant select, insert, update, delete on public.diario to authenticated;
alter table public.diario enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.diario;
create policy "cada usuária só acessa as próprias linhas" on public.diario
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- =====================================================================
--  6. FACULDADE
-- =====================================================================

-- matérias do período
create table if not exists public.materias (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  nome       text not null check (char_length(nome) > 0),
  professor  text,
  periodo    text,
  cor        text not null default 'rosa',
  horarios   jsonb not null default '[]',  -- lista de {"dia": 1, "inicio": "08:00", "fim": "10:00", "sala": "..."}
  max_faltas int not null default 0,
  faltas     int not null default 0,
  arquivada  boolean not null default false
);
create index if not exists materias_user_id_idx on public.materias (user_id);
grant select, insert, update, delete on public.materias to authenticated;
alter table public.materias enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.materias;
create policy "cada usuária só acessa as próprias linhas" on public.materias
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- provas, trabalhos e entregas
create table if not exists public.avaliacoes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  nome       text not null check (char_length(nome) > 0),
  tipo       text not null default 'prova' check (tipo in ('prova', 'trabalho', 'entrega', 'outro')),
  data       date,
  peso       numeric not null default 1,
  nota       numeric,
  nota_max   numeric not null default 10
);
create index if not exists avaliacoes_user_id_idx on public.avaliacoes (user_id);
grant select, insert, update, delete on public.avaliacoes to authenticated;
alter table public.avaliacoes enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.avaliacoes;
create policy "cada usuária só acessa as próprias linhas" on public.avaliacoes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- =====================================================================
--  7. ESTUDOS: TÓPICOS E CADERNINHO
-- =====================================================================

-- tópicos para estudar
create table if not exists public.topicos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  materia_id      uuid references public.materias (id) on delete set null,
  titulo          text not null check (char_length(titulo) > 0),
  status          text not null default 'nao_comecei'
                  check (status in ('nao_comecei', 'estudando', 'revisar', 'dominado')),
  progresso       int not null default 0 check (progresso between 0 and 100),
  proxima_revisao date,
  notas           text
);
create index if not exists topicos_user_id_idx on public.topicos (user_id);
grant select, insert, update, delete on public.topicos to authenticated;
alter table public.topicos enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.topicos;
create policy "cada usuária só acessa as próprias linhas" on public.topicos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- caderninho: notas em Markdown
create table if not exists public.notas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  materia_id    uuid references public.materias (id) on delete set null,
  topico_id     uuid references public.topicos (id) on delete set null,
  titulo        text not null default 'sem título',
  conteudo      text not null default '',
  atualizada_em timestamptz not null default now()
);
create index if not exists notas_user_id_idx on public.notas (user_id);
grant select, insert, update, delete on public.notas to authenticated;
alter table public.notas enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.notas;
create policy "cada usuária só acessa as próprias linhas" on public.notas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- =====================================================================
--  8. COLEÇÕES: IDEIAS, WISHLIST, RECEITAS, LIVROS & SÉRIES, LINKS
-- =====================================================================

-- banco de ideias
create table if not exists public.ideias (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  titulo    text not null check (char_length(titulo) > 0),
  descricao text,
  status    text not null default 'ideia' check (status in ('ideia', 'testando', 'feito', 'descartado')),
  tags      text[] not null default '{}'
);
create index if not exists ideias_user_id_idx on public.ideias (user_id);
grant select, insert, update, delete on public.ideias to authenticated;
alter table public.ideias enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.ideias;
create policy "cada usuária só acessa as próprias linhas" on public.ideias
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- wishlist
create table if not exists public.wishlist (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  nome       text not null check (char_length(nome) > 0),
  link       text,
  preco      numeric,
  prioridade text not null default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  status     text not null default 'quero' check (status in ('quero', 'comprado')),
  categoria  text
);
create index if not exists wishlist_user_id_idx on public.wishlist (user_id);
grant select, insert, update, delete on public.wishlist to authenticated;
alter table public.wishlist enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.wishlist;
create policy "cada usuária só acessa as próprias linhas" on public.wishlist
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- receitas
create table if not exists public.receitas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  titulo       text not null check (char_length(titulo) > 0),
  ingredientes text not null default '',
  preparo      text not null default '',
  tempo_min    int,
  porcoes      int,
  categoria    text,
  favorita     boolean not null default false
);
create index if not exists receitas_user_id_idx on public.receitas (user_id);
grant select, insert, update, delete on public.receitas to authenticated;
alter table public.receitas enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.receitas;
create policy "cada usuária só acessa as próprias linhas" on public.receitas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- livros, filmes e séries
create table if not exists public.midia (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  titulo     text not null check (char_length(titulo) > 0),
  tipo       text not null default 'livro' check (tipo in ('livro', 'filme', 'serie')),
  criador    text,                 -- autora, diretor…
  status     text not null default 'quero' check (status in ('quero', 'vendo', 'visto')),
  nota       int check (nota between 0 and 5),
  comentario text
);
create index if not exists midia_user_id_idx on public.midia (user_id);
grant select, insert, update, delete on public.midia to authenticated;
alter table public.midia enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.midia;
create policy "cada usuária só acessa as próprias linhas" on public.midia
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- links salvos
create table if not exists public.links (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  titulo    text not null check (char_length(titulo) > 0),
  url       text not null,
  descricao text,
  tags      text[] not null default '{}'
);
create index if not exists links_user_id_idx on public.links (user_id);
grant select, insert, update, delete on public.links to authenticated;
alter table public.links enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.links;
create policy "cada usuária só acessa as próprias linhas" on public.links
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- =====================================================================
--  9. ADESIVOS
-- =====================================================================

-- imagens enviadas como adesivo
create table if not exists public.adesivos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  caminho text not null,   -- caminho do arquivo no Storage
  nome    text
);
create index if not exists adesivos_user_id_idx on public.adesivos (user_id);
grant select, insert, update, delete on public.adesivos to authenticated;
alter table public.adesivos enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.adesivos;
create policy "cada usuária só acessa as próprias linhas" on public.adesivos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- onde cada adesivo foi colado
create table if not exists public.adesivos_colados (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  adesivo_id uuid not null references public.adesivos (id) on delete cascade,
  pagina     text not null,              -- ex.: '/tarefas'
  x          real not null default 0.5,  -- posição horizontal (0 a 1 da largura)
  y          real not null default 100,  -- posição vertical (px)
  escala     real not null default 1,
  rotacao    real not null default 0,
  z          int not null default 1
);
create index if not exists adesivos_colados_user_id_idx on public.adesivos_colados (user_id);
grant select, insert, update, delete on public.adesivos_colados to authenticated;
alter table public.adesivos_colados enable row level security;
drop policy if exists "cada usuária só acessa as próprias linhas" on public.adesivos_colados;
create policy "cada usuária só acessa as próprias linhas" on public.adesivos_colados
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage: bucket para os PNGs dos adesivos.
-- Bucket público: qualquer pessoa com o link vê a imagem (são apenas adesivos),
-- mas cada usuário só envia e apaga arquivos na própria pasta (<user-id>/...).
insert into storage.buckets (id, name, public) values ('adesivos', 'adesivos', true)
on conflict (id) do nothing;

drop policy if exists "adesivos: ver os próprios" on storage.objects;
create policy "adesivos: ver os próprios" on storage.objects
  for select to authenticated
  using (bucket_id = 'adesivos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "adesivos: enviar na própria pasta" on storage.objects;
create policy "adesivos: enviar na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'adesivos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "adesivos: apagar os próprios" on storage.objects;
create policy "adesivos: apagar os próprios" on storage.objects
  for delete to authenticated
  using (bucket_id = 'adesivos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
--  fim
-- =====================================================================
