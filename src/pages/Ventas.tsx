import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Store, RefreshCw, DollarSign, TrendingUp, CalendarDays,
  ShoppingCart, Package, AlertCircle, Settings2, Trophy,
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import MonthSelector from '../components/MonthSelector';
import { getSettings } from '../services/dataService';
import {
  fetchTNMetrics,
  getPersistedMetrics,
  paymentStatusLabel,
  paymentStatusClass,
  humanizePaymentMethod,
} from '../services/tiendanubeService';
import type { TNMetrics, TNOrder } from '../services/tiendanubeService';
import { useMonth } from '../context/MonthContext';
import '../components/Chart.css';
import './TiendanubeVentas.css';

// ── Formatters ─────────────────────────────────────────────────────────────────

const fmtARS = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const fmtNum = (n: number) =>
  n.toLocaleString('es-AR', { maximumFractionDigits: 0 });

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const AR_OFFSET = -3 * 60 * 60 * 1000;

const PALETTE = [
  '#06b6d4', '#6366f1', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

// ── Tooltip custom ─────────────────────────────────────────────────────────────

const DiaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value" style={{ color: '#06b6d4' }}>{fmtARS(payload[0].value)}</p>
    </div>
  );
};

const MetodoTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{d.name}</p>
      <p className="chart-tooltip-value" style={{ color: d.color }}>{d.value} órdenes</p>
      <p className="chart-tooltip-sub">{d.porcentaje}% del total</p>
    </div>
  );
};

// ── Orden row ──────────────────────────────────────────────────────────────────

