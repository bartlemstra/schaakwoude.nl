"""Haal de gepubliceerde inhoud uit de SQL-exports van de oude sites.

Gebruik:
    python3 migratie/exporteer_wp.py <wordpress.sql> <drupal.sql> migratie/uit/wp.json

Alleen openbare inhoud gaat mee: gepubliceerde berichten en pagina's, TablePress-
tabellen, het menu, de URL's van bijlagen en de oude Drupal-adressen (voor
doorverwijzingen). Van gebruikers wordt alleen de weergavenaam bewaard, omdat die
al als auteur boven berichten stond. E-mailadressen, wachtwoord-hashes en andere
persoonsgegevens worden nooit ingelezen. De SQL-bestanden zelf horen niet in git.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from mysqldump import load  # noqa: E402

WP_TABELLEN = {"wp_posts", "wp_postmeta", "wp_options", "wp_users"}
DRUPAL_TABELLEN = {"node", "url_alias"}


def main(wp_pad, drupal_pad, uit_pad):
    wp = load(wp_pad, WP_TABELLEN)
    posts = wp["wp_posts"]
    meta = {}
    for m in wp["wp_postmeta"]:
        meta.setdefault(m["post_id"], {})[m["meta_key"]] = m["meta_value"]
    opties = {o["option_name"]: o["option_value"] for o in wp["wp_options"]}
    auteurs = {u["ID"]: u["display_name"] for u in wp["wp_users"]}
    per_id = {p["ID"]: p for p in posts}

    def item(p):
        return {
            "id": int(p["ID"]),
            "type": p["post_type"],
            "slug": p["post_name"],
            "titel": p["post_title"],
            "datum": p["post_date"],
            "gewijzigd": p["post_modified"],
            "auteur": auteurs.get(p["post_author"]),
            "ouder": int(p["post_parent"] or 0),
            "volgorde": int(p["menu_order"] or 0),
            "samenvatting": p["post_excerpt"],
            "inhoud": p["post_content"],
            "uitgelicht": int(meta.get(p["ID"], {}).get("_thumbnail_id") or 0) or None,
        }

    inhoud = [item(p) for p in posts
              if p["post_status"] == "publish" and p["post_type"] in ("post", "page")]

    bijlagen = {
        int(p["ID"]): {"url": p["guid"], "alt": meta.get(p["ID"], {}).get("_wp_attachment_image_alt", "")}
        for p in posts if p["post_type"] == "attachment"
    }

    tabel_posts = json.loads(opties.get("tablepress_tables", "{}")).get("table_post", {})
    tabellen = {}
    for tid, pid in tabel_posts.items():
        p = per_id.get(str(pid))
        if p and p["post_status"] == "publish":
            tabellen[tid] = {"titel": p["post_title"], "rijen": json.loads(p["post_content"])}

    menu = []
    for p in posts:
        if p["post_type"] != "nav_menu_item" or p["post_status"] != "publish":
            continue
        m = meta.get(p["ID"], {})
        doel = per_id.get(m.get("_menu_item_object_id", ""))
        menu.append({
            "volgorde": int(p["menu_order"]),
            "label": p["post_title"] or (doel["post_title"] if doel else ""),
            "url": m.get("_menu_item_url") or None,
            "pagina": int(doel["ID"]) if doel and m.get("_menu_item_type") == "post_type" else None,
        })

    drupal = load(drupal_pad, DRUPAL_TABELLEN)
    node_titels = {n["nid"]: n["title"] for n in drupal["node"] if n.get("status") == "1"}
    drupal_adressen = [
        {"pad": a["alias"], "node": a["source"], "titel": node_titels.get(a["source"].split("/")[-1])}
        for a in drupal["url_alias"]
    ]

    uit = {
        "site": {k: opties.get(k) for k in ("blogname", "blogdescription", "permalink_structure", "home")},
        "inhoud": inhoud,
        "bijlagen": bijlagen,
        "tabellen": tabellen,
        "menu": sorted(menu, key=lambda m: m["volgorde"]),
        "drupal_adressen": drupal_adressen,
    }
    os.makedirs(os.path.dirname(uit_pad) or ".", exist_ok=True)
    with open(uit_pad, "w", encoding="utf-8") as f:
        json.dump(uit, f, ensure_ascii=False)
    print(f"{len(inhoud)} items, {len(tabellen)} tabellen, {len(bijlagen)} bijlagen, "
          f"{len(drupal_adressen)} Drupal-adressen -> {uit_pad}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
