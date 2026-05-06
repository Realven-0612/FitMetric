# FitMetric 🏋️‍♂️

FitMetric is a comprehensive, AI-powered fitness and nutrition tracking application designed to simplify the way you achieve your fitness goals. Unlike traditional trackers, FitMetric acts as an intelligent personal trainer—utilizing AI to analyze your body composition, generate personalized workout plans, and automatically sync your daily cardio activities.

![FitMetric](public/logo.png) 

## 🌟 Key Features

The application was developed systematically across 4 distinct phases:

### Phase 1: The Core Foundation
* **Biometric Engine:** Calculates BMR (Basal Metabolic Rate) and TDEE (Total Daily Energy Expenditure) based on your weight, height, age, gender, and activity level.
* **Macro Targets:** Dynamically adjusts protein, carbs, and fat ratios based on your primary goal (Lose Fat, Build Muscle, Maintain).
* **Multi-Language Support (i18n):** Seamlessly switch between English and Vietnamese interfaces.

### Phase 2: Advanced Analytics
* **Body Physique Scanner:** Integrates TensorFlow to analyze uploaded body images, estimating body fat percentage, muscle mass, and providing an aesthetic score.
* **Progress Tracking:** Interactive charts (using Recharts) to visualize weight history and daily calorie consumption.

### Phase 3: AI Coaching (Gemini Integration)
* **Smart Workout Generation:** Powered by Google's Gemini API, FitMetric creates highly customized 7-day workout plans tailored to your specific goals and available equipment.
* **Auto Weight Progression:** The AI suggests specific training weights for your exercises and dynamically scales them as you progress.
* **Intelligent Insights:** Analyzes your 7-day calorie and weight trends to give you actionable, human-like coaching advice.

### Phase 4: Ecosystem & Cloud Sync
* **Universal Cloud Sync:** Utilizes Firebase Firestore to persist your food diary, water intake, weight history, and user profile across all your devices.
* **Automated Strava Tracking:** Connect your Strava account to automatically pull in your recent runs and rides. FitMetric intelligently calculates your "Active Calories Burned" and dynamically expands your daily TDEE allowance.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide React (Icons), Recharts
* **Backend / Proxy:** Node.js, Express (serves as a secure proxy to hide API keys)
* **Database & Auth:** Firebase (Firestore & Google Authentication)
* **AI & Machine Learning:** Google Gemini API, TensorFlow.js (Pose Detection)
* **External APIs:** Strava OAuth & Activity API

---

## 🚀 Local Development Setup

### 1. Prerequisites
* Node.js (v18 or higher)
* A Google Gemini API Key
* A Firebase Project (with Firestore and Google Auth enabled)
* A Strava Developer Application

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Realven-0612/FitMetric.git
cd FitMetric
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (you can copy from `.env.example`) and fill in your credentials:
```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Strava Integration
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
APP_URL=http://localhost:3000
```

### 4. Run the App
Start the development server (this starts both the Vite frontend and the Express backend concurrently):
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## ☁️ Deployment

The application runs a unified Full-Stack Node.js architecture (Express + Vite). It is highly recommended to deploy this project as a **Web Service** on platforms like **Render**, **Railway**, or **Fly.io** rather than static hosting platforms like Vercel.

**Render Deployment Steps:**
1. Create a new Web Service on Render and link your GitHub repository.
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. Add all the variables from your `.env` file to the Environment Variables section in Render.
5. Update your `APP_URL` environment variable to your new Render domain (e.g., `https://fitmetric.onrender.com`).
6. Update your Strava API settings "Authorization Callback Domain" to match your Render domain.

---
*Built with passion to make fitness tracking smarter, not harder.*
