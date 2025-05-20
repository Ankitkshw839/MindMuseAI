// Mood Tracker Integration with Firebase
// Handles storing mood data in Firebase Firestore

import { 
    auth, 
    db 
} from './firebase-config.js';

import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    arrayUnion, 
    query, 
    collection, 
    where, 
    orderBy, 
    getDocs, 
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { MoodManager } from './firebase-chat.js';

// Declare local cache of mood history
let moodHistory = [];
let listeners = [];

// Function to save mood entry to Firebase
export async function saveMoodEntry(mood, note = '') {
    try {
        console.log(`Saving mood '${mood}' with note: ${note}`);
        
        // Save to Firebase
        const success = await MoodManager.saveMoodEntry(mood, note);
        
        if (success) {
            // Update local cache
            const entry = {
                mood,
                note,
                timestamp: new Date().toISOString()
            };
            moodHistory.unshift(entry);
            
            // Notify listeners
            notifyListeners('moodAdded', entry);
            
            return { success: true };
        } else {
            console.warn("Failed to save mood entry to Firebase");
            return { success: false, error: "Failed to save mood entry" };
        }
    } catch (error) {
        console.error('Error saving mood entry:', error);
        return { success: false, error: error.message };
    }
}

// Function to load mood history from Firebase
export async function loadMoodHistory() {
    try {
        const user = auth.currentUser;
        
        if (!user) {
            console.warn("Not logged in. Cannot load mood history from Firebase.");
            return { success: false, error: "User not logged in", data: [] };
        }
        
        console.log(`Loading mood history for user ${user.uid}`);
        
        // Reference to user's mood data document
        const userMoodRef = doc(db, "userMoods", user.uid);
        
        // Get the document
        const docSnap = await getDoc(userMoodRef);
        
        if (docSnap.exists()) {
            const userData = docSnap.data();
            
            if (userData.entries && userData.entries.length > 0) {
                // Sort entries by date (newest first)
                const sortedEntries = [...userData.entries].sort((a, b) => {
                    return new Date(b.date) - new Date(a.date);
                });
                
                // Update local cache
                moodHistory = sortedEntries;
                
                console.log("Loaded mood history from Firebase:", moodHistory);
                return { success: true, data: moodHistory };
            } else {
                console.log("No mood entries found");
                return { success: true, data: [] };
            }
        } else {
            console.log("No mood data document found");
            return { success: true, data: [] };
        }
    } catch (error) {
        console.error("Error loading mood history:", error);
        return { success: false, error: error.message, data: [] };
    }
}

// Function to get mood history for a specific time period
export async function getMoodHistoryForPeriod(period) {
    try {
        const result = await loadMoodHistory();
        
        if (!result.success) {
            return result;
        }
        
        const entries = result.data;
        
        // Filter entries based on period
        const now = new Date();
        let filteredEntries = [];
        
        switch (period) {
            case 'week':
                // Last 7 days
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                filteredEntries = entries.filter(entry => new Date(entry.date) >= weekAgo);
                break;
            case 'month':
                // Last 30 days
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                filteredEntries = entries.filter(entry => new Date(entry.date) >= monthAgo);
                break;
            case 'year':
                // Last 365 days
                const yearAgo = new Date();
                yearAgo.setDate(yearAgo.getDate() - 365);
                filteredEntries = entries.filter(entry => new Date(entry.date) >= yearAgo);
                break;
            default:
                // Return all entries
                filteredEntries = entries;
                break;
        }
        
        return { success: true, data: filteredEntries };
    } catch (error) {
        console.error(`Error getting mood history for period ${period}:`, error);
        return { success: false, error: error.message, data: [] };
    }
}

// Function to subscribe to mood data updates
export function subscribeToMoodUpdates(callback) {
    try {
        const user = auth.currentUser;
        
        if (!user) {
            console.warn("Not logged in. Cannot subscribe to mood updates.");
            return { success: false, error: "User not logged in" };
        }
        
        console.log(`Setting up mood updates subscription for user ${user.uid}`);
        
        // Reference to user's mood data document
        const userMoodRef = doc(db, "userMoods", user.uid);
        
        // Set up snapshot listener
        const unsubscribe = onSnapshot(userMoodRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                
                if (userData.entries && userData.entries.length > 0) {
                    // Sort entries by date
                    const sortedEntries = [...userData.entries].sort((a, b) => {
                        return new Date(b.date) - new Date(a.date);
                    });
                    
                    // Update local cache
                    moodHistory = sortedEntries;
                    
                    // Call callback with new data
                    callback({ success: true, data: moodHistory });
                } else {
                    callback({ success: true, data: [] });
                }
            } else {
                callback({ success: true, data: [] });
            }
        }, (error) => {
            console.error("Error listening to mood updates:", error);
            callback({ success: false, error: error.message, data: [] });
        });
        
        // Add to listeners array
        listeners.push(unsubscribe);
        
        return { success: true, unsubscribe };
    } catch (error) {
        console.error("Error setting up mood updates subscription:", error);
        return { success: false, error: error.message };
    }
}

// Function to unsubscribe from all listeners
export function unsubscribeFromMoodUpdates() {
    try {
        console.log(`Unsubscribing from ${listeners.length} mood update listeners`);
        
        // Call each unsubscribe function
        listeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        // Clear listeners array
        listeners = [];
        
        return { success: true };
    } catch (error) {
        console.error("Error unsubscribing from mood updates:", error);
        return { success: false, error: error.message };
    }
}

