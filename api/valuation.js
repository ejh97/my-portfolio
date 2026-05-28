export const config = { runtime: 'edge' };

const FINNHUB_KEY = 'd8c1jdhr01qkc5gdtcegd8c1jdhr01qkc5gdtcf0';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=300',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase();
  if (!symbol) return new Response(JSON.stringify({ error: 'symbol required' }), { status: 400, headers: CORS });

  const base  = 'https://finnhub.io/api/v1';
  const tok   = `token=${FINNHUB_KEY}`;
  const today = new Date().toISOString().split('T')[0];
  const from90 = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];

  const [metricsR, profileR, earningsR, shortR] = await Promise.allSettled([
    fetch(`${base}/stock/metric?symbol=${symbol}&metric=all&${tok}`).then(r => r.json()),
    fetch(`${base}/stock/profile2?symbol=${symbol}&${tok}`).then(r => r.json()),
    fetch(`${base}/stock/earnings?symbol=${symbol}&limit=4&${tok}`).then(r => r.json()),
    fetch(`${base}/stock/short-interest?symbol=${symbol}&from=${from90}&to=${today}&${tok}`).then(r => r.json()),
  ]);

  const metrics  = metricsR.status  === 'fulfilled' ? (metricsR.value?.metric  || {})                : {};
  const profile  = profileR.status  === 'fulfilled' ? (profileR.value          || {})                : {};
  const earnings = earningsR.status === 'fulfilled' ? (Array.isArray(earningsR.value) ? earningsR.value : []) : [];
  const shortData = shortR.status   === 'fulfilled' ? (shortR.value?.data      || [])                : [];

  return new Response(JSON.stringify({ symbol, metrics, profile, earnings, shortData }), { headers: CORS });
}
