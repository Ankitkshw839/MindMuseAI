// Firebase configuration file
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCV4kBxBlDt8MAeU2bxhJbkhbtFzCjsQMw",
    authDomain: "mindfulapp-ad0fa.firebaseapp.com",
    projectId: "mindfulapp-ad0fa",
    storageBucket: "mindfulapp-ad0fa.firebasestorage.app",
    messagingSenderId: "1089965307078",
    appId: "1:1089965307078:web:406ba4d91fac87331593c7"
  };
console.log("Initializing Firebase with config:", {
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
});

// Initialize Firebase
let app, auth, db, googleProvider, storage;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Email/Password signup
export const createUser = async (email, password) => {
    try {
        console.log("createUser called with email:", email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User created successfully:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Error in createUser:", error.code, error.message);
        throw error;
    }
};

// Email/Password login
export const signInUser = async (email, password) => {
    try {
        console.log("signInUser called with email:", email);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User signed in successfully:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Error in signInUser:", error.code, error.message);
        throw error;
    }
};

// Google login
export const signInWithGoogle = async () => {
    try {
        console.log("signInWithGoogle called");
        const result = await signInWithPopup(auth, googleProvider);
        console.log("Google sign in successful:", result.user.uid);
        return result.user;
    } catch (error) {
        console.error("Error in signInWithGoogle:", error.code, error.message);
        throw error;
    }
};

// Logout
export const logoutUser = async () => {
    try {
        console.log("logoutUser called");
        await signOut(auth);
        console.log("User signed out successfully");
        return true;
    } catch (error) {
        console.error("Error in logoutUser:", error.code, error.message);
        throw error;
    }
};

// Get current user
export const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        console.log("getCurrentUser called");
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            console.log("Current user:", user ? user.uid : "No user");
            resolve(user);
        }, (error) => {
            console.error("Error in getCurrentUser:", error);
            reject(error);
        });
    });
};

// Store additional user data in Firestore
export const storeUserData = async (userId, userData) => {
    try {
        console.log("storeUserData called for userId:", userId);
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, userData, { merge: true });
        console.log("User data stored successfully");
        return true;
    } catch (error) {
        console.error("Error in storeUserData:", error.code, error.message);
        throw error;
    }
};

// Upload file to Firebase Storage
export const uploadFile = async (file, path) => {
    try {
        console.log(`Uploading file to path: ${path}`);
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("File uploaded successfully, download URL:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file:", error.code, error.message);
        throw error;
    }
};

// Function to get the Firebase app instance
export function getFirebaseApp() {
    return app;
}

export { auth, db, storage }; 

console.log("🔥 Firebase config loaded successfully");
console.log("✅ API Key:", firebaseConfig.apiKey); 