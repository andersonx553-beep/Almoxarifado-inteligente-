import { useMemo, useState } from 'react';
import { getInventoryStatus, getReplenishmentQuantity, getStockSnapshot } from './domain/inventory/rules';
import type { Material } from './domain/inventory/types';
import './styles.css';

const demoMaterials: Material[] = [
  { id: 'MAT-001', name: 'Papel A4', area: 'Administrativo', subgroup: 'Papelaria', unit: 'pct', currentQuantity: 8, minimumQuantity: 10, idealQuantity: 30, counted: true },
  { id: 'MAT-002', name: 'Água sanitária 5 L', area: 'Limpeza', subgroup: 'Higiene', unit: 'un', currentQuantity: 18, minimumQuantity: 10, idealQuantity: 25, counted: true },
  { id: 'MAT-003', name: 'Saco para lixo 100 L', area: 'Limpeza', subgroup: 'Descartáveis', unit: 'pct', currentQuantity: 0, minimumQuantity: 8, idealQuantity: 20, counted: true },
  { id: 'MAT-004', name: 'Caneta esferográfica azul', area: 'Administrativo', subgroup: 'Papelaria', unit: 'cx', currentQuantity: null, minimumQuantity: 3, idealQuantity: 10, counted: false },
];

const labels = { critical: 'Crítico', reposition: 'Reposição', ok: 'OK', pending: 'Pendente' } as const;

type View = 'dashboard' | 'inventory' | 'count' | 'movements' | 'replenishment';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [materials] = useState(demoMaterials);
  const snapshot = useMemo(() => getStockSnapshot(materials), [materials]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">📦 ALMOX LAB<span>Controle inteligente de almoxarifado</span></div>
      <nav>{([
        ['dashboard', '⌂', 'Início'], ['inventory', '▣', 'Estoque'], ['count', '✓', 'Contagem'], ['movements', '↔', 'Movimentos'], ['replenishment', '↗', 'Reposição'],
      ] as const).map(([id, icon, label]) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => setView(id)}><span>{icon}</span>{label}</button>)}</nav>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">ALMOX LAB · BLOCO 2</div><h1>{view === 'dashboard' ? 'Visão operacional' : view === 'inventory' ? 'Materiais' : view === 'count' ? 'Contagem física' : view === 'movements' ? 'Movimentações' : 'Fila de reposição'}</h1><p>Domínio de estoque tipado, separado da apresentação.</p></div>
        <div className="top-actions"><button className="primary" onClick={() => setView('movements')}>＋ Movimentar</button></div>
      </header>

      {view === 'dashboard' && <>
        <div className="kpis">
          <Kpi label="Total de materiais" value={snapshot.totalMaterials} />
          <Kpi label="Críticos" value={snapshot.critical} tone="danger" />
          <Kpi label="Em reposição" value={snapshot.reposition} tone="warning" />
          <Kpi label="Pendentes" value={snapshot.pending} tone="muted" />
        </div>
        <div className="decision-grid"><section className="hero"><div className="eyebrow">Arquitetura</div><h2>Operar → Analisar → Decidir</h2><p>As regras de estoque agora vivem no domínio e podem ser testadas sem depender da tela.</p></section><section className="card"><span className="muted">Atenção imediata</span><strong className="attention">{snapshot.critical + snapshot.reposition}</strong><span className="muted">materiais exigem decisão</span></section></div>
      </>}

      {view === 'inventory' && <Inventory materials={materials} />}
      {view === 'count' && <section className="card"><h2>Contagem</h2><p className="muted">Próxima evolução: fluxo Área → Subgrupo → Material com fechamento transacional.</p></section>}
      {view === 'movements' && <section className="card"><h2>Movimentações</h2><p className="muted">Próxima evolução: comando de entrada/saída sobre o mesmo domínio tipado.</p></section>}
      {view === 'replenishment' && <section className="card"><h2>Reposição</h2><Inventory materials={materials.filter(m => getReplenishmentQuantity(m) > 0)} compact /></section>}
    </main>
  </div>;
}

function Kpi({ label, value, tone = '' }: { label: string; value: number; tone?: string }) {
  return <section className={`card kpi ${tone}`}><span>{label}</span><strong>{value}</strong></section>;
}

function Inventory({ materials, compact = false }: { materials: Material[]; compact?: boolean }) {
  return <section className="card"><div className="section-title"><div><h2>{compact ? 'Itens que precisam de reposição' : 'Catálogo operacional'}</h2><span className="muted">{materials.length} registro(s)</span></div></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Material</th><th>Área</th><th>Atual</th><th>Ideal</th><th>Comprar</th><th>Status</th></tr></thead><tbody>{materials.map(m => { const status = getInventoryStatus(m); return <tr key={m.id}><td>{m.id}</td><td><b>{m.name}</b><small>{m.subgroup} · {m.unit}</small></td><td>{m.area}</td><td>{m.currentQuantity ?? '—'}</td><td>{m.idealQuantity}</td><td>{getReplenishmentQuantity(m) || '—'}</td><td><span className={`badge ${status}`}>{labels[status]}</span></td></tr>; })}</tbody></table></div></section>;
}
