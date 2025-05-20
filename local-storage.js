/**
 * MindMuseAI Local Storage Manager
 * Handles storing and retrieving user data, progress tracking, and media locally
 */

// Main storage keys
const STORAGE_KEYS = {
  PROFILE: 'mindmuse_user_profile',
  PROGRESS: 'mindmuse_user_progress',
  MEDIA: 'mindmuse_user_media',
  SETTINGS: 'mindmuse_user_settings',
  CHATS: 'mindmuse_user_chats',
  MOOD_HISTORY: 'mindmuse_mood_history',
  SESSION_DATA: 'mindmuse_session_data',
  AUTH_STATE: 'mindmuse_auth_state',
  LAST_SYNC: 'mindmuse_last_sync'
};

/**
 * Profile Storage Manager
 * Handles user profile information
 */
export const ProfileStorage = {
  /**
   * Save user profile data to local storage
   * @param {Object} profileData - User profile information
   * @returns {Boolean} - Success indicator
   */
  saveProfile(profileData) {
    try {
      // Get existing profile or create new one
      const existingProfile = this.getProfile() || {};
      
      // Merge with new data
      const updatedProfile = { 
        ...existingProfile, 
        ...profileData,
        lastUpdated: new Date().toISOString() 
      };
      
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));
      console.log('Profile saved to local storage:', updatedProfile);
      return true;
    } catch (error) {
      console.error('Error saving profile to local storage:', error);
      return false;
    }
  },

  /**
   * Get user profile from local storage
   * @returns {Object|null} - User profile data or null if not found
   */
  getProfile() {
    try {
      const profileData = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return profileData ? JSON.parse(profileData) : null;
    } catch (error) {
      console.error('Error retrieving profile from local storage:', error);
      return null;
    }
  },

  /**
   * Update specific profile fields
   * @param {Object} fields - Fields to update
   * @returns {Boolean} - Success indicator
   */
  updateProfileFields(fields) {
    const profile = this.getProfile();
    if (!profile) return false;
    
    return this.saveProfile({
      ...profile,
      ...fields
    });
  },

  /**
   * Clear profile data from local storage
   * @returns {Boolean} - Success indicator
   */
  clearProfile() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      return true;
    } catch (error) {
      console.error('Error clearing profile from local storage:', error);
      return false;
    }
  }
};

/**
 * Progress Storage Manager
 * Handles tracking user progress, moods, and activities
 */
