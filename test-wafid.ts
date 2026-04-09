
import axios from 'axios';
import * as cheerio from 'cheerio';

async function testWafid() {
  console.log("Testing Wafid data fetching...");
  
  try {
    // 1. Get session
    console.log("Step 1: Getting session...");
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
    const response = await axios.get("https://wafid.com/en/book-appointment/", {
      headers: {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
      timeout: 15000,
    });

    const setCookie = response.headers['set-cookie'];
    const cookieMap = new Map();
    if (setCookie) {
      setCookie.forEach(c => {
        const parts = c.split(';')[0].split('=');
        cookieMap.set(parts[0].trim(), parts[1].trim());
      });
    }
    
    const cookieString = Array.from(cookieMap.entries()).map(([n, v]) => `${n}=${v}`).join('; ');
    const $ = cheerio.load(response.data);
    const csrfToken = $('input[name="csrfmiddlewaretoken"]').val() || cookieMap.get('csrftoken');

    console.log(`Session established. CSRF: ${csrfToken}, Cookies: ${cookieString.substring(0, 50)}...`);

    // 2. Try fetching cities for Bangladesh (ID 1) and Saudi Arabia (ID 1)
    console.log("\nStep 2: Fetching cities for Bangladesh (1) to Saudi Arabia (1)...");
    const cityUrl = `https://wafid.com/en/book-appointment/get-cities/?country=1&travelling_to=1`;
    const cityResponse = await axios.get(cityUrl, {
      headers: {
        "User-Agent": ua,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://wafid.com/en/book-appointment/",
        "X-Csrftoken": csrfToken,
        "Cookie": cookieString,
      },
      timeout: 10000,
    });

    console.log(`City response status: ${cityResponse.status}`);
    console.log(`City response data: ${JSON.stringify(cityResponse.data).substring(0, 200)}...`);

    if (Array.isArray(cityResponse.data)) {
        console.log(`Found ${cityResponse.data.length} cities.`);
    } else if (cityResponse.data.cities && Array.isArray(cityResponse.data.cities)) {
        console.log(`Found ${cityResponse.data.cities.length} cities (in .cities).`);
    }

    // 3. Try fetching centers for Dhaka (ID 80)
    console.log("\nStep 3: Fetching centers for Dhaka (80)...");
    const centerUrl = `https://wafid.com/en/book-appointment/get-medical-centers/?city=80&country=1&travelling_to=1`;
    const centerResponse = await axios.get(centerUrl, {
      headers: {
        "User-Agent": ua,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://wafid.com/en/book-appointment/",
        "X-Csrftoken": csrfToken,
        "Cookie": cookieString,
      },
      timeout: 10000,
    });

    console.log(`Center response status: ${centerResponse.status}`);
    console.log(`Center response data: ${JSON.stringify(centerResponse.data).substring(0, 200)}...`);
    
    if (Array.isArray(centerResponse.data)) {
        console.log(`Found ${centerResponse.data.length} centers.`);
    } else if (centerResponse.data.centers && Array.isArray(centerResponse.data.centers)) {
        console.log(`Found ${centerResponse.data.centers.length} centers (in .centers).`);
    }

  } catch (error) {
    console.error("Test failed:", error.message);
    if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
    }
  }
}

testWafid();
