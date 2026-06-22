#!/usr/bin/env python3
"""
GRID STELLA — ARENA asset pipeline.

Generates every game sprite with OpenAI image generation (gpt-image-1), then
processes each into an original pixel-art icon (downscale + palette quantize +
hardened alpha). Output: public/arena/<id>.png

Idempotent: existing non-empty outputs are skipped, so reruns resume after any
network hiccup. Requires OPENAI_API_KEY in the environment.
"""
import os, sys, json, time, base64, urllib.request, urllib.error
from io import BytesIO
from PIL import Image

KEY = os.environ.get("OPENAI_API_KEY")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "arena")
RAW = os.path.join(os.path.dirname(__file__), "..", "raw_assets")
os.makedirs(OUT, exist_ok=True)
os.makedirs(RAW, exist_ok=True)

STYLE = (
    "single centered pixel-art video game icon, clean flat colors, crisp thick dark "
    "outline, dark-fantasy 'celestial observation bureau' theme, metallic gold accents "
    "on near-black, subtle teal-steel and bone highlights, no text, no lettering, no "
    "drop shadow, transparent background, object centered and filling the frame"
)

# id -> subject prompt
ITEMS = {
    "blade":   "a glowing golden curved short sword / arc saber",
    "twin":    "two crossed silver twin daggers",
    "gsword":  "a large rusted two-handed greatsword pointing up",
    "axe":     "a heavy double-bladed battle greataxe",
    "maul":    "a massive iron warhammer / maul",
    "shield":  "a round steel guardian shield with an engraved gold star emblem",
    "plate":   "a polished steel chest breastplate armor",
    "potion":  "a round glass flask of glowing red healing tonic with a cork",
    "vial":    "a small glass vial of bubbling green poison",
    "bomb":    "a round black bomb with a lit orange fuse",
    "ember":   "a single bright flame ember, orange and gold fire",
    "censer":  "a hanging brass incense censer trailing violet smoke",
    "fang":    "a curved dripping green serpent venom fang",
    "coin":    "a single shiny gold coin stamped with a star",
    "ledger":  "an open brown leather merchant ledger book with gold pages",
    "scales":  "a golden balance scale of justice",
    "ring":    "an ornate golden ring band with a tiny gem",
    "gem":     "a faceted glowing violet crystal prism shard",
    "lens":    "a brass focusing lens / magnifier with a glowing glass eye",
    "star":    "a radiant four-point golden stellar core star, glowing",
    "orb":     "a glowing golden comet orb sphere with a tail",
    "sigil":   "an arcane circular eclipse rune sigil, gold on black",
}
JOBS = {
    "job_sentinel": "a heraldic emblem of a crossed sword and round shield, steel and gold, dark-fantasy crest",
    "job_catalyst": "a heraldic emblem of a poison flask crossed with a flame, emerald green and violet, alchemist crest",
    "job_broker":   "a heraldic emblem of a gold coin over a balance scale, rich gold, merchant crest",
}
HERO = {
    "hero": "a grand ornate circular brass astrolabe / star-chart observation dial glowing with gold constellations on a black starfield, dark-fantasy key art emblem",
}


def gen(prompt, size="1024x1024", quality="low"):
    body = {"model": "gpt-image-1", "prompt": prompt, "size": size,
            "background": "transparent", "quality": quality, "n": 1}
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps(body).encode(), method="POST",
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    return base64.b64decode(data["data"][0]["b64_json"])


def pixelate(raw_bytes, size=64, colors=28):
    im = Image.open(BytesIO(raw_bytes)).convert("RGBA")
    im = im.resize((size, size), Image.LANCZOS)
    r, g, b, a = im.split()
    rgb = Image.merge("RGB", (r, g, b)).quantize(colors=colors, method=Image.MEDIANCUT).convert("RGB")
    rr, gg, bb = rgb.split()
    a = a.point(lambda v: 0 if v < 110 else 255)
    return Image.merge("RGBA", (rr, gg, bb, a))


def make(idd, prompt, px=64, size="1024x1024", quality="low"):
    out_path = os.path.join(OUT, f"{idd}.png")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        print(f"skip {idd}")
        return True
    full = f"{prompt}. {STYLE}."
    for attempt in range(3):
        try:
            raw = gen(full, size=size, quality=quality)
            open(os.path.join(RAW, f"{idd}.png"), "wb").write(raw)
            pixelate(raw, size=px).save(out_path)
            print(f"made {idd}")
            return True
        except urllib.error.HTTPError as e:
            print(f"err {idd} [{attempt}] {e.code} {e.read().decode()[:160]}")
            time.sleep(3 * (attempt + 1))
        except Exception as e:  # noqa
            print(f"err {idd} [{attempt}] {e}")
            time.sleep(3 * (attempt + 1))
    return False


def main():
    if not KEY:
        print("no OPENAI_API_KEY")
        sys.exit(1)
    ok = fail = 0
    for idd, p in {**ITEMS, **JOBS}.items():
        (ok := ok + 1) if make(idd, p, px=64) else (fail := fail + 1)
    for idd, p in HERO.items():
        (ok := ok + 1) if make(idd, p, px=144, quality="medium") else (fail := fail + 1)
    print(f"DONE ok={ok} fail={fail}")


if __name__ == "__main__":
    main()
