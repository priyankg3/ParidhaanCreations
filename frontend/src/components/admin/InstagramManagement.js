import React, { useState, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { Plus, Trash2, Upload, Play, Video, GripVertical } from "lucide-react";
import { toast } from "sonner";

export default function ShowcaseVideosManagement({ instagramVideos, fetchData }) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const videoFileRef = useRef(null);

  const handleVideoUpload = async () => {
    const file = videoFileRef.current?.files[0];
    
    if (!file) {
      toast.error("Please select a video file");
      return;
    }
    
    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 100MB");
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);
      
      await axios.post(`${API}/admin/showcase-videos/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });
      
      toast.success("Video uploaded successfully!");
      setShowUploadForm(false);
      setCaption("");
      if (videoFileRef.current) videoFileRef.current.value = '';
      fetchData();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to upload video");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const toggleVideoStatus = async (video) => {
    try {
      await axios.put(`${API}/admin/showcase-videos/${video.video_id}?is_active=${!video.is_active}`, {}, { withCredentials: true });
      toast.success(video.is_active ? "Video disabled" : "Video enabled");
      fetchData();
    } catch (error) {
      toast.error("Failed to update video");
    }
  };

  const deleteVideo = async (video) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await axios.delete(`${API}/instagram-videos/${video.video_id}`, { withCredentials: true });
      toast.success("Video deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete video");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold">🎬 Showcase Videos</h2>
          <p className="text-gray-500 mt-1">Upload videos to display in the "Follow Us" section on homepage</p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-all"
          data-testid="upload-video-btn"
        >
          <Plus className="w-5 h-5" />
          Upload Video
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-white border border-border/40 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-pink-600" />
            Upload New Video
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Video File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Video File *</label>
              <div className="border-2 border-dashed border-pink-200 rounded-lg p-6 bg-pink-50/50 hover:bg-pink-50 transition-colors">
                <input
                  type="file"
                  ref={videoFileRef}
                  accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/*"
                  className="hidden"
                  id="showcase-video"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      toast.success(`Selected: ${e.target.files[0].name}`);
                    }
                  }}
                />
                <label htmlFor="showcase-video" className="cursor-pointer flex flex-col items-center">
                  {uploading ? (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div 
                          className="bg-pink-600 h-3 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-sm text-pink-600">Uploading... {uploadProgress}%</span>
                    </>
                  ) : videoFileRef.current?.files?.[0] ? (
                    <>
                      <Play className="w-10 h-10 text-green-500 mb-2" />
                      <span className="text-sm text-green-600 font-medium">{videoFileRef.current.files[0].name}</span>
                      <span className="text-xs text-green-400 mt-1">Click to change</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-pink-400 mb-2" />
                      <span className="text-sm text-pink-600 font-medium">Click to upload video</span>
                      <span className="text-xs text-pink-400 mt-1">MP4, MOV, WebM (Max 100MB)</span>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Best format: Vertical video (9:16 ratio) for mobile-first display
              </p>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium mb-2">Caption (Optional)</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption for this video..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none h-32"
              />
              
              <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                <h4 className="font-medium text-pink-800 text-sm mb-2">Tips:</h4>
                <ul className="text-xs text-pink-700 space-y-1">
                  <li>• Upload product showcases, behind-the-scenes, or festival content</li>
                  <li>• Vertical videos work best (like Instagram Reels)</li>
                  <li>• Keep videos under 60 seconds for best engagement</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setShowUploadForm(false);
                setCaption("");
                if (videoFileRef.current) videoFileRef.current.value = '';
              }}
              className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVideoUpload}
              disabled={uploading}
              className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {uploading ? "Uploading..." : "Upload Video"}
            </button>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {instagramVideos.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-gray-50 rounded-xl">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2 font-medium">No videos uploaded yet</p>
            <p className="text-sm text-gray-400">Upload videos to showcase your products and brand</p>
          </div>
        ) : (
          instagramVideos.map((video, index) => (
            <div 
              key={video.video_id || index} 
              className="relative group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              {/* Video/Thumbnail */}
              <div className="aspect-[9/16] bg-gray-100 relative">
                {video.video_url ? (
                  <video
                    src={video.video_url}
                    poster={video.thumbnail_url}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    onMouseEnter={(e) => e.target.play()}
                    onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                  />
                ) : video.thumbnail_url ? (
                  <img 
                    src={video.thumbnail_url} 
                    alt={video.caption || "Video"} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
                    <Video className="w-12 h-12 text-pink-300" />
                  </div>
                )}
                
                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center opacity-70 group-hover:opacity-0 transition-opacity">
                    <Play className="w-6 h-6 text-white ml-1" fill="white" />
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  video.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {video.is_active ? 'Active' : 'Hidden'}
                </div>
              </div>
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <button
                  onClick={() => toggleVideoStatus(video)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    video.is_active 
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {video.is_active ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => deleteVideo(video)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
              
              {/* Caption */}
              {video.caption && (
                <div className="p-2 text-xs text-gray-600 truncate border-t border-gray-100">
                  {video.caption}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 border border-pink-100">
        <h4 className="font-semibold text-pink-800 mb-3">🎬 Showcase Videos Tips</h4>
        <ul className="text-sm text-pink-700 space-y-2">
          <li>• Videos will auto-play on hover (desktop) and show as thumbnails on mobile</li>
          <li>• Upload vertical videos (9:16 ratio) for the best mobile experience</li>
          <li>• Videos appear in the "Follow Us" section on your homepage</li>
          <li>• Drag videos to reorder them (coming soon)</li>
          <li>• Keep videos short (under 60 seconds) for better engagement</li>
        </ul>
      </div>
    </div>
  );
}
