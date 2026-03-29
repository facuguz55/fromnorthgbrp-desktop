const GRAPH_API = 'https://graph.facebook.com/v19.0';

let _cachedIgId: string | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function igGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH_API}${path}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(`Instagram API: ${json.error.message} (code ${json.error.code})`);
  return json as T;
}

// ── Account discovery ──────────────────────────────────────────────────────────

export async function discoverIgAccountId(token: string): Promise<string> {
  if (_cachedIgId) return _cachedIgId;
  const cached = localStorage.getItem('ig_account_id');
  if (cached) { _cachedIgId = cached; return cached; }

  const result = await igGet<{
    data: { id: string; instagram_business_account?: { id: string } }[]
  }>('/me/accounts', token, { fields: 'id,instagram_business_account{id}' });

  for (const page of result.data ?? []) {
    if (page.instagram_business_account?.id) {
      _cachedIgId = page.instagram_business_account.id;
      localStorage.setItem('ig_account_id', _cachedIgId);
      return _cachedIgId;
    }
  }
  throw new Error('No se encontró una cuenta de Instagram Business conectada a tus Páginas de Facebook');
}

// ── Profile ────────────────────────────────────────────────────────────────────

export interface IgProfile {
  id: string;
  name: string;
  username: string;
  profile_picture_url: string;
  biography: string;
  website: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

export async function fetchIgProfile(token: string, igId: string): Promise<IgProfile> {
  return igGet<IgProfile>(`/${igId}`, token, {
    fields: 'id,name,username,profile_picture_url,biography,website,followers_count,follows_count,media_count',
  });
}

// ── Media ──────────────────────────────────────────────────────────────────────

export interface IgMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  permalink: string;
  impressions: number;
  reach: number;
  saved: number;
  video_views: number;
}

async function fetchMediaInsights(
  token: string,
  mediaId: string,
  mediaType: string,
): Promise<Pick<IgMedia, 'impressions' | 'reach' | 'saved' | 'video_views'>> {
  try {
    const metrics = mediaType === 'VIDEO'
      ? 'impressions,reach,saved,video_views'
      : 'impressions,reach,saved';
    const result = await igGet<{
      data: { name: string; values: { value: number }[]; id: string }[]
    }>(`/${mediaId}/insights`, token, { metric: metrics });
    const get = (name: string) =>
      result.data.find(d => d.name === name)?.values[0]?.value ?? 0;
    return {
      impressions: get('impressions'),
      reach:       get('reach'),
      saved:       get('saved'),
      video_views: get('video_views'),
    };
  } catch {
    return { impressions: 0, reach: 0, saved: 0, video_views: 0 };
  }
}

export async function fetchIgMedia(token: string, igId: string): Promise<IgMedia[]> {
  const result = await igGet<{
    data: {
      id: string;
      caption?: string;
      media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
      media_url?: string;
      thumbnail_url?: string;
      timestamp: string;
      like_count: number;
      comments_count: number;
      permalink: string;
    }[]
  }>(`/${igId}/media`, token, {
    fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink',
    limit: '24',
  });

  const mediaList = result.data ?? [];
  const insightsList = await Promise.all(
    mediaList.map(m => fetchMediaInsights(token, m.id, m.media_type)),
  );

  return mediaList.map((m, i) => ({ ...m, ...insightsList[i] }));
}

// ── Account insights ───────────────────────────────────────────────────────────

export interface IgDayValue {
  date: string;
  value: number;
}

export interface IgAccountInsights {
  impressions:    IgDayValue[];
  reach:          IgDayValue[];
  profileViews:   IgDayValue[];
  followerGrowth: IgDayValue[];
}

function parseInsightSeries(
  data: { name: string; values: { value: number; end_time: string }[] }[],
  name: string,
): IgDayValue[] {
  const series = data.find(d => d.name === name);
  if (!series) return [];
  return series.values.map(v => ({
    date:  v.end_time.substring(0, 10),
    value: v.value,
  }));
}

export async function fetchIgAccountInsights(
  token: string,
  igId: string,
  days = 30,
): Promise<IgAccountInsights> {
  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 24 * 60 * 60;

  const result = await igGet<{
    data: { name: string; values: { value: number; end_time: string }[] }[]
  }>(`/${igId}/insights`, token, {
    metric: 'impressions,reach,profile_views,follower_count',
    period: 'day',
    since:  String(since),
    until:  String(until),
  });

  return {
    impressions:    parseInsightSeries(result.data, 'impressions'),
    reach:          parseInsightSeries(result.data, 'reach'),
    profileViews:   parseInsightSeries(result.data, 'profile_views'),
    followerGrowth: parseInsightSeries(result.data, 'follower_count'),
  };
}

// ── Audience demographics ──────────────────────────────────────────────────────

export interface IgAudience {
  genderAge:  Record<string, number>;
  cities:     Record<string, number>;
  countries:  Record<string, number>;
}

export async function fetchIgAudience(token: string, igId: string): Promise<IgAudience> {
  try {
    const result = await igGet<{
      data: { name: string; values: { value: Record<string, number> }[] }[]
    }>(`/${igId}/insights`, token, {
      metric: 'audience_gender_age,audience_city,audience_country',
      period: 'lifetime',
    });

    const get = (name: string): Record<string, number> => {
      const s = result.data.find(d => d.name === name);
      return (s?.values[0]?.value as Record<string, number>) ?? {};
    };

    return {
      genderAge: get('audience_gender_age'),
      cities:    get('audience_city'),
      countries: get('audience_country'),
    };
  } catch {
    return { genderAge: {}, cities: {}, countries: {} };
  }
}

// ── Full data bundle ───────────────────────────────────────────────────────────

export interface InstagramData {
  profile:  IgProfile;
  media:    IgMedia[];
  insights: IgAccountInsights;
  audience: IgAudience;
}

export async function fetchInstagramData(token: string): Promise<InstagramData> {
  const igId = await discoverIgAccountId(token);
  const [profile, media, insights, audience] = await Promise.all([
    fetchIgProfile(token, igId),
    fetchIgMedia(token, igId),
    fetchIgAccountInsights(token, igId, 30),
    fetchIgAudience(token, igId),
  ]);
  return { profile, media, insights, audience };
}
