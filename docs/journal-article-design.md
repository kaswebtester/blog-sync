# Journal article designs

Both designs use `templates/article.journal.json` and `sections/journal-article.liquid`. The app stores the per-post choice in `$app.article_design`: `standard` or `custom`. Liquid puts `ro-article--standard` or `ro-article--custom` on the article, plus `data-journal-design` for inspection. An absent value defaults to Standard.

## Fixed namespace mismatch

The connected app was verified through Shopify Admin API as app ID `440567988225`. Its saved fields live in `app--440567988225`, with PUBLIC_READ access. The previous theme default, `app--437612380161`, belonged to another app and silently hid the saved design and sections.

The section and JSON template now use the verified namespace. If existing saved theme settings still point at the old namespace, the section falls back to the verified namespace when it finds the article's saved design there. The app editor also shows the namespace returned by Shopify. For another app installation, set the correct namespace in the theme editor.

## Install

1. Replace the theme's `sections/journal-article.liquid` with the latest local file. Its CSS and JavaScript are self-contained; copy the entire file, including the stylesheet and javascript tags.
2. Update `templates/article.journal.json` from the local file, or preserve existing template settings and set **Editorial metafield namespace** to `app--440567988225`, **Arrange imported article images and quotes** on, reading width to 640px, body size to 18px and title size to 28px.
3. Keep the post's template set to **journal**. In the app, select the design and save editorial content. Reload the storefront.

In the theme editor, the diagnostic line shows the resolved design, content mode and namespace. It is not visible to storefront visitors. Inspect the article element to confirm the rendered design class. Editing local files does not upload them to Shopify.

## Imported article body

With **Article body, then sections**, the original HTML remains the content source. A small theme script arranges its existing nodes without rewriting or saving the source:

- Standard: narrow introductory text, full editorial images, paired adjacent photos. A four-photo gallery keeps the first and last full width and pairs the two middle photos.
- Custom: the opening photo spans 1120px with a 2:1 crop. The script recognizes a standalone italic paragraph enclosed in quotation marks as a pull quote. When the quote follows a single photo preceded by paragraphs, those paragraphs and that photo become a two-column row. Adjacent workshop photos become a pair.
- Text remains at the configured reading width (640px in the supplied template), editorial photos at 930px, with uppercase captions and centered serif headings.
- On mobile, text/image and two-text-column rows stack; paired photos remain side by side.

The actual Designing the Roseland Bed article was checked: all seven images, original links and captions are preserved, with one hero, one text/image row, one quote and one pair. The separate native featured image is suppressed when the imported body already contains images.

Automatic arrangement uses the structure of the source, rather than inventing quotes or captions. Turn it off in section settings for an article whose structure should be preserved, or manage that article through explicit sections.

## Manual article sections

Choose **Sections only** to replace the displayed body with the saved ordered sections. The original body remains saved in Shopify. Add text, two-column text, image, wide image, image pair, text with image or pull quote. Use the move/remove controls to manage order.

**Use existing article as sections** copies supported text, photos, figure captions and quotes into the section editor when there are no filled sections. It switches to Sections only. Imported text becomes plain text; review links and emphasis. Embedded media/tables block conversion. The original article HTML remains intact.

**Revert to original article** selects **Original article only — keep sections saved**. Click **Save editorial content** to apply it. The storefront displays the native article body and hides all editorial sections, preventing duplicate content. Your sections, design choice and related references stay saved. **Use saved sections again** switches back to the existing sections; save again to apply. Reverting also works after saving and reloading the editor. Upload the latest Liquid section for the new Original mode to work.

If manual sections are hidden or unavailable, the theme falls back to displaying the native body. RSS sync does not overwrite the saved design or editorial fields.

## Scope and verification

The surrounding header, menus, announcement bar and footer come from the installed Shopify theme. They are not recreated by this article section. Exact annotated Figma font metadata has not been obtained; the article uses Georgia/Times serif fallbacks based on the supplied screenshots.

Regression tests render the Liquid and execute its layout script against a DOM to verify namespace fallback, standard/custom classes, image/quote arrangements, preserved source order, no duplicate hero and manual-section fallback. Shopify CLI Theme Check and desktop/mobile browser checks cover the section separately from the app build. A final check in the actual installed theme is still necessary after upload.

Local browser previews of the corrected Design 2 article: [desktop](previews/journal-custom-desktop.png), [mobile](previews/journal-custom-mobile.png). These renders use the real imported article content and exclude the surrounding store theme header/footer.
