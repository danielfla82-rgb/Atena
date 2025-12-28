
import React from 'react';
import { Book, Code, Database, Cpu, Layers, Shield, Server, FileJson, GitCommit, GraduationCap, Sword, Eye, Terminal, CheckCircle2 } from 'lucide-react';

export const Documentation: React.FC = () => {
  const sqlScript = `
-- ATENÇÃO: EXECUTE ESTE SCRIPT PARA HABILITAR O MODO UNIVERSAL
-- Ele remove bloqueios antigos e libera acesso total.

-- 1. Habilitar UUIDs (Caso não tenha)
create extension if not exists "uuid-ossp";

-- 2. Limpeza de Políticas Antigas (CRÍTICO)
-- Se você já rodou scripts anteriores, as políticas antigas podem bloquear o acesso.
-- Estes comandos removem qualquer restrição pré-existente.

drop policy if exists "Public Access Notebooks" on notebooks;
drop policy if exists "Enable read access for all users" on notebooks;
drop policy if exists "Enable insert for authenticated users only" on notebooks;
drop policy if exists "Enable update for users based on email" on notebooks;
drop policy if exists "Enable delete for users based on user_id" on notebooks;

drop policy if exists "Public Access Cycles" on cycles;
drop policy if exists "Public Access Protocol" on protocol_items;
drop policy if exists "Public Access Frameworks" on frameworks;
drop policy if exists "Public Access Reports" on reports;
drop policy if exists "Public Access Notes" on notes;

-- 3. Criação de Tabelas (Se não existirem)

create table if not exists notebooks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  discipline text not null,
  name text not null,
  subtitle text,
  tec_link text,
  error_notebook_link text, -- Novo campo
  obsidian_link text,
  accuracy numeric default 0,
  target_accuracy numeric default 90,
  weight text default 'Médio',
  relevance text default 'Média',
  trend text default 'Estável',
  status text default 'Não Iniciado',
  notes text,
  image text, 
  images jsonb default '[]',
  last_practice timestamptz,
  next_review timestamptz,
  week_id text, -- Novo campo (Planejamento Semanal)
  weekly_status text default 'pending', -- Novo campo
  created_at timestamptz default now()
);

create table if not exists cycles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  name text not null,
  config jsonb default '{}',
  planning jsonb default '{}',
  weekly_completion jsonb default '{}',
  last_access timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists protocol_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  name text not null,
  dosage text,
  time text,
  type text,
  checked boolean default false,
  created_at timestamptz default now()
);

create table if not exists frameworks (
  user_id uuid primary key, 
  values text,
  dream text,
  motivation text,
  action text,
  habit text,
  updated_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  date timestamptz default now(),
  type text,
  summary text,
  data jsonb,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  content text default '',
  color text default 'yellow',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Habilitar RLS e Criar Políticas Universais (Liberar Geral)

alter table notebooks enable row level security;
create policy "Public Access Notebooks" on notebooks for all using (true) with check (true);

alter table cycles enable row level security;
create policy "Public Access Cycles" on cycles for all using (true) with check (true);

alter table protocol_items enable row level security;
create policy "Public Access Protocol" on protocol_items for all using (true) with check (true);

alter table frameworks enable row level security;
create policy "Public Access Frameworks" on frameworks for all using (true) with check (true);

alter table reports enable row level security;
create policy "Public Access Reports" on reports for all using (true) with check (true);

alter table notes enable row level security;
create policy "Public Access Notes" on notes for all using (true) with check (true);
  `;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Book className="text-emerald-500" /> Documentação Técnica
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Projeto Atena (GurujaApp)</p>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Última Atualização</p>
            <p className="text-slate-300 font-mono">Titan Edition v3.7.0 (Universal Fix)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="hidden lg:block space-y-4 sticky top-6 h-fit">
           <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Índice</p>
               <nav className="space-y-3">
                   <a href="#instalacao" className="flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors group">
                       <Terminal size={14} /> 1. Instalação (SQL)
                   </a>
                   <a href="#visao-geral" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors group">
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-500"></span> 2. Visão Geral
                   </a>
               </nav>
           </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-16">
           
           {/* Section: Installation (Priority) */}
           <section id="instalacao" className="space-y-6 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                 <Terminal size={24} className="text-emerald-500" />
                 <h2 className="text-2xl font-bold text-white">1. Correção do Banco de Dados (Universal)</h2>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="bg-amber-900/20 border border-amber-500/20 p-4 rounded-lg text-amber-200 text-sm mb-4 flex items-start gap-3">
                      <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                      <div>
                          <strong>Instrução Importante:</strong> Para que todos os usuários vejam os mesmos dados, você precisa rodar este script no <strong>SQL Editor</strong> do Supabase. Ele remove as travas de segurança antigas e libera o acesso total.
                      </div>
                  </div>
                  
                  <div className="bg-black/50 border border-slate-700 rounded-lg p-4 overflow-x-auto relative group">
                      <pre className="text-xs font-mono text-emerald-400 whitespace-pre">
                          {sqlScript}
                      </pre>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(sqlScript); alert("SQL Copiado!");}}
                        className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                          Copiar SQL
                      </button>
                  </div>
              </div>
           </section>

           {/* Section: Overview */}
           <section id="visao-geral" className="space-y-6 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                 <Shield size={24} className="text-emerald-500" />
                 <h2 className="text-2xl font-bold text-white">2. Visão Geral</h2>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-slate-300 leading-relaxed">
                 <p className="mb-4">
                    O <strong>Projeto Atena</strong> agora opera em modo <strong>Universal (Colaborativo)</strong>. 
                    Isso significa que o banco de dados é único e compartilhado entre todos os logins.
                 </p>
                 <p>
                    Ideal para ambientes de estudo em grupo, mentorias ou demonstração, onde o instrutor cria o planejamento e todos os alunos têm acesso imediato em tempo real.
                 </p>
              </div>
           </section>

        </div>
      </div>
    </div>
  );
};

const TechItem = ({ label, desc }: { label: string, desc: string }) => (
    <li className="flex items-start gap-2 text-sm">
        <span className="font-bold text-slate-200 min-w-[100px]">{label}:</span>
        <span className="text-slate-400">{desc}</span>
    </li>
);

const DataEntity = ({ title, desc, fields }: { title: string, desc: string, fields: {name: string, type: string}[] }) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
            <Layers className="text-slate-500" size={20} />
            <h3 className="font-bold text-white text-lg">{title}</h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">{desc}</p>
        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/50">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-1">
                <FileJson size={14} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-500 uppercase">Schema Parcial</span>
            </div>
            <ul className="space-y-1 font-mono text-xs">
                {fields.map((f, i) => (
                    <li key={i} className="flex gap-2">
                        <span className="text-blue-400">{f.name}:</span>
                        <span className="text-slate-500">{f.type}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const ChangelogItem = ({ type, desc }: { type: 'fix' | 'feat' | 'core' | 'ui' | 'docs', desc: string }) => {
    const colors = {
        fix: 'text-red-400 bg-red-900/20 border-red-500/30',
        feat: 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30',
        core: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
        ui: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
        docs: 'text-amber-400 bg-amber-900/20 border-amber-500/30'
    };
    
    return (
        <li className="flex items-start gap-3 text-sm">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 mt-0.5 ${colors[type]}`}>
                {type}
            </span>
            <span className="text-slate-300">{desc}</span>
        </li>
    );
};
