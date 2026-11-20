// Modern Banner Management v2 - Admin Component
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { 
  Plus, Upload, Trash2, Edit2, Eye, EyeOff, GripVertical,
  Image as ImageIcon, Video, X, ChevronDown, ExternalLink
} from 'lucide-react';

const BANNER_TYPES = [
  { value: 'hero', label: 'Hero Banner', desc: 'Main carousel on homepage' },
  { value: 'promotional', label: 'Promotional', desc: 'Featured promotions grid' },
  { value: 'category', label: 'Category', desc: 'Category showcase cards' },
  { value: 'offer', label: 'Offer Strip', desc: 'Top announcement bar' },
  { value: 'announcement', label: 'Announcement', desc: 'Special announcements' }
];

const ANIMATIONS = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide-left', label: 'Slide from Left' },
  { value: 'slide-right', label: 'Slide from Right' },
  { value: 'slide-up', label: 'Slide from Bottom' },
  { value: 'zoom', label: 'Zoom In' },
  { value: 'bounce', label: 'Bounce' }
];

const TEXT_POSITIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' }
];

const LINK_TYPES = [
  { value: 'none', label: 'No Link' },
  { value: 'url', label: 'Custom URL' },
  { value: 'category', label: 'Category Page' },
  { value: 'product', label: 'Product Page' },
  { value: 'collection', label: 'Collection Page' }
];

