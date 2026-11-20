// Modern Banner System v2 - Flipkart/99acres style
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Hero Banner Carousel with animations
export const HeroBanner = ({ banners = [], autoPlay = true, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter banners based on device
  const visibleBanners = banners.filter(b => 
    isMobile ? b.show_on_mobile !== false : b.show_on_desktop !== false
  );

  const nextSlide = useCallback(() => {
    if (visibleBanners.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
      setIsTransitioning(false);
    }, 300);
  }, [visibleBanners.length]);

  const prevSlide = useCallback(() => {
    if (visibleBanners.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length);
      setIsTransitioning(false);
    }, 300);
  }, [visibleBanners.length]);

  useEffect(() => {
    if (!autoPlay || visibleBanners.length <= 1) return;
    const timer = setInterval(nextSlide, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, nextSlide, visibleBanners.length]);

  if (!visibleBanners.length) return null;

  const currentBanner = visibleBanners[currentIndex];
  const imageUrl = isMobile && currentBanner.mobile_image_url 
    ? currentBanner.mobile_image_url 
    : currentBanner.image_url;

  // Animation classes based on banner setting
  const getAnimationClass = (animation) => {
    switch (animation) {
      case 'fade': return 'animate-fade-in';
      case 'slide-left': return 'animate-slide-left';
      case 'slide-right': return 'animate-slide-right';
      case 'slide-up': return 'animate-slide-up';
      case 'zoom': return 'animate-zoom-in';
      case 'bounce': return 'animate-bounce-in';
      default: return '';
    }
  };

  const getLink = (banner) => {
    if (banner.link_type === 'url' && banner.link_url) return banner.link_url;
    if (banner.link_type === 'category' && banner.link_target) return `/products?category=${banner.link_target}`;
    if (banner.link_type === 'product' && banner.link_target) return `/products/${banner.link_target}`;
    if (banner.link_type === 'collection' && banner.link_target) return `/collections/${banner.link_target}`;
    return null;
  };

  const textPositionClass = {
    'left': 'items-start text-left',
    'center': 'items-center text-center',
    'right': 'items-end text-right'
  }[currentBanner.text_position || 'center'];

  const BannerContent = () => (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background Image/Video */}
      {imageUrl?.endsWith('.mp4') || imageUrl?.endsWith('.webm') ? (
        <video
          src={imageUrl}
          autoPlay
          muted
          loop
          playsInline
          className={`w-full h-full object-cover transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
        />
      ) : (
        <img
          src={imageUrl}
          alt={currentBanner.title || 'Banner'}
          className={`w-full h-full object-cover transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
          loading="eager"
        />
      )}
      
      {/* Overlay */}
      {currentBanner.overlay_color && (
        <div 
          className="absolute inset-0" 
          style={{ backgroundColor: currentBanner.overlay_color }}
        />
      )}
      
      {/* Text Content */}
      {(currentBanner.title || currentBanner.subtitle || currentBanner.button_text) && (
        <div className={`absolute inset-0 flex flex-col justify-center px-6 md:px-16 lg:px-24 ${textPositionClass}`}>
          <div className={`max-w-2xl ${getAnimationClass(currentBanner.animation)}`}>
            {currentBanner.subtitle && (
              <p 
                className="text-sm md:text-base lg:text-lg font-medium mb-2 md:mb-3 tracking-wider uppercase"
                style={{ color: currentBanner.text_color || '#ffffff' }}
              >
                {currentBanner.subtitle}
              </p>
            )}
            {currentBanner.title && (
              <h2 
                className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 leading-tight"
                style={{ color: currentBanner.text_color || '#ffffff' }}
              >
                {currentBanner.title}
              </h2>
            )}
            {currentBanner.description && (
              <p 
                className="text-sm md:text-base lg:text-lg mb-4 md:mb-6 opacity-90 max-w-xl"
                style={{ color: currentBanner.text_color || '#ffffff' }}
              >
                {currentBanner.description}
              </p>
            )}
            {currentBanner.button_text && (
              <button 
                className="px-6 md:px-8 py-2.5 md:py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {currentBanner.button_text}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const link = getLink(currentBanner);

  return (
    <div className="relative w-full h-[250px] sm:h-[350px] md:h-[450px] lg:h-[550px] bg-gray-100 overflow-hidden group">
      {link ? (
        link.startsWith('http') ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            <BannerContent />
          </a>
        ) : (
          <Link to={link} className="block w-full h-full">
            <BannerContent />
          </Link>
        )
      ) : (
        <BannerContent />
      )}
      
      {/* Navigation Arrows */}
      {visibleBanners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
          </button>
        </>
      )}
      
      {/* Dots Indicator */}
      {visibleBanners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {visibleBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentIndex(index);
                  setIsTransitioning(false);
                }, 300);
              }}
              className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-6 md:w-8' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Promotional Banners Grid - Flipkart style
export const PromotionalBanners = ({ banners = [], columns = 2 }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleBanners = banners.filter(b => 
    isMobile ? b.show_on_mobile !== false : b.show_on_desktop !== false
  );

  if (!visibleBanners.length) return null;

  const getLink = (banner) => {
    if (banner.link_type === 'url' && banner.link_url) return banner.link_url;
    if (banner.link_type === 'category' && banner.link_target) return `/products?category=${banner.link_target}`;
    if (banner.link_type === 'product' && banner.link_target) return `/products/${banner.link_target}`;
    if (banner.link_type === 'collection' && banner.link_target) return `/collections/${banner.link_target}`;
    return null;
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4'
  }[columns] || 'grid-cols-2';

  return (
    <div className={`grid ${gridCols} gap-3 md:gap-4`}>
      {visibleBanners.map((banner, index) => {
        const imageUrl = isMobile && banner.mobile_image_url 
          ? banner.mobile_image_url 
          : banner.image_url;
        const link = getLink(banner);

        const BannerCard = () => (
          <div className="relative overflow-hidden rounded-lg md:rounded-xl shadow-md hover:shadow-xl transition-all duration-300 group bg-gray-100">
            <div className="aspect-[16/9] md:aspect-[2/1] overflow-hidden">
              <img
                src={imageUrl}
                alt={banner.title || 'Promotional Banner'}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Content on hover */}
            {(banner.title || banner.button_text) && (
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                {banner.title && (
                  <h3 className="text-white font-semibold text-sm md:text-base truncate">
                    {banner.title}
                  </h3>
                )}
                {banner.button_text && (
                  <span className="inline-block mt-1 text-xs md:text-sm text-white/90 underline">
                    {banner.button_text}
                  </span>
                )}
              </div>
            )}
          </div>
        );

        return link ? (
          link.startsWith('http') ? (
            <a key={banner.banner_id || index} href={link} target="_blank" rel="noopener noreferrer">
              <BannerCard />
            </a>
          ) : (
            <Link key={banner.banner_id || index} to={link}>
              <BannerCard />
            </Link>
          )
        ) : (
          <div key={banner.banner_id || index}>
            <BannerCard />
          </div>
        );
      })}
    </div>
  );
};

// Offer Strip Banner - Announcement style
export const OfferStrip = ({ banners = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div 
      className="w-full py-2.5 md:py-3 px-4 text-center overflow-hidden"
      style={{ 
        backgroundColor: currentBanner.overlay_color || '#8B1538',
        color: currentBanner.text_color || '#ffffff'
      }}
    >
      <div className="animate-fade-in">
        {currentBanner.link_url ? (
          <a 
            href={currentBanner.link_url} 
            className="text-sm md:text-base font-medium hover:underline"
            target={currentBanner.link_url.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
          >
            {currentBanner.title}
          </a>
        ) : (
          <span className="text-sm md:text-base font-medium">{currentBanner.title}</span>
        )}
      </div>
    </div>
  );
};

// Category Banners - 99acres style large cards
export const CategoryBanners = ({ banners = [] }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleBanners = banners.filter(b => 
    isMobile ? b.show_on_mobile !== false : b.show_on_desktop !== false
  );

  if (!visibleBanners.length) return null;

  const getLink = (banner) => {
    if (banner.link_type === 'url' && banner.link_url) return banner.link_url;
    if (banner.link_type === 'category' && banner.link_target) return `/products?category=${banner.link_target}`;
    return null;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {visibleBanners.map((banner, index) => {
        const imageUrl = isMobile && banner.mobile_image_url 
          ? banner.mobile_image_url 
          : banner.image_url;
        const link = getLink(banner);

        const Card = () => (
          <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer">
            <div className="aspect-square overflow-hidden">
              <img
                src={imageUrl}
                alt={banner.title || 'Category'}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
              <h3 
                className="font-bold text-lg md:text-xl"
                style={{ color: banner.text_color || '#ffffff' }}
              >
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p 
                  className="text-sm opacity-80 mt-1"
                  style={{ color: banner.text_color || '#ffffff' }}
                >
                  {banner.subtitle}
                </p>
              )}
            </div>
          </div>
        );

        return link ? (
          <Link key={banner.banner_id || index} to={link}>
            <Card />
          </Link>
        ) : (
          <div key={banner.banner_id || index}>
            <Card />
          </div>
        );
      })}
    </div>
  );
};

export default {
  HeroBanner,
  PromotionalBanners,
  OfferStrip,
  CategoryBanners
};
