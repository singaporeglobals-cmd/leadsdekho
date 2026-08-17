"""
Generate square favicon icons from the wide banner logo.png.
Next.js 14 app router auto-detects src/app/icon.png as the favicon.
We also generate an apple-touch icon (180x180) and a 32x32 favicon.ico.
"""
from PIL import Image, ImageDraw
import os

SRC = "/home/z/my-project/public/logo.png"
APP_DIR = "/home/z/my-project/src/app"
PUBLIC_DIR = "/home/z/my-project/public"

os.makedirs(APP_DIR, exist_ok=True)

# Load source
src = Image.open(SRC).convert("RGBA")
print(f"Source logo: {src.size}")

# Center-crop to a square (the logo banner has the brand mark in the center)
w, h = src.size
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
square = src.crop((left, top, left + side, top + side))
print(f"Center-cropped square: {square.size}")

# Add padding so the logo doesn't touch the edges of the favicon
PAD_RATIO = 0.06
padded_side = int(side * (1 + 2 * PAD_RATIO))
bg = Image.new("RGBA", (padded_side, padded_side), (255, 255, 255, 0))
offset = int(side * PAD_RATIO)
bg.paste(square, (offset, offset), square)
square = bg
print(f"Padded square: {square.size}")

# 1) src/app/icon.png — Next.js auto-detects, serves at /icon as favicon
# 256x256 is a good high-res master that browsers will downscale
icon_256 = square.resize((256, 256), Image.LANCZOS)
icon_256.save(os.path.join(APP_DIR, "icon.png"), format="PNG", optimize=True)
print("Wrote src/app/icon.png (256x256)")

# 2) src/app/apple-icon.png — Apple touch icon (180x180, no transparency)
apple = square.resize((180, 180), Image.LANCZOS)
# Apple touch icons should not have transparency — composite over white
apple_opaque = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
apple_opaque.paste(apple, (0, 0), apple)
apple_opaque.convert("RGB").save(os.path.join(APP_DIR, "apple-icon.png"), format="PNG", optimize=True)
print("Wrote src/app/apple-icon.png (180x180)")

# 3) public/favicon.ico — multi-resolution .ico for legacy browsers
# Include 16, 32, 48 sizes in one file
ico_sizes = [(16, 16), (32, 32), (48, 48)]
ico_images = [square.resize(s, Image.LANCZOS) for s in ico_sizes]
ico_images[0].save(
    os.path.join(PUBLIC_DIR, "favicon.ico"),
    format="ICO",
    sizes=ico_sizes,
)
print("Wrote public/favicon.ico (16+32+48)")

print("\nAll favicon files generated successfully.")
