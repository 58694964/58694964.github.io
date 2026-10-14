#!/usr/bin/env python3
"""Build three self-contained static pages per language from one app configuration."""
import argparse
import html
import json
import re
from pathlib import Path
from string import Template
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "_templates" / "app-site"
PAGES = {"home": "index.html", "privacy": "deepPrivacy.html", "agreement": "deepAgreement.html"}

def esc(value):
    return html.escape(str(value), quote=True)

def render_text(value, config):
    # Content is escaped. Only known tokens can introduce links; raw HTML is not accepted.
    value = esc(value)
    tokens = {"app": "<bdi>" + esc(config["app_name"]) + "</bdi>",
              "email": '<a href="mailto:' + esc(config["support_email"]) + '">' + esc(config["support_email"]) + '</a>'}
    for key, item in config["services"].items():
        tokens[key] = '<a href="' + esc(item["url"]) + '">' + esc(item["name"]) + '</a>'
    for key, replacement in tokens.items():
        value = value.replace("[[" + key + "]]", replacement)
    if re.search(r"\[\[.+?\]\]", value):
        raise ValueError("Unknown content token: " + value)
    return value

def paragraphs(values, config):
    return "\n".join("<p>" + render_text(value, config) + "</p>" for value in values)

def make_page(kind, locale, config):
    language = config["languages"][locale]
    current = language[kind]
    filename = PAGES[kind]
    content_data = {}
    if kind == "home":
        content_data = {key: esc(current[key]) for key in ["headline", "platform", "pricing_heading", "price", "pricing_text", "support_heading", "faq_heading", "contact_heading", "contact_text", "contact_action"]}
        content_data.update(intro=paragraphs(current["intro"], config),
            features="\n".join("<li><strong>" + esc(item[0]) + "</strong> — " + render_text(item[1], config) + "</li>" for item in current["features"]),
            faqs="\n".join('<div class="faq-item"><h4>' + esc(item[0]) + "</h4><p>" + render_text(item[1], config) + "</p></div>" for item in current["faqs"]),
            email_subject=quote(config["app_name"] + " — " + current["support_heading"]))
    else:
        sections = []
        toc = []
        for index, section in enumerate(current["sections"], 1):
            title = str(index) + ". " + section["title"]
            toc.append('<li><a href="#section-' + str(index) + '">' + esc(section["title"]) + '</a></li>')
            body = paragraphs(section.get("paragraphs", []), config)
            if section.get("items"):
                body += "<ul>" + "".join("<li>" + render_text(item, config) + "</li>" for item in section["items"]) + "</ul>"
            sections.append('<section id="section-' + str(index) + '"><h2>' + esc(title) + '</h2>' + body + '</section>')
        content_data.update(page_heading=esc(current["label"]), metadata=render_text(language["applies"] + " [[app]]", config) + " · " + esc(language["effective"]) + ' <time datetime="' + esc(config["effective_date"]) + '">' + esc(config["effective_date"]) + "</time>",
            summary=paragraphs(current["summary"], config), toc="\n".join(toc), sections="\n".join(sections),
            toc_label=esc(language["contents"]), toc_heading=esc(language["contents"]), back_label=esc(language["back"] + " " + config["app_name"]))
    common = {"app_name": esc(config["app_name"]), "email": esc(config["support_email"]), "icon_alt": esc(config["app_name"] + " " + language["icon_label"])}
    content = Template((TEMPLATES / filename).read_text()).substitute(common | content_data)
    language_links = []
    for code, other in config["languages"].items():
        active = ' aria-current="page"' if code == locale else ''
        language_links.append('<a lang="' + esc(other["html_lang"]) + '" hreflang="' + esc(other["html_lang"]) + '" href="../' + esc(code) + '/' + filename + '"' + active + '>' + esc(other["language_name"]) + '</a>')
    footer_links = []
    for key, page in PAGES.items():
        active = ' aria-current="page"' if key == kind else ''
        footer_links.append('<a href="' + page + '"' + active + '>' + esc(language[key]["label"]) + '</a>')
    data = common | dict(content=content, lang=esc(language["html_lang"]), title=esc(current["label"] + " — " + config["app_name"]),
        description=esc(current["description"]), canonical=esc(config["site_url"].rstrip('/') + '/' + locale + '/' + filename),
        alternate_en=esc(config["site_url"].rstrip('/') + '/en/' + filename), alternate_zh=esc(config["site_url"].rstrip('/') + '/zh/' + filename),
        css=(TEMPLATES / "styles.css").read_text(), language_links="".join(language_links), footer_links="".join(footer_links),
        skip_label=esc(language["skip"]), navigation_label=esc(language["navigation"]), language_label=esc(language["language_label"]),
        footer_label=esc(language["footer"]), year=esc(config["copyright_year"]))
    result = Template((TEMPLATES / "layout.html").read_text()).substitute(data)
    if "[[" in result:
        raise ValueError("Unresolved template marker")
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("app", help="App slug, such as calculator")
    parser.add_argument("--check", action="store_true", help="Check generated pages without changing files")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.app):
        parser.error("Invalid app slug")
    config = json.loads((ROOT / "_data" / "apps" / (args.app + ".json")).read_text())
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", config["support_email"]):
        raise ValueError("A real support email is required")
    for locale in config["languages"]:
        if not re.fullmatch(r"[a-z]{2}(?:-[A-Za-z]{2})?", locale):
            raise ValueError("Invalid language directory")
        for kind, filename in PAGES.items():
            target = ROOT / args.app / locale / filename
            result = make_page(kind, locale, config)
            if args.check:
                if not target.exists() or target.read_text() != result:
                    raise ValueError("Generated page out of date: " + str(target))
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(result)
            print(("Checked " if args.check else "Built ") + str(target.relative_to(ROOT)))

if __name__ == "__main__":
    main()
