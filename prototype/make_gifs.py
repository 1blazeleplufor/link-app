"""Generate the built-in animated stickers ("GIFs") offered in the chat GIF picker.
Output: prototype/assets/gifs/*.webp (animated) + gifs.js (data URIs) consumed by build.sh."""
import base64, io, math, random, json, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets", "gifs")
os.makedirs(OUT, exist_ok=True)
W, H, N = 240, 180, 16
FONT = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
FEST = [(255, 61, 127), (255, 138, 61), (255, 214, 61), (61, 220, 151), (61, 168, 255), (155, 92, 255)]
BG = [(28, 20, 58), (60, 24, 92)]
star = Image.open(os.path.join(HERE, "assets", "star-full.png")).convert("RGBA")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rainbow(t):
    t = t % 1 * (len(FEST) - 1)
    i = int(t)
    return lerp(FEST[i], FEST[min(i + 1, len(FEST) - 1)], t - i)


def bg(k):
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp(BG[0], BG[1], y / H))
    # soft moving glow
    g = Image.new("RGB", (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(g)
    cx = W * (0.3 + 0.4 * (0.5 + 0.5 * math.sin(2 * math.pi * k / N)))
    gd.ellipse([cx - 90, H * .2 - 70, cx + 90, H * .2 + 110], fill=rainbow(k / N))
    g = g.filter(ImageFilter.GaussianBlur(40))
    return Image.blend(im, Image.composite(g, im, Image.new("L", (W, H), 110)), 0.6).convert("RGBA")


def gradient_text(text, size, t, shadow=True):
    f = ImageFont.truetype(FONT, size)
    l, tp, r, b = f.getbbox(text)
    tw, th = r - l + 8, b - tp + 8
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).text((4 - l, 4 - tp), text, font=f, fill=255)
    fill = Image.new("RGB", (tw, th))
    fd = ImageDraw.Draw(fill)
    for x in range(tw):
        fd.line([(x, 0), (x, th)], fill=rainbow(t + x / tw * .6))
    out = Image.new("RGBA", (tw + 8, th + 8), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", (tw, th), (0, 0, 0, 160))
        out.paste(sh, (6, 7), mask.filter(ImageFilter.GaussianBlur(2)))
    out.paste(fill, (2, 2), mask)
    # white outline-ish highlight
    return out


def place(frame, im, cx, cy, scale=1.0, angle=0):
    if scale != 1.0:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    if angle:
        im = im.rotate(angle, expand=True, resample=Image.BICUBIC)
    frame.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


def fit(text, maxw, size):
    while size > 14:
        f = ImageFont.truetype(FONT, size)
        l, _, r, _ = f.getbbox(text)
        if r - l <= maxw:
            return size
        size -= 2
    return size


def heart(d, cx, cy, s, col):
    d.ellipse([cx - s, cy - s, cx, cy], fill=col)
    d.ellipse([cx, cy - s, cx + s, cy], fill=col)
    d.polygon([(cx - s, cy - s / 2 + 1), (cx + s, cy - s / 2 + 1), (cx, cy + s)], fill=col)


def make(name, text, mode):
    rnd = random.Random(name)
    conf = [(rnd.random() * W, rnd.random() * H, rnd.choice(FEST), rnd.random() * 6.28, 3 + rnd.random() * 4) for _ in range(28)]
    frames = []
    size = fit(text, W - 30, 44)
    for k in range(N):
        p = k / N
        fr = bg(k)
        d = ImageDraw.Draw(fr)
        if mode == "confetti":
            for x, y, c, a, s in conf:
                yy = (y + p * H) % H
                d.rectangle([x, yy, x + s, yy + s * .6], fill=c)
        if mode == "hearts":
            for i, (x, y, c, a, s) in enumerate(conf[:12]):
                yy = H - ((H - y + p * H * 1.0) % (H + 20))
                heart(d, x, yy, 5 + s, c)
        if mode == "sparkle":
            for i, (x, y, c, a, s) in enumerate(conf[:14]):
                tw = 0.5 + 0.5 * math.sin(2 * math.pi * (p + i / 7))
                place(fr, star, x, y, 0.025 + 0.035 * tw)
        txt = gradient_text(text, size, p)
        cx, cy = W / 2, H / 2 + 6
        if mode == "bounce":
            cy = H / 2 + 10 - abs(math.sin(math.pi * 2 * p)) * 26
            place(fr, txt, cx, cy, 1 + 0.06 * math.cos(4 * math.pi * p))
        elif mode == "shake":
            place(fr, txt, cx + 5 * math.sin(8 * math.pi * p), cy, 1, 6 * math.sin(4 * math.pi * p))
        elif mode == "zoom":
            place(fr, txt, cx, cy, 0.75 + 0.3 * (0.5 + 0.5 * math.sin(2 * math.pi * p)))
        elif mode == "wave":
            # letter-by-letter wave
            f = ImageFont.truetype(FONT, size)
            total = sum(f.getlength(ch) for ch in text)
            x = (W - total) / 2
            for i, ch in enumerate(text):
                gt = gradient_text(ch, size, p + i * .05)
                y = cy - 12 * math.sin(2 * math.pi * (p - i / len(text)))
                place(fr, gt, x + f.getlength(ch) / 2 + 2, y)
                x += f.getlength(ch)
        else:
            place(fr, txt, cx, cy, 1.0 + 0.04 * math.sin(2 * math.pi * p))
        if mode == "star":
            place(fr, star, W - 40, 36, 0.09 + 0.03 * math.sin(2 * math.pi * p), 20 * p * 4)
        frames.append(fr)
    path = os.path.join(OUT, name + ".webp")
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=70, loop=0, quality=72, method=6)
    return path


GIFS = [
    ("ceSoir", "CE SOIR ?", "bounce"),
    ("onYVa", "ON Y VA !", "confetti"),
    ("tropHate", "TROP HÂTE", "shake"),
    ("letsGo", "LET'S GO", "wave"),
    ("link", "LINK ?", "hearts"),
    ("ouiii", "OUIII", "zoom"),
    ("party", "PARTY", "sparkle"),
    ("aTout", "À TOUT !", "star"),
]
data = []
for key, text, mode in GIFS:
    p = make(key, text, mode)
    b = open(p, "rb").read()
    data.append({"id": key, "label": text, "src": "data:image/webp;base64," + base64.b64encode(b).decode()})
    print(key, len(b))
with open(os.path.join(HERE, "src", "gifs.js"), "w") as f:
    f.write("/* Built-in animated stickers for the chat GIF picker — generated by make_gifs.py, do not edit. */\n")
    f.write("const GIFS = " + json.dumps(data) + ";\n")
