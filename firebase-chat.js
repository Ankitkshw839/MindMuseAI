// Firebase Chat and Mood Data Manager
import { 
    auth, 
    db 
} from './firebase-config.js';

import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
    arrayUnion,
    Timestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Chat Data Manager for Firebase
 */
export const ChatManager = {
    /**
     * Save a chat session to Firebase
     * @param {String} chatId - Unique chat identifier
     * @param {Object} chatData - Chat data to save
     * @returns {Promise<boolean>} - Success indicator
     */
    async saveChat(chatId, chatData) {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.warn("User not logged in. Chat data will not be saved to Firebase.");
                return false;
            }

            const chatRef = doc(db, `users/${user.uid}/chats/${chatId}`);
            await setDoc(chatRef, {
                ...chatData,
                lastUpdated: Timestamp.now(),
                userId: user.uid
            });

            console.log(`Chat ${chatId} saved successfully to Firebase`);
            return true;
        } catch (error) {
            console.error('Error saving chat to Firebase:', error);
            return false;
        }
    },

    /**
     * Get a specific chat by ID
     * @param {String} chatId - Chat identifier
     * @returns {Promise<Object|null>} - Chat data or null if not found
     */
    async getChat(chatId) {
        try {
            const user = auth.currentUser;
            if (!user) return null;

            const chatRef = doc(db, `users/${user.uid}/chats/${chatId}`);
            const chatDoc = await getDoc(chatRef);

            return chatDoc.exists() ? chatDoc.data() : null;
        } catch (error) {
            console.error('Error retrieving chat from Firebase:', error);
            return null;
        }
    },

    /**
     * Get all chats for the current user
     * @returns {Promise<Array>} - Array of chat objects
     */
    async getAllChats() {
        try {
            const user = auth.currentUser;
            if (!user) return [];

            const chatsRef = collection(db, `users/${user.uid}/chats`);
            const q = query(chatsRef, orderBy('lastUpdated', 'desc'));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error retrieving chats from Firebase:', error);
            return [];
        }
    },

    /**
     * Add a message to a specific chat
     * @param {String} chatId - Chat identifier
     * @param {Object} message - Message to add
     * @returns {Promise<boolean>} - Success indicator
     */
    async addMessageToChat(chatId, message) {
        try {
            const user = auth.currentUser;
            if (!user) return false;

            const chatRef = doc(db, `users/${user.uid}/chats/${chatId}`);
            await updateDoc(chatRef, {
                messages: arrayUnion({
                    id: `msg_${Date.now()}`,
                    timestamp: Timestamp.now(),
                    ...message
                }),
                lastUpdated: Timestamp.now()
            });

            return true;
        } catch (error) {
            console.error('Error adding message to chat in Firebase:', error);
            return false;
        }
    },

    /**
     * Delete a specific chat
     * @param {String} chatId - Chat identifier
     * @returns {Promise<boolean>} - Success indicator
     */
    async deleteChat(chatId) {
        try {
            const user = auth.currentUser;
            if (!user) return false;

            const chatRef = doc(db, `users/${user.uid}/chats/${chatId}`);
            await deleteDoc(chatRef);

            return true;
        } catch (error) {
            console.error('Error deleting chat from Firebase:', error);
            return false;
        }
    }
};

/**
 * Mood Data Manager for Firebase
 */
export const MoodManager = {
    /**
     * Save a mood entry
     * @param {String} mood - The mood to save
     * @param {String} note - Optional note about the mood
     * @returns {Promise<boolean>} - Success indicator
     */
    async saveMoodEntry(mood, note = '') {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.warn("User not logged in. Mood data will not be saved to Firebase.");
                return false;
            }

            const moodRef = doc(db, `users/${user.uid}/moods/${Date.now()}`);
            await setDoc(moodRef, {
                mood,
                note,
                timestamp: Timestamp.now(),
                userId: user.uid
            });

            return true;
        } catch (error) {
            console.error('Error saving mood to Firebase:', error);
            return false;
        }
    },

    /**
     * Get mood entries for a date range
     * @param {Date} startDate - Start date for mood entries
     * @param {Date} endDate - End date for mood entries
     * @returns {Promise<Array>} - Array of mood entries
     */
    async getMoodEntries(startDate, endDate) {
        try {
            const user = auth.currentUser;
            if (!user) return [];

            const moodsRef = collection(db, `users/${user.uid}/moods`);
            const q = query(
                moodsRef,
                where('timestamp', '>=', Timestamp.fromDate(startDate)),
                where('timestamp', '<=', Timestamp.fromDate(endDate)),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error retrieving mood entries from Firebase:', error);
            return [];
        }
    },

    /**
     * Get mood statistics for a date range
     * @param {Date} startDate - Start date for statistics
     * @param {Date} endDate - End date for statistics
     * @returns {Promise<Object>} - Mood statistics
     */
    async getMoodStats(startDate, endDate) {
        try {
            const entries = await this.getMoodEntries(startDate, endDate);
            const stats = {
                total: entries.length,
                byMood: {}
            };

            entries.forEach(entry => {
                if (!stats.byMood[entry.mood]) {
                    stats.byMood[entry.mood] = 0;
                }
                stats.byMood[entry.mood]++;
            });

            return stats;
        } catch (error) {
            console.error('Error calculating mood statistics:', error);
            return { total: 0, byMood: {} };
        }
    }
}; 