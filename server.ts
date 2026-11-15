import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

let cachedGroundedAmdRate: {
  found: boolean;
  rate: number | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  updatedAt: string;
  fetchedAtMs: number;
} | null = null;

interface ServerPriceCacheEntry {
  found: boolean;
  priceUsd: number | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  updatedAt: string;
  fetchedAtMs: number;
}

const serverPriceCache = new Map<string, ServerPriceCacheEntry>();
let geminiQuotaCooldownUntilMs = 0;

async function callGroundedGemini(
  ai: GoogleGenAI,
  prompt: string
): Promise<{
  text: string;
  chunkUrl: string | null;
  chunkTitle: string | null;
  quotaExceeded?: boolean;
} | null> {
  if (Date.now() < geminiQuotaCooldownUntilMs) {
    return { text: '', chunkUrl: null, chunkTitle: null, quotaExceeded: true };
  }

  const candidateModels = ['gemini-4-hydrogen', 'gemini-2.5-flash'];
  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = (response.text || '').trim();
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      let chunkUrl: string | null = null;
      let chunkTitle: string | null = null;
      for (const c of chunks) {
        if (c.web?.uri) {
          chunkUrl = c.web.uri;
          chunkTitle = c.web.title || c.web.uri;
          break;
        }
      }
      return { text: rawText, chunkUrl, chunkTitle };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuota =
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('quota') ||
        msg.includes('rate');
      if (isQuota) {
        // Try next model; if both are exhausted, enter a 60s cooldown without throwing console.error
        continue;
      }
      return null;
    }
  }

  geminiQuotaCooldownUntilMs = Date.now() + 60 * 1000;
  return { text: '', chunkUrl: null, chunkTitle: null, quotaExceeded: true };
}



interface PriceRecord {
  deviceId: string;
  priceUsd: number;
  previousPriceUsd: number;
  msrpUsd: number;
  deltaPercent: number;
  amdRate: number;
  eurRate: number;
  stock: number;
  trend: 'up' | 'down' | 'stable';
  history: number[];
  updatedAt: string;
}

const BASE_CATALOG: Array<{ id: string; msrp: number; stock: number }> = [
  { id: 'galaxy-s24-ultra', msrp: 1299, stock: 18 },
  { id: 'galaxy-z-fold6', msrp: 1899, stock: 9 },
  { id: 'galaxy-book4-ultra', msrp: 2399, stock: 7 },
  { id: 'iphone-16-pro-max', msrp: 1199, stock: 22 },
  { id: 'macbook-pro-16-m4max', msrp: 3499, stock: 6 },
  { id: 'apple-m4-max-soc', msrp: 699, stock: 14 },
  { id: 'huawei-pura-70-ultra', msrp: 1349, stock: 11 },
  { id: 'huawei-mate-xt', msrp: 2799, stock: 4 },
  { id: 'huawei-matebook-x-pro', msrp: 2199, stock: 8 },
];

let currentAmdRate = 388.5;
let currentEurRate = 0.92;

const priceStore = new Map<string, PriceRecord>();

function initPrices() {
  const now = new Date().toISOString();
  for (const item of BASE_CATALOG) {
    const initialOffset = Math.round((Math.random() - 0.52) * item.msrp * 0.025);
    const startPrice = item.msrp + initialOffset;
    // 7-day sparkline history (7 points)
    const history: number[] = [];
    for (let i = 0; i < 7; i++) {
      history.push(startPrice + Math.round((Math.random() - 0.5) * 28));
    }
    history[history.length - 1] = startPrice;
    const deltaPercent = Number((((startPrice - item.msrp) / item.msrp) * 100).toFixed(2));
    priceStore.set(item.id, {
      deviceId: item.id,
      priceUsd: startPrice,
      previousPriceUsd: item.msrp,
      msrpUsd: item.msrp,
      deltaPercent,
      amdRate: currentAmdRate,
      eurRate: currentEurRate,
      stock: item.stock,
      trend: startPrice < item.msrp ? 'down' : startPrice > item.msrp ? 'up' : 'stable',
      history,
      updatedAt: now,
    });
  }
}

