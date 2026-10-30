# Roseland Journal — Shopify App Deployment & Troubleshooting Guide

**Repository:** https://github.com/chandamin/blog-sync-roseland  
**Production URL:** https://your-app-name.com  
**DigitalOcean Droplet IP:** `157.230.86.207`  
**Server directory:** `/var/www/blog-sync-roseland`  
**SSH key (on Mac):** `~/.ssh/roseland_digitalocean`  
**PM2 process:** `roseland-shopify-app`  
**Stack:** Node.js 24, Remix, Prisma/SQLite, Nginx, PM2  
**Server:** 1 GB RAM, 2 GB swap

## A. Routine deployment (after app code changes)

### 1. On your Mac — push changes to GitHub

Open Terminal in your **local app project**:

```bash
git status
git add .
git commit -m "Update Roseland Shopify app"
git push origin main
```

Do not commit `.env`, API secrets, SQLite `.db` files, or SSH keys.

### 2. On your Mac — connect to DigitalOcean

```bash
ssh -i ~/.ssh/roseland_digitalocean root@157.230.86.207
```

### 3. On the DigitalOcean server — inspect and pull

```bash
cd /var/www/blog-sync-roseland
git status
git pull --ff-only origin main
```

**Stop if `git status` shows unexpected changes or `git pull` fails.** Do not force-reset local configuration. Ensure your `.env` and SQLite database are kept outside Git tracking.

### 4. On the server — install, validate and build

Run each command and continue only when the previous command succeeds:

```bash
npm ci --include=dev --no-audit --no-fund
npx prisma generate
npm run typecheck
npm test
npm run build
```

`--include=dev` is important for this app: a previous deployment lacked the `remix-serve` binary. `--no-audit` suppresses the automatic install-time audit, **not** security vulnerabilities; run `npm audit` separately.

**If `prisma/schema.prisma` changed:** back up SQLite first, review changes and follow the project's migration procedure. `npx prisma db push` can change database structure and should not be run blindly against production. A normal UI or API code update does **not** need a database schema push.

### 5. On the server — restart and check

```bash
pm2 restart roseland-shopify-app --update-env
pm2 list
pm2 logs roseland-shopify-app --lines 30 --nostream
curl -I http://127.0.0.1:3000
curl -I https://your-app-name.com
```

A `302` redirect to `/app` has previously been normal for this project. Confirm the app opens from Shopify Admin and test the modified feature; a successful HTTP response alone does not verify OAuth or blog sync.

**Do not run `pm2 save` after a failed or stopped process configuration.** For an already correctly configured PM2 service, ensure `pm2 startup` was set up once and `pm2 save` preserved the correct process list.

## B. Changes needing additional deployment

| Change | Additional action |
|---|---|
| UI, Remix routes, backend code | Routine deployment above |
| npm packages / lockfile | Run full `npm ci --include=dev` and rebuild |
| Prisma schema | SQLite backup; review/apply schema changes; generate client; build/restart |
| Shopify scopes, redirect URLs, webhook config, app extensions | Update appropriate `shopify.app*.toml`, then deploy Shopify configuration |
| Background sync worker | Deploy code and restart its separately managed worker/scheduler if enabled |
| `.env` values | Update server `.env` securely, then restart PM2 with `--update-env` |

For Shopify configuration changes **only**, after confirming the correct app and TOML file:

```bash
cd /var/www/blog-sync-roseland
npx shopify app deploy --config roseland-journal
```

Do not run Shopify CLI deployment for ordinary backend-only code changes. Check that production app URLs match `https://your-app-name.com` and that redirect URLs match the actual OAuth routes.

## C. Production environment variables — where and how to use them

**File on DigitalOcean:** `/var/www/blog-sync-roseland/.env`. This is a **server-side file**, not a DNS record, Shopify Admin field, or a file to commit to GitHub.

### Open or create it on the server

```bash
ssh -i ~/.ssh/roseland_digitalocean root@157.230.86.207
cd /var/www/blog-sync-roseland
ls -l .env               # confirms the file exists; does NOT print secrets
nano .env                # edit privately; do NOT screenshot or paste its contents
chmod 600 .env
```

If `.env` does not exist, use `cp .env.example .env` **once**, then fill in the values. Do not overwrite an existing production `.env` with `.env.example`.

### Example keys (values are placeholders — never copy as real credentials)

