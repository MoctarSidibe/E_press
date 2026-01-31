# 🔄 Complete Server Redeployment Guide

**Use this guide when you reinstall your server or need to deploy from scratch.**

**Server:** `161.97.66.69` | **API:** `http://161.97.66.69/api` | **Admin:** `http://161.97.66.69/`

---

## ✅ Checklist Overview

| Step | Task | Est. Time |
|------|------|-----------|
| 1 | Connect & prepare server (Node, PostgreSQL, Git, Nginx, PM2) | 10 min |
| 2 | Clone repo & install backend | 5 min |
| 3 | Create database & load schema | 5 min |
| 4 | Configure .env | 2 min |
| 5 | Add cleaner role & create admin | 3 min |
| 6 | Start backend with PM2 | 1 min |
| 7 | Configure Nginx | 3 min |
| 8 | Build & deploy admin panel | 5 min |
| 9 | Verify everything works | 2 min |

---

## Step 1: Connect & Prepare Server

**On your LOCAL machine:**
```bash
ssh root@161.97.66.69
```

**On the SERVER (run each block):**

```bash
# Update system
apt update
apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql

# Install Git, Nginx, PM2
apt install -y git nginx
npm install -g pm2
```

---

## Step 2: Create Database & User

```bash
sudo -u postgres psql
```

In the PostgreSQL prompt:
```sql
CREATE DATABASE epress_laundry;
CREATE USER epress_user WITH ENCRYPTED PASSWORD 'elitebookk';
GRANT ALL PRIVILEGES ON DATABASE epress_laundry TO epress_user;
\q
```

---

## Step 3: Clone Repo & Load Schema

```bash
cd ~
git clone https://github.com/MoctarSidibe/E_press.git
cd E_press/backend
```

**Load database schema:**
```bash
sudo cp ~/E_press/backend/database/schema.sql /tmp/schema.sql
sudo chown postgres:postgres /tmp/schema.sql
sudo -u postgres psql -d epress_laundry -f /tmp/schema.sql
```

**Grant table permissions to epress_user:**
```bash
sudo -u postgres psql -d epress_laundry -c "
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO epress_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO epress_user;
GRANT USAGE ON SCHEMA public TO epress_user;
"
```

---

## Step 4: Configure Backend .env

```bash
cd ~/E_press/backend
npm install
nano .env
```

**Paste this (update password if you changed it):**
```env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=epress_laundry
DB_USER=epress_user
DB_PASSWORD=elitebookk
JWT_SECRET=super_secret_key_change_in_production_123
ALLOWED_ORIGINS=http://161.97.66.69,http://localhost:5173
TRUST_PROXY=1
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

---

## Step 5: Add Cleaner Role & Create Admin

```bash
cd ~/E_press/backend
node scripts/add_cleaner_role.js
node seed_admin.js
```

**Default admin credentials:**
- **Email:** `admin@epress.com`
- **Password:** `Admin@123`

*(Change password after first login!)*

---

## Step 6: Start Backend with PM2

```bash
cd ~/E_press/backend
pm2 start server.js --name "epress-api"
pm2 save
pm2 startup
```

*(If `pm2 startup` gives you a command, run it.)*

```bash
pm2 status
```

You should see `epress-api` with status **online**.

---

## Step 7: Configure Nginx

```bash
nano /etc/nginx/sites-available/default
```

**Replace everything with:**
```nginx
server {
    listen 80;
    server_name _;

    # Health check (before location / so it's not caught by admin)
    location = /health {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Backend API (NO trailing slash on proxy_pass - important!)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin Panel (must be last)
    location / {
        root /var/www/epress-admin;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

**Save:** `Ctrl+O`, Enter, `Ctrl+X`

```bash
nginx -t
systemctl restart nginx
```

---

## Step 8: Deploy Admin Panel

**Option A – Build on server:**
```bash
cd ~/E_press/admin-panel
echo "VITE_API_URL=http://161.97.66.69/api" > .env.production
npm install
npm run build
mkdir -p /var/www/epress-admin
cp -r dist/* /var/www/epress-admin
```

**Option B – Build locally and upload:**
1. On your PC: `cd admin-panel`, create `.env.production` with `VITE_API_URL=http://161.97.66.69/api`
2. Run `npm run build`
3. Use FileZilla (SFTP) to upload contents of `dist/` to `/var/www/epress-admin/`

---

## Step 9: Verify

| URL | Expected |
|-----|----------|
| http://161.97.66.69/health | `{"status":"ok",...}` |
| http://161.97.66.69/api | JSON with endpoints |
| http://161.97.66.69/ | Admin login page |
| Login: admin@epress.com / Admin@123 | Admin dashboard |

**Test from PowerShell (local):**
```powershell
Invoke-WebRequest -Uri "http://161.97.66.69/health" -UseBasicParsing | Select-Object -ExpandProperty Content
Invoke-WebRequest -Uri "http://161.97.66.69/api" -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 🔧 Updating After Code Changes

```bash
ssh root@161.97.66.69
cd ~/E_press
git pull
cd backend
npm install
pm2 restart epress-api
```

If schema or roles changed:
```bash
# Re-run schema (careful: may reset data!)
# sudo -u postgres psql -d epress_laundry -f /tmp/schema.sql
node scripts/add_cleaner_role.js
```

For admin panel updates: rebuild and re-upload `dist/` to `/var/www/epress-admin/`.

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| 502 Bad Gateway | Check `pm2 status`, `pm2 logs epress-api` |
| Database connection failed | Verify .env, PostgreSQL running, user permissions |
| Admin shows 404 | Ensure `/var/www/epress-admin` has index.html |
| Cleaner registration fails | Run `node scripts/add_cleaner_role.js` |
| CORS errors | Check ALLOWED_ORIGINS in .env |

---

**🎉 Server redeployment complete!**
