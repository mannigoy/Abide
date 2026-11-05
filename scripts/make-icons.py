"""
Draws Abide's icon (an open book with a sprout growing from its spine) and
writes every size the app and the Play Store need.

Run from the project root:  python scripts/make-icons.py
Needs Pillow (pip install pillow). Re-run after changing the colours or shape.
"""
import glob
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

GREEN = (47, 93, 80, 255)  # #2F5D50
AMBER = (233, 162, 59, 255)  # #E9A23B
CREAM = (250, 247, 242, 255)  # #FAF7F2
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)

SUPER = 4  # draw 4× bigger, then shrink, for smooth edges


def bezier(p0, p1, p2, steps=60):
    """Points along a curve from p0 to p2, pulled towards p1."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts


def leaf(cx, cy, length, width, angle_deg, steps=40):
    """A pointed leaf shape centred on (cx, cy)."""
    import math

    a = math.radians(angle_deg)
    tip = (cx + math.cos(a) * length / 2, cy - math.sin(a) * length / 2)
    base = (cx - math.cos(a) * length / 2, cy + math.sin(a) * length / 2)
    nx, ny = -math.sin(a) * width, -math.cos(a) * width
    side1 = bezier(base, (cx + nx, cy + ny), tip, steps)
    side2 = bezier(tip, (cx - nx, cy - ny), base, steps)
    return side1 + side2


def draw_mark(img, box, book=WHITE, sprout=AMBER, gap=None):
    """Draws the mark inside box = (left, top, size). `gap` is the spine colour."""
    left, top, size = box
    d = ImageDraw.Draw(img)

    def p(x, y):
        return (left + x * size, top + y * size)

    # Two pages of an open book, curving up from the spine.
    left_page = (
        [p(0.06, 0.84)]
        + [p(*q) for q in bezier((0.06, 0.50), (0.30, 0.40), (0.485, 0.54))]
        + [p(0.485, 0.92)]
        + [p(*q) for q in bezier((0.485, 0.92), (0.30, 0.80), (0.06, 0.84))]
    )
    right_page = [(2 * (left + size / 2) - x, y) for (x, y) in left_page]
    d.polygon(left_page, fill=book)
    d.polygon(right_page, fill=book)

    # The sprout: a stem from the spine and two leaves.
    stem_w = size * 0.035
    d.line([p(0.5, 0.56), p(0.5, 0.36)], fill=sprout, width=int(stem_w))
    for y in (0.56, 0.36):  # round both ends of the stem
        d.ellipse([p(0.5 - 0.0175, y - 0.0175), p(0.5 + 0.0175, y + 0.0175)], fill=sprout)
    d.polygon([p(*q) for q in leaf(0.615, 0.235, 0.30, 0.10, 35)], fill=sprout)
    d.polygon([p(*q) for q in leaf(0.395, 0.335, 0.22, 0.075, 145)], fill=sprout)


def render(size, background, mark_scale, book=WHITE, sprout=AMBER):
    big = size * SUPER
    img = Image.new('RGBA', (big, big), background)
    mark = big * mark_scale
    draw_mark(img, ((big - mark) / 2, (big - mark) / 2 - mark * 0.03, mark), book, sprout)
    return img.resize((size, size), Image.LANCZOS)


def main():
    root = Path(__file__).resolve().parent.parent
    images = root / 'assets' / 'images'
    store = root / 'assets' / 'store'
    store.mkdir(exist_ok=True)

    # App icon (also used by Play for older launchers): full square, green.
    render(1024, GREEN, 0.72).save(images / 'icon.png')
    render(48, GREEN, 0.78).save(images / 'favicon.png')

    # Android adaptive icon: the launcher crops it to a circle/squircle, so the
    # mark stays inside the middle ~60% ("safe zone").
    render(512, CLEAR, 0.56).save(images / 'android-icon-foreground.png')
    Image.new('RGBA', (512, 512), GREEN).save(images / 'android-icon-background.png')
    # Monochrome (Android 13 themed icons): one colour on transparent.
    render(432, CLEAR, 0.56, book=WHITE, sprout=WHITE).save(images / 'android-icon-monochrome.png')

    # Notification icon (Android status bar): all white on transparent, 96×96.
    render(96, CLEAR, 0.92, book=WHITE, sprout=WHITE).save(images / 'notification-icon.png')

    # Splash screen: green book on the cream background.
    render(512, CLEAR, 0.92, book=GREEN, sprout=AMBER).save(images / 'splash-icon.png')

    # Play Store: 512×512 icon (no transparency) and the 1024×500 feature graphic.
    render(512, GREEN, 0.72).convert('RGB').save(store / 'play-icon-512.png')
    feature = Image.new('RGBA', (1024 * 2, 500 * 2), GREEN)
    draw_mark(feature, (150, 160, 680))
    fonts = glob.glob(str(root / 'node_modules/@expo-google-fonts/inter/**/Inter_700Bold.ttf'), recursive=True)
    fonts_medium = glob.glob(str(root / 'node_modules/@expo-google-fonts/inter/**/Inter_500Medium.ttf'), recursive=True)
    d = ImageDraw.Draw(feature)
    title = ImageFont.truetype(fonts[0], 190) if fonts else ImageFont.load_default()
    tagline = ImageFont.truetype(fonts_medium[0], 64) if fonts_medium else ImageFont.load_default()
    d.text((930, 300), 'Abide', font=title, fill=WHITE)
    d.text((936, 540), 'Read · Reflect · Respond', font=tagline, fill=AMBER)
    d.text((936, 640), 'A daily Bible habit, together', font=tagline, fill=(255, 255, 255, 210))
    feature.resize((1024, 500), Image.LANCZOS).convert('RGB').save(store / 'feature-graphic-1024x500.png')

    print('Icons written to', images, 'and', store)


if __name__ == '__main__':
    main()
