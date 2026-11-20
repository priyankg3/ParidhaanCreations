import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { MessageSquare, Clock, CheckCircle, AlertCircle, Send, ChevronRight, Headphones, Package, CreditCard, Truck, HelpCircle, Upload, Image, X, RefreshCw, Camera, Video, Play } from "lucide-react";
import SEO from "@/components/SEO";
import { getSupportWhatsAppLink } from "@/components/WhatsAppButton";

const TICKET_CATEGORIES = [
  { value: "order", label: "Order Issue", icon: Package, description: "Problems with your order" },
  { value: "product", label: "Product Query", icon: HelpCircle, description: "Questions about products" },
  { value: "payment", label: "Payment Issue", icon: CreditCard, description: "Payment related queries" },
  { value: "shipping", label: "Shipping & Delivery", icon: Truck, description: "Delivery concerns" },
  { value: "return", label: "Return/Refund", icon: RefreshCw, description: "Return or refund requests" },
  { value: "other", label: "Other", icon: Headphones, description: "Any other queries" }
];

const STATUS_CONFIG = {
  open: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Open" },
  in_progress: { color: "bg-blue-100 text-blue-700", icon: AlertCircle, label: "In Progress" },
  resolved: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Resolved" },
  closed: { color: "bg-gray-100 text-gray-700", icon: CheckCircle, label: "Closed" }
};

