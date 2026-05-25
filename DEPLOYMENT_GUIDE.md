# E-Press Deployment Guide (Contabo Edition)

> **Fresh server?** Use [**SERVER_REDEPLOYMENT.md**](./SERVER_REDEPLOYMENT.md) for a complete step-by-step redeploy.

This guide covers deploying the full E-Press system: backend API, admin panel, and mobile app. The stack includes the loyalty/points system, coupon management, guest browsing, and the full French barème pricing.

---

## Architecture Overview

| Component | Where | Tech |
|-----------|-------|------|
| Database | Contabo VPS or managed | PostgreSQL |
| Backend API | Contabo VPS | Node.js + Express + PM2 |
| Admin Panel | Contabo VPS | React Admin (Vite) + Nginx |
| Mobile App | Android devices | Expo (APK) |

---

## Phase 1: The Database (PostgreSQL)

### Option A: Managed PostgreSQL (Recommended)
Create a PostgreSQL database on Neon, Supabase, or Railway. Save the connection details:
- Host, Port (5432), Database name, User, Password

### Option B: PostgreSQL on your VPS
```bash
apt install -y postgresql
sudo -u postgres psql
```
```sql
CREATE DATABASE epress_laundry;
CREATE USER epress_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE epress_laundry TO epress_user;
\q
```

### Run Migrations (in order)
After connecting to the DB, run each migration file in `backend/database/migrations/`:

```bash
cd /root/E_press/backend
psql $DATABASE_URL -f database/migrations/001_add_qr_tracking.sql
psql $DATABASE_URL -f database/migrations/002_add_order_columns.sql
psql $DATABASE_URL -f database/migrations/003_update_categories.sql
psql $DATABASE_URL -f database/migrations/004_remove_categories.sql
psql $DATABASE_URL -f database/migrations/005_add_cleaner_tracking.sql
psql $DATABASE_URL -f database/migrations/006_add_notifications.sql
psql $DATABASE_URL -f database/migrations/007_add_loyalty_system.sql
psql $DATABASE_URL -f database/migrations/008_update_categories_bareme.sql
```

> **Migration 007** adds: `card_number`, `points_balance`, `points_earned_total` to users; creates `points_config`, `points_transactions`, `coupons` tables.
>
> **Migration 008** deletes all old categories and inserts the **26 official barème items** in French with correct FCFA prices (stored as FCFA/100 — e.g. 4000 Fcfa → 40.00 in DB).

---

## Phase 2: Server Setup (Contabo)

