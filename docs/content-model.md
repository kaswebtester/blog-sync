# Journal content model

The current admin design is retained. Final storefront layouts, mobile styling and category navigation can be implemented in the theme after Figma approval.

## Native article data

RSS imports title, description/subtitle into excerpt, original publication date, sanitized body HTML, inline image markup, captions, links, author, tags and the first image as the featured image. Dates are converted to ISO timestamps without changing the instant. The fallback category applies only if RSS supplies no categories.

Inline images retain public Substack/CDN URLs. They are not uploaded to Shopify Files. The featured image is supplied through Shopify's native article image input. Public RSS content is the available source; paywalled or truncated text cannot be reconstructed. The checked feed snapshot contains seven public posts, with dates back to March 2024.

Stable RSS identifiers are tracked per shop. Sync never changes an imported body, images, author, handle, template or publication date. Optional title, excerpt and tag updates stop permanently when a manual change is detected. Metadata edits made during the brief API read/write interval can still race; body and editorial fields are never part of RSS updates.

The app list verifies imported IDs against Shopify on every load and uses current Shopify titles. Deleted articles disappear from the list. Their import history remains so RSS will not silently recreate them. An API error is not interpreted as a deletion.

The admin Imported stories list always includes published and draft articles. The **Show on storefront** switch after Imported on controls the native publication status: Enable publishes the article; Disable makes it a draft. Disabled posts remain in the admin list. RSS does not overwrite this status on existing imports. Deleted articles are excluded. Future scheduled articles must have their schedule updated in Shopify before enabling immediately.

To deliberately restore deleted articles from the currently saved feed, click **Re-import deleted posts**. The importer checks the old Shopify ID, recreates only missing articles, and updates their import records. Live articles keep the same body-protection and metadata rules as normal sync. Posts no longer present in the public RSS feed cannot be restored this way.

## Definitions, writes, reads

Definitions are declared in both app TOML configurations. Shopify CLI applies them to the development store when starting app development; production configuration must be deployed separately.

| Owner | App key/type | Data |
|---|---|---|
| Article | `$app.editorial_blocks` | Ordered list of references to `$app:journal_block` metaobjects |
| Article | `$app.related_products` | Native product reference list |
| Article | `$app.related_stories` | Native article reference list |
| Metaobject | `$app:journal_block` | Label, layout, text, image URL, second image URL, two captions and two image descriptions |

Here `$app` denotes Shopify's app-owned namespace, not a literal Liquid namespace. The Admin GraphQL API expands `$app`; theme code needs the resolved `app--<app-id>` namespace. Inspect the installed definitions when integrating the final theme.

Block layouts are text, standard image, wide image, two images, image plus text and pull quote. Related references belong to the article. Standard RSS bodies remain usable independently of blocks. Blocks are optional additional editorial data. The updated Journal article section renders them after the native body and displays related products and stories.

**Art direction → Structured editorial content** reads the article reference metafields and resolves their metaobjects. Editors add, remove and reorder blocks, edit captions, and select related references. Current selectors list the first 50 products and 100 articles; references already saved outside those choices are retained.

On save, the app validates all input, stages fresh metaobjects with `metaobjectUpsert`, then uses one atomic `metafieldsSet` call to update all three article lists with compare-digest checks. Concurrent changes to reference metafields cause a save error instead of being overwritten. The app never writes article body content in this operation. Earlier block revisions remain in Shopify, including entries staged before a failed reference write; automatic cleanup is deliberately not performed.

Merchants can edit the app-owned entries in Shopify because definitions grant merchant read/write access. RSS never writes these editorial fields. Direct edits to referenced metaobjects do not change the article reference digest; reload the editor before making simultaneous edits through separate screens.

## Enable and verify

1. Stop the running development server, then run `npm run dev` and approve the added metaobject/product scopes if Shopify prompts. Existing explicit `SCOPES` environment values must include `read_content,write_content,read_metaobjects,write_metaobjects,read_products`.
2. Open a story's Art direction editor. Add two editorial image blocks and related references. Save, reload, and confirm the values persist. A permissions/definition warning means the new configuration has not yet been applied.
3. Edit native article HTML or captions in Shopify, run a Journal sync, and confirm the edits and original date survive.
4. Change the title in Shopify and sync again. Confirm it remains unchanged. Delete a test article and reload the app; it must disappear without being recreated by the next sync.
5. Install the updated Journal theme sections and templates, then verify the supplied screenshot layout, category links and editorial block rendering in the actual store theme.

## Automatic sync

The application includes a secured `/api/sync` endpoint and a separate worker. Set the deployed `SHOPIFY_APP_URL` and a random `CRON_SECRET` for both server and worker, then run `npm run worker` as a persistent hosting service alongside the web service. Node 22 or later is required for the worker command. It polls every five minutes and the endpoint respects each shop's configured interval and enabled flag. Hosting must keep the worker running; this change does not provision a hosting service. Do not run the worker and an external cron simultaneously.

## Verification status

Run `npm run verify:feed` to repeat public-feed parsing and edit-protection checks. The October 20, 2026 run found seven posts, 21 inline images and five captions, with the earliest publication on March 21, 2024. The machine-readable output is [feed-validation.json](feed-validation.json). Twenty automated tests and TypeScript checks pass. This report does not perform live Shopify article mutations or prove that source image URLs will remain available indefinitely.

Unit tests cover original dates, image/caption preservation, selective metadata locking, deleted-article reconciliation, schedule eligibility, editorial validation, staging and compare-digest writes. TypeScript, production build, GraphQL schema validation and Shopify CLI configuration validation pass locally. Live authenticated create/edit/delete and metaobject persistence still need a development-store acceptance test after the new scopes and definitions are installed.
