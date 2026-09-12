import re, os

SITE = "/home/claude/site/templates"

def find_balanced_div(content, open_tag_str, start_search=0):
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
    return (content[:inner_start]
            + f"\n<!-- BUILD:{block_name} -->\n<!-- END:{block_name} -->\n      "
            + content[inner_end:])

def wrap_select_options(content, select_open_str, block_name):
    start = content.index(select_open_str)
    inner_start = start + len(select_open_str)
    end = content.index("</select>", inner_start)
    return (content[:inner_start]
            + f"\n<!-- BUILD:{block_name} -->\n<!-- END:{block_name} -->\n            "
            + content[end:])

def load(fname):
    with open(os.path.join(SITE, fname), encoding="utf-8") as f:
        return f.read()

def save(fname, content):
    with open(os.path.join(SITE, fname), "w", encoding="utf-8") as f:
        f.write(content)
    print("marked:", fname)

TARIFF_FILES = [
    "index.html", "kanevskaya.html", "novominskaya.html",
    "novoderevyankovskaya.html", "staroderevyanovskaya.html",
    "yeysk.html", "tariffs.html",
]
for fname in TARIFF_FILES:
    c = load(fname)
    c = wrap_div_block(c, '<div class="tariff-grid">', "TARIFF_GRID")
    save(fname, c)

ROUTER_SELECT_FILES = [
    "index.html", "kanevskaya.html", "novominskaya.html",
    "novoderevyankovskaya.html", "staroderevyanovskaya.html", "yeysk.html",
]
for fname in ROUTER_SELECT_FILES:
    c = load(fname)
    c = wrap_select_options(c, '<select id="router" name="router">', "ROUTER_OPTIONS")
    save(fname, c)
    c = load(fname)
    c = wrap_select_options(c, '<select id="tariff" name="tariff">', "TARIFF_OPTIONS")
    save(fname, c)

c = load("index.html")
c = wrap_div_block(c, '<div class="router-grid">', "ROUTER_GRID")
save("index.html", c)

# JSON-LD: агрегированные цены на страницах населённых пунктов
PRICE_JSONLD_FILES = [
    "kanevskaya.html", "novominskaya.html",
    "novoderevyankovskaya.html", "staroderevyanovskaya.html", "yeysk.html",
]
for fname in PRICE_JSONLD_FILES:
    c = load(fname)
    c = c.replace('"lowPrice": "920"', '"lowPrice": "{{PRICE_MIN}}"')
    c = c.replace('"highPrice": "1380"', '"highPrice": "{{PRICE_MAX}}"')
    c = c.replace('"offerCount": "3"', '"offerCount": "{{OFFER_COUNT}}"')
    save(fname, c)

# JSON-LD hasOfferCatalog на главной — токен (НЕ HTML-комментарии, т.к. внутри <script>)
c = load("index.html")
start = c.index('"itemListElement": [')
inner_start = start + len('"itemListElement": [')
depth = 1
pos = inner_start
while depth > 0:
    ch = c[pos]
    if ch == '[':
        depth += 1
    elif ch == ']':
        depth -= 1
    pos += 1
inner_end = pos - 1
c = c[:inner_start] + "\n{{TARIFF_OFFERS}}\n    " + c[inner_end:]
save("index.html", c)

print("Готово: все метки расставлены на актуальных файлах.")
