import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO = ({ 
  title = "Paridhaan Creations - Traditional Indian Handicrafts & Jewellery",
  description = "Shop authentic Indian handicrafts, pooja articles, perfumes, and traditional jewellery. Discover handcrafted treasures by skilled artisans.",
  keywords = "Indian handicrafts, pooja items, traditional jewellery, perfumes, artificial jewellery, handicrafts online",
  image = "https://customer-assets.emergentagent.com/job_pooja-treasures-1/artifacts/2mx3yxer_Untitled%20design.png",
  type = "website"
}) => {
  const location = useLocation();
  const url = `${window.location.origin}${location.pathname}`;

  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (property, content, nameAttr = 'property') => {
      let element = document.querySelector(`meta[${nameAttr}="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description, 'name');
    updateMetaTag('keywords', keywords, 'name');

    // Open Graph tags for social sharing
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', image);
    updateMetaTag('og:url', url);
    updateMetaTag('og:type', type);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', title, 'name');
    updateMetaTag('twitter:description', description, 'name');
    updateMetaTag('twitter:image', image, 'name');

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

  }, [title, description, keywords, image, url, type]);

  return null;
};

export default SEO;
