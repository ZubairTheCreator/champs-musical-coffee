#!/usr/bin/env python3
"""Pre-handoff verifier for a built client site.

Run from inside the site folder:   python verify.py
Or point it anywhere:              python verify.py path/to/site

Checks the things that are cheap to get wrong and expensive to ship:
unique titles/descriptions, one H1, alt text, valid JSON-LD, broken internal
links, NAP drift between pages, and leftover template placeholders.

Exit code 0 = clean, 1 = blocking failures found.
No dependencies. It does not open a browser, so it cannot check layout —
walk LAUNCH-CHECKLIST.md for that.
"""

import json
import os
import re
import sys
from collections import Counter

INDEXABLE = ("index.html", "services.html", "gallery.html", "about.html", "contact.html")

# Strings that mean the template was never filled in. Any hit is a hard fail.
LEAKS = [
    "YOUR_FORM_ID",
    "Placeholder Name",
    "Founder Name",
    "placeholder.svg",
    "Replace this with",
    "Lorem ipsum",
    'class="notice"',
    "bergviewhome.co.za",
    "Bergview Home Services",
    "021 000 0000",
    "082 000 0000",
    "+27210000000",
    "27820000000",
    "12 Dorp Street",
]

fails, warns = [], []


def fail(msg):
    fails.append(msg)


