import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, Trash2, Edit2, Eye, EyeOff, Upload, Monitor, Smartphone, 
  Calendar, Users, MousePointer, BarChart3, Video, Code, Image,
  ChevronDown, ChevronUp, GripVertical, X, Check, Pause, Play
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Banner placement zones
const PLACEMENTS = [
  { value: "hero", label: "🏠 Homepage Hero Slider", size: "1920 x 600", description: "Main homepage banner slider" },
  { value: "below_hero", label: "📦 Homepage Below Hero", size: "1200 x 400", description: "Section below main slider" },
  { value: "popup", label: "🎯 Homepage Popup", size: "600 x 400", description: "Modal popup on homepage" },
  { value: "category_header", label: "📑 Category Page Header", size: "1200 x 250", description: "Top of category pages" },
  { value: "category_sidebar", label: "📐 Category Sidebar", size: "300 x 600", description: "Side banner on category pages" },
  { value: "category_footer", label: "📋 Category Footer", size: "1200 x 100", description: "Bottom of category pages" },
  { value: "product_page", label: "🛍️ Product Page", size: "800 x 200", description: "Banner on product detail page" },
  { value: "cart_page", label: "🛒 Cart Page", size: "800 x 150", description: "Promotional banner in cart" },
  { value: "checkout_page", label: "💳 Checkout Page", size: "600 x 100", description: "Offer banner during checkout" }
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", icon: Edit2, color: "gray" },
  { value: "active", label: "Active", icon: Play, color: "green" },
  { value: "paused", label: "Paused", icon: Pause, color: "yellow" },
  { value: "scheduled", label: "Scheduled", icon: Calendar, color: "blue" },
  { value: "expired", label: "Expired", icon: EyeOff, color: "red" }
];

