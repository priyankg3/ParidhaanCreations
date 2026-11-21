import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { Package, Users, ShoppingCart, DollarSign, Plus, Edit, Trash2, Upload, TrendingUp, AlertTriangle, Tag, Calendar, Percent, Image, X, Settings, Truck, Sparkles, Database, Download, RefreshCw, CheckCircle, Clock, Play, Video } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import BannerManagement from "../components/admin/BannerManagement";
import USPManagement from "../components/admin/USPManagement";
import MusicManagement from "../components/admin/MusicManagement";
import InstagramManagement from "../components/admin/InstagramManagement";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [analytics, setAnalytics] = useState({
    total_orders: 0,
    total_revenue: 0,
    total_products: 0,
    total_users: 0,
    order_statuses: {},
    payment_statuses: {},
    monthly_revenue: [],
    category_breakdown: [],
    recent_orders: [],
    low_stock_products: []
  });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [banners, setBanners] = useState([]);
  const [siteSettings, setSiteSettings] = useState(null);
  const [logoUploading, setLogoUploading] = useState({ header: false, footer: false, favicon: false });
  const headerLogoRef = useRef(null);
  const footerLogoRef = useRef(null);
  const faviconRef = useRef(null);
  const [coupons, setCoupons] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [customerInsights, setCustomerInsights] = useState({
    repeat_rate: 0,
    avg_order_value: 0,
    top_customers: [],
    top_categories: {},
    vip_customers: []
  });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  
  // Pagination states
  const [productPage, setProductPage] = useState(1);
  const [lowStockPage, setLowStockPage] = useState(1);
  const PRODUCTS_PER_PAGE = 10;
  const LOW_STOCK_PER_PAGE = 5;
  
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    mrp: "",  // Original price (compare_at_price) for discount display
    category: "",
    subcategory: "",  // Sub-category slug
    images: [""],
    stock: "",
    featured: false,
    badge: "",  // new, hot, trending, limited, featured, bestseller, sale
    // Advanced attributes
    length: "",
    breadth: "",
    height: "",
    dimension_unit: "cm",
    weight: "",
    weight_unit: "g",
    sizes: "",
    sku: "",
    material: "",
    color: "",
    brand: "",
    tags: "",
    // Laddu Gopal specific
    laddu_gopal_sizes: [],  // ["0", "1", "2"] etc.
    // GST fields
    gst_rate: "",
    hsn_code: "",
    // Color variants
    variants: [],  // [{color_name, color_code, images[], stock, price, mrp}]
    // Telegram channel posting mode — "now" / "digest" / "skip"
    // Defaults to digest so new products are batched into the 7 PM IST post
    channel_post_mode: "digest"
  });

  const ladduGopalSizeOptions = ["0", "1", "2", "3", "4", "5", "6", "6+"];

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    parent_id: null
  });
  const [editingCategory, setEditingCategory] = useState(null);

  const [bannerForm, setBannerForm] = useState({
    title: "",
    image: "",
    link: "",
    position: 1,
    active: true,
    banner_type: "hero",
    category: "",
    start_date: "",
    end_date: ""
  });
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerFileInputRef = useRef(null);

  // Ticker Messages state
  const [tickerMessages, setTickerMessages] = useState([]);
  const [showTickerForm, setShowTickerForm] = useState(false);
  const [tickerForm, setTickerForm] = useState({
    text: "",
    icon: "✨",
    is_active: true,
    order: 0
  });
  const [editingTicker, setEditingTicker] = useState(null);

  // Shipping state
  const [shipments, setShipments] = useState([]);
  const [selectedOrderForShipping, setSelectedOrderForShipping] = useState(null);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [shippingLoading, setShippingLoading] = useState(false);

  // Abandoned Cart Recovery state
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [abandonedCartStats, setAbandonedCartStats] = useState({
    total: 0,
    total_value: 0,
    recovered: 0
  });
  const [selectedAbandonedCart, setSelectedAbandonedCart] = useState(null);
  const [abandonedCartFilter, setAbandonedCartFilter] = useState(1); // hours threshold

  // Collections state
  const [collections, setCollections] = useState([]);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    collection_type: "festival",
    start_date: "",
    end_date: "",
    product_ids: [],
    is_active: true,
    is_featured: false,
    position: 0,
    badge_text: "",
    badge_color: "#ef4444"
  });
  const [collectionProductSearch, setCollectionProductSearch] = useState("");
  const [collectionImageUploading, setCollectionImageUploading] = useState(false);
  const collectionImageRef = useRef(null);

  // Instagram Videos state
  const [instagramVideos, setInstagramVideos] = useState([]);
  const [showInstagramForm, setShowInstagramForm] = useState(false);
  const [instagramUploading, setInstagramUploading] = useState(false);
  const [instagramForm, setInstagramForm] = useState({
    thumbnail_url: "",
    video_url: "",
    instagram_url: "",
    caption: ""
  });
  const instagramFileRef = useRef(null);

  // Background Music state
  const [musicTracks, setMusicTracks] = useState([]);
  const [showMusicForm, setShowMusicForm] = useState(false);
  const [musicUploading, setMusicUploading] = useState(false);
  const [musicForm, setMusicForm] = useState({ title: "", artist: "" });
  const musicFileRef = useRef(null);

  // Banner size recommendations
  const bannerSizeRecommendations = {
    hero: { size: "1920 x 600", priority: "High", placement: "Homepage Hero", needsCategory: false },
    header: { size: "1200 x 250", priority: "Medium", placement: "Category Top", needsCategory: true },
    side: { size: "300 x 600", priority: "Low", placement: "Sidebar", needsCategory: true },
    footer: { size: "1200 x 100", priority: "Low", placement: "Footer Strip", needsCategory: true }
  };

  // Helper to check banner schedule status
  const getBannerScheduleStatus = (banner) => {
    if (!banner.start_date && !banner.end_date) return { status: "always", label: "Always Active", color: "green" };
    
    const now = new Date();
    const start = banner.start_date ? new Date(banner.start_date) : null;
    const end = banner.end_date ? new Date(banner.end_date) : null;
    
    if (start && now < start) return { status: "scheduled", label: `Starts ${start.toLocaleDateString()}`, color: "blue" };
    if (end && now > end) return { status: "expired", label: `Ended ${end.toLocaleDateString()}`, color: "red" };
    if (start || end) return { status: "active", label: "Currently Active", color: "green" };
    
    return { status: "always", label: "Always Active", color: "green" };
  };

  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_percentage: "",
    discount_amount: "",
    valid_from: "",
    valid_to: "",
    active: true
  });

  // GST Settings State
  const [gstSettings, setGstSettings] = useState(null);
  const [showGstForm, setShowGstForm] = useState(false);
  const [gstForm, setGstForm] = useState({
    business_name: "",
    gstin: "",
    pan: "",
    business_address: "",
    business_state: "",
    business_state_code: "",
    business_email: "",
    business_phone: "",
    default_gst_rate: 18,
    gst_enabled: true,
    prices_include_gst: true,
    invoice_prefix: "PC",
    invoice_footer_text: "",
    terms_and_conditions: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_branch: "",
    authorized_signatory: ""
  });
  const [indianStates, setIndianStates] = useState([]);

  const fetchData = async () => {
    try {
      if (activeTab === "analytics") {
        const response = await axios.get(`${API}/admin/analytics`, { withCredentials: true });
        setAnalytics(response.data);
        
        const productsRes = await axios.get(`${API}/products`);
        const allProducts = productsRes.data;
        
        const lowStock = allProducts.filter(p => p.stock <= 5 && p.stock > 0);
        setLowStockProducts(lowStock);
        
        const ordersRes = await axios.get(`${API}/admin/orders`, { withCredentials: true });
        const allOrders = ordersRes.data;
        
        const last7Days = Array.from({length: 7}, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });
        
        const salesByDay = last7Days.map(date => {
          const dayOrders = allOrders.filter(o => o.created_at.startsWith(date) && o.payment_status === 'paid');
          const total = dayOrders.reduce((sum, o) => sum + o.total_amount, 0);
          return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: total,
            orders: dayOrders.length
          };
        });
        setSalesData(salesByDay);
        
        const categoryStats = {};
        allProducts.forEach(p => {
          if (!categoryStats[p.category]) {
            categoryStats[p.category] = { category: p.category, count: 0, revenue: 0 };
          }
          categoryStats[p.category].count++;
        });
        
        allOrders.filter(o => o.payment_status === 'paid').forEach(order => {
          order.items.forEach(item => {
            const product = allProducts.find(p => p.product_id === item.product_id);
            if (product && categoryStats[product.category]) {
              categoryStats[product.category].revenue += item.price * item.quantity;
            }
          });
        });
        
        setCategoryData(Object.values(categoryStats));
      } else if (activeTab === "insights") {
        const response = await axios.get(`${API}/admin/customer-insights`, { withCredentials: true });
        setCustomerInsights(response.data);
      } else if (activeTab === "products") {
        // Fetch both products and hierarchical categories (with subcategories nested)
        const [productsRes, categoriesRes] = await Promise.all([
          axios.get(`${API}/products`),
          axios.get(`${API}/categories`)
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
      } else if (activeTab === "categories") {
        const response = await axios.get(`${API}/categories/all`);
        setCategories(response.data);
      } else if (activeTab === "orders") {
        const response = await axios.get(`${API}/admin/orders`, { withCredentials: true });
        setOrders(response.data);
      } else if (activeTab === "banners") {
        const response = await axios.get(`${API}/admin/banners`, { withCredentials: true });
        setBanners(response.data);
      } else if (activeTab === "ticker") {
        const response = await axios.get(`${API}/ticker/all`, { withCredentials: true });
        setTickerMessages(response.data);
      } else if (activeTab === "coupons") {
        const response = await axios.get(`${API}/coupons`, { withCredentials: true });
        setCoupons(response.data);
      } else if (activeTab === "settings") {
        const response = await axios.get(`${API}/settings`);
        setSiteSettings(response.data);
      } else if (activeTab === "gst") {
        const [gstRes, statesRes] = await Promise.all([
          axios.get(`${API}/gst-settings`),
          axios.get(`${API}/indian-states`)
        ]);
        setGstSettings(gstRes.data);
        setIndianStates(statesRes.data);
        setGstForm({
          business_name: gstRes.data.business_name || "",
          gstin: gstRes.data.gstin || "",
          pan: gstRes.data.pan || "",
          business_address: gstRes.data.business_address || "",
          business_state: gstRes.data.business_state || "",
          business_state_code: gstRes.data.business_state_code || "",
          business_email: gstRes.data.business_email || "",
          business_phone: gstRes.data.business_phone || "",
          default_gst_rate: gstRes.data.default_gst_rate || 18,
          gst_enabled: gstRes.data.gst_enabled !== false,
          prices_include_gst: gstRes.data.prices_include_gst !== false,
          invoice_prefix: gstRes.data.invoice_prefix || "PC",
          invoice_footer_text: gstRes.data.invoice_footer_text || "",
          terms_and_conditions: gstRes.data.terms_and_conditions || "",
          bank_name: gstRes.data.bank_name || "",
          bank_account_number: gstRes.data.bank_account_number || "",
          bank_ifsc: gstRes.data.bank_ifsc || "",
          bank_branch: gstRes.data.bank_branch || "",
          authorized_signatory: gstRes.data.authorized_signatory || ""
        });
      } else if (activeTab === "shipping") {
        const shipmentsRes = await axios.get(`${API}/admin/shipments`, { withCredentials: true });
        setShipments(shipmentsRes.data.shipments || []);
      } else if (activeTab === "abandoned") {
        const [cartsRes, statsRes] = await Promise.all([
          axios.get(`${API}/admin/abandoned-carts?hours_threshold=${abandonedCartFilter}`, { withCredentials: true }),
          axios.get(`${API}/admin/abandoned-carts/stats`, { withCredentials: true })
        ]);
        setAbandonedCarts(cartsRes.data.abandoned_carts || []);
        setAbandonedCartStats(statsRes.data);
      } else if (activeTab === "collections") {
        const collectionsRes = await axios.get(`${API}/admin/collections`, { withCredentials: true });
        setCollections(collectionsRes.data || []);
        // Also fetch products for the product selector
        const productsRes = await axios.get(`${API}/admin/products`, { withCredentials: true });
        setProducts(productsRes.data || []);
      } else if (activeTab === "instagram") {
        const videosRes = await axios.get(`${API}/instagram-videos`, { withCredentials: true });
        setInstagramVideos(videosRes.data || []);
      } else if (activeTab === "music") {
        const musicRes = await axios.get(`${API}/admin/background-music`, { withCredentials: true });
        setMusicTracks(musicRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleLogoUpload = async (e, logoType) => {
    const file = e.target.files[0];
    if (!file) return;

    setLogoUploading(prev => ({ ...prev, [logoType]: true }));
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/settings/upload-logo?logo_type=${logoType}`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success(`${logoType.charAt(0).toUpperCase() + logoType.slice(1)} logo uploaded successfully!`);
        // Refresh settings to get new logo URL
        const settingsRes = await axios.get(`${API}/settings`);
        setSiteSettings(settingsRes.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to upload ${logoType} logo`);
    } finally {
      setLogoUploading(prev => ({ ...prev, [logoType]: false }));
    }
  };

  const handleSettingsUpdate = async (field, value) => {
    try {
      await axios.put(`${API}/settings`, { [field]: value }, { withCredentials: true });
      setSiteSettings(prev => ({ ...prev, [field]: value }));
      toast.success("Settings updated!");
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, abandonedCartFilter]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: productForm.price ? parseFloat(productForm.price) : null,
        mrp: productForm.mrp ? parseFloat(productForm.mrp) : null,  // Original price for discount
        category: productForm.category,
        subcategory: productForm.subcategory || null,  // Sub-category slug
        images: productForm.images.filter(url => url),
        stock: productForm.stock ? parseInt(productForm.stock) : null,
        featured: productForm.featured,
        badge: productForm.badge || null,  // Product badge type
        // Advanced attributes
        length: productForm.length ? parseFloat(productForm.length) : null,
        breadth: productForm.breadth ? parseFloat(productForm.breadth) : null,
        height: productForm.height ? parseFloat(productForm.height) : null,
        dimension_unit: productForm.dimension_unit || "cm",
        weight: productForm.weight ? parseFloat(productForm.weight) : null,
        weight_unit: productForm.weight_unit || "g",
        sizes: productForm.sizes ? productForm.sizes.split(',').map(s => s.trim()).filter(s => s) : null,
        sku: productForm.sku || null,
        material: productForm.material || null,
        color: productForm.color || null,
        brand: productForm.brand || null,
        tags: productForm.tags ? productForm.tags.split(',').map(t => t.trim()).filter(t => t) : null,
        // Laddu Gopal sizes
        laddu_gopal_sizes: productForm.laddu_gopal_sizes.length > 0 ? productForm.laddu_gopal_sizes : null,
        // GST fields
        gst_rate: productForm.gst_rate ? parseFloat(productForm.gst_rate) : null,
        hsn_code: productForm.hsn_code || null,
        // Color variants with size options
        variants: productForm.variants.length > 0 ? productForm.variants.map(v => ({
          color_name: v.color_name,
          color_code: v.color_code,
          images: (v.images || []).filter(u => u),
          // Size options for this color with dimensions
          sizes: (v.sizes || []).length > 0 ? v.sizes.map(s => ({
            size: s.size,
            price: s.price ? parseFloat(s.price) : null,
            mrp: s.mrp ? parseFloat(s.mrp) : null,
            stock: parseInt(s.stock) || 0,
            length: s.length ? parseFloat(s.length) : null,
            breadth: s.breadth ? parseFloat(s.breadth) : null,
            height: s.height ? parseFloat(s.height) : null
          })) : null
        })) : null,
        // Telegram channel posting mode. Backend pops this field off before
        // saving and uses it to enqueue the product into the channel-post
        // queue (now / digest / skip).
        channel_post_mode: productForm.channel_post_mode || "digest"
      };
      
      await axios.post(`${API}/admin/products`, productData, { withCredentials: true });
      toast.success("Product created successfully");
      setShowProductForm(false);
      resetProductForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to create product");
    }
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];
    const errors = [];

    try {
      toast.info(`Uploading ${files.length} image(s) to Cloudinary cloud...`);
      
      // Upload each file to Cloudinary (permanent cloud storage)
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        
        try {
          // Try Cloudinary first (permanent), fallback to MongoDB storage
          let response;
          try {
            response = await axios.post(`${API}/cloudinary/upload?folder=paridhaan/products`, formData, {
              withCredentials: true,
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (cloudErr) {
            // Fallback to MongoDB storage if Cloudinary not configured
            console.log("Cloudinary not available, using MongoDB storage");
            response = await axios.post(`${API}/images/upload?category=product`, formData, {
              withCredentials: true,
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          }
          
          if (response.data.url) {
            uploadedUrls.push(response.data.url);
          }
        } catch (err) {
          errors.push({ filename: files[i].name, error: err.response?.data?.detail || 'Upload failed' });
        }
      }

      if (uploadedUrls.length > 0) {
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images.filter(url => url !== ""), ...uploadedUrls]
        }));
        toast.success(`☁️ ${uploadedUrls.length} image(s) saved to cloud - permanent URLs!`);
      }

      if (errors.length > 0) {
        errors.forEach(err => toast.error(`${err.filename}: ${err.error}`));
      }
    } catch (error) {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeProductImage = (indexToRemove) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  // Upload images for a specific color variant
  const handleVariantImageUpload = async (files, variantIndex, isEdit = false) => {
    if (!files || files.length === 0) return;
    const uploadedUrls = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        let response;
        try {
          response = await axios.post(`${API}/cloudinary/upload?folder=paridhaan/products`, formData, {
            withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (cloudErr) {
          response = await axios.post(`${API}/images/upload?category=product`, formData, {
            withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        if (response.data.url) uploadedUrls.push(response.data.url);
      }
      if (uploadedUrls.length > 0) {
        if (isEdit) {
          const v = [...(editingProduct.variants || [])];
          v[variantIndex] = { ...v[variantIndex], images: [...(v[variantIndex].images || []).filter(u => u), ...uploadedUrls] };
          setEditingProduct({ ...editingProduct, variants: v });
        } else {
          const v = [...productForm.variants];
          v[variantIndex] = { ...v[variantIndex], images: [...(v[variantIndex].images || []).filter(u => u), ...uploadedUrls] };
          setProductForm({ ...productForm, variants: v });
        }
        toast.success(`${uploadedUrls.length} variant image(s) uploaded!`);
      }
    } catch (error) {
      toast.error("Failed to upload variant image");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await axios.delete(`${API}/admin/products/${productId}`, { withCredentials: true });
      toast.success("Product deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      laddu_gopal_sizes: product.laddu_gopal_sizes || []
    });
    setShowEditProductModal(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    try {
      // Ensure images is always an array
      const productImages = Array.isArray(editingProduct.images) ? editingProduct.images : [];
      
      const updateData = {
        name: editingProduct.name,
        description: editingProduct.description,
        price: parseFloat(editingProduct.price),
        mrp: editingProduct.mrp ? parseFloat(editingProduct.mrp) : null,
        category: editingProduct.category,
        subcategory: editingProduct.subcategory || null,
        images: productImages,
        stock: parseInt(editingProduct.stock),
        featured: editingProduct.featured,
        badge: editingProduct.badge || null,
        laddu_gopal_sizes: editingProduct.laddu_gopal_sizes?.length > 0 ? editingProduct.laddu_gopal_sizes : null,
        material: editingProduct.material || null,
        color: editingProduct.color || null,
        sku: editingProduct.sku || null,
        // GST fields
        gst_rate: editingProduct.gst_rate ? parseFloat(editingProduct.gst_rate) : null,
        hsn_code: editingProduct.hsn_code || null,
        // Color variants with size options
        variants: (editingProduct.variants || []).length > 0 ? editingProduct.variants.map(v => ({
          color_name: v.color_name,
          color_code: v.color_code,
          images: (v.images || []).filter(u => u),
          sizes: (v.sizes || []).length > 0 ? v.sizes.map(s => ({
            size: s.size,
            price: s.price ? parseFloat(s.price) : null,
            mrp: s.mrp ? parseFloat(s.mrp) : null,
            stock: parseInt(s.stock) || 0,
            length: s.length ? parseFloat(s.length) : null,
            breadth: s.breadth ? parseFloat(s.breadth) : null,
            height: s.height ? parseFloat(s.height) : null
          })) : null
        })) : null
      };
      
      console.log("Updating product with data:", updateData);
      
      await axios.put(`${API}/admin/products/${editingProduct.product_id}`, updateData, { withCredentials: true });
      toast.success(`Product updated! ${productImages.length} image(s) saved.`);
      setShowEditProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to update product");
      console.error("Update error:", error);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/categories`, categoryForm, { withCredentials: true });
      toast.success("Category created successfully");
      setShowCategoryForm(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to create category");
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) {
      toast.error("No category selected for editing");
      return;
    }
    try {
      await axios.put(`${API}/categories/${editingCategory.category_id}`, categoryForm, { withCredentials: true });
      toast.success("Category updated successfully");
      setEditingCategory(null);
      setShowCategoryForm(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.response?.data?.detail || "Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Are you sure you want to delete this category? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/categories/${categoryId}`, { withCredentials: true });
      toast.success("Category deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const startEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
      parent_id: category.parent_id || null
    });
    setShowCategoryForm(true);
    // Scroll to form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleBannerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please use JPG, PNG, WebP, or GIF");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB");
      return;
    }

    setBannerUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.info("Uploading banner to Cloudinary cloud...");
      
      // Try Cloudinary first, fallback to MongoDB
      let response;
      try {
        response = await axios.post(`${API}/cloudinary/upload?folder=paridhaan/banners`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (cloudErr) {
        console.log("Cloudinary error:", cloudErr.response?.data);
        if (cloudErr.response?.status === 401) {
          toast.error("Session expired. Please logout and login again.");
          return;
        }
        console.log("Cloudinary not available, using MongoDB storage");
        response = await axios.post(`${API}/images/upload?category=banner`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data.url && !response.data.url.startsWith('http')) {
          response.data.url = `${API}${response.data.url.replace('/api', '')}`;
        }
      }
      
      // Use functional update to ensure we get the latest state
      setBannerForm(prev => ({ ...prev, image: response.data.url }));
      toast.success("☁️ Banner saved to cloud - permanent URL!");
    } catch (error) {
      console.error("Upload error:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please logout and login again.");
      } else {
        toast.error(error.response?.data?.detail || "Failed to upload image");
      }
    } finally {
      setBannerUploading(false);
    }
  };

  const handleCreateBanner = async (e) => {
    e.preventDefault();
    if (!bannerForm.image) {
      toast.error("Please upload a banner image");
      return;
    }
    
    // Validate category for non-hero banners
    if (bannerForm.banner_type !== 'hero' && !bannerForm.category) {
      toast.error("Please select a category for this banner type");
      return;
    }
    
    // Validate schedule dates
    if (bannerForm.start_date && bannerForm.end_date) {
      if (new Date(bannerForm.start_date) >= new Date(bannerForm.end_date)) {
        toast.error("End date must be after start date");
        return;
      }
    }
    
    try {
      const bannerData = {
        title: bannerForm.title || null,
        image_url: bannerForm.image,  // Backend expects image_url
        link_url: bannerForm.link || null,
        position: bannerForm.position || 0,
        is_active: bannerForm.active,
        link_type: bannerForm.link ? "url" : "none",
        link_category: bannerForm.banner_type !== 'hero' ? (bannerForm.category || null) : null,
        start_date: bannerForm.start_date ? new Date(bannerForm.start_date).toISOString() : null,
        end_date: bannerForm.end_date ? new Date(bannerForm.end_date).toISOString() : null
      };
      await axios.post(`${API}/banners`, bannerData, { withCredentials: true });
      toast.success("Banner created successfully");
      setShowBannerForm(false);
      resetBannerForm();
      fetchData();
    } catch (error) {
      console.error("Banner creation error:", error.response?.data);
      toast.error(error.response?.data?.detail || "Failed to create banner");
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    try {
      await axios.delete(`${API}/banners/${bannerId}`, { withCredentials: true });
      toast.success("Banner deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete banner");
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const couponData = {
        code: couponForm.code.toUpperCase(),
        discount_percentage: couponForm.discount_percentage ? parseFloat(couponForm.discount_percentage) : null,
        discount_amount: couponForm.discount_amount ? parseFloat(couponForm.discount_amount) : null,
        valid_from: new Date(couponForm.valid_from).toISOString(),
        valid_to: new Date(couponForm.valid_to).toISOString(),
        active: couponForm.active
      };
      
      if (editingCoupon) {
        await axios.put(`${API}/coupons/${editingCoupon.coupon_id}`, couponData, { withCredentials: true });
        toast.success("Coupon updated successfully");
        setEditingCoupon(null);
      } else {
        await axios.post(`${API}/coupons`, couponData, { withCredentials: true });
        toast.success("Coupon created successfully");
      }
      setShowCouponForm(false);
      resetCouponForm();
      fetchData();
    } catch (error) {
      toast.error(editingCoupon ? "Failed to update coupon" : "Failed to create coupon");
    }
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    const validFrom = new Date(coupon.valid_from);
    const validTo = new Date(coupon.valid_to);
    setCouponForm({
      code: coupon.code,
      discount_percentage: coupon.discount_percentage || "",
      discount_amount: coupon.discount_amount || "",
      valid_from: validFrom.toISOString().slice(0, 16),
      valid_to: validTo.toISOString().slice(0, 16),
      active: coupon.active
    });
    setShowCouponForm(true);
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    
    try {
      await axios.delete(`${API}/coupons/${couponId}`, { withCredentials: true });
      toast.success("Coupon deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete coupon");
    }
  };

  const handleToggleCouponStatus = async (coupon) => {
    try {
      const couponData = {
        code: coupon.code,
        discount_percentage: coupon.discount_percentage,
        discount_amount: coupon.discount_amount,
        valid_from: coupon.valid_from,
        valid_to: coupon.valid_to,
        active: !coupon.active
      };
      await axios.put(`${API}/coupons/${coupon.coupon_id}`, couponData, { withCredentials: true });
      toast.success(`Coupon ${!coupon.active ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update coupon status");
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status?status=${newStatus}`, {}, { withCredentials: true });
      toast.success("Order status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update order status");
    }
  };

  // GST Settings Functions
  const handleSaveGstSettings = async () => {
    try {
      await axios.put(`${API}/admin/gst-settings`, gstForm, { withCredentials: true });
      toast.success("GST settings saved successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to save GST settings");
    }
  };

  const handleUpdateProductGst = async (productId, gstRate, hsnCode) => {
    try {
      await axios.put(`${API}/admin/products/${productId}/gst?gst_rate=${gstRate}&hsn_code=${hsnCode}`, {}, { withCredentials: true });
      toast.success("Product GST updated!");
      fetchData();
    } catch (error) {
      toast.error("Failed to update product GST");
    }
  };

  const handleUpdateCategoryGst = async (categoryId, gstRate, hsnCode) => {
    try {
      await axios.put(`${API}/admin/categories/${categoryId}/gst?gst_rate=${gstRate}&hsn_code=${hsnCode}`, {}, { withCredentials: true });
      toast.success("Category GST updated!");
      fetchData();
    } catch (error) {
      toast.error("Failed to update category GST");
    }
  };

  const handleGenerateInvoice = async (orderId) => {
    try {
      // First generate the invoice data
      await axios.get(`${API}/orders/${orderId}/invoice`, { withCredentials: true });
      // Then download PDF
      window.open(`${API}/orders/${orderId}/invoice/pdf`, '_blank');
      toast.success("Invoice generated!");
    } catch (error) {
      toast.error("Failed to generate invoice: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleDownloadCombinedPDF = async (orderId) => {
    try {
      // Download combined Shipping Label + Tax Invoice PDF
      window.open(`${API}/orders/${orderId}/combined-pdf`, '_blank');
      toast.success("Combined PDF downloading!");
    } catch (error) {
      toast.error("Failed to download: " + (error.response?.data?.detail || error.message));
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      mrp: "",
      category: "",
      subcategory: "",
      images: [""],
      stock: "",
      featured: false,
      badge: "",
      length: "",
      breadth: "",
      height: "",
      dimension_unit: "cm",
      weight: "",
      weight_unit: "g",
      sizes: "",
      sku: "",
      material: "",
      color: "",
      brand: "",
      tags: "",
      laddu_gopal_sizes: [],
      gst_rate: "",
      hsn_code: "",
      variants: [],
      channel_post_mode: "digest"
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      image: "",
      parent_id: null
    });
  };

  // Shipping Functions
  const handleCreateShipment = async (orderId) => {
    setShippingLoading(true);
    try {
      const response = await axios.post(`${API}/shiprocket/create-shipment/${orderId}`, {}, { withCredentials: true });
      toast.success("Shipment created in Shiprocket!");
      setSelectedOrderForShipping(orderId);
      
      // Get available couriers
      const order = orders.find(o => o.order_id === orderId);
      if (order?.shipping_address?.pincode) {
        const couriersRes = await axios.get(`${API}/shiprocket/couriers?delivery_pincode=${order.shipping_address.pincode}`, { withCredentials: true });
        setAvailableCouriers(couriersRes.data.couriers || []);
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create shipment");
    } finally {
      setShippingLoading(false);
    }
  };

  const handleAssignCourier = async (orderId, courierId) => {
    setShippingLoading(true);
    try {
      const response = await axios.post(`${API}/shiprocket/assign-courier/${orderId}?courier_id=${courierId}`, {}, { withCredentials: true });
      toast.success(`AWB Generated: ${response.data.awb_number}`);
      setSelectedOrderForShipping(null);
      setAvailableCouriers([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to assign courier");
    } finally {
      setShippingLoading(false);
    }
  };

  const handleCancelShipment = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this shipment?")) return;
    
    try {
      await axios.post(`${API}/shiprocket/cancel/${orderId}`, {}, { withCredentials: true });
      toast.success("Shipment cancelled");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to cancel shipment");
    }
  };

  const resetBannerForm = () => {
    setBannerForm({
      title: "",
      image: "",
      link: "",
      position: 1,
      active: true,
      banner_type: "hero",
      category: "",
      start_date: "",
      end_date: ""
    });
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: "",
      discount_percentage: "",
      discount_amount: "",
      valid_from: "",
      valid_to: "",
      active: true
    });
    setEditingCoupon(null);
  };

  const handleExportProducts = async () => {
    try {
      const response = await axios.get(`${API}/admin/products/export`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Products exported successfully!");
    } catch (error) {
      toast.error("Failed to export products");
    }
  };

  const handleExportOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders/export`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Orders exported successfully!");
    } catch (error) {
      toast.error("Failed to export orders");
    }
  };

  const [supportTickets, setSupportTickets] = useState([]);
  const [supportStats, setSupportStats] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReply, setTicketReply] = useState("");

  const fetchSupportData = async () => {
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/support/tickets`, { withCredentials: true }),
        axios.get(`${API}/admin/support/stats`, { withCredentials: true })
      ]);
      setSupportTickets(ticketsRes.data);
      setSupportStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching support data:", error);
    }
  };

  const handleTicketReply = async (ticketId) => {
    if (!ticketReply.trim()) return;
    try {
      await axios.post(`${API}/support/tickets/${ticketId}/reply`, { message: ticketReply }, { withCredentials: true });
      toast.success("Reply sent!");
      setTicketReply("");
      fetchSupportData();
      if (selectedTicket) {
        const ticketRes = await axios.get(`${API}/support/tickets/${ticketId}`, { withCredentials: true });
        setSelectedTicket(ticketRes.data);
      }
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      await axios.put(`${API}/support/tickets/${ticketId}/status?status=${status}`, {}, { withCredentials: true });
      toast.success(`Ticket marked as ${status}`);
      fetchSupportData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    if (activeTab === "support") {
      fetchSupportData();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen py-12 bg-background-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-heading font-bold mb-12" data-testid="admin-title">Admin Dashboard</h1>

        <div className="flex space-x-4 mb-8 overflow-x-auto">
          {["analytics", "insights", "products", "categories", "collections", "orders", "shipping", "abandoned", "support", "instagram", "music", "banners", "ticker", "usp", "coupons", "gst", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium tracking-wide transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-foreground hover:bg-primary/10"
              }`}
              data-testid={`tab-${tab}`}
            >
              {tab === "gst" ? "GST & Invoice" : tab === "abandoned" ? "Abandoned Carts" : tab === "instagram" ? "Instagram" : tab === "music" ? "🎵 Music" : tab === "ticker" ? "📢 Ticker" : tab === "usp" ? "🏆 USP Strip" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "analytics" && analytics && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-border/40 p-6" data-testid="total-orders-card">
                <div className="flex items-center justify-between mb-4">
                  <ShoppingCart className="w-10 h-10 text-primary" />
                </div>
                <p className="text-3xl font-bold mb-2">{analytics?.total_orders || 0}</p>
                <p className="text-muted-foreground">Total Orders</p>
              </div>

              <div className="bg-white border border-border/40 p-6" data-testid="total-revenue-card">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-10 h-10 text-accent" />
                </div>
                <p className="text-3xl font-bold mb-2">₹{(analytics?.total_revenue || 0).toFixed(2)}</p>
                <p className="text-muted-foreground">Total Revenue</p>
              </div>

              <div className="bg-white border border-border/40 p-6" data-testid="total-products-card">
                <div className="flex items-center justify-between mb-4">
                  <Package className="w-10 h-10 text-secondary" />
                </div>
                <p className="text-3xl font-bold mb-2">{analytics?.total_products || 0}</p>
                <p className="text-muted-foreground">Total Products</p>
              </div>

              <div className="bg-white border border-border/40 p-6" data-testid="total-users-card">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <p className="text-3xl font-bold mb-2">{analytics?.total_users || 0}</p>
                <p className="text-muted-foreground">Total Users</p>
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    <h3 className="text-xl font-heading font-bold text-amber-900">Low Stock Alert ({lowStockProducts.length} items)</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  {lowStockProducts
                    .slice((lowStockPage - 1) * LOW_STOCK_PER_PAGE, lowStockPage * LOW_STOCK_PER_PAGE)
                    .map(product => (
                    <div key={product.product_id} className="flex items-center justify-between py-2 border-b border-amber-200 last:border-0">
                      <div className="flex items-center space-x-3">
                        <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover" />
                        <div>
                          <p className="font-medium text-amber-900">{product.name}</p>
                          <p className="text-sm text-amber-700">Category: {product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-600">{product.stock}</p>
                        <p className="text-xs text-amber-700">units left</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Low Stock Pagination */}
                {lowStockProducts.length > LOW_STOCK_PER_PAGE && (
                  <div className="flex justify-center items-center mt-4 space-x-2">
                    <button
                      onClick={() => setLowStockPage(p => Math.max(1, p - 1))}
                      disabled={lowStockPage === 1}
                      className="px-2 py-1 text-sm border border-amber-300 rounded hover:bg-amber-100 disabled:opacity-50"
                    >
                      ←
                    </button>
                    {[...Array(Math.ceil(lowStockProducts.length / LOW_STOCK_PER_PAGE))].map((_, idx) => (
                      <button
                        key={idx + 1}
                        onClick={() => setLowStockPage(idx + 1)}
                        className={`w-7 h-7 text-sm rounded ${lowStockPage === idx + 1 ? 'bg-amber-500 text-white' : 'border border-amber-300 hover:bg-amber-100'}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setLowStockPage(p => Math.min(Math.ceil(lowStockProducts.length / LOW_STOCK_PER_PAGE), p + 1))}
                      disabled={lowStockPage >= Math.ceil(lowStockProducts.length / LOW_STOCK_PER_PAGE)}
                      className="px-2 py-1 text-sm border border-amber-300 rounded hover:bg-amber-100 disabled:opacity-50"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-border/40 p-6">
                <h3 className="text-xl font-heading font-bold mb-6 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span>Sales Trend (Last 7 Days)</span>
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#0F4C75" strokeWidth={2} name="Revenue (₹)" />
                    <Line type="monotone" dataKey="orders" stroke="#D4AF37" strokeWidth={2} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <h3 className="text-xl font-heading font-bold mb-6">Revenue by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#0F4C75" name="Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-border/40 p-6">
                <h3 className="text-xl font-heading font-bold mb-6">Products by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, count }) => `${category}: ${count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#0F4C75', '#D4AF37', '#800000', '#4A90E2'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <h3 className="text-xl font-heading font-bold mb-6">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Average Order Value</span>
                    <span className="text-xl font-bold">₹{analytics?.total_orders > 0 ? ((analytics?.total_revenue || 0) / analytics.total_orders).toFixed(2) : 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Low Stock Items</span>
                    <span className="text-xl font-bold text-amber-600">{lowStockProducts.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Products per Category</span>
                    <span className="text-xl font-bold">{(analytics?.total_products || 0) / (categoryData?.length || 1)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-muted-foreground">Total Categories</span>
                    <span className="text-xl font-bold">{categoryData.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "insights" && customerInsights && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-border/40 p-6">
                <p className="text-3xl font-bold mb-2">{customerInsights?.total_customers || 0}</p>
                <p className="text-muted-foreground">Total Customers</p>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <p className="text-3xl font-bold mb-2">{customerInsights?.repeat_customers || 0}</p>
                <p className="text-muted-foreground">Repeat Customers</p>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <p className="text-3xl font-bold mb-2">{(customerInsights?.repeat_rate || 0).toFixed(1)}%</p>
                <p className="text-muted-foreground">Repeat Rate</p>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <p className="text-3xl font-bold mb-2">₹{(customerInsights?.avg_order_value || 0).toFixed(2)}</p>
                <p className="text-muted-foreground">Avg Order Value</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-border/40 p-6">
                <h3 className="text-xl font-heading font-bold mb-6">Top Categories</h3>
                <div className="space-y-3">
                  {Object.entries(customerInsights?.top_categories || {}).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{category}</span>
                      <span className="text-lg font-bold text-primary">{count} sold</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <h3 className="text-xl font-heading font-bold mb-6">VIP Customers</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {(customerInsights?.vip_customers || []).map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-background-paper">
                      <div>
                        <p className="font-medium text-sm">{customer.name || customer.email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{customer.total_orders || 0} orders</p>
                      </div>
                      <p className="text-lg font-bold text-accent">₹{(customer.total_spent || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-border/40 p-6">
              <h3 className="text-xl font-heading font-bold mb-4">Recent Activity</h3>
              <p className="text-muted-foreground">
                <strong>{customerInsights?.recent_orders_30days || 0}</strong> orders in the last 30 days
              </p>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold">Products Management</h2>
              <div className="flex space-x-3">
                <button
                  onClick={handleExportProducts}
                  className="bg-secondary text-secondary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-secondary/90 transition-all"
                  data-testid="export-products-button"
                >
                  <Upload className="w-5 h-5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setShowProductForm(!showProductForm)}
                  className="bg-primary text-primary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-primary/90 transition-all"
                  data-testid="add-product-button"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {showProductForm && (
              <div className="bg-white border border-border/40 p-6 mb-6">
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Description *</label>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!productForm.name) {
                            toast.error("Pehle product name daalein");
                            return;
                          }
                          toast.loading("AI se description generate ho raha hai...");
                          try {
                            const response = await axios.post(`${API}/ai/generate-description`, {
                              product_name: productForm.name,
                              category: productForm.category || "general",
                              material: productForm.material,
                              color: productForm.color,
                              size: productForm.sizes,
                              price: productForm.price ? parseFloat(productForm.price) : null,
                              additional_info: productForm.tags
                            }, { withCredentials: true });
                            setProductForm({...productForm, description: response.data.description});
                            toast.dismiss();
                            toast.success("Description generate ho gaya! ✨");
                          } catch (error) {
                            toast.dismiss();
                            toast.error("Description generate nahi ho paya");
                          }
                        }}
                        className="flex items-center gap-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full hover:opacity-90"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI Generate ✨
                      </button>
                    </div>
                    <textarea
                      required
                      value={productForm.description}
                      onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      rows="4"
                      placeholder="AI se generate karein ya khud likhein..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Selling Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        placeholder="₹ Final price (optional if using variants)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">MRP (Original Price)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.mrp}
                        onChange={(e) => setProductForm({...productForm, mrp: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        placeholder="₹ MRP (for discount)"
                      />
                      {productForm.mrp && productForm.price && parseFloat(productForm.mrp) > parseFloat(productForm.price) && (
                        <p className="text-xs text-green-600 mt-1">
                          {Math.round(((parseFloat(productForm.mrp) - parseFloat(productForm.price)) / parseFloat(productForm.mrp)) * 100)}% OFF
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Category *</label>
                      <select
                        required
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value, subcategory: ""})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      >
                        <option value="">Select Category</option>
                        {categories.filter(c => !c.parent_id).map(cat => (
                          <option key={cat.category_id} value={cat.slug}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sub-category dropdown - shows when parent category is selected */}
                    {productForm.category && categories.find(c => c.slug === productForm.category)?.subcategories?.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Sub-category (Optional)</label>
                        <select
                          value={productForm.subcategory || ""}
                          onChange={(e) => setProductForm({...productForm, subcategory: e.target.value})}
                          className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        >
                          <option value="">-- No Sub-category --</option>
                          {categories.find(c => c.slug === productForm.category)?.subcategories?.map(sub => (
                            <option key={sub.category_id} value={sub.slug}>{sub.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Stock</label>
                      <input
                        type="number"
                        value={productForm.stock}
                        onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        placeholder="Optional if using variants"
                      />
                    </div>
                  </div>

                  {/* Laddu Gopal Sizes - Only show for Pooja category */}
                  {productForm.category === 'pooja' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <label className="block text-sm font-medium mb-3 text-amber-800">
                        🕉️ Laddu Gopal Sizes (Select all sizes this dress fits)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {ladduGopalSizeOptions.map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              const newSizes = productForm.laddu_gopal_sizes.includes(size)
                                ? productForm.laddu_gopal_sizes.filter(s => s !== size)
                                : [...productForm.laddu_gopal_sizes, size];
                              setProductForm({...productForm, laddu_gopal_sizes: newSizes});
                            }}
                            className={`w-12 h-12 rounded-full border-2 font-bold transition-all ${
                              productForm.laddu_gopal_sizes.includes(size)
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-white text-amber-700 border-amber-300 hover:border-amber-400'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      {productForm.laddu_gopal_sizes.length > 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                          Selected: Size {productForm.laddu_gopal_sizes.sort().join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">Product Images (Permanently Saved)</label>
                    
                    {/* Image Upload Area */}
                    <div className="border-2 border-dashed border-green-300 bg-green-50 rounded-lg p-6 mb-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="product-images"
                      />
                      <label 
                        htmlFor="product-images" 
                        className="cursor-pointer flex flex-col items-center justify-center"
                      >
                        <Upload className={`w-10 h-10 mb-2 ${uploading ? 'animate-pulse text-primary' : 'text-green-600'}`} />
                        <span className="text-sm text-green-700 font-medium">
                          {uploading ? 'Uploading to permanent storage...' : '✅ Click to upload (permanently saved)'}
                        </span>
                        <span className="text-xs text-green-600 mt-1">PNG, JPG, WebP up to 5MB - Images will be saved permanently!</span>
                      </label>
                    </div>

                    {/* Image Previews */}
                    {productForm.images.filter(url => url).length > 0 && (
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {productForm.images.filter(url => url).map((url, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={url} 
                              alt={`Product ${index + 1}`} 
                              className="w-full h-24 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeProductImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Manual URL Input */}
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        placeholder="Or paste image URL..."
                        value={productForm.images[0] || ""}
                        onChange={(e) => {
                          const newImages = [...productForm.images];
                          if (newImages.length === 0 || (newImages.length === 1 && newImages[0] === "")) {
                            newImages[0] = e.target.value;
                          } else if (!newImages.includes(e.target.value) && e.target.value) {
                            newImages.push(e.target.value);
                          }
                          setProductForm({...productForm, images: newImages.filter(u => u)});
                        }}
                        className="flex-1 px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary text-sm"
                      />
                    </div>
                  </div>

                  {/* Advanced Product Attributes */}
                  <div className="border-t pt-6 mt-6">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Advanced Product Details
                    </h4>
                    
                    {/* Dimensions */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Dimensions (L × B × H)</label>
                      <div className="grid grid-cols-4 gap-3">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Length"
                          value={productForm.length}
                          onChange={(e) => setProductForm({...productForm, length: e.target.value})}
                          className="px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Breadth"
                          value={productForm.breadth}
                          onChange={(e) => setProductForm({...productForm, breadth: e.target.value})}
                          className="px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Height"
                          value={productForm.height}
                          onChange={(e) => setProductForm({...productForm, height: e.target.value})}
                          className="px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                        <select
                          value={productForm.dimension_unit}
                          onChange={(e) => setProductForm({...productForm, dimension_unit: e.target.value})}
                          className="px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        >
                          <option value="cm">cm</option>
                          <option value="inches">inches</option>
                          <option value="feet">feet</option>
                        </select>
                      </div>
                    </div>

                    {/* Weight and SKU */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Weight</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="e.g., 500"
                            value={productForm.weight}
                            onChange={(e) => setProductForm({...productForm, weight: e.target.value})}
                            className="flex-1 px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                          />
                          <select
                            value={productForm.weight_unit}
                            onChange={(e) => setProductForm({...productForm, weight_unit: e.target.value})}
                            className="px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                          >
                            <option value="g">grams</option>
                            <option value="kg">kg</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">SKU (Stock Code)</label>
                        <input
                          type="text"
                          placeholder="e.g., PROD-001"
                          value={productForm.sku}
                          onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                          className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                      </div>
                    </div>

                    {/* Sizes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Available Sizes (comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g., S, M, L, XL or 6, 7, 8, 9, 10"
                        value={productForm.sizes}
                        onChange={(e) => setProductForm({...productForm, sizes: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>

                    {/* Material, Color, Brand */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Material</label>
                        <input
                          type="text"
                          placeholder="e.g., Brass, Cotton"
                          value={productForm.material}
                          onChange={(e) => setProductForm({...productForm, material: e.target.value})}
                          className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Color</label>
                        <input
                          type="text"
                          placeholder="e.g., Gold, Red"
                          value={productForm.color}
                          onChange={(e) => setProductForm({...productForm, color: e.target.value})}
                          className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Brand</label>
                        <input
                          type="text"
                          placeholder="e.g., Paridhaan"
                          value={productForm.brand}
                          onChange={(e) => setProductForm({...productForm, brand: e.target.value})}
                          className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g., festival, gift, traditional, wedding"
                        value={productForm.tags}
                        onChange={(e) => setProductForm({...productForm, tags: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>

                    {/* GST & HSN Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h5 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        GST & Tax Details
                      </h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-blue-700">GST Rate (%)</label>
                          <select
                            value={productForm.gst_rate}
                            onChange={(e) => setProductForm({...productForm, gst_rate: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Use Category Default</option>
                            <option value="0">0% (Exempt)</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-blue-700">HSN Code</label>
                          <input
                            type="text"
                            placeholder="e.g., 9503"
                            value={productForm.hsn_code}
                            onChange={(e) => setProductForm({...productForm, hsn_code: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">Leave blank to use category default GST rate</p>
                    </div>
                  </div>

                  {/* Color Variants Section */}
                  <div className="border border-dashed border-primary/40 rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-primary">Color & Size Variants (Optional)</h4>
                      <button
                        type="button"
                        onClick={() => setProductForm({...productForm, variants: [...productForm.variants, {color_name: '', color_code: '#800000', images: [''], sizes: []}]})}
                        className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/80"
                        data-testid="add-variant-btn"
                      >
                        + Add Color
                      </button>
                    </div>
                    {productForm.variants.length === 0 && (
                      <p className="text-xs text-muted-foreground">Add color variants with size options (Amazon/Flipkart style)</p>
                    )}
                    {productForm.variants.map((variant, vi) => (
                      <div key={vi} className="border rounded p-3 mb-3 bg-white relative">
                        <button type="button" onClick={() => {
                          const updated = productForm.variants.filter((_, i) => i !== vi);
                          setProductForm({...productForm, variants: updated});
                        }} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold">✕</button>
                        
                        {/* Color Info Row */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div>
                            <label className="text-xs font-medium">Color Name *</label>
                            <input type="text" placeholder="e.g. Red & Gold" value={variant.color_name}
                              onChange={(e) => { const v = [...productForm.variants]; v[vi] = {...v[vi], color_name: e.target.value}; setProductForm({...productForm, variants: v}); }}
                              className="w-full p-1.5 border rounded text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium">Color Code</label>
                            <div className="flex gap-1">
                              <input type="color" value={variant.color_code}
                                onChange={(e) => { const v = [...productForm.variants]; v[vi] = {...v[vi], color_code: e.target.value}; setProductForm({...productForm, variants: v}); }}
                                className="w-10 h-9 border rounded cursor-pointer" />
                              <input type="text" value={variant.color_code}
                                onChange={(e) => { const v = [...productForm.variants]; v[vi] = {...v[vi], color_code: e.target.value}; setProductForm({...productForm, variants: v}); }}
                                className="flex-1 p-1.5 border rounded text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Images</label>
                            <div className="flex gap-1">
                              {(variant.images || []).filter(u => u).slice(0,2).map((img, ii) => (
                                <div key={ii} className="relative w-8 h-8 border rounded overflow-hidden">
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                </div>
                              ))}
                              <label className="w-8 h-8 border-2 border-dashed border-primary/40 rounded flex items-center justify-center cursor-pointer hover:bg-primary/5">
                                <span className="text-primary text-sm">+</span>
                                <input type="file" accept="image/*" multiple className="hidden"
                                  onChange={(e) => handleVariantImageUpload(e.target.files, vi, false)} />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Size Options for this Color */}
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-600">Size Options for {variant.color_name || 'this color'}</label>
                            <button type="button" 
                              onClick={() => {
                                const v = [...productForm.variants];
                                v[vi] = {...v[vi], sizes: [...(v[vi].sizes || []), {size: '', price: '', mrp: '', stock: '', length: '', breadth: '', height: ''}]};
                                setProductForm({...productForm, variants: v});
                              }}
                              className="text-xs bg-secondary text-white px-2 py-0.5 rounded hover:bg-secondary/80">
                              + Add Size
                            </button>
                          </div>
                          
                          {(!variant.sizes || variant.sizes.length === 0) && (
                            <p className="text-xs text-gray-400 italic">No sizes added. Click "+ Add Size" to add size options with different prices.</p>
                          )}
                          
                          {(variant.sizes || []).map((sizeOpt, si) => (
                            <div key={si} className="bg-gray-50 p-2 rounded mb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <input type="text" placeholder="Size" value={sizeOpt.size}
                                  onChange={(e) => {
                                    const v = [...productForm.variants];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], size: e.target.value};
                                    setProductForm({...productForm, variants: v});
                                  }}
                                  className="w-16 p-1 border rounded text-xs" />
                                <input type="number" placeholder="Price ₹" value={sizeOpt.price}
                                  onChange={(e) => {
                                    const v = [...productForm.variants];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], price: e.target.value};
                                    setProductForm({...productForm, variants: v});
                                  }}
                                  className="w-20 p-1 border rounded text-xs" />
                                <input type="number" placeholder="MRP ₹" value={sizeOpt.mrp || ''}
                                  onChange={(e) => {
                                    const v = [...productForm.variants];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], mrp: e.target.value};
                                    setProductForm({...productForm, variants: v});
                                  }}
                                  className="w-20 p-1 border rounded text-xs" />
                                <input type="number" placeholder="Stock" value={sizeOpt.stock}
                                  onChange={(e) => {
                                    const v = [...productForm.variants];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], stock: e.target.value};
                                    setProductForm({...productForm, variants: v});
                                  }}
                                  className="w-16 p-1 border rounded text-xs" />
                                <button type="button" onClick={() => {
                                  const v = [...productForm.variants];
                                  v[vi].sizes = v[vi].sizes.filter((_, idx) => idx !== si);
                                  setProductForm({...productForm, variants: v});
                                }} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                              </div>
                              {/* Dimensions L×B×H */}
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] text-gray-500">Dim:</span>
                                <input type="number" placeholder="L" value={sizeOpt.length || ''}
                                  onChange={(e) => {
                                    const v = [...productForm.variants];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], length: e.target.value};
                                    setProductForm({...productForm, variants: v});
                                  }}
                                  className="w-12 p-1 border rounded text-[10px]" title="Length (cm)" />
                                <span className="text-gray-400">×</span>
                                <input type="number" placeholder="B" value={sizeOpt.breadth || ''}
                                  onChange={(e) => {
                                    const v = [...productForm.variants];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], breadth: e.target.value};
                                    setProductForm({...productForm, variants: v});
                                  }}
                                  className="w-12 p-1 border rounded text-[10px]" title="Breadth (cm)" />
                                <span className="text-gray-400">×</span>
                                <input type="number" placeholder="H" value={sizeOpt.height || ''}
                                  onChange={(e) => {
                                    const v = [...productForm.variants];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], height: e.target.value};
                                    setProductForm({...productForm, variants: v});
                                  }}
                                  className="w-12 p-1 border rounded text-[10px]" title="Height (cm)" />
                                <span className="text-[10px] text-gray-400">cm</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={productForm.featured}
                      onChange={(e) => setProductForm({...productForm, featured: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Featured Product</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Product Badge</label>
                    <select
                      value={productForm.badge}
                      onChange={(e) => setProductForm({...productForm, badge: e.target.value})}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                      data-testid="product-badge-select"
                    >
                      <option value="">No Badge</option>
                      <option value="new">✨ NEW ARRIVAL</option>
                      <option value="hot">🔥 HOT</option>
                      <option value="trending">📈 TRENDING</option>
                      <option value="bestseller">🏆 BESTSELLER</option>
                      <option value="limited">⏰ LIMITED</option>
                      <option value="sale">💰 SALE</option>
                      <option value="featured">⭐ FEATURED</option>
                    </select>
                  </div>

                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-1">
                      📢 Post to Telegram Channel
                    </label>
                    <select
                      value={productForm.channel_post_mode}
                      onChange={(e) => setProductForm({...productForm, channel_post_mode: e.target.value})}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                      data-testid="channel-post-mode-select"
                    >
                      <option value="digest">📦 Add to Daily Digest (default) — batched at 7 PM IST</option>
                      <option value="now">🚀 Post Now — appears in channel within ~30 seconds</option>
                      <option value="skip">🚫 Skip Channel — don't post this product</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Controls when @ParidhaanCreations channel subscribers see this product. Change the mode if you want an instant launch or want to keep this product out of the channel entirely.
                    </p>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90 transition-all"
                    >
                      Create Product
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductForm(false);
                        resetProductForm();
                      }}
                      className="bg-muted text-muted-foreground px-6 py-2 hover:bg-muted/80 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border border-border/40 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-paper">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium">Image</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Badge</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE)
                    .map((product) => (
                    <tr key={product.product_id} className="border-t border-border">
                      <td className="px-6 py-4">
                        <img src={product.images[0]} alt={product.name} className="w-16 h-16 object-cover" />
                      </td>
                      <td className="px-6 py-4 font-medium">{product.name}</td>
                      <td className="px-6 py-4 capitalize">{product.category}</td>
                      <td className="px-6 py-4">₹{product.price}</td>
                      <td className="px-6 py-4">{product.stock}</td>
                      <td className="px-6 py-4">
                        <select
                          value={product.badge || ""}
                          onChange={async (e) => {
                            try {
                              await axios.put(`${API}/products/${product.product_id}`, {
                                ...product,
                                badge: e.target.value || null
                              }, { withCredentials: true });
                              toast.success("Badge updated!");
                              fetchData();
                            } catch (error) {
                              toast.error("Failed to update badge");
                            }
                          }}
                          className="text-xs p-1 border rounded"
                          data-testid={`badge-select-${product.product_id}`}
                        >
                          <option value="">None</option>
                          <option value="new">✨ NEW</option>
                          <option value="hot">🔥 HOT</option>
                          <option value="trending">📈 TRENDING</option>
                          <option value="bestseller">🏆 BESTSELLER</option>
                          <option value="limited">⏰ LIMITED</option>
                          <option value="sale">💰 SALE</option>
                          <option value="featured">⭐ FEATURED</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.product_id)}
                            className="text-accent hover:text-accent/80 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Products Pagination */}
              {products.length > PRODUCTS_PER_PAGE && (
                <div className="flex justify-between items-center p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((productPage - 1) * PRODUCTS_PER_PAGE) + 1}-{Math.min(productPage * PRODUCTS_PER_PAGE, products.length)} of {products.length} products
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setProductPage(p => Math.max(1, p - 1))}
                      disabled={productPage === 1}
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      ← Prev
                    </button>
                    {[...Array(Math.ceil(products.length / PRODUCTS_PER_PAGE))].map((_, idx) => (
                      <button
                        key={idx + 1}
                        onClick={() => setProductPage(idx + 1)}
                        className={`w-8 h-8 rounded ${productPage === idx + 1 ? 'bg-primary text-white' : 'border hover:bg-gray-100'}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setProductPage(p => Math.min(Math.ceil(products.length / PRODUCTS_PER_PAGE), p + 1))}
                      disabled={productPage >= Math.ceil(products.length / PRODUCTS_PER_PAGE)}
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Edit Product Modal */}
            {showEditProductModal && editingProduct && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">Edit Product</h3>
                      <button onClick={() => setShowEditProductModal(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                          type="text"
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Selling Price (₹)</label>
                        <input
                          type="number"
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">MRP (₹)</label>
                        <input
                          type="number"
                          value={editingProduct.mrp || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, mrp: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                          placeholder="Original price"
                        />
                        {editingProduct.mrp && editingProduct.price && parseFloat(editingProduct.mrp) > parseFloat(editingProduct.price) && (
                          <p className="text-xs text-green-600 mt-1">
                            {Math.round(((parseFloat(editingProduct.mrp) - parseFloat(editingProduct.price)) / parseFloat(editingProduct.mrp)) * 100)}% OFF
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select
                          value={editingProduct.category}
                          onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value, subcategory: ""})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.category_id} value={cat.slug}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Sub-category</label>
                        <select
                          value={editingProduct.subcategory || ""}
                          onChange={(e) => setEditingProduct({...editingProduct, subcategory: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                          disabled={!editingProduct.category || !categories.find(c => c.slug === editingProduct.category)?.subcategories?.length}
                        >
                          <option value="">-- No Sub-category --</option>
                          {categories.find(c => c.slug === editingProduct.category)?.subcategories?.map(sub => (
                            <option key={sub.category_id} value={sub.slug}>{sub.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Stock</label>
                        <input
                          type="number"
                          value={editingProduct.stock}
                          onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Laddu Gopal Sizes - Only for Pooja category */}
                    {editingProduct.category === 'pooja' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <label className="block text-sm font-medium mb-3 text-amber-800">
                          🕉️ Laddu Gopal Sizes (Select all sizes this dress fits)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {ladduGopalSizeOptions.map(size => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                const currentSizes = editingProduct.laddu_gopal_sizes || [];
                                const newSizes = currentSizes.includes(size)
                                  ? currentSizes.filter(s => s !== size)
                                  : [...currentSizes, size];
                                setEditingProduct({...editingProduct, laddu_gopal_sizes: newSizes});
                              }}
                              className={`w-12 h-12 rounded-full border-2 font-bold transition-all ${
                                (editingProduct.laddu_gopal_sizes || []).includes(size)
                                  ? 'bg-amber-500 text-white border-amber-600'
                                  : 'bg-white text-amber-700 border-amber-300 hover:border-amber-400'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        {editingProduct.laddu_gopal_sizes?.length > 0 && (
                          <p className="text-xs text-amber-600 mt-2">
                            Selected: Size {editingProduct.laddu_gopal_sizes.sort().join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* GST & HSN Code Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <label className="block text-sm font-medium mb-3 text-blue-800">
                        📋 GST & Tax Details (Product-specific)
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-blue-700">HSN Code</label>
                          <input
                            type="text"
                            value={editingProduct.hsn_code || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, hsn_code: e.target.value})}
                            placeholder="e.g., 6117"
                            className="w-full px-3 py-2 border border-blue-200 rounded focus:ring-2 focus:ring-blue-400 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-blue-700">GST Rate (%)</label>
                          <select
                            value={editingProduct.gst_rate || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, gst_rate: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-200 rounded focus:ring-2 focus:ring-blue-400 text-sm"
                          >
                            <option value="">Select GST Rate</option>
                            <option value="0">0% (Exempt)</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        💡 Set product-specific GST rate for accurate tax calculation in invoices
                      </p>
                    </div>

                    {/* Product Images Section */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <label className="block text-sm font-medium mb-3">
                        🖼️ Product Images ({(editingProduct.images || []).length} images)
                      </label>
                      
                      {/* Current Images */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {(editingProduct.images || []).map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={img} 
                              alt={`Product ${idx + 1}`}
                              className="w-full h-20 object-cover rounded border"
                              onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=No+Image'; }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = [...editingProduct.images];
                                newImages.splice(idx, 1);
                                setEditingProduct({...editingProduct, images: newImages});
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                              title="Remove image"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {(!editingProduct.images || editingProduct.images.length === 0) && (
                          <div className="col-span-4 text-center py-4 text-gray-400">
                            No images added yet
                          </div>
                        )}
                      </div>
                      
                      {/* Add New Image URL */}
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="Enter image URL and click Add"
                          id="newImageUrl"
                          className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-primary text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('newImageUrl');
                            const url = input.value.trim();
                            if (url) {
                              const currentImages = editingProduct.images || [];
                              setEditingProduct({...editingProduct, images: [...currentImages, url]});
                              input.value = '';
                            }
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Add
                        </button>
                      </div>
                      
                      {/* Or Upload Image */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <label className="block text-xs text-gray-500 mb-2">Or upload an image (☁️ Cloudinary cloud):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            try {
                              toast.info("Uploading to Cloudinary cloud...");
                              
                              // Try Cloudinary first, fallback to MongoDB
                              let response;
                              try {
                                response = await axios.post(`${API}/cloudinary/upload?folder=paridhaan/products`, formData, {
                                  withCredentials: true,
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                              } catch (cloudErr) {
                                console.log("Cloudinary not available, using MongoDB");
                                response = await axios.post(`${API}/images/upload?category=product`, formData, {
                                  withCredentials: true,
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                if (response.data.url && !response.data.url.startsWith('http')) {
                                  response.data.url = `${API}${response.data.url.replace('/api', '')}`;
                                }
                              }
                              
                              console.log("Upload response:", response.data);
                              
                              if (response.data.url) {
                                const currentImages = Array.isArray(editingProduct.images) ? editingProduct.images : [];
                                const newImages = [...currentImages, response.data.url];
                                
                                console.log("Adding cloud image:", response.data.url);
                                
                                setEditingProduct(prev => ({...prev, images: newImages}));
                                toast.success(`☁️ Image saved to cloud! Total: ${newImages.length} images`);
                              }
                            } catch (error) {
                              console.error("Upload error:", error);
                              toast.error(error.response?.data?.detail || "Failed to upload image");
                            }
                            e.target.value = '';
                          }}
                          className="text-sm"
                        />
                        <p className="text-xs text-green-600 mt-1">
                          ☁️ Images saved to Cloudinary cloud - permanent URLs!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingProduct.featured}
                          onChange={(e) => setEditingProduct({...editingProduct, featured: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Featured Product</span>
                      </label>
                    </div>

                    {/* Color Variants Section for Edit */}
                    <div className="border border-dashed border-primary/40 rounded-lg p-4 bg-primary/5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-primary">Color & Size Variants</h4>
                        <button type="button"
                          onClick={() => setEditingProduct({...editingProduct, variants: [...(editingProduct.variants || []), {color_name: '', color_code: '#800000', images: [''], sizes: []}]})}
                          className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/80"
                          data-testid="edit-add-variant-btn"
                        >+ Add Color</button>
                      </div>
                      {(!editingProduct.variants || editingProduct.variants.length === 0) && (
                        <p className="text-xs text-muted-foreground">No color variants. Add colors with size options (Amazon/Flipkart style).</p>
                      )}
                      {(editingProduct.variants || []).map((variant, vi) => (
                        <div key={vi} className="border rounded p-3 mb-3 bg-white relative">
                          <button type="button" onClick={() => {
                            const updated = (editingProduct.variants || []).filter((_, i) => i !== vi);
                            setEditingProduct({...editingProduct, variants: updated});
                          }} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold">✕</button>
                          
                          {/* Color Info */}
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div>
                              <label className="text-xs font-medium">Color Name *</label>
                              <input type="text" placeholder="e.g. Red & Gold" value={variant.color_name || ''}
                                onChange={(e) => { const v = [...(editingProduct.variants||[])]; v[vi] = {...v[vi], color_name: e.target.value}; setEditingProduct({...editingProduct, variants: v}); }}
                                className="w-full p-1.5 border rounded text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium">Color Code</label>
                              <div className="flex gap-1">
                                <input type="color" value={variant.color_code || '#800000'}
                                  onChange={(e) => { const v = [...(editingProduct.variants||[])]; v[vi] = {...v[vi], color_code: e.target.value}; setEditingProduct({...editingProduct, variants: v}); }}
                                  className="w-10 h-9 border rounded cursor-pointer" />
                                <input type="text" value={variant.color_code || ''}
                                  onChange={(e) => { const v = [...(editingProduct.variants||[])]; v[vi] = {...v[vi], color_code: e.target.value}; setEditingProduct({...editingProduct, variants: v}); }}
                                  className="flex-1 p-1.5 border rounded text-sm" />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Images</label>
                              <div className="flex gap-1">
                                {(variant.images || []).filter(u => u).slice(0,2).map((img, ii) => (
                                  <div key={ii} className="relative w-8 h-8 border rounded overflow-hidden">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                                <label className="w-8 h-8 border-2 border-dashed border-primary/40 rounded flex items-center justify-center cursor-pointer hover:bg-primary/5">
                                  <span className="text-primary text-sm">+</span>
                                  <input type="file" accept="image/*" multiple className="hidden"
                                    onChange={(e) => handleVariantImageUpload(e.target.files, vi, true)} />
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Size Options */}
                          <div className="border-t pt-2 mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-gray-600">Size Options for {variant.color_name || 'this color'}</label>
                              <button type="button" 
                                onClick={() => {
                                  const v = [...(editingProduct.variants||[])];
                                  v[vi] = {...v[vi], sizes: [...(v[vi].sizes || []), {size: '', price: '', mrp: '', stock: ''}]};
                                  setEditingProduct({...editingProduct, variants: v});
                                }}
                                className="text-xs bg-secondary text-white px-2 py-0.5 rounded hover:bg-secondary/80">
                                + Add Size
                              </button>
                            </div>
                            
                            {(!variant.sizes || variant.sizes.length === 0) && (
                              <p className="text-xs text-gray-400 italic">No sizes. Click "+ Add Size" to add size options with different prices.</p>
                            )}
                            
                            {(variant.sizes || []).map((sizeOpt, si) => (
                              <div key={si} className="flex items-center gap-2 mb-1 bg-gray-50 p-2 rounded">
                                <input type="text" placeholder="Size" value={sizeOpt.size || ''}
                                  onChange={(e) => {
                                    const v = [...(editingProduct.variants||[])];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], size: e.target.value};
                                    setEditingProduct({...editingProduct, variants: v});
                                  }}
                                  className="w-20 p-1 border rounded text-xs" />
                                <input type="number" placeholder="Price ₹" value={sizeOpt.price || ''}
                                  onChange={(e) => {
                                    const v = [...(editingProduct.variants||[])];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], price: e.target.value};
                                    setEditingProduct({...editingProduct, variants: v});
                                  }}
                                  className="w-20 p-1 border rounded text-xs" />
                                <input type="number" placeholder="MRP ₹" value={sizeOpt.mrp || ''}
                                  onChange={(e) => {
                                    const v = [...(editingProduct.variants||[])];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], mrp: e.target.value};
                                    setEditingProduct({...editingProduct, variants: v});
                                  }}
                                  className="w-20 p-1 border rounded text-xs" />
                                <input type="number" placeholder="Stock" value={sizeOpt.stock || ''}
                                  onChange={(e) => {
                                    const v = [...(editingProduct.variants||[])];
                                    v[vi].sizes[si] = {...v[vi].sizes[si], stock: e.target.value};
                                    setEditingProduct({...editingProduct, variants: v});
                                  }}
                                  className="w-16 p-1 border rounded text-xs" />
                                <button type="button" onClick={() => {
                                  const v = [...(editingProduct.variants||[])];
                                  v[vi].sizes = v[vi].sizes.filter((_, idx) => idx !== si);
                                  setEditingProduct({...editingProduct, variants: v});
                                }} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>


                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setShowEditProductModal(false)}
                        className="px-4 py-2 border rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "categories" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold">Categories Management</h2>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  resetCategoryForm();
                  setShowCategoryForm(!showCategoryForm);
                }}
                className="bg-primary text-primary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-primary/90 transition-all"
                data-testid="add-category-button"
              >
                <Plus className="w-5 h-5" />
                <span>Add Category</span>
              </button>
            </div>

            {showCategoryForm && (
              <div className="bg-white border border-border/40 p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingCategory ? `Edit: ${editingCategory.name}` : "Create New Category"}
                </h3>
                <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="space-y-4">
                  {/* Parent Category Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Parent Category (leave empty for main category)</label>
                    <select
                      value={categoryForm.parent_id || ""}
                      onChange={(e) => setCategoryForm({...categoryForm, parent_id: e.target.value || null})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    >
                      <option value="">-- Main Category (No Parent) --</option>
                      {categories.filter(c => !c.parent_id && c.category_id !== editingCategory?.category_id).map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select a parent to create a sub-category</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Slug *</label>
                    <input
                      type="text"
                      required
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm({...categoryForm, slug: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      disabled={editingCategory !== null}
                    />
                    {editingCategory && <p className="text-xs text-gray-500 mt-1">Slug cannot be changed after creation</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description *</label>
                    <textarea
                      required
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category Image (Optional)</label>
                    
                    {/* Upload Option */}
                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">Upload Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            try {
                              toast.info("Uploading image...");
                              const formData = new FormData();
                              formData.append('file', file);
                              const response = await axios.post(`${API}/cloudinary/upload?folder=paridhaan/categories`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                withCredentials: true
                              });
                              setCategoryForm(prev => ({...prev, image: response.data.url}));
                              toast.success("Image uploaded!");
                            } catch (error) {
                              toast.error("Upload failed");
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary text-sm"
                      />
                    </div>
                    
                    {/* OR Divider */}
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <span className="text-xs text-gray-400">OR</span>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    
                    {/* URL Option */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Paste Image URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={categoryForm.image}
                        onChange={(e) => setCategoryForm({...categoryForm, image: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>
                    
                    {/* Preview */}
                    {categoryForm.image && (
                      <div className="mt-2">
                        <img src={categoryForm.image} alt="Preview" className="w-20 h-20 object-cover rounded border" />
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90 transition-all"
                    >
                      {editingCategory ? "Update Category" : "Create Category"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                        resetCategoryForm();
                      }}
                      className="bg-muted text-muted-foreground px-6 py-2 hover:bg-muted/80 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Main Categories Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Main Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.filter(c => !c.parent_id).map((category) => (
                  <div key={category.category_id} className="bg-white border border-border/40 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {category.image ? (
                      <img src={category.image} alt={category.name} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-4xl">📁</span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-heading font-semibold">{category.name}</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Main</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{category.description}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditCategory(category)}
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 text-sm rounded hover:bg-blue-100 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.category_id)}
                          className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subcategories Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Subcategories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.filter(c => c.parent_id).map((category) => {
                  const parent = categories.find(p => p.category_id === category.parent_id);
                  return (
                    <div key={category.category_id} className="bg-white border border-border/40 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {category.image ? (
                        <img src={category.image} alt={category.name} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                          <span className="text-3xl">📦</span>
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-sm font-semibold line-clamp-1">{category.name}</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Under: {parent?.name || "Unknown"}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditCategory(category)}
                            className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-600 text-xs rounded hover:bg-blue-100 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.category_id)}
                            className="px-2 py-1.5 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {categories.filter(c => c.parent_id).length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-400">
                    No subcategories yet. Create one by selecting a parent category above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold">Orders Management</h2>
              <button
                onClick={handleExportOrders}
                className="bg-secondary text-secondary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-secondary/90 transition-all"
                data-testid="export-orders-button"
              >
                <Upload className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
            </div>
            
            <div className="bg-white border border-border/40 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-paper">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium">Order ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Total</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Payment</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id} className="border-t border-border">
                      <td className="px-6 py-4 font-medium">{order.order_id}</td>
                      <td className="px-6 py-4">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">₹{order.total_amount}</td>
                      <td className="px-6 py-4 capitalize">{order.payment_status}</td>
                      <td className="px-6 py-4">
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.order_id, e.target.value)}
                          className="px-3 py-1 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{order.items.length} items</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "abandoned" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-heading font-bold">🛒 Abandoned Cart Recovery</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={abandonedCartFilter}
                  onChange={(e) => {
                    setAbandonedCartFilter(Number(e.target.value));
                    fetchData();
                  }}
                  className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value={1}>Last 1 hour</option>
                  <option value={24}>Last 24 hours</option>
                  <option value={72}>Last 3 days</option>
                  <option value={168}>Last 7 days</option>
                </select>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            {abandonedCartStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-sm text-amber-600 mb-1">🔥 Hot (1-24 hrs)</p>
                  <p className="text-3xl font-bold text-amber-800">{(abandonedCartStats?.abandoned_24h || 0) - (abandonedCartStats?.abandoned_1h || 0)}</p>
                  <p className="text-xs text-amber-500">Best time to recover!</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 mb-1">⏰ Warm (24-72 hrs)</p>
                  <p className="text-3xl font-bold text-orange-800">{(abandonedCartStats?.abandoned_72h || 0) - (abandonedCartStats?.abandoned_24h || 0)}</p>
                  <p className="text-xs text-orange-500">Still recoverable</p>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-sm text-red-600 mb-1">❄️ Cold (72+ hrs)</p>
                  <p className="text-3xl font-bold text-red-800">{(abandonedCartStats?.abandoned_7d || 0) - (abandonedCartStats?.abandoned_72h || 0)}</p>
                  <p className="text-xs text-red-500">Low recovery chance</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">💰 Potential Revenue</p>
                  <p className="text-3xl font-bold text-purple-800">₹{abandonedCartStats.potential_revenue_lost?.toFixed(0) || 0}</p>
                  <p className="text-xs text-purple-500">Recoverable value</p>
                </div>
              </div>
            )}

            {/* Recovery Tip */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start space-x-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-semibold text-blue-800">Recovery Tips:</p>
                <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
                  <li>Contact within 24 hours for 3x higher recovery rate</li>
                  <li>WhatsApp/Call works better than email for Indian customers</li>
                  <li>Offer 5-10% discount for cart recovery</li>
                </ul>
              </div>
            </div>

            {/* Abandoned Carts Table */}
            <div className="bg-white border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Cart Items</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Abandoned</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {abandonedCarts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                        🎉 No abandoned carts found! Great job!
                      </td>
                    </tr>
                  ) : (
                    abandonedCarts.map((cart) => (
                      <tr key={cart.cart_id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-sm">
                              {cart.user_name || cart.user_email || "Guest User"}
                            </p>
                            {cart.user_email && (
                              <p className="text-xs text-muted-foreground">{cart.user_email}</p>
                            )}
                            {cart.guest_phone && (
                              <p className="text-xs text-green-600">📱 {cart.guest_phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {cart.items.slice(0, 2).map((item, idx) => (
                              <img
                                key={idx}
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-10 h-10 object-cover rounded border"
                                onError={(e) => { e.target.src = 'https://placehold.co/40x40?text=No+Image'; }}
                              />
                            ))}
                            {cart.items.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{cart.items.length - 2} more
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {cart.items_count} item(s)
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-lg text-primary">₹{(cart.cart_total || 0).toFixed(0)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cart.stage === 'fresh' ? 'bg-green-100 text-green-700' :
                            cart.stage === 'warm' ? 'bg-amber-100 text-amber-700' :
                            cart.stage === 'cooling' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {cart.stage_label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={cart.recovery_status || 'pending'}
                            onChange={async (e) => {
                              try {
                                await axios.put(`${API}/admin/abandoned-carts/${cart.cart_id}`, 
                                  { recovery_status: e.target.value },
                                  { withCredentials: true }
                                );
                                toast.success("Status updated!");
                                fetchData();
                              } catch (error) {
                                toast.error("Failed to update status");
                              }
                            }}
                            className="text-xs px-2 py-1 border rounded"
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="contacted">📞 Contacted</option>
                            <option value="recovered">✅ Recovered</option>
                            <option value="lost">❌ Lost</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedAbandonedCart(cart)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              View
                            </button>
                            {cart.guest_phone && (
                              <a
                                href={`https://wa.me/91${cart.guest_phone.replace(/\D/g, '')}?text=Hi! We noticed you left some items in your cart at Paridhaan Creations. Can we help you complete your order?`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cart Detail Modal */}
            {selectedAbandonedCart && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold">Cart Details</h3>
                      <button
                        onClick={() => setSelectedAbandonedCart(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Customer Info */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Customer Information</h4>
                        <p><strong>Name:</strong> {selectedAbandonedCart.user_name || "Not provided"}</p>
                        <p><strong>Email:</strong> {selectedAbandonedCart.user_email || "Not provided"}</p>
                        <p><strong>Phone:</strong> {selectedAbandonedCart.guest_phone || "Not provided"}</p>
                        <p><strong>Cart ID:</strong> {selectedAbandonedCart.cart_id}</p>
                      </div>
                      
                      {/* Items */}
                      <div>
                        <h4 className="font-semibold mb-2">Cart Items</h4>
                        <div className="space-y-2">
                          {selectedAbandonedCart.items.map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-3 p-2 border rounded">
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => { e.target.src = 'https://placehold.co/64x64?text=No+Image'; }}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  ₹{item.price} × {item.quantity} = ₹{item.item_total}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Total */}
                      <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                        <span className="font-semibold">Cart Total:</span>
                        <span className="text-2xl font-bold text-primary">
                          ₹{(selectedAbandonedCart?.cart_total || 0).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex space-x-3">
                        {selectedAbandonedCart.user_email && (
                          <a
                            href={`mailto:${selectedAbandonedCart.user_email}?subject=Complete your order at Paridhaan Creations&body=Hi! We noticed you left some items in your cart. Would you like to complete your order?`}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700"
                          >
                            📧 Send Email
                          </a>
                        )}
                        {selectedAbandonedCart.guest_phone && (
                          <a
                            href={`https://wa.me/91${selectedAbandonedCart.guest_phone.replace(/\D/g, '')}?text=Radhey Radhey! 🙏 Paridhaan Creations se bol rahe hain. Aapne kuch items apne cart mein daale the. Kya hum aapki koi madad kar sakte hain?`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-2 bg-green-600 text-white text-center rounded-lg hover:bg-green-700"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === "collections" && (
          <div data-testid="collections-tab">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                  Festival Collections
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Create and manage festival, seasonal, and curated collections
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingCollection(null);
                  setCollectionForm({
                    name: "",
                    slug: "",
                    description: "",
                    image: "",
                    collection_type: "festival",
                    start_date: "",
                    end_date: "",
                    product_ids: [],
                    is_active: true,
                    is_featured: false,
                    position: 0,
                    badge_text: "",
                    badge_color: "#ef4444"
                  });
                  setShowCollectionForm(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 transition-all"
                data-testid="add-collection-btn"
              >
                <Plus className="w-5 h-5" />
                <span>Add Collection</span>
              </button>
            </div>

            {/* Collection Types Legend */}
            <div className="flex flex-wrap gap-2 mb-6">
              {["festival", "occasion", "seasonal", "curated"].map((type) => (
                <span
                  key={type}
                  className={`px-3 py-1 text-xs rounded-full ${
                    type === "festival" ? "bg-orange-100 text-orange-700" :
                    type === "occasion" ? "bg-purple-100 text-purple-700" :
                    type === "seasonal" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              ))}
            </div>

            {collections.length === 0 ? (
              <div className="bg-white border border-border/40 p-12 text-center rounded-lg">
                <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-heading font-semibold mb-2">No Collections Yet</h3>
                <p className="text-muted-foreground mb-4">Create your first collection to group products by festivals or occasions</p>
                <button
                  onClick={() => setShowCollectionForm(true)}
                  className="px-6 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg"
                >
                  Create First Collection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <div
                    key={collection.collection_id}
                    className="bg-white border border-border/40 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    data-testid={`collection-card-${collection.collection_id}`}
                  >
                    {/* Image */}
                    <div className="relative h-40 bg-gray-100">
                      <img
                        src={collection.image || 'https://placehold.co/400x200?text=' + encodeURIComponent(collection.name)}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/400x200?text=' + encodeURIComponent(collection.name);
                        }}
                      />
                      {/* Status badges */}
                      <div className="absolute top-2 left-2 flex gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          collection.is_active ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                        }`}>
                          {collection.is_active ? "Active" : "Inactive"}
                        </span>
                        {collection.is_featured && (
                          <span className="px-2 py-1 text-xs rounded-full bg-orange-500 text-white font-medium">
                            Featured
                          </span>
                        )}
                      </div>
                      {/* Type badge */}
                      <span className={`absolute top-2 right-2 px-2 py-1 text-xs rounded-full ${
                        collection.collection_type === "festival" ? "bg-orange-100 text-orange-700" :
                        collection.collection_type === "occasion" ? "bg-purple-100 text-purple-700" :
                        collection.collection_type === "seasonal" ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {collection.collection_type}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-1">{collection.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {collection.description || "No description"}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm mb-4">
                        <span className="text-muted-foreground">
                          {collection.product_count || 0} products
                        </span>
                        <span className="text-muted-foreground">
                          Position: {collection.position}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCollection(collection);
                            setCollectionForm({
                              name: collection.name || "",
                              slug: collection.slug || "",
                              description: collection.description || "",
                              image: collection.image || "",
                              collection_type: collection.collection_type || "festival",
                              start_date: collection.start_date ? collection.start_date.split('T')[0] : "",
                              end_date: collection.end_date ? collection.end_date.split('T')[0] : "",
                              product_ids: collection.product_ids || [],
                              is_active: collection.is_active !== false,
                              is_featured: collection.is_featured || false,
                              position: collection.position || 0,
                              badge_text: collection.badge_text || "",
                              badge_color: collection.badge_color || "#ef4444"
                            });
                            setShowCollectionForm(true);
                          }}
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete "${collection.name}" collection?`)) {
                              try {
                                await axios.delete(`${API}/collections/${collection.collection_id}`, { withCredentials: true });
                                toast.success("Collection deleted");
                                setCollections(collections.filter(c => c.collection_id !== collection.collection_id));
                              } catch (error) {
                                toast.error("Failed to delete collection");
                              }
                            }
                          }}
                          className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Collection Form Modal */}
            {showCollectionForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                    <h3 className="text-xl font-bold">
                      {editingCollection ? "Edit Collection" : "Create New Collection"}
                    </h3>
                    <button onClick={() => setShowCollectionForm(false)} className="text-gray-500 hover:text-gray-700">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const payload = {
                          ...collectionForm,
                          start_date: collectionForm.start_date || null,
                          end_date: collectionForm.end_date || null,
                          position: parseInt(collectionForm.position) || 0
                        };
                        
                        if (editingCollection) {
                          await axios.put(`${API}/collections/${editingCollection.collection_id}`, payload, { withCredentials: true });
                          toast.success("Collection updated!");
                        } else {
                          await axios.post(`${API}/collections`, payload, { withCredentials: true });
                          toast.success("Collection created!");
                        }
                        
                        setShowCollectionForm(false);
                        // Refresh collections
                        const res = await axios.get(`${API}/admin/collections`, { withCredentials: true });
                        setCollections(res.data || []);
                      } catch (error) {
                        toast.error(error.response?.data?.detail || "Failed to save collection");
                      }
                    }}
                    className="p-4 space-y-4"
                  >
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name *</label>
                        <input
                          type="text"
                          value={collectionForm.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setCollectionForm({
                              ...collectionForm,
                              name,
                              slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                            });
                          }}
                          className="w-full p-2 border rounded-lg"
                          placeholder="e.g., Diwali Collection"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Slug</label>
                        <input
                          type="text"
                          value={collectionForm.slug}
                          onChange={(e) => setCollectionForm({ ...collectionForm, slug: e.target.value })}
                          className="w-full p-2 border rounded-lg bg-gray-50"
                          placeholder="diwali-collection"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={collectionForm.description}
                        onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                        rows={2}
                        placeholder="Describe this collection..."
                      />
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Collection Image</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={collectionForm.image}
                          onChange={(e) => setCollectionForm({ ...collectionForm, image: e.target.value })}
                          className="flex-1 p-2 border rounded-lg"
                          placeholder="Image URL or upload"
                        />
                        <input
                          type="file"
                          ref={collectionImageRef}
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setCollectionImageUploading(true);
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await axios.post(`${API}/cloudinary/upload`, formData, {
                                withCredentials: true,
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              setCollectionForm({ ...collectionForm, image: res.data.url });
                              toast.success("Image uploaded!");
                            } catch (error) {
                              toast.error("Failed to upload image");
                            } finally {
                              setCollectionImageUploading(false);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => collectionImageRef.current?.click()}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1"
                          disabled={collectionImageUploading}
                        >
                          <Upload className="w-4 h-4" />
                          {collectionImageUploading ? "Uploading..." : "Upload"}
                        </button>
                      </div>
                      {collectionForm.image && (
                        <img src={collectionForm.image} alt="Preview" className="mt-2 h-24 object-cover rounded-lg" />
                      )}
                    </div>

                    {/* Type & Settings */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                          value={collectionForm.collection_type}
                          onChange={(e) => setCollectionForm({ ...collectionForm, collection_type: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="festival">Festival</option>
                          <option value="occasion">Occasion</option>
                          <option value="seasonal">Seasonal</option>
                          <option value="curated">Curated</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Position</label>
                        <input
                          type="number"
                          value={collectionForm.position}
                          onChange={(e) => setCollectionForm({ ...collectionForm, position: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Badge Text</label>
                        <input
                          type="text"
                          value={collectionForm.badge_text}
                          onChange={(e) => setCollectionForm({ ...collectionForm, badge_text: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                          placeholder="e.g., NEW, HOT"
                        />
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Start Date (Optional)</label>
                        <input
                          type="date"
                          value={collectionForm.start_date}
                          onChange={(e) => setCollectionForm({ ...collectionForm, start_date: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                        <input
                          type="date"
                          value={collectionForm.end_date}
                          onChange={(e) => setCollectionForm({ ...collectionForm, end_date: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Status Toggles */}
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={collectionForm.is_active}
                          onChange={(e) => setCollectionForm({ ...collectionForm, is_active: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={collectionForm.is_featured}
                          onChange={(e) => setCollectionForm({ ...collectionForm, is_featured: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Show on Homepage</span>
                      </label>
                    </div>

                    {/* Product Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Products in Collection</label>
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={collectionProductSearch}
                        onChange={(e) => setCollectionProductSearch(e.target.value)}
                        className="w-full p-2 border rounded-lg mb-2"
                      />
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        {products
                          .filter(p => p.name.toLowerCase().includes(collectionProductSearch.toLowerCase()))
                          .map((product) => (
                            <label
                              key={product.product_id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={collectionForm.product_ids.includes(product.product_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCollectionForm({
                                      ...collectionForm,
                                      product_ids: [...collectionForm.product_ids, product.product_id]
                                    });
                                  } else {
                                    setCollectionForm({
                                      ...collectionForm,
                                      product_ids: collectionForm.product_ids.filter(id => id !== product.product_id)
                                    });
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <img
                                src={product.images?.[0] || 'https://placehold.co/40x40'}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">₹{product.price}</p>
                              </div>
                            </label>
                          ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {collectionForm.product_ids.length} products selected
                      </p>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setShowCollectionForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                      >
                        {editingCollection ? "Update Collection" : "Create Collection"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "support" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold">Support Tickets</h2>
              {supportStats && (
                <div className="flex space-x-4">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    Open: {supportStats.open}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    In Progress: {supportStats.in_progress}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Resolved: {supportStats.resolved}
                  </span>
                </div>
              )}
            </div>

            {supportTickets.length === 0 ? (
              <div className="bg-white border border-border/40 p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-heading font-semibold mb-2">No Support Tickets</h3>
                <p className="text-muted-foreground">All customer inquiries will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tickets List */}
                <div className="bg-white border border-border/40 max-h-[600px] overflow-y-auto">
                  {supportTickets.map((ticket) => (
                    <div
                      key={ticket.ticket_id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 border-b border-border cursor-pointer hover:bg-background-paper/50 transition-all ${
                        selectedTicket?.ticket_id === ticket.ticket_id ? "bg-primary/5" : ""
                      }`}
                      data-testid={`support-ticket-${ticket.ticket_id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ticket.status === "open" ? "bg-yellow-100 text-yellow-700" :
                            ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                            ticket.status === "resolved" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {ticket.status.replace("_", " ").toUpperCase()}
                          </span>
                          {ticket.is_return_request && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              Return
                            </span>
                          )}
                          {ticket.images && ticket.images.length > 0 && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                              <Image className="w-3 h-3" />
                              {ticket.images.length}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium mb-1 line-clamp-1">{ticket.subject}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.messages[0]?.message}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 bg-muted rounded">{ticket.category}</span>
                        {ticket.order_id && <span>Order: {ticket.order_id}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ticket Detail */}
                {selectedTicket ? (
                  <div className="bg-white border border-border/40 flex flex-col max-h-[600px]">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg">{selectedTicket.subject}</h3>
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicketStatus(selectedTicket.ticket_id, e.target.value)}
                          className="px-3 py-1 border border-input bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Customer: {selectedTicket.guest_name || "Registered User"}</p>
                        <p>Email: {selectedTicket.guest_email || "N/A"}</p>
                        {selectedTicket.order_id && <p>Order: {selectedTicket.order_id}</p>}
                      </div>
                      
                      {/* Return Request Badge */}
                      {selectedTicket.is_return_request && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <RefreshCw className="w-4 h-4 text-orange-600" />
                            <span className="font-medium text-orange-800">Return Request</span>
                          </div>
                          {selectedTicket.return_reason && (
                            <p className="text-sm text-orange-700">
                              <strong>Reason:</strong> {selectedTicket.return_reason.replace(/_/g, ' ')}
                            </p>
                          )}
                          {selectedTicket.return_status && (
                            <p className="text-sm mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                selectedTicket.return_status === 'approved' ? 'bg-green-100 text-green-700' :
                                selectedTicket.return_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                Return: {selectedTicket.return_status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Customer Uploaded Images */}
                      {selectedTicket.images && selectedTicket.images.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Image className="w-4 h-4" />
                            Customer Images ({selectedTicket.images.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTicket.images.map((img, idx) => (
                              <a 
                                key={idx} 
                                href={img} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img 
                                  src={img} 
                                  alt={`Upload ${idx + 1}`} 
                                  className="w-16 h-16 object-cover rounded border hover:opacity-75 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Customer Uploaded Videos */}
                      {selectedTicket.videos && selectedTicket.videos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2 flex items-center gap-1 text-red-700">
                            <Play className="w-4 h-4" />
                            Video Proof ({selectedTicket.videos.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTicket.videos.map((video, idx) => (
                              <a 
                                key={idx} 
                                href={video} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block relative group"
                              >
                                <div className="w-20 h-20 bg-gray-900 rounded border overflow-hidden">
                                  <video src={video} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-all">
                                    <Play className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                      {selectedTicket.messages?.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            msg.sender === "admin" ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">
                              {msg.sender === "admin" ? "You (Admin)" : "Customer"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    {selectedTicket.status !== "closed" && (
                      <div className="p-4 border-t border-border">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={ticketReply}
                            onChange={(e) => setTicketReply(e.target.value)}
                            placeholder="Type your reply..."
                            className="flex-1 px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                            onKeyPress={(e) => e.key === "Enter" && handleTicketReply(selectedTicket.ticket_id)}
                          />
                          <button
                            onClick={() => handleTicketReply(selectedTicket.ticket_id)}
                            className="bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition-all"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-border/40 flex items-center justify-center p-12">
                    <p className="text-muted-foreground">Select a ticket to view details</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instagram Videos Management */}
        {activeTab === "instagram" && (
          <InstagramManagement instagramVideos={instagramVideos} fetchData={fetchData} />
        )}

        {/* Background Music Management */}
        {activeTab === "music" && (
          <MusicManagement musicTracks={musicTracks} fetchData={fetchData} />
        )}

        {activeTab === "banners" && (
          <div>
            <h2 className="text-2xl font-heading font-bold mb-6">Advanced Banner Management</h2>
            <BannerManagement />
          </div>
        )}

        {/* USP Strip Management */}
        {activeTab === "usp" && (
          <div>
            <USPManagement />
          </div>
        )}

        {/* Ticker Messages Management */}
        {activeTab === "ticker" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                  📢 Ticker Messages
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Manage scrolling announcements shown at the top of your website</p>
              </div>
              <button
                onClick={() => {
                  setTickerForm({ text: "", icon: "✨", is_active: true, order: tickerMessages.length });
                  setEditingTicker(null);
                  setShowTickerForm(!showTickerForm);
                }}
                className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                <span>Add Message</span>
              </button>
            </div>

            {/* Preview Bar */}
            <div className="bg-gradient-to-r from-[#8B1538] via-[#D4AF37] to-[#8B1538] text-white py-2 text-sm overflow-hidden rounded-lg mb-6">
              <div className="animate-marquee whitespace-nowrap inline-flex">
                {[...tickerMessages.filter(m => m.is_active), ...tickerMessages.filter(m => m.is_active)].map((msg, idx) => (
                  <span key={idx} className="font-medium tracking-wide mx-8">
                    {msg.icon} {msg.text} {msg.icon}
                  </span>
                ))}
                {tickerMessages.filter(m => m.is_active).length === 0 && (
                  <span className="mx-8 opacity-50">No active messages - add some above!</span>
                )}
              </div>
            </div>

            {showTickerForm && (
              <div className="bg-white border border-border/40 p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">{editingTicker ? "Edit Message" : "Add New Message"}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (editingTicker) {
                      await axios.put(`${API}/ticker/${editingTicker.message_id}`, tickerForm, { withCredentials: true });
                      toast.success("Message updated!");
                    } else {
                      await axios.post(`${API}/ticker`, tickerForm, { withCredentials: true });
                      toast.success("Message added!");
                    }
                    setShowTickerForm(false);
                    setEditingTicker(null);
                    fetchData();
                  } catch (error) {
                    toast.error("Failed to save message");
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-2">Message Text *</label>
                      <input
                        type="text"
                        required
                        value={tickerForm.text}
                        onChange={(e) => setTickerForm({...tickerForm, text: e.target.value})}
                        placeholder="e.g., Free Shipping on Orders Above ₹999"
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Icon</label>
                      <select
                        value={tickerForm.icon}
                        onChange={(e) => setTickerForm({...tickerForm, icon: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      >
                        <option value="✨">✨ Sparkle</option>
                        <option value="🎁">🎁 Gift</option>
                        <option value="🙏">🙏 Namaste</option>
                        <option value="🪔">🪔 Diya</option>
                        <option value="💰">💰 Money</option>
                        <option value="🚚">🚚 Shipping</option>
                        <option value="🏷️">🏷️ Tag</option>
                        <option value="⭐">⭐ Star</option>
                        <option value="❤️">❤️ Heart</option>
                        <option value="🔥">🔥 Fire</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Display Order</label>
                      <input
                        type="number"
                        value={tickerForm.order}
                        onChange={(e) => setTickerForm({...tickerForm, order: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer mt-6">
                        <input
                          type="checkbox"
                          checked={tickerForm.is_active}
                          onChange={(e) => setTickerForm({...tickerForm, is_active: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">Active (Show on website)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90">
                      {editingTicker ? "Update Message" : "Add Message"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowTickerForm(false); setEditingTicker(null); }}
                      className="bg-muted text-muted-foreground px-6 py-2 hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Messages List */}
            <div className="bg-white border border-border/40 overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Order</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Icon</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Message</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickerMessages.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-muted-foreground">
                        No ticker messages yet. Add your first announcement!
                      </td>
                    </tr>
                  ) : (
                    tickerMessages.map((msg) => (
                      <tr key={msg.message_id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm">{msg.order}</td>
                        <td className="px-4 py-3 text-2xl">{msg.icon}</td>
                        <td className="px-4 py-3">{msg.text}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${msg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {msg.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setTickerForm({
                                  text: msg.text,
                                  icon: msg.icon,
                                  is_active: msg.is_active,
                                  order: msg.order
                                });
                                setEditingTicker(msg);
                                setShowTickerForm(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm("Delete this message?")) {
                                  try {
                                    await axios.delete(`${API}/ticker/${msg.message_id}`, { withCredentials: true });
                                    toast.success("Message deleted");
                                    fetchData();
                                  } catch (error) {
                                    toast.error("Failed to delete");
                                  }
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "coupons" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold">Coupons Management</h2>
              <button
                onClick={() => {
                  resetCouponForm();
                  setShowCouponForm(!showCouponForm);
                }}
                className="bg-primary text-primary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-primary/90 transition-all"
                data-testid="add-coupon-button"
              >
                <Plus className="w-5 h-5" />
                <span>Add Coupon</span>
              </button>
            </div>

            {showCouponForm && (
              <div className="bg-white border border-border/40 p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</h3>
                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary uppercase"
                      placeholder="SAVE10"
                      data-testid="coupon-code-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Discount Percentage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={couponForm.discount_percentage}
                        onChange={(e) => setCouponForm({...couponForm, discount_percentage: e.target.value, discount_amount: ""})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        placeholder="e.g., 10"
                        data-testid="coupon-percentage-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">OR Flat Discount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={couponForm.discount_amount}
                        onChange={(e) => setCouponForm({...couponForm, discount_amount: e.target.value, discount_percentage: ""})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        placeholder="e.g., 100"
                        data-testid="coupon-amount-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Valid From *</label>
                      <input
                        type="datetime-local"
                        required
                        value={couponForm.valid_from}
                        onChange={(e) => setCouponForm({...couponForm, valid_from: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        data-testid="coupon-valid-from"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Valid To *</label>
                      <input
                        type="datetime-local"
                        required
                        value={couponForm.valid_to}
                        onChange={(e) => setCouponForm({...couponForm, valid_to: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                        data-testid="coupon-valid-to"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={couponForm.active}
                      onChange={(e) => setCouponForm({...couponForm, active: e.target.checked})}
                      className="w-4 h-4"
                      data-testid="coupon-active-checkbox"
                    />
                    <label className="text-sm font-medium">Active</label>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90 transition-all"
                      data-testid="coupon-submit-btn"
                    >
                      {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCouponForm(false);
                        resetCouponForm();
                      }}
                      className="bg-muted text-muted-foreground px-6 py-2 hover:bg-muted/80 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Coupons List */}
            {coupons.length === 0 ? (
              <div className="bg-white border border-border/40 p-12 text-center">
                <Tag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-heading font-semibold mb-2">No Coupons Yet</h3>
                <p className="text-muted-foreground mb-6">Create your first discount coupon to attract customers</p>
                <button
                  onClick={() => setShowCouponForm(true)}
                  className="bg-primary text-primary-foreground px-6 py-3 hover:bg-primary/90 transition-all"
                >
                  Create First Coupon
                </button>
              </div>
            ) : (
              <div className="bg-white border border-border/40 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background-paper">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium">Code</th>
                      <th className="px-6 py-4 text-left text-sm font-medium">Discount</th>
                      <th className="px-6 py-4 text-left text-sm font-medium">Valid Period</th>
                      <th className="px-6 py-4 text-left text-sm font-medium">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => {
                      const now = new Date();
                      const validFrom = new Date(coupon.valid_from);
                      const validTo = new Date(coupon.valid_to);
                      const isExpired = now > validTo;
                      const isUpcoming = now < validFrom;
                      const isValid = !isExpired && !isUpcoming && coupon.active;
                      
                      return (
                        <tr key={coupon.coupon_id} className="border-t border-border">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <Tag className="w-4 h-4 text-primary" />
                              <span className="font-mono font-bold text-lg">{coupon.code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1">
                              {coupon.discount_percentage ? (
                                <>
                                  <Percent className="w-4 h-4 text-accent" />
                                  <span className="font-semibold">{coupon.discount_percentage}% OFF</span>
                                </>
                              ) : (
                                <>
                                  <DollarSign className="w-4 h-4 text-accent" />
                                  <span className="font-semibold">₹{coupon.discount_amount} OFF</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-sm">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span>{new Date(coupon.valid_from).toLocaleDateString()}</span>
                              </div>
                              <span className="text-muted-foreground">to</span>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span>{new Date(coupon.valid_to).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleCouponStatus(coupon)}
                              className={`text-sm px-3 py-1 rounded-full font-medium ${
                                isExpired 
                                  ? 'bg-red-100 text-red-700 cursor-not-allowed' 
                                  : isUpcoming
                                  ? 'bg-blue-100 text-blue-700'
                                  : isValid
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              disabled={isExpired}
                              data-testid={`coupon-status-${coupon.coupon_id}`}
                            >
                              {isExpired ? 'Expired' : isUpcoming ? 'Upcoming' : coupon.active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleEditCoupon(coupon)}
                                className="text-primary hover:text-primary/80 transition-colors"
                                data-testid={`edit-coupon-${coupon.coupon_id}`}
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(coupon.coupon_id)}
                                className="text-accent hover:text-accent/80 transition-colors"
                                data-testid={`delete-coupon-${coupon.coupon_id}`}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Site Branding Section */}
            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Site Branding
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Upload and manage your website logos. These will appear in the header and footer of your site.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Header Logo */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Header Logo</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Recommended size: 200 x 80 px (PNG with transparent background)
                  </p>
                  
                  <div className="space-y-4">
                    {siteSettings?.header_logo ? (
                      <div className="relative border border-border rounded-lg p-4 bg-gray-50">
                        <img 
                          src={siteSettings.header_logo.startsWith('/api/') 
                            ? `${API}${siteSettings.header_logo.replace('/api', '')}` 
                            : siteSettings.header_logo} 
                          alt="Header Logo" 
                          className="h-20 w-auto mx-auto object-contain"
                        />
                        <button
                          onClick={() => handleSettingsUpdate('header_logo', null)}
                          className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-gray-50">
                        <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No header logo uploaded</p>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      ref={headerLogoRef}
                      onChange={(e) => handleLogoUpload(e, 'header')}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />
                    <button
                      onClick={() => headerLogoRef.current?.click()}
                      disabled={logoUploading.header}
                      className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {logoUploading.header ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Header Logo
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer Logo */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Footer Logo</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Recommended size: 250 x 100 px (PNG with transparent background)
                  </p>
                  
                  <div className="space-y-4">
                    {siteSettings?.footer_logo ? (
                      <div className="relative border border-border rounded-lg p-4 bg-gray-50">
                        <img 
                          src={siteSettings.footer_logo.startsWith('/api/') 
                            ? `${API}${siteSettings.footer_logo.replace('/api', '')}` 
                            : siteSettings.footer_logo} 
                          alt="Footer Logo" 
                          className="h-24 w-auto mx-auto object-contain"
                        />
                        <button
                          onClick={() => handleSettingsUpdate('footer_logo', null)}
                          className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-gray-50">
                        <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No footer logo uploaded</p>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      ref={footerLogoRef}
                      onChange={(e) => handleLogoUpload(e, 'footer')}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />
                    <button
                      onClick={() => footerLogoRef.current?.click()}
                      disabled={logoUploading.footer}
                      className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {logoUploading.footer ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Footer Logo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div className="mt-8 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Favicon</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The small icon that appears in browser tabs. Recommended size: 32 x 32 px or 64 x 64 px (PNG or ICO)
                </p>
                
                <div className="flex items-center gap-6">
                  {siteSettings?.favicon ? (
                    <div className="relative border border-border rounded-lg p-4 bg-gray-50 w-24 h-24 flex items-center justify-center">
                      <img 
                        src={siteSettings.favicon.startsWith('/api/') 
                          ? `${API}${siteSettings.favicon.replace('/api', '')}` 
                          : siteSettings.favicon} 
                        alt="Favicon" 
                        className="w-12 h-12 object-contain"
                      />
                      <button
                        onClick={() => handleSettingsUpdate('favicon', null)}
                        className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg w-24 h-24 flex items-center justify-center bg-gray-50">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div>
                    <input
                      type="file"
                      ref={faviconRef}
                      onChange={(e) => handleLogoUpload(e, 'favicon')}
                      accept="image/png,image/x-icon,image/jpeg"
                      className="hidden"
                    />
                    <button
                      onClick={() => faviconRef.current?.click()}
                      disabled={logoUploading.favicon}
                      className="bg-secondary text-secondary-foreground px-6 py-2 font-medium hover:bg-secondary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {logoUploading.favicon ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Favicon
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Policy Settings */}
            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-orange-600" />
                Return Policy Settings
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure return policy requirements. Video proof helps prevent fraudulent returns and speeds up genuine return processing.
              </p>
              
              <div className="space-y-6">
                {/* Video Required Toggle */}
                <div className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-orange-800">Require Video Proof for Returns</h3>
                    <p className="text-sm text-orange-600 mt-1">
                      When enabled, customers must upload a video showing the product issue to request a return.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteSettings?.video_required_for_returns !== false}
                      onChange={async (e) => {
                        try {
                          await axios.put(`${API}/admin/settings`, {
                            video_required_for_returns: e.target.checked
                          }, { withCredentials: true });
                          setSiteSettings(prev => ({ ...prev, video_required_for_returns: e.target.checked }));
                          toast.success(e.target.checked ? "Video proof now required for returns" : "Video proof no longer required");
                        } catch (error) {
                          toast.error("Failed to update setting");
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {/* Return Window Days */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold">Return Window (Days)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Number of days after delivery within which customers can request returns.
                    </p>
                  </div>
                  <select
                    value={siteSettings?.return_window_days || 7}
                    onChange={async (e) => {
                      try {
                        await axios.put(`${API}/admin/settings`, {
                          return_window_days: parseInt(e.target.value)
                        }, { withCredentials: true });
                        setSiteSettings(prev => ({ ...prev, return_window_days: parseInt(e.target.value) }));
                        toast.success(`Return window set to ${e.target.value} days`);
                      } catch (error) {
                        toast.error("Failed to update setting");
                      }
                    }}
                    className="px-4 py-2 border border-input rounded-lg bg-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="3">3 Days</option>
                    <option value="5">5 Days</option>
                    <option value="7">7 Days</option>
                    <option value="10">10 Days</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>

                {/* Tips */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Why Video Proof Helps</h4>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Prevents fake return claims - customers can't falsify video evidence easily</li>
                    <li>Speeds up genuine returns - clear evidence = faster processing</li>
                    <li>Better documentation - videos show exact condition of products</li>
                    <li>Reduces disputes - both parties have clear proof</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Database Backup Section */}
            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Database className="w-6 h-6 text-green-600" />
                Database Backup & Restore
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                <strong className="text-red-600">Important:</strong> Your product data is stored locally and may be lost during updates. 
                Create backups regularly to keep your data safe. Backups are stored permanently in Cloudinary.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Section */}
                <div className="border border-green-200 bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-800">
                    <Upload className="w-5 h-5" />
                    Create Backup
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    Save all your products, categories, banners, and collections to cloud storage.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const btn = document.getElementById('backup-btn');
                        btn.disabled = true;
                        btn.innerHTML = '<span class="animate-spin">⏳</span> Creating backup...';
                        
                        const res = await axios.post(`${API}/admin/backup`, {}, { withCredentials: true });
                        
                        if (res.data.success) {
                          toast.success(`Backup created! ${res.data.total_documents} documents saved.`);
                        }
                        
                        btn.disabled = false;
                        btn.innerHTML = '💾 Create Backup Now';
                      } catch (error) {
                        toast.error('Backup failed: ' + (error.response?.data?.detail || error.message));
                        document.getElementById('backup-btn').disabled = false;
                        document.getElementById('backup-btn').innerHTML = '💾 Create Backup Now';
                      }
                    }}
                    id="backup-btn"
                    className="w-full bg-green-600 text-white py-3 font-medium hover:bg-green-700 rounded-lg flex items-center justify-center gap-2"
                  >
                    💾 Create Backup Now
                  </button>
                </div>

                {/* Restore Section */}
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
                    <Download className="w-5 h-5" />
                    Restore from Backup
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Restore your data from the last backup. This will replace current data.
                  </p>
                  <button
                    onClick={async () => {
                      if (!window.confirm('⚠️ Warning: This will replace ALL current data with the backup. Are you sure?')) return;
                      
                      try {
                        const btn = document.getElementById('restore-btn');
                        btn.disabled = true;
                        btn.innerHTML = '<span class="animate-spin">⏳</span> Restoring...';
                        
                        const res = await axios.post(`${API}/admin/backup/restore`, {}, { withCredentials: true });
                        
                        if (res.data.success) {
                          toast.success(`Restored ${res.data.total_restored} documents from backup!`);
                          window.location.reload();
                        }
                        
                        btn.disabled = false;
                        btn.innerHTML = '📥 Restore from Backup';
                      } catch (error) {
                        toast.error('Restore failed: ' + (error.response?.data?.detail || error.message));
                        document.getElementById('restore-btn').disabled = false;
                        document.getElementById('restore-btn').innerHTML = '📥 Restore from Backup';
                      }
                    }}
                    id="restore-btn"
                    className="w-full bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2"
                  >
                    📥 Restore from Backup
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Pro Tip:</strong> Create a backup after adding new products or making important changes. 
                  The system will automatically restore from backup when the database is empty (e.g., after a fork).
                </p>
              </div>
            </div>

            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-6">Notification Settings</h2>
              
              <div className="space-y-6">
                <div className="border-b border-border pb-6">
                  <h3 className="text-lg font-semibold mb-4">SMS Notifications (Twilio)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send SMS updates to customers for order status changes. Configure Twilio credentials in your .env file.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-background-paper">
                      <div>
                        <p className="font-medium">Order Confirmed</p>
                        <p className="text-sm text-muted-foreground">Send SMS when order is confirmed</p>
                      </div>
                      <span className="text-sm bg-green-100 text-green-700 px-3 py-1">Enabled</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-background-paper">
                      <div>
                        <p className="font-medium">Order Shipped</p>
                        <p className="text-sm text-muted-foreground">Send SMS when order is shipped</p>
                      </div>
                      <span className="text-sm bg-green-100 text-green-700 px-3 py-1">Enabled</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-background-paper">
                      <div>
                        <p className="font-medium">Order Delivered</p>
                        <p className="text-sm text-muted-foreground">Send SMS when order is delivered</p>
                      </div>
                      <span className="text-sm bg-green-100 text-green-700 px-3 py-1">Enabled</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-900">
                      <strong>Setup Instructions:</strong> Add the following to <code>/app/backend/.env</code>:
                    </p>
                    <pre className="text-xs bg-white p-2 mt-2 overflow-x-auto">
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890</pre>
                  </div>
                </div>

                <div className="border-b border-border pb-6">
                  <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send email updates to customers. Ready to integrate with SendGrid or AWS SES.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-background-paper">
                      <div>
                        <p className="font-medium">Order Confirmation</p>
                        <p className="text-sm text-muted-foreground">Send email receipt after order</p>
                      </div>
                      <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1">Ready to Configure</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-background-paper">
                      <div>
                        <p className="font-medium">Shipping Updates</p>
                        <p className="text-sm text-muted-foreground">Email tracking information</p>
                      </div>
                      <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1">Ready to Configure</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Low Stock Alerts</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get notified when products are running low on stock.
                  </p>
                  
                  <div className="flex items-center justify-between p-4 bg-background-paper">
                    <div>
                      <p className="font-medium">Alert Threshold</p>
                      <p className="text-sm text-muted-foreground">Currently set to 5 units</p>
                    </div>
                    <span className="text-sm bg-green-100 text-green-700 px-3 py-1">Active</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-6">Export & Reports</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-border p-6">
                  <h3 className="text-lg font-semibold mb-3">Product Export</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export all products to CSV for inventory management
                  </p>
                  <button
                    onClick={handleExportProducts}
                    className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90"
                  >
                    Export Products
                  </button>
                </div>

                <div className="border border-border p-6">
                  <h3 className="text-lg font-semibold mb-3">Order Export</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export all orders to CSV for accounting and analysis
                  </p>
                  <button
                    onClick={handleExportOrders}
                    className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90"
                  >
                    Export Orders
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GST & Invoice Settings Tab */}
        {activeTab === "gst" && (
          <div className="space-y-6">
            {/* Business GST Details */}
            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-primary" />
                GST Settings
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure your business GST details for tax compliance and invoice generation.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Business Details</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Business Name *</label>
                    <input
                      type="text"
                      value={gstForm.business_name}
                      onChange={(e) => setGstForm({...gstForm, business_name: e.target.value})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Paridhaan Creations"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">GSTIN *</label>
                    <input
                      type="text"
                      value={gstForm.gstin}
                      onChange={(e) => setGstForm({...gstForm, gstin: e.target.value.toUpperCase()})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      placeholder="08BFVPG3792N1ZH"
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground mt-1">15-character GST Identification Number</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">PAN</label>
                    <input
                      type="text"
                      value={gstForm.pan}
                      onChange={(e) => setGstForm({...gstForm, pan: e.target.value.toUpperCase()})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      placeholder="BFVPG3792N"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Business Address *</label>
                    <textarea
                      value={gstForm.business_address}
                      onChange={(e) => setGstForm({...gstForm, business_address: e.target.value})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      placeholder="Terra City 1, Tijara, 301411"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">State *</label>
                      <select
                        value={gstForm.business_state}
                        onChange={(e) => {
                          const state = indianStates.find(s => s.name === e.target.value);
                          setGstForm({
                            ...gstForm, 
                            business_state: e.target.value,
                            business_state_code: state?.code || ""
                          });
                        }}
                        className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select State</option>
                        {indianStates.map(state => (
                          <option key={state.code} value={state.name}>{state.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">State Code</label>
                      <input
                        type="text"
                        value={gstForm.business_state_code}
                        onChange={(e) => setGstForm({...gstForm, business_state_code: e.target.value})}
                        className="w-full border border-border px-4 py-2 bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Business Email</label>
                      <input
                        type="email"
                        value={gstForm.business_email}
                        onChange={(e) => setGstForm({...gstForm, business_email: e.target.value})}
                        className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Business Phone</label>
                      <input
                        type="tel"
                        value={gstForm.business_phone}
                        onChange={(e) => setGstForm({...gstForm, business_phone: e.target.value})}
                        className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>
                </div>

                {/* GST Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">GST Configuration</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Default GST Rate (%)</label>
                    <select
                      value={gstForm.default_gst_rate}
                      onChange={(e) => setGstForm({...gstForm, default_gst_rate: parseFloat(e.target.value)})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Applied to products without specific GST rate</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 border border-border">
                    <div>
                      <p className="font-medium">GST Enabled</p>
                      <p className="text-sm text-muted-foreground">Show GST breakdown on invoices</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gstForm.gst_enabled}
                        onChange={(e) => setGstForm({...gstForm, gst_enabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 border border-border">
                    <div>
                      <p className="font-medium">Prices Include GST</p>
                      <p className="text-sm text-muted-foreground">Product prices are MRP (inclusive of GST)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gstForm.prices_include_gst}
                        onChange={(e) => setGstForm({...gstForm, prices_include_gst: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <h3 className="text-lg font-semibold border-b pb-2 mt-6">Invoice Settings</h3>

                  <div>
                    <label className="block text-sm font-medium mb-1">Invoice Prefix</label>
                    <input
                      type="text"
                      value={gstForm.invoice_prefix}
                      onChange={(e) => setGstForm({...gstForm, invoice_prefix: e.target.value.toUpperCase()})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="PC"
                      maxLength={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Invoice number format: PC-2024-0001</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Authorized Signatory</label>
                    <input
                      type="text"
                      value={gstForm.authorized_signatory}
                      onChange={(e) => setGstForm({...gstForm, authorized_signatory: e.target.value})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Paridhaan Creations"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Invoice Footer Text</label>
                    <textarea
                      value={gstForm.invoice_footer_text}
                      onChange={(e) => setGstForm({...gstForm, invoice_footer_text: e.target.value})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      placeholder="Thank you for shopping with us!"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Bank Details (for Invoice)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={gstForm.bank_name}
                      onChange={(e) => setGstForm({...gstForm, bank_name: e.target.value})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="State Bank of India"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Number</label>
                    <input
                      type="text"
                      value={gstForm.bank_account_number}
                      onChange={(e) => setGstForm({...gstForm, bank_account_number: e.target.value})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={gstForm.bank_ifsc}
                      onChange={(e) => setGstForm({...gstForm, bank_ifsc: e.target.value.toUpperCase()})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="SBIN0001234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Branch</label>
                    <input
                      type="text"
                      value={gstForm.bank_branch}
                      onChange={(e) => setGstForm({...gstForm, bank_branch: e.target.value})}
                      className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Main Branch"
                    />
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Terms & Conditions</h3>
                <textarea
                  value={gstForm.terms_and_conditions}
                  onChange={(e) => setGstForm({...gstForm, terms_and_conditions: e.target.value})}
                  className="w-full border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="1. Goods once sold will not be taken back.&#10;2. No warranty on decorative items."
                />
              </div>

              <button
                onClick={handleSaveGstSettings}
                className="mt-6 bg-primary text-primary-foreground px-8 py-3 font-medium hover:bg-primary/90 transition-colors"
              >
                Save GST Settings
              </button>
            </div>

            {/* Category GST Rates */}
            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-6">Category GST Rates</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Set default GST rates for each category. Products without individual GST rates will use these.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">GST Rate (%)</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">HSN Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categories.map(category => (
                      <tr key={category.category_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{category.name}</td>
                        <td className="px-4 py-3">
                          <select
                            defaultValue={category.gst_rate || ""}
                            onChange={(e) => {
                              const newRate = e.target.value ? parseFloat(e.target.value) : null;
                              handleUpdateCategoryGst(category.category_id, newRate, category.hsn_code || "");
                            }}
                            className="border border-border px-3 py-1 text-sm"
                          >
                            <option value="">Use Default</option>
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            defaultValue={category.hsn_code || ""}
                            onBlur={(e) => handleUpdateCategoryGst(category.category_id, category.gst_rate, e.target.value)}
                            className="border border-border px-3 py-1 text-sm w-24"
                            placeholder="HSN Code"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 ${category.gst_rate ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {category.gst_rate ? `${category.gst_rate}% Set` : 'Using Default'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-6">Generate Invoices</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Generate GST-compliant tax invoices for confirmed/paid orders.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Order ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Invoice</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.filter(o => o.payment_status === 'paid' || ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status)).slice(0, 10).map(order => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{order.order_id}</td>
                        <td className="px-4 py-3">{order.shipping_address?.full_name}</td>
                        <td className="px-4 py-3 font-medium">₹{(order.total_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 ${
                            order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {order.invoice_number ? (
                            <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1">{order.invoice_number}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not Generated</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleGenerateInvoice(order.order_id)}
                            className="text-sm bg-primary text-primary-foreground px-3 py-1 hover:bg-primary/90"
                          >
                            {order.invoice_number ? 'Download PDF' : 'Generate Invoice'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Shipping Tab - Shiprocket Integration */}
        {activeTab === "shipping" && (
          <div className="space-y-6">
            {/* Shipping Overview */}
            <div className="bg-white border border-border/40 p-6">
              <h2 className="text-2xl font-heading font-bold mb-2 flex items-center gap-2">
                <Truck className="w-6 h-6 text-primary" />
                Shiprocket Shipping
              </h2>
              <p className="text-muted-foreground mb-6">
                Manage shipments, assign couriers, and track deliveries through Shiprocket integration.
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-700">{orders.filter(o => o.payment_status === 'paid' && !shipments.find(s => s.order_id === o.order_id)).length}</p>
                  <p className="text-sm text-yellow-600">Ready to Ship</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{shipments.filter(s => s.status === 'processing').length}</p>
                  <p className="text-sm text-blue-600">Processing</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">{shipments.filter(s => ['shipped', 'in_transit'].includes(s.status)).length}</p>
                  <p className="text-sm text-purple-600">In Transit</p>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{shipments.filter(s => s.status === 'delivered').length}</p>
                  <p className="text-sm text-green-600">Delivered</p>
                </div>
              </div>
            </div>

            {/* Orders Ready for Shipping */}
            <div className="bg-white border border-border/40 p-6">
              <h3 className="text-lg font-semibold mb-4">Orders Ready to Ship</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Order ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Delivery Address</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders
                      .filter(o => o.payment_status === 'paid' && !shipments.find(s => s.order_id === o.order_id && s.shiprocket_order_id))
                      .map(order => (
                        <tr key={order.order_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm">{order.order_id}</td>
                          <td className="px-4 py-3">{order.shipping_address?.full_name}</td>
                          <td className="px-4 py-3 text-sm">
                            {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}
                          </td>
                          <td className="px-4 py-3 font-medium">₹{order.total_amount?.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleCreateShipment(order.order_id)}
                              disabled={shippingLoading}
                              className="bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 disabled:opacity-50"
                            >
                              {shippingLoading ? 'Processing...' : 'Create Shipment'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    {orders.filter(o => o.payment_status === 'paid' && !shipments.find(s => s.order_id === o.order_id && s.shiprocket_order_id)).length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-muted-foreground">
                          No orders ready for shipping
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Courier Selection Modal */}
            {selectedOrderForShipping && availableCouriers.length > 0 && (
              <div className="bg-white border-2 border-primary/50 p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Select Courier for Order: {selectedOrderForShipping}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableCouriers.map(courier => (
                    <div 
                      key={courier.courier_id}
                      className="border border-border p-4 rounded-lg hover:border-primary cursor-pointer transition-all"
                      onClick={() => handleAssignCourier(selectedOrderForShipping, courier.courier_id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{courier.courier_name}</h4>
                        <span className="text-lg font-bold text-primary">₹{courier.rate}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Estimated: {courier.etd}</p>
                      {courier.rating && (
                        <p className="text-xs text-yellow-600">Rating: {courier.rating}/5</p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {setSelectedOrderForShipping(null); setAvailableCouriers([]);}}
                  className="mt-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel Selection
                </button>
              </div>
            )}

            {/* Active Shipments */}
            <div className="bg-white border border-border/40 p-6">
              <h3 className="text-lg font-semibold mb-4">Active Shipments</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Order ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">AWB</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Courier</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shipments.map(shipment => (
                      <tr key={shipment.shipment_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{shipment.order_id}</td>
                        <td className="px-4 py-3">
                          {shipment.awb_number ? (
                            <span className="font-mono bg-blue-100 text-blue-700 px-2 py-1 text-sm">{shipment.awb_number}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{shipment.courier_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            shipment.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            shipment.status === 'shipped' || shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                            shipment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {shipment.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {shipment.shipping_rate ? `₹${shipment.shipping_rate}` : '-'}
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          {/* Combined PDF - Shipping Label + Invoice */}
                          {shipment.awb_number && (
                            <button
                              onClick={() => handleDownloadCombinedPDF(shipment.order_id)}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 hover:bg-green-200"
                              data-testid={`combined-pdf-${shipment.order_id}`}
                            >
                              📦 Combined PDF
                            </button>
                          )}
                          {shipment.label_url && (
                            <a 
                              href={shipment.label_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs bg-gray-100 px-2 py-1 hover:bg-gray-200"
                            >
                              Label
                            </a>
                          )}
                          {shipment.tracking_url && (
                            <a 
                              href={shipment.tracking_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs bg-primary/10 text-primary px-2 py-1 hover:bg-primary/20"
                            >
                              Track
                            </a>
                          )}
                          {shipment.status !== 'delivered' && shipment.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelShipment(shipment.order_id)}
                              className="text-xs bg-red-100 text-red-700 px-2 py-1 hover:bg-red-200"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {shipments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                          No shipments yet. Create shipments from paid orders above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
