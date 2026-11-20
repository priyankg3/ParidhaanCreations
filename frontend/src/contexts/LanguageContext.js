import React, { createContext, useContext, useState, useEffect } from "react";

// Translation dictionary
const translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.products": "Products",
    "nav.cart": "Cart",
    "nav.wishlist": "Wishlist",
    "nav.orders": "My Orders",
    "nav.login": "Login",
    "nav.logout": "Logout",
    "nav.admin": "Admin Dashboard",
    "nav.support": "Support",
    
    // Categories
    "category.handicrafts": "Handicrafts",
    "category.pooja": "Pooja Items",
    "category.perfumes": "Perfumes",
    
    // Product
    "product.addToCart": "Add to Cart",
    "product.buyNow": "Buy Now",
    "product.outOfStock": "Out of Stock",
    "product.inStock": "In Stock",
    "product.reviews": "Reviews",
    "product.writeReview": "Write a Review",
    "product.description": "Description",
    "product.related": "You May Also Like",
    
    // Cart
    "cart.title": "Shopping Cart",
    "cart.empty": "Your cart is empty",
    "cart.continueShopping": "Continue Shopping",
    "cart.subtotal": "Subtotal",
    "cart.checkout": "Proceed to Checkout",
    "cart.remove": "Remove",
    
    // Checkout
    "checkout.title": "Secure Checkout",
    "checkout.shipping": "Shipping Address",
    "checkout.payment": "Payment Method",
    "checkout.review": "Review Order",
    "checkout.placeOrder": "Place Order",
    "checkout.coupon": "Have a coupon code?",
    "checkout.apply": "Apply",
    "checkout.discount": "Discount",
    "checkout.total": "Total",
    "checkout.free": "FREE",
    
    // Support
    "support.title": "Customer Support",
    "support.createTicket": "Create Support Ticket",
    "support.chatWhatsApp": "Chat on WhatsApp",
    "support.myTickets": "My Support Tickets",
    "support.subject": "Subject",
    "support.message": "Message",
    "support.submit": "Submit Ticket",
    
    // Common
    "common.search": "Search products...",
    "common.filter": "Filter",
    "common.sort": "Sort by",
    "common.price": "Price",
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    
    // Footer
    "footer.about": "About Us",
    "footer.contact": "Contact Us",
    "footer.terms": "Terms & Conditions",
    "footer.privacy": "Privacy Policy",
    "footer.copyright": "© 2025 Paridhaan Creations. All rights reserved.",
    
    // Welcome
    "welcome.firstOrder": "First Order Special!",
    "welcome.message": "Use code WELCOME10 for 10% off your first order!"
  },
  
  hi: {
    // Navigation
    "nav.home": "होम",
    "nav.products": "उत्पाद",
    "nav.cart": "कार्ट",
    "nav.wishlist": "विशलिस्ट",
    "nav.orders": "मेरे ऑर्डर",
    "nav.login": "लॉगिन",
    "nav.logout": "लॉगआउट",
    "nav.admin": "एडमिन डैशबोर्ड",
    "nav.support": "सहायता",
    
    // Categories
    "category.handicrafts": "हस्तशिल्प",
    "category.pooja": "पूजा सामग्री",
    "category.perfumes": "इत्र",
    
    // Product
    "product.addToCart": "कार्ट में डालें",
    "product.buyNow": "अभी खरीदें",
    "product.outOfStock": "स्टॉक में नहीं",
    "product.inStock": "स्टॉक में उपलब्ध",
    "product.reviews": "समीक्षाएं",
    "product.writeReview": "समीक्षा लिखें",
    "product.description": "विवरण",
    "product.related": "आपको यह भी पसंद आ सकता है",
    
    // Cart
    "cart.title": "शॉपिंग कार्ट",
    "cart.empty": "आपका कार्ट खाली है",
    "cart.continueShopping": "खरीदारी जारी रखें",
    "cart.subtotal": "उप-योग",
    "cart.checkout": "चेकआउट करें",
    "cart.remove": "हटाएं",
    
    // Checkout
    "checkout.title": "सुरक्षित चेकआउट",
    "checkout.shipping": "डिलीवरी पता",
    "checkout.payment": "भुगतान का तरीका",
    "checkout.review": "ऑर्डर की समीक्षा",
    "checkout.placeOrder": "ऑर्डर दें",
    "checkout.coupon": "कूपन कोड है?",
    "checkout.apply": "लागू करें",
    "checkout.discount": "छूट",
    "checkout.total": "कुल",
    "checkout.free": "मुफ़्त",
    
    // Support
    "support.title": "ग्राहक सहायता",
    "support.createTicket": "सहायता टिकट बनाएं",
    "support.chatWhatsApp": "WhatsApp पर चैट करें",
    "support.myTickets": "मेरे सहायता टिकट",
    "support.subject": "विषय",
    "support.message": "संदेश",
    "support.submit": "टिकट भेजें",
    
    // Common
    "common.search": "उत्पाद खोजें...",
    "common.filter": "फ़िल्टर",
    "common.sort": "क्रमबद्ध करें",
    "common.price": "कीमत",
    "common.loading": "लोड हो रहा है...",
    "common.error": "कुछ गलत हो गया",
    "common.save": "सेव करें",
    "common.cancel": "रद्द करें",
    "common.delete": "हटाएं",
    "common.edit": "संपादित करें",
    
    // Footer
    "footer.about": "हमारे बारे में",
    "footer.contact": "संपर्क करें",
    "footer.terms": "नियम और शर्तें",
    "footer.privacy": "गोपनीयता नीति",
    "footer.copyright": "© 2025 परिधान क्रिएशंस। सर्वाधिकार सुरक्षित।",
    
    // Welcome
    "welcome.firstOrder": "पहले ऑर्डर पर विशेष!",
    "welcome.message": "अपने पहले ऑर्डर पर 10% छूट के लिए कोड WELCOME10 का उपयोग करें!"
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Check localStorage or default to English
    const saved = localStorage.getItem("paridhaan_language");
    return saved || "en";
  });

  useEffect(() => {
    localStorage.setItem("paridhaan_language", language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations["en"]?.[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "hi" : "en");
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Language Switcher Component
export function LanguageSwitcher() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-1 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm font-medium transition-all"
      data-testid="language-switcher"
    >
      <span className="text-lg">{language === "en" ? "🇮🇳" : "🇬🇧"}</span>
      <span>{language === "en" ? "हिंदी" : "English"}</span>
    </button>
  );
}
