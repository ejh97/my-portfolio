export const config = { runtime: 'edge' };

const YAHOO_URLS = [
  (symbols) => `https://query1.finance.yahoo.com/v8/finance/chart/${symbols.split(',')[0]}?interval=1d&range=1d`,
  (symbols) => `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent`,
  (symbols) => `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent`,
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
  'Cache-Control': 'no-cache',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get('symbols') || '';
  const type    = searchParams.get('type')    || 'stock';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=30',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 환율
  if (type === 'fx') {
    try {
      const res = await fetch(
        'https://query2.finance.yahoo.com/v7/finance/quote?symbols=USDKRW%3DX&fields=regularMarketPrice',
        { headers: HEADERS }
      );
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // 주가: 배치로 나눠서 요청 (20개 한번에 보내면 막힘)
  if (type === 'stock' || !type) {
    const tickerList = symbols.split(',').filter(Boolean);
    const results = [];

    // 5개씩 나눠서 요청
    const chunks = [];
    for (let i = 0; i < tickerList.length; i += 5) {
      chunks.push(tickerList.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      const sym = chunk.join(',');
      let success = false;

      for (const urlFn of [
        () => `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${sym}&fields=regularMarketPrice,regularMarketChangePercent`,
        () => `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${sym}&fields=regularMarketPrice,regularMarketChangePercent`,
        () => `https://query2.finance.yahoo.com/v8/finance/spark?symbols=${sym}&range=1d&interval=1d`,
      ]) {
        try {
          const res = await fetch(urlFn(), { headers: HEADERS });
          if (!res.ok) continue;
          const data = await res.json();
          const quotes = data?.quoteResponse?.result || data?.spark?.result || [];
          if (quotes.length > 0) {
            quotes.forEach(q => {
              // spark API는 다른 구조
              if (q.response) {
                const r = q.response[0];
                results.push({
                  symbol: q.symbol,
                  regularMarketPrice: r?.meta?.regularMarketPrice || 0,
                  regularMarketChangePercent: r?.meta?.regularMarketChangePercent || 0,
                });
              } else {
                results.push({
                  symbol: q.symbol,
                  regularMarketPrice: q.regularMarketPrice,
                  regularMarketChangePercent: q.regularMarketChangePercent,
                });
              }
            });
            success = true;
            break;
          }
        } catch(e) { continue; }
      }

      // 청크 사이 살짝 딜레이 (rate limit 우회)
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const response = {
      quoteResponse: { result: results, error: null }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Cache-Control': 's-maxage=30' }
    });
  }

  return new Response(JSON.stringify({ error: 'unknown type' }), { status: 400, headers: corsHeaders });
}