export default function BannerManagementV2() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const fileInputRef = useRef(null);
  const mobileFileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    mobile_image_url: '',
    banner_type: 'hero',
    animation: 'fade',
    link_url: '',
    link_type: 'none',
    link_target: '',
    button_text: '',
    position: 0,
    is_active: true,
    start_date: '',
    end_date: '',
    overlay_color: '',
    text_color: '#ffffff',
    text_position: 'center',
    show_on_mobile: true,
    show_on_desktop: true
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/banners/all`, { withCredentials: true });
      setBanners(response.data.banners || []);
    } catch (error) {
      console.error('Failed to fetch banners:', error);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleImageUpload = async (file, isMobile = false) => {
    if (!file) return;

    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('banner_type', formData.banner_type);

    try {
      const response = await axios.post(`${API}/banners/upload`, uploadFormData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        if (isMobile) {
          setFormData(prev => ({ ...prev, mobile_image_url: response.data.url }));
        } else {
          setFormData(prev => ({ ...prev, image_url: response.data.url }));
        }
        toast.success('Image uploaded to Cloudinary!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.image_url) {
      toast.error('Please upload or enter an image URL');
      return;
    }

    try {
      if (editingBanner) {
        await axios.put(`${API}/banners/${editingBanner.banner_id}`, formData, { withCredentials: true });
        toast.success('Banner updated!');
      } else {
        await axios.post(`${API}/banners`, formData, { withCredentials: true });
        toast.success('Banner created!');
      }
      
      setShowForm(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save banner');
    }
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm('Delete this banner?')) return;
    
    try {
      await axios.delete(`${API}/banners/${bannerId}`, { withCredentials: true });
      toast.success('Banner deleted');
      fetchBanners();
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await axios.patch(`${API}/banners/${banner.banner_id}/toggle`, {}, { withCredentials: true });
      fetchBanners();
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      mobile_image_url: '',
      banner_type: activeTab,
      animation: 'fade',
      link_url: '',
      link_type: 'none',
      link_target: '',
      button_text: '',
      position: banners.filter(b => b.banner_type === activeTab).length,
      is_active: true,
      start_date: '',
      end_date: '',
      overlay_color: '',
      text_color: '#ffffff',
      text_position: 'center',
      show_on_mobile: true,
      show_on_desktop: true
    });
    setEditingBanner(null);
  };

  const openEditForm = (banner) => {
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      mobile_image_url: banner.mobile_image_url || '',
      banner_type: banner.banner_type || 'hero',
      animation: banner.animation || 'fade',
      link_url: banner.link_url || '',
      link_type: banner.link_type || 'none',
      link_target: banner.link_target || '',
      button_text: banner.button_text || '',
      position: banner.position || 0,
      is_active: banner.is_active !== false,
      start_date: banner.start_date ? banner.start_date.split('T')[0] : '',
      end_date: banner.end_date ? banner.end_date.split('T')[0] : '',
      overlay_color: banner.overlay_color || '',
      text_color: banner.text_color || '#ffffff',
      text_position: banner.text_position || 'center',
      show_on_mobile: banner.show_on_mobile !== false,
      show_on_desktop: banner.show_on_desktop !== false
    });
    setEditingBanner(banner);
    setShowForm(true);
  };

  const filteredBanners = banners.filter(b => b.banner_type === activeTab);

  return (
    <div className="p-4 md:p-6 bg-white rounded-xl shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Banner Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage hero carousels, promotions & announcements</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Banner
        </button>
      </div>

      {/* Banner Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {BANNER_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setActiveTab(type.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === type.value
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type.label}
            <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
              {banners.filter(b => b.banner_type === type.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Banner List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading banners...</div>
      ) : filteredBanners.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No {BANNER_TYPES.find(t => t.value === activeTab)?.label} banners yet</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-3 text-primary hover:underline text-sm"
          >
            Create your first banner
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBanners.map((banner, index) => (
            <div
              key={banner.banner_id}
              className={`flex items-center gap-4 p-4 bg-gray-50 rounded-xl border-2 transition-all ${
                banner.is_active ? 'border-transparent' : 'border-red-200 bg-red-50/50'
              }`}
            >
              <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
              
              {/* Thumbnail */}
              <div className="w-24 h-16 md:w-32 md:h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Banner'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {banner.title || 'Untitled Banner'}
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    {banner.animation || 'fade'}
                  </span>
                  {banner.link_type !== 'none' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {banner.link_type}
                    </span>
                  )}
                  {!banner.is_active && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(banner)}
                  className={`p-2 rounded-lg transition-colors ${
                    banner.is_active 
                      ? 'text-green-600 hover:bg-green-100' 
                      : 'text-red-500 hover:bg-red-100'
                  }`}
                  title={banner.is_active ? 'Deactivate' : 'Activate'}
                >
                  {banner.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => openEditForm(banner)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(banner.banner_id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Banner Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-xl font-bold">
                {editingBanner ? 'Edit Banner' : 'Create New Banner'}
              </h3>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Banner Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Type *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BANNER_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, banner_type: type.value }))}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.banner_type === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-gray-500">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desktop Image *
                  </label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {formData.image_url ? (
                      <div className="relative">
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, image_url: '' })); }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-6">
                        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, MP4 up to 10MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], false)}
                  />
                  <input
                    type="text"
                    placeholder="Or paste image URL"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="w-full mt-2 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Image (Optional)
                  </label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => mobileFileInputRef.current?.click()}
                  >
                    {formData.mobile_image_url ? (
                      <div className="relative">
                        <img 
                          src={formData.mobile_image_url} 
                          alt="Mobile Preview" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, mobile_image_url: '' })); }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-6">
                        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Mobile version</p>
                        <p className="text-xs text-gray-400 mt-1">Uses desktop if not set</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={mobileFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], true)}
                  />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Banner headline"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Secondary text"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Animation & Text Position */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Animation</label>
                  <select
                    value={formData.animation}
                    onChange={(e) => setFormData(prev => ({ ...prev, animation: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {ANIMATIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Position</label>
                  <select
                    value={formData.text_position}
                    onChange={(e) => setFormData(prev => ({ ...prev, text_position: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {TEXT_POSITIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.text_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Link Options */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Type</label>
                  <select
                    value={formData.link_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_type: e.target.value, link_url: '', link_target: '' }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {LINK_TYPES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
                {formData.link_type === 'url' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="url"
                      value={formData.link_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                )}
                {['category', 'product', 'collection'].includes(formData.link_type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.link_type === 'category' ? 'Category Slug' : 
                       formData.link_type === 'product' ? 'Product ID' : 'Collection ID'}
                    </label>
                    <input
                      type="text"
                      value={formData.link_target}
                      onChange={(e) => setFormData(prev => ({ ...prev, link_target: e.target.value }))}
                      placeholder={formData.link_type === 'category' ? 'pooja' : 'prod_xxxxx'}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Button Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                <input
                  type="text"
                  value={formData.button_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                  placeholder="Shop Now, Explore, etc."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Scheduling */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Visibility */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_on_desktop}
                    onChange={(e) => setFormData(prev => ({ ...prev, show_on_desktop: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Show on Desktop</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_on_mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, show_on_mobile: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Show on Mobile</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : editingBanner ? 'Update Banner' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
