// Endpoint que recibe webhooks de TiendaNube en tiempo real.
// TiendaNube llama a este endpoint cada vez que se crea o actualiza un pedido.
// Nosotros guardamos/actualizamos esa orden en Supabase inmediatamente.

export const config = { maxDuration: 30 };

const TN_TOKEN = '24cddf241e9dd8128a078572aeb7cc3da5a45f06';
const TN_STORE = '3349973';
const TN_BASE  = `https://api.tiendanube.com/v1/${TN_STORE}`;
const TN_HDR   = {
  Authentication: `bearer ${TN_TOKEN}`,
  'User-Agent': 'NovaDashboard (contact@fromnorthgb.com)',
};

const SB_URL = 'https://tnmmbfcbviowhunnrzix.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRubW1iZmNidmlvd2h1bm5yeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTc4MzcsImV4cCI6MjA4OTc5MzgzN30.ZZD8evIrlfY_77-DEh47L-JJxFOxhH8L9xZ_NjHN6QU';

export default async function handler(req: any, res: any): Promise<void> {
  // TiendaNube espera 200 rápido, sino reintenta
  res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const orderId = body?.id;
    if (!orderId) return;

    // Obtener la orden completa desde TiendaNube
    const orderRes = await fetch(`${TN_BASE}/orders/${orderId}`, { headers: TN_HDR });
    if (!orderRes.ok) {
      console.error(`[tn-webhook] Error fetching order ${orderId}: ${orderRes.status}`);
      return;
    }
    const o = await orderRes.json();

    const row = {
      id: o.id,
      data: {
        id: o.id,
        number: o.number,
        status: o.status,
        payment_status: o.payment_status,
        total: o.total,
        subtotal: o.subtotal,
        total_shipping: o.total_shipping,
        discount: o.discount,
        created_at: o.created_at,
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
      },
      order_date: o.created_at,
    };

    await fetch(`${SB_URL}/rest/v1/tn_order_rows`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([row]),
    });

    console.log(`[tn-webhook] Orden ${orderId} (${o.payment_status}) guardada en Supabase`);
  } catch (err: any) {
    console.error('[tn-webhook] Error:', err?.message ?? err);
  }
}
