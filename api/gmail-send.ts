export const config = { maxDuration: 30 };

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`OAuth error: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  const { threadId, to, asunto, mensaje } = req.body ?? {};
  if (!to || !asunto || !mensaje) {
    res.status(400).json({ ok: false, error: 'Faltan campos: to, asunto, mensaje' });
    return;
  }

  try {
    const accessToken = await getAccessToken();

    const emailLines = [
      `From: FromNorth <enzoribot02@gmail.com>`,
      `To: ${to}`,
      `Subject: ${asunto}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      mensaje,
    ];
    const raw = Buffer.from(emailLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
      },
    );

    if (!sendRes.ok) {
      const err = await sendRes.json();
      throw new Error(JSON.stringify(err));
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[gmail-send] error:', err?.message ?? err);
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
}
