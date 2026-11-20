// Hidden Background Music Player - Plays divine music across all pages
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '@/App';

const STORAGE_KEY = 'paridhaan_music_enabled';
const VOLUME_KEY = 'paridhaan_music_volume';

export default function BackgroundMusicPlayer() {
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.3); // Low volume by default for ambient feel
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef(null);

  // Load user preference
  useEffect(() => {
    const savedEnabled = localStorage.getItem(STORAGE_KEY);
    const savedVolume = localStorage.getItem(VOLUME_KEY);
    
    if (savedEnabled !== null) {
      setIsEnabled(savedEnabled === 'true');
    }
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Fetch tracks from backend
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const response = await axios.get(`${API}/background-music`);
        if (response.data && response.data.length > 0) {
          setTracks(response.data);
          // Shuffle tracks for variety
          const shuffled = [...response.data].sort(() => Math.random() - 0.5);
          setTracks(shuffled);
        }
      } catch (error) {
        console.log('No background music available');
      }
    };
    fetchTracks();
  }, []);

  // Listen for user interaction to enable autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        // Try to play after user interaction
        if (isEnabled && tracks.length > 0 && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }
    };

    // Listen for any user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('scroll', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [hasUserInteracted, isEnabled, tracks]);

  // Handle track end - play next
  const handleTrackEnd = () => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);
  };

  // Update audio when track changes
  useEffect(() => {
    if (audioRef.current && tracks.length > 0 && hasUserInteracted && isEnabled) {
      audioRef.current.src = tracks[currentTrackIndex].audio_url;
      audioRef.current.volume = volume;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        // Track play count
        axios.post(`${API}/background-music/${tracks[currentTrackIndex].music_id}/play`).catch(() => {});
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex, tracks, hasUserInteracted, isEnabled]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Toggle music function - exposed globally
  useEffect(() => {
    window.toggleBackgroundMusic = (enabled) => {
      setIsEnabled(enabled);
      localStorage.setItem(STORAGE_KEY, enabled.toString());
      
      if (enabled && audioRef.current && tracks.length > 0) {
        audioRef.current.play().catch(() => {});
      } else if (!enabled && audioRef.current) {
        audioRef.current.pause();
      }
    };

    window.setBackgroundMusicVolume = (vol) => {
      setVolume(vol);
      localStorage.setItem(VOLUME_KEY, vol.toString());
    };

    window.getBackgroundMusicState = () => ({
      isEnabled,
      isPlaying,
      volume,
      currentTrack: tracks[currentTrackIndex] || null
    });

    return () => {
      delete window.toggleBackgroundMusic;
      delete window.setBackgroundMusicVolume;
      delete window.getBackgroundMusicState;
    };
  }, [isEnabled, isPlaying, volume, tracks, currentTrackIndex]);

  // Handle enable/disable
  useEffect(() => {
    if (!isEnabled && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isEnabled]);

  // Don't render anything visible - completely hidden
  if (tracks.length === 0) return null;

  return (
    <audio
      ref={audioRef}
      onEnded={handleTrackEnd}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      loop={tracks.length === 1} // Loop if only one track
      preload="auto"
      style={{ display: 'none' }}
    />
  );
}

// Export helper functions for other components
export const toggleMusic = (enabled) => {
  if (window.toggleBackgroundMusic) {
    window.toggleBackgroundMusic(enabled);
  }
};

export const setMusicVolume = (volume) => {
  if (window.setBackgroundMusicVolume) {
    window.setBackgroundMusicVolume(volume);
  }
};

export const getMusicState = () => {
  if (window.getBackgroundMusicState) {
    return window.getBackgroundMusicState();
  }
  return { isEnabled: true, isPlaying: false, volume: 0.3, currentTrack: null };
};
