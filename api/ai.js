export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const PORTFOLIO = [
  {t:'RDW', n:'Redwire',            w:15.1, sec:'우주·방산', b:2.42},
  {t:'IONQ',n:'IonQ',               w:8.7,  sec:'AI·양자',   b:3.05},
  {t:'RKLB',n:'Rocket Lab',         w:8.7,  sec:'우주·방산', b:2.31},
  {t:'LUNR',n:'Intuitive Machines', w:7.8,  sec:'우주·방산', b:1.47},
  {t:'FLNC',n:'Fluence Energy',     w:6.6,  sec:'에너지·DC', b:2.62},
  {t:'BBAI',n:'BigBear.ai',         w:6.2,  sec:'AI·양자',   b:3.05},
  {t:'NVDA',n:'NVIDIA',             w:5.4,  sec:'빅테크',    b:2.24},
  {t:'PL',  n:'Planet Labs',        w:5.0,  sec:'우주·방산', b:1.91},
  {t:'ITA', n:'iShares A&D ETF',    w:3.6,  sec:'우주·방산', b:0.73},
  {t:'PLTR',n:'Palantir',           w:3.5,  sec:'AI·양자',   b:1.52},
  {t:'META',n:'Meta',               w:3.2,  sec:'빅테크',    b:1.24},
  {t:'WULF',n:'TeraWulf',           w:2.6,  sec:'에너지·DC', b:4.28},
  {t:'RGTI',n:'Rigetti',            w:2.6,  sec:'AI·양자',   b:1.80},
  {t:'PGY', n:'Pagaya',             w:2.6,  sec:'핀테크',    b:5.44},
  {t:'IREN',n:'IREN',               w:1.9,  sec:'에너지·DC', b:4.18},
  {t:'CLS', n:'Celestica',          w:1.9,  sec:'에너지·DC', b:1.48},
  {t:'JOBY',n:'Joby Aviation',      w:1.5,  sec:'eVTOL',     b:2.61},
  {t:'AMZN',n:'Amazon',             w:1.4,  sec:'빅테크',    b:1.47},
  {t:'TEM', n:'Tempus AI',          w:1.2,  sec:'AI·양자',   b:2.0 },
];

function buildSystemPrompt() {
  const holdings = PORTFOLIO.map(s => `${s.t}(${s.n}) 비중${s.w}% 베타${s.b} 섹터:${s.sec}`).join(', ');
  return `당신은 전문 주식 포트폴리오 매니저입니다. 사용자의 포트폴리오를 분석하고 한국어로 간결하게 답변합니다.

현재 포트폴리오:
${holdings}
현금 비중: 6.6%
가중평균 베타: 2.40
총 평가금액: 약 2,894만원

규칙:
- 답변은 명확하고 실행 가능한 내용으로
- 투자 결정은 최종적으로 사용자 책임임을 인지
- 한국어로 답변`;
}

const MOCK_RESPONSES = {
  analysis: `**포트폴리오 종합 분석**

**강점**
- 우주·방산(36.7%)과 AI·양자(22.2%)에 집중된 미래 성장 테마 포트폴리오
- NVDA, META, AMZN 등 대형 빅테크로 일부 안정성 확보

**주요 리스크**
- 가중평균 베타 2.40 — S&P500 대비 2.4배 변동성
- RDW 단일 비중 15.1%로 집중 위험 존재
- PGY(β5.44), WULF(β4.28), IREN(β4.18) 초고베타 종목 동시 보유

**리밸런싱 제안**
1. RDW 차익실현 → 비중 8~10%로 축소
2. WULF·IREN 중 1개 정리 → 에너지·DC 베타 완화
3. 현금 6.6% → 10~12%로 확대 (변동성 완충)
4. ITA ETF 추가 매수 → 방산 유지하며 베타 낮추기

**단기 주목 종목**: IONQ, RKLB (기술적 모멘텀 유효)`,

  short: `**공매도 주의 종목 분석**

**높은 공매도 압력 가능성**
- **RGTI** (Rigetti): 양자컴퓨팅 상업화 불확실성, 소형주 특성상 공매도 타깃 가능
- **PGY** (Pagaya): β5.44 초고변동성, 핀테크 섹터 규제 리스크
- **WULF** (TeraWulf): 비트코인 가격 연동성 강해 하락 시 공매도 집중

**포지션 검토 의견**
- RGTI는 IONQ로 통합 정리 권장 (양자 섹터 압축)
- PGY는 비중 2.6%로 소액이나 베타 감안 시 익절 검토
- WULF: BTC 사이클 하락 국면 진입 시 선제적 축소 권장

*공매도 잔고 실시간 데이터는 FINRA/S3 파트너스 참고*`,
};