```dotenv
NODE_ENV=production
SHOPIFY_API_KEY=YOUR_SHOPIFY_APP_CLIENT_ID
SHOPIFY_API_SECRET=YOUR_ROTATED_SHOPIFY_APP_SECRET
SHOPIFY_APP_URL=https://your-app-name.com
SCOPES=read_content,write_content,read_metaobjects,write_metaobjects,read_products
DATABASE_URL=file:./dev.db
CRON_SECRET=GENERATE_A_NEW_PRIVATE_RANDOM_VALUE
```

| Variable | Purpose / source |
|---|---|
| `NODE_ENV` | `production` when running the deployed app. |
| `SHOPIFY_API_KEY` | App client ID / API key from the correct Shopify app in its Dev Dashboard. |
| `SHOPIFY_API_SECRET` | Secret from the same app; **rotate the secret exposed earlier**, then store the replacement only in `.env`. |
| `SHOPIFY_APP_URL` | Public HTTPS URL for this deployment: `https://your-app-name.com`. Also update Shopify app configuration where required. |
| `SCOPES` | App's requested permissions; keep consistent with the Shopify TOML app configuration and granted scopes. |
| `DATABASE_URL` | Prisma SQLite database reference. `file:./dev.db` was used at setup; **verify its actual resolved location** from Prisma config before backing up or moving the DB. |
| `CRON_SECRET` | Long secret protecting the sync endpoint; generate with `openssl rand -hex 32` and never share the output. |

**When changing `.env`:** save it, keep file permissions restrictive, and restart the application so the new environment is loaded:

```bash
cd /var/www/blog-sync-roseland
chmod 600 .env
pm2 restart roseland-shopify-app --update-env
pm2 list
pm2 logs roseland-shopify-app --lines 20 --nostream
```

If you changed **Shopify OAuth credentials, scopes, or the public URL**, the corresponding Shopify Dev Dashboard/TOML settings and app installation may also need updating. For `shopify.app*.toml` changes, use the appropriate `npx shopify app deploy --config roseland-journal` process; PM2 restart **alone** does not publish those changes to Shopify. If a separately managed sync worker uses these values, restart that worker too. Never use `cat .env`, `grep` commands that print secret values, or `git add .env` when preparing a report.

## D. Future server RAM / disk-space problems — diagnosis and recovery

**Your current server is 1 GB RAM with a 2 GB `/swapfile` already created. Do NOT create it again on every deployment.** Linux OOM logs previously confirmed `npm ci` was killed by low memory. Swap is disk-backed overflow memory, not a RAM upgrade.

### 1. Check memory, swap, disk and large processes (safe/read-only)

```bash
free -h
swapon --show
df -h
ps aux --sort=-%mem | head -15
pm2 list
journalctl -k --since '1 hour ago' --no-pager | grep -iE 'out of memory|oom|killed process'
```

- **`Killed` during `npm ci` + OOM logs:** memory exhaustion. Confirm swap is enabled, stop overlapping builds, then retry `npm ci --include=dev --no-audit --no-fund` after the system stabilizes.
- **`Swap: 0B` unexpectedly:** first inspect existing swap and `/etc/fstab`; do **not** overwrite an existing swap file. Check `ls -lh /swapfile`, `swapon --show`, and `grep '^/swapfile ' /etc/fstab`. If `/swapfile` is valid but inactive, `sudo swapon /swapfile` can re-enable it; verify with `free -h`.
- **Memory remains exhausted even with swap:** investigate the largest processes, avoid simultaneous installs/builds, and consider building on a separate CI runner or upgrading the Droplet RAM. Swap can slow the server and is not an unlimited fix.
- **Disk near 100% (`df -h`):** stop running installs; inspect consumption using `sudo du -xhd1 /var /root /tmp 2>/dev/null` and `du -sh /var/www/blog-sync-roseland/* /root/.npm /root/.pm2/logs 2>/dev/null`. Check application logs, npm cache, old build artifacts and database backups before cleaning. **Never delete** `.env`, SQLite `*.db`/`*.db-wal`/`*.db-shm`, active application files, or unknown backups. Increase Droplet storage if needed.

### 2. How to re-enable persistent swap safely

```bash
swapon --show
ls -lh /swapfile
grep -n '^/swapfile ' /etc/fstab
```

If the swap file **exists, is correctly configured, and is just inactive**, use:

```bash
sudo swapon /swapfile
free -h
```

If `/etc/fstab` has no swap entry **and `/swapfile` is valid**, make it persistent without duplicating the entry:

```bash
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

If the file is genuinely missing, ensure adequate free disk space before recreating it; consider a maintenance window and follow the original creation procedure. Do not resize an active swap file without disabling it and planning for the temporary reduction in memory capacity.

### 3. If PM2 fails after an interrupted install

```bash
cd /var/www/blog-sync-roseland
pm2 stop roseland-shopify-app
npm ci --include=dev --no-audit --no-fund
ls -l node_modules/.bin/remix-serve
npx prisma generate
npm run typecheck
npm test
npm run build
pm2 restart roseland-shopify-app --update-env
pm2 list
curl -I https://your-app-name.com
```

**Proceed to the next line only when the previous command succeeds.** The live service might experience downtime during this recovery; for critical traffic use a staged deployment and a rollback plan.

## E. Errors encountered and fixes

### 1. `sh: 1: remix-serve: not found` / PM2 `errored`

**Cause:** The required Remix executable was missing from `node_modules`, often after an incomplete install or dev dependencies being omitted.

```bash
cd /var/www/blog-sync-roseland
pm2 stop roseland-shopify-app
npm ci --include=dev --no-audit --no-fund
ls -l node_modules/.bin/remix-serve
npm ls @remix-run/serve
npx prisma generate
npm run build
pm2 restart roseland-shopify-app --update-env
```

Only restart after installation and build succeed. If the binary is still missing, inspect `package.json` instead of globally installing an arbitrary package version.

### 2. `Killed` while running `npm ci`

**Confirmed cause:** Linux OOM-killer terminated npm on the 1 GB RAM Droplet (kernel logs showed `Out of memory: Killed process (npm ci)`).

Check:

```bash
free -h
swapon --show
journalctl -k --since '30 minutes ago' --no-pager | grep -iE 'out of memory|oom|killed process'
```

A **2 GB `/swapfile` has already been created and enabled**. Do not recreate it on every deployment. Verify it remains active:

```bash
swapon --show
free -h
```

If swap is active, try the npm install again. If swap is unexpectedly absent, inspect `/etc/fstab` and swap configuration before attempting to recreate it. Swap is slower than RAM.

### 3. `prisma: command not found`

**Cause:** Prisma CLI is installed inside the project, not globally.

Use:

```bash
npx prisma generate
```

The initial database was successfully created with `npm run setup` (`prisma generate && prisma db push`). **Do not repeat database initialization or schema changes without a reason and backup.**

### 4. Nginx `502 Bad Gateway`

**Cause observed:** Nginx could reach the domain, but the Node.js backend was not running/listening on port 3000.

```bash
pm2 list
pm2 logs roseland-shopify-app --lines 30 --nostream
ss -ltnp | grep ':3000'
curl -I http://127.0.0.1:3000
sudo nginx -t
```

Restore the app process/build, then retry `curl -I https://your-app-name.com`.

### 5. Shopify OAuth: `The redirect_uri is not whitelisted`

**Cause found:** `shopify.app.toml` and `shopify.app.roseland-journal.toml` still contained `https://your-app-name.com` callback placeholders.

**Fix:** Set the real application URL and the callback paths used by the app, then deploy the correct Shopify config:

```toml
application_url = "https://your-app-name.com"

[auth]
redirect_urls = [
  "https://your-app-name.com/auth/callback",
  "https://your-app-name.com/auth/shopify/callback"
]
```

Confirm actual callback routes before using them. Then:

```bash
npx shopify app deploy --config roseland-journal
```

### 6. Shopify CLI: `spawn xdg-open ENOENT`

**Cause:** The headless Ubuntu Droplet cannot launch a browser automatically. Open the Shopify device verification link/code manually **on your Mac**, authenticate with the account that has access to the correct app, then continue the CLI process. Do not assume installing `xdg-open` creates a graphical browser on a server.

### 7. `No route matches URL "/favicon.ico"`

This was a separate Remix **404** for a missing favicon and **was not the cause of the PM2 crash**. Add a favicon asset/route if needed.

### 8. npm deprecated package warnings / security advisories

Warnings about deprecated `glob`, `tar`, `@shopify/network`, and other packages did not directly cause the OOM crash. Some versions may have vulnerabilities and need review. Inspect with:

```bash
npm audit
```

Upgrade dependencies deliberately and test thoroughly; don't use `npm audit fix --force` blindly on production.

## D. Important operating precautions

- **Secrets:** A Shopify API secret appeared in an earlier screenshot. Rotate it in the Shopify Dev Dashboard and update the server `.env`; never post the secret in logs, screenshots or GitHub.
- **Database:** SQLite contains application state (including sessions). Back it up before schema changes or major deploys; confirm where `DATABASE_URL` resolves and implement ongoing backups.
- **Avoid breaking the app:** Stop on failed `git pull`, install, tests or build. Restart PM2 only after success.
- **Server capacity:** This is a 1 GB RAM machine with 2 GB swap; watch memory/disk and avoid concurrent builds.
- **Worker:** If scheduled synchronization uses a separate `npm run worker` process or cron job, verify and update it independently.
- **Shopify configuration:** `shopify app deploy` publishes app configuration/extensions, whereas PM2 restarts the self-hosted Node.js backend.

## E. Useful read-only checks

```bash
pm2 list
pm2 logs roseland-shopify-app --lines 30 --nostream
free -h
swapon --show
df -h
nginx -t
curl -I https://your-app-name.com
```

**Reference:** This guide documents the commands and errors from the Roseland DigitalOcean deployment. It is a manual update procedure, not an automatic CI/CD pipeline.

## F. Complete incident and warning register (additional messages from the deployment conversation)

The sections above cover the major production failures. This section captures **the other errors, prompts, warnings, and confusing terminal output reported during setup**. Not every message was a failure; its severity is stated explicitly.

| # | Exact message / symptom | Classification | What it meant / correct response |
|---|---|---|---|
| 9 | `Saving key "~/.ssh/roseland_digitalocean" failed: No such file or directory` | SSH key creation error (Mac) | `~` was entered literally at an interactive prompt and/or target directory wasn't present. Run `mkdir -p "$HOME/.ssh"` and `ssh-keygen -t ed25519 -f "$HOME/.ssh/roseland_digitalocean" -C roseland-digitalocean`. |
| 10 | `cat: /Users/apple/.ssh/roseland_digitalocean.pub: No such file or directory` | Consequence of #9 | No keypair had been saved. Generate it successfully first; only upload the `.pub` file. |
| 11 | `/Users/apple/.ssh/id_ed25519 already exists. Overwrite (y/n)?` | Security-sensitive prompt, not an error | Enter `n`. Preserve existing GitHub/SSH keys and create the separate Roseland key. |
| 12 | `The authenticity of host ... can't be established` / `This key is not known by any other names` | Normal first SSH login verification | Verify server SSH fingerprint using a trusted channel before typing `yes`. It will then be added to `known_hosts`. |
| 13 | Public key added to DigitalOcean account but existing Droplet still requires authorization | Configuration distinction | Adding a key under DigitalOcean account settings does **not** insert it into `/root/.ssh/authorized_keys` on existing Droplets. New Droplet creation can provision a chosen key. |
| 14 | `ls: cannot access '/var/www/': No such file or directory` | Directory-not-found on **meta-ads**, an earlier Droplet | That directory was not present there; it did not mean the Roseland repo was deleted. Roseland was subsequently cloned to **the new** Droplet under `/var/www/blog-sync-roseland`. |
| 15 | `*** System restart required ***` / `Pending kernel upgrade!` | Ubuntu maintenance notice | An OS/kernel update had been installed. Plan a maintenance window and verify PM2 auto-start before rebooting a production server. Not a reason to reboot in the middle of deployment. |
| 16 | Prompt to keep local or install package maintainer's SSH config | Ubuntu upgrade prompt | Keep the existing SSH configuration when uncertain so remote access is not unintentionally changed. Review and merge desired changes separately. |
| 17 | `New release ... available` / `Enable ESM Apps` | Informational OS notices | Neither blocks Node/Shopify deployment. Do not run `do-release-upgrade` as part of routine app deployment. |
| 18 | `SHOPIFY_APP_URL` unavailable before DNS subdomain was configured | Missing production configuration | A Droplet IP is not automatically an HTTPS hostname. Client added DNS `A` record: `blog-sync` → `157.230.86.207`; then Nginx/Certbot and `.env` were configured. |
| 19 | Certbot `Do you agree? (Y)es/(N)o` | Terms-of-service prompt | Review the terms; choose `Y` only if you agree. EFF email-sharing request is optional. |
| 20 | `HTTP/1.1 302 Found` / `location: /app` | Expected response, **not an error** | Local `127.0.0.1:3000` and public HTTPS both returned this when the app was responding. Still test Shopify Admin authentication and blog sync. |
| 21 | `openssl rand -hex 32~` → `Can't parse "32~" as a number` | Command typo | Run `openssl rand -hex 32` with no `~`; save result privately as `CRON_SECRET`. |
| 22 | Nano prompt to write `.env` filename | Normal editor prompt | Confirm `.env` with Enter, then `Ctrl+X`; check permissions with `chmod 600 .env`. |
| 23 | `npm ci --include=dev` appeared inactive / spinner | Slow or stuck install symptom | Check with a **second SSH session**: `ps aux | grep '[n]pm'`, `free -h`, `df -h`, npm logs. Don't start a concurrent installation. In this case later OOM logs confirmed memory exhaustion. |
| 24 | `npm warn deprecated tsconfck@3.1.6`, `boolean@3.2.0`, `@shopify/network@3.3.0`, `tar@6.2.1`, `glob@10.5.0` | Dependency warnings | These were warnings, not the direct reason npm was killed. Review `npm audit` and pin/upgrade affected packages through a tested code change; don't blindly force upgrades. |
| 25 | Prisma update notice `6.19.3 -> 8.0.0-rc...` | Informational major/RC upgrade notice | Prisma 6.19.3 generated its client and created the DB successfully. Do not move to a release candidate as part of production troubleshooting without compatibility testing. |
| 26 | `Prisma schema validation - (get-config wasm)` | **Separately reported in an earlier local setup**, not reproduced in the successful Droplet setup | Error text alone does not identify the bad schema field. Inspect full error details, `prisma/schema.prisma`, environment variables, and Prisma CLI/client versions. Do **not** assume the production database is broken: later server `npm run setup` succeeded. |
| 27 | `git stash` trailing whitespace warnings / `squelched ... whitespace errors` | Git patch/whitespace warnings from an earlier server workflow | Inspect the stash and modified TOML configuration; whitespace warnings aren't proof of a failed stash. Avoid overwriting server-specific Shopify credentials/configuration when pulling. |
| 28 | PM2 restart counter exceeded 100 and status `errored` | Repeated startup failure | Consequence of missing `remix-serve` in the installation. Stop PM2 to halt restart loops, restore dependencies, build, then restart and observe logs. |
| 29 | Security vulnerability count reported during `npm ci` | Security issue requiring review, not the reason for `Killed` | Run `npm audit --omit=dev` to assess production impact and plan tested dependency updates. `--no-audit` suppresses only automatic install-time checking. |
| 30 | Shopify CLI opened device code link then `spawn xdg-open ENOENT` | Headless browser-launch issue | Manually open a **fresh** device verification link on the Mac. Installing a GUI browser on the Droplet is not required; device codes expire and should not be saved in docs. |
| 31 | `The redirect_uri is not whitelisted` | Shopify app configuration failure | Both TOML files contained placeholder callback domains; replace with the exact actual callback URLs and publish the correct Shopify app configuration. Confirm the registered client ID belongs to the intended app. |
| 32 | Shopify CLI configuration scopes differed from OAuth request | Configuration consistency concern, not a confirmed separate error | Verify `.env` `SCOPES`, TOML scopes and actual requested scopes. A scope mismatch may require configuration deploy and authorization again. |

