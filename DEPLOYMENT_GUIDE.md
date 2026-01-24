# 🚀 E-Press Deployment Guide (Contabo Edition)

This guide will walk you through deploying your E-Press system online using **Contabo** as your VPS provider. Contabo is known for offering high-performance servers at very affordable prices.

## 🏗️ Architecture Overview

1.  **Database**: **MongoDB Atlas** (Cloud Database). Best for reliability and backups.
2.  **Backend & Admin**: **Contabo VPS** running Ubuntu. Managed via PM2 and Nginx.
3.  **Mobile App**: Distributed as an `.apk` file for Android.

---

## Phase 1: The Database (MongoDB Atlas)

*Note: You can host Mongo on Contabo, but Atlas is recommended for ease of management and backups.*

1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up (Free).
2.  Create a new **Cluster** (Free Tier M0).
3.  **Create a Database User**:
    *   Go to "Database Access" -> Add New Database User.
    *   Username: `admin`, Password: `YOUR_SECURE_PASSWORD`.
    *   Role: "Read and write to any database".
4.  **Network Access**:
    *   Go to "Network Access" -> Add IP Address.
    *   Select "Allow Access from Anywhere" (`0.0.0.0/0`) initially.
5.  **Get Connection String**:
    *   Click "Connect" -> "Drivers" -> "Node.js".
    *   Copy the string: `mongodb+srv://admin:<password>@cluster0...`
    *   **Save this string**.

---

## Phase 2: Server Setup (Contabo)

### Step 1: Purchase the VPS
1.  Go to [Contabo.com](https://contabo.com).
2.  Select **"Cloud VPS S"** (Usually ~$6-8/mo). This is powerful enough for your backend, admin panel, and database if needed.
3.  **Configuration**:
    *   **Term**: 1 Month (or more).
    *   **Region**: European Union (Germany) is usually cheapest, or choose US if your users are there.
    *   **Image (OS)**: **Ubuntu 22.04 LTS** (Recommended) or 24.04.
4.  Complete the purchase. You will receive an email with your **IP Address** and **VNC/SSH Password** (usually "Root Password").

### Step 2: Connect to Server
1.  Open your terminal (PowerShell or Command Prompt on Windows).
2.  Run:
    ```bash
    ssh root@YOUR_CONTABO_IP
    ```
3.  Type `yes` if asked to confirm fingerprint.
4.  Enter the password from the email.

### Step 3: Server Preparation
Run these commands to prepare the environment:
```bash
# 1. Update the system
apt update && apt upgrade -y

# 2. Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Install Git, Nginx (Web Server), and PM2 (Process Manager)
apt install -y git nginx
npm install -g pm2
```

---

## Phase 3: Deploy Backend

> **👶 BEGINNER GUIDE AVALIABLE**
> If you want a detailed, step-by-step tutorial for this phase, read: [**BACKEND_DEPLOYMENT_BEGINNER.md**](./BACKEND_DEPLOYMENT_BEGINNER.md)

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/MoctarSidibe/E_press.git
    cd E_press/backend
    ```
    *(Note: if you just pushed to `MoctarSidibe/E_press`, use that URL)*

2.  **Install Config**:
    ```bash
    npm install
    nano .env
    ```
    Paste your config:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=complex_secret_key
    ```
    (Save: `Ctrl+X`, `Y`, `Enter`)

3.  **Start API**:
    ```bash
    pm2 start server.js --name "epress-api"
    pm2 save
    pm2 startup
    ```

---

## Phase 4: Deploy Admin Panel

> **👶 BEGINNER GUIDE AVALIABLE**
> detailed steps here: [**ADMIN_DEPLOYMENT_BEGINNER.md**](./ADMIN_DEPLOYMENT_BEGINNER.md)

Since you have a powerful Contabo VPS, you can host the Admin Panel right there!

1.  **Build locally (on your PC)**:
    ```bash
    cd admin-panel
    # Make sure .env.production exists or set generic API URL
    # echo "VITE_API_URL=http://YOUR_CONTABO_IP/api" > .env.production
    npm run build
    ```
2.  **Upload to Server**:
    Use FileZilla (SFTP) to upload the `dist` folder to your server, e.g., to `/var/www/epress-admin`.
    
    *Alternatively, build on server (if usage allows)*:
    ```bash
    cd ../admin-panel
    npm install
    # Create .env.production with VITE_API_URL=http://YOUR_CONTABO_IP/api
    npm run build
    mkdir -p /var/www/epress-admin
    cp -r dist/* /var/www/epress-admin
    ```

---

## Phase 5: Configure Nginx (The Traffic Controller)

> **Note:** The [**ADMIN_DEPLOYMENT_BEGINNER.md**](./ADMIN_DEPLOYMENT_BEGINNER.md) includes the full Nginx configuration for both Admin and Backend!

We will configure Nginx to serve the Admin Panel AND the API on the same IP.

1.  **Edit Config**:
    ```bash
    nano /etc/nginx/sites-available/default
    ```
2.  **Replace content with this**:
    ```nginx
    server {
        listen 80;
        server_name _; # Or your domain.com

        # 1. Serve Admin Panel (Frontend)
        location / {
            root /var/www/epress-admin;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # 2. Proxy to Backend API
        location /api/ {
            proxy_pass http://localhost:5000/; # Note the trailing slash
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
3.  **Restart Nginx**:
    ```bash
    systemctl restart nginx
    ```

🎉 **Access enabled**:
*   **Admin Panel**: `http://YOUR_CONTABO_IP/`
*   **API**: `http://YOUR_CONTABO_IP/api/`

---

## Phase 6: Mobile App

> **👶 BEGINNER GUIDE AVALIABLE**
> Step-by-step APK building guide: [**MOBILE_DEPLOYMENT_BEGINNER.md**](./MOBILE_DEPLOYMENT_BEGINNER.md)

1.  **Update API URL**:
    *   File: `mobile/src/services/api.js`
    *   Change URL to: `http://YOUR_CONTABO_IP/api`
    *   *(Make sure to use your real IP)*

2.  **Build APK**:
    ```bash
    cd mobile
    cd android
    ./gradlew assembleRelease
    ```
3.  **Distribute**:
    *   File is in `mobile/android/app/build/outputs/apk/release/`.
    *   Send key to drivers.
