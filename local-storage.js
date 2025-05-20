/**
 * MindMuseAI Storage Module
 * Handles data persistence for the application
 * Supports both local storage and Firebase storage
 */

import { 
    db, auth, getCurrentUser 
} from './firebase-config.js';

import { 
    doc, setDoc, getDoc, updateDoc, arrayUnion, 
    collection, query, where, getDocs, Timestamp, 
    orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Storage Keys for localStorage fallback
const STORAGE_KEYS = {
    PROFILE: 'mindmuse_profile',
    PROGRESS: 'mindmuse_progress',
    CHAT_HISTORY: 'mindmuse_chat_history',
    MEDIA: 'mindmuse_media',
    SETTINGS: 'mindmuse_settings',
    API_KEY: 'mindmuse_api_key',
};

/**
 * Helper function to get current user ID
 * @returns {String|null} - User ID or null if not logged in
 */
const getCurrentUserId = async () => {
    try {
        const user = await getCurrentUser();
        return user ? user.uid : null;
    } catch (error) {
        console.error('Error getting current user ID:', error);
        return null;
    }
};

/**
 * Profile Storage Manager
 * Handles user profile data
 */
const ProfileStorage = {
    /**
     * Save user profile data
     * @param {Object} profileData - The profile data to save
     * @returns {Promise<Boolean>} - Success indicator
     */
    async saveProfile(profileData) {
        console.log('Saving profile data:', profileData);
        try {
            const userId = await getCurrentUserId();
            
            // If user is logged in, save to Firebase
            if (userId) {
                await setDoc(doc(db, "users", userId), {
                    ...profileData,
                    lastUpdated: Timestamp.now()
                }, { merge: true });
                console.log('Profile saved to Firebase');
            }
            
            // Save to localStorage as fallback
            localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify({
                ...profileData,
                lastUpdated: new Date().toISOString()
            }));
            
            return true;
        } catch (error) {
            console.error('Error saving profile:', error);
            return false;
        }
    },

    /**
     * Get user profile
     * @returns {Promise<Object|null>} - User profile data or null if not found
     */
    async getProfile() {
        try {
            const userId = await getCurrentUserId();
            
            // If user is logged in, get from Firebase
            if (userId) {
                const docRef = doc(db, "users", userId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    console.log('Profile loaded from Firebase');
                    return docSnap.data();
                }
            }
            
            // Fallback to localStorage
            const profileData = localStorage.getItem(STORAGE_KEYS.PROFILE);
            return profileData ? JSON.parse(profileData) : null;
        } catch (error) {
            console.error('Error retrieving profile:', error);
            return null;
        }
    },

    /**
     * Clear profile data
     * @returns {Promise<Boolean>} - Success indicator
     */
    async clearProfile() {
        try {
            localStorage.removeItem(STORAGE_KEYS.PROFILE);
            return true;
        } catch (error) {
            console.error('Error clearing profile:', error);
            return false;
        }
    }
};

/**
 * Progress Storage Manager
 * Handles user progress data including mood tracking and gamification
 */