### Full recovery commands for the confirmed memory + missing executable incident

These commands are **not** necessary on every app update. They document the recovery we performed.

```bash
# On the server; read-only diagnosis
cd /var/www/blog-sync-roseland
free -h
swapon --show
journalctl -k --since '30 minutes ago' --no-pager | grep -iE 'out of memory|oom|killed process'

# Inspect existing swap first; do NOT blindly recreate an active /swapfile
ls -lh /swapfile
swapon --show

# If swap is properly configured, stop failing process and restore packages
pm2 stop roseland-shopify-app
npm ci --include=dev --no-audit --no-fund
ls -l node_modules/.bin/remix-serve
npx prisma generate
npm run typecheck
npm test
npm run build
pm2 restart roseland-shopify-app --update-env
pm2 list
pm2 logs roseland-shopify-app --lines 30 --nostream
curl -I https://your-app-name.com
```

### Notes for future reliability

- This checklist was compiled from the errors and warnings **shared in our conversation**, not a complete forensic log of every server event.
- Make a backup of the SQLite database **before** deployments with schema changes; store backups separately from the Droplet.
- Set up PM2 boot persistence (`pm2 startup`, follow the displayed command, `pm2 save`) once the correct process is online.
- The Shopify API secret was visible in an earlier screenshot. Rotate it and update `.env` before treating production as secure.
- Normal backend code updates do **not** require `shopify app deploy`; app configuration/extension changes do.
