# Journal Landing Page in Shopify Pages

The current design follows the latest supplied screenshot: warm cream background, a centered serif Journal heading and introduction, one large image with white overlaid story information, then three story cards. Source article titles, dates and images remain native Shopify content.

Replace both `sections/journal-page-posts.liquid` and `templates/page.journal-landing.json` in the theme to apply the new layout defaults. If the theme already has saved section settings you wish to preserve, update the section and manually set **Show large featured story** on, **Posts per page** to 4, **Desktop columns** to 3 and **Show excerpts** off. The JSON template supplies the reference colors and introduction for a fresh setup.

Choose **Featured article** to curate the hero and **Featured image override** to upload the furniture photo from your design. Without overrides, the newest published story and its featured image are used. With the default newest story, the first page shows one hero and three cards. A curated hero outside the current pagination page can show four cards beneath it; source articles are never discarded to force a layout. Existing theme header and footer remain in place. Live theme upload and visual review are still required.

Created a draft page in `customizeproduc.myshopify.com`:

- Title: **Journal Landing Page**
- Shopify page ID: `160711573606`
- Handle: `journal-landing-page`
- Template: `journal-landing`
- Published URL after release: `/pages/journal-landing-page`

## Finish theme setup

The app's current token can create content but does not grant theme-file access. No theme files were uploaded or changed in Shopify. Install these two local files in the store theme before publishing the page:

1. Copy `theme/sections/journal-page-posts.liquid` to **sections/journal-page-posts.liquid**.
2. Copy `theme/templates/page.journal-landing.json` to **templates/page.journal-landing.json**.
3. In Shopify's theme editor, open **Pages → journal-landing**, select **Journal page posts**, and choose the blog containing your imported posts. The default handle is `journal`, but any blog can be selected.
4. Preview the draft page, then set the page to Visible in Shopify Pages when ready.

The page title can remain Journal Landing Page while its visible heading is customized in the section settings. Native published blog articles appear with image, title, original date and excerpt, with pagination. Draft/disabled articles are excluded by Shopify. No Liquid needs to be pasted into the page body. The existing theme supplies its header and footer. No locale merge is required for this standalone section; the empty message is editable in section settings.

## Dynamic controls

Replace the section code in Shopify after local changes. Open **Customize → Pages → journal-landing → Journal page posts** to edit:

- Source blog, heading visibility/text/alignment, introduction and empty message.
- Feature-newest-story toggle, posts per page, image visibility/shape/fit, category labels, original date visibility/format, excerpt visibility/word count and read-more links/text.
- Optional category links and their labels. These links open native blog category pages, rather than filtering the standard page in place.
- Desktop/mobile columns, content width, card spacing, top/bottom padding, heading/title sizes and background/text/link colors.

All story data comes from the selected Shopify blog. There is no hardcoded blog fallback in the section; the provided JSON template initially selects the `journal` blog and the theme editor can change it. The newest story is featured on the first page only when enabled. Existing imported article records and the app's admin settings are not modified by these display controls. Theme header/footer settings continue to be managed in their own theme sections.

The optional utility `node --env-file=.env scripts/create-journal-page.mjs <shop.myshopify.com>` checks for this handle and creates the draft only when absent. It does not overwrite an existing page or publish one.