const ProgressStorage = {
    /**
     * Save user progress data
     * @param {Object} progressData - The progress data to save
     * @returns {Promise<Boolean>} - Success indicator
     */
    async saveProgress(progressData) {
        try {
            const userId = await getCurrentUserId();
            
            // If user is logged in, save to Firebase
            if (userId) {
                await setDoc(doc(db, "userProgress", userId), {
                    ...progressData,
                    lastUpdated: Timestamp.now()
                }, { merge: true });
                console.log('Progress saved to Firebase');
            }
            
            // Save to localStorage as fallback
            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify({
                ...progressData,
                lastUpdated: new Date().toISOString()
            }));
            
            return true;
        } catch (error) {
            console.error('Error saving progress:', error);
            return false;
        }
    },

    /**
     * Add a mood entry
     * @param {String} mood - The mood to record
     * @returns {Promise<Boolean>} - Success indicator
     */
    async addMoodEntry(mood) {
        try {
            const timestamp = new Date().toISOString();
            const entry = { mood, timestamp };
            const userId = await getCurrentUserId();
            
            // If user is logged in, save to Firebase
            if (userId) {
                const docRef = doc(db, "userProgress", userId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    // Update existing document
                    await updateDoc(docRef, {
                        moodEntries: arrayUnion(entry),
                        lastUpdated: Timestamp.now()
                    });
                } else {
                    // Create new document
                    await setDoc(docRef, {
                        moodEntries: [entry],
                        lastUpdated: Timestamp.now()
                    });
                }
                console.log('Mood entry saved to Firebase');
            }
            
            // Update localStorage as fallback
            const progress = this.getProgress() || {};
            const moodEntries = progress.moodEntries || [];
            moodEntries.push(entry);
            
            return this.saveProgress({
                ...progress,
                moodEntries
            });
        } catch (error) {
            console.error('Error adding mood entry:', error);
            return false;
        }
    },

    /**
     * Retrieve user progress data
     * @returns {Promise<Object|null>} - Progress data or null if not found
     */
    async getProgress() {
        try {
            const userId = await getCurrentUserId();
            
            // If user is logged in, get from Firebase
            if (userId) {
                const docRef = doc(db, "userProgress", userId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    console.log('Progress loaded from Firebase');
                    return docSnap.data();
                }
            }
            
            // Fallback to localStorage
            const progressData = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            return progressData ? JSON.parse(progressData) : null;
        } catch (error) {
            console.error('Error retrieving progress:', error);
            return null;
        }
    },

    /**
     * Get mood entries for a specific date range
     * @param {Date} startDate - Start of the range
     * @param {Date} endDate - End of the range
     * @returns {Promise<Array>} - Array of mood entries
     */
    async getMoodEntriesInRange(startDate, endDate) {
        try {
            const progress = await this.getProgress();
            
            if (!progress || !progress.moodEntries) {
                return [];
            }
            
            return progress.moodEntries.filter(entry => {
                const entryDate = new Date(entry.timestamp);
                return entryDate >= startDate && entryDate <= endDate;
            });
        } catch (error) {
            console.error('Error getting mood entries in range:', error);
            return [];
        }
    },

    /**
     * Clear all progress data
     * @returns {Promise<Boolean>} - Success indicator
     */
    async clearProgress() {
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
 * Chat Storage Manager
 * Handles chat history and conversations
 */
const ChatStorage = {
    /**
     * Save a chat message
     * @param {Object} messageData - The message data to save
     * @returns {Promise<Boolean>} - Success indicator
     */
    async saveMessage(messageData) {
        try {
            const userId = await getCurrentUserId();
            const timestamp = Timestamp.now();
            
            // Add metadata to message
            const enhancedMessage = {
                ...messageData,
                timestamp,
                id: `msg_${Date.now()}`,
                userId
            };
            
            // If user is logged in, save to Firebase
            if (userId) {
                await setDoc(doc(db, "chatMessages", enhancedMessage.id), enhancedMessage);
                console.log('Chat message saved to Firebase');
            }
            
            // Update localStorage as fallback
            const chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY) || '[]');
            chatHistory.push({
                ...enhancedMessage,
                timestamp: timestamp.toDate().toISOString()
            });
            
            // Limit local storage to last 100 messages
            const limitedHistory = chatHistory.slice(-100);
            localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(limitedHistory));
            
            return true;
        } catch (error) {
            console.error('Error saving chat message:', error);
            return false;
        }
    },

    /**
     * Get chat history
     * @param {Number} limit - Maximum number of messages to retrieve
     * @returns {Promise<Array>} - Array of chat messages
     */
    async getChatHistory(limit = 50) {
        try {
            const userId = await getCurrentUserId();
            
            // If user is logged in, get from Firebase
            if (userId) {
                const q = query(
                    collection(db, "chatMessages"),
                    where("userId", "==", userId),
                    orderBy("timestamp", "desc"),
                    limit(limit)
                );
                
                const querySnapshot = await getDocs(q);
                const messages = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    messages.push({
                        ...data,
                        timestamp: data.timestamp.toDate().toISOString()
                    });
                });
                
                return messages.reverse();
            }
            
            // Fallback to localStorage
            const chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY) || '[]');
            return chatHistory.slice(-limit);
        } catch (error) {
            console.error('Error retrieving chat history:', error);
            return [];
        }
    },

    /**
     * Clear chat history
     * @returns {Promise<Boolean>} - Success indicator
     */
    async clearChatHistory() {
        try {
            localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
            return true;
        } catch (error) {
            console.error('Error clearing chat history:', error);
            return false;
        }
    }
};

