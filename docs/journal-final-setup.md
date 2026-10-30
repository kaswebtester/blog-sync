# Roseland Journal setup

The implementation uses the supplied screenshot as the visual reference, with the Remix app importing native Shopify articles and theme files rendering the storefront. Full-size Figma specifications have not been inspected; final visual review in the store theme remains required.

## Install theme files

Copy these local files into matching paths in an unpublished copy of the Shopify theme:

- `theme/sections/journal-page-posts.liquid`
- `theme/sections/journal-article.liquid`
- `theme/templates/page.journal-landing.json`
- `theme/templates/blog.journal.json`
- `theme/templates/article.journal.json`

The file paths inside the theme omit the initial `theme/` directory. No theme files were uploaded automatically. The old `journal-index.liquid` is no longer used by the updated blog template and can remain without affecting the new template.

## Assign and preview

1. Assign the `journal-landing` page template to **Journal Landing Page**. Select the **Journal** blog in its section settings.
2. Assign the `journal` blog template to the Journal blog. Tagged category pages then reuse the same screenshot-based section; active categories are underlined and pagination preserves the selected category.
3. Articles use the `journal` article template. Newly imported stories already request it. Confirm the template on existing posts.
4. Create a Shopify URL redirect from `/journal` to `/pages/journal-landing-page`. The app's current access token cannot create navigation redirects, so this remains a one-time Shopify admin step. This is a redirect entry point, not an alternate native Shopify route. Native articles remain at `/blogs/<blog-handle>/<article-handle>`.

Category links are enabled in the landing-page template. They open Shopify's native tagged blog URLs, where the section uses the current filtered blog and pagination. Categories appear when published articles have matching tags. Existing saved theme settings may need **Show category links** enabled manually.

## Simple editing workflow

1. Click **Sync Journal** to import the public Substack feed as native Shopify articles.
2. Use **Edit in Shopify** to edit imported text, images and captions. Subsequent RSS syncs never update the body, images or original publication date. Titles, excerpts and tags update only while they still match the saved import baseline; manual changes lock each field.
3. Use **Art direction** for additional editorial blocks and related products or stories. Blocks can be added, removed and reordered. They appear after the native article body. Duplicate HTML layout shortcuts and manual related-link controls have been removed from this editor.

The scheduled sync requires the hosted worker described below. Theme installation, `/journal` redirect creation and live storefront acceptance checks remain deployment steps.

## Editorial content

In the app, open **Art direction → Structured editorial content**. Add and reorder text, image, wide-image, two-image, image/text and pull-quote blocks. Select related products and Journal stories, then save. The article template reads the public app-owned metafields and metaobjects and displays this content after the native body. Configure its optional headings and visibility in the article section settings. These data additions do not replace or rewrite existing body HTML.

The article namespace defaults to `app--440567988225`, matching the currently connected app. New app installations under a different app ID need the resolved namespace set once in **Journal article → Editorial metafield namespace**. The definitions and product/metaobject scopes must already have been applied to the development store through Shopify CLI.

## Check the RSS workflow

Run Sync Journal, edit a native article's paragraphs/images/captions in Shopify, then run Sync Journal again. Verify those edits and the original publication date remain. Change its title and confirm subsequent metadata sync preserves it. Toggle Show on storefront off/on: the article must stay in the app list while storefront visibility changes.

The public feed has no category tags in the checked snapshot. Assign New Products, Making, Materials, Design History or People & Places in Shopify/app, or choose a fallback category for future imports. Filters are generated from actual assigned tags, not empty category placeholders.

Images remain native article markup with source CDN URLs, not iframes or embedded Substack posts. Inline files are not mirrored into Shopify Files. An image override can be selected for the landing-page hero.

## Automatic sync

Run `npm run worker` as a persistent process on the deployed host with the correct `SHOPIFY_APP_URL` and `CRON_SECRET`. It polls every five minutes; the app's scheduled-sync setting controls eligibility and intervals. The worker has not been started or hosted automatically. The existing dependency security advisories still need review before production deployment.

## Validation

The 25 existing tests and TypeScript checks pass. Both sections and all three templates passed Shopify Liquid validation using cached schemas. Live theme rendering, external image availability, background-worker operation, category navigation and saved-metaobject display still need acceptance checks after installation on the store.
