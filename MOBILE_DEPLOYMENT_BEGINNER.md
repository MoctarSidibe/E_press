# 📱 Beginner's Mobile App Build Guide (Phase 6)

This guide explains how to create the `.apk` file for Android phones.

## ✅ Prerequisites
1.  **Android Studio** installed and setup (or at least the Android SDK).
2.  **Java/JDK** installed.
3.  **Backend must be running** online.

---

## 🔗 Step 1: Connect App to Online Server

**Where to run this:** On your **LOCAL** computer (VS Code).

1.  **Open the API file:**
    *   Navigate to `mobile/src/services/api.js` (or `api.ts` / `config.js` - check your project structure).
2.  **Update the Base URL:**
    Find the line with `localhost` or similar and change it to your Contabo IP.

    ```javascript
    // BEFORE:
    // const API_URL = "http://10.0.2.2:5000"; 
    
    // AFTER:
    const API_URL = "http://YOUR_CONTABO_IP/api"; 
    ```
    *Make sure to include the `/api` at the end if that's how your backend expects it (as configured in Nginx).*

---

## 📦 Step 2: Build the APK

**Where to run this:** On your **LOCAL** computer (VS Code terminal).

1.  **Open Terminal and go to android folder:**
    ```powershell
    cd mobile
    cd android
    ```

2.  **Clean previous builds (Optional but recommended):**
    ```powershell
    ./gradlew clean
    ```

3.  **Build the Release APK:**
    ```powershell
    ./gradlew assembleRelease
    ```
    *   *This process might take 5-10 minutes.*
    *   *If you get errors, often it's related to Java version or missing SDK location.*

---

## 🚀 Step 3: Find and Install

1.  **Locate the file:**
    It will be created here:
    `mobile/android/app/build/outputs/apk/release/app-release.apk`

2.  **Transfer to Phone:**
    *   Send this file to yourself (WhatsApp, Google Drive, USB).
    *   Install it on your Android phone.

3.  **Test:**
    *   Open the app.
    *   Try to login. It should connect to your Contabo server!
