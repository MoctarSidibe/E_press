# 📘 Beginner's Backend Deployment Guide (Phase 3)

This guide is designed for absolute beginners. We will deploy the Node.js backend to your Contabo VPS.

## ✅ Prerequisites
Before you start, make sure you have:
1.  **VPS IP Address**: (e.g., `123.45.67.89`) - Check your Contabo email.
2.  **VPS Password**: (Usually the `root` password) - Check your Contabo email.
3.  **Terminal**: PowerShell (Windows) or Terminal (Mac/Linux).

---

## 🚀 Step 1: Connect to Your Server

**Where to run this:** On your **LOCAL** computer (your laptop/PC).

1.  Open **PowerShell** or **Command Prompt**.
2.  Type the following command (replace `YOUR_IP` with your actual IP):
    ```powershell
    ssh root@123.45.67.89
    ```
3.  Press **Enter**.
4.  If asked `Are you sure you want to continue connecting?`, type `yes` and press **Enter**.
5.  Type your **Password** when prompted.
    *   *Note: You will NOT see the characters as you type. This is normal security.*
    *   Press **Enter** after typing the password.

**Result:** You should see a welcome message like `Welcome to Ubuntu...`. You are now inside your server!

---

## 🛠️ Step 2: Prepare the Server (One-time Setup)

**Where to run this:** On the **SERVER** (in the SSH window).

Copy and paste these commands one by one. To paste in the terminal, usually **Right-Click** works.

1.  **Update the System:**
    ```bash
    apt update
    apt upgrade -y
    ```
    *(Wait for it to finish)*

2.  **Install Node.js (The engine for your backend):**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    ```

3.  **Install Essential Tools (Git, PM2, Nginx):**
    ```bash
    apt install -y git nginx
    npm install -g pm2
    ```

---

## 📂 Step 3: Download Your Code

**Where to run this:** On the **SERVER**.

1.  **Go to the home directory:**
    ```bash
    cd ~
    ```

2.  **Clone your repository:**
    ```bash
    git clone https://github.com/MoctarSidibe/E_press.git
    ```

3.  **Go into the backend folder:**
    ```bash
    cd E_press/backend
    ```
    *Note: If the folder name is different (e.g., `e-press` vs `E_press`), type `ls` to list folders and check.*

---

## ⚙️ Step 4: Configure the Backend

**Where to run this:** On the **SERVER** (inside `~/E_press/backend`).

1.  **Install project dependencies:**
    ```bash
    npm install
    ```

2.  **Create the configuration file (.env):**
    We use a text editor called `nano`.
    ```bash
    nano .env
    ```

3.  **Paste your configuration:**
    Copy the text below, modify the values, and right-click to paste into the black window.
    ```env
    PORT=5000
    MONGO_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster... (Your REAL MongoDB connection string)
    JWT_SECRET=super_secret_key_123
    ```

4.  **Save and Exit:**
    *   Press `Ctrl + O` (Control and letter O) then **Enter** to save.
    *   Press `Ctrl + X` to exit.

---

## ▶️ Step 5: Start the Backend with PM2

PM2 ensures your app keeps running even if you close the window.

**Where to run this:** On the **SERVER** (inside `~/E_press/backend`).

1.  **Start the server:**
    ```bash
    pm2 start server.js --name "epress-api"
    ```

2.  **Save the process list (so it restarts after reboot):**
    ```bash
    pm2 save
    pm2 startup
    ```
    *(If `pm2 startup` gives you a command to run, copy and run that command).*

3.  **Check if it's running:**
    ```bash
    pm2 status
    ```
    You should see `epress-api` with status `online`.

---

## 🌐 Step 6: Make it Public (Nginx Setup)

We need to tell the web server (Nginx) to send traffic to your Node.js app.

**Where to run this:** On the **SERVER**.

1.  **Open the Nginx config file:**
    ```bash
    nano /etc/nginx/sites-available/default
    ```

2.  **Delete everything** (hold `Ctrl + K` or use arrow keys and delete).

3.  **Paste this configuration:**
    ```nginx
    server {
        listen 80;
        server_name _; 

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

4.  **Save and Exit:**
    *   `Ctrl + O`, **Enter**.
    *   `Ctrl + X`.

5.  **Test the configuration:**
    ```bash
    nginx -t
    ```
    *You should see "syntax is ok" and "test is successful".*

6.  **Restart Nginx:**
    ```bash
    systemctl restart nginx
    ```

---

## 🎯 Verification

1.  Open your browser.
2.  Go to: `http://YOUR_CONTABO_IP/api/` (e.g., `http://123.45.67.89/api/`).
3.  You should see a message from your API (like "API Running" or a 404/JSON response depending on your code).

**🎉 Congratulations! Your Backend is Live.**