export const ProgressStorage = {
  /**
   * Save user progress data
   * @param {Object} progressData - Progress information
   * @returns {Boolean} - Success indicator
   */
  saveProgress(progressData) {
    try {
      // Get existing progress or create new one
      const existingProgress = this.getProgress() || {
        sessions: [],
        moodEntries: [],
        goals: [],
        achievements: []
      };
      
      // Merge with new data
      const updatedProgress = { 
        ...existingProgress, 
        ...progressData,
        lastUpdated: new Date().toISOString() 
      };
      
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updatedProgress));
      return true;
    } catch (error) {
      console.error('Error saving progress to local storage:', error);
      return false;
    }
  },

  /**
   * Retrieve user progress data
   * @returns {Object|null} - Progress data or null if not found
   */
  getProgress() {
    try {
      const progressData = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return progressData ? JSON.parse(progressData) : null;
    } catch (error) {
      console.error('Error retrieving progress from local storage:', error);
      return null;
    }
  },

  /**
   * Add a new mood entry to progress history
   * @param {String} mood - Mood value (happy, sad, anxious, etc.)
   * @param {Object} details - Additional details (optional)
   * @returns {Boolean} - Success indicator
   */
  addMoodEntry(mood, details = {}) {
    try {
      const progress = this.getProgress() || { moodEntries: [] };
      
      const newEntry = {
        mood,
        timestamp: new Date().toISOString(),
        ...details
      };
      
      progress.moodEntries = progress.moodEntries || [];
      progress.moodEntries.push(newEntry);
      
      // Limit to last 100 entries to prevent excessive storage use
      if (progress.moodEntries.length > 100) {
        progress.moodEntries = progress.moodEntries.slice(-100);
      }
      
      return this.saveProgress(progress);
    } catch (error) {
      console.error('Error adding mood entry:', error);
      return false;
    }
  },

  /**
   * Get mood entries for a specific date range
   * @param {Date} startDate - Start date for range
   * @param {Date} endDate - End date for range (defaults to now)
   * @returns {Array} - Filtered mood entries
   */
  getMoodEntriesInRange(startDate, endDate = new Date()) {
    try {
      const progress = this.getProgress();
      if (!progress || !progress.moodEntries) return [];
      
      return progress.moodEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      });
    } catch (error) {
      console.error('Error retrieving mood entries in range:', error);
      return [];
    }
  },

  /**
   * Add a completed session to the user's history
   * @param {Object} sessionData - Data about the completed session
   * @returns {Boolean} - Success indicator
   */
  addCompletedSession(sessionData) {
    try {
      const progress = this.getProgress() || { sessions: [] };
      
      const newSession = {
        id: `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...sessionData
      };
      
      progress.sessions = progress.sessions || [];
      progress.sessions.push(newSession);
      
      return this.saveProgress(progress);
    } catch (error) {
      console.error('Error adding completed session:', error);
      return false;
    }
  },

  /**
   * Clear all progress data
   * @returns {Boolean} - Success indicator
   */
  clearProgress() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROGRESS);
      return true;
    } catch (error) {
      console.error('Error clearing progress data:', error);
      return false;
    }
  }
};

/**
 * Media Storage Manager
 * Handles storing and retrieving user media (images, etc.) using Base64 encoding
 */
export const MediaStorage = {
  /**
   * Save a photo/image to local storage
   * @param {String} imageId - Unique identifier for the image
   * @param {String} imageData - Base64 encoded image data
   * @param {Object} metadata - Additional information about the image
   * @returns {Boolean} - Success indicator
   */
  savePhoto(imageId, imageData, metadata = {}) {
    try {
      const media = this.getAllMedia() || {};
      
      // Check if the image is already base64 encoded
      const base64Data = imageData.startsWith('data:') 
        ? imageData 
        : `data:image/jpeg;base64,${imageData}`;
      
      media[imageId] = {
        type: 'image',
        data: base64Data,
        timestamp: new Date().toISOString(),
        ...metadata
      };
      
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(media));
      return true;
    } catch (error) {
      console.error('Error saving photo to local storage:', error);
      return false;
    }
  },

  /**
   * Save profile photo to local storage
   * @param {String} imageData - Base64 encoded image data
   * @returns {Boolean} - Success indicator
   */
  saveProfilePhoto(imageData) {
    return this.savePhoto('profile_photo', imageData, { 
      usage: 'profile',
      isDefault: false
    });
  },

  /**
   * Get a specific photo by ID
   * @param {String} imageId - Identifier for the image
   * @returns {Object|null} - Image data and metadata or null if not found
   */
  getPhoto(imageId) {
    try {
      const media = this.getAllMedia();
      return media && media[imageId] ? media[imageId] : null;
    } catch (error) {
      console.error('Error retrieving photo from local storage:', error);
      return null;
    }
  },

  /**
   * Get profile photo
   * @returns {String|null} - Base64 encoded image data or null if not found
   */
  getProfilePhoto() {
    const profilePhoto = this.getPhoto('profile_photo');
    return profilePhoto ? profilePhoto.data : null;
  },

  /**
   * Get all media items
   * @returns {Object|null} - All stored media items or null if none found
   */
  getAllMedia() {
    try {
      const mediaData = localStorage.getItem(STORAGE_KEYS.MEDIA);
      return mediaData ? JSON.parse(mediaData) : {};
    } catch (error) {
      console.error('Error retrieving media from local storage:', error);
      return {};
    }
  },

  /**
   * Delete a specific photo
   * @param {String} imageId - Identifier for the image to delete
   * @returns {Boolean} - Success indicator
   */
  deletePhoto(imageId) {
    try {
      const media = this.getAllMedia();
      if (media && media[imageId]) {
        delete media[imageId];
        localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(media));
      }
      return true;
    } catch (error) {
      console.error('Error deleting photo from local storage:', error);
      return false;
    }
  },

  /**
   * Clear all media data
   * @returns {Boolean} - Success indicator
   */
  clearAllMedia() {
    try {
      localStorage.removeItem(STORAGE_KEYS.MEDIA);
      return true;
    } catch (error) {
      console.error('Error clearing media data:', error);
      return false;
    }
  }
};

/**
 * Settings Storage Manager
 * Handles application settings and preferences
 */
export const SettingsStorage = {
  /**
   * Save user settings
   * @param {Object} settings - Settings to save
   * @returns {Boolean} - Success indicator
   */
  saveSettings(settings) {
    try {
      const existingSettings = this.getSettings() || {};
      
      const updatedSettings = {
        ...existingSettings,
        ...settings,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
      return true;
    } catch (error) {
      console.error('Error saving settings to local storage:', error);
      return false;
    }
  },

  /**
   * Get user settings
   * @returns {Object} - User settings or default settings if none found
   */
  getSettings() {
    try {
      const settingsData = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      
      if (!settingsData) {
        // Return default settings
        return {
          darkMode: true,
          notifications: true,
          textToSpeech: false,
          fontSize: 'medium',
          language: 'en',
          lastUpdated: new Date().toISOString()
        };
      }
      
      return JSON.parse(settingsData);
    } catch (error) {
      console.error('Error retrieving settings from local storage:', error);
      return null;
    }
  },

  /**
   * Clear user settings
   * @returns {Boolean} - Success indicator
   */
  clearSettings() {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      return true;
    } catch (error) {
      console.error('Error clearing settings from local storage:', error);
      return false;
    }
  }
};

/**
 * Chat Storage Manager
 * Handles chat history and conversations
 */
export const ChatStorage = {
  /**
   * Save a chat session
   * @param {String} chatId - Unique chat identifier
   * @param {Object} chatData - Chat data to save
   * @returns {Boolean} - Success indicator
   */
  saveChat(chatId, chatData) {
    try {
      const chats = this.getAllChats() || {};
      
      chats[chatId] = {
        ...chatData,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
      return true;
    } catch (error) {
      console.error('Error saving chat to local storage:', error);
      return false;
    }
  },

  /**
   * Get a specific chat by ID
   * @param {String} chatId - Chat identifier
   * @returns {Object|null} - Chat data or null if not found
   */
  getChat(chatId) {
    try {
      const chats = this.getAllChats();
      return chats && chats[chatId] ? chats[chatId] : null;
    } catch (error) {
      console.error('Error retrieving chat from local storage:', error);
      return null;
    }
  },

  /**
   * Get all chats
   * @returns {Object} - All stored chats
   */
  getAllChats() {
    try {
      const chatsData = localStorage.getItem(STORAGE_KEYS.CHATS);
      return chatsData ? JSON.parse(chatsData) : {};
    } catch (error) {
      console.error('Error retrieving chats from local storage:', error);
      return {};
    }
  },

  /**
   * Add a message to a specific chat
   * @param {String} chatId - Chat identifier
   * @param {Object} message - Message to add
   * @returns {Boolean} - Success indicator
   */
  addMessageToChat(chatId, message) {
    try {
      const chat = this.getChat(chatId) || { messages: [] };
      
      chat.messages = chat.messages || [];
      chat.messages.push({
        id: `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...message
      });
      
      return this.saveChat(chatId, chat);
    } catch (error) {
      console.error('Error adding message to chat:', error);
      return false;
    }
  },

  /**
   * Delete a specific chat
   * @param {String} chatId - Chat identifier
   * @returns {Boolean} - Success indicator
   */
  deleteChat(chatId) {
    try {
      const chats = this.getAllChats();
      if (chats && chats[chatId]) {
        delete chats[chatId];
        localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
      }
      return true;
    } catch (error) {
      console.error('Error deleting chat from local storage:', error);
      return false;
    }
  },

  /**
   * Clear all chats
   * @returns {Boolean} - Success indicator
   */
  clearAllChats() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CHATS);
      return true;
    } catch (error) {
      console.error('Error clearing chats from local storage:', error);
      return false;
    }
  }
};

