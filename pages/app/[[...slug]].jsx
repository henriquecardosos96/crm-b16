// pages/app/[[...slug]].jsx
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// ─── ICONS ───────────────────────────────────────────────────────────────────
const IconGrid = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6" rx="1"/>
    <rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6" cy="5" r="2.5"/>
    <path d="M1 13c0-3 2-4.5 5-4.5s5 1.5 5 4.5"/>
    <path d="M11 7c1.5 0 3 1 3 3.5" strokeLinecap="round"/>
    <circle cx="11" cy="4.5" r="2"/>
  </svg>
);

const IconPipeline = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 4h3v8H2zM6.5 6h3v6h-3zM11 2h3v10h-3z"/>
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="4.5"/>
    <path d="M10.5 10.5L14 14" strokeLinecap="round"/>
  </svg>
);

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v12M2 8h12" strokeLinecap="round"/>
  </svg>
);

const IconChevLeft = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconChevRight = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c2 0 3.7.9 4.8 2.3" strokeLinecap="round"/>
    <path d="M10 2l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconChart = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 12L5 7l3 3 3-4 3 2"/>
  </svg>
);

const IconLogoMark = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3h4v10H3zM9 7h4v6H9z" strokeLinejoin="round"/>
  </svg>
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const avatarColor = (name) => `av-${(name?.charCodeAt(0) || 0) % 8}`;

const initials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

const formatBRL = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
};

const stageBadgeClass = (stage) => ({
  'Lead': 'badge-stage-lead',
  'Qualificação': 'badge-stage-qualificacao',
  'Proposta': 'badge-stage-proposta',
  'Negociação': 'badge-stage-negociacao',
  'Ganho': 'badge-stage-ganho',
  'Perdido': 'badge-stage-perdido',
}[stage] || 'badge-stage-lead');

const stageCardClass = (stage) => ({
  'Lead': 'stage-lead',
  'Qualificação': 'stage-qualificacao',
  'Proposta': 'stage-proposta',
  'Negociação': 'stage-negociacao',
  'Ganho': 'stage-ganho',
  'Perdido': 'stage-perdido',
}[stage] || 'stage-lead');

const STAGE_DOTS = {
  'Lead': '#9CA3AF', 'Qualificação': '#3B82F6', 'Proposta': '#8B5CF6',
  'Negociação': '#F59E0B', 'Ganho': '#22C55E', 'Perdido': '#EF4444',
};

const STAGE_ORDER = ['Lead', 'Qualificação', 'Proposta', 'Negociação', 'Ganho', 'Perdido'];

// ─── DONUT RING ───────────────────────────────────────────────────────────────
function DonutRing({ pct, color }) {
  const r = 18, cx = 24, cy = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="kpi-ring">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E8E5DF" strokeWidth="4"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
      </svg>
      <div className="kpi-ring-label">{pct}%</div>
    </div>
  );
}

