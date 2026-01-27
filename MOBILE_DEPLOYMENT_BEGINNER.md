# 📱 Beginner's Mobile App Build Guide (Phase 6)

This guide using **EAS Build** (Expo Application Services).
**This runs in the cloud**, so you do **NOT** need Android Studio or a powerful computer.

## ✅ Prerequisites
1.  **Expo Account**: Sign up at [expo.dev](https://expo.dev/signup) (Free).
2.  **Node.js**: You already have this installed.
3.  **Backend Online**: Your API must be running on Contabo.

---

## 🔗 Step 1: Connect App to Online Server

**Where to run this:** On your **LOCAL** computer (VS Code).

1.  **Set API URL for production (recommended):**
    *   Open `mobile/eas.json`.
    *   Ensure production profile includes:
    ```json
    "env": {
      "EXPO_PUBLIC_API_URL": "http://161.97.66.69/api"
    }
    ```
    *(Don't use localhost!)*

2.  **Optional (dev only):**
    *   You can set `EXPO_PUBLIC_DEV_API_URL` for local testing.

---

## ☁️ Step 2: Setup EAS (One Time Only)

**Where to run this:** On your **LOCAL** computer (VS Code terminal).

1.  **Instal EAS CLI:**
    ```powershell
    npm install -g eas-cli
    ```

2.  **Login to Expo:**
    ```powershell
    eas login
    ```
    *   Enter your Email and Password from step 1.

3.  **Configure the Project:**
    ```powershell
    cd mobile
    eas build:configure
    ```
    *   Select **Android**.
    *   This will create a file named `eas.json`.

---

## 🚀 Step 3: Build the APK

**Where to run this:** On your **LOCAL** computer (VS Code terminal inside `mobile` folder).

1.  **Run the Build Command:**
    ```powershell
    eas build -p android --profile production
    ```
    *   This will create an **APK** you can install directly.

2.  **Answer the Questions:**
    *   "Generate a new Android Keystore?" -> **Yes (Y)** to everything.

3.  **Wait:**
    *   It will upload your code and wait in a queue.
    *   **It might take 10-20 minutes.**
    *   You can close the terminal if you want; the build happens online.

---

## 📲 Step 4: Download & Install

1.  **Get the Link:**
    *   When finished, the terminal will show a link: `https://expo.dev/artifacts/...`
    *   Or check your dashboard at [expo.dev](https://expo.dev).

2.  **Install on Phone:**
    *   Open that link on your Android phone.
    *   Download the APK.
    *   Install it! 
    *   (You might need to allow "Install from Unknown Sources").

**🎉 Done! You have a working App.**
