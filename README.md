# blog-sync-roseland

Remix Shopify app that imports https://roselandusa.substack.com/feed into native articles in the Journal blog. The simple admin screen has one Sync Journal button and links to Shopify's article editor.

See [the content model and acceptance checks](docs/content-model.md) for the native RSS workflow, protected editing, Shopify metafields/metaobjects and automatic worker setup. Final Figma storefront styling remains a separate theme step.

## Upload to your GitHub repository

Uploading the source to GitHub does not require a live app URL and does not host the app. The configuration uses `https://your-app-name.com` as a placeholder until you deploy.

1. Create an empty GitHub repository (without an initial README) in your own account.
2. Sign in to GitHub CLI with the account that can write to that repository:

   ```bash
   gh auth login --hostname github.com
   gh auth setup-git
   ```

3. From this app folder, initialize Git only if the folder does not already contain a `.git` directory:

   ```bash
   git init -b main
   ```

4. Set your commit identity and commit the app:

   ```bash
   git config user.name "gitusername"
   git config user.email "example@gmail.com"
   git add .
   git commit -m "Prepare app for deployment"
   ```

5. Replace `YOUR_USERNAME` and `YOUR_REPOSITORY` below with your destination. If `origin` already exists, use `git remote set-url origin` instead of `git remote add origin`.

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

The GitHub account used for authentication must have write access; setting the commit name and email does not change the signed-in account. Keep `.env`, credentials, and local database files out of Git; the supplied `.gitignore` excludes them.

## Set the app URL when deploying

1. Deploy the app to a Node host with a persistent SQLite volume and obtain its public HTTPS URL.
2. Copy `.env.example` to `.env` on the host and replace `SHOPIFY_APP_URL=https://your-app-name.com` with your actual app URL. Fill in your Shopify API key, API secret, database location, and cron secret.
3. In the Shopify TOML configuration you use (`shopify.app.toml` or `shopify.app.roseland-journal.toml`), set your own app client ID, replace `application_url` with the same URL, and update both callback URLs to `<your-app-url>/auth/callback` and `<your-app-url>/auth/shopify/callback`.
4. Link the configuration to your Shopify app, publish its configuration, and install it on a development store. See the Run section below for the existing local workflow.
5. Run `npm ci`, `npm run setup`, and `npm run build` on the host, then start the app with `npm start`. Configure the host to keep the app running and use the same app URL for your worker or scheduler.

The app URL is the address of your deployed app. `https://roselandusa.substack.com/feed` is the separate RSS source used to import articles. To import another publication, change the Substack RSS URL in **Feed settings** after installation. The current feed validator accepts HTTPS Substack `/feed` URLs only.

## Run

1. Run `npm install` and copy `.env.example` to `.env`.
2. Create/link your Shopify app using `shopify app config link`. Set the API key, secret, app URL and a random cron secret in `.env`. Keep the content access scopes and webhook subscription from this project's TOML.
3. Run `npm run setup`, then `npm run dev` and install on your development store.
4. Click Sync Journal. Imports are published using their original RSS publication dates. Test on a development store first.

## Storefront

Copy `theme/sections` and `theme/templates` into your existing theme. Merge the `journal` translation object from `theme/locales/en.default.json` into the theme's English locale file; do not replace existing translations. Assign the `journal` template to the Journal blog. New articles request the `journal` article template.

Shopify native blog URLs are `/blogs/journal` and `/blogs/journal/<article-handle>`. Create a Shopify URL redirect from `/journal` to `/blogs/journal`. This gives visitors the requested entry point; Shopify still serves native article paths. Exact `/journal/<slug>` routes would require a storefront routing layer and are not implemented.

Categories use native article tags: New Products, Making, Materials, Design History, People & Places. RSS categories are preserved when supplied; add the planned category tags manually when the feed omits them. Filtering uses native tagged blog pages and works across pagination.

## Editing contract

Journal settings now include Journal title, destination blog handle, a comma-separated editable category list, scheduled-sync enable/disable, and the sync interval. Saving settings creates or selects the destination blog and updates its title; existing imported articles are never moved. Removing a configured category does not delete existing article tags. The landing template uses the blog's actual tags, so only categories assigned to articles appear. Upload the updated `journal-index.liquid` to your theme to use this behavior.

Each imported story has an **Art direction** link with an HTML editor, category selection, layout insertion buttons, and related product/story links. Related links use manually entered store paths, not resource pickers. Replace placeholder image URLs before saving. RSS never rewrites this body. Saves lock the article title and tags against RSS updates and check Shopify's last-updated timestamp to detect edits since loading (a simultaneous write during the API request remains possible).

For adjustable scheduled sync, configure your host to POST `/api/sync` every five minutes with the cron bearer secret. The endpoint checks the shop's enabled flag and configured interval before syncing. Changing the interval in admin does not provision a hosting scheduler. Manual sync ignores the scheduled pause. Last-sync timing is recorded after completed runs, including partial failures.

Open **Feed settings** in the app to change the feed display name, Substack RSS URL, fallback category, publish-versus-draft behavior for new imports, and automatic metadata syncing. Settings are stored per shop and used by manual and scheduled syncs. Feed URLs must be HTTPS `https://<publication>.substack.com/feed` URLs; custom domains and non-Substack RSS feeds are not supported. Redirects are rejected. Changes do not delete or reset existing articles. After updating this app, stop the development server, run `npm run setup`, and restart it to load the new Prisma model.

- RSS creates the initial title, excerpt, date, body HTML, image markup, captions, links, author and available tags.
- Subsequent syncs never send body, images, author, publication date, handle or template updates. Reorder, add and remove images or edit captions safely in Shopify.
- Title, excerpt and tags sync only if their current values equal the last values saved by the importer. A detected manual change permanently locks that field. Publication date is intentionally import-only.
- Stable RSS identifiers and a per-shop database lock prevent normal duplicate imports. Deterministic article handles allow recovery after a successful Shopify create followed by a failed local save. Recovered records conservatively lock metadata. Deleted Shopify articles are not recreated.
- Metadata comparison is performed at sync time. An edit made concurrently between the comparison and API update could race; run a sync before beginning a metadata editing session. Body editing is always protected.
- Article content is stored as sanitized HTML, with responsive CSS treatments. `docs/editorial-example.html` shows wide images, paired images, image plus text, pull quotes and related links. These layouts use Shopify's HTML editor; a visual block editor and product picker are not included. Replace sample URLs before use.
- Inline images retain the RSS image URLs. They are displayed within native Shopify articles but are not copied into Shopify Files. The feed must expose full public content; truncated or paywalled material cannot be recovered from RSS. RSS only includes the archive posts Substack currently exposes.

## Automatic sync and deployment

Build with `npm run build`, initialize the database with `npm run setup`, and run `npm start` on a Node host. Use a persistent volume for the SQLite database (including OAuth sessions and import history); run a single app instance. Do not use ephemeral filesystem hosting for the database.

Configure an external scheduler to POST to `https://your-app-name.com/api/sync` every 15 minutes with `Authorization: Bearer <CRON_SECRET>`. The scheduler itself is not provisioned. The endpoint uses authenticated-admin-saved feed settings rather than accepting a feed URL in the request. Per-post failures are returned in the sync report without stopping other imports. Monitor reports for errors. Uninstall webhooks remove credentials while retaining import history for safe reinstallation.

## Checks

`npm test`, `npm run typecheck`, `npm run build`.

`npm run verify:feed` fetches the live Roseland feed and writes `docs/feed-validation.json`, checking original dates, image/caption parsing, stable identities and protected edits. It does not create or modify Shopify articles.

Live-feed inspection on October 20, 2026 found seven posts, five captions, and publication dates reaching back to March 21, 2024. No RSS category elements were present, so category assignment currently happens in Shopify.

Release limitation: npm audit reports advisories in Remix 2 and its transitive dependencies (including React Router 6 and turbo-stream). Keep single-fetch disabled (the current configuration does), restrict access to the authenticated admin app, and review upstream patches before public deployment. No forced major-version overrides have been applied. Store installation, authenticated Shopify mutations, the scheduler and theme rendering still require testing on a development store with your app credentials.

API references: [Shopify Remix authentication](https://shopify.dev/docs/api/shopify-app-remix/latest), [articleCreate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/articleCreate), [articleUpdate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/articleUpdate).