### Step 1: Purchase the VPS
- Go to [Contabo.com](https://contabo.com) → Cloud VPS S (~$6-8/mo)
- OS: **Ubuntu 22.04 LTS**

### Step 2: Connect
```bash
ssh root@161.97.66.69
```

### Step 3: Prepare Server
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx
npm install -g pm2
```

---

## Phase 3: Deploy Backend

```bash
git clone https://github.com/MoctarSidibe/E_press.git
cd E_press/backend
npm install
nano .env
```

Paste your `.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=epress_laundry
DB_USER=epress_user
DB_PASSWORD=your_strong_password
JWT_SECRET=complex_secret_key_minimum_32_chars
ALLOWED_ORIGINS=http://161.97.66.69,http://localhost:5173
```

Start with PM2:
```bash
pm2 start server.js --name "epress-api"
pm2 save
pm2 startup
```

### Backend Routes Available
The backend now exposes these route groups:
- `/api/auth` — register (creates virtual card), login, profile
- `/api/orders` — create/manage orders (supports coupon + points at checkout)
- `/api/categories` — barème items with FCFA prices
- `/api/points` — balance, history, redemption check
- `/api/coupons` — validate coupon codes
- `/api/notifications` — push notifications
- `/admin/*` — admin-only: users, orders, categories, coupons, points config

---

## Phase 4: Deploy Admin Panel

### Build locally (on your PC)
```bash
cd admin-panel
echo "VITE_API_URL=http://161.97.66.69/api" > .env.production
npm run build
```

### Upload to server (FileZilla SFTP or scp)
```bash
scp -r dist/* root@161.97.66.69:/var/www/epress-admin/
```

Or build directly on server:
```bash
cd ../admin-panel
npm install
echo "VITE_API_URL=http://161.97.66.69/api" > .env.production
npm run build
mkdir -p /var/www/epress-admin
cp -r dist/* /var/www/epress-admin
```

### Admin Panel Features
| Section | What it manages |
|---------|----------------|
| Utilisateurs | All users — view card number, points balance, adjust points manually |
| Commandes | All orders — shows coupon discount, points used, FCFA totals |
| Catégories | Barème items — French name, FCFA price, display order, GIF icon |
| Coupons | Create/edit/disable coupon codes (% or fixed discount, expiry, usage limits) |
| Points Config | Set earn rate, redemption value, min/max redemption rules |

---

## Phase 5: Configure Nginx

```bash
nano /etc/nginx/sites-available/default
```

Replace with:
```nginx
server {
    listen 80;
    server_name _; # or your domain

    # Admin Panel
    location / {
        root /var/www/epress-admin;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API + Socket.io
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

```bash
systemctl restart nginx
```

Access:
- **Admin Panel**: `http://161.97.66.69/`
- **API**: `http://161.97.66.69/api/`

---

## Phase 6: Mobile App (APK)

### Set API URL
In `mobile/eas.json`, confirm `EXPO_PUBLIC_API_URL` is set to your server:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "http://161.97.66.69/api"
      }
    }
  }
}
```

### Build APK
```bash
cd mobile
eas build -p android --profile production
```

Download the APK from `expo.dev` and distribute to users.

### Mobile App Features (v2)
- **Guest mode**: App opens to browsable home screen — no login required to browse. Login required to order.
- **Virtual E-Press Card**: Generated on registration (`EP-XXXX-XXXX-XXXX`), displayed on home screen with points balance.
- **Points system**: Users earn points on every delivered order. Configurable earn rate via admin.
- **Points redemption**: Users can redeem points at checkout (up to configurable max %).
- **Coupons**: Users enter coupon codes at checkout for % or fixed discounts.
- **Points history**: Dedicated screen showing all point transactions.
- **Full French UI**: All screens, alerts, buttons, and labels are in French.
- **Official barème pricing**: 26 items from the barème with correct FCFA prices, GIF icons, French names.

---

## Phase 7: Initialize Points Config (First Deploy Only)

Migration 007 seeds default values, but you can verify/update them via the admin panel under **Points Config**:

| Setting | Default | Meaning |
|---------|---------|---------|
| Points per 1 000 Fcfa | 10 | Customer earns 10 pts per 1 000 Fcfa spent |
| Valeur d'un point | 5 Fcfa | 1 pt = 5 Fcfa discount |
| Min points pour racheter | 100 pts | Minimum to use points |
| Max racheter (% du total) | 50% | Points can cover at most 50% of order |

---

## Quick Verification Checklist

After deployment, verify:

- [ ] `GET http://161.97.66.69/api/` returns `{ status: 'ok' }`
- [ ] Register a new user → check `card_number` is generated in DB
- [ ] Login → response includes `cardNumber`, `pointsBalance`
- [ ] `GET /api/categories` returns 26 French barème items with prices
- [ ] `GET /api/points/balance` (authenticated) returns balance + config
- [ ] Admin panel loads at `http://161.97.66.69/`
- [ ] Admin → Coupons page loads
- [ ] Admin → Points Config page loads and saves
- [ ] Place a test order with a coupon code → verify `coupon_discount` saved
- [ ] Mark order as delivered → verify points awarded to user

---

## Updating After Code Changes

```bash
# On server
cd /root/E_press
git pull

# Restart backend
pm2 restart epress-api

# If admin panel changed — rebuild locally and re-upload dist/
```

If a new migration was added:
```bash
psql $DATABASE_URL -f backend/database/migrations/00X_new_migration.sql
```
