import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { Package, Users, ShoppingCart, DollarSign, Plus, Edit, Trash2, Upload, TrendingUp, AlertTriangle, Tag, Calendar, Percent, Image, X, Settings, Truck } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import BannerManagement from "../components/admin/BannerManagement";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [analytics, setAnalytics] = useState(null);
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
  const [customerInsights, setCustomerInsights] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
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
    hsn_code: ""
  });

  const ladduGopalSizeOptions = ["0", "1", "2", "3", "4", "5", "6", "6+"];

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    image: ""
  });

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

  // Shipping state
  const [shipments, setShipments] = useState([]);
  const [selectedOrderForShipping, setSelectedOrderForShipping] = useState(null);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [shippingLoading, setShippingLoading] = useState(false);

  // Abandoned Cart Recovery state
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [abandonedCartStats, setAbandonedCartStats] = useState(null);
  const [selectedAbandonedCart, setSelectedAbandonedCart] = useState(null);
  const [abandonedCartFilter, setAbandonedCartFilter] = useState(1); // hours threshold

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
        const response = await axios.get(`${API}/products`);
        setProducts(response.data);
      } else if (activeTab === "categories") {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data);
      } else if (activeTab === "orders") {
        const response = await axios.get(`${API}/admin/orders`, { withCredentials: true });
        setOrders(response.data);
      } else if (activeTab === "banners") {
        const response = await axios.get(`${API}/banners/all`, { withCredentials: true });
        setBanners(response.data);
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
  }, [activeTab]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: productForm.category,
        images: productForm.images.filter(url => url),
        stock: parseInt(productForm.stock),
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
        hsn_code: productForm.hsn_code || null
      };
      
      await axios.post(`${API}/products`, productData, { withCredentials: true });
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
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await axios.post(`${API}/upload/images`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.uploaded && response.data.uploaded.length > 0) {
        const newUrls = response.data.uploaded.map(img => `${API}${img.url.replace('/api', '')}`);
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images.filter(url => url !== ""), ...newUrls]
        }));
        toast.success(`${response.data.uploaded.length} image(s) uploaded`);
      }

      if (response.data.errors && response.data.errors.length > 0) {
        response.data.errors.forEach(err => toast.error(`${err.filename}: ${err.error}`));
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

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await axios.delete(`${API}/products/${productId}`, { withCredentials: true });
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
      const updateData = {
        name: editingProduct.name,
        description: editingProduct.description,
        price: parseFloat(editingProduct.price),
        category: editingProduct.category,
        images: editingProduct.images,
        stock: parseInt(editingProduct.stock),
        featured: editingProduct.featured,
        badge: editingProduct.badge || null,
        laddu_gopal_sizes: editingProduct.laddu_gopal_sizes?.length > 0 ? editingProduct.laddu_gopal_sizes : null,
        material: editingProduct.material || null,
        color: editingProduct.color || null,
        sku: editingProduct.sku || null
      };
      
      await axios.put(`${API}/products/${editingProduct.product_id}`, updateData, { withCredentials: true });
      toast.success("Product updated successfully!");
      setShowEditProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to update product");
      console.error(error);
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
      const response = await axios.post(`${API}/upload/image`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Use functional update to ensure we get the latest state
      setBannerForm(prev => ({ ...prev, image: response.data.url }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
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
        ...bannerForm,
        category: bannerForm.banner_type === 'hero' ? null : (bannerForm.category || null),
        start_date: bannerForm.start_date ? new Date(bannerForm.start_date).toISOString() : null,
        end_date: bannerForm.end_date ? new Date(bannerForm.end_date).toISOString() : null
      };
      await axios.post(`${API}/banners`, bannerData, { withCredentials: true });
      toast.success("Banner created successfully");
      setShowBannerForm(false);
      resetBannerForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to create banner");
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

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      category: "",
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
      hsn_code: ""
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      image: ""
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
          {["analytics", "insights", "products", "categories", "orders", "shipping", "abandoned", "support", "banners", "coupons", "gst", "settings"].map((tab) => (
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
              {tab === "gst" ? "GST & Invoice" : tab === "abandoned" ? "Abandoned Carts" : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                <p className="text-3xl font-bold mb-2">{analytics.total_orders}</p>
                <p className="text-muted-foreground">Total Orders</p>
              </div>

              <div className="bg-white border border-border/40 p-6" data-testid="total-revenue-card">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-10 h-10 text-accent" />
                </div>
                <p className="text-3xl font-bold mb-2">₹{analytics.total_revenue.toFixed(2)}</p>
                <p className="text-muted-foreground">Total Revenue</p>
              </div>

              <div className="bg-white border border-border/40 p-6" data-testid="total-products-card">
                <div className="flex items-center justify-between mb-4">
                  <Package className="w-10 h-10 text-secondary" />
                </div>
                <p className="text-3xl font-bold mb-2">{analytics.total_products}</p>
                <p className="text-muted-foreground">Total Products</p>
              </div>

              <div className="bg-white border border-border/40 p-6" data-testid="total-users-card">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <p className="text-3xl font-bold mb-2">{analytics.total_users}</p>
                <p className="text-muted-foreground">Total Users</p>
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                  <h3 className="text-xl font-heading font-bold text-amber-900">Low Stock Alert</h3>
                </div>
                <div className="space-y-2">
                  {lowStockProducts.map(product => (
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
                    <span className="text-xl font-bold">₹{analytics.total_orders > 0 ? (analytics.total_revenue / analytics.total_orders).toFixed(2) : 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Low Stock Items</span>
                    <span className="text-xl font-bold text-amber-600">{lowStockProducts.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Products per Category</span>
                    <span className="text-xl font-bold">{analytics.total_products / categoryData.length || 0}</span>
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
                <p className="text-3xl font-bold mb-2">{customerInsights.total_customers}</p>
                <p className="text-muted-foreground">Total Customers</p>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <p className="text-3xl font-bold mb-2">{customerInsights.repeat_customers}</p>
                <p className="text-muted-foreground">Repeat Customers</p>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <p className="text-3xl font-bold mb-2">{customerInsights.repeat_rate.toFixed(1)}%</p>
                <p className="text-muted-foreground">Repeat Rate</p>
              </div>

              <div className="bg-white border border-border/40 p-6">
                <p className="text-3xl font-bold mb-2">₹{customerInsights.avg_order_value.toFixed(2)}</p>
                <p className="text-muted-foreground">Avg Order Value</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-border/40 p-6">
                <h3 className="text-xl font-heading font-bold mb-6">Top Categories</h3>
                <div className="space-y-3">
                  {Object.entries(customerInsights.top_categories).map(([category, count]) => (
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
                  {customerInsights.vip_customers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-background-paper">
                      <div>
                        <p className="font-medium text-sm">{customer.customer_id.substring(0, 20)}...</p>
                        <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                      </div>
                      <p className="text-lg font-bold text-accent">₹{customer.total_spent.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-border/40 p-6">
              <h3 className="text-xl font-heading font-bold mb-4">Recent Activity</h3>
              <p className="text-muted-foreground">
                <strong>{customerInsights.recent_orders_30days}</strong> orders in the last 30 days
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
                    <label className="block text-sm font-medium mb-2">Description *</label>
                    <textarea
                      required
                      value={productForm.description}
                      onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      rows="3"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Category *</label>
                      <select
                        required
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      >
                        <option value="">Select Category</option>
                        <option value="handicrafts">Handicrafts</option>
                        <option value="pooja">Pooja Items</option>
                        <option value="artificial-jewellery">Artificial Jewellery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Stock *</label>
                      <input
                        type="number"
                        required
                        value={productForm.stock}
                        onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
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
                    <label className="block text-sm font-medium mb-2">Product Images</label>
                    
                    {/* Image Upload Area */}
                    <div className="border-2 border-dashed border-border rounded-lg p-6 mb-4">
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
                        <Upload className={`w-10 h-10 mb-2 ${uploading ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm text-muted-foreground">
                          {uploading ? 'Uploading...' : 'Click to upload or drag & drop'}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 5MB</span>
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
                  {products.map((product) => (
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
                    <div className="grid grid-cols-2 gap-4">
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
                        <label className="block text-sm font-medium mb-1">Price (₹)</label>
                        <input
                          type="number"
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                        />
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
                          onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                        >
                          <option value="handicrafts">Handicrafts</option>
                          <option value="pooja">Pooja Items</option>
                          <option value="artificial-jewellery">Artificial Jewellery</option>
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
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                className="bg-primary text-primary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-primary/90 transition-all"
                data-testid="add-category-button"
              >
                <Plus className="w-5 h-5" />
                <span>Add Category</span>
              </button>
            </div>

            {showCategoryForm && (
              <div className="bg-white border border-border/40 p-6 mb-6">
                <form onSubmit={handleCreateCategory} className="space-y-4">
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
                    />
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
                    <label className="block text-sm font-medium mb-2">Image URL *</label>
                    <input
                      type="url"
                      required
                      value={categoryForm.image}
                      onChange={(e) => setCategoryForm({...categoryForm, image: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90 transition-all"
                    >
                      Create Category
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false);
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <div key={category.category_id} className="bg-white border border-border/40 overflow-hidden">
                  <img src={category.image} alt={category.name} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="text-xl font-heading font-semibold mb-2">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              ))}
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
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          ticket.status === "open" ? "bg-yellow-100 text-yellow-700" :
                          ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          ticket.status === "resolved" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {ticket.status.replace("_", " ").toUpperCase()}
                        </span>
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

        {activeTab === "banners" && (
          <div>
            <h2 className="text-2xl font-heading font-bold mb-6">Advanced Banner Management</h2>
            <BannerManagement />
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
                        <td className="px-4 py-3 font-medium">₹{order.total_amount.toFixed(2)}</td>
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