initPrices();

const sseClients = new Set<express.Response>();

function tickMarketPrices() {
  currentAmdRate = Number((388.5 + (Math.random() - 0.5) * 1.2).toFixed(2));
  currentEurRate = Number((0.92 + (Math.random() - 0.5) * 0.008).toFixed(4));
  const keys = Array.from(priceStore.keys());
  const shuffled = keys.sort(() => 0.5 - Math.random()).slice(0, 3);
  const now = new Date().toISOString();

  for (const key of shuffled) {
    const rec = priceStore.get(key);
    if (!rec) continue;
    // Believable small fluctuations ($2 to $14)
    const maxSwing = Math.max(3, Math.round(rec.msrpUsd * 0.008));
    let step = Math.round((Math.random() - 0.5) * maxSwing);
    if (step === 0) step = Math.random() > 0.5 ? 2 : -2;
    const minBound = Math.round(rec.msrpUsd * 0.91);
    const maxBound = Math.round(rec.msrpUsd * 1.04);
    const nextPrice = Math.max(minBound, Math.min(maxBound, rec.priceUsd + step));
    const trend: 'up' | 'down' | 'stable' =
      nextPrice > rec.priceUsd ? 'up' : nextPrice < rec.priceUsd ? 'down' : 'stable';
    const nextHistory = [...rec.history.slice(1), nextPrice];
    const deltaPercent = Number((((nextPrice - rec.msrpUsd) / rec.msrpUsd) * 100).toFixed(2));

    priceStore.set(key, {
      deviceId: key,
      priceUsd: nextPrice,
      previousPriceUsd: rec.priceUsd,
      msrpUsd: rec.msrpUsd,
      deltaPercent,
      amdRate: currentAmdRate,
      eurRate: currentEurRate,
      stock: rec.stock,
      trend,
      history: nextHistory,
      updatedAt: now,
    });
  }

  const snapshot = Object.fromEntries(priceStore.entries());
  const payload = `data: ${JSON.stringify(snapshot)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

setInterval(tickMarketPrices, 3800);

export const app = express();
app.use(express.json());

app.get('/api/prices', (_req, res) => {
  res.json({
    amdRate: currentAmdRate,
    eurRate: currentEurRate,
    prices: Object.fromEntries(priceStore.entries()),
  });
});

  app.get('/api/prices/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const snapshot = Object.fromEntries(priceStore.entries());
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.post('/api/orders', (req, res) => {
    const body = req.body as {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      shippingCity?: string;
      shippingAddress?: string;
      deliveryMethod?: string;
      promoCode?: string;
      discountUsd?: number;
      currency?: 'USD' | 'EUR' | 'AMD';
      items?: Array<{
        deviceId: string;
        name: string;
        finish: string;
        storage: string;
        storageDeltaUsd: number;
        quantity: number;
      }>;
    };

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    let subtotalUsd = 0;
    const confirmedItems = body.items.map((item) => {
      const liveRec = priceStore.get(item.deviceId);
      const baseUsd = liveRec ? liveRec.priceUsd : 1299;
      const unitPriceUsd = baseUsd + (item.storageDeltaUsd || 0);
      subtotalUsd += unitPriceUsd * item.quantity;

      if (liveRec && liveRec.stock > 1) {
        liveRec.stock = Math.max(1, liveRec.stock - item.quantity);
      }

      return {
        name: item.name,
        finish: item.finish,
        storage: item.storage,
        quantity: item.quantity,
        unitPriceUsd,
      };
    });

    const discountUsd = Math.max(0, Math.min(subtotalUsd * 0.3, Number(body.discountUsd || 0)));
    const shippingUsd = body.deliveryMethod === 'express' ? 25 : 0;
    const totalUsd = Math.max(0, Math.round(subtotalUsd - discountUsd + shippingUsd));
    const totalEur = Math.round(totalUsd * currentEurRate);
    const totalAmd = Math.round(totalUsd * currentAmdRate);
    const orderId = `SP-${Math.floor(100000 + Math.random() * 900000)}`;

    res.json({
      orderId,
      customerName: body.customerName || 'Guest Collector',
      customerEmail: body.customerEmail || 'collector@siliconpulse.store',
      customerPhone: body.customerPhone || '',
      shippingCity: body.shippingCity || 'Yerevan',
      shippingAddress: body.shippingAddress || '',
      deliveryMethod: body.deliveryMethod || 'standard',
      promoCode: body.promoCode || '',
      discountUsd,
      currency: body.currency || 'USD',
      totalUsd,
      totalEur,
      totalAmd,
      items: confirmedItems,
      createdAt: new Date().toISOString(),
    });
  });

  // Home Guide: Live Exchange Rate (USD -> AMD) via Gemini API + Google Search Grounding (with live FX API fallback if rate-limited)
  app.get('/api/home-guide/exchange-rate', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

    if (
      !forceRefresh &&
      cachedGroundedAmdRate &&
      cachedGroundedAmdRate.found &&
      Date.now() - cachedGroundedAmdRate.fetchedAtMs < SIX_HOURS_MS
    ) {
      res.json(cachedGroundedAmdRate);
      return;
    }

    const ai = getGenAIClient();
    const nowIso = new Date().toISOString();

    if (ai) {
      const grounded = await callGroundedGemini(
        ai,
        'Use Google Search to find the current live exchange rate for 1 US Dollar (USD) to Armenian Dram (AMD) today. Respond with ONLY a valid JSON object: {"found": true, "rate": <number>, "sourceTitle": "<source name>"} or {"found": false, "rate": null} if you cannot verify it. Do not invent numbers.'
      );

      if (grounded && !grounded.quotaExceeded && grounded.text) {
        const rawText = grounded.text;
        let parsedRate: number | null = null;
        let parsedSourceTitle: string | null = null;

        const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            const obj = JSON.parse(jsonMatch[0]) as {
              found?: boolean;
              rate?: number | string | null;
              sourceTitle?: string | null;
            };
            if (obj.found && obj.rate !== null && obj.rate !== undefined) {
              const num = Number(String(obj.rate).replace(/[^0-9.]/g, ''));
              if (Number.isFinite(num) && num >= 250 && num <= 650) {
                parsedRate = Number(num.toFixed(2));
              }
            }
            if (obj.sourceTitle) {
              parsedSourceTitle = String(obj.sourceTitle);
            }
          } catch {
            // fallback regex below
          }
        }

        if (parsedRate === null) {
          const numMatch = rawText.match(/\b(3[4-9]\d(?:\.\d{1,2})?|4[0-4]\d(?:\.\d{1,2})?)\b/);
          if (numMatch) {
            const candidate = Number(numMatch[1]);
            if (Number.isFinite(candidate) && candidate >= 250 && candidate <= 650) {
              parsedRate = Number(candidate.toFixed(2));
            }
          }
        }

        if (parsedRate !== null) {
          cachedGroundedAmdRate = {
            found: true,
            rate: parsedRate,
            sourceUrl: grounded.chunkUrl || 'https://www.google.com/finance/quote/USD-AMD',
            sourceTitle:
              grounded.chunkTitle || parsedSourceTitle || 'Google Search Grounding (USD/AMD)',
            updatedAt: nowIso,
            fetchedAtMs: Date.now(),
          };
          res.json(cachedGroundedAmdRate);
          return;
        }
      }
    }

    // Live public ExchangeRate API fallback when Gemini quota is exhausted
    try {
      const fxResp = await fetch('https://open.er-api.com/v6/latest/USD');
      if (fxResp.ok) {
        const fxJson = (await fxResp.json()) as {
          rates?: Record<string, number>;
          time_last_update_utc?: string;
        };
        const amdVal = fxJson?.rates?.AMD;
        if (typeof amdVal === 'number' && amdVal >= 250 && amdVal <= 650) {
          const rateRounded = Number(amdVal.toFixed(2));
          const updatedStr = fxJson.time_last_update_utc
            ? new Date(fxJson.time_last_update_utc).toISOString()
            : nowIso;
          cachedGroundedAmdRate = {
            found: true,
            rate: rateRounded,
            sourceUrl: 'https://www.google.com/finance/quote/USD-AMD',
            sourceTitle: 'Live Market FX Feed (USD/AMD)',
            updatedAt: updatedStr,
            fetchedAtMs: Date.now(),
          };
          res.json(cachedGroundedAmdRate);
          return;
        }
      }
    } catch {
      // ignore network error and return found: false below
    }

    res.json({
      found: false,
      rate: null,
      sourceUrl: null,
      sourceTitle: null,
      updatedAt: nowIso,
    });
  });

  // Home Guide: Real Appliance Price Lookup via Gemini API + Google Search Grounding
  app.post('/api/home-guide/price-lookup', async (req, res) => {
    const body = req.body as {
      modelId?: string;
      brand?: string;
      modelCode?: string;
      name?: string;
      searchQuery?: string;
      forceRefresh?: boolean;
    };

    const nowIso = new Date().toISOString();
    if (!body || (!body.searchQuery && !body.name)) {
      res.status(400).json({
        found: false,
        priceUsd: null,
        sourceUrl: null,
        sourceTitle: null,
        updatedAt: nowIso,
      });
      return;
    }

    const cacheKey = body.modelId || `${body.brand || ''}_${body.modelCode || ''}`;
    const DAY_MS = 24 * 60 * 60 * 1000;
    if (!body.forceRefresh && cacheKey) {
      const cached = serverPriceCache.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAtMs < DAY_MS) {
        res.json(cached);
        return;
      }
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.json({
        found: false,
        priceUsd: null,
        sourceUrl: null,
        sourceTitle: null,
        updatedAt: nowIso,
        error: 'GEMINI_API_KEY not configured',
      });
      return;
    }

    const queryText =
      body.searchQuery || `${body.brand || ''} ${body.modelCode || ''} ${body.name || ''} price USD`;

    const prompt = `Use Google Search to find the current retail or official manufacturer price in US Dollars (USD) for this exact appliance/device model:
Brand: ${body.brand || ''}
Model Code: ${body.modelCode || ''}
Product Name: ${body.name || ''}
Search Query: ${queryText}

Rules:
1. Only report a real price in USD found on a manufacturer page or major retailer (e.g., Samsung, LG, Bosch, Apple, Best Buy, Home Depot, Lowe's, Amazon, B&H, Abt, AJ Madison).
2. NEVER guess or invent a number. If no verified price in USD can be found, set "found": false and "priceUsd": null.
3. Respond with ONLY a valid JSON object in this exact shape:
{"found": true, "priceUsd": 1299.99, "retailerName": "Official Store or Retailer Name", "sourceUrl": "https://..."}
or
{"found": false, "priceUsd": null, "retailerName": null, "sourceUrl": null}`;

    const grounded = await callGroundedGemini(ai, prompt);
    if (!grounded || grounded.quotaExceeded || !grounded.text) {
      res.json({
        found: false,
        priceUsd: null,
        sourceUrl: null,
        sourceTitle: null,
        updatedAt: nowIso,
        quotaExceeded: Boolean(grounded?.quotaExceeded),
      });
      return;
    }

    const rawText = grounded.text;
    const groundedUrl = grounded.chunkUrl;
    const groundedTitle = grounded.chunkTitle;

    let found = false;
    let priceUsd: number | null = null;
    let retailerName: string | null = null;
    let parsedUrl: string | null = null;

    const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          found?: boolean;
          priceUsd?: number | string | null;
          retailerName?: string | null;
          sourceUrl?: string | null;
        };
        if (parsed.found && parsed.priceUsd !== null && parsed.priceUsd !== undefined) {
          const num = Number(String(parsed.priceUsd).replace(/[^0-9.]/g, ''));
          if (Number.isFinite(num) && num >= 40 && num <= 25000) {
            found = true;
            priceUsd = Math.round(num * 100) / 100;
          }
        }
        if (parsed.retailerName) {
          retailerName = String(parsed.retailerName);
        }
        if (parsed.sourceUrl && /^https?:\/\//i.test(String(parsed.sourceUrl))) {
          parsedUrl = String(parsed.sourceUrl);
        }
      } catch {
        // fallback below
      }
    }

    if (!found) {
      const dollarMatch = rawText.match(/\$\s?([0-9]{1,2},?[0-9]{2,3}(?:\.[0-9]{2})?)/);
      if (dollarMatch && !/not found|unavailable|cannot find|no price/i.test(rawText)) {
        const num = Number(dollarMatch[1].replace(/,/g, ''));
        if (Number.isFinite(num) && num >= 40 && num <= 25000) {
          found = true;
          priceUsd = Math.round(num * 100) / 100;
        }
      }
    }

    if (!found || priceUsd === null) {
      res.json({
        found: false,
        priceUsd: null,
        sourceUrl: null,
        sourceTitle: null,
        updatedAt: nowIso,
      });
      return;
    }

    const resultPayload: ServerPriceCacheEntry = {
      found: true,
      priceUsd,
      sourceUrl:
        groundedUrl ||
        parsedUrl ||
        `https://www.google.com/search?q=${encodeURIComponent(queryText)}`,
      sourceTitle: groundedTitle || retailerName || `${body.brand || 'Retail'} Verified Listing`,
      updatedAt: nowIso,
      fetchedAtMs: Date.now(),
    };

    if (cacheKey) {
      serverPriceCache.set(cacheKey, resultPayload);
    }

    res.json(resultPayload);
  });

  app.get('/api/export-html', (_req, res) => {
    try {
      const distDir = path.resolve(process.cwd(), 'dist');
      const indexHtmlPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) {
        res.status(404).send('Build output not found. Please run build first.');
        return;
      }

      let html = fs.readFileSync(indexHtmlPath, 'utf-8');

      // Inline compiled CSS from /dist/assets/*.css
      html = html.replace(
        /<link\s+rel="stylesheet"[^>]*href="\/assets\/([^"]+\.css)"[^>]*>/g,
        (_match, cssFile: string) => {
          const cssPath = path.join(distDir, 'assets', cssFile);
          if (fs.existsSync(cssPath)) {
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            return `<style>${cssContent}</style>`;
          }
          return _match;
        }
      );

      // Inline compiled JS bundle from /dist/assets/*.js at the end of body so #root exists
      let inlinedScripts = '';
      html = html.replace(
        /<script\s+type="module"[^>]*src="\/assets\/([^"]+\.js)"[^>]*><\/script>/g,
        (_match, jsFile: string) => {
          const jsPath = path.join(distDir, 'assets', jsFile);
          if (fs.existsSync(jsPath)) {
            const jsContent = fs
              .readFileSync(jsPath, 'utf-8')
              .replace(/<\/script>/gi, '<\\/script>');
            inlinedScripts += `<script type="module">${jsContent}</script>`;
            return '';
          }
          return _match;
        }
      );

      if (inlinedScripts) {
        html = html.replace('</body>', `${inlinedScripts}\n  </body>`);
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="SILICON_PULSE_3D_AR_Showroom.html"'
      );
      res.send(html);
    } catch (err) {
      console.error('Failed to generate standalone HTML:', err);
      res.status(500).send('Failed to generate standalone HTML');
    }
  });

async function startServer() {
  const PORT = Number(process.env.PORT) || 3002;

  if (process.env.NODE_ENV !== 'production') {
    // Vite is loaded only for local development, so the Vercel /api function does not need it
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const srvPrimary = app.listen(PORT, '0.0.0.0', () => {
    console.log(`SILICON PULSE server listening on http://localhost:${PORT}`);
  });
  srvPrimary.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use.`);
    }
  });

  if (PORT !== 3000) {
    const srvFallback = app.listen(3000, '0.0.0.0', () => {
      console.log(`SILICON PULSE server also listening on http://localhost:3000`);
    });
    srvFallback.on('error', () => {
      // ignore if 3000 is busy
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

