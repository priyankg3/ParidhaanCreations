import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO_SITE_NAME = "Paridhaan Creations";
const SEO_BASE_URL = "https://paridhaan-crafts.preview.emergentagent.com";
const SEO_DEFAULT_IMAGE = "https://customer-assets.emergentagent.com/job_pooja-treasures-1/artifacts/2mx3yxer_Untitled%20design.png";

const SEO = ({ 
  title = "Paridhaan Creations - Traditional Indian Handicrafts, Pooja Items & Artificial Jewellery",
  description = "Shop authentic Indian handicrafts, brass pooja articles, and artificial jewellery at Paridhaan Creations. Handcrafted by skilled artisans. Free shipping on orders above ₹999.",
  keywords = "paridhaan creations, indian handicrafts, pooja items online, brass pooja thali, laddu gopal dress, artificial jewellery, kundan jewellery, incense sticks, decorative items, handmade crafts india",
  image = SEO_DEFAULT_IMAGE,
  type = "website",
  product = null,
  category = null,
  breadcrumbs = null,
  noindex = false
}) => {
  const location = useLocation();
  const url = `${SEO_BASE_URL}${location.pathname}`;

  useEffect(() => {
    // Update document title
    document.title = title.includes(SEO_SITE_NAME) ? title : `${title} | ${SEO_SITE_NAME}`;

    // Helper to update meta tags
    const updateMetaTag = (property, content, nameAttr = 'property') => {
      let element = document.querySelector(`meta[${nameAttr}="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic SEO Meta Tags
    updateMetaTag('description', description, 'name');
    updateMetaTag('keywords', keywords, 'name');
    updateMetaTag('author', SEO_SITE_NAME, 'name');
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large', 'name');

    // Open Graph Tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', image);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:url', url);
    updateMetaTag('og:type', type);
    updateMetaTag('og:site_name', SEO_SITE_NAME);
    updateMetaTag('og:locale', 'en_IN');

    // Twitter Card Tags
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', title, 'name');
    updateMetaTag('twitter:description', description, 'name');
    updateMetaTag('twitter:image', image, 'name');
    updateMetaTag('twitter:site', '@ParidhaaCreates', 'name');

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Clear existing JSON-LD scripts
    document.querySelectorAll('script[data-seo="dynamic"]').forEach(el => el.remove());

    // Add structured data scripts
    const addJsonLd = (data) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'dynamic');
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    };

    // Organization Schema (always present)
    addJsonLd({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": SEO_SITE_NAME,
      "alternateName": "Paridhaan",
      "url": SEO_BASE_URL,
      "logo": SEO_DEFAULT_IMAGE,
      "description": "Shop authentic Indian handicrafts, pooja articles, and artificial jewellery.",
      "foundingDate": "2024",
      "areaServed": "IN",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Service",
        "availableLanguage": ["English", "Hindi"]
      }
    });

    // WebSite Schema with SearchAction
    addJsonLd({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": SEO_SITE_NAME,
      "url": SEO_BASE_URL,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${SEO_BASE_URL}/products?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    });

    // Product Schema (for product pages)
    if (product) {
      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": product.description,
        "image": product.images || [],
        "sku": product.sku || product.product_id,
        "mpn": product.product_id,
        "brand": {
          "@type": "Brand",
          "name": product.brand || SEO_SITE_NAME
        },
        "category": product.category,
        "material": product.material || undefined,
        "color": product.color || undefined,
        "offers": {
          "@type": "Offer",
          "url": url,
          "price": product.price,
          "priceCurrency": "INR",
          "availability": product.stock > 0 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": SEO_SITE_NAME
          },
          "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingDestination": {
              "@type": "DefinedRegion",
              "addressCountry": "IN"
            },
            "deliveryTime": {
              "@type": "ShippingDeliveryTime",
              "handlingTime": {
                "@type": "QuantitativeValue",
                "minValue": 1,
                "maxValue": 2,
                "unitCode": "DAY"
              },
              "transitTime": {
                "@type": "QuantitativeValue",
                "minValue": 3,
                "maxValue": 7,
                "unitCode": "DAY"
              }
            }
          }
        }
      };

      if (product.rating && product.reviewCount) {
        productSchema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": product.rating,
          "reviewCount": product.reviewCount,
          "bestRating": 5,
          "worstRating": 1
        };
      }

      addJsonLd(productSchema);
    }

    // Category/Collection Schema
    if (category) {
      addJsonLd({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${category.name} - ${SEO_SITE_NAME}`,
        "description": category.description || `Shop ${category.name} at ${SEO_SITE_NAME}`,
        "url": url,
        "mainEntity": {
          "@type": "ItemList",
          "name": category.name,
          "numberOfItems": category.productCount || 0
        }
      });
    }

    // Breadcrumb Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      addJsonLd({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": crumb.name,
          "item": `${SEO_BASE_URL}${crumb.url}`
        }))
      });
    }

    // LocalBusiness Schema (for local SEO)
    if (location.pathname === '/') {
      addJsonLd({
        "@context": "https://schema.org",
        "@type": "Store",
        "name": SEO_SITE_NAME,
        "description": "Online store for traditional Indian handicrafts, pooja items and artificial jewellery",
        "url": SEO_BASE_URL,
        "logo": SEO_DEFAULT_IMAGE,
        "priceRange": "₹₹",
        "paymentAccepted": "Cash on Delivery, Credit Card, Debit Card, UPI, Net Banking",
        "currenciesAccepted": "INR",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "IN"
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Paridhaan Creations Products",
          "itemListElement": [
            { "@type": "OfferCatalog", "name": "Handicrafts" },
            { "@type": "OfferCatalog", "name": "Pooja Articles" },
            { "@type": "OfferCatalog", "name": "Artificial Jewellery" }
          ]
        }
      });
    }

  }, [title, description, keywords, image, url, type, product, category, breadcrumbs, noindex]);

  return null;
};

export default SEO;
