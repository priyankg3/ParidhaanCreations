import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Package, Users, ShoppingCart, DollarSign, Plus, Edit, Trash2, Upload, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [banners, setBanners] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    images: [""],
    stock: "",
    featured: false
  });

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
    active: true
  });

  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_percentage: "",
    discount_amount: "",
    valid_from: "",
    valid_to: "",
    active: true
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
        const response = await axios.get(`${API}/banners`);
        setBanners(response.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/products`, {
        ...productForm,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock)
      }, { withCredentials: true });
      toast.success("Product created successfully");
      setShowProductForm(false);
      resetProductForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to create product");
    }
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

  const handleCreateBanner = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/banners`, bannerForm, { withCredentials: true });
      toast.success("Banner created successfully");
      setShowBannerForm(false);
      resetBannerForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to create banner");
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
      
      await axios.post(`${API}/coupons`, couponData, { withCredentials: true });
      toast.success("Coupon created successfully");
      setShowCouponForm(false);
      resetCouponForm();
    } catch (error) {
      toast.error("Failed to create coupon");
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

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      category: "",
      images: [""],
      stock: "",
      featured: false
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

  const resetBannerForm = () => {
    setBannerForm({
      title: "",
      image: "",
      link: "",
      position: 1,
      active: true
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
  };

  return (
    <div className="min-h-screen py-12 bg-background-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-heading font-bold mb-12" data-testid="admin-title">Admin Dashboard</h1>

        <div className="flex space-x-4 mb-8 overflow-x-auto">
          {["analytics", "products", "categories", "orders", "banners", "coupons"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium tracking-wide transition-all ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-foreground hover:bg-primary/10"
              }`}
              data-testid={`tab-${tab}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "analytics" && analytics && (
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
        )}

        {activeTab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold">Products Management</h2>
              <button
                onClick={() => setShowProductForm(!showProductForm)}
                className="bg-primary text-primary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-primary/90 transition-all"
                data-testid="add-product-button"
              >
                <Plus className="w-5 h-5" />
                <span>Add Product</span>
              </button>
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
                        <option value="perfumes">Perfumes</option>
                        <option value="jewellery">Jewellery</option>
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

                  <div>
                    <label className="block text-sm font-medium mb-2">Image URL *</label>
                    <input
                      type="url"
                      required
                      value={productForm.images[0]}
                      onChange={(e) => setProductForm({...productForm, images: [e.target.value]})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
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
                        <button
                          onClick={() => handleDeleteProduct(product.product_id)}
                          className="text-accent hover:text-accent/80 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <h2 className="text-2xl font-heading font-bold mb-6">Orders Management</h2>
            
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

        {activeTab === "banners" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold">Banners Management</h2>
              <button
                onClick={() => setShowBannerForm(!showBannerForm)}
                className="bg-primary text-primary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-primary/90 transition-all"
                data-testid="add-banner-button"
              >
                <Plus className="w-5 h-5" />
                <span>Add Banner</span>
              </button>
            </div>

            {showBannerForm && (
              <div className="bg-white border border-border/40 p-6 mb-6">
                <form onSubmit={handleCreateBanner} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Banner Title *</label>
                    <input
                      type="text"
                      required
                      value={bannerForm.title}
                      onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Image URL *</label>
                    <input
                      type="url"
                      required
                      value={bannerForm.image}
                      onChange={(e) => setBannerForm({...bannerForm, image: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Link (Optional)</label>
                    <input
                      type="url"
                      value={bannerForm.link}
                      onChange={(e) => setBannerForm({...bannerForm, link: e.target.value})}
                      className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90 transition-all"
                    >
                      Create Banner
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBannerForm(false);
                        resetBannerForm();
                      }}
                      className="bg-muted text-muted-foreground px-6 py-2 hover:bg-muted/80 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map((banner) => (
                <div key={banner.banner_id} className="bg-white border border-border/40 overflow-hidden">
                  <img src={banner.image} alt={banner.title} className="w-full h-64 object-cover" />
                  <div className="p-4">
                    <h3 className="text-xl font-heading font-semibold mb-2">{banner.title}</h3>
                    {banner.link && <p className="text-sm text-muted-foreground">{banner.link}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "coupons" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold">Coupons Management</h2>
              <button
                onClick={() => setShowCouponForm(!showCouponForm)}
                className="bg-primary text-primary-foreground px-6 py-3 flex items-center space-x-2 hover:bg-primary/90 transition-all"
                data-testid="add-coupon-button"
              >
                <Plus className="w-5 h-5" />
                <span>Add Coupon</span>
              </button>
            </div>

            {showCouponForm && (
              <div className="bg-white border border-border/40 p-6 mb-6">
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
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Discount Percentage</label>
                      <input
                        type="number"
                        step="0.01"
                        value={couponForm.discount_percentage}
                        onChange={(e) => setCouponForm({...couponForm, discount_percentage: e.target.value, discount_amount: ""})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">OR Discount Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={couponForm.discount_amount}
                        onChange={(e) => setCouponForm({...couponForm, discount_amount: e.target.value, discount_percentage: ""})}
                        className="w-full px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary"
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
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground px-6 py-2 hover:bg-primary/90 transition-all"
                    >
                      Create Coupon
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
          </div>
        )}
      </div>
    </div>
  );
}
