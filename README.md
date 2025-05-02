# 🧠 MindMuseAI – Mental Health Companion

**MindMuse AI** is an AI-powered mental health chatbot designed to help users track their emotional well-being, receive guidance, and gain insights into their mental health progress. The app empowers users to better understand their mental state, develop coping strategies, and access helpful resources — all through a beautifully crafted, accessible web experience.

---

## 📋 Installation & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or newer)
- [Git](https://git-scm.com/)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MindMuseAI.git
   cd MindMuseAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a [Firebase](https://firebase.google.com/) account if you don't have one
   - Create a new Firebase project
   - Enable Authentication (Email/Password and Google Sign-in)
   - Create a Firestore database
   - Update the Firebase configuration in `firebase-config.js` with your own credentials:
     ```javascript
     // Replace with your Firebase config
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     ```

4. **DeepSeek API Setup** (or other AI model)
   - Get your API key from [DeepSeek](https://deepseek.ai/)
   - Update the API configuration in `config.js`

### Running the Application

1. **Local Development**
   - Open `index.html` in your browser:
     ```bash
     # If you have a simple HTTP server installed
     npx serve
     ```
   - Or simply open the `index.html` file directly in your browser

2. **Firebase Hosting** (Optional)
   ```bash
   # Install Firebase tools if not already installed
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase project
   firebase init
   
   # Deploy to Firebase
   firebase deploy
   ```

### Troubleshooting

- If authentication doesn't work, make sure your Firebase configuration is correct and the authentication methods are enabled in the Firebase console.
- Check browser console for any JavaScript errors.
- Ensure all API keys are correctly set in their respective configuration files.

---

## 🌟 Key Features

### 🧠 Emotion Recognition
- Detects emotional tone from user input using AI (currently DeepSeek API).
- Plans to use fine-tuned ML/NLP models in future for deeper understanding.

### 💡 Mental Health Advice
- Offers actionable tips and resources on:
  - Managing anxiety
  - Controlling stress
  - Overcoming depression
- Chatbot suggests personalized advice based on user mood.

### 🗓️ Mood Tracker & Progress Insights
- Tracks emotions over time.
- Visualizes mental health progress through dynamic graphs.
- Stores all sessions and advice history for reflection.

### 🔐 Authentication System
- Firebase-based user authentication.
- Supports both:
  - Google Sign-In
  - Traditional Email/Password Sign-Up

### 🧾 Profile Management
- Edit name, view mood logs, and manage account settings.
- Future-ready design includes model selection and voice settings.

### 🎙️ Voice Interaction (Coming Soon)
- Integrated microphone feature using Web Speech API.
- Users can speak with the chatbot via voice input.

### 🛠️ Model Selection (Coming Soon)
- Users will be able to choose between multiple AI models.
- Easily switch between APIs or custom-trained models.

---

## 💻 Tech Stack

| Area               | Technology                  |
|--------------------|-----------------------------|
| Frontend           | HTML, CSS, JavaScript       |
| UI Assistance      | Cursor AI                   |
| Backend            | Node.js, Express.js         |
| Chatbot API        | DeepSeek API (for now)      |
| Authentication     | Firebase Authentication     |
| Database           | Firebase Firestore          |
| Graphs & Logs      | Chart.js / Custom JS        |
| Voice Support      | Web Speech API              |
| Hosting (Optional) | Firebase Hosting / Vercel   |

---

## 🧪 Future Enhancements

- Fine-tuned ML/NLP model for emotion detection.
- Offline support with PWA setup.
- More model integration options (OpenAI, Claude, etc.).
- Journal writing and AI feedback analysis.
- Emergency support links and mental health resources.

---

## screenshots
![image](https://github.com/user-attachments/assets/626184c2-724d-41f2-bb3f-c926318b6688)
![image](https://github.com/user-attachments/assets/ccc2319a-760a-4516-a04e-c3f47865bf3a)
![image](https://github.com/user-attachments/assets/6e73d450-a581-463b-8042-16f9b492b68f)
![image](https://github.com/user-attachments/assets/a41022df-2df1-472b-a144-f3677e552e62)
![image](https://github.com/user-attachments/assets/a99f4917-71a1-4616-af9e-8a14ba3cfba7)
![image](https://github.com/user-attachments/assets/bb0cc09a-8da9-4e80-bbc0-9f29cc482827)
![image](https://github.com/user-attachments/assets/c16d3403-381b-4fa8-aaf8-61b2cd7069e2)

## 📋 Installation & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or newer)
- [Git](https://git-scm.com/)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MindMuseAI.git
   cd MindMuseAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a [Firebase](https://firebase.google.com/) account if you don't have one
   - Create a new Firebase project
   - Enable Authentication (Email/Password and Google Sign-in)
   - Create a Firestore database
   - Update the Firebase configuration in `firebase-config.js` with your own credentials:
     ```javascript
     // Replace with your Firebase config
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     ```

4. **DeepSeek API Setup** (or other AI model)
   - Get your API key from [DeepSeek](https://deepseek.ai/)
   - Update the API configuration in `config.js`

### Running the Application

1. **Local Development**
   - Open `index.html` in your browser:
     ```bash
     # If you have a simple HTTP server installed
     npx serve
     ```
   - Or simply open the `index.html` file directly in your browser

2. **Firebase Hosting** (Optional)
   ```bash
   # Install Firebase tools if not already installed
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase project
   firebase init
   
   # Deploy to Firebase
   firebase deploy
   ```

### Troubleshooting

- If authentication doesn't work, make sure your Firebase configuration is correct and the authentication methods are enabled in the Firebase console.
- Check browser console for any JavaScript errors.
- Ensure all API keys are correctly set in their respective configuration files.



