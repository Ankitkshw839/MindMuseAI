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

// Declare local cache of mood history
let moodHistory = [];
let listeners = [];

// Function to save mood entry to Firebase
export async function saveMoodEntry(mood) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const user = auth.currentUser;
        
        if (!user) {
            console.warn("Not logged in. Mood data will not be saved to Firebase.");
            return { success: false, error: "User not logged in" };
        }
        
        console.log(`Saving mood '${mood}' for user ${user.uid} on ${today}`);
        
        // Create a new mood entry
        const moodEntry = {
            date: today,
            mood: mood,
            timestamp: new Date().toISOString()
        };
        
        // Reference to user's mood data document
        const userMoodRef = doc(db, "userMoods", user.uid);
        
        // Check if document exists
        const docSnap = await getDoc(userMoodRef);
        
        if (docSnap.exists()) {
            // Check if there's an entry for today
            const existingData = docSnap.data();
            const existingEntries = existingData.entries || [];
            const todayEntryIndex = existingEntries.findIndex(entry => entry.date === today);
            
            if (todayEntryIndex !== -1) {
                // Update today's entry
                existingEntries[todayEntryIndex] = moodEntry;
                
                // Update the document
                await updateDoc(userMoodRef, {
                    entries: existingEntries,
                    lastUpdated: new Date().toISOString()
                });
            } else {
                // Add new entry
                await updateDoc(userMoodRef, {
                    entries: arrayUnion(moodEntry),
                    lastUpdated: new Date().toISOString()
                });
            }
        } else {
            // Create new document
            await setDoc(userMoodRef, {
                userId: user.uid,
                entries: [moodEntry],
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
        }
        
        console.log("Mood data saved successfully");
        return { success: true };
    } catch (error) {
        console.error("Error saving mood data:", error);
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