
import axios from 'axios';
import * as cheerio from 'cheerio';

async function findEndpoints() {
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  try {
    const response = await axios.get("https://wafid.com/en/book-appointment/", {
      headers: { 
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log("Searching for endpoints in HTML...");
    
    // Search for strings that look like endpoints
    const regex = /["']([^"']*(?:get-cities|get-medical-centers|get_cities|get_medical_centers)[^"']*)["']/g;
    let match;
    const found = new Set();
    while ((match = regex.exec(html)) !== null) {
      found.add(match[1]);
    }
    
    console.log("Found endpoints:", Array.from(found));
    
    // Also look for script tags that might contain URLs
    $('script').each((i, el) => {
      const content = $(el).text();
      if (content.includes('get-cities') || content.includes('get-medical-centers')) {
        console.log("\nFound script with potential endpoints:");
        console.log(content.substring(0, 500));
      }
    });

  } catch (error) {
    console.error("Error:", error.message);
  }
}

findEndpoints();
