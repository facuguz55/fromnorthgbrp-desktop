import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, AlertTriangle, AlertCircle, TrendingUp,
  MousePointerClick, Eye, DollarSign, Users, Megaphone, CheckCircle2,
} from 'lucide-react';
import { getSettings } from '../services/dataService';
import {
  fetchMetaCampaigns,
  fetchMetaInsights,
  generateMetaAlerts,
  computeMetaSummary,
} from '../services/metaAdsService';
import type { MetaCampaign, MetaInsight, DatePreset } from '../services/metaAdsService';
import MetricCard from '../components/MetricCard';
import './Meta.css';

const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'today',      label: 'Hoy' },
  { value: 'yesterday',  label: 'Ayer' },
  { value: 'last_7d',    label: 'Últimos 7 días' },
  { value: 'last_14d',   label: 'Últimos 14 días' },
  { value: 'last_30d',   label: 'Últimos 30 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes anterior' },
];

const fmtARS  = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum  = (n: number) => n.toLocaleString('es-AR');
const fmtPct  = (n: number) => `${n.toFixed(2)}%`;

function AlertBadge({ severity }: { severity: 'warning' | 'critical' }) {
  return (
    <span className={`meta-alert-badge ${severity}`}>
      {severity === 'critical' ? <AlertCircle size={11} /> : <AlertTriangle size={11} />}
      {severity === 'critical' ? 'Crítico' : 'Advertencia'}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls = status === 'ACTIVE' ? 'status-active' : status === 'PAUSED' ? 'status-paused' : 'status-archived';
  const label = status === 'ACTIVE' ? 'Activa' : status === 'PAUSED' ? 'Pausada' : 'Archivada';
  return <span className={`meta-status-dot ${cls}`}>{label}</span>;
}

export default function Meta() {
  const [campaigns,   setCampaigns]   = useState<MetaCampaign[]>([]);
  const [insights,    setInsights]    = useState<MetaInsight[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [datePreset,  setDatePreset]  = useState<DatePreset>('last_7d');

  const loadData = async (preset: DatePreset = datePreset, force = false) => {
    if (!force && !loading) setLoading(true);
    setError(null);
    try {
      const settings = getSettings();
      const token     = settings?.metaAccessToken?.trim()  ?? '';
      const accountId = settings?.metaAdAccountId?.trim()  ?? '';
      if (!token || !accountId) {
        setError('Configurá tu Access Token y Ad Account ID en Configuración → Meta Ads.');
        setLoading(false);
        return;
      }
      const [camps, ins] = await Promise.all([
        fetchMetaCampaigns(token, accountId),
        fetchMetaInsights(token, accountId, preset, 'campaign'),
      ]);
      setCampaigns(camps);
      setInsights(ins);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message ?? 'Error al conectar con Meta Ads API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDateChange = (preset: DatePreset) => {
    setDatePreset(preset);
    loadData(preset, true);
  };

  const summary = useMemo(() => computeMetaSummary(insights), [insights]);
  const alerts  = useMemo(() => generateMetaAlerts(insights, 'campaign'), [insights]);

  // Merge campaigns con sus insights
  const campaignsWithInsights = useMemo(() => {
    const insightMap = new Map(insights.map(i => [i.campaign_id, i]));
    return campaigns.map(c => ({
      ...c,
      insight: insightMap.get(c.id) ?? null,
    }));
  }, [campaigns, insights]);

  const criticals = alerts.filter(a => a.severity === 'critical').length;
  const warnings  = alerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="meta-page fade-in">

      {/* ── Header ── */}
      <header className="meta-header">
        <div>
          <h1 className="meta-title">
            <Megaphone size={22} className="meta-title-icon" />
            Meta Ads
          </h1>
          {lastUpdated && (
            <span className="text-muted meta-meta">
              Actualizado: {lastUpdated.toLocaleTimeString('es-AR')}
            </span>
          )}
        </div>
        <div className="meta-header-actions">
          {/* Date selector */}
          <div className="meta-date-btns">
            {DATE_OPTIONS.map(o => (
              <button
                key={o.value}
                className={`meta-date-btn ${datePreset === o.value ? 'active' : ''}`}
                onClick={() => handleDateChange(o.value)}
                disabled={loading}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            className="btn-secondary refresh-btn"
            onClick={() => loadData(datePreset, true)}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      {/* ── Error / sin config ── */}
      {error && (
        <div className="meta-error glass-panel">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="meta-loading glass-panel">
          <RefreshCw size={24} className="spinning" />
          <span>Conectando con Meta Ads...</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── KPI Strip ── */}
          <div className="meta-kpi-grid">
            <MetricCard
              title="Gasto total"
              value={fmtARS(summary.totalSpend)}
              icon={<DollarSign size={20} />}
              subtitle={DATE_OPTIONS.find(o => o.value === datePreset)?.label ?? ''}
            />
            <MetricCard
              title="Impresiones"
              value={fmtNum(summary.totalImpressions)}
              icon={<Eye size={20} />}
              subtitle="veces que se mostró el ad"
            />
            <MetricCard
              title="Clics"
              value={fmtNum(summary.totalClicks)}
              icon={<MousePointerClick size={20} />}
              subtitle="clics totales en el período"
            />
            <MetricCard
              title="CTR promedio"
              value={fmtPct(summary.avgCtr)}
              icon={<TrendingUp size={20} />}
              subtitle={summary.avgCtr >= 1 ? 'Buen rendimiento' : summary.avgCtr >= 0.5 ? 'Mejorable' : 'Bajo — revisá creativos'}
            />
            <MetricCard
              title="Alcance"
              value={fmtNum(summary.totalReach)}
              icon={<Users size={20} />}
              subtitle="personas únicas alcanzadas"
            />
          </div>

          {/* ── Alertas ── */}
          <section className="meta-section">
            <div className="meta-section-header">
              <div className="meta-section-title">
                <AlertTriangle size={18} className="meta-section-icon" />
                <h2>Alertas de rendimiento</h2>
                {alerts.length > 0 && (
                  <div className="meta-alert-counts">
                    {criticals > 0 && <span className="meta-count-badge critical">{criticals} crítico{criticals !== 1 ? 's' : ''}</span>}
                    {warnings  > 0 && <span className="meta-count-badge warning">{warnings} advertencia{warnings !== 1 ? 's' : ''}</span>}
                  </div>
                )}
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="meta-no-alerts glass-panel">
                <CheckCircle2 size={28} className="meta-ok-icon" />
                <div>
                  <p className="meta-no-alerts-title">Todo en orden</p>
                  <p className="meta-no-alerts-sub">Ninguna campaña superó los umbrales de alerta en este período.</p>
                </div>
              </div>
            ) : (
              <div className="meta-alerts-list">
                {alerts.map((alert, i) => (
                  <div key={i} className={`meta-alert-row glass-panel ${alert.severity}`}>
                    <div className="meta-alert-left">
                      {alert.severity === 'critical'
                        ? <AlertCircle size={18} className="meta-alert-icon critical" />
                        : <AlertTriangle size={18} className="meta-alert-icon warning" />
                      }
                      <div>
                        <p className="meta-alert-name">{alert.name}</p>
                        <p className="meta-alert-msg">{alert.message}</p>
                      </div>
                    </div>
                    <AlertBadge severity={alert.severity} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Campañas ── */}
          <section className="meta-section">
            <div className="meta-section-header">
              <div className="meta-section-title">
                <Megaphone size={18} className="meta-section-icon" />
                <h2>Campañas</h2>
                <span className="meta-section-count">{campaigns.length}</span>
              </div>
            </div>

            {campaigns.length === 0 ? (
              <div className="meta-empty glass-panel">
                <Megaphone size={32} style={{ opacity: 0.3 }} />
                <p>No se encontraron campañas en esta cuenta.</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Verificá que el Ad Account ID sea correcto en Configuración.
                </p>
              </div>
            ) : (
              <div className="tn-table-wrapper glass-panel">
                <table className="tn-table">
                  <thead>
                    <tr>
                      <th>Campaña</th>
                      <th>Estado</th>
                      <th>Gasto</th>
                      <th>Impresiones</th>
                      <th>Clics</th>
                      <th>CTR</th>
                      <th>Alcance</th>
                      <th>Frecuencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignsWithInsights.map(c => {
                      const ins = c.insight;
                      const ctr = ins?.ctr ?? 0;
                      const ctrClass = ctr >= 1 ? 'meta-ctr-ok' : ctr >= 0.5 ? 'meta-ctr-warn' : ins ? 'meta-ctr-bad' : '';
                      return (
                        <tr key={c.id}>
                          <td className="meta-td-name">{c.name}</td>
                          <td><StatusDot status={c.status} /></td>
                          <td className="tn-td-total">{ins ? fmtARS(ins.spend) : '—'}</td>
                          <td className="tn-td-num">{ins ? fmtNum(ins.impressions) : '—'}</td>
                          <td className="tn-td-num">{ins ? fmtNum(ins.clicks) : '—'}</td>
                          <td className={`meta-td-ctr ${ctrClass}`}>{ins ? fmtPct(ins.ctr) : '—'}</td>
                          <td className="tn-td-num">{ins ? fmtNum(ins.reach) : '—'}</td>
                          <td className={`meta-td-freq ${ins && ins.frequency > 4 ? 'meta-freq-high' : ''}`}>
                            {ins ? ins.frequency.toFixed(1) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