def warn(msg):
    warns.append(msg)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def main(root):
    os.chdir(root)
    pages = sorted(p for p in os.listdir(".") if p.endswith(".html"))
    if not pages:
        print(f"No HTML files in {root}")
        return 1

    docs = {p: read(p) for p in pages}

    # ---- unique, well-formed metadata on every indexable page ----------------
    titles, descs = {}, {}
    for p in pages:
        s = docs[p]
        noindex = "noindex" in (re.search(r'name="robots" content="([^"]*)"', s) or [""])[0] \
            if re.search(r'name="robots" content="([^"]*)"', s) else False
        noindex = bool(re.search(r'name="robots"[^>]*content="[^"]*noindex', s))

        t = re.search(r"<title>(.*?)</title>", s, re.S)
        d = re.search(r'<meta name="description" content="(.*?)">', s, re.S)
        h1 = re.findall(r"<h1[\s>]", s)

        if not t:
            fail(f"{p}: no <title>")
        elif len(t.group(1)) > 60:
            warn(f"{p}: title is {len(t.group(1))} chars, will truncate in search results")

        if not d:
            fail(f"{p}: no meta description")
        elif not noindex and not 120 <= len(d.group(1)) <= 165:
            warn(f"{p}: description is {len(d.group(1))} chars (aim for 150-160)")

        if len(h1) != 1:
            fail(f"{p}: has {len(h1)} <h1>, needs exactly 1")

        if not noindex and not re.search(r'rel="canonical"', s):
            fail(f"{p}: no canonical link")

        if t:
            titles.setdefault(t.group(1), []).append(p)
        if d:
            descs.setdefault(d.group(1), []).append(p)

    for value, where in titles.items():
        if len(where) > 1:
            fail(f"duplicate <title> on {', '.join(where)}")
    for value, where in descs.items():
        if len(where) > 1:
            fail(f"duplicate meta description on {', '.join(where)}")

    # ---- structured data parses ---------------------------------------------
    found_local_business = False
    for p in pages:
        for i, block in enumerate(re.findall(
                r'<script type="application/ld\+json">(.*?)</script>', docs[p], re.S)):
            try:
                data = json.loads(block)
            except json.JSONDecodeError as exc:
                fail(f"{p}: JSON-LD block {i} does not parse ({exc})")
                continue
            t = str(data.get("@type", ""))
            if t and t != "BreadcrumbList":
                found_local_business = True
                for required in ("name", "telephone", "address", "url"):
                    if required not in data:
                        fail(f"{p}: business schema is missing '{required}'")
    if not found_local_business:
        fail("no LocalBusiness-type JSON-LD anywhere — local search needs it")

    # ---- images ------------------------------------------------------------
    alts = []
    for p in pages:
        for tag in re.findall(r"<img\b[^>]*>", docs[p]):
            m = re.search(r'alt="([^"]*)"', tag)
            if not m:
                fail(f"{p}: <img> with no alt attribute")
            elif not m.group(1).strip():
                fail(f"{p}: <img> with empty alt")
            else:
                alts.append(m.group(1))
    for alt, n in Counter(alts).items():
        if n > 1:
            warn(f"alt text reused {n}x: \"{alt[:50]}\"")

    # ---- internal links resolve ---------------------------------------------
    for p in pages:
        for ref in re.findall(r'(?:href|src)="([^"]+)"', docs[p]):
            if ref.startswith(("http://", "https://", "tel:", "mailto:", "#", "data:")):
                continue
            target = ref.split("#")[0].split("?")[0].lstrip("/")
            if target and not os.path.exists(target):
                fail(f"{p}: broken link -> {ref}")

    # ---- NAP is byte-identical everywhere -----------------------------------
    def footer_of(s):
        m = re.search(r"<footer.*?</footer>", s, re.S)
        return m.group(0) if m else ""

    naps = {}
    for p in pages:
        nap = re.findall(r'href="(tel:[^"]+|mailto:[^"]+)"', footer_of(docs[p]))
        if nap:
            naps.setdefault(tuple(sorted(set(nap))), []).append(p)
    if len(naps) > 1:
        fail("footer phone/email differs between pages: "
             + " || ".join(f"{','.join(v)}={list(k)}" for k, v in naps.items()))

    # ---- form is actually wired --------------------------------------------
    for p in pages:
        for form in re.findall(r"<form\b[^>]*>", docs[p]):
            action = re.search(r'action="([^"]*)"', form)
            if not action or not action.group(1).strip():
                fail(f"{p}: <form> with no action — submissions go nowhere")
            elif "YOUR_FORM_ID" in action.group(1):
                fail(f"{p}: form action still has the placeholder endpoint")

    # ---- nothing from the template survived ---------------------------------
    # Aggregated: one line per leaked string, not one per string per file.
    leak_hits = {}
    for p in pages + [f for f in ("robots.txt", "sitemap.xml") if os.path.exists(f)]:
        s = docs.get(p) or read(p)
        for leak in LEAKS:
            if leak in s:
                leak_hits.setdefault(leak, []).append(p)
    for leak, where in leak_hits.items():
        shown = ", ".join(where[:4]) + (f" +{len(where) - 4} more" if len(where) > 4 else "")
        fail(f"template placeholder {leak!r} still in {shown}")

    # ---- sitemap / robots sanity -------------------------------------------
    if os.path.exists("sitemap.xml"):
        # Comments explain what is deliberately absent; matching against them
        # reports the opposite of the truth.
        sm = re.sub(r"<!--.*?-->", "", read("sitemap.xml"), flags=re.S)
        for page in INDEXABLE:
            slug = "/" if page == "index.html" else "/" + page
            if slug not in sm:
                warn(f"sitemap.xml does not list {slug}")
        for bad in ("thanks.html", "404.html"):
            if bad in sm:
                fail(f"sitemap.xml lists {bad}, which is noindex")
    else:
        fail("no sitemap.xml")

    if not os.path.exists("robots.txt"):
        fail("no robots.txt")
    elif "Sitemap:" not in read("robots.txt"):
        fail("robots.txt has no Sitemap: line")

    # ---- report -------------------------------------------------------------
    for w in warns:
        print(f"WARN  {w}")
    for f in fails:
        print(f"FAIL  {f}")
    print()
    if fails:
        print(f"{len(fails)} blocking issue(s), {len(warns)} warning(s). Not ready to hand over.")
        return 1
    print(f"Clean. {len(warns)} warning(s). Now walk LAUNCH-CHECKLIST.md — "
          "layout, mobile and the live form test are not checkable from here.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))