function OrdenRow({ o, i }: { o: TNOrder; i: number }) {
  const fecha = new Date(o.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
    <tr>
      <td className="tn-td-num">{i + 1}</td>
      <td className="tn-td-orden">#{o.number}</td>
      <td className="tn-td-cliente">
        <span className="tn-client-name">{o.customer?.name ?? '—'}</span>
        {o.customer?.email && (
          <span className="tn-client-email">{o.customer.email}</span>
        )}
      </td>
      <td className="tn-td-productos">
        {o.products.map(p => p.name).join(', ') || '—'}
      </td>
      <td className="tn-td-total">{fmtARS(parseFloat(o.total))}</td>
      <td>
        <span className={`tn-badge ${paymentStatusClass(o.payment_status)}`}>
          {paymentStatusLabel(o.payment_status)}
        </span>
      </td>
      <td className="tn-td-fecha">{fecha}</td>
    </tr>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Ventas() {
  const settings = getSettings();
  const storeId  = settings?.tiendanubeStoreId?.trim() ?? '';
  const token    = settings?.tiendanubeToken?.trim()    ?? '';
  const isConfigured = storeId && token;

  const persisted = getPersistedMetrics();
  const [metrics, setMetrics]           = useState<TNMetrics | null>(persisted);
  const [loading, setLoading]           = useState(!persisted && !!isConfigured);
  const [syncing, setSyncing]           = useState(false);
  const [loadedCount, setLoadedCount]   = useState(0);
  const [error, setError]               = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(persisted ? new Date() : null);

  const { selectedMonth } = useMonth();
  const selectedMonthKey = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
  const monthLabel = `${MESES[selectedMonth.month - 1]} ${selectedMonth.year}`;

  const nowAR = new Date(Date.now() + AR_OFFSET);
  const currentMonthKey = `${nowAR.getUTCFullYear()}-${String(nowAR.getUTCMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedMonthKey === currentMonthKey;

  const fetchData = async () => {
    if (!isConfigured) return;
    const hasCached = !!getPersistedMetrics();
    if (hasCached) setSyncing(true); else setLoading(true);
    setError(null);
    setLoadedCount(0);

    try {
      const data = await fetchTNMetrics(storeId, token, (n) => setLoadedCount(n));
      setMetrics(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      const msg = String(err.message ?? err);
      if (msg.includes('TOKEN_INVALID'))  setError(`Token inválido. Verificá el Access Token en Configuración. (${msg})`);
      else if (msg.includes('STORE_INVALID')) setError(`Store ID inválido. Verificá el número en Configuración. (${msg})`);
      else setError(`Error conectando con TiendaNube: ${msg}`);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Available months for selector ─────────────────────────────────────────
  const availableMonths = useMemo(() => {
    if (!metrics) return [];
    const monthSet = new Set<string>();
    for (const o of metrics.orders) {
      const d = new Date(new Date(o.created_at).getTime() + AR_OFFSET);
      monthSet.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    return [...monthSet].sort().reverse();
  }, [metrics]);

  // ── All orders in selected month (all payment statuses) ───────────────────
  const monthOrdersAll = useMemo(() => {
    if (!metrics) return [];
    return [...metrics.orders]
      .filter(o => {
        const d = new Date(new Date(o.created_at).getTime() + AR_OFFSET);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return key === selectedMonthKey;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [metrics, selectedMonthKey]);

  // ── Paid orders in selected month ─────────────────────────────────────────
  const monthOrdersPaid = useMemo(() =>
    monthOrdersAll.filter(o => o.payment_status === 'paid' || o.payment_status === 'authorized'),
  [monthOrdersAll]);

  const monthTotal  = useMemo(() => monthOrdersPaid.reduce((s, o) => s + parseFloat(o.total), 0), [monthOrdersPaid]);
  const monthTicket = monthOrdersPaid.length > 0 ? monthTotal / monthOrdersPaid.length : 0;
  const monthCanceladas = monthOrdersAll.filter(o => o.status === 'cancelled').length;
  const monthPendientes = monthOrdersAll.filter(o =>
    o.payment_status !== 'paid' && o.payment_status !== 'authorized' && o.status !== 'cancelled'
  ).length;

  // ── Daily chart for selected month ────────────────────────────────────────
  const diasMes = useMemo(() => {
    if (!metrics) return [];
    const [selYear, selMonth] = selectedMonthKey.split('-').map(Number);
    return metrics.ventasPorDia.filter(d => {
      const parts = d.name.split('/');
      if (parts.length !== 3) return false;
      return parseInt(parts[1]) === selMonth && parseInt(parts[2]) === selYear;
    });
  }, [metrics, selectedMonthKey]);

  // ── Methods from monthOrdersPaid ──────────────────────────────────────────
  const metodosConColor = useMemo(() => {
    const metodoMap: Record<string, number> = {};
    for (const o of monthOrdersPaid) {
      const method = humanizePaymentMethod(
        o.payment_details?.method ?? 'other',
        o.payment_details?.credit_card_company,
      );
      metodoMap[method] = (metodoMap[method] ?? 0) + 1;
    }
    const total = Object.values(metodoMap).reduce((s, v) => s + v, 0);
    return Object.entries(metodoMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name, value,
        porcentaje: total > 0 ? Math.round((value / total) * 100) : 0,
        color: PALETTE[i % PALETTE.length],
      }));
  }, [monthOrdersPaid]);

  // ── Top products from monthOrdersPaid ────────────────────────────────────
  const monthTopProductos = useMemo(() => {
    const map: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    for (const o of monthOrdersPaid) {
      for (const p of o.products) {
        if (!map[p.name]) map[p.name] = { nombre: p.name, cantidad: 0, total: 0 };
        map[p.name].cantidad += p.quantity;
        map[p.name].total += parseFloat(p.price) * p.quantity;
      }
    }
    return Object.values(map).sort((a, b) => b.cantidad - a.cantidad).slice(0, 6);
  }, [monthOrdersPaid]);

  // ── Sin configurar ────────────────────────────────────────────────────────

  if (!isConfigured) {
    return (
      <div className="tn-page fade-in">
        <header className="tn-header">
          <h1><Store size={22} className="tn-title-icon" /> TiendaNube — Ventas</h1>
        </header>
        <div className="tn-setup-banner glass-panel">
          <Settings2 size={32} className="tn-setup-icon" />
          <h2>Configuración requerida</h2>
          <p>
            Ingresá tu <strong>Store ID</strong> y <strong>Access Token</strong> de TiendaNube
            en <a href="/settings" className="tn-link">Configuración → TiendaNube API</a> para
            ver las métricas oficiales de tu tienda.
          </p>
          <div className="tn-setup-steps">
            <div className="tn-step">
              <span className="tn-step-n">1</span>
              <span>Andá a tu panel de TiendaNube → <strong>Mis aplicaciones</strong></span>
            </div>
            <div className="tn-step">
              <span className="tn-step-n">2</span>
              <span>Creá o usá una app existente y copiá el <strong>Access Token</strong></span>
            </div>
            <div className="tn-step">
              <span className="tn-step-n">3</span>
              <span>El <strong>Store ID</strong> está en la URL de tu panel: <code>/stores/XXXXXX/</code></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading && !metrics) {
    return (
      <div className="tn-page fade-in">
        <header className="tn-header">
          <h1><Store size={22} className="tn-title-icon" /> TiendaNube — Ventas</h1>
        </header>
        <div className="tn-loading glass-panel">
          <RefreshCw size={28} className="spinning" />
          <div>
            <p className="tn-loading-title">Conectando con TiendaNube...</p>
            {loadedCount > 0 && (
              <p className="tn-loading-sub">{fmtNum(loadedCount)} órdenes cargadas</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tn-page fade-in">

      {/* ── Header ── */}
      <header className="tn-header">
        <div>
          <h1><Store size={22} className="tn-title-icon" /> TiendaNube — Ventas</h1>
          <span className="text-muted tn-meta">
            {monthLabel} · Store {storeId}
            {lastRefreshed && ` · Actualizado: ${lastRefreshed.toLocaleTimeString('es-AR')}`}
          </span>
        </div>
        <button className="btn-secondary refresh-btn" onClick={fetchData} disabled={loading || syncing}>
          <RefreshCw size={15} className={(loading || syncing) ? 'spinning' : ''} />
          {loading ? `Cargando ${fmtNum(loadedCount)}...` : syncing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </header>

      <MonthSelector availableMonths={availableMonths} />

      {/* ── Error ── */}
      {error && (
        <div className="tn-error glass-panel">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── KPI Grid ── */}
      {metrics && (
        <div className="tn-kpi-grid">
          <MetricCard
            title={`Total — ${monthLabel}`}
            value={fmtARS(monthTotal)}
            icon={<DollarSign size={20} />}
            subtitle={`${fmtNum(monthOrdersPaid.length)} órdenes pagadas`}
          />
          {isCurrentMonth ? (
            <>
              <MetricCard
                title="Ventas hoy"
                value={fmtARS(metrics.ventasHoy)}
                icon={<TrendingUp size={20} />}
                subtitle="desde medianoche (AR)"
              />
              <MetricCard
                title="Ventas esta semana"
                value={fmtARS(metrics.ventasSemana)}
                icon={<CalendarDays size={20} />}
                subtitle="lunes a hoy"
              />
            </>
          ) : (
            <>
              <MetricCard
                title="Órdenes del mes"
                value={fmtNum(monthOrdersAll.length)}
                icon={<TrendingUp size={20} />}
                subtitle="todos los estados"
              />
              <MetricCard
                title="Pendientes"
                value={fmtNum(monthPendientes)}
                icon={<CalendarDays size={20} />}
                subtitle="sin confirmar pago"
              />
            </>
          )}
          <MetricCard
            title="Ticket promedio"
            value={fmtARS(monthTicket)}
            icon={<ShoppingCart size={20} />}
            subtitle="por orden pagada"
          />
          <MetricCard
            title="Total órdenes"
            value={fmtNum(monthOrdersAll.length)}
            icon={<Package size={20} />}
            subtitle={`${fmtNum(monthPendientes)} pendientes · ${fmtNum(monthCanceladas)} canceladas`}
          />
        </div>
      )}

      {/* ── Charts ── */}
      {metrics && (
        <div className="tn-charts-row">

          {/* Ventas por día */}
          <section className="analytics-section">
            <div className="section-title-row">
              <TrendingUp size={18} className="section-icon" />
              <h2>Ventas por día</h2>
            </div>
            <p className="section-desc">Ingresos diarios de órdenes pagadas en {monthLabel}.</p>
            <div className="chart-container glass-panel" style={{ height: 300 }}>
              <div className="chart-header">
                <div className="chart-header-row">
                  <span className="chart-title">Facturación diaria</span>
                  <span className="chart-badge">ARS</span>
                </div>
              </div>
              {diasMes.length > 0 ? (
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diasMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="transparent"
                        tick={{ fill: '#475569', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="transparent"
                        tick={{ fill: '#475569', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={60}
                        tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<DiaTooltip />} cursor={{ fill: 'rgba(6,182,212,0.06)' }} />
                      <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="chart-empty">Sin datos en este período</div>
              )}
            </div>
          </section>

          {/* Métodos de pago */}
          <section className="analytics-section">
            <div className="section-title-row">
              <ShoppingCart size={18} className="section-icon" />
              <h2>Métodos de pago</h2>
            </div>
            <p className="section-desc">Distribución de medios de pago en {monthLabel}.</p>
            <div className="chart-container glass-panel" style={{ height: 300 }}>
              <div className="chart-header">
                <div className="chart-header-row">
                  <span className="chart-title">Medios de pago</span>
                  <span className="chart-badge">Órdenes</span>
                </div>
              </div>
              {metodosConColor.length > 0 ? (
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metodosConColor}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        paddingAngle={3}
                      >
                        {metodosConColor.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<MetodoTooltip />} />
                      <Legend
                        formatter={(v) => (
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{v}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="chart-empty">Sin datos disponibles</div>
              )}
            </div>
          </section>

        </div>
      )}

      {/* ── Top productos del mes ── */}
      {metrics && monthTopProductos.length > 0 && (
        <section className="analytics-section">
          <div className="section-title-row">
            <Trophy size={18} className="section-icon" />
            <h2>Top productos vendidos</h2>
          </div>
          <p className="section-desc">Por cantidad de unidades en órdenes pagadas de {monthLabel}.</p>
          <div className="tn-productos-grid glass-panel">
            {monthTopProductos.map((p, i) => (
              <div key={p.nombre} className="tn-producto-row">
                <span className="tn-producto-rank">#{i + 1}</span>
                <span className="tn-producto-nombre">{p.nombre}</span>
                <span className="tn-producto-cant">{fmtNum(p.cantidad)} u.</span>
                <span className="tn-producto-total">{fmtARS(p.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Órdenes del mes ── */}
      {metrics && monthOrdersAll.length > 0 && (
        <section className="analytics-section">
          <div className="section-title-row">
            <Package size={18} className="section-icon" />
            <h2>Órdenes — {monthLabel}</h2>
          </div>
          <p className="section-desc">
            {fmtNum(monthOrdersAll.length)} órdenes en {monthLabel}.
          </p>
          <div className="tn-table-wrapper glass-panel">
            <table className="tn-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Orden</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {monthOrdersAll.map((o, i) => (
                  <OrdenRow key={o.id} o={o} i={i} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Empty ── */}
      {metrics && monthOrdersAll.length === 0 && !error && (
        <div className="tn-empty glass-panel">
          No se encontraron órdenes en {monthLabel}.
        </div>
      )}

    </div>
  );
}
