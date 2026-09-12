import re, os

SITE = "/home/claude/site/templates"

def find_balanced_div(content, open_tag_str, start_search=0):
    """Находит позицию открывающего div (по open_tag_str, напр. '<div class="tariff-grid">')
    и позицию ПОСЛЕ соответствующего закрывающего </div>, с учётом вложенности."""
    start = content.index(open_tag_str, start_search)
    pos = start + len(open_tag_str)
    depth = 1
    tag_re = re.compile(r'<div\b[^>]*>|</div>')
    for m in tag_re.finditer(content, pos):
        if m.group(0).startswith('</div>'):
            depth -= 1
            if depth == 0:
                return start, m.end()
        else:
            depth += 1
    raise ValueError("Не нашёл закрывающий </div> для " + open_tag_str)

def wrap_div_block(content, open_tag_str, block_name):
    start, end = find_balanced_div(content, open_tag_str)
    inner_start = start + len(open_tag_str)
    inner_end = end - len('</div>')
    new_content = (
        content[:inner_start]
        + f"\n<!-- BUILD:{block_name} -->\n<!-- END:{block_name} -->\n      "
        + content[inner_end:]
    )
    return new_content

def wrap_select_options(content, select_open_str, block_name):
    start = content.index(select_open_str)
    inner_start = start + len(select_open_str)
    end = content.index("</select>", inner_start)
    new_content = (
        content[:inner_start]
        + f"\n<!-- BUILD:{block_name} -->\n<!-- END:{block_name} -->\n            "
        + content[end:]
    )
    return new_content

def load(fname):
    with open(os.path.join(SITE, fname), encoding="utf-8") as f:
        return f.read()

def save(fname, content):
    with open(os.path.join(SITE, fname), "w", encoding="utf-8") as f:
        f.write(content)
    print("marked:", fname)

# ---- 1. TARIFF_GRID во всех файлах с тарифами ----
TARIFF_FILES = [
    "index.html", "kanevskaya.html", "novominskaya.html",
    "novoderevyankovskaya.html", "staroderevyanovskaya.html",
    "yeysk.html", "tariffs.html",
]
for fname in TARIFF_FILES:
    c = load(fname)
    c = wrap_div_block(c, '<div class="tariff-grid">', "TARIFF_GRID")
    save(fname, c)

# ---- 2. ROUTER_OPTIONS в формах (select#router) ----
ROUTER_SELECT_FILES = [
    "index.html", "kanevskaya.html", "novominskaya.html",
    "novoderevyankovskaya.html", "staroderevyanovskaya.html", "yeysk.html",
]
SELECT_OPEN = '<select id="router" name="router">'
for fname in ROUTER_SELECT_FILES:
    c = load(fname)
    c = wrap_select_options(c, SELECT_OPEN, "ROUTER_OPTIONS")
    save(fname, c)

# ---- 3. ROUTER_GRID на главной (карточки роутеров с картинками) ----
c = load("index.html")
c = wrap_div_block(c, '<div class="router-grid">', "ROUTER_GRID")
save("index.html", c)

# ---- 4. Токены цен в JSON-LD (AggregateOffer / hasOfferCatalog) ----
# Меняем только внутри <script type="application/ld+json"> блоков, точечно по известным значениям.
PRICE_JSONLD_FILES = [
    "index.html", "kanevskaya.html", "novominskaya.html",
    "novoderevyankovskaya.html", "staroderevyanovskaya.html", "yeysk.html",
]
for fname in PRICE_JSONLD_FILES:
    c = load(fname)
    c = c.replace('"lowPrice": "920"', '"lowPrice": "{{PRICE_MIN}}"')
    c = c.replace('"highPrice": "1380"', '"highPrice": "{{PRICE_MAX}}"')
    c = c.replace('"offerCount": "3"', '"offerCount": "{{OFFER_COUNT}}"')
    save(fname, c)

print("Готово: метки расставлены.")
