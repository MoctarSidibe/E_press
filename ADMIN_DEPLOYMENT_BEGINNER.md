# 💻 Beginner's Admin Panel Deployment Guide (Phase 4 & 5)

This guide shows you how to put your Admin Website online.

## ✅ Prerequisites
1.  **Backend must be running** (Follow `BACKEND_DEPLOYMENT_BEGINNER.md` first).
2.  **FileZilla Client** installed on your computer (for transferring files).

---

## 🛠️ Step 1: Build the Admin Panel

**Where to run this:** On your **LOCAL** computer (VS Code terminal).

1.  **Open your project in VS Code.**
2.  **Open the terminal** (`Ctrl + ` `).
3.  **Go to the admin folder:**
    ```powershell
    cd admin-panel
    ```
4.  **Create the production configuration:**
    *   Create a new file inside `admin-panel` named `.env.production`.
    *   Add this line:
        ```env
        VITE_API_URL=http://161.97.66.69/api
        ```
5.  **Build the project:**
    ```powershell
    npm install
    npm run build
    ```
    *   This will create a `dist` folder. This folder contains your website!

---

## 📤 Step 2: Upload to Server

We will use **FileZilla** to move the `dist` folder to your server.

1.  **Open FileZilla.**
2.  **Connect:**
    *   **Host:** `sftp://161.97.66.69`
    *   **Username:** `root`
    *   **Password:** Your VPS password.
    *   **Port:** 22 (or leave empty).
    *   Click **Quickconnect**.
3.  **Navigate on the Server (Right Side):**
    *   In "Remote site", type: `/var/www/` and press Enter.
    *   Right-click in the empty space -> **Create directory**.
    *   Name it: `epress-admin`.
    *   Double-click `epress-admin` to enter it.
4.  **Upload Files (Left Side):**
    *   Navigate to your project folder -> `admin-panel` -> `dist`.
    *   Select **ALL files** inside `dist` (index.html, assets folder, etc.).
    *   **Drag them** to the Right Side (Server).

---

## 🌐 Step 3: Configure Nginx (Update)

We need to update Nginx to show the website AND the API.

**Where to run this:** On the **SERVER** (SSH).

1.  **Open the config:**
    ```bash
    nano /etc/nginx/sites-available/default
    ```

2.  **Replace EVERYTHING with this final configuration:**
    *(This handles both the Website and the Backend)*

    ```nginx
    server {
        listen 80;
        server_name _; 

        # 1. The Admin Website
        location / {
            root /var/www/epress-admin;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # 2. The Backend API
        location /api/ {
            proxy_pass http://localhost:5000/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **Save and Exit:**
    *   `Ctrl + O`, **Enter**.
    *   `Ctrl + X`.

4.  **Restart Nginx:**
    ```bash
    systemctl restart nginx
    ```

## 🎯 Verification
1.  Go to `http://161.97.66.69/` -> You should see the **Admin Login**.
2.  Go to `http://161.97.66.69/api/` -> You should see the **API message**.

**🎉 Admin Panel is Live!**
