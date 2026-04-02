export const config = { maxDuration: 60 };

const TN_TOKEN = '24cddf241e9dd8128a078572aeb7cc3da5a45f06';
const TN_STORE = '3349973';
const TN_BASE  = `https://api.tiendanube.com/v1/${TN_STORE}`;
const TN_HDR   = {
  Authentication: `bearer ${TN_TOKEN}`,
  'User-Agent': 'NovaDashboard (contact@fromnorthgb.com)',
};

const SB_URL = 'https://tnmmbfcbviowhunnrzix.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRubW1iZmNidmlvd2h1bm5yeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTc4MzcsImV4cCI6MjA4OTc5MzgzN30.ZZD8evIrlfY_77-DEh47L-JJxFOxhH8L9xZ_NjHN6QU';

const DAYS_BACK = 90;
const INCREMENTAL_MINUTES = 20; // Fetchea solo las últimas 20 min de órdenes

const simplify = (o: any) => ({
  id: o.id, number: o.number, status: o.status,
  payment_status: o.payment_status, total: o.total,
  subtotal: o.subtotal, total_shipping: o.total_shipping,
  discount: o.discount, created_at: o.created_at,
  customer: o.customer
    ? { id: o.customer.id, name: o.customer.name, email: o.customer.email }
    : null,
  products: (o.products ?? []).map((p: any) => ({
    name: p.name, quantity: p.quantity, price: p.price, sku: p.sku ?? null,
  })),
  payment_details: o.payment_details
    ? { method: o.payment_details.method, credit_card_company: o.payment_details.credit_card_company ?? null }
    : null,
  coupon: o.coupon ?? null,
});

export default async function handler(req: Request): Promise<Response> {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const full = url.searchParams.get('full') === '1';

  if (full) {
    // Sync completo: fetchea 90 días en paralelo (uso manual, puede tardar)
    const since = new Date(Date.now() - DAYS_BACK * 86_400_000).toISOString();
    const qs1 = new URLSearchParams({ per_page: '200', page: '1', created_at_min: since });
    const res1 = await fetch(`${TN_BASE}/orders?${qs1}`, { headers: TN_HDR });
    if (!res1.ok) return new Response(JSON.stringify({ error: 'TiendaNube error' }), { status: 500, headers: CORS });

    const data1 = await res1.json() as any[];
    const hasMore = (res1.headers.get('Link') ?? '').includes('rel="next"');
    let allOrders = data1.map(simplify);

    if (hasMore) {
      const pages = await Promise.all([2, 3, 4, 5].map(async page => {
        const qs = new URLSearchParams({ per_page: '200', page: String(page), created_at_min: since });
        const res = await fetch(`${TN_BASE}/orders?${qs}`, { headers: TN_HDR });
        if (!res.ok) return [];
        const data = await res.json() as any[];
        return Array.isArray(data) ? data.map(simplify) : [];
      }));
      allOrders = allOrders.concat(...pages);
    }

    await saveToSupabase(allOrders);
    return new Response(JSON.stringify({ ok: true, mode: 'full', orders: allOrders.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Sync incremental (cron): solo fetchea órdenes recientes y fusiona con Supabase
  const since = new Date(Date.now() - INCREMENTAL_MINUTES * 60 * 1000).toISOString();
  const qs = new URLSearchParams({ per_page: '50', page: '1', created_at_min: since });
  const tnRes = await fetch(`${TN_BASE}/orders?${qs}`, { headers: TN_HDR });
  if (!tnRes.ok) return new Response(JSON.stringify({ error: 'TiendaNube error' }), { status: 500, headers: CORS });

  const newOrders = ((await tnRes.json()) as any[]).map(simplify);

  // Leer órdenes actuales de Supabase
  const sbRead = await fetch(
    `${SB_URL}/rest/v1/tn_orders_cache?id=eq.main&select=orders`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  const rows = await sbRead.json() as any[];
  const existing: any[] = rows?.[0]?.orders ?? [];

  // Fusionar: upsert por id + descartar órdenes de hace más de 90 días
  const cutoff = Date.now() - DAYS_BACK * 86_400_000;
  const map = new Map(existing.map((o: any) => [o.id, o]));
  for (const o of newOrders) map.set(o.id, o);
  const merged = Array.from(map.values()).filter((o: any) =>
    new Date(o.created_at).getTime() > cutoff
  );

  await saveToSupabase(merged);
  return new Response(JSON.stringify({ ok: true, mode: 'incremental', new: newOrders.length, total: merged.length }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function saveToSupabase(orders: any[]): Promise<void> {
  await fetch(`${SB_URL}/rest/v1/tn_orders_cache`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id: 'main', orders, updated_at: new Date().toISOString() }),
  });
}
