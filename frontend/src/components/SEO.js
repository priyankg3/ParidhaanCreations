import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO = ({ 
  title = "Paridhaan Creations - Traditional Indian Handicrafts & Jewellery",
  description = "Shop authentic Indian handicrafts, pooja articles, perfumes, and traditional jewellery. Discover handcrafted treasures by skilled artisans.",
  keywords = "Indian handicrafts, pooja items, traditional jewellery, perfumes, artificial jewellery, handicrafts online",
  image = "https://customer-assets.emergentagent.com/job_pooja-treasures-1/artifacts/2mx3yxer_Untitled%20design.png",
  type = "website",
  product = null,
  breadcrumbs = null
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

    // Remove existing JSON-LD scripts
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());

    // Add Organization structured data
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Paridhaan Creations",
      "url": window.location.origin,
      "logo": image,
      "description": "Shop authentic Indian handicrafts, pooja articles, perfumes, and traditional jewellery.",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Service",
        "availableLanguage": ["English", "Hindi"]
      },
      "sameAs": []
    };

    const orgScript = document.createElement('script');
    orgScript.type = 'application/ld+json';
    orgScript.textContent = JSON.stringify(organizationSchema);
    document.head.appendChild(orgScript);

    // Add WebSite structured data with search
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Paridhaan Creations",
      "url": window.location.origin,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${window.location.origin}/products?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };

    const siteScript = document.createElement('script');
    siteScript.type = 'application/ld+json';
    siteScript.textContent = JSON.stringify(websiteSchema);
    document.head.appendChild(siteScript);

    // Add Product structured data if product is provided
    if (product) {
      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": product.description,
        "image": product.images,
        "sku": product.product_id,
        "category": product.category,
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "INR",
          "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": "Paridhaan Creations"
          }
        }
      };

      if (product.rating) {
        productSchema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": product.rating,
          "reviewCount": product.reviewCount || 1
        };
      }

      const productScript = document.createElement('script');
      productScript.type = 'application/ld+json';
      productScript.textContent = JSON.stringify(productSchema);
      document.head.appendChild(productScript);
    }

    // Add BreadcrumbList structured data if breadcrumbs provided
    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": crumb.name,
          "item": `${window.location.origin}${crumb.url}`
        }))
      };

      const breadcrumbScript = document.createElement('script');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
      document.head.appendChild(breadcrumbScript);
    }

  }, [title, description, keywords, image, url, type, product, breadcrumbs]);

  return null;
};

export default SEO;
