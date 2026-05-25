# E-Press deployment

End-to-end CI/CD for E-Press. **GitHub push → Jenkins build → automatic deploy → live at https://epress.ga.**

## Files in this folder

| File | When it runs | Why |
|---|---|---|
| `install.sh` | **Once** per server (bootstrap) | Creates DB user + database, generates secrets, sets up paths, nginx vhost, pm2, first build. Idempotent — safe to re-run. |
| `deploy.sh` | **Every** Jenkins build | Pulls latest, installs only changed deps, runs new migrations, `pm2 reload` (zero downtime), smoke-tests the backend. |
| `ecosystem.config.js` | Loaded by pm2 on `startOrReload` | Defines the `epress-backend` pm2 process. Memory limit 512M, restart on crash, fork mode. |
| `nginx/epress.conf` | Installed once into `/etc/nginx/sites-available/epress` | Vhost for `epress.ga`. Proxies `/api`, `/socket.io` to the backend; serves admin SPA at `/admin/`, landing at `/`. |
| `../Jenkinsfile` | Read by Jenkins on each build | Pipeline definition — checkout, syntax sanity, run `deploy.sh`. |

## First-time setup (you do this once)

### 1. DNS

Point `epress.ga` at the server before everything else — SSL needs DNS to be live.

```
Type  Name              Value
A     epress.ga         37.60.240.199
A     www.epress.ga     37.60.240.199
```

Wait ~5 minutes for propagation. Verify: `dig +short epress.ga` should return `37.60.240.199`.

### 2. Bootstrap

SSH to the server as root:

```bash
curl -fsSL https://raw.githubusercontent.com/MoctarSidibe/E_press/main/deploy/install.sh | bash
```

What this does:
- Clones the repo into `/var/www/epress/`
- Creates Postgres user `epress_user` + database `epress_prod`
- Generates a random DB password (stored at `/var/www/epress/.deploy-db-pass`, mode 600)
- Writes `backend/.env` with `JWT_SECRET` + DB credentials (mode 600)
- Writes `admin-panel/.env.production` pointing at `https://epress.ga/api`
- Installs deps, builds admin SPA, runs all migrations 006-018
- Seeds an admin account if none exists (via `backend/scripts/create_admin.js`)
- Starts pm2 process `epress-backend` on port 5004
- Installs and enables the nginx vhost
- Reloads nginx

### 3. SSL (Let's Encrypt)

After the bootstrap finishes, run certbot:

```bash
certbot --nginx -d epress.ga -d www.epress.ga --redirect --agree-tos -m admin@epress.ga --non-interactive
```

Certbot updates the nginx vhost in place to use real certs and auto-renews via systemd timer.

### 4. Jenkins job

In Jenkins (`http://37.60.240.199:8081/jenkins/`):

1. **New Item** → name `epress-deploy` → **Pipeline** → OK.
2. **Pipeline** section:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/MoctarSidibe/E_press.git`
   - Branch: `*/main`
   - Script path: `Jenkinsfile`
3. **Build Triggers** → check **GitHub hook trigger for GITScm polling**.
4. Save.

### 5. GitHub webhook

In the GitHub repo → **Settings** → **Webhooks** → **Add webhook**:

- Payload URL: `http://37.60.240.199:8081/jenkins/github-webhook/`
- Content type: `application/json`
- Secret: leave blank (or set one and configure it in Jenkins GitHub plugin)
- Events: **Just the push event**
- Active: ✓

### 6. First test deploy

In Jenkins → `epress-deploy` job → **Build Now**.

Or: push a no-op commit to main and watch Jenkins pick it up via the webhook.

Tail the deploy output: in the Jenkins build view → **Console Output**.

After it finishes:
- Admin: `https://epress.ga/admin/`
- Backend health: `https://epress.ga/api`
- pm2 status: `ssh root@37.60.240.199 'pm2 status epress-backend'`

## Day-to-day

Push to `main` → wait ~30 seconds → site updates. That's it.

To deploy manually (skip Jenkins): SSH in and run `bash /var/www/epress/deploy/deploy.sh`.

## Where things live on the server

```
/var/www/epress/                # repo checkout (git pulls into here)
├── backend/
│   ├── .env                    # SECRETS — never committed; written by install.sh
│   ├── uploads/                # KYC docs, category GIFs (mounted, not in git)
│   └── …
├── admin-panel/
│   ├── .env.production         # VITE_API_URL pointing at /api
│   └── dist/                   # built SPA (served by nginx)
├── landing/                    # static landing page (served at /)
├── deploy/                     # this folder
└── .deploy-db-pass             # SECRETS — mode 600, source of truth for DB pwd

/etc/nginx/sites-available/epress  # symlinked from sites-enabled/
/var/log/pm2/epress-backend.*.log  # backend stdout/stderr
/var/log/nginx/epress.{access,error}.log
```

## Rollback

```bash
ssh root@37.60.240.199
cd /var/www/epress
git log --oneline -10              # find the commit you want to go back to
git reset --hard <sha>
bash deploy/deploy.sh
```

Migrations are idempotent — a rollback to an older code SHA leaves new schema in place. That's intentional: schema is additive, code can talk to "future" columns safely.

## Secrets / credentials

| Secret | Where | How to rotate |
|---|---|---|
| Postgres password | `/var/www/epress/.deploy-db-pass` + `backend/.env` | `ALTER ROLE epress_user PASSWORD '…';` then edit both files + `pm2 reload epress-backend` |
| JWT_SECRET | `backend/.env` | Edit + `pm2 reload`. Existing tokens are invalidated. |
| Admin password | `users` table | Re-run `node backend/scripts/create_admin.js` (will tell you it exists; reset via SQL or admin UI) |

## Troubleshooting

| Symptom | Check |
|---|---|
| 502 on https://epress.ga/api | `pm2 status epress-backend`, `pm2 logs epress-backend --lines 30` |
| Admin shows blank page | Built `dist/` exists? `ls /var/www/epress/admin-panel/dist/index.html`. Hard-refresh browser. |
| Jenkins build failed at "Backend syntax sanity" | Some file doesn't parse — fix in code, push again. |
| Migration error in Jenkins log | SSH in, run the migration manually with `-v ON_ERROR_STOP=1` to see the real error. Then fix and push. |
| Phone can't reach API | Check nginx error log + Cloudflare/firewall. From the server: `curl -i https://epress.ga/api`. |