async function callClaude(apiKey, messages, systemPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const { action, messages, ticker, headline, headlines, apiKey } = body;
  const key = apiKey || (typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : null);
  const hasClaude = !!key;

  // News translation
  if (action === 'translate-news') {
    const items = Array.isArray(headlines) ? headlines.slice(0, 10) : [];
    if (!items.length) return new Response(JSON.stringify({ texts: [] }), { headers: CORS });
    if (!hasClaude) {
      return new Response(JSON.stringify({
        texts: items.map(h => `[번역 미리보기] ${h.slice(0, 30)}... (API 키 설정 후 실제 번역 가능)`),
        mock: true,
      }), { headers: CORS });
    }
    try {
      const prompt = `다음 영어 뉴스 헤드라인들을 자연스러운 한국어로 번역해줘. JSON 배열 형식으로만 응답해 (다른 텍스트, 마크다운 없이):\n${JSON.stringify(items)}`;
      const raw = await callClaude(key, [{ role: 'user', content: prompt }], '당신은 금융 뉴스 번역 전문가입니다. JSON 배열만 반환합니다.');
      const texts = JSON.parse(raw.trim().replace(/^```json\n?/,'').replace(/\n?```$/,''));
      return new Response(JSON.stringify({ texts: Array.isArray(texts) ? texts : items }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ texts: items, error: e.message }), { headers: CORS });
    }
  }

  // Portfolio analysis
  if (action === 'analysis') {
    if (!hasClaude) {
      return new Response(JSON.stringify({ text: MOCK_RESPONSES.analysis, mock: true }), { headers: CORS });
    }
    try {
      const text = await callClaude(key, [{ role: 'user', content: '현재 포트폴리오를 종합 분석해줘. 강점, 리스크, 리밸런싱 제안을 마크다운으로 정리해줘.' }], buildSystemPrompt());
      return new Response(JSON.stringify({ text }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ text: MOCK_RESPONSES.analysis, mock: true }), { headers: CORS });
    }
  }

  // Short position review
  if (action === 'short') {
    if (!hasClaude) {
      return new Response(JSON.stringify({ text: MOCK_RESPONSES.short, mock: true }), { headers: CORS });
    }
    try {
      const text = await callClaude(key, [{ role: 'user', content: '포트폴리오 내 공매도 압력이 높은 종목을 분석하고 포지션 검토 의견을 줘.' }], buildSystemPrompt());
      return new Response(JSON.stringify({ text }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ text: MOCK_RESPONSES.short, mock: true }), { headers: CORS });
    }
  }

  // News summary
  if (action === 'news-summary') {
    if (!hasClaude) {
      return new Response(JSON.stringify({
        text: `**${ticker} 뉴스 요약**\n\n${headline ? `"${headline}"\n\n` : ''}투자 관점: 현재 수집된 뉴스를 분석하면 단기 모멘텀 유지 가능성이 있으나 거시경제 변수 주시 필요합니다. *(Claude API 키 설정 시 실제 AI 요약 제공)*`,
        mock: true,
      }), { headers: CORS });
    }
    try {
      const text = await callClaude(key, [{
        role: 'user',
        content: `${ticker} 종목의 최신 뉴스 헤드라인: "${headline}"\n\n이 뉴스가 포트폴리오에 미치는 영향을 2-3문장으로 요약해줘.`,
      }], buildSystemPrompt());
      return new Response(JSON.stringify({ text }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ text: `뉴스 요약 실패: ${e.message}`, mock: true }), { headers: CORS });
    }
  }

  // Per-stock valuation AI
  if (action === 'valuation-ai') {
    const { symbol, name, price, shares, weight, metrics, profile, earnings, shortData } = body;
    const pe       = metrics?.peBasicExclExtraTTM;
    const ps       = metrics?.psTTM;
    const pb       = metrics?.pbAnnual;
    const evEbitda = metrics?.evEbitdaTTM;
    const roe      = metrics?.roeTTM;
    const revGrowth = metrics?.revenueGrowthTTMYoy;
    const high52   = metrics?.['52WeekHigh'];
    const low52    = metrics?.['52WeekLow'];
    const mktCap   = profile?.marketCapitalization;
    const latestShort = Array.isArray(shortData) ? shortData[shortData.length - 1] : null;
    const shortRatio  = latestShort?.shortInterestRatio;
    const epsLines = Array.isArray(earnings)
      ? earnings.slice(0, 4).map(e => `${e.period}: 실제$${e.actual} vs 예상$${e.estimate}`).join(' | ')
      : '';
    const context = [
      `종목: ${symbol} (${name || symbol}) | 섹터: 포트폴리오 내 성장주`,
      `현재가: $${price} | 보유수량: ${shares || 0}주 | 포지션 가치: $${shares ? (shares * price).toFixed(0) : '미입력'} | 비중: ${weight}%`,
      mktCap ? `시가총액: $${(mktCap / 1000).toFixed(2)}B` : '',
      `P/E: ${pe?.toFixed(1) ?? 'N/A'} | P/S: ${ps?.toFixed(1) ?? 'N/A'} | P/B: ${pb?.toFixed(1) ?? 'N/A'} | EV/EBITDA: ${evEbitda?.toFixed(1) ?? 'N/A'}`,
      `ROE: ${roe?.toFixed(1) ?? 'N/A'}% | 매출성장(YoY): ${revGrowth != null ? `${(revGrowth * 100).toFixed(1)}%` : 'N/A'}`,
      high52 != null ? `52주 범위: $${low52} ~ $${high52} | 고점대비: ${(((price - high52) / high52) * 100).toFixed(1)}%` : '',
      shortRatio != null ? `공매도 비율(일): ${shortRatio.toFixed(2)}` : '',
      epsLines ? `최근 실적: ${epsLines}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `${context}\n\n이 종목의 밸류에이션을 분석해줘. 다음 형식으로 답해줘:\n1. 판정: 고평가/적정/저평가 중 하나\n2. 핵심 근거 (2-3개 bullet)\n3. 투자 의견: 보유/추가매수/부분매도 + 한 줄 이유`;

    if (!hasClaude) {
      const verdict = ps != null && ps > 20 ? '고평가' : ps != null && ps < 5 ? '저평가' : '적정';
      return new Response(JSON.stringify({
        text: `**${symbol} 밸류에이션 판정: ${verdict} (데모)**\n\nP/S ${ps?.toFixed(1) ?? 'N/A'}, P/E ${pe?.toFixed(1) ?? 'N/A'} 기준 현재 성장 프리미엄이 반영된 수준입니다.\n\n실제 AI 분석은 ANTHROPIC_API_KEY 설정 후 이용 가능합니다.`,
        mock: true,
      }), { headers: CORS });
    }
    try {
      const text = await callClaude(key, [{ role: 'user', content: prompt }], buildSystemPrompt());
      return new Response(JSON.stringify({ text }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ text: `분석 실패: ${e.message}`, mock: true }), { headers: CORS });
    }
  }

  // Chat
  if (action === 'chat') {
    if (!Array.isArray(messages) || !messages.length) {
      return new Response(JSON.stringify({ error: 'messages required' }), { status: 400, headers: CORS });
    }
    if (!hasClaude) {
      const last = messages[messages.length - 1].content;
      return new Response(JSON.stringify({
        text: `*(데모 모드)* "${last}"에 대한 답변: Claude API 키를 설정하면 포트폴리오 데이터 기반의 실제 AI 분석을 받을 수 있습니다. Vercel 대시보드에서 ANTHROPIC_API_KEY 환경변수를 추가해주세요.`,
        mock: true,
      }), { headers: CORS });
    }
    try {
      const text = await callClaude(key, messages, buildSystemPrompt());
      return new Response(JSON.stringify({ text }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: CORS });
}