const CONTENT_TYPES = [
  { value: "image", label: "Image", icon: Image },
  { value: "video", label: "Video", icon: Video },
  { value: "html", label: "HTML/Rich", icon: Code }
];

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "handicrafts", label: "Handicrafts" },
  { value: "pooja", label: "Pooja Articles" },
  { value: "perfumes", label: "Perfumes" },
  { value: "jewellery", label: "Jewellery" }
];

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [filterPlacement, setFilterPlacement] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [uploading, setUploading] = useState({ desktop: false, mobile: false });
  const desktopFileRef = useRef(null);
  const mobileFileRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: "",
    image_desktop: "",
    image_mobile: "",
    placement: "hero",
    link: "",
    link_type: "internal",
    cta_text: "",
    category: "",
    target_audience: "all",
    target_device: "all",
    status: "active",
    position: 1,
    start_date: "",
    end_date: "",
    content_type: "image",
    video_url: "",
    html_content: "",
    popup_delay: 0,
    popup_frequency: "once_per_session"
  });

  useEffect(() => {
    fetchBanners();
    fetchStats();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/banners/all`, { withCredentials: true });
      setBanners(response.data);
    } catch (error) {
      toast.error("Failed to fetch banners");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/banners/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats");
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use JPG, PNG, WebP, or GIF");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum 5MB");
      return;
    }

    setUploading(prev => ({ ...prev, [type]: true }));
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/image`, formDataUpload, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ 
        ...prev, 
        [type === 'desktop' ? 'image_desktop' : 'image_mobile']: response.data.url 
      }));
      toast.success(`${type === 'desktop' ? 'Desktop' : 'Mobile'} image uploaded`);
    } catch (error) {
      console.error("Upload error:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.detail || "Upload failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.image_desktop && formData.content_type === 'image') {
      toast.error("Please upload a desktop image");
      return;
    }

    // Validate category for category-specific placements
    const categoryPlacements = ['category_header', 'category_sidebar', 'category_footer'];
    if (categoryPlacements.includes(formData.placement) && !formData.category) {
      toast.error("Please select a category for this banner placement");
      return;
    }

    try {
      const payload = {
        ...formData,
        category: formData.category || null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
      };

      if (editingBanner) {
        await axios.put(`${API}/banners/${editingBanner.banner_id}`, payload, { withCredentials: true });
        toast.success("Banner updated");
      } else {
        await axios.post(`${API}/banners`, payload, { withCredentials: true });
        toast.success("Banner created");
      }
      
      resetForm();
      fetchBanners();
      fetchStats();
    } catch (error) {
      toast.error("Failed to save banner");
    }
  };

  const handleStatusChange = async (bannerId, newStatus) => {
    try {
      await axios.patch(`${API}/banners/${bannerId}/status?status=${newStatus}`, {}, { withCredentials: true });
      toast.success(`Status updated to ${newStatus}`);
      fetchBanners();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    
    try {
      await axios.delete(`${API}/banners/${bannerId}`, { withCredentials: true });
      toast.success("Banner deleted");
      fetchBanners();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete banner");
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      image_desktop: banner.image_desktop || banner.image || "",
      image_mobile: banner.image_mobile || "",
      placement: banner.placement || banner.banner_type || "hero",
      link: banner.link || "",
      link_type: banner.link_type || "internal",
      cta_text: banner.cta_text || "",
      category: banner.category || "",
      target_audience: banner.target_audience || "all",
      target_device: banner.target_device || "all",
      status: banner.status || "active",
      position: banner.position || 1,
      start_date: banner.start_date ? banner.start_date.slice(0, 16) : "",
      end_date: banner.end_date ? banner.end_date.slice(0, 16) : "",
      content_type: banner.content_type || "image",
      video_url: banner.video_url || "",
      html_content: banner.html_content || "",
      popup_delay: banner.popup_delay || 0,
      popup_frequency: banner.popup_frequency || "once_per_session"
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      image_desktop: "",
      image_mobile: "",
      placement: "hero",
      link: "",
      link_type: "internal",
      cta_text: "",
      category: "",
      target_audience: "all",
      target_device: "all",
      status: "active",
      position: 1,
      start_date: "",
      end_date: "",
      content_type: "image",
      video_url: "",
      html_content: "",
      popup_delay: 0,
      popup_frequency: "once_per_session"
    });
    setEditingBanner(null);
    setShowForm(false);
  };

  const getStatusColor = (status) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return opt?.color || "gray";
  };

  const getPlacementInfo = (placement) => {
    return PLACEMENTS.find(p => p.value === placement) || PLACEMENTS[0];
  };

  const filteredBanners = banners.filter(b => {
    const placementMatch = !filterPlacement || (b.placement || b.banner_type) === filterPlacement;
    const statusMatch = !filterStatus || b.status === filterStatus;
    return placementMatch && statusMatch;
  });

  // Group banners by placement
  const groupedBanners = filteredBanners.reduce((acc, banner) => {
    const placement = banner.placement || banner.banner_type || "hero";
    if (!acc[placement]) acc[placement] = [];
    acc[placement].push(banner);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <p className="text-sm opacity-80">Total Banners</p>
            <p className="text-2xl font-bold">{stats.total_banners}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
            <p className="text-sm opacity-80">Active</p>
            <p className="text-2xl font-bold">{stats.active_banners}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <p className="text-sm opacity-80">Total Impressions</p>
            <p className="text-2xl font-bold">
              {Object.values(stats.by_placement || {}).reduce((sum, p) => sum + (p.total_impressions || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg">
            <p className="text-sm opacity-80">Total Clicks</p>
            <p className="text-2xl font-bold">
              {Object.values(stats.by_placement || {}).reduce((sum, p) => sum + (p.total_clicks || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border">
        <div className="flex gap-3">
          <select
            value={filterPlacement}
            onChange={(e) => setFilterPlacement(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Placements</option>
            {PLACEMENTS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          data-testid="add-banner-btn"
        >
          <Plus className="w-4 h-4" />
          Add Banner
        </button>
      </div>

      {/* Banner Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              {editingBanner ? "Edit Banner" : "Create New Banner"}
            </h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Banner Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Festival Sale Banner"
                  data-testid="banner-title-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  data-testid="banner-status-select"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Placement & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Placement Zone *</label>
                <select
                  value={formData.placement}
                  onChange={(e) => setFormData(prev => ({ ...prev, placement: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  data-testid="banner-placement-select"
                >
                  {PLACEMENTS.map(p => (
                    <option key={p.value} value={p.value}>{p.label} ({p.size})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {getPlacementInfo(formData.placement)?.description}
                </p>
              </div>
              
              {['category_header', 'category_sidebar', 'category_footer'].includes(formData.placement) && (
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                    data-testid="banner-category-select"
                  >
                    {CATEGORIES.slice(1).map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Content Type</label>
              <div className="flex gap-4">
                {CONTENT_TYPES.map(ct => (
                  <label key={ct.value} className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer ${formData.content_type === ct.value ? 'border-primary bg-primary/5' : ''}`}>
                    <input
                      type="radio"
                      name="content_type"
                      value={ct.value}
                      checked={formData.content_type === ct.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value }))}
                      className="hidden"
                    />
                    <ct.icon className="w-4 h-4" />
                    {ct.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Image Upload Section */}
            {formData.content_type === 'image' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Desktop Image */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Monitor className="w-4 h-4 inline mr-1" />
                    Desktop Image * ({getPlacementInfo(formData.placement)?.size})
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
                      uploading.desktop ? 'border-blue-400 bg-blue-50' : 
                      formData.image_desktop ? 'border-green-400' : 'border-gray-300 hover:border-primary'
                    }`}
                    onClick={() => !formData.image_desktop && desktopFileRef.current?.click()}
                  >
                    <input
                      ref={desktopFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'desktop')}
                      className="hidden"
                    />
                    {uploading.desktop ? (
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </div>
                    ) : formData.image_desktop ? (
                      <div className="space-y-2">
                        <img src={formData.image_desktop.startsWith('/api') ? `${API.replace('/api', '')}${formData.image_desktop}` : formData.image_desktop} alt="Desktop" className="max-h-32 mx-auto rounded" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, image_desktop: '' })); }} className="text-red-500 text-sm">Remove</button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload desktop image</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile Image */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Smartphone className="w-4 h-4 inline mr-1" />
                    Mobile Image (Optional)
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
                      uploading.mobile ? 'border-blue-400 bg-blue-50' : 
                      formData.image_mobile ? 'border-green-400' : 'border-gray-300 hover:border-primary'
                    }`}
                    onClick={() => !formData.image_mobile && mobileFileRef.current?.click()}
                  >
                    <input
                      ref={mobileFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'mobile')}
                      className="hidden"
                    />
                    {uploading.mobile ? (
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </div>
                    ) : formData.image_mobile ? (
                      <div className="space-y-2">
                        <img src={formData.image_mobile.startsWith('/api') ? `${API.replace('/api', '')}${formData.image_mobile}` : formData.image_mobile} alt="Mobile" className="max-h-32 mx-auto rounded" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, image_mobile: '' })); }} className="text-red-500 text-sm">Remove</button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload mobile image</p>
                        <p className="text-xs text-gray-400">Falls back to desktop if empty</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Video URL */}
            {formData.content_type === 'video' && (
              <div>
                <label className="block text-sm font-medium mb-2">Video URL</label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://youtube.com/embed/..."
                />
              </div>
            )}

            {/* HTML Content */}
            {formData.content_type === 'html' && (
              <div>
                <label className="block text-sm font-medium mb-2">HTML Content</label>
                <textarea
                  value={formData.html_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows={6}
                  placeholder="<div>Your custom HTML...</div>"
                />
              </div>
            )}

            {/* Link & CTA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Link Type</label>
                <select
                  value={formData.link_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="internal">Internal Page</option>
                  <option value="external">External URL</option>
                  <option value="category">Category Page</option>
                  <option value="product">Product Page</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Link URL</label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="/products or https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CTA Button Text</label>
                <input
                  type="text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Shop Now"
                />
              </div>
            </div>

            {/* Targeting */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Targeting Options
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Target Audience</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="all">All Users</option>
                    <option value="new_users">New Users Only</option>
                    <option value="returning_users">Returning Users Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Target Device</label>
                  <select
                    value={formData.target_device}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_device: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="all">All Devices</option>
                    <option value="desktop">Desktop Only</option>
                    <option value="mobile">Mobile Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="p-4 bg-amber-50 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule (Optional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Popup Settings */}
            {formData.placement === 'popup' && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium mb-3">Popup Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Delay (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.popup_delay}
                      onChange={(e) => setFormData(prev => ({ ...prev, popup_delay: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Frequency</label>
                    <select
                      value={formData.popup_frequency}
                      onChange={(e) => setFormData(prev => ({ ...prev, popup_frequency: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="once_per_session">Once per session</option>
                      <option value="once_per_day">Once per day</option>
                      <option value="always">Every visit</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Position */}
            <div className="w-32">
              <label className="block text-sm font-medium mb-2">Position/Order</label>
              <input
                type="number"
                min="1"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
                data-testid="save-banner-btn"
              >
                {editingBanner ? "Update Banner" : "Create Banner"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banners List by Placement */}
      {Object.entries(groupedBanners).map(([placement, placementBanners]) => (
        <div key={placement} className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{getPlacementInfo(placement)?.label || placement}</span>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{placementBanners.length}</span>
            </div>
            <span className="text-xs text-gray-500">{getPlacementInfo(placement)?.size}</span>
          </div>
          
          <div className="divide-y">
            {placementBanners.map((banner) => (
              <div key={banner.banner_id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {(banner.image_desktop || banner.image) ? (
                    <img 
                      src={(banner.image_desktop || banner.image).startsWith('/api') ? `${API.replace('/api', '')}${banner.image_desktop || banner.image}` : (banner.image_desktop || banner.image)} 
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Image className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{banner.title}</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {/* Status Badge */}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      banner.status === 'active' ? 'bg-green-100 text-green-700' :
                      banner.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      banner.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                      banner.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {banner.status || 'active'}
                    </span>
                    {banner.category && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {banner.category}
                      </span>
                    )}
                    {banner.target_device && banner.target_device !== 'all' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                        {banner.target_device === 'desktop' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        {banner.target_device}
                      </span>
                    )}
                  </div>
                </div>

                {/* Analytics */}
                <div className="text-center px-4 hidden md:block">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Eye className="w-3 h-3" />
                    {(banner.impressions || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MousePointer className="w-3 h-3" />
                    {(banner.clicks || 0).toLocaleString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {banner.status === 'active' ? (
                    <button
                      onClick={() => handleStatusChange(banner.banner_id, 'paused')}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(banner.banner_id, 'active')}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Activate"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner.banner_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filteredBanners.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Image className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No banners found</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-4 text-primary hover:underline"
          >
            Create your first banner
          </button>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