export default function SupportPage() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [formData, setFormData] = useState({
    subject: "",
    category: "order",
    message: "",
    order_id: "",
    guest_name: "",
    guest_email: "",
    is_return_request: false,
    return_reason: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await axios.get(`${API}/auth/me`, { withCredentials: true }).catch(() => null);
      setUser(userRes?.data);

      // Fetch site settings for video requirement
      const settingsRes = await axios.get(`${API}/settings`).catch(() => null);
      setSiteSettings(settingsRes?.data);

      if (userRes?.data) {
        const ticketsRes = await axios.get(`${API}/support/tickets`, { withCredentials: true });
        setTickets(ticketsRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video too large! Maximum size is 50MB");
      return;
    }

    setVideoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/support/upload-video`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (percent < 100) {
            toast.loading(`Uploading video... ${percent}%`, { id: 'video-upload' });
          }
        }
      });
      
      toast.dismiss('video-upload');
      if (response.data.video_url) {
        setUploadedVideos(prev => [...prev, response.data.video_url]);
        toast.success("Video uploaded successfully!");
      }
    } catch (error) {
      toast.dismiss('video-upload');
      toast.error(error.response?.data?.detail || "Failed to upload video");
    } finally {
      setVideoUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const removeVideo = (index) => {
    setUploadedVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        
        const response = await axios.post(`${API}/support/upload-image`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (response.data.image_url) {
          setUploadedImages(prev => [...prev, response.data.image_url]);
        }
      }
      toast.success("Image(s) uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user && (!formData.guest_name || !formData.guest_email)) {
      toast.error("Please provide your name and email");
      return;
    }

    // For return requests, images are required
    if (formData.category === "return" && uploadedImages.length === 0) {
      toast.error("Please upload at least one image of the product for return requests");
      return;
    }

    // Check if video is required for returns
    const videoRequired = siteSettings?.video_required_for_returns !== false;
    if (formData.category === "return" && videoRequired && uploadedVideos.length === 0) {
      toast.error("Video proof is required for return requests. Please upload a video showing the product issue.");
      return;
    }

    try {
      const ticketData = {
        ...formData,
        images: uploadedImages,
        videos: uploadedVideos,
        is_return_request: formData.category === "return",
        return_reason: formData.return_reason || null
      };
      
      await axios.post(`${API}/support/tickets`, ticketData, { withCredentials: true });
      toast.success("Support ticket created successfully!");
      setShowForm(false);
      setFormData({ subject: "", category: "order", message: "", order_id: "", guest_name: "", guest_email: "", is_return_request: false, return_reason: "" });
      setUploadedImages([]);
      setUploadedVideos([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create ticket");
    }
  };

  const handleReply = async (ticketId) => {
    if (!replyMessage.trim()) return;

    try {
      await axios.post(`${API}/support/tickets/${ticketId}/reply`, { message: replyMessage }, { withCredentials: true });
      toast.success("Reply sent!");
      setReplyMessage("");
      
      // Refresh ticket
      const ticketRes = await axios.get(`${API}/support/tickets/${ticketId}`, { withCredentials: true });
      setSelectedTicket(ticketRes.data);
      fetchData();
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  return (
    <div className="min-h-screen py-12 bg-background-paper">
      <SEO 
        title="Customer Support - Paridhaan Creations"
        description="Get help with your orders, products, payments, and more. Our support team is here to assist you."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-heading font-bold mb-4">Customer Support</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We&apos;re here to help! Create a support ticket or chat with us on WhatsApp for quick assistance.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => setShowForm(true)}
            className="bg-white border-2 border-primary p-6 hover:bg-primary/5 transition-all group"
            data-testid="create-ticket-btn"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary/20 transition-all">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold">Create Support Ticket</h3>
                <p className="text-muted-foreground">Get help from our team</p>
              </div>
              <ChevronRight className="w-6 h-6 text-primary ml-auto" />
            </div>
          </button>

          <a
            href={getSupportWhatsAppLink("General inquiry")}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-50 border-2 border-green-500 p-6 hover:bg-green-100 transition-all group"
            data-testid="whatsapp-support-btn"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-4 rounded-full">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-green-800">Chat on WhatsApp</h3>
                <p className="text-green-600">Quick response, instant support</p>
              </div>
              <ChevronRight className="w-6 h-6 text-green-500 ml-auto" />
            </div>
          </a>
        </div>

        {/* Category Selection */}
        {showForm && (
          <div className="bg-white border border-border p-8 mb-8" data-testid="ticket-form">
            <h2 className="text-2xl font-bold mb-6">Create Support Ticket</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-3">What do you need help with?</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {TICKET_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={`p-4 border-2 text-center transition-all ${
                          formData.category === cat.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${formData.category === cat.value ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guest Info (if not logged in) */}
              {!user && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.guest_name}
                      onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                      className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid="guest-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.guest_email}
                      onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                      className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid="guest-email-input"
                    />
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-2">Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="subject-input"
                />
              </div>

              {/* Order ID (optional) */}
              {(formData.category === "order" || formData.category === "return") && (
                <div>
                  <label className="block text-sm font-medium mb-2">Order ID {formData.category === "return" ? "*" : "(if applicable)"}</label>
                  <input
                    type="text"
                    required={formData.category === "return"}
                    value={formData.order_id}
                    onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                    placeholder="e.g., order_abc123"
                    className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="order-id-input"
                  />
                </div>
              )}

              {/* Return Reason (for return requests) */}
              {formData.category === "return" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Reason for Return *</label>
                  <select
                    required
                    value={formData.return_reason}
                    onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
                    className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="return-reason-select"
                  >
                    <option value="">Select a reason</option>
                    <option value="damaged">Product is damaged</option>
                    <option value="wrong_item">Wrong item received</option>
                    <option value="quality_issue">Quality not as expected</option>
                    <option value="size_issue">Size doesn't fit (Laddu Gopal dress)</option>
                    <option value="not_as_described">Product not as described</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-2">Message *</label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={formData.category === "return" 
                    ? "Please describe the issue with the product in detail. Include any visible defects, wrong size, etc."
                    : "Please describe your issue in detail..."}
                  className="w-full px-4 py-3 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  data-testid="message-input"
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {formData.category === "return" ? "Product Photos * (Required for returns)" : "Attach Images (optional)"}
                </label>
                <div className={`border-2 border-dashed rounded-lg p-4 ${formData.category === "return" ? "border-orange-300 bg-orange-50" : "border-gray-200"}`}>
                  <input
                    type="file"
                    ref={imageInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="support-images"
                  />
                  <label htmlFor="support-images" className="cursor-pointer flex flex-col items-center">
                    {imageUploading ? (
                      <>
                        <Upload className="w-8 h-8 text-primary animate-pulse" />
                        <span className="text-sm text-primary mt-2">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600 mt-2">Click to upload images</span>
                        {formData.category === "return" && (
                          <span className="text-xs text-orange-600 mt-1">📸 Clear photos help us process your return faster</span>
                        )}
                      </>
                    )}
                  </label>
                </div>

                {/* Uploaded Images Preview */}
                {uploadedImages.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {uploadedImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img src={url} alt={`Upload ${index + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.category === "return" && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">📷 Photo Guidelines for Returns:</p>
                    <ul className="text-xs text-amber-700 mt-1 list-disc list-inside space-y-1">
                      <li>Clear photos of the product showing the issue</li>
                      <li>Include packaging if damaged during delivery</li>
                      <li>Show any defects or quality issues clearly</li>
                      <li>Upload at least 2-3 images from different angles</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Video Upload Section - Required for Returns */}
              {formData.category === "return" && (
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4 text-red-500" />
                    Video Proof * (Required for Returns)
                  </label>
                  <div className="border-2 border-dashed border-red-300 rounded-lg p-4 bg-red-50/50">
                    <input
                      type="file"
                      ref={videoInputRef}
                      accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                      onChange={handleVideoUpload}
                      className="hidden"
                      id="support-video"
                    />
                    <label htmlFor="support-video" className="cursor-pointer flex flex-col items-center">
                      {videoUploading ? (
                        <>
                          <Video className="w-8 h-8 text-red-500 animate-pulse" />
                          <span className="text-sm text-red-600 mt-2">Uploading video...</span>
                          <span className="text-xs text-red-500">Please wait, this may take a moment</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-8 h-8 text-red-400" />
                          <span className="text-sm text-red-600 mt-2">Click to upload video</span>
                          <span className="text-xs text-red-500 mt-1">MP4, MOV, WebM (Max 50MB)</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Uploaded Videos Preview */}
                  {uploadedVideos.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {uploadedVideos.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                            <video src={url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="w-8 h-8 text-white" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVideo(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">🎥 Video Guidelines for Returns:</p>
                    <ul className="text-xs text-red-700 mt-1 list-disc list-inside space-y-1">
                      <li><strong>Show the product clearly</strong> - unbox or display the item</li>
                      <li><strong>Demonstrate the issue</strong> - show damage, defects, or wrong item</li>
                      <li><strong>Show the invoice/packaging</strong> - if relevant to the issue</li>
                      <li><strong>Keep it under 60 seconds</strong> - concise videos process faster</li>
                      <li><strong>Good lighting</strong> - ensure the issue is visible</li>
                    </ul>
                    <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Video proof helps prevent fraud and speeds up genuine return processing</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-8 py-3 font-medium hover:bg-primary/90 transition-all"
                  data-testid="submit-ticket-btn"
                  disabled={videoUploading || imageUploading}
                >
                  {(videoUploading || imageUploading) ? "Uploading..." : "Submit Ticket"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-muted text-muted-foreground px-8 py-3 hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* My Tickets */}
        {user && tickets.length > 0 && (
          <div className="bg-white border border-border" data-testid="tickets-list">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold">My Support Tickets</h2>
            </div>
            <div className="divide-y divide-border">
              {tickets.map((ticket) => {
                const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={ticket.ticket_id}
                    className="p-6 hover:bg-background-paper/50 cursor-pointer transition-all"
                    onClick={() => setSelectedTicket(ticket)}
                    data-testid={`ticket-${ticket.ticket_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {statusConfig.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {ticket.messages[0]?.message}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTicket(null)}>
            <div className="bg-white max-w-2xl w-full max-h-[80vh] overflow-hidden rounded-lg" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl">{selectedTicket.subject}</h3>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[selectedTicket.status]?.color}`}>
                    {STATUS_CONFIG[selectedTicket.status]?.label}
                  </span>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto space-y-4">
                {selectedTicket.messages?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      msg.sender === "admin"
                        ? "bg-primary/10 ml-8"
                        : "bg-muted mr-8"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {msg.sender === "admin" ? "Support Team" : "You"}
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
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 px-4 py-2 border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      onKeyPress={(e) => e.key === "Enter" && handleReply(selectedTicket.ticket_id)}
                    />
                    <button
                      onClick={() => handleReply(selectedTicket.ticket_id)}
                      className="bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Not logged in message */}
        {!user && !showForm && (
          <div className="bg-white border border-border p-8 text-center">
            <p className="text-muted-foreground mb-4">
              <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link> to view your support tickets and get faster assistance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
