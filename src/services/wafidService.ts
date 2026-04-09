
export interface Country {
  code: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
}

export interface MedicalCenter {
  id: string;
  name: string;
  address: string;
  status: string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  wafidStatus?: number;
  redirectUrl?: string;
  appointmentId?: string;
  data?: any;
}

const API_BASE = "/api";

async function fetchJsonWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<any> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        // If it's a 502/503/504, it's likely a transient proxy error, so retry
        if ([502, 503, 504].includes(response.status) && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // If we got HTML instead of JSON, it might be a transient proxy error or server restart
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        const text = await response.text();
        console.error(`[wafidService] Expected JSON but got HTML from ${url}. Preview:`, text.substring(0, 100));
        throw new Error("Server returned HTML instead of JSON. The server might be restarting or encountered an error.");
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) break;
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export const wafidService = {
  async getNationalities(): Promise<{ id: string; name: string }[]> {
    try {
      const url = `${window.location.origin}${API_BASE}/nationalities`;
      console.log(`[wafidService] Fetching nationalities from: ${url}`);
      return await fetchJsonWithRetry(url);
    } catch (error) {
      console.error("Error fetching nationalities:", error);
      return [
        { id: "15", name: "Bangladeshi" },
        { id: "1", name: "Indian" },
        { id: "2", name: "Pakistani" },
        { id: "3", name: "Filipino" },
        { id: "4", name: "Egyptian" },
        { id: "5", name: "Nepalese" },
        { id: "6", name: "Sri Lankan" }
      ];
    }
  },

  async getCountries(): Promise<Country[]> {
    const url = `${window.location.origin}${API_BASE}/countries`;
    console.log(`[wafidService] Fetching countries from: ${url}`);
    return await fetchJsonWithRetry(url);
  },

  async getTravellingCountries(): Promise<Country[]> {
    const url = `${window.location.origin}${API_BASE}/travelling-to`;
    console.log(`[wafidService] Fetching travelling countries from: ${url}`);
    return await fetchJsonWithRetry(url);
  },

  async getCities(countryCode: string, travellingTo: string): Promise<City[]> {
    const url = `${window.location.origin}${API_BASE}/cities/${countryCode}?travellingTo=${travellingTo}`;
    console.log(`[wafidService] Fetching cities from: ${url}`);
    const data = await fetchJsonWithRetry(url);
    
    if (!Array.isArray(data)) return [];
    
    return data.map((c: any) => ({
      id: String(c.id ?? c.city_id ?? c.value ?? ""),
      name: String(c.name || c.city_name || c.text || "Unknown City")
    })).filter(c => c.id !== "");
  },

  async getCenters(cityId: string, country: string, travellingTo: string): Promise<MedicalCenter[]> {
    const url = `${window.location.origin}${API_BASE}/centers/${cityId}?country=${country}&travellingTo=${travellingTo}`;
    console.log(`[wafidService] Fetching centers from: ${url}`);
    const data = await fetchJsonWithRetry(url);
    
    if (!Array.isArray(data)) return [];
    
    return data.map((c: any) => ({
      id: String(c.id ?? c.center_id ?? c.value ?? ""),
      name: String(c.name || c.center_name || c.text || "Unknown Center"),
      address: String(c.address || c.center_address || "Address not available"),
      status: String(c.status || c.center_status || "Available")
    })).filter(c => c.id !== "");
  },

  async submitBooking(data: any): Promise<BookingResponse> {
    const url = `${window.location.origin}${API_BASE}/book`;
    console.log(`[wafidService] Submitting booking to: ${url}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => ({}));
        throw { status: response.status, message: errorData.message || "Server error" };
      }
      throw { status: response.status, message: "Server returned an error page (HTML). The server might be busy or restarting." };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Expected JSON response from booking submission but got HTML.");
    }

    return response.json();
  }
};
