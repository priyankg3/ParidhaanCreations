import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";

const SiteSettingsContext = createContext(null);

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    header_logo: null,
    footer_logo: null,
    favicon: null,
    site_name: "Paridhaan Creations",
    tagline: "Traditional & Handicraft Store"
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching site settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('/api/')) {
      return `${API}${logoPath.replace('/api', '')}`;
    }
    return logoPath;
  };

  const refreshSettings = () => {
    fetchSettings();
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, getLogoUrl, refreshSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error("useSiteSettings must be used within a SiteSettingsProvider");
  }
  return context;
}