/**
 * Combined Storage Manager
 * Main interface to the local storage system
 */
const StorageManager = {
  profile: ProfileStorage,
  progress: ProgressStorage,
  media: MediaStorage,
  settings: SettingsStorage,
  chats: ChatStorage,
  
  /**
   * Check if local storage is available
   * @returns {Boolean} - True if available, false otherwise
   */
  isAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Get the total size of data stored 
   * @returns {Number} - Size in bytes
   */
  getTotalStorageSize() {
    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('mindmuse_')) {
          const value = localStorage.getItem(key);
          totalSize += key.length + value.length;
        }
      }
      return totalSize;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  },
  
  /**
   * Export all user data as a downloadable object
   * @returns {Object} - All user data or null if error
   */
  exportAllData() {
    try {
      const dataExport = {};
      
      for (const key in STORAGE_KEYS) {
        const storageKey = STORAGE_KEYS[key];
        const data = localStorage.getItem(storageKey);
        if (data) {
          dataExport[storageKey] = JSON.parse(data);
        }
      }
      
      dataExport.exportDate = new Date().toISOString();
      return dataExport;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  },
  
  /**
   * Import user data from exported object
   * @param {Object} importData - Data to import
   * @returns {Boolean} - Success indicator
   */
  importData(importData) {
    try {
      if (!importData) return false;
      
      for (const key in importData) {
        if (key !== 'exportDate' && Object.values(STORAGE_KEYS).includes(key)) {
          localStorage.setItem(key, JSON.stringify(importData[key]));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  },
  
  /**
   * Clear all application data from local storage
   * @returns {Boolean} - Success indicator
   */
  clearAllData() {
    try {
      for (const key in STORAGE_KEYS) {
        localStorage.removeItem(STORAGE_KEYS[key]);
      }
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }
};

export default StorageManager; 