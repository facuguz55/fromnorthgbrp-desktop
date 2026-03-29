import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Instagram as InstagramIcon, RefreshCw, Heart, MessageCircle, Bookmark,
  Eye, Play, Film, Users, TrendingUp, Globe, MapPin,
  Image, Layers, LayoutGrid,
} from 'lucide-react';
import { getSettings } from '../services/dataService';
import {
  fetchInstagramData,
} from '../services/instagramService';
import type { InstagramData, IgMedia } from '../services/instagramService';
import MetricCard from '../components/MetricCard';
import '../components/Chart.css';
import './Instagram.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtNum = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : String(n);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

type MediaFilter = 'ALL' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
type MediaSort   = 'recent' | 'likes' | 'reach' | 'saved' | 'impressions';

// ── Gender/Age data processor ──────────────────────────────────────────────────

const AGE_BUCKETS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

function processGenderAge(raw: Record<string, number>) {
  return AGE_BUCKETS.map(age => ({
    age,
    Mujeres: raw[`F.${age}`] ?? 0,
    Hombres: raw[`M.${age}`] ?? 0,
  })).filter(d => d.Mujeres + d.Hombres > 0);
}

function topEntries(obj: Record<string, number>, n = 8) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// ── Tooltips ───────────────────────────────────────────────────────────────────

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="chart-tooltip-value" style={{ color: p.color }}>
          {p.name}: {fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="chart-tooltip-value" style={{ color: p.color }}>
          {p.name}: {fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Post card ──────────────────────────────────────────────────────────────────

function PostCard({ media }: { media: IgMedia }) {
  const thumb = media.media_type === 'VIDEO'
    ? media.thumbnail_url
    : media.media_url;

  const typeIcon =
    media.media_type === 'VIDEO'           ? <Film size={12} />
    : media.media_type === 'CAROUSEL_ALBUM' ? <Layers size={12} />
    : <Image size={12} />;

  const typeLabel =
    media.media_type === 'VIDEO'           ? 'Video'
    : media.media_type === 'CAROUSEL_ALBUM' ? 'Carrusel'
    : 'Foto';

  return (
    <div className="ig-post-card">
      <div className="ig-post-thumb">
        {thumb
          ? <img src={thumb} alt={media.caption?.substring(0, 40) ?? 'post'} loading="lazy" />
          : <div className="ig-post-thumb-placeholder"><Image size={24} /></div>
        }
        <div className="ig-post-overlay">
          <div className="ig-post-metrics">
            <span><Heart size={13} /> {fmtNum(media.like_count)}</span>
            <span><MessageCircle size={13} /> {fmtNum(media.comments_count)}</span>
            {media.reach > 0 && <span><Eye size={13} /> {fmtNum(media.reach)}</span>}
            {media.saved > 0 && <span><Bookmark size={13} /> {fmtNum(media.saved)}</span>}
            {media.video_views > 0 && <span><Play size={13} /> {fmtNum(media.video_views)}</span>}
          </div>
        </div>
      </div>
      <div className="ig-post-footer">
        <span className="ig-post-type">{typeIcon} {typeLabel}</span>
        <span className="ig-post-date">{fmtDate(media.timestamp)}</span>
      </div>
      {media.caption && (
        <p className="ig-post-caption">{media.caption.substring(0, 80)}{media.caption.length > 80 ? '…' : ''}</p>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Instagram() {
  const [data,    setData]    = useState<InstagramData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('ALL');
  const [mediaSort,   setMediaSort]   = useState<MediaSort>('recent');

  const loadData = async () => {
    const settings = getSettings();
    const token = settings.metaAccessToken.trim();
    if (!token) { setError('No hay token de acceso configurado.'); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInstagramData(token);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredMedia = useMemo(() => {
    if (!data) return [];
    let list = mediaFilter === 'ALL'
      ? data.media
      : data.media.filter(m => m.media_type === mediaFilter);

    switch (mediaSort) {
      case 'likes':       list = [...list].sort((a, b) => b.like_count   - a.like_count);   break;
      case 'reach':       list = [...list].sort((a, b) => b.reach        - a.reach);        break;
      case 'saved':       list = [...list].sort((a, b) => b.saved        - a.saved);        break;
      case 'impressions': list = [...list].sort((a, b) => b.impressions  - a.impressions);  break;
      default: break; // 'recent' = API order
    }
    return list;
  }, [data, mediaFilter, mediaSort]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const sum = (arr: { value: number }[]) => arr.reduce((s, v) => s + v.value, 0);
    return {
      totalImpressions: sum(data.insights.impressions),
      totalReach:       sum(data.insights.reach),
      totalProfileViews: sum(data.insights.profileViews),
      netFollowers:     sum(data.insights.followerGrowth),
    };
  }, [data]);

  const genderAgeData = useMemo(() => {
    if (!data) return [];
    return processGenderAge(data.audience.genderAge);
  }, [data]);

  const totalMale   = useMemo(() => {
    if (!data) return 0;
    return Object.entries(data.audience.genderAge)
      .filter(([k]) => k.startsWith('M.'))
      .reduce((s, [, v]) => s + v, 0);
  }, [data]);

  const totalFemale = useMemo(() => {
    if (!data) return 0;
    return Object.entries(data.audience.genderAge)
      .filter(([k]) => k.startsWith('F.'))
      .reduce((s, [, v]) => s + v, 0);
  }, [data]);

  const topCities    = useMemo(() => data ? topEntries(data.audience.cities, 8)    : [], [data]);
  const topCountries = useMemo(() => data ? topEntries(data.audience.countries, 8) : [], [data]);

  const maxCity    = topCities[0]?.[1]    ?? 1;
  const maxCountry = topCountries[0]?.[1] ?? 1;

  // ── Follower chart data — show cumulative from current - net
  const followerChartData = useMemo(() => {
    if (!data) return [];
    const growth = data.insights.followerGrowth;
    if (!growth.length) return [];
    const total = data.profile.followers_count;
    const netSum = growth.reduce((s, v) => s + v.value, 0);
    let running = total - netSum;
    return growth.map(v => {
      running += v.value;
      return { date: v.date.substring(5), value: running, delta: v.value };
    });
  }, [data]);

  const reachChartData = useMemo(() => {
    if (!data) return [];
    const reach = data.insights.reach;
    const impr  = data.insights.impressions;
    const dates = [...new Set([...reach.map(v => v.date), ...impr.map(v => v.date)])].sort();
    return dates.map(date => ({
      date: date.substring(5),
      Alcance:      reach.find(v => v.date === date)?.value ?? 0,
      Impresiones:  impr.find(v => v.date === date)?.value ?? 0,
    }));
  }, [data]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (error && !data) {
    return (
      <div className="ig-page">
        <div className="ig-header">
          <div>
            <h1 className="ig-title"><InstagramIcon size={22} className="ig-title-icon" /> Instagram Analytics</h1>
          </div>
        </div>
        <div className="ig-error glass-panel">
          <p>{error}</p>
          <button className="btn-outline" onClick={loadData}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ig-page">
      {/* ── Header ── */}
      <div className="ig-header">
        <div>
          <h1 className="ig-title">
            <InstagramIcon size={22} className="ig-title-icon" />
            Instagram Analytics
          </h1>
          {data?.profile && (
            <p className="ig-subtitle">@{data.profile.username} · últimos 30 días</p>
          )}
        </div>
        <button className="meta-refresh-btn" onClick={loadData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {loading && !data && (
        <div className="ig-loading glass-panel">
          <RefreshCw size={20} className="spinning" />
          <span>Cargando datos de Instagram…</span>
        </div>
      )}

      {data && (
        <>
          {/* ── Profile card ── */}
          <div className="ig-profile-card glass-panel">
            <div className="ig-profile-avatar-wrap">
              {data.profile.profile_picture_url
                ? <img className="ig-profile-avatar" src={data.profile.profile_picture_url} alt={data.profile.username} />
                : <div className="ig-profile-avatar-placeholder"><InstagramIcon size={28} /></div>
              }
            </div>
            <div className="ig-profile-info">
              <div className="ig-profile-name-row">
                <span className="ig-profile-name">{data.profile.name}</span>
                <a
                  href={`https://instagram.com/${data.profile.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ig-profile-handle"
                >
                  @{data.profile.username}
                </a>
              </div>
              {data.profile.biography && (
                <p className="ig-profile-bio">{data.profile.biography}</p>
              )}
              {data.profile.website && (
                <a
                  href={data.profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="ig-profile-website"
                >
                  <Globe size={13} /> {data.profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            <div className="ig-profile-stats">
              <div className="ig-profile-stat">
                <span className="ig-stat-value">{fmtNum(data.profile.followers_count)}</span>
                <span className="ig-stat-label">Seguidores</span>
              </div>
              <div className="ig-profile-stat">
                <span className="ig-stat-value">{fmtNum(data.profile.follows_count)}</span>
                <span className="ig-stat-label">Siguiendo</span>
              </div>
              <div className="ig-profile-stat">
                <span className="ig-stat-value">{fmtNum(data.profile.media_count)}</span>
                <span className="ig-stat-label">Posts</span>
              </div>
            </div>
          </div>

          {/* ── KPI cards ── */}
          {kpis && (
            <div className="ig-kpi-grid">
              <MetricCard
                title="Seguidores"
                value={fmtNum(data.profile.followers_count)}
                icon={<Users size={18} />}
                subtitle={kpis.netFollowers >= 0
                  ? `+${fmtNum(kpis.netFollowers)} este mes`
                  : `${fmtNum(kpis.netFollowers)} este mes`}
              />
              <MetricCard
                title="Alcance (30d)"
                value={fmtNum(kpis.totalReach)}
                icon={<Eye size={18} />}
                subtitle="personas únicas alcanzadas"
              />
              <MetricCard
                title="Impresiones (30d)"
                value={fmtNum(kpis.totalImpressions)}
                icon={<TrendingUp size={18} />}
                subtitle="vistas totales de contenido"
              />
              <MetricCard
                title="Visitas al perfil (30d)"
                value={fmtNum(kpis.totalProfileViews)}
                icon={<InstagramIcon size={18} />}
                subtitle="visitas a tu perfil"
              />
            </div>
          )}

          {/* ── Charts row ── */}
          <div className="ig-charts-row">
            {followerChartData.length > 0 && (
              <div className="ig-chart-card glass-panel">
                <h2 className="ig-section-title">
                  <Users size={16} /> Crecimiento de seguidores
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={followerChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                      tickFormatter={fmtNum} width={50} />
                    <Tooltip content={<LineTooltip />} />
                    <Line
                      type="monotone" dataKey="value" name="Seguidores"
                      stroke="var(--accent-primary)" strokeWidth={2} dot={false}
                      activeDot={{ r: 4, fill: 'var(--accent-primary)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {reachChartData.length > 0 && (
              <div className="ig-chart-card glass-panel">
                <h2 className="ig-section-title">
                  <Eye size={16} /> Alcance e impresiones diarias
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={reachChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                      tickFormatter={fmtNum} width={50} />
                    <Tooltip content={<LineTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} />
                    <Line type="monotone" dataKey="Alcance"     stroke="#06b6d4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Impresiones" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Posts grid ── */}
          <div className="ig-posts-section glass-panel">
            <div className="ig-posts-header">
              <h2 className="ig-section-title">
                <LayoutGrid size={16} /> Posts recientes
              </h2>
              <div className="ig-posts-controls">
                {/* Filter tabs */}
                <div className="ig-filter-tabs">
                  {([
                    ['ALL',             'Todos',     null],
                    ['IMAGE',           'Fotos',     <Image size={12} />],
                    ['VIDEO',           'Videos',    <Film size={12} />],
                    ['CAROUSEL_ALBUM',  'Carruseles', <Layers size={12} />],
                  ] as const).map(([val, label, icon]) => (
                    <button
                      key={val}
                      className={`ig-filter-tab ${mediaFilter === val ? 'active' : ''}`}
                      onClick={() => setMediaFilter(val)}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
                {/* Sort */}
                <select
                  className="ig-sort-select"
                  value={mediaSort}
                  onChange={e => setMediaSort(e.target.value as MediaSort)}
                >
                  <option value="recent">Recientes</option>
                  <option value="likes">Más likes</option>
                  <option value="reach">Más alcance</option>
                  <option value="saved">Más guardados</option>
                  <option value="impressions">Más impresiones</option>
                </select>
              </div>
            </div>

            {filteredMedia.length === 0 ? (
              <p className="ig-empty">No hay posts con este filtro.</p>
            ) : (
              <div className="ig-posts-grid">
                {filteredMedia.map(m => <PostCard key={m.id} media={m} />)}
              </div>
            )}
          </div>

          {/* ── Reels summary ── */}
          {data.media.filter(m => m.media_type === 'VIDEO').length > 0 && (
            <div className="ig-reels-section glass-panel">
              <h2 className="ig-section-title">
                <Film size={16} /> Análisis de Reels / Videos
              </h2>
              <div className="ig-reels-table-wrap">
                <table className="ig-reels-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th><Play size={12} /> Reproducciones</th>
                      <th><Eye size={12} /> Alcance</th>
                      <th><Heart size={12} /> Likes</th>
                      <th><MessageCircle size={12} /> Comentarios</th>
                      <th><Bookmark size={12} /> Guardados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.media
                      .filter(m => m.media_type === 'VIDEO')
                      .sort((a, b) => b.video_views - a.video_views)
                      .map(m => (
                        <tr key={m.id}>
                          <td className="ig-col-date">{fmtDate(m.timestamp)}</td>
                          <td className="ig-col-caption">
                            <a href={m.permalink} target="_blank" rel="noreferrer" className="ig-reel-link">
                              {m.caption
                                ? m.caption.substring(0, 60) + (m.caption.length > 60 ? '…' : '')
                                : '(sin descripción)'}
                            </a>
                          </td>
                          <td className="ig-col-num">{fmtNum(m.video_views)}</td>
                          <td className="ig-col-num">{fmtNum(m.reach)}</td>
                          <td className="ig-col-num">{fmtNum(m.like_count)}</td>
                          <td className="ig-col-num">{fmtNum(m.comments_count)}</td>
                          <td className="ig-col-num">{fmtNum(m.saved)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Audience ── */}
          {(genderAgeData.length > 0 || topCities.length > 0 || topCountries.length > 0) && (
            <div className="ig-audience-section">
              <h2 className="ig-section-title-standalone">
                <Users size={16} /> Audiencia
              </h2>
              <div className="ig-audience-grid">

                {/* Gender / Age chart */}
                {genderAgeData.length > 0 && (
                  <div className="ig-audience-card glass-panel">
                    <h3 className="ig-audience-card-title">Edad y género</h3>
                    {(totalMale + totalFemale) > 0 && (
                      <div className="ig-gender-pills">
                        <span className="ig-gender-pill male">
                          <span className="ig-gender-dot male" />
                          Hombres {Math.round(totalMale / (totalMale + totalFemale) * 100)}%
                        </span>
                        <span className="ig-gender-pill female">
                          <span className="ig-gender-dot female" />
                          Mujeres {Math.round(totalFemale / (totalMale + totalFemale) * 100)}%
                        </span>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={genderAgeData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} tickFormatter={fmtNum} />
                        <YAxis type="category" dataKey="age" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={38} />
                        <Tooltip content={<BarTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} />
                        <Bar dataKey="Mujeres" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Hombres" stackId="a" fill="#6366f1" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top cities */}
                {topCities.length > 0 && (
                  <div className="ig-audience-card glass-panel">
                    <h3 className="ig-audience-card-title"><MapPin size={13} /> Principales ciudades</h3>
                    <ul className="ig-rank-list">
                      {topCities.map(([city, count]) => (
                        <li key={city} className="ig-rank-item">
                          <span className="ig-rank-label">{city}</span>
                          <div className="ig-rank-bar-wrap">
                            <div
                              className="ig-rank-bar"
                              style={{ width: `${Math.round((count / maxCity) * 100)}%` }}
                            />
                          </div>
                          <span className="ig-rank-value">{fmtNum(count)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top countries */}
                {topCountries.length > 0 && (
                  <div className="ig-audience-card glass-panel">
                    <h3 className="ig-audience-card-title"><Globe size={13} /> Principales países</h3>
                    <ul className="ig-rank-list">
                      {topCountries.map(([country, count]) => (
                        <li key={country} className="ig-rank-item">
                          <span className="ig-rank-label">{country}</span>
                          <div className="ig-rank-bar-wrap">
                            <div
                              className="ig-rank-bar"
                              style={{ width: `${Math.round((count / maxCountry) * 100)}%` }}
                            />
                          </div>
                          <span className="ig-rank-value">{fmtNum(count)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
