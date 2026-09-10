# _kitchen_videos_card.py -- add a "Kitchen Videos" card to the net-band on the 12
# kitchen tool pages, plus a Network-column line on the 3 hubs. The 600px asset that
# blocked this back in August is now available: the video posters.
#   --image  build /kitchen-videos-link.webp (600x299, matching studio/tales cards)
#   --apply  write the markup
# Idempotent. Per-file EOL preserved.
import io, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "kitchen-videos-link.webp")
SRC = "https://builtbyjoshstudio.com/images/books/jjk-sausage-hash-15min-poster.jpg"

CARD = '''    <a href="https://builtbyjoshstudio.com/kitchen-videos.html" target="_blank" rel="noopener" class="gear-item">
      <div class="gear-img-wrapper"><img src="/kitchen-videos-link.webp" alt="Cook-along videos from Josh &amp; Jordan's Kitchen" width="600" height="299" loading="lazy"></div>
      <div class="gear-info">
        <h3>Watch the Cooks</h3>
        <p>The same kitchen, on video — a short cut of each cook plus the full real-time version, nothing sped up.</p>
        <button class="affiliate-btn">Watch the Videos</button>
      </div>
    </a>
'''

HUB_ANCHOR = '<li><a href="https://builtbyjoshstudio.com/nuoc-mam-cookbook.html" target="_blank" rel="noopener">Nước Mắm Cookbook</a></li>'
HUB_NEW = '<li><a href="https://builtbyjoshstudio.com/kitchen-videos.html" target="_blank" rel="noopener">Kitchen Videos</a></li>'


def build_image():
    from PIL import Image, ImageOps
    req = urllib.request.Request(SRC, headers={"User-Agent": "Mozilla/5.0"})
    import io as _io
    img = Image.open(_io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
    out = ImageOps.fit(img, (600, 299), Image.LANCZOS)
    for q in (82, 76, 70, 64):
        out.save(IMG, "WEBP", quality=q, method=6)
        if os.path.getsize(IMG) <= 22000:
            break
    print("image: %s %s %d bytes" % (IMG, out.size, os.path.getsize(IMG)))


def rw(p):
    raw = io.open(p, "rb").read()
    crlf = raw.count(b"\r\n") > 0
    t = raw.decode("utf-8")
    return (t.replace("\r\n", "\n") if crlf else t), crlf


def save(p, t, crlf, apply):
    if apply:
        io.open(p, "wb").write((t.replace("\n", "\r\n") if crlf else t).encode("utf-8"))


def run(apply):
    # 1. the 12 kitchen tool pages -- card goes right after the cookbook card
    cards = 0
    for p in sorted(f for f in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, f))):
        f = os.path.join(ROOT, p, "index.html")
        if not os.path.exists(f):
            continue
        t, crlf = rw(f)
        if "/nuoc-mam-link.webp" not in t:
            continue
        if "/kitchen-videos-link.webp" in t:
            continue
        m = re.search(r'    <a href="https://builtbyjoshstudio\.com/nuoc-mam-cookbook\.html".*?\n    </a>\n', t, re.S)
        assert m, ("cookbook gear card not found", f)
        t = t[:m.end()] + CARD + t[m.end():]
        assert t.count('class="gear-item"') == len(re.findall(r'class="gear-item"', t))
        save(f, t, crlf, apply)
        cards += 1

    # 2. Network footer column on the hubs
    hubs = 0
    for rel in ("index.html", "money/index.html", "tabletop/index.html"):
        f = os.path.join(ROOT, rel)
        if not os.path.exists(f):
            continue
        t, crlf = rw(f)
        if HUB_NEW in t or HUB_ANCHOR not in t:
            continue
        assert t.count(HUB_ANCHOR) == 1, ("hub anchor not unique", f)
        t = t.replace(HUB_ANCHOR, HUB_ANCHOR + "\n            " + HUB_NEW, 1)
        save(f, t, crlf, apply)
        hubs += 1

    print("gear cards added: %d | hub network lines: %d | %s"
          % (cards, hubs, "APPLIED" if apply else "(dry-run)"))


if __name__ == "__main__":
    if "--image" in sys.argv:
        build_image()
    run("--apply" in sys.argv)
