import React, { useState, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function MusicManagement({ musicTracks, fetchData }) {
  const [showMusicForm, setShowMusicForm] = useState(false);
  const [musicUploading, setMusicUploading] = useState(false);
  const [musicForm, setMusicForm] = useState({ title: "", artist: "" });
  const musicFileRef = useRef(null);

  const handleUpload = async () => {
    const file = musicFileRef.current?.files[0];
    
    if (!file) {
      toast.error("Please select an audio file first");
      return;
    }
    if (!musicForm.title) {
      toast.error("Please enter a track title");
      return;
    }
    
    setMusicUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', musicForm.title);
      formData.append('artist', musicForm.artist || '');
      formData.append('display_order', String(musicTracks.length));
      
      await axios.post(`${API}/admin/background-music`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success("Music track uploaded successfully!");
      setShowMusicForm(false);
      setMusicForm({ title: "", artist: "" });
      if (musicFileRef.current) musicFileRef.current.value = '';
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload music");
    } finally {
      setMusicUploading(false);
    }
  };

  const toggleTrackStatus = async (track) => {
    try {
      await axios.put(`${API}/admin/background-music/${track.music_id}?is_active=${!track.is_active}`, {}, { withCredentials: true });
      toast.success(track.is_active ? "Track disabled" : "Track enabled");
      fetchData();
    } catch (error) {
      toast.error("Failed to update track");
    }
  };

  const deleteTrack = async (track) => {
    if (!window.confirm("Delete this music track?")) return;
    try {
      await axios.delete(`${API}/admin/background-music/${track.music_id}`, { withCredentials: true });
      toast.success("Track deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete track");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold">🎵 Background Music Management</h2>
          <p className="text-gray-500 mt-1">Upload divine music that plays across your website</p>
        </div>
        <button
          onClick={() => setShowMusicForm(!showMusicForm)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-all"
          data-testid="add-music-btn"
        >
          <Plus className="w-5 h-5" />
          Add Music
        </button>
      </div>

      {/* Add Music Form */}
      {showMusicForm && (
        <div className="bg-white border border-border/40 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">🎶 Upload New Music Track</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Audio File *</label>
              <div className="border-2 border-dashed border-purple-200 rounded-lg p-4 bg-purple-50/50">
                <input
                  type="file"
                  ref={musicFileRef}
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/*"
                  className="hidden"
                  id="music-file"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      toast.success(`File selected: ${e.target.files[0].name}`);
                    }
                  }}
                />
                <label htmlFor="music-file" className="cursor-pointer flex flex-col items-center">
                  {musicUploading ? (
                    <>
                      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-purple-600 mt-2">Uploading...</span>
                    </>
                  ) : musicFileRef.current?.files?.[0] ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <span className="text-sm text-green-600 mt-2">{musicFileRef.current.files[0].name}</span>
                      <span className="text-xs text-green-400">Click to change file</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="text-sm text-purple-600 mt-2">Click to upload audio</span>
                      <span className="text-xs text-purple-400">MP3, WAV, OGG, M4A (Max 50MB)</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Track Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Radhe Krishna Dhun"
                  value={musicForm.title}
                  onChange={(e) => setMusicForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Artist (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Traditional Bhajan"
                  value={musicForm.artist}
                  onChange={(e) => setMusicForm(prev => ({ ...prev, artist: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setShowMusicForm(false);
                setMusicForm({ title: "", artist: "" });
                if (musicFileRef.current) musicFileRef.current.value = '';
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={musicUploading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {musicUploading ? "Uploading..." : "Upload Track"}
            </button>
          </div>
        </div>
      )}

      {/* Music Tracks List */}
      <div className="bg-white border border-border/40 rounded-xl overflow-hidden">
        {musicTracks.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-gray-500 mb-2">No music tracks added yet</p>
            <p className="text-sm text-gray-400">Upload divine music to create a spiritual atmosphere</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {musicTracks.map((track) => (
              <div key={track.music_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium">{track.title}</h4>
                    <p className="text-sm text-gray-500">{track.artist || "Unknown Artist"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <audio src={track.audio_url} controls className="h-8 w-48" />
                  
                  <button
                    onClick={() => toggleTrackStatus(track)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      track.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {track.is_active ? "Active" : "Disabled"}
                  </button>
                  
                  <button
                    onClick={() => deleteTrack(track)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <h4 className="font-semibold text-purple-800 mb-3">🎵 Background Music Tips</h4>
        <ul className="text-sm text-purple-700 space-y-2">
          <li>• Upload peaceful bhajans, mantras, or instrumental music</li>
          <li>• Music plays automatically when users visit your site</li>
          <li>• Users can mute from their profile dropdown menu</li>
          <li>• Volume is set low by default for ambient feel</li>
          <li>• Multiple tracks will shuffle automatically</li>
        </ul>
      </div>
    </div>
  );
}
