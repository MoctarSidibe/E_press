# Quick Fix Guide for Network Error

## The Problem
`Network Error` when loading categories means the mobile app can't connect to the backend server.

## Solution - Start Backend Server

### Step 1: Open Terminal/Command Prompt
Navigate to backend folder:
```bash
cd c:\Users\user\OneDrive\Documents\e-press\backend
```

### Step 2: Start the Server
```bash
npm start
```

### Step 3: Verify Server is Running
You should see:
```
╔═══════════════════════════════════════════╗
║   🧺 E-Press Laundry API Server          ║
║   🚀 Server running on port 5000         ║
║   📡 Socket.io ready for real-time       ║
╚═══════════════════════════════════════════╝
```

### Step 4: Check Your IP Address

**Find your computer's IP:**

Windows:
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.65)

Mac/Linux:
```bash
ifconfig
```

### Step 5: Update Mobile App IP (if needed)

Edit these files with YOUR actual IP:

**File 1:** `mobile/src/services/api.js`
```javascript
const API_URL = 'http://161.97.66.69/api'  // Production API
```

**File 2:** `mobile/src/services/socket.js`
```javascript
const SOCKET_URL = 'http://161.97.66.69'   // Production API
```

### Step 6: Reload Mobile App
In Expo terminal, press `r` to reload

---

## Quick Test
Once backend is running, try logging in again. Categories should load!

## Still Not Working?

1. **Check firewall** - Allow port 5000
2. **Same WiFi** - Phone and computer must be on same network
3. **Check backend logs** - Look for errors in terminal
4. **Try localhost on emulator** - Use `10.0.2.2:5000` if using Android emulator

---

**The useRef error is now fixed! Just need to start the backend server.** 🚀