// Function to get mood statistics
export async function getMoodStatistics() {
    try {
        const result = await loadMoodHistory();
        
        if (!result.success) {
            return result;
        }
        
        const entries = result.data;
        
        if (entries.length === 0) {
            return { 
                success: true, 
                data: {
                    totalEntries: 0,
                    mostFrequentMood: null,
                    moodFrequency: {},
                    averageMood: null,
                    streak: 0
                }
            };
        }
        
        // Calculate mood frequency
        const moodFrequency = {};
        entries.forEach(entry => {
            moodFrequency[entry.mood] = (moodFrequency[entry.mood] || 0) + 1;
        });
        
        // Find most frequent mood
        let mostFrequentMood = null;
        let maxCount = 0;
        
        Object.keys(moodFrequency).forEach(mood => {
            if (moodFrequency[mood] > maxCount) {
                mostFrequentMood = mood;
                maxCount = moodFrequency[mood];
            }
        });
        
        // Calculate mood streak
        let streak = 1;
        const sortedByDate = [...entries].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        const today = new Date().toISOString().split('T')[0];
        
        // Check if there's an entry for today
        if (sortedByDate.length > 0 && sortedByDate[0].date === today) {
            let currentDate = new Date(today);
            
            for (let i = 1; i < sortedByDate.length; i++) {
                // Calculate expected previous date
                currentDate.setDate(currentDate.getDate() - 1);
                const expectedPrevDate = currentDate.toISOString().split('T')[0];
                
                // If we found the expected previous date, increase streak
                if (sortedByDate[i].date === expectedPrevDate) {
                    streak++;
                } else {
                    break;
                }
            }
        } else {
            streak = 0; // No entry for today means streak is broken
        }
        
        // Prepare the statistics object
        const statistics = {
            totalEntries: entries.length,
            mostFrequentMood,
            moodFrequency,
            streak
        };
        
        return { success: true, data: statistics };
    } catch (error) {
        console.error("Error getting mood statistics:", error);
        return { success: false, error: error.message, data: null };
    }
}

// Export local mood history
export const getMoodHistory = () => moodHistory;

// Initialize mood tracker when the module is loaded
export async function initMoodTracker() {
    try {
        console.log("Initializing mood tracker");
        
        // Check if user is logged in
        const user = auth.currentUser;
        
        if (user) {
            // Load mood history
            await loadMoodHistory();
            console.log("Mood tracker initialized successfully");
        } else {
            console.log("User not logged in. Mood tracker will use local data only.");
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error initializing mood tracker:", error);
        return { success: false, error: error.message };
    }
}

// Listen for auth state changes
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("User logged in. Loading mood data from Firebase.");
        await loadMoodHistory();
    } else {
        console.log("User logged out. Clearing mood data.");
        moodHistory = [];
        unsubscribeFromMoodUpdates();
    }
});

// Initialize when module loads
initMoodTracker();

// Function to get mood entries for a date range
export async function getMoodEntries(startDate, endDate) {
    try {
        console.log(`Getting mood entries from ${startDate} to ${endDate}`);
        
        // Get entries from Firebase
        const entries = await MoodManager.getMoodEntries(startDate, endDate);
        
        // Update local cache
        moodHistory = entries;
        
        return entries;
    } catch (error) {
        console.error('Error getting mood entries:', error);
        return [];
    }
}

// Function to get mood statistics
export async function getMoodStats(startDate, endDate) {
    try {
        console.log(`Getting mood statistics from ${startDate} to ${endDate}`);
        
        // Get stats from Firebase
        const stats = await MoodManager.getMoodStats(startDate, endDate);
        
        return stats;
    } catch (error) {
        console.error('Error getting mood statistics:', error);
        return { total: 0, byMood: {} };
    }
}

// Function to add a listener for mood changes
export function addMoodListener(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter(cb => cb !== callback);
    };
}

// Function to notify listeners of changes
function notifyListeners(event, data) {
    listeners.forEach(callback => {
        try {
            callback(event, data);
        } catch (error) {
            console.error('Error in mood listener:', error);
        }
    });
}

// Function to update mood UI
function updateMoodUI(entries) {
    // Get mood display elements
    const moodDisplay = document.getElementById('mood-display');
    const moodHistory = document.getElementById('mood-history');
    
    if (!moodDisplay || !moodHistory) {
        console.warn('Mood display elements not found');
        return;
    }
    
    // Clear existing content
    moodHistory.innerHTML = '';
    
    // Add mood entries to UI
    entries.forEach(entry => {
        const moodItem = document.createElement('div');
        moodItem.classList.add('mood-item');
        
        const time = new Date(entry.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        moodItem.innerHTML = `
            <div class="mood-emoji">${getMoodEmoji(entry.mood)}</div>
            <div class="mood-info">
                <div class="mood-label">${entry.mood}</div>
                <div class="mood-time">${time}</div>
                ${entry.note ? `<div class="mood-note">${entry.note}</div>` : ''}
            </div>
        `;
        
        moodHistory.appendChild(moodItem);
    });
    
    // Update current mood display if there are entries
    if (entries.length > 0) {
        const latestMood = entries[0];
        moodDisplay.innerHTML = `
            <div class="current-mood">
                <div class="mood-emoji large">${getMoodEmoji(latestMood.mood)}</div>
                <div class="mood-label">${latestMood.mood}</div>
            </div>
        `;
    }
}

// Helper function to get mood emoji
function getMoodEmoji(mood) {
    const moodEmojis = {
        'happy': '😊',
        'sad': '😔',
        'angry': '😠',
        'anxious': '😰',
        'neutral': '😐',
        'excited': '😃',
        'tired': '😴',
        'stressed': '😫'
    };
    
    return moodEmojis[mood.toLowerCase()] || '😐';
}

// Initialize mood tracker when the page loads
document.addEventListener('DOMContentLoaded', initMoodTracker); 