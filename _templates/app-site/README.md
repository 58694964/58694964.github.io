# App website templates

Three shared page templates produce one static HTML page per type and language:

- `index.html`: app introduction, price, FAQ and real email support.
- `deepPrivacy.html`: privacy policy and linked contents.
- `deepAgreement.html`: user agreement and linked contents.

`layout.html` and `styles.css` share navigation, language switching, footer, typography and responsive layout. Styling follows the existing Shortcut Alarm pages. Generated HTML embeds its CSS, uses system fonts, and works without JavaScript or external font services.

## Build and maintain

Edit `_data/apps/calculator.json`, then run from the repository root:

```sh
python3 _tools/build_app_site.py calculator
python3 _tools/build_app_site.py calculator --check
```

The output is exactly three HTML files in each of `calculator/en/` and `calculator/zh/`. The homepage is only `index.html`; do not create a `home.html` alias. Each language switch opens the equivalent page in the other language. The icon is `calculator/images/app-icon.png`, copied from the approved Ocean iOS app icon.

App name, support email, effective date, production site URL, provider links, localized copy and FAQ are stored in the app configuration. The current name comes from Calculator's approved `Brand.json`; update the website configuration when that brand changes. The Chinese website uses the same official `Calculator√` name; it does not invent a Chinese bundle name or add Chinese to the app.

To reuse for another app, copy the configuration to `_data/apps/another-app.json`, replace its real product/legal content and contact information, provide `another-app/images/app-icon.png`, then run `python3 _tools/build_app_site.py another-app`. The renderer accepts escaped plain text and known `[[app]]`, `[[email]]` and configured service-link tokens. Reusing the layout does not make another app's data-handling claims applicable.

## Publish

The repository uses GitHub Pages from `main` at `/ (root)`. Committing the generated `calculator/`, templates, tool and configuration and pushing `main` publishes the pages. Underscore-prefixed template/tool/data directories are not served by Jekyll; the three retired apps stay excluded by `_config.yml`. Preview first; these files do not publish themselves.

Production addresses after deployment:

- `/calculator/en/` and `/calculator/zh/`
- `/calculator/en/deepPrivacy.html` and `/calculator/zh/deepPrivacy.html`
- `/calculator/en/deepAgreement.html` and `/calculator/zh/deepAgreement.html`

The existing root homepage is not changed. App legal links remain separate until these URLs are published and verified. There is no placeholder App Store download button, fake form submission, tracking script or subscription copy.
