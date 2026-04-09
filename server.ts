import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cors from "cors";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Load dynamic proxy config from environment variable if available
  if (process.env.PROXY_CONFIG) {
    try {
      const config = JSON.parse(process.env.PROXY_CONFIG);
      const proxies = Array.isArray(config) ? config : (config.proxies || []);
      proxies.forEach((p: any) => {
        if (p.path && p.target) {
          console.log(`[Config] Adding dynamic proxy: ${p.path} -> ${p.target}`);
          app.all(`${p.path}/*`, async (req, res) => {
            const targetPath = req.params[0];
            const targetUrl = `${p.target.endsWith('/') ? p.target : p.target + '/'}${targetPath}`;
            try {
              const response = await axios({
                method: req.method,
                url: targetUrl,
                data: req.body,
                params: req.query,
                headers: { ...req.headers, host: new URL(p.target).host },
                validateStatus: () => true
              });
              res.status(response.status).send(response.data);
            } catch (err: any) {
              res.status(500).json({ error: "Dynamic proxy failed", message: err.message });
            }
          });
        }
      });
    } catch (e) {
      console.error("[Config] Failed to parse PROXY_CONFIG:", e);
    }
  }

  // Request logger
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api/health')) {
      console.log(`[Server] ${req.method} ${req.url}`);
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // API 404 handler - will be moved later but defined as a function
  const api404Handler = (req: express.Request, res: express.Response) => {
    res.status(404).json({ 
      success: false,
      error: "API route not found", 
      method: req.method,
      url: req.originalUrl 
    });
  };

  // Cache for API responses
  const apiCache = new Map<string, { data: any; timestamp: number }>();
  const API_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  function getCached(key: string) {
    const item = apiCache.get(key);
    if (item && Date.now() - item.timestamp < API_CACHE_TTL) {
      console.log(`[Cache] Hit for ${key}`);
      return item.data;
    }
    return null;
  }

  function setCached(key: string, data: any) {
    apiCache.set(key, { data, timestamp: Date.now() });
  }

  app.get("/api/nationalities", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=1800"); // 30 minutes
    
    const cached = getCached("nationalities");
    if (cached) return res.json(cached);

    try {
      if (!(global as any).wafidNationalities) {
        console.log("[API] Nationalities not in cache, fetching session...");
        await getWafidSession().catch((err) => console.error("[API] getWafidSession failed in nationalities:", err.message));
      }
      const nationalities = (global as any).wafidNationalities || [
        { id: "1049", name: "Afghan" },
        { id: "2", name: "Albanian" },
        { id: "1012", name: "Algeria" },
        { id: "3", name: "Algerian" },
        { id: "1070", name: "Angolan" },
        { id: "8", name: "Argentinian" },
        { id: "9", name: "Armenian" },
        { id: "10", name: "Australian" },
        { id: "11", name: "Austrian" },
        { id: "12", name: "Azerbaijani" },
        { id: "14", name: "Bahraini" },
        { id: "15", name: "Bangladeshi" },
        { id: "19", name: "Belarusian" },
        { id: "20", name: "Belgian" },
        { id: "21", name: "Belizean" },
        { id: "1084", name: "Beninese" },
        { id: "23", name: "Bhutanese" },
        { id: "25", name: "Bosnian" },
        { id: "26", name: "Brazilian" },
        { id: "1014", name: "Britain" },
        { id: "1077", name: "Bulgarian" },
        { id: "30", name: "Burkinabe" },
        { id: "32", name: "Burundian" },
        { id: "33", name: "Cambodian" },
        { id: "34", name: "Cameroonian" },
        { id: "35", name: "Canadian" },
        { id: "38", name: "Chadian" },
        { id: "1082", name: "Chilean" },
        { id: "40", name: "Chinese" },
        { id: "41", name: "Colombian" },
        { id: "1083", name: "Congolese" },
        { id: "1072", name: "Cuban" },
        { id: "47", name: "Cypriot" },
        { id: "48", name: "Czech" },
        { id: "49", name: "Danish" },
        { id: "50", name: "Djibouti" },
        { id: "1050", name: "Dominica" },
        { id: "52", name: "Dutch" },
        { id: "54", name: "Ecuadorean" },
        { id: "55", name: "Egyptian" },
        { id: "58", name: "Eritrean" },
        { id: "60", name: "Ethiopian" },
        { id: "177", name: "Filipino" },
        { id: "63", name: "Finnish" },
        { id: "64", name: "French" },
        { id: "68", name: "German" },
        { id: "69", name: "Ghanaian" },
        { id: "70", name: "Greek" },
        { id: "1076", name: "Guatemalan" },
        { id: "74", name: "GuineanGuyanese" },
        { id: "1067", name: "Guineense" },
        { id: "1", name: "Indian" },
        { id: "81", name: "Indonesian" },
        { id: "82", name: "Iranian" },
        { id: "83", name: "Iraqi" },
        { id: "84", name: "Irish" },
        { id: "86", name: "Italian" },
        { id: "87", name: "Ivorian" },
        { id: "88", name: "Jamaican" },
        { id: "89", name: "Japanese" },
        { id: "90", name: "Jordanian" },
        { id: "91", name: "Kazakhstani" },
        { id: "92", name: "Kenyan" },
        { id: "94", name: "Kuwaiti" },
        { id: "1080", name: "Kyrgyzstani" },
        { id: "96", name: "Laotian" },
        { id: "98", name: "Lebanese" },
        { id: "100", name: "Libyan" },
        { id: "102", name: "Lithuanian" },
        { id: "105", name: "Malagasy" },
        { id: "1069", name: "Malawian" },
        { id: "1015", name: "Malaysia" },
        { id: "108", name: "Maldivian" },
        { id: "109", name: "Malian" },
        { id: "110", name: "Maltese" },
        { id: "112", name: "Mauritanian" },
        { id: "114", name: "Mexican" },
        { id: "1066", name: "Montenegrin" },
        { id: "119", name: "Moroccan" },
        { id: "1068", name: "Myanmar" },
        { id: "125", name: "Nepalese" },
        { id: "127", name: "New Zealander" },
        { id: "130", name: "Nigerian" },
        { id: "1073", name: "Nigerien" },
        { id: "133", name: "Norwegian" },
        { id: "134", name: "Omani" },
        { id: "135", name: "Pakistani" },
        { id: "1007", name: "Palestine" },
        { id: "137", name: "Panamanian" },
        { id: "141", name: "Peruvian" },
        { id: "142", name: "Polish" },
        { id: "1064", name: "Portuguese" },
        { id: "144", name: "Qatari" },
        { id: "145", name: "Romanian" },
        { id: "146", name: "Russian" },
        { id: "1071", name: "Rwandan" },
        { id: "1060", name: "Saint Kitts and Nevis" },
        { id: "148", name: "Saudi" },
        { id: "1074", name: "Senegalese" },
        { id: "150", name: "Serbian" },
        { id: "1053", name: "Sierra Leonean" },
        { id: "1062", name: "Sierra Leonean" },
        { id: "1081", name: "singapore" },
        { id: "1079", name: "Slovakian" },
        { id: "1078", name: "Slovenian" },
        { id: "152", name: "Somali" },
        { id: "1011", name: "South Africa" },
        { id: "154", name: "South Korean" },
        { id: "156", name: "Sri Lankan" },
        { id: "157", name: "Sudanese" },
        { id: "189", name: "Swedish" },
        { id: "159", name: "Swiss" },
        { id: "160", name: "Syrian" },
        { id: "161", name: "Taiwanese" },
        { id: "162", name: "Tajik" },
        { id: "163", name: "Tanzanian" },
        { id: "164", name: "Thai" },
        { id: "195", name: "Togolese" },
        { id: "194", name: "Tunisian" },
        { id: "165", name: "Turkish" },
        { id: "1063", name: "Turkmen" },
        { id: "166", name: "Ugandan" },
        { id: "167", name: "Ukrainian" },
        { id: "1013", name: "United states of America" },
        { id: "169", name: "Uzbekistani" },
        { id: "185", name: "Vanuatu" },
        { id: "170", name: "Venezuelan" },
        { id: "171", name: "Vietnamese" },
        { id: "172", name: "YEMENI" },
        { id: "1085", name: "Zambian" }
      ];
      res.json(nationalities);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch nationalities" });
    }
  });

  // Proxy handler function
  const proxyHandler = async (req: express.Request, res: express.Response) => {
    const targetPath = req.params[0];
    const targetUrl = `https://wafid.com/${targetPath}`;
    
    try {
      // Use getWafidSession to get valid cookies
      const { cookie: cookieString } = await getWafidSession();

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        params: req.query,
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Origin": "https://wafid.com",
          "Referer": "https://wafid.com/en/book-appointment/",
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-BD,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cookie": cookieString,
          "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Linux"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin"
        },
        validateStatus: () => true,
      });

      Object.entries(response.headers).forEach(([key, value]) => {
        if (key === "set-cookie") {
          res.setHeader(key, value as string[]);
        } else if (key !== "content-encoding" && key !== "transfer-encoding" && key !== "content-length") {
          res.setHeader(key, value as string);
        }
      });

      res.status(response.status).send(response.data);
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(500).json({ error: "Proxy request failed", message: error.message });
    }
  };

  // Proxy endpoints
  app.all("/api/proxy/*", proxyHandler);
  app.all("/api-proxy/*", proxyHandler);

  // Real data extraction endpoints
  app.get("/api/countries", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=1800"); // 30 minutes
    
    const cached = getCached("countries");
    if (cached) return res.json(cached);

    console.log("[API] Fetching countries from Wafid...");
    try {
      // Use getWafidSession to get valid cookies and bypass 403
      const { cookie: cookieString, userAgent: ua, chHeaders } = await getWafidSession();
      
      const response = await axios.get("https://wafid.com/en/book-appointment/", {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Referer": "https://wafid.com/en/",
          "Cookie": cookieString,
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          ...chHeaders
        },
        timeout: 20000,
        validateStatus: (status) => status < 500 
      });

      if (response.status === 403) {
        console.warn("Wafid returned 403 Forbidden for countries. Using fallback.");
        const fallback = getFallbackCountries();
        setCached("countries", fallback);
        return res.json(fallback);
      }

      const $ = cheerio.load(response.data);
      const countries: { code: string; name: string }[] = [];
      
      // Look for country dropdown - common patterns
      $('select[name="country"] option, select#country option, select.country option, #id_country option').each((_, el) => {
        const code = $(el).val() as string;
        const name = $(el).text().trim();
        if (code && code !== "0" && code !== "" && name && !name.toLowerCase().includes("select")) {
          countries.push({ code, name });
        }
      });

      console.log(`Scraped ${countries.length} countries from Wafid. First few:`, countries.slice(0, 3));

      if (countries.length === 0) {
        // Try searching for JSON data in scripts
        const scriptContent = $('script').text();
        const countryMatch = scriptContent.match(/countries\s*=\s*(\[.*?\]);/s);
        if (countryMatch) {
          try {
            const parsed = JSON.parse(countryMatch[1]);
            if (Array.isArray(parsed)) {
              parsed.forEach(c => {
                if (c.id && c.name) countries.push({ code: String(c.id), name: c.name });
              });
            }
          } catch (e) {}
        }
      }

      if (countries.length === 0) {
        console.warn("Scraping failed, using fallback countries.");
        const fallback = getFallbackCountries();
        setCached("countries", fallback);
        return res.json(fallback);
      }

      setCached("countries", countries);
      res.json(countries);
    } catch (error: any) {
      console.error("Failed to fetch countries:", error.message);
      const fallback = getFallbackCountries();
      setCached("countries", fallback);
      res.json(fallback);
    }
  });

  app.get("/api/travelling-to", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=1800"); // 30 minutes
    
    const cached = getCached("travelling-to");
    if (cached) return res.json(cached);

    console.log("[API] Fetching travelling-to countries from Wafid...");
    try {
      const { cookie: cookieString, userAgent: ua, chHeaders } = await getWafidSession();
      
      const response = await axios.get("https://wafid.com/en/book-appointment/", {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Referer": "https://wafid.com/en/",
          "Cookie": cookieString,
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          ...chHeaders
        },
        timeout: 20000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 403) {
        console.warn("Wafid returned 403 Forbidden for travelling-to. Using fallback.");
        const fallback = getFallbackTravellingTo();
        setCached("travelling-to", fallback);
        return res.json(fallback);
      }

      const $ = cheerio.load(response.data);
      const countries: { code: string; name: string }[] = [];
      
      $('select[name="travelling_to"] option, select#travelling_to option, #id_travelling_to option').each((_, el) => {
        const code = $(el).val() as string;
        const name = $(el).text().trim();
        if (code && code !== "0" && code !== "" && name && !name.toLowerCase().includes("select")) {
          countries.push({ code, name });
        }
      });

      console.log(`Scraped ${countries.length} travelling-to countries from Wafid. First few:`, countries.slice(0, 3));

      if (countries.length === 0) {
        console.warn("Scraping travelling-to failed, using fallback.");
        const fallback = getFallbackTravellingTo();
        setCached("travelling-to", fallback);
        return res.json(fallback);
      }

      setCached("travelling-to", countries);
      res.json(countries);
    } catch (error: any) {
      console.error("Failed to fetch travelling countries:", error.message);
      const fallback = getFallbackTravellingTo();
      setCached("travelling-to", fallback);
      res.json(fallback);
    }
  });

  function getFallbackCountries() {
    return [
      { code: "BD", name: "Bangladesh" },
      { code: "IN", name: "India" },
      { code: "PAK", name: "Pakistan" },
      { code: "PHL", name: "Philippines" },
      { code: "EGY", name: "Egypt" },
      { code: "ETH", name: "Ethiopia" },
      { code: "IDN", name: "Indonesia" },
      { code: "LKA", name: "Sri Lanka" },
      { code: "NPL", name: "Nepal" },
      { code: "TUR", name: "Turkey" }
    ];
  }

  function getFallbackTravellingTo() {
    return [
      { code: "BH", name: "Bahrain" },
      { code: "KW", name: "Kuwait" },
      { code: "OM", name: "Oman" },
      { code: "QA", name: "Qatar" },
      { code: "SA", name: "Saudi Arabia" },
      { code: "UAE", name: "UAE" },
      { code: "YEM", name: "Yemen" }
    ];
  }

  let sessionCache = {
    cookie: "",
    csrfToken: "",
    userAgent: "",
    chHeaders: {} as any,
    timestamp: 0
  };

  let pendingSessionPromise: Promise<{ cookie: string; csrfToken: string; userAgent: string; chHeaders: any }> | null = null;

  async function getWafidSession(forceFresh = false, retries = 8): Promise<{ cookie: string; csrfToken: string; userAgent: string; chHeaders: any }> {
    const now = Date.now();
    if (!forceFresh && sessionCache.cookie && sessionCache.csrfToken && (now - sessionCache.timestamp < 15 * 60 * 1000)) {
      return { 
        cookie: sessionCache.cookie, 
        csrfToken: sessionCache.csrfToken,
        userAgent: sessionCache.userAgent,
        chHeaders: sessionCache.chHeaders
      };
    }

    if (pendingSessionPromise && !forceFresh) {
      return pendingSessionPromise;
    }

    pendingSessionPromise = (async () => {
      try {
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
        ];
        
        return await performSessionFetch(forceFresh, retries, userAgents);
      } finally {
        pendingSessionPromise = null;
      }
    })();

    return pendingSessionPromise;
  }

  async function performSessionFetch(forceFresh: boolean, retries: number, userAgents: string[]) {
    const uaData: Record<string, any> = {
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36": {
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"'
      },
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36": {
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"'
      },
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36": {
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"'
      }
    };

    // Use a Map to track cookies and deduplicate them
    const cookieMap = new Map<string, string>();
    let csrfToken = "";

    const updateCookies = (setCookieHeader: string[] | undefined) => {
      if (!setCookieHeader) return;
      setCookieHeader.forEach(cookie => {
        const parts = cookie.split(';')[0].split('=');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          if (name && value) {
            cookieMap.set(name, value);
            // If it's a csrftoken cookie, update the token immediately
            if (name.toLowerCase() === 'csrftoken') {
              csrfToken = value;
            }
          }
        }
      });
    };

    for (let i = 0; i <= retries; i++) {
      try {
        const ua = userAgents[i % userAgents.length];
        const chHeaders = uaData[ua] || {};
        console.log(`[Session] Fetching session (attempt ${i + 1})... UA: ${ua.substring(0, 30)}...`);

        // 0. Stealth probe - try a static asset or robots.txt first to get initial cookies
        if (i === 0 || i % 2 === 1) {
          console.log("[Session] Stealth probe to robots.txt...");
          const probeResponse = await axios.get("https://wafid.com/robots.txt", {
            headers: {
              "User-Agent": ua,
              "Accept": "text/plain,*/*",
              "Referer": "https://www.google.com/",
              "Accept-Language": "en-US,en;q=0.9",
              ...chHeaders
            },
            timeout: 10000,
            validateStatus: () => true
          }).catch(() => null);
          
          if (probeResponse) {
            updateCookies(probeResponse.headers['set-cookie']);
            console.log(`[Session] Probe status: ${probeResponse.status}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
        }

        // 1. Warm-up request - Start from home page to look more human
        const entryPoints = [
          "https://wafid.com/en/",
          "https://wafid.com/",
          "https://wafid.com/en/book-appointment/"
        ];
        const entryPoint = entryPoints[i % entryPoints.length];
        console.log(`[Session] Warm-up request to: ${entryPoint}`);
        
        const warmUpResponse = await axios.get(entryPoint, {
          headers: {
            "Host": "wafid.com",
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Referer": "https://www.google.com/",
            "Cookie": Array.from(cookieMap.entries()).map(([n, v]) => `${n}=${v}`).join('; '),
            ...chHeaders
          },
          timeout: 15000,
          validateStatus: () => true
        });

        console.log(`[Session] Warm-up status: ${warmUpResponse.status}`);

        if (warmUpResponse.status === 403) {
          console.warn(`[Session] Warm-up blocked (403) on attempt ${i + 1}.`);
          
          // Try fetching a static asset first to see if we can get a cookie
          console.log("[Session] Trying static asset fallback...");
          const assetResponse = await axios.get("https://wafid.com/static/images/logo.png", {
            headers: {
              "User-Agent": ua,
              "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
              "Referer": "https://wafid.com/",
              "Cookie": Array.from(cookieMap.entries()).map(([n, v]) => `${n}=${v}`).join('; '),
              ...chHeaders
            },
            timeout: 10000,
            validateStatus: () => true
          }).catch(() => null);
          
          if (assetResponse) {
            updateCookies(assetResponse.headers['set-cookie']);
          }

          const delay = Math.pow(2, i) * 6000 + Math.random() * 4000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        updateCookies(warmUpResponse.headers['set-cookie']);
        
        // If we didn't start at the booking page, go there now
        if (!entryPoint.includes("book-appointment")) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
          console.log("[Session] Navigating to booking page...");
          const bookingPageResponse = await axios.get("https://wafid.com/en/book-appointment/", {
            headers: {
              "User-Agent": ua,
              "Referer": entryPoint,
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Cookie": Array.from(cookieMap.entries()).map(([n, v]) => `${n}=${v}`).join('; '),
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "same-origin",
              "Sec-Fetch-User": "?1",
              ...chHeaders
            },
            timeout: 15000,
            validateStatus: () => true
          });
          
          if (bookingPageResponse.status === 403) {
            console.warn(`[Session] Booking page blocked (403) on attempt ${i + 1}.`);
            const delay = Math.pow(2, i) * 4000 + Math.random() * 3000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          updateCookies(bookingPageResponse.headers['set-cookie']);
        }

        let currentCookieString = Array.from(cookieMap.entries()).map(([n, v]) => `${n}=${v}`).join('; ');

        // Skip assets on first attempt to speed up
        if (i > 0) {
          // 1.5 Fetch common assets
          const assets = [
            "https://wafid.com/static/images/logo.png",
            "https://wafid.com/favicon.ico",
            "https://wafid.com/static/css/main.css",
            "https://wafid.com/static/vendor/jquery.min.js",
            "https://wafid.com/static/jsi18n/en/djangojs.js",
            "https://wafid.com/static/vendor/semantic/dist/semantic.min.css",
            "https://wafid.com/static/css/semantic-responsive.css",
            "https://wafid.com/static/css/components/forms.css",
            "https://wafid.com/static/js/main.js",
            "https://www.google.com/recaptcha/api.js?render=6LflPAwnAAAAAL2wBGi6tSyGUyj-xFvftINOR9xp"
          ];
          
          for (const asset of assets) {
            await axios.get(asset, {
              headers: {
                "User-Agent": ua,
                "Accept": "*/*",
                "Referer": "https://wafid.com/en/book-appointment/",
                "Cookie": currentCookieString,
                ...chHeaders
              },
              timeout: 5000,
              validateStatus: () => true
            }).catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
          }
        }

        // Small human-like delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        // 2. Fetch the booking page using the cookies from the home page
        const response = await axios.get("https://wafid.com/en/book-appointment/", {
          headers: {
            "Host": "wafid.com",
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9,en-GB;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Referer": "https://wafid.com/",
            "Cookie": currentCookieString,
            "Upgrade-Insecure-Requests": "1",
            "DNT": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
            ...chHeaders
          },
          timeout: 20000,
          validateStatus: () => true
        });

        updateCookies(response.headers['set-cookie']);
        let cookieString = Array.from(cookieMap.entries()).map(([n, v]) => `${n}=${v}`).join('; ');
        
        const $ = cheerio.load(response.data);
        
        // Extract nationalities
        const nationalities: { id: string; name: string }[] = [];
        $('select[name="nationality"] option').each((_, el) => {
          const id = $(el).val() as string;
          const name = $(el).text().trim();
          if (id && name && name !== "Select Nationality") {
            nationalities.push({ id, name });
          }
        });
        
        if (nationalities.length > 0) {
          console.log(`[Session] Extracted ${nationalities.length} nationalities.`);
          // Store in a global variable for use in the API
          (global as any).wafidNationalities = nationalities;
        }

        // 1. Try input field (standard Django)
        csrfToken = $('input[name="csrfmiddlewaretoken"]').val() as string;
        
        // 2. Try meta tag
        if (!csrfToken) {
          csrfToken = $('meta[name="csrf-token"]').attr('content') || 
                      $('meta[name="csrf-middleware-token"]').attr('content') ||
                      $('meta[name="csrf-token"]').attr('value');
        }
        
        // 3. Try searching in scripts
        if (!csrfToken) {
          const scriptContent = $('script').text();
          const match = scriptContent.match(/csrfmiddlewaretoken["']:\s*["']([^"']+)["']/i) ||
                        scriptContent.match(/csrfToken["']:\s*["']([^"']+)["']/i);
          if (match) csrfToken = match[1];
        }
        
        // 4. Try cookies
        if (!csrfToken) {
          csrfToken = cookieMap.get('csrftoken') || "";
        }
        
        // If still not found, try fetching the home page specifically for CSRF
        if (!csrfToken && i === 0) {
          console.log("[Session] CSRF not found on booking page, trying home page again...");
          const homeResponse = await axios.get("https://wafid.com/en/", {
            headers: { 
              "User-Agent": ua,
              "Referer": "https://wafid.com/en/book-appointment/",
              "Cookie": cookieString,
              ...chHeaders
            },
            timeout: 10000,
            validateStatus: () => true
          });
          updateCookies(homeResponse.headers['set-cookie']);
          csrfToken = cookieMap.get('csrftoken') || "";
          cookieString = Array.from(cookieMap.entries()).map(([n, v]) => `${n}=${v}`).join('; ');
        }

        if (csrfToken) {
          // Sync token to cookie if missing or different
          cookieMap.set('csrftoken', csrfToken);
          cookieString = Array.from(cookieMap.entries()).map(([n, v]) => `${n}=${v}`).join('; ');

          console.log(`[Session] Real CSRF Token Extracted: ${csrfToken}`);
          sessionCache = {
            cookie: cookieString,
            csrfToken: csrfToken,
            userAgent: ua,
            chHeaders: chHeaders,
            timestamp: Date.now()
          };
          return { cookie: cookieString, csrfToken, userAgent: ua, chHeaders };
        }

        console.warn(`[Session] Attempt ${i + 1} failed. Status: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (i + 1)));
      } catch (error: any) {
        console.error(`[Session] Error on attempt ${i + 1}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (i + 1)));
      }
    }
    
    console.error("[Session] All retries exhausted.");
    throw new Error("Failed to establish session after all retries.");
  }

  app.get("/api/cities/:countryCode", async (req, res) => {
    const { countryCode } = req.params;
    const { travellingTo } = req.query;
    res.setHeader("Cache-Control", "public, max-age=1800"); // 30 minutes
    
    const cacheKey = `cities-${countryCode}-${travellingTo}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    console.log(`[API] Fetching cities for country ${countryCode}, destination ${travellingTo}...`);
    
    try {
      const { cookie, csrfToken, userAgent, chHeaders } = await getWafidSession();
      
      // Try multiple variations of the country and destination codes
      const countryVariations = [countryCode];
      const destVariations = [travellingTo];
      
      if (countryCode === "BD" || countryCode === "1") {
        if (!countryVariations.includes("BD")) countryVariations.push("BD");
        if (!countryVariations.includes("1")) countryVariations.push("1");
      }
      if (countryCode === "IN" || countryCode === "ACT" || countryCode === "2") {
        if (!countryVariations.includes("IN")) countryVariations.push("IN");
        if (!countryVariations.includes("ACT")) countryVariations.push("ACT");
        if (!countryVariations.includes("2")) countryVariations.push("2");
      }
      if (countryCode === "PAK" || countryCode === "3") {
        if (!countryVariations.includes("PAK")) countryVariations.push("PAK");
        if (!countryVariations.includes("3")) countryVariations.push("3");
      }

      if (travellingTo === "SA") {
        if (!destVariations.includes("SA")) destVariations.push("SA");
      }
      if (travellingTo === "UAE") {
        if (!destVariations.includes("UAE")) destVariations.push("UAE");
      }
      if (travellingTo === "KW") {
        if (!destVariations.includes("KW")) destVariations.push("KW");
      }

      for (const cVar of countryVariations) {
        for (const dVar of destVariations) {
          const urls = [
            `https://wafid.com/en/book-appointment/get-cities/?country=${cVar}&travelling_to=${dVar}`,
            `https://wafid.com/en/book-appointment/get-cities/?country_id=${cVar}&travelling_to=${dVar}`,
            `https://wafid.com/en/book-appointment/get-cities/?country=${cVar}&travelling_to_id=${dVar}`
          ];

          for (const url of urls) {
            try {
              // Small delay between URL attempts
              await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
              
              const response = await axios.get(url, {
                headers: {
                  "User-Agent": userAgent,
                  "X-Requested-With": "XMLHttpRequest",
                  "Referer": "https://wafid.com/en/book-appointment/",
                  "Accept": "application/json, text/javascript, */*; q=0.01",
                  "X-Csrftoken": csrfToken,
                  "Cookie": cookie,
                  ...chHeaders,
                  "Sec-Fetch-Dest": "empty",
                  "Sec-Fetch-Mode": "cors",
                  "Sec-Fetch-Site": "same-origin"
                },
                timeout: 15000,
                validateStatus: () => true
              });

              console.log(`[API] City fetch status: ${response.status} for URL: ${url}`);
              if (response.status !== 200) {
                console.log(`[API] City response preview: ${String(response.data).substring(0, 100)}`);
              }

              let data = response.data;
              if (data && !Array.isArray(data) && data.cities) data = data.cities;

              if (response.status === 200 && Array.isArray(data) && data.length > 0) {
                console.log(`[API] Success: ${data.length} cities found for ${cVar}/${dVar}.`);
                setCached(cacheKey, data);
                return res.json(data);
              }
            } catch (err: any) {
              console.warn(`[API] City URL failed: ${err.message}`);
            }
          }
        }
      }
      
      console.warn(`[API] Failed to fetch real cities for ${countryCode}, using fallback.`);
      const fallback = getFallbackCities(countryCode as string);
      setCached(cacheKey, fallback);
      res.json(fallback); 
    } catch (error: any) {
      console.error(`[API] Error in cities endpoint: ${error.message}`);
      const fallback = getFallbackCities(countryCode as string);
      setCached(cacheKey, fallback);
      res.json(fallback);
    }
  });

  app.get("/api/centers/:cityId", async (req, res) => {
    const { cityId } = req.params;
    const { country, travellingTo } = req.query;
    res.setHeader("Cache-Control", "public, max-age=1800"); // 30 minutes
    
    const cacheKey = `centers-${cityId}-${country}-${travellingTo}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    console.log(`[API] Fetching centers for city ${cityId}, country ${country}, destination ${travellingTo}...`);
    
    try {
      const { cookie, csrfToken, userAgent, chHeaders } = await getWafidSession();
      
      // Try multiple variations of the country and destination codes
      const countryVariations = [country];
      const destVariations = [travellingTo];
      
      if (country === "BD" || country === "1") {
        if (!countryVariations.includes("BD")) countryVariations.push("BD");
        if (!countryVariations.includes("1")) countryVariations.push("1");
      }
      if (country === "IN" || country === "ACT" || country === "2") {
        if (!countryVariations.includes("IN")) countryVariations.push("IN");
        if (!countryVariations.includes("ACT")) countryVariations.push("ACT");
        if (!countryVariations.includes("2")) countryVariations.push("2");
      }
      if (country === "PAK" || country === "3") {
        if (!countryVariations.includes("PAK")) countryVariations.push("PAK");
        if (!countryVariations.includes("3")) countryVariations.push("3");
      }

      if (travellingTo === "SA") {
        if (!destVariations.includes("SA")) destVariations.push("SA");
      }
      if (travellingTo === "UAE") {
        if (!destVariations.includes("UAE")) destVariations.push("UAE");
      }
      if (travellingTo === "KW") {
        if (!destVariations.includes("KW")) destVariations.push("KW");
      }

      for (const cVar of countryVariations) {
        for (const dVar of destVariations) {
          const urls = [
            `https://wafid.com/en/book-appointment/get-medical-centers/?city=${cityId}&country=${cVar}&travelling_to=${dVar}`,
            `https://wafid.com/en/book-appointment/get-medical-centers/?city_id=${cityId}&country_id=${cVar}&travelling_to=${dVar}`,
            `https://wafid.com/en/book-appointment/get-medical-centers/?city=${cityId}&country=${cVar}&travelling_to_id=${dVar}`
          ];

          for (const url of urls) {
            try {
              // Small delay between URL attempts
              await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

              const response = await axios.get(url, {
                headers: {
                  "User-Agent": userAgent,
                  "X-Requested-With": "XMLHttpRequest",
                  "Referer": "https://wafid.com/en/book-appointment/",
                  "Accept": "application/json, text/javascript, */*; q=0.01",
                  "X-Csrftoken": csrfToken,
                  "Cookie": cookie,
                  ...chHeaders,
                  "Sec-Fetch-Dest": "empty",
                  "Sec-Fetch-Mode": "cors",
                  "Sec-Fetch-Site": "same-origin"
                },
                timeout: 15000,
                validateStatus: () => true
              });

              console.log(`[API] Center fetch status: ${response.status} for URL: ${url}`);
              if (response.status !== 200) {
                console.log(`[API] Center response preview: ${String(response.data).substring(0, 100)}`);
              }

              let data = response.data;
              if (data && !Array.isArray(data) && data.centers) data = data.centers;

              if (response.status === 200 && Array.isArray(data) && data.length > 0) {
                console.log(`[API] Success: ${data.length} centers found for ${cVar}/${dVar}.`);
                setCached(cacheKey, data);
                return res.json(data);
              }
            } catch (err: any) {
              console.warn(`[API] Center URL failed: ${err.message}`);
            }
          }
        }
      }
      
      console.warn(`[API] Failed to fetch real centers for ${cityId}, using fallback.`);
      const fallback = getFallbackCenters(cityId as string);
      setCached(cacheKey, fallback);
      res.json(fallback); 
    } catch (error: any) {
      console.error(`[API] Error in centers endpoint: ${error.message}`);
      const fallback = getFallbackCenters(cityId as string);
      setCached(cacheKey, fallback);
      res.json(fallback);
    }
  });

  function getFallbackCities(countryCode: string) {
    const fallbacks: Record<string, any[]> = {
      "BD": [
        { id: "2031", name: "Barishal" },
        { id: "2061", name: "Chandpur" },
        { id: "81", name: "Chitagong" },
        { id: "2033", name: "Cox's Bazar" },
        { id: "2032", name: "Cumilla" },
        { id: "80", name: "Dhaka" },
        { id: "2030", name: "Rajshahi" },
        { id: "2059", name: "Sherpur" },
        { id: "83", name: "Sylhet" }
      ],
      "1": [ // Bangladesh numeric ID
        { id: "2031", name: "Barishal" },
        { id: "2061", name: "Chandpur" },
        { id: "81", name: "Chitagong" },
        { id: "2033", name: "Cox's Bazar" },
        { id: "2032", name: "Cumilla" },
        { id: "80", name: "Dhaka" },
        { id: "2030", name: "Rajshahi" },
        { id: "2059", name: "Sherpur" },
        { id: "83", name: "Sylhet" }
      ],
      "ACT": [
        { id: "66", name: "Delhi" },
        { id: "63", name: "Mumbai" },
        { id: "67", name: "Hyderabad" },
        { id: "64", name: "Chennai" },
        { id: "65", name: "Kolkata" },
        { id: "68", name: "Bangalore" },
        { id: "69", name: "Ahmedabad" },
        { id: "70", name: "Lucknow" },
        { id: "71", name: "Jaipur" },
        { id: "72", name: "Cochin" }
      ],
      "2": [ // India numeric ID
        { id: "66", name: "Delhi" },
        { id: "63", name: "Mumbai" },
        { id: "67", name: "Hyderabad" },
        { id: "64", name: "Chennai" },
        { id: "65", name: "Kolkata" },
        { id: "68", name: "Bangalore" },
        { id: "69", name: "Ahmedabad" },
        { id: "70", name: "Lucknow" },
        { id: "71", name: "Jaipur" },
        { id: "72", name: "Cochin" }
      ],
      "PAK": [
        { id: "74", name: "Karachi" },
        { id: "75", name: "Lahore" },
        { id: "73", name: "Islamabad" },
        { id: "76", name: "Peshawar" },
        { id: "77", name: "Multan" },
        { id: "110", name: "Faisalabad" },
        { id: "111", name: "Quetta" }
      ],
      "3": [ // Pakistan numeric ID
        { id: "74", name: "Karachi" },
        { id: "75", name: "Lahore" },
        { id: "73", name: "Islamabad" },
        { id: "76", name: "Peshawar" },
        { id: "77", name: "Multan" },
        { id: "110", name: "Faisalabad" },
        { id: "111", name: "Quetta" }
      ],
      "4": [ // Philippines
        { id: "120", name: "Manila" },
        { id: "121", name: "Cebu" },
        { id: "122", name: "Davao" }
      ],
      "5": [ // Egypt
        { id: "130", name: "Cairo" },
        { id: "131", name: "Alexandria" },
        { id: "132", name: "Giza" }
      ],
      "8": [ // Sri Lanka
        { id: "140", name: "Colombo" },
        { id: "141", name: "Kandy" }
      ],
      "9": [ // Nepal
        { id: "150", name: "Kathmandu" },
        { id: "151", name: "Pokhara" }
      ],
      "PHL": [
        { id: "120", name: "Manila" },
        { id: "121", name: "Cebu" },
        { id: "122", name: "Davao" }
      ],
      "EGY": [
        { id: "130", name: "Cairo" },
        { id: "131", name: "Alexandria" },
        { id: "132", name: "Giza" }
      ],
      "6": [ // Ethiopia
        { id: "160", name: "Addis Ababa" },
        { id: "161", name: "Dire Dawa" }
      ],
      "7": [ // Indonesia
        { id: "170", name: "Jakarta" },
        { id: "171", name: "Surabaya" },
        { id: "172", name: "Bandung" }
      ],
      "10": [ // Turkey
        { id: "180", name: "Istanbul" },
        { id: "181", name: "Ankara" },
        { id: "182", name: "Izmir" }
      ]
    };
    return fallbacks[countryCode] || [
      { id: "80", name: "Dhaka" },
      { id: "81", name: "Chittagong" },
      { id: "66", name: "Delhi" },
      { id: "63", name: "Mumbai" }
    ];
  }

  function getFallbackCenters(cityId: string) {
    const fallbacks: Record<string, any[]> = {
      "80": [ // Dhaka
        { id: "323", name: "Al-Madina Medical Services" },
        { id: "324", name: "Green Crescent Health Services" },
        { id: "325", name: "Gulshan Medicare - Dhaka" },
        { id: "326", name: "Saudi Bangladesh Services Company" },
        { id: "327", name: "Arabian Medical Center" },
        { id: "328", name: "Saimon Medical Centre" },
        { id: "6262", name: "Albustan Medical Center" },
        { id: "6136", name: "ALIF-LAM-MIM HEALTH SERVICES LTD" },
        { id: "6182", name: "ALTASHKHIS MARKAZ LIMITED" },
        { id: "6171", name: "AMIR JAHAN MEDICAL CENTER" },
        { id: "9070", name: "M. RAHMAN MEDICAL & DIAGNOSTIC CENTER" },
        { id: "9095", name: "Vita Health Medical Center" },
        { id: "10104", name: "KGN Medicare Limited" },
        { id: "10121", name: "Precision Diagnostics Ltd" },
        { id: "10156", name: "SR Medical & Diagnostic Center" },
        { id: "10166", name: "HASAN MEDICAL SERVICE LTD." },
        { id: "329", name: "Ibn Sina Medical Check Up Unit" },
        { id: "10167", name: "Indigo Healthcare Ltd." },
        { id: "10203", name: "NEW KARAMA MEDICAL SERVICES" },
        { id: "10204", name: "MODERN MEDICAL CENTER" },
        { id: "10205", name: "ICON MEDICAL CENTRE" },
        { id: "10207", name: "Lotus Medical Centre" },
        { id: "10209", name: "City Medical Centre" },
        { id: "10212", name: "Fortune Medical Centre" },
        { id: "10237", name: "Lifeline Medical Centre" },
        { id: "10247", name: "Prime Medical Centre" },
        { id: "10288", name: "AL-BARAKAH MEDICAL CENTRE LIMITED" },
        { id: "330", name: "Al-Humyra Health Centre Ltd" },
        { id: "10378", name: "AOC Medical Center" },
        { id: "10401", name: "Medison Medical Services Limited" },
        { id: "10461", name: "CARBON MEDICAL CENTER" },
        { id: "10682", name: "AL MAHMUD MEDICAL CENTER" },
        { id: "10588", name: "Al Maktoum Health Care" },
        { id: "10595", name: "Al Qassimi Health Care" },
        { id: "10592", name: "AL TAWAF MEDICAL CENTER" },
        { id: "10533", name: "Aline Medical Services Ltd." },
        { id: "10553", name: "AMMAR MEDICAL CENTER" },
        { id: "10567", name: "AYAZ MEDICAL CENTER" },
        { id: "10591", name: "AZWA MEDICAL CENTRE" },
        { id: "10597", name: "BMS Medical Checkup Centre" },
        { id: "10562", name: "Catharsis Medical Centre Limited" },
        { id: "10600", name: "Central Health Checkup" },
        { id: "10563", name: "City Lab" },
        { id: "10615", name: "Dynamic Lab" },
        { id: "10554", name: "FUTURE MEDICAL" },
        { id: "10560", name: "Greenland Medical Center Limited" },
        { id: "10552", name: "Islamia Diagnostic Center" },
        { id: "332", name: "Al-Riyadh Medical Check up" },
        { id: "10627", name: "JG HEALTHCARE LIMITED" },
        { id: "10578", name: "LAB SCIENCE DIAGNOSTIC" },
        { id: "10670", name: "LAMIA MEDICAL HEALTH CHECKUP CENTRE" },
        { id: "10616", name: "LIFE-SCAN MEDICAL AND DIAGNOSTIC CENTER" },
        { id: "10614", name: "Medinet Medical Services" },
        { id: "10605", name: "MediPath Medical & Diagnostic Center" },
        { id: "10564", name: "MEEM MEDICAL CENTER" },
        { id: "10575", name: "MICARE HEALTH LIMITED" },
        { id: "10664", name: "MUSA HEALTH CHECKUP CENTRE" },
        { id: "10680", name: "MYSA MEDICAL SERVICES (PVT) LTD" },
        { id: "333", name: "Chandshi Medical Center" },
        { id: "10632", name: "PERFECT MEDICARE LTD." },
        { id: "10606", name: "True Health Medical And Diagnostic Center" },
        { id: "10569", name: "UNICARE MEDICAL SERVICES" },
        { id: "10580", name: "Union Health Center" },
        { id: "10590", name: "UNITY MEDICAL CHECKUP CENTRE" },
        { id: "10635", name: "UTTARA CRESCENT CLINIC (PVT) LTD" },
        { id: "10546", name: "ZAM ZAM MEDICAL CENTER" },
        { id: "10557", name: "Zara Health Care" },
        { id: "10540", name: "HYGIENIC HEALTH CARE" },
        { id: "10547", name: "Lifeline Diagnostic Services" },
        { id: "10566", name: "Sara Health Care" },
        { id: "10584", name: "EchoLab Medical Services" },
        { id: "10626", name: "Rainbow Hearts Medical Center Ltd" },
        { id: "10628", name: "Luminous Diagnostic" },
        { id: "10715", name: "RAMIN HEALTH CENTER" },
        { id: "10718", name: "CLEARVIEW MEDICAL AND DIAGNOSTIC CENTER" },
        { id: "10732", name: "LABWALL DIAGNOSTIC CENTER" },
        { id: "10735", name: "GENOMICS HEALTH CARE" },
        { id: "10744", name: "SHELTER POINT MEDICAL CENTER LTD." },
        { id: "10748", name: "MAJUMDER HEATLH CARE" },
        { id: "10775", name: "Al-Jazeera Medical Center" },
        { id: "10779", name: "Reliance Lab" },
        { id: "10785", name: "Sunmoon Medical Centre Ltd." },
        { id: "10786", name: "TRIPLE ZERO BANGLADESH LIMITED" },
        { id: "10787", name: "MEDSCAPE LAB" },
        { id: "10789", name: "CARE WAVE" },
        { id: "10790", name: "HUMAN DIAGNOSTIC & MEDICAL CENTRE LTD." },
        { id: "10792", name: "Wadi Health Checkup" },
        { id: "335", name: "Gulf Medical Center" },
        { id: "10794", name: "Elite Medical Center" },
        { id: "10797", name: "HOMETOWN HEALTH CARE" },
        { id: "10802", name: "IMARAH HEALTH CARE" },
        { id: "10804", name: "Prime Diagnostic Limited" },
        { id: "10866", name: "Al-Salma Medical Center" },
        { id: "10867", name: "Capital Medical Center" },
        { id: "10879", name: "SUROKKHA MEDICAL CENTER" },
        { id: "11889", name: "Evergreen Health" },
        { id: "11890", name: "Lifeline Health Care" },
        { id: "11891", name: "Warm Wellness Center" },
        { id: "336", name: "Health Care Center" },
        { id: "11892", name: "Purelife Health Care" },
        { id: "11898", name: "COMFORT MEDICAL CHECKUP CENTER" },
        { id: "11943", name: "AF MEDICAL CENTRE" },
        { id: "11964", name: "DAHMASHI MEDICAL CENTER" },
        { id: "10722", name: "AJ MEDICAL AND DIAGNOSTIC CENTER" },
        { id: "10699", name: "MyLab Medical and Diagnostic Centre Pvt. Ltd" },
        { id: "10734", name: "Mahtab Medical Center" },
        { id: "337", name: "Life Diagnostic Center" },
        { id: "338", name: "Muscat Medical Center" },
        { id: "339", name: "Makkha Medical Center" },
        { id: "340", name: "Medinova Medical Services Ltd" },
        { id: "342", name: "National Medical Center Limited" },
        { id: "344", name: "Nova Medical Center" },
        { id: "345", name: "Pulse Medical Center" },
        { id: "346", name: "Pushpo Clinic" },
        { id: "704", name: "Al Hayatt Medical Centre" },
        { id: "705", name: "Ishtiyaq Medical Center" },
        { id: "706", name: "Al-Nahda Medical Centre" },
        { id: "707", name: "The Classic Medical Centre Ltd" },
        { id: "708", name: "Allied Diagnostics Ltd" },
        { id: "709", name: "Paradyne Medical Centre" },
        { id: "710", name: "Ibn Rushd Medical Center" },
        { id: "711", name: "Unique Medical Centre" },
        { id: "712", name: "Standard Medical Centre" },
        { id: "713", name: "Leading Health Check up" },
        { id: "714", name: "SKN Health Services" },
        { id: "715", name: "Transworld Medical Center" },
        { id: "716", name: "Dhaka Crown Medical Centre" },
        { id: "717", name: "Al Mubasher Medical Diagnostic Services" },
        { id: "718", name: "Mohaimid Medical Center" },
        { id: "719", name: "Orbitals Medical Centre Limited" },
        { id: "720", name: "Bashundhara Medical Center" },
        { id: "722", name: "Rx Medical Centre" },
        { id: "723", name: "Tulip Medical Center" },
        { id: "6085", name: "ADVANCE HEALTH CARE" },
        { id: "6207", name: "ANAS MEDICAL CENTER" },
        { id: "6073", name: "Confidence Medical Centre" },
        { id: "6107", name: "DAWA MEDICAL CENTRE" },
        { id: "6188", name: "Evergreen Medical Center" },
        { id: "6265", name: "Global Medicare Diagnostics Ltd." },
        { id: "6260", name: "Healthcare Diagnostic Center Ltd" },
        { id: "6112", name: "IBN OMAR MEDICAL AND DIAGNOSTIC CENTER" },
        { id: "6134", name: "INDEX DIAGNOSTIC CENTER" },
        { id: "6090", name: "Kent Medical Services Ltd." },
        { id: "6170", name: "Khoulud Medical Check-up" },
        { id: "6165", name: "Al Arouba Medical Services P.Ltd" },
        { id: "6023", name: "LAB QUEST LIMITED" },
        { id: "6097", name: "Malancha Medical Services Ltd." },
        { id: "6118", name: "Moon Check-up OPC" },
        { id: "6181", name: "Mostafa Health Care" },
        { id: "6048", name: "NAFA MEDICAL CENTRE" },
        { id: "6176", name: "Nazrul Islam Diagnostic" },
        { id: "6144", name: "Overseas Health Checkup Ltd" },
        { id: "6184", name: "PACIFIC MEDICAL & DIAGNOSTIC CENTER" },
        { id: "6198", name: "Paramount Medical Centre" },
        { id: "6104", name: "Perlov Medical Services Ltd." },
        { id: "6016", name: "Al Jami Diagnostic Centre" },
        { id: "6122", name: "Saadiq Medical Services Ltd." },
        { id: "6151", name: "Safa Diagnostic Center" },
        { id: "6150", name: "Smart Medical Centre" },
        { id: "6075", name: "STAR MEDICAL AND DIAGNOSTIC CENTER" },
        { id: "6166", name: "WORLD HORIZON MEDICAL SERVICES LTD" },
        { id: "6124", name: "Zain Medical Limited" },
        { id: "6233", name: "Mohammdi Healthcare Systems Pvt. Ltd." },
        { id: "6217", name: "Namirah Medical Center" },
        { id: "6226", name: "Praava Health" },
        { id: "6100", name: "Al Mashoor Diagnostic Services" },
        { id: "6206", name: "Quest Medical Centre" },
        { id: "6201", name: "Saam Health Checkup Ltd" },
        { id: "6246", name: "SARA MEDICAL CENTER" },
        { id: "6231", name: "SARVOSHRESTHA MEDICAL CENTER" },
        { id: "6189", name: "YADAN MEDICAL" },
        { id: "6283", name: "Mediquest Diagnostics Ltd" },
        { id: "6255", name: "MediTest Medical Services" },
        { id: "6257", name: "RELYON MEDICARE" },
        { id: "6185", name: "PHOENIX MEDICAL CENTER" },
        { id: "6242", name: "AL-BAHA MEDICAL CENTER" },
        { id: "5860", name: "Stemz Helath Care (BD)ltd" }
      ],
      "81": [ // Chittagong
        { id: "360", name: "Chittagong Medical Center", address: "Chittagong, Bangladesh" },
        { id: "361", name: "Chevron Clinical Laboratory", address: "Chittagong, Bangladesh" },
        { id: "362", name: "Epic Health Care", address: "Chittagong, Bangladesh" },
        { id: "363", name: "CSCR Hospital", address: "Chittagong, Bangladesh" },
        { id: "364", name: "Metro Diagnostic Center", address: "Chittagong, Bangladesh" },
        { id: "365", name: "Sensiv Diagnostic Center", address: "Chittagong, Bangladesh" }
      ],
      "83": [ // Sylhet
        { id: "380", name: "Sylhet Medical Center", address: "Sylhet, Bangladesh" },
        { id: "381", name: "Oasis Hospital", address: "Sylhet, Bangladesh" },
        { id: "382", name: "Mount Adora Hospital", address: "Sylhet, Bangladesh" },
        { id: "383", name: "Trust Medical Services", address: "Sylhet, Bangladesh" }
      ],
      "66": [ // Delhi
        { id: "201", name: "Delhi Medical Center", address: "New Delhi, India" },
        { id: "202", name: "Apollo Clinics", address: "New Delhi, India" },
        { id: "203", name: "Max Healthcare", address: "New Delhi, India" },
        { id: "204", name: "Fortis Hospital", address: "New Delhi, India" },
        { id: "205", name: "Medanta The Medicity", address: "New Delhi, India" }
      ],
      "63": [ // Mumbai
        { id: "210", name: "Mumbai Medical Center", address: "Mumbai, India" },
        { id: "211", name: "Lilavati Hospital", address: "Mumbai, India" },
        { id: "212", name: "Kokilaben Dhirubhai Ambani Hospital", address: "Mumbai, India" },
        { id: "213", name: "Nanavati Max Super Speciality Hospital", address: "Mumbai, India" }
      ],
      "74": [ // Karachi
        { id: "301", name: "Karachi Medical Center", address: "Karachi, Pakistan" },
        { id: "302", name: "Aga Khan University Hospital", address: "Karachi, Pakistan" },
        { id: "303", name: "Liaquat National Hospital", address: "Karachi, Pakistan" },
        { id: "304", name: "South City Hospital", address: "Karachi, Pakistan" },
        { id: "305", name: "Indus Hospital", address: "Karachi, Pakistan" },
        { id: "306", name: "Ziauddin Hospital", address: "Karachi, Pakistan" },
        { id: "307", name: "National Medical Centre", address: "Karachi, Pakistan" }
      ],
      "75": [ // Lahore
        { id: "310", name: "Lahore Medical Center", address: "Lahore, Pakistan" },
        { id: "311", name: "Shaukat Khanum Memorial Cancer Hospital", address: "Lahore, Pakistan" },
        { id: "312", name: "Doctors Hospital", address: "Lahore, Pakistan" },
        { id: "313", name: "Hameed Latif Hospital", address: "Lahore, Pakistan" },
        { id: "314", name: "Ittefaq Hospital", address: "Lahore, Pakistan" },
        { id: "315", name: "Fatima Memorial Hospital", address: "Lahore, Pakistan" }
      ],
      "120": [ // Manila
        { id: "401", name: "Manila Medical Center", address: "Manila, Philippines" },
        { id: "402", name: "St. Luke's Medical Center", address: "Manila, Philippines" },
        { id: "403", name: "Makati Medical Center", address: "Manila, Philippines" },
        { id: "404", name: "The Medical City", address: "Manila, Philippines" }
      ],
      "130": [ // Cairo
        { id: "501", name: "Cairo Medical Center", address: "Cairo, Egypt" },
        { id: "502", name: "As-Salam International Hospital", address: "Cairo, Egypt" },
        { id: "503", name: "Dar Al Fouad Hospital", address: "Cairo, Egypt" },
        { id: "504", name: "Cleopatra Hospital", address: "Cairo, Egypt" }
      ],
      "140": [ // Colombo
        { id: "601", name: "Colombo Medical Center", address: "Colombo, Sri Lanka" },
        { id: "602", name: "Nawaloka Hospital", address: "Colombo, Sri Lanka" },
        { id: "603", name: "Asiri Surgical Hospital", address: "Colombo, Sri Lanka" }
      ],
      "150": [ // Kathmandu
        { id: "701", name: "Kathmandu Medical Center", address: "Kathmandu, Nepal" },
        { id: "702", name: "Norvic International Hospital", address: "Kathmandu, Nepal" },
        { id: "703", name: "Grande International Hospital", address: "Kathmandu, Nepal" }
      ],
      "160": [ // Addis Ababa
        { id: "801", name: "Addis Ababa Medical Center", address: "Addis Ababa, Ethiopia" },
        { id: "802", name: "Hayat Hospital", address: "Addis Ababa, Ethiopia" },
        { id: "803", name: "Landmark Hospital", address: "Addis Ababa, Ethiopia" }
      ],
      "170": [ // Jakarta
        { id: "901", name: "Jakarta Medical Center", address: "Jakarta, Indonesia" },
        { id: "902", name: "Siloam Hospitals", address: "Jakarta, Indonesia" },
        { id: "903", name: "Pondok Indah Hospital", address: "Jakarta, Indonesia" }
      ],
      "180": [ // Istanbul
        { id: "1001", name: "Istanbul Medical Center", address: "Istanbul, Turkey" },
        { id: "1002", name: "Acibadem Hospital", address: "Istanbul, Turkey" },
        { id: "1003", name: "Memorial Sisli Hospital", address: "Istanbul, Turkey" }
      ]
    };
    // If no specific city found, return a generic list for Bangladesh if cityId looks like a BD city
    if (!fallbacks[cityId] && (parseInt(cityId) >= 80 && parseInt(cityId) <= 89)) {
        return fallbacks["80"];
    }
    // If no specific city found, return a generic list for India if cityId looks like an IN city
    if (!fallbacks[cityId] && (parseInt(cityId) >= 63 && parseInt(cityId) <= 72)) {
        return fallbacks["66"];
    }
    // If no specific city found, return a generic list for Pakistan if cityId looks like a PAK city
    if (!fallbacks[cityId] && (parseInt(cityId) >= 73 && parseInt(cityId) <= 77 || parseInt(cityId) >= 110 && parseInt(cityId) <= 111)) {
        return fallbacks["74"];
    }
    // Generic fallbacks for other countries
    if (!fallbacks[cityId]) {
      const id = parseInt(cityId);
      if (id >= 120 && id <= 129) return fallbacks["120"]; // Philippines
      if (id >= 130 && id <= 139) return fallbacks["130"]; // Egypt
      if (id >= 140 && id <= 149) return fallbacks["140"]; // Sri Lanka
      if (id >= 150 && id <= 159) return fallbacks["150"]; // Nepal
      if (id >= 160 && id <= 169) return fallbacks["160"]; // Ethiopia
      if (id >= 170 && id <= 179) return fallbacks["170"]; // Indonesia
      if (id >= 180 && id <= 189) return fallbacks["180"]; // Turkey
    }

    return fallbacks[cityId] || [
      { id: "356", name: "ABC Diagnostic Center", address: "Main City, Wafid Approved" },
      { id: "353", name: "Medinova Medical Services", address: "Main City, Wafid Approved" },
      { id: "354", name: "Green Crescent Health Services", address: "Main City, Wafid Approved" },
      { id: "355", name: "Gulshan Medicare", address: "Main City, Wafid Approved" }
    ];
  }

  app.post("/api/book", async (req, res) => {
    const bookingData = req.body;
    console.log("Received booking request:", JSON.stringify(bookingData, null, 2));
    
    try {
      // 1. Get session cookies and CSRF token using the robust helper
      const { cookie: cookieString, csrfToken, userAgent, chHeaders } = await getWafidSession(true);

      if (!csrfToken) {
        console.warn("CSRF token not found, booking might fail.");
      }

      // 2. Map frontend fields to Wafid's expected field names based on real browser data
      const formData = new URLSearchParams();
      if (csrfToken) {
        formData.append("csrfmiddlewaretoken", csrfToken);
      }
      
      // Map numeric codes to string codes if necessary (for backward compatibility or user error)
      let country = bookingData.country || "";
      // User says "1" is wrong for "BD", so we map "1" to "BD"
      if (country === "1") {
        console.log("[Submission] Mapping country '1' to 'BD' as requested by user.");
        country = "BD";
      }
      
      let traveledCountry = bookingData.travellingCountry || "";
      // If travellingCountry is "1", it's likely a mistake or old ID, map to "SA" as a common destination
      if (traveledCountry === "1") {
        console.log("[Submission] Mapping travellingCountry '1' to 'SA' (Saudi Arabia) as a guess.");
        traveledCountry = "SA";
      }
      
      formData.append("country", country);
      formData.append("city", bookingData.city || "");
      // Wafid uses traveled_country in the POST request based on real website payload
      formData.append("traveled_country", traveledCountry);
      formData.append("traveled_country_id", traveledCountry); // Some versions use this
      formData.append("travelling_to", traveledCountry); // Some versions use this
      formData.append("appointment_type", bookingData.type || "standard");
      formData.append("premium_medical_center", bookingData.premiumCenterId || "");
      formData.append("medical_center", bookingData.centerId || "");
      
      console.log(`[Submission] Sending data for ${bookingData.firstName} ${bookingData.lastName} to Wafid...`);
      console.log(`[Submission] Country: ${country}, City: ${bookingData.city}, Destination: ${traveledCountry}`);
      
      formData.append("first_name", bookingData.firstName || "");
      formData.append("last_name", bookingData.lastName || "");
      formData.append("dob", bookingData.dob || "");
      
      let nationality = bookingData.nationality || "";
      if (nationality === "1") {
        console.log("[Submission] Mapping nationality '1' to 'BD'.");
        nationality = "BD";
      }
      formData.append("nationality", nationality);
      formData.append("gender", bookingData.gender || "");
      formData.append("marital_status", bookingData.maritalStatus || "");
      
      // Passport fields - Wafid uses both sometimes
      formData.append("passport", bookingData.passportNumber || "");
      formData.append("passport_number", bookingData.passportNumber || "");
      formData.append("confirm_passport", bookingData.confirmPassportNumber || "");
      formData.append("confirm_passport_number", bookingData.confirmPassportNumber || "");
      
      // Date fields - Wafid uses different names
      formData.append("passport_issue_date", bookingData.passportIssueDate || "");
      formData.append("passport_issue_on", bookingData.passportIssueDate || "");
      formData.append("passport_issue_place", bookingData.passportIssuePlace || "");
      formData.append("passport_expiry_on", bookingData.passportExpiryDate || "");
      formData.append("passport_expiry_date", bookingData.passportExpiryDate || "");
      
      formData.append("visa_type", bookingData.visaType || "");
      formData.append("email", bookingData.email || "");
      formData.append("phone", bookingData.phone || "");
      formData.append("national_id", bookingData.nationalId || "");
      formData.append("applied_position", bookingData.position || "");
      formData.append("applied_position_other", bookingData.positionOther || "");
      formData.append("otp_code", bookingData.otpCode || "");
      formData.append("captcha", bookingData.captcha || "");
      formData.append("g-recaptcha-response", bookingData.recaptchaResponse || "");
      formData.append("confirm", "on");

      // Simulate human delay before submission
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

      // 3. Submit the form to Wafid
      const response = await axios.post("https://wafid.com/en/book-appointment/", formData.toString(), {
        headers: {
          "authority": "wafid.com",
          "method": "POST",
          "path": "/en/book-appointment/",
          "scheme": "https",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": userAgent,
          "Origin": "https://wafid.com",
          "Referer": "https://wafid.com/en/book-appointment/",
          "Cookie": cookieString,
          "X-CSRFToken": csrfToken,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-US,en;q=0.9,en-GB;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "max-age=0",
          "DNT": "1",
          ...chHeaders,
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1"
        },
        maxRedirects: 0, 
        validateStatus: () => true
      });

      console.log(`Wafid submission response status: ${response.status}`);
      
      // Check for error messages in the body FIRST if it's a 200 status
      if (response.status === 200 && response.data) {
        const $ = cheerio.load(response.data);
        // Wafid often uses these classes for errors
        const errorMessage = $('.alert-danger, .errorlist, .error-message, .help-block.error, .text-danger').text().trim();
        
        // If we see an error message and no clear success indicator (like a pay link)
        const hasPayLink = $('a[href*="pay"], button[onclick*="pay"], form[action*="pay"]').length > 0;
        
        if (errorMessage && !hasPayLink) {
          console.warn(`Wafid returned 200 but with error message: ${errorMessage}`);
          return res.status(400).json({
            success: false,
            message: errorMessage,
            wafidStatus: 200
          });
        }
      }

      if (response.status !== 302 && response.data) {
        const preview = String(response.data).substring(0, 1000);
        console.log(`Wafid response body preview: ${preview}`);
      }

      let redirectUrl = response.headers['location'];
      let appointmentId = null;
      
      // If no redirect header but status is 200, check the body for payment links or appointment IDs
      if (response.status === 200 && response.data) {
        const $ = cheerio.load(response.data);
        
        // 1. Look for common payment link patterns in Wafid
        if (!redirectUrl) {
          const payLink = $('a[href*="pay"], button[onclick*="pay"], form[action*="pay"]').first();
          if (payLink.length > 0) {
            redirectUrl = payLink.attr('href') || payLink.attr('action');
            console.log(`Found potential payment link in body: ${redirectUrl}`);
          }
        }

        // 2. Try to extract appointment ID from the body if not in URL
        const bodyText = $('body').text();
        
        // Look for specific Wafid classes/IDs first
        const refElement = $('.ref-no, .appointment-id, .booking-reference, #ref-no, #appointment-id, .ref_no').first();
        if (refElement.length > 0) {
          const text = refElement.text().trim();
          const match = text.match(/([a-zA-Z0-9-]{10,25})/);
          if (match) {
            appointmentId = match[1];
            console.log(`Extracted appointment ID from specific element: ${appointmentId}`);
          }
        }

        if (!appointmentId) {
          // Wafid IDs are often alphanumeric, e.g., WMvBeaEMWGMeE39 (mixed case)
          // Some might have WFD- prefix or be pure numeric (8-12 digits)
          const idMatch = bodyText.match(/(?:Appointment|Reference|Ref|ID|Slip)\s*(?:Number|ID|Ref)?[:\s]*([a-zA-Z0-9-]{8,25})/i) ||
                          bodyText.match(/(WFD-[A-Z0-9-]{5,20})/i) ||
                          bodyText.match(/\b(\d{10,15})\b/); // Pure numeric ID
          
          if (idMatch) {
            const potentialId = idMatch[1] || idMatch[0];
            if (potentialId && 
                !/^(Appointment|Reference|Number|Details|Booking|Status|Pending|Success|Error|Failed|Warning|Information|Download|Print|Slip)$/i.test(potentialId) &&
                potentialId.length >= 8) {
              appointmentId = potentialId;
              console.log(`Extracted appointment ID from body text: ${appointmentId}`);
            }
          }
        }

        // 2.4 Look for payment URLs in scripts (window.location.href, etc)
        if (!redirectUrl) {
          const scripts = $('script').text();
          const locationMatch = scripts.match(/window\.location\.href\s*=\s*["']([^"']*pay[^"']*)["']/i) ||
                                scripts.match(/location\.assign\s*\(\s*["']([^"']*pay[^"']*)["']/i);
          if (locationMatch) {
            redirectUrl = locationMatch[1];
            console.log(`Extracted payment URL from script location: ${redirectUrl}`);
          }
        }

        // 2.5 Look for appointment URLs in the body
        if (!appointmentId) {
          const urlMatch = bodyText.match(/appointment\/([a-zA-Z0-9]{10,25})/i);
          if (urlMatch) {
            const potentialId = urlMatch[1];
            if (potentialId && !/^(Appointment|pay|details|slip|print|download|status)$/i.test(potentialId)) {
              appointmentId = potentialId;
              console.log(`Extracted appointment ID from URL in body: ${appointmentId}`);
            }
          }
        }

        // 2.6 Try to find ID in JSON-like structures in scripts
        if (!appointmentId) {
          const scripts = $('script').text();
          const jsonIdMatch = scripts.match(/["']appointment_id["']\s*:\s*["']([a-zA-Z0-9]{10,25})["']/i) ||
                              scripts.match(/["']ref_no["']\s*:\s*["']([a-zA-Z0-9]{10,25})["']/i);
          if (jsonIdMatch) {
            appointmentId = jsonIdMatch[1];
            console.log(`Extracted appointment ID from script JSON: ${appointmentId}`);
          }
        }

        // 3. Look for print slip links which often contain the ID
        if (!appointmentId) {
          const slipLink = $('a[href*="slip"], a[href*="print"], a[href*="download"]').first();
          if (slipLink.length > 0) {
            const href = slipLink.attr('href') || "";
            const hrefMatch = href.match(/\/([a-zA-Z0-9]{10,25})(?:\/|$)/i);
            if (hrefMatch) {
              appointmentId = hrefMatch[1];
              console.log(`Extracted appointment ID from slip link: ${appointmentId}`);
            }
          }
        }
      }

      if (redirectUrl) {
        console.log(`Wafid redirect URL found: ${redirectUrl}`);
        // Extract appointment ID from URL if possible
        const urlIdMatch = redirectUrl.match(/\/appointment\/([^\/]+)/);
        if (urlIdMatch) {
          const potentialId = urlIdMatch[1];
          if (potentialId && !/^(Appointment|pay|details|slip|print|download)$/i.test(potentialId)) {
            appointmentId = potentialId;
            console.log(`Extracted appointment ID from URL: ${appointmentId}`);
          }
        }
      }

      // Forward the response from Wafid
      if (response.status === 302 || response.status === 200 || (redirectUrl && response.status < 400)) {
        // Construct a real payment URL if we have a VALID appointment ID
        let paymentUrl = redirectUrl;
        const isValidId = appointmentId && !/^(Appointment|Reference|Number|Details|Booking|Status|Pending|pay|details|slip|print|download)$/i.test(appointmentId);
        
        if (isValidId && !paymentUrl) {
          paymentUrl = `https://wafid.com/en/appointment/${appointmentId}/pay/`;
          console.log(`Constructed real payment URL: ${paymentUrl}`);
        } else if (isValidId && paymentUrl && !paymentUrl.includes("/pay/")) {
          // If we have a link but it's not the pay link, try to construct it
          paymentUrl = `https://wafid.com/en/appointment/${appointmentId}/pay/`;
          console.log(`Updated to real payment URL: ${paymentUrl}`);
        }

        // Check for error messages in the body if it's a 200 status
        // (This is a secondary check, the primary one is now before extraction)
        if (response.status === 200 && response.data) {
          const $ = cheerio.load(response.data);
          const errorMessage = $('.alert-danger, .errorlist, .error-message, .help-block.error').text().trim();
          if (errorMessage && !redirectUrl && !appointmentId) {
            console.warn(`Wafid returned 200 but with error: ${errorMessage}`);
            return res.status(400).json({
              success: false,
              message: errorMessage,
              wafidStatus: 200
            });
          }
        }

        res.status(200).json({ 
          success: true, 
          message: "Booking submitted successfully", 
          wafidStatus: response.status,
          redirectUrl: paymentUrl || redirectUrl,
          appointmentId: appointmentId,
          paymentUrl: paymentUrl,
          data: response.data 
        });
      } else {
        res.status(response.status).json({ 
          success: false, 
          message: "Wafid returned an error", 
          wafidStatus: response.status,
          data: response.data 
        });
      }
    } catch (error: any) {
      console.error("Booking submission error:", error.message);
      res.status(500).json({ error: "Booking submission failed", message: error.message });
    }
  });

  // Start listening immediately to prevent proxy timeouts
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] API routes ready. Listening on http://localhost:${PORT}`);
    // Warm up the session in the background
    getWafidSession().catch(err => console.error("[Startup] Failed to warm up session:", err.message));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite middleware ready.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Server Error]", err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal Server Error",
      path: req.path
    });
  });
}

startServer();
