export const config = { runtime: 'edge' };

export default async function handler(_req: Request): Promise<Response> {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (_req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const res = await fetch(
      'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: 'USDT',
          fiat: 'ARS',
          tradeType: 'SELL',
          page: 1,
          rows: 1,
          publisherType: null,
          payTypes: [],
        }),
      },
    );

    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const json = await res.json() as any;
    const price = parseFloat(json?.data?.[0]?.adv?.price ?? '0');
    if (!price) throw new Error('price_not_found');

    return new Response(JSON.stringify({ price }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ price: 0, error: String(err) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
}
