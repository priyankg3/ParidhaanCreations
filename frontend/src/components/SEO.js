import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO_SITE_NAME = "Paridhaan Creations";
const SEO_BASE_URL = "https://paridhaancreations.xyz";
const SEO_DEFAULT_IMAGE = "/logo-header.png";

const SEO = ({ 
  title = "Paridhaan Creations - Handicrafts, Pooja Articles & Traditional Decor",
  description = "Shop authentic Indian handicrafts, brass pooja articles, laddu gopal dresses, incense sticks & traditional decor at Paridhaan Creations. Handcrafted by artisans from Vrindavan. Free shipping above Rs.999.",
  keywords = "paridhaan creations, indian handicrafts, pooja items online, brass pooja thali, laddu gopal dress, incense sticks, decorative items, handmade crafts india, pooja samagri, vrindavan, temple decor",
  image = SEO_DEFAULT_IMAGE,
  type = "website",
  product = null,
  category = null,
  breadcrumbs = null,
  faq = null,
  noindex = false
}) => {
  const location = useLocation();
  const url = `${SEO_BASE_URL}${location.pathname}${location.search || ''}`;

  useEffect(() => {
    const fullTitle = title.includes(SEO_SITE_NAME) ? title : `${title} | ${SEO_SITE_NAME}`;
    document.title = fullTitle;

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
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1', 'name');

    // Open Graph Tags
    updateMetaTag('og:title', fullTitle);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', image);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:image:alt', fullTitle);
    updateMetaTag('og:url', url);
    updateMetaTag('og:type', type);
    updateMetaTag('og:site_name', SEO_SITE_NAME);
    updateMetaTag('og:locale', 'en_IN');
    updateMetaTag('og:locale:alternate', 'hi_IN');

    // Twitter Card Tags
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', fullTitle, 'name');
    updateMetaTag('twitter:description', description, 'name');
    updateMetaTag('twitter:image', image, 'name');
    updateMetaTag('twitter:image:alt', fullTitle, 'name');
    updateMetaTag('twitter:site', '@ParidhaaCreates', 'name');

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Clear existing dynamic JSON-LD scripts
    document.querySelectorAll('script[data-seo="dynamic"]').forEach(el => el.remove());

    const addJsonLd = (data) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'dynamic');
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    };

    // Product Schema
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
        "keywords": (product.tags || []).join(', '),
        "material": product.material || undefined,
        "color": product.color || undefined,
        "offers": {
          "@type": "Offer",
          "url": url,
          "price": product.salePrice || product.price,
          "priceCurrency": "INR",
          "availability": product.stock > 0 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": SEO_SITE_NAME
          },
          "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          "itemCondition": "https://schema.org/NewCondition",
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": {
              "@type": "MonetaryAmount",
              "value": product.price >= 999 ? "0" : "49",
              "currency": "INR"
            },
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
          },
          "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "IN",
            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays": 7,
            "returnMethod": "https://schema.org/ReturnByMail"
          }
        }
      };

      if (product.originalPrice && product.originalPrice > product.price) {
        productSchema.offers.highPrice = product.originalPrice;
      }

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
        "description": category.description || `Shop ${category.name} at ${SEO_SITE_NAME}. Authentic handcrafted items with free shipping above Rs.999.`,
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
          "item": crumb.url.startsWith('http') ? crumb.url : `${SEO_BASE_URL}${crumb.url}`
        }))
      });
    }

    // FAQ Schema
    if (faq && faq.length > 0) {
      addJsonLd({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faq.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      });
    }

  }, [title, description, keywords, image, url, type, product, category, breadcrumbs, faq, noindex]);

  return null;
};

export default SEO;
