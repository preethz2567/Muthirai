"""
Seed generic image corpus.
Reads images from assets/generic_images and posts them to API to generate generic image centroid.
"""
import os
import sys
import httpx
from pathlib import Path

API_URL = "http://localhost:8000"
ASSETS_DIR = Path(__file__).parent.parent / "assets" / "generic_images"

def seed_images():
    if not ASSETS_DIR.exists():
        print(f"Directory {ASSETS_DIR} does not exist.")
        sys.exit(1)

    image_paths = list(ASSETS_DIR.glob("*.*"))
    if not image_paths:
        print(f"No images found in {ASSETS_DIR}.")
        sys.exit(1)

    print(f"Found {len(image_paths)} images. Seeding generic image centroid...")

    files = []
    for path in image_paths:
        if path.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
            files.append(("images", (path.name, open(path, "rb"), "image/jpeg")))

    if not files:
        print("No valid image files found.")
        sys.exit(1)

    try:
        response = httpx.post(
            f"{API_URL}/internal/generic-corpus/image-centroid",
            files=files,
            timeout=300.0
        )
        response.raise_for_status()
        print("Successfully seeded generic image centroid.")
        print(response.json())
    except Exception as e:
        print(f"Failed to seed image corpus: {e}")
        if isinstance(e, httpx.HTTPStatusError):
            print(e.response.text)
        sys.exit(1)

if __name__ == "__main__":
    seed_images()
