
import { useState, useEffect, useCallback } from "react";
import { wafidService, Country, City, MedicalCenter, BookingResponse } from "../services/wafidService";

export interface AppError {
  message: string;
  type: "validation" | "network" | "server" | "wafid";
  retryAction?: () => void;
}

export interface WafidParams {
  country?: string;
  travellingTo?: string;
  city?: string;
}

export function useWafid(params: WafidParams = {}) {
  const { country, travellingTo, city } = params;
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [travellingCountries, setTravellingCountries] = useState<Country[]>([]);
  const [nationalities, setNationalities] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [centers, setCenters] = useState<MedicalCenter[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [liveStatus, setLiveStatus] = useState<"online" | "offline" | "checking">("checking");

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/health");
      if (response.ok) {
        setLiveStatus("online");
      } else {
        setLiveStatus("offline");
      }
    } catch (err) {
      setLiveStatus("offline");
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setFetchingData(true);
    setError(null);
    try {
      const [countriesData, travellingData, nationalitiesData] = await Promise.all([
        wafidService.getCountries(),
        wafidService.getTravellingCountries(),
        wafidService.getNationalities()
      ]);
      setCountries(countriesData);
      setTravellingCountries(travellingData);
      setNationalities(nationalitiesData);
    } catch (err: any) {
      console.error("Failed to fetch initial data:", err);
      setError({
        message: "Failed to load countries. Please check your connection.",
        type: "network",
        retryAction: fetchInitialData
      });
    } finally {
      setFetchingData(false);
    }
  }, []);

  const fetchCities = useCallback(async (countryCode: string, travellingToCode: string) => {
    if (!countryCode || !travellingToCode) {
      setCities([]);
      return;
    }
    
    setFetchingData(true);
    setError(null);
    try {
      const citiesData = await wafidService.getCities(countryCode, travellingToCode);
      setCities(citiesData);
    } catch (err: any) {
      console.error("Failed to fetch cities:", err);
      setError({
        message: "Failed to load cities for the selected location.",
        type: "network",
        retryAction: () => fetchCities(countryCode, travellingToCode)
      });
      setCities([]);
    } finally {
      setFetchingData(false);
    }
  }, []);

  const fetchCenters = useCallback(async (cityId: string, countryCode: string, travellingToCode: string) => {
    if (!cityId || !countryCode || !travellingToCode) {
      setCenters([]);
      return;
    }

    setFetchingData(true);
    setError(null);
    try {
      const centersData = await wafidService.getCenters(cityId, countryCode, travellingToCode);
      setCenters(centersData);
    } catch (err: any) {
      console.error("Failed to fetch centers:", err);
      setError({
        message: "Failed to load medical centers for the selected city.",
        type: "network",
        retryAction: () => fetchCenters(cityId, countryCode, travellingToCode)
      });
      setCenters([]);
    } finally {
      setFetchingData(false);
    }
  }, []);

  const submitBooking = async (data: any): Promise<{ success: boolean; redirectUrl?: string; appointmentId?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const result = await wafidService.submitBooking(data);
      if (result.success) {
        return { 
          success: true, 
          redirectUrl: result.redirectUrl,
          appointmentId: result.appointmentId
        };
      } else {
        setError({
          message: result.message || "Wafid returned an error. Please check your details.",
          type: "wafid"
        });
        return { success: false };
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      if (err.status) {
        setError({
          message: `Server Error (${err.status}): ${err.message}`,
          type: "server",
          retryAction: () => submitBooking(data)
        });
      } else {
        setError({
          message: "Network Error: Failed to connect to the booking server. Please check your internet.",
          type: "network",
          retryAction: () => submitBooking(data)
        });
      }
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchInitialData();
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [fetchInitialData, checkHealth]);

  // Automatic city fetch
  useEffect(() => {
    if (country && travellingTo) {
      fetchCities(country, travellingTo);
    } else {
      setCities([]);
      setCenters([]);
    }
  }, [country, travellingTo, fetchCities]);

  // Automatic center fetch
  useEffect(() => {
    if (city && country && travellingTo) {
      fetchCenters(city, country, travellingTo);
    } else {
      setCenters([]);
    }
  }, [city, country, travellingTo, fetchCenters]);

  return {
    countries,
    travellingCountries,
    nationalities,
    cities,
    centers,
    loading,
    fetchingData,
    error,
    liveStatus,
    setError,
    fetchCities,
    fetchCenters,
    submitBooking,
    setCities,
    setCenters
  };
}