// ─── FETCH HOOK ───────────────────────────────────────────────────────────────
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [url]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Loading = () => (
  <div className="state-loading"><div className="spinner"/><span>Carregando...</span></div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="state-error">
    <span>Erro: {message}</span>
    {onRetry && <button className="btn-ghost" onClick={onRetry} style={{marginTop:8}}>Tentar novamente</button>}
  </div>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardPage() {
  const { data, loading, error, reload } = useFetch('/api/dashboard');
  if (loading) return <Loading/>;
  if (error)   return <ErrorState message={error} onRetry={reload}/>;
  if (!data)   return null;

  const { kpis, origins, recent_deals, recent_contacts } = data;
  const maxOrigin = Math.max(...(origins?.map(o => o.count) || [1]), 1);

  const ringColor = (pct) => pct >= 80 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';

  const kpiCards = [
    {
      label: 'Total Contatos',
      icon: <IconUsers/>,
      value: kpis.total_contacts?.toLocaleString('pt-BR') || '0',
      delta: `+${kpis.leads || 0} leads`,
      deltaType: 'up',
      pct: null,
    },
    {
      label: 'Pipeline Ativo',
      icon: <IconChart/>,
      value: formatBRL(kpis.pipeline_total),
      delta: `${kpis.active_deals} negócios`,
      deltaType: 'neutral',
      pct: kpis.active_deals ? Math.min(100, Math.round((kpis.active_deals / Math.max(kpis.total_contacts, 1)) * 100 * 5)) : 0,
    },
    {
      label: 'Clientes',
      icon: <IconUsers/>,
      value: kpis.clientes?.toLocaleString('pt-BR') || '0',
      delta: null,
      deltaType: 'neutral',
      pct: kpis.total_contacts ? Math.round((kpis.clientes / kpis.total_contacts) * 100) : 0,
    },
    {
      label: 'Conversão',
      icon: <IconPipeline/>,
      value: `${kpis.conversion_rate || 0}%`,
      delta: formatBRL(kpis.total_ganho) + ' ganho',
      deltaType: kpis.conversion_rate > 20 ? 'up' : 'neutral',
      pct: Math.min(100, kpis.conversion_rate || 0),
    },
  ];

  return (
    <>
      {/* KPI Grid */}
      <div className="kpi-grid">
        {kpiCards.map((k, i) => (
          <div className="kpi-card" key={i} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="kpi-card-top">
              <div className="kpi-label">{k.icon}{k.label}</div>
              {k.pct !== null && <DonutRing pct={k.pct} color={ringColor(k.pct)}/>}
            </div>
            <div className="kpi-value">{k.value}</div>
            {k.delta && (
              <div className={`kpi-delta ${k.deltaType}`}>
                {k.deltaType === 'up' && '↑ '}
                {k.deltaType === 'down' && '↓ '}
                <span>{k.delta}</span>
                <span className="kpi-delta-label">vs total</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom widgets */}
      <div className="dash-grid">

        {/* Canais de Origem */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Canais de Origem</div>
              <div className="dash-card-sub">Distribuição por fonte</div>
            </div>
          </div>
          {origins?.length ? (
            <div className="origin-list">
              {origins.map(o => (
                <div className="origin-row" key={o.name}>
                  <div className="origin-row-top">
                    <span className="origin-name">{o.name || 'Outros'}</span>
                    <span className="origin-count">{o.count}</span>
                  </div>
                  <div className="origin-bar-bg">
                    <div className="origin-bar-fill" style={{ width: `${(o.count / maxOrigin) * 100}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="state-empty" style={{height:100}}>Sem dados de origem</div>
          )}
        </div>

        {/* Negócios Recentes */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Negócios Recentes</div>
              <div className="dash-card-sub">Últimos registros</div>
            </div>
          </div>
          {recent_deals?.length ? (
            <div className="deals-list">
              {recent_deals.map((d, i) => (
                <div className="deal-row" key={d.fato_id || i}>
                  <div>
                    <div className="deal-name">{d.contact_name}</div>
                    <div className="deal-contact">
                      <span className={`badge ${stageBadgeClass(d.stage)}`}>{d.stage}</span>
                    </div>
                  </div>
                  <div className="deal-right">
                    <div className="deal-value">{formatBRL(d.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="state-empty" style={{height:100}}>Sem negócios ainda</div>
          )}
        </div>

        {/* Contatos Recentes — full width */}
        <div className="dash-card" style={{ gridColumn: '1 / -1', animationDelay: '200ms' }}>
          <div className="dash-card-header" style={{marginBottom:0}}>
            <div>
              <div className="dash-card-title">Contatos Recentes</div>
              <div className="dash-card-sub">Últimas entradas na base</div>
            </div>
          </div>
          {recent_contacts?.length ? (
            <table style={{marginTop:12}}>
              <thead>
                <tr>
                  <th>Nome</th><th>Email</th><th>Origem</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_contacts.map((c, i) => (
                  <tr key={c.contact_id || i}>
                    <td className="td-name">
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className={`avatar ${avatarColor(c.name)}`}>{initials(c.name)}</div>
                        {c.name}
                      </div>
                    </td>
                    <td>{c.email || '—'}</td>
                    <td>{c.origin || '—'}</td>
                    <td>
                      <span className={`badge ${c.status === 'Cliente' ? 'badge-cliente' : 'badge-lead'}`}>
                        {c.status || 'Lead'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="state-empty" style={{height:80}}>Sem contatos ainda</div>
          )}
        </div>

      </div>
    </>
  );
}

// ─── CONTATOS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

function ContatosPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const url = `/api/contacts?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(debouncedSearch)}`;
  const { data, loading, error, reload } = useFetch(url);

  const contacts = data?.data || [];
  const meta     = data?.meta || {};

  return (
    <div className="table-wrap">
      <div className="search-bar">
        <IconSearch/>
        <input
          placeholder="Buscar por nome, email, telefone ou cidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="btn-ghost" style={{padding:'3px 8px',fontSize:10}} onClick={() => setSearch('')}>
            limpar
          </button>
        )}
        <button className="btn-ghost" onClick={reload} title="Atualizar"><IconRefresh/></button>
      </div>

      {loading ? <Loading/> : error ? <ErrorState message={error} onRetry={reload}/> : (
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>Email</th><th>Telefone</th>
              <th>Cidade</th><th>Origem</th><th>Stage</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--text-tertiary)'}}>
                  {debouncedSearch ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
                </td>
              </tr>
            ) : contacts.map((c, i) => (
              <tr key={c.contact_id || i}>
                <td className="td-name">
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div className={`avatar ${avatarColor(c.name)}`}>{initials(c.name)}</div>
                    <div>
                      <div>{c.name || '—'}</div>
                      {c.tags && <div style={{fontSize:10,color:'var(--text-tertiary)',marginTop:1}}>{c.tags}</div>}
                    </div>
                  </div>
                </td>
                <td>{c.email || '—'}</td>
                <td style={{fontFamily:'var(--font-mono)'}}>{c.phone || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>{c.origin || '—'}</td>
                <td>{c.stage ? <span className={`badge ${stageBadgeClass(c.stage)}`}>{c.stage}</span> : '—'}</td>
                <td>
                  <span className={`badge ${c.status === 'Cliente' ? 'badge-cliente' : 'badge-lead'}`}>
                    {c.status || 'Lead'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !error && meta.totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            {meta.total?.toLocaleString('pt-BR')} contatos · página {meta.page} de {meta.totalPages}
          </div>
          <div className="pagination-controls">
            <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(p => p-1)}>
              <IconChevLeft/>
            </button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page-2, meta.totalPages-4)) + i;
              if (p < 1 || p > meta.totalPages) return null;
              return (
                <button key={p} className={`pg-btn${p===page?' active':''}`} onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="pg-btn" disabled={page >= meta.totalPages} onClick={() => setPage(p => p+1)}>
              <IconChevRight/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function PipelinePage() {
  const { data, loading, error, reload } = useFetch('/api/deals');
  if (loading) return <Loading/>;
  if (error)   return <ErrorState message={error} onRetry={reload}/>;
  if (!data)   return null;

  const { data: grouped, meta } = data;

  return (
    <>
      <div className="kpi-grid" style={{marginBottom:20}}>
        {[
          { label: 'Pipeline Ativo', value: formatBRL(meta.pipeline_total), delta: `${meta.active_deals} negócios ativos` },
          { label: 'Total Ganho',    value: formatBRL(meta.total_ganho),    delta: null },
          { label: 'Total Perdido',  value: formatBRL(meta.total_perdido),  delta: null },
          { label: 'Total Negócios', value: meta.total_deals,               delta: null },
        ].map((k, i) => (
          <div className="kpi-card" key={i} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="kpi-card-top">
              <div className="kpi-label">{k.label}</div>
            </div>
            <div className="kpi-value">{k.value}</div>
            {k.delta && <div className="kpi-delta neutral"><span>{k.delta}</span></div>}
          </div>
        ))}
      </div>

      <div className="kanban-wrap">
        {STAGE_ORDER.map(stage => {
          const col = grouped[stage] || { cards: [], total: 0 };
          return (
            <div className="kanban-col" key={stage}>
              <div className="kanban-col-header">
                <div className="kanban-col-title">
                  <div className="kanban-dot" style={{ background: STAGE_DOTS[stage] }}/>
                  {stage}
                  {col.cards.length > 0 && <span className="kanban-count">{col.cards.length}</span>}
                </div>
                {col.total > 0 && <div className="kanban-col-sum">{formatBRL(col.total)}</div>}
              </div>
              <div className="kanban-body">
                {col.cards.length === 0 ? (
                  <div className="kanban-empty">Vazio</div>
                ) : col.cards.map((card, i) => (
                  <div
                    className={`kanban-card ${stageCardClass(card.stage)}`}
                    key={card.fato_id || i}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="kanban-card-name">{card.contact_name}</div>
                    <div className="kanban-card-contact">{card.payment_type || 'Sem produto'}</div>
                    <div className="kanban-card-footer">
                      <div className="kanban-card-value">{formatBRL(card.value)}</div>
                      {card.purchase_status && (
                        <span className={`badge ${card.purchase_status === 'paid' ? 'badge-ganho' : 'badge-lead'}`}
                          style={{fontSize:9}}>
                          {card.purchase_status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── NAV CONFIG ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',  Icon: IconGrid },
  { id: 'contatos',  label: 'Contatos',   Icon: IconUsers },
  { id: 'pipeline',  label: 'Pipeline',   Icon: IconPipeline },
];

const PAGE_META = {
  dashboard: { title: 'Dashboard',  breadcrumb: 'Visão Geral', btn: null },
  contatos:  { title: 'Contatos',   breadcrumb: 'CRM',         btn: 'Novo Contato' },
  pipeline:  { title: 'Pipeline',   breadcrumb: 'Vendas',      btn: 'Novo Negócio' },
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function CRMApp() {
  const router = useRouter();
  const slug   = router.query.slug;
  const page   = (Array.isArray(slug) ? slug[0] : slug) || 'dashboard';

  const navigate = useCallback((id) => {
    router.push(`/app/${id}`, undefined, { shallow: true });
  }, [router]);

  const meta = PAGE_META[page] || PAGE_META.dashboard;

  return (
    <>
      <Head>
        <title>Labora CRM</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>

      <div className="crm-layout">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon"><IconLogoMark/></div>
            <div className="logo-wrap">
              <div className="logo-agencia">Agência B16</div>
              <div className="logo-name">Labora <span>CRM</span></div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Menu Principal</div>
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <div
                key={id}
                className={`nav-item${page === id ? ' active' : ''}`}
                onClick={() => navigate(id)}
              >
                <Icon/>
                {label}
                {page === id && <span className="nav-item-dot"/>}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-client-badge">
              <div className="sidebar-client-avatar">CL</div>
              <div className="sidebar-client-info">
                <div className="client-label">Cliente ativo</div>
                <div className="client-name">Clínica Labora</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Area ── */}
        <div className="main-area">
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-breadcrumb">
                Início › <span>{meta.breadcrumb}</span>
              </div>
              <div className="topbar-title">{meta.title}</div>
            </div>
            <div className="topbar-right">
              {meta.btn && (
                <button className="btn-primary">
                  <IconPlus/>{meta.btn}
                </button>
              )}
            </div>
          </div>

          <div className="page-content">
            {page === 'dashboard' && <DashboardPage/>}
            {page === 'contatos'  && <ContatosPage/>}
            {page === 'pipeline'  && <PipelinePage/>}
          </div>
        </div>

      </div>
    </>
  );
}