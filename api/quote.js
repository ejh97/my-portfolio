export const config = { runtime: 'edge' };

const FINNHUB_KEY = 'd8c1jdhr01qkc5gdtcegd8c1jdhr01qkc5gdtcf0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=30',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const { searchParams } = new URL(req.url);
  const type    = searchParams.get('type') || 'stock';
  const symbols = (searchParams.get('symbols') || '').split(',').filter(Boolean);

  // 환율
  if (type === 'fx') {
    try {
      const res  = await fetch(`https://finnhub.io/api/v1/forex/rates?base=USD&token=${FINNHUB_KEY}`);
      const data = await res.json();
      const krw  = data?.quote?.KRW || 1382;
      return new Response(JSON.stringify({
        quoteResponse: { result: [{ regularMarketPrice: krw }] }
      }), { headers: CORS });
    } catch(e) {
      return new Response(JSON.stringify({
        quoteResponse: { result: [{ regularMarketPrice: 1382 }] }
      }), { headers: CORS });
    }
  }

  // 뉴스
  if (type === 'news') {
    const symbol = symbols[0] || '';
    try {
      const today = new Date();
      const from  = new Date(today - 7 * 24 * 60 * 60 * 1000);
      const fmt   = d => d.toISOString().split('T')[0];
      const url   = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fmt(from)}&to=${fmt(today)}&token=${FINNHUB_KEY}`;
      const res   = await fetch(url);
      const data  = await res.json();
      const news  = Array.isArray(data) ? data.slice(0, 10) : [];
      return new Response(JSON.stringify({ news }), { headers: CORS });
    } catch(e) {
      return new Response(JSON.stringify({ news: [] }), { headers: CORS });
    }
  }

  // 주가: 병렬 요청
  try {
    const fetches = symbols.map(sym =>
      fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`)
        .then(r => r.json())
        .then(d => ({
          symbol: sym,
          regularMarketPrice: d.c || 0,
          regularMarketChangePercent: d.dp || 0,
        }))
        .catch(() => ({ symbol: sym, regularMarketPrice: 0, regularMarketChangePercent: 0 }))
    );

    const results = await Promise.all(fetches);
    return new Response(JSON.stringify({
      quoteResponse: { result: results.filter(r => r.regularMarketPrice > 0), error: null }
    }), { headers: CORS });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
