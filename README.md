# 🧺 E-Press Laundry - Complete Setup Guide

> **A modern e-laundry management system** with cross-platform mobile app (iOS, Android, Web) and powerful backend API.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Backend Setup (Step-by-Step)](#backend-setup-step-by-step)
4. [Mobile App Setup (Step-by-Step)](#mobile-app-setup-step-by-step)
5. [Running the Application](#running-the-application)
6. [Testing & Usage](#testing--usage)
7. [Project Structure](#project-structure)
8. [Common Issues & Solutions](#common-issues--solutions)

---

## 🎯 Prerequisites

Before you begin, make sure you have these installed on your computer:

### Required Software

| Software | Version | Download Link | Check Installation |
|----------|---------|---------------|-------------------|
| **Node.js** | 18.x or higher | [nodejs.org](https://nodejs.org) | Run: `node --version` |
| **npm** | 9.x or higher | (comes with Node.js) | Run: `npm --version` |
| **PostgreSQL** | 14.x or higher | [postgresql.org](https://www.postgresql.org/download/) | Run: `psql --version` |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | Run: `git --version` |

### Optional (Recommended)

- **Expo Go App** - Install on your phone from [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **VS Code** - Recommended code editor: [code.visualstudio.com](https://code.visualstudio.com/)
- **Postman** - For API testing: [postman.com](https://www.postman.com/)

---

## 📁 Project Overview

```
📦 e-press/
├── 📂 backend/           ← Node.js API Server
│   ├── 📂 database/      ← PostgreSQL schema & connection
│   ├── 📂 routes/        ← API endpoints (8 files)
│   ├── 📂 services/      ← Business logic (6 files)
│   ├── 📂 middleware/    ← Authentication
│   ├── 📄 server.js      ← Main server file
│   ├── 📄 package.json   ← Backend dependencies
│   └── 📄 .env.example   ← Environment variables template
│
└── 📂 mobile/            ← React Native Expo App
    ├── 📂 src/
    │   ├── 📂 screens/   ← UI screens (12+ files)
    │   ├── 📂 navigation/← App navigation (4 files)
    │   ├── 📂 services/  ← API client
    │   ├── 📂 context/   ← Global state
    │   ├── 📂 theme/     ← Design system
    │   └── 📂 config/    ← Configuration
    ├── 📄 App.js         ← Main app entry point
    └── 📄 package.json   ← Mobile dependencies
```

**Total Project Size**: ~50 files, ~15,000 lines of code

---

## 🔧 Backend Setup (Step-by-Step)

### Step 1: Navigate to Backend Folder

Open your terminal (PowerShell on Windows) and navigate to the backend directory:

```powershell
# Navigate to your project
cd C:\Users\user\OneDrive\Documents\e-press

# Enter backend folder
cd backend

# Verify you're in the right place (should show: backend)
pwd
```

### Step 2: Create PostgreSQL Database

Open a **new terminal window** and run:

```powershell
# Connect to PostgreSQL (you may be prompted for password)
psql -U postgres

# Once connected, create the database
CREATE DATABASE epress_laundry;

# Verify it was created
\l

# Exit PostgreSQL
\q
```

**Troubleshooting:**
- If `psql` command is not found, add PostgreSQL to your PATH environment variable
- Default PostgreSQL password is often empty or `postgres`
- On Windows, you might need to use: `"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres`

### Step 3: Initialize Database with Schema

Still in the `backend` folder, run:

```powershell
# Import the database schema (creates all tables)
psql -U postgres -d epress_laundry -f database/schema.sql
```

**What this does:**
- Creates 9 database tables (users, orders, categories, locations, etc.)
- Inserts 15 clothing categories with pricing
- Creates a demo admin account
- Sets up indexes for performance

**Verify it worked:**
```powershell
# Connect to the database
psql -U postgres -d epress_laundry

# List all tables (should show 9 tables)
\dt

# Exit
\q
```

### Step 4: Configure Environment Variables

```powershell
# Copy the example environment file
copy .env.example .env

# Now open .env in a text editor (Notepad, VS Code, etc.)
notepad .env
```

**Edit the `.env` file** with your database settings:

```env
# Environment Configuration
NODE_ENV=development
PORT=5000

# Database Configuration - UPDATE THESE!
DB_HOST=localhost
DB_PORT=5432
DB_NAME=epress_laundry
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE

# JWT Secret (keep this secret!)
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345

# Socket.io Configuration
SOCKET_PORT=5001

# File Upload
MAX_FILE_SIZE=5242880

# Business Configuration (your laundry facility location)
LAUNDRY_LAT=0.0
LAUNDRY_LNG=0.0
```

**Save the file** and close the editor.

### Step 5: Install Backend Dependencies

```powershell
# Make sure you're still in the backend folder
pwd  # Should show: .../e-press/backend

# Install all Node.js packages (this may take 2-3 minutes)
npm install
```

**Expected output:**
- Should install ~100+ packages
- You'll see progress bars
- Might show some warnings (usually safe to ignore)

### Step 6: Start the Backend Server

```powershell
# Start the development server
npm run dev
```

**Expected output:**
```
╔═══════════════════════════════════════════╗
║   🧺 E-Press Laundry API Server          ║
║                                           ║
║   🚀 Server running on port 5000         ║
║   🌍 Environment: development            ║
║   📡 Socket.io ready for real-time       ║
╚═══════════════════════════════════════════╝
✅ Database connected successfully
```

**Test it works:**
- Open browser and go to: `http://161.97.66.69/api/` (production)
- You should see JSON with API information

**Keep this terminal window open!** The server needs to stay running.

---

## 📱 Mobile App Setup (Step-by-Step)

### Step 1: Open a NEW Terminal Window

**Important:** Don't close the backend terminal! Open a **new** terminal window.

```powershell
# Navigate to the mobile folder
cd C:\Users\user\OneDrive\Documents\e-press\mobile

# Verify you're in the right place
pwd  # Should show: .../e-press/mobile
```

### Step 2: Install Mobile Dependencies

```powershell
# Install all React Native packages (this may take 5-10 minutes)
npm install
```

**Expected output:**
- Installation of ~700+ packages
- May see deprecation warnings (normal)
- Total download size: ~300-400 MB

**Common Error:**
If you get a PowerShell execution policy error:
```powershell
# Run this first, then try npm install again
powershell -ExecutionPolicy Bypass -Command "npm install"
```

### Step 3: Start Expo Development Server

```powershell
# Start the Expo development server
npm start
```

**Expected output:**
```
Starting Metro Bundler
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

A **QR code** will appear in your terminal!

---

## 🚀 Running the Application

You now have **TWO terminals running**:
1. **Terminal 1**: Backend server (port 5000)
2. **Terminal 2**: Expo development server (port 8081)

### Option 1: Run on Your Phone (Easiest!)

**For Android:**
1. Install **Expo Go** from Play Store
2. Open Expo Go app
3. Tap **"Scan QR Code"**
4. Scan the QR code from your terminal
5. App will download and launch!

**For iPhone:**
1. Install **Expo Go** from App Store
2. Open your Camera app
3. Point at the QR code
4. Tap the notification that appears
5. App will open in Expo Go!

### Option 2: Run in Web Browser

In the Expo terminal, press `w`

Your default browser will open with the app running at: `http://localhost:8081`

### Option 3: Run on Android Emulator (Advanced)

**Only if you have Android Studio installed:**

In the Expo terminal, press `a`

---

## 🧪 Testing & Usage

### Step 1: Test the Login Screen

The app should open to a beautiful login screen with:
- 🧺 Logo icon
- Email and password fields
- "Sign In" button
- "Sign Up" link

### Step 2: Login with Demo Account

Use these credentials:
- **Email:** `admin@epress.com`
- **Password:** `Admin@123`

Tap **"Sign In"**

### Step 3: Explore the App

After login, you'll see different interfaces based on role:

**Admin Dashboard** (you'll see this first):
- 📊 Dashboard tab - System statistics
- 📋 Orders tab - Manage all orders
- 👥 Users tab - Manage customers & drivers
- 👤 Profile tab - Your account

**Try creating a customer account:**
1. Logout from admin
2. Tap "Sign Up"
3. Fill in details
4. Select **"Customer"** role
5. Login with new account

**Customer Interface:**
- 🏠 Home - Browse services, create orders
- 📦 Orders - View order history
- 👤 Profile - Account settings

### Step 4: Test Creating an Order

1. From Customer Home, tap **"New Order"** button
2. **Step 1 - Items**: Select clothing (tap Shirt, Pants, etc.)
3. Adjust quantities with +/- buttons
4. **Step 2 - Locations**: Select pickup & delivery addresses
5. **Step 3 - Schedule**: 
   - Choose **"Pick Up Now"** for immediate pickup
   - OR choose **"Schedule Pickup"** and select date/time
6. **Step 4 - Review**: Check pricing and select payment (Cash/Airtel/Moov)
7. Tap **"Place Order"**!

---

## 📂 Project Structure (Detailed)

### Backend Files (`backend/`)

```
backend/
├── database/
│   ├── schema.sql           ← Database structure (15 clothing categories!)
│   └── db.js                ← PostgreSQL connection pool
│
├── routes/                  ← API Endpoints
│   ├── auth.routes.js       ← Login, register, verify token
│   ├── order.routes.js      ← Create, view, update orders
│   ├── category.routes.js   ← Get clothing categories
│   ├── driver.routes.js     ← Driver orders, location updates
│   ├── location.routes.js   ← Customer addresses
│   ├── payment.routes.js    ← Payment processing
│   ├── notification.routes.js ← Push notifications
│   ├── user.routes.js       ← User profile management
│   └── admin.routes.js      ← Admin statistics & management
│
├── services/                ← Business Logic
│   ├── auth.service.js      ← Authentication, JWT tokens
│   ├── order.service.js     ← Order creation, pricing, status
│   ├── category.service.js  ← Category management
│   ├── driver.service.js    ← Driver assignment, tracking
│   └── location.service.js  ← Address management
│
├── middleware/
│   └── auth.middleware.js   ← JWT verification, role checking
│
├── server.js                ← Main Express app + Socket.io
├── package.json             ← Dependencies list
├── .env.example             ← Environment template
└── .gitignore
```

### Mobile Files (`mobile/`)

```
mobile/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js      ← Beautiful login UI
│   │   │   └── RegisterScreen.js   ← Sign up with role selection
│   │   ├── customer/
│   │   │   ├── HomeScreen.js       ← Browse categories
│   │   │   ├── NewOrderScreen.js   ← 4-step order wizard ⭐
│   │   │   ├── OrdersScreen.js     ← Order history
│   │   │   └── ProfileScreen.js    ← User profile
│   │   ├── driver/
│   │   │   ├── DriverDashboardScreen.js  ← Driver stats
│   │   │   ├── DriverOrdersScreen.js     ← Assigned deliveries
│   │   │   └── DriverProfileScreen.js
│   │   └── admin/
│   │       ├── AdminDashboardScreen.js   ← System stats
│   │       ├── AdminOrdersScreen.js      ← All orders
│   │       ├── AdminUsersScreen.js       ← User management
│   │       └── AdminProfileScreen.js
│   │
│   ├── navigation/
│   │   ├── AuthNavigator.js        ← Login/Register navigation
│   │   ├── CustomerNavigator.js    ← Customer tabs + New Order
│   │   ├── DriverNavigator.js      ← Driver tabs
│   │   └── AdminNavigator.js       ← Admin tabs
│   │
│   ├── services/
│   │   └── api.js                  ← API client with auth tokens
│   │
│   ├── context/
│   │   └── AuthContext.js          ← Global authentication state
│   │
│   ├── theme/
│   │   └── theme.js                ← Colors, fonts, spacing
│   │
│   └── config/
│       └── icons.js                ← Icon mappings
│
├── App.js                          ← Main app entry, role routing
├── package.json                    ← Mobile dependencies
└── app.json                        ← Expo configuration
```

---

## ❗ Common Issues & Solutions

### Issue 1: "npm is not recognized"

**Problem:** Node.js not installed or not in PATH

**Solution:**
1. Download Node.js from [nodejs.org](https://nodejs.org)
2. Install with default settings
3. **Restart your terminal** after installation
4. Verify: `node --version` should show version number

---

### Issue 2: "psql is not recognized"

**Problem:** PostgreSQL not in PATH or not installed

**Solution (Windows):**
1. Find PostgreSQL installation (usually `C:\Program Files\PostgreSQL\14\bin`)
2. Add to PATH environment variable:
   - Search "Environment Variables" in Windows
   - Edit "Path" variable
   - Add PostgreSQL bin folder
3. **Restart terminal**

**Alternative:** Use full path:
```powershell
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres
```

---

### Issue 3: "Database connection failed"

**Problem:** Wrong credentials or PostgreSQL not running

**Solution:**
1. Check PostgreSQL is running:
   - Windows: Search "Services", find "postgresql", ensure it's running
2. Open `.env` file in backend folder
3. Verify `DB_USER` and `DB_PASSWORD` match your PostgreSQL credentials
4. Test connection:
   ```powershell
   psql -U postgres -d epress_laundry
   ```

---

### Issue 4: "Cannot find module 'express'"

**Problem:** Dependencies not installed

**Solution:**
```powershell
# Make sure you're in the backend folder
cd backend

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

---

### Issue 5: "Port 5000 already in use"

**Problem:** Another app using port 5000

**Solution:**
1. Find what's using the port:
   ```powershell
   netstat -ano | findstr :5000
   ```
2. Kill that process or change port in `.env`:
   ```env
   PORT=5001
   ```

---

### Issue 6: Expo QR code won't scan

**Problem:** Firewall or network issue

**Solutions:**
1. **Use tunnel mode:**
   ```powershell
   npx expo start --tunnel
   ```
2. **Use web instead:**
   - In Expo terminal, press `w`
   - Test in browser first

3. **Check firewall:**
   - Allow Node.js through Windows Firewall

---

### Issue 7: "Metro bundler has encountered an internal error"

**Problem:** Expo cache issue

**Solution:**
```powershell
# Clear Expo cache
npx expo start --clear

# Or reset everything
Remove-Item -Recurse -Force node_modules
npm install
npx expo start --clear
```

---

### Issue 8: App shows white/blank screen

**Problem:** JavaScript error or wrong API URL

**Solution:**
1. **Check backend is running** on port 5000
2. **Check terminal for errors** (red text)
3. **Update API URL** in `mobile/src/services/api.js`:
   ```javascript
const API_URL = 'http://161.97.66.69/api';
   ```
   Replace `YOUR_COMPUTER_IP` with your local IP (find with `ipconfig`)

---

## 🎓 Learning Resources

### Understanding the Architecture

**Backend (Node.js + Express):**
- Handles data storage and business logic
- Provides REST API endpoints
- Manages authentication with JWT tokens
- Real-time updates via Socket.io

**Mobile (React Native + Expo):**
- User interface for customers, drivers, and admins
- Calls backend API for data
- Works on iOS, Android, and Web from same code
- No need for Android Studio during development!

**Database (PostgreSQL):**
- Stores all data (users, orders, locations, etc.)
- 15 professional clothing categories pre-loaded
- Supports immediate and scheduled pickups

### Key Features Built

✅ Multi-role authentication (Customer, Driver, Admin)
✅ 15 clothing categories with pricing
✅ **Immediate OR Scheduled pickup** with date/time picker
✅ Order creation with cart
✅ Express service (+20% for 24h delivery)
✅ Payment options (Cash, Airtel Money, Moov Money - mocked)
✅ Real-time infrastructure ready (Socket.io)
✅ Location management
✅ Order tracking system

---

## 🔐 Security Notes

**Important for Production:**

1. **Change JWT Secret** in `.env`:
   ```env
   JWT_SECRET=use_a_very_long_random_string_here
   ```

2. **Never commit `.env`** file to Git (already in `.gitignore`)

3. **Use strong passwords** for PostgreSQL in production

4. **Enable HTTPS** when deploying to production

---

## 🙋 Getting Help

**If something doesn't work:**

1. **Check both terminals** are running (backend AND mobile)
2. **Read error messages carefully** - they often tell you what's wrong
3. **Verify all prerequisites** are installed
4. **Try the "Common Issues" section** above
5. **Restart both terminals** and try again

**Error Message Examples:**

```
❌ "ECONNREFUSED" → Backend not running, start it!
❌ "401 Unauthorized" → Login again, token expired
❌ "Cannot find module" → Run npm install
❌ "Port already in use" → Change port or kill process
```

---

## 🎉 Success Checklist

You're ready to go when:

- [ ] Backend terminal shows "✅ Database connected successfully"
- [ ] Expo terminal shows QR code
- [ ] Can login with `admin@epress.com` / `Admin@123`
- [ ] Can browse clothing categories on Home screen
- [ ] Can create test orders
- [ ] Can register new customer accounts

---

## 📚 What's Next?

**Features Ready to Build:**
- 🗺️ Map integration with MapLibre GL (free, no API costs!)
- 📸 Photo upload for order confirmation
- 🔔 Real-time push notifications
- ⭐ Rating and review system
- 📊 Advanced analytics dashboard
- 🚚 Driver route optimization

**The foundation is solid - now customize and extend!** 🚀

---

**Made with ❤️ for easy laundry management**

Questions? Check the [implementation_plan.md](file:///C:/Users/user/.gemini/antigravity/brain/70b9d494-6d71-44f4-8a07-3e1b99534f09/implementation_plan.md) and [walkthrough.md](file:///C:/Users/user/.gemini/antigravity/brain/70b9d494-6d71-44f4-8a07-3e1b99534f09/walkthrough.md) for more details!
