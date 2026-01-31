import { useEffect } from "react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

/**
 * Component to dynamically update the favicon based on site settings
 */
export default function DynamicFavicon() {
  const { settings, getLogoUrl } = useSiteSettings();

  useEffect(() => {
    const faviconUrl = getLogoUrl(settings.favicon_url || settings.favicon);
    
    if (faviconUrl) {
      // Update all favicon link tags
      const updateFavicon = (selector, url) => {
        let link = document.querySelector(selector);
        if (link) {
          link.href = url;
        } else {
          link = document.createElement('link');
          link.rel = selector.includes('apple') ? 'apple-touch-icon' : 'icon';
          link.href = url;
          document.head.appendChild(link);
        }
      };

      // Update standard favicons
      updateFavicon('link[rel="icon"][sizes="32x32"]', faviconUrl);
      updateFavicon('link[rel="icon"][sizes="16x16"]', faviconUrl);
      updateFavicon('link[rel="apple-touch-icon"]', faviconUrl);
      
      // Also update the default favicon
      const defaultFavicon = document.querySelector('link[rel="icon"]:not([sizes])');
      if (defaultFavicon) {
        defaultFavicon.href = faviconUrl;
      }
    }
  }, [settings, getLogoUrl]);

  return null; // This component doesn't render anything
}