/**
 * Settings Storage Manager
 * Handles application settings and preferences
 */
const SettingsStorage = {
    /**
     * Save user settings
     * @param {Object} settings - Settings to save
     * @returns {Promise<Boolean>} - Success indicator
     */
    async saveSettings(settings) {
        try {
            const userId = await getCurrentUserId();
            const timestamp = new Date().toISOString();
            
            // Prepare settings object
            const updatedSettings = {
                ...settings,
                lastUpdated: timestamp
            };
            
            // If user is logged in, save to Firebase
            if (userId) {
                await setDoc(doc(db, "userSettings", userId), {
                    ...updatedSettings,
                    lastUpdated: Timestamp.now()
                }, { merge: true });
                console.log('Settings saved to Firebase');
            }
            
            // Save to localStorage as fallback
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
            
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    /**
     * Get user settings
     * @returns {Promise<Object>} - User settings or default settings if none found
     */
    async getSettings() {
        try {
            const userId = await getCurrentUserId();
            let settings = null;
            
            // If user is logged in, get from Firebase
            if (userId) {
                const docRef = doc(db, "userSettings", userId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    console.log('Settings loaded from Firebase');
                    settings = docSnap.data();
                }
            }
            
            // Fallback to localStorage
            if (!settings) {
                const settingsData = localStorage.getItem(STORAGE_KEYS.SETTINGS);
                settings = settingsData ? JSON.parse(settingsData) : null;
            }
            
            // Return default settings if none found
            if (!settings) {
                return {
                    darkMode: true,
                    notifications: true,
                    textToSpeech: false,
                    fontSize: 'medium',
                    language: 'en',
                    lastUpdated: new Date().toISOString()
                };
            }
            
            return settings;
        } catch (error) {
            console.error('Error retrieving settings:', error);
            return {
                darkMode: true,
                notifications: true,
                textToSpeech: false,
                fontSize: 'medium',
                language: 'en',
                lastUpdated: new Date().toISOString()
            };
        }
    },

    /**
     * Clear user settings
     * @returns {Promise<Boolean>} - Success indicator
     */
    async clearSettings() {
        try {
            localStorage.removeItem(STORAGE_KEYS.SETTINGS);
            return true;
        } catch (error) {
            console.error('Error clearing settings:', error);
            return false;
        }
    }
};

/**
 * Combined Storage Manager
 * Main interface to the storage system
 */
const StorageManager = {
    profile: ProfileStorage,
    progress: ProgressStorage,
    chats: ChatStorage,
    settings: SettingsStorage,
    
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
     * Get the current user ID
     * @returns {Promise<String|null>} - User ID or null
     */
    async getCurrentUserId() {
        return getCurrentUserId();
    },
    
    /**
     * Check if user is authenticated
     * @returns {Promise<Boolean>} - True if authenticated
     */
    async isAuthenticated() {
        const userId = await getCurrentUserId();
        return !!userId;
    },
    
    /**
     * Clear all application data from local storage
     * @returns {Promise<Boolean>} - Success indicator
     */
    async clearAllData() {
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