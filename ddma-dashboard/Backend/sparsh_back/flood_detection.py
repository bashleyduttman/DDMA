# flood_detection.py
import rasterio
import numpy as np
import matplotlib.pyplot as plt
from skimage.filters import threshold_otsu
from skimage.morphology import binary_opening, binary_closing, disk
import io
import base64

def detect_flood(before_tif, after_tif, current_tif):
    # STEP 1: Load Before & After Images
    with rasterio.open(before_tif) as src:
        before = src.read(1)
    with rasterio.open(after_tif) as src:
        after = src.read(1)

    diff = np.abs(after - before)
    flood_threshold = threshold_otsu(diff)

    # STEP 2: Load Current Image
    with rasterio.open(current_tif) as src:
        now_img = src.read(1)

    # Normalize
    if np.max(now_img) > 255 or np.max(now_img) == np.min(now_img):
        now_img = ((now_img - np.min(now_img)) / (np.max(now_img) - np.min(now_img)) * 255).astype(np.uint8)
    else:
        now_img = now_img.astype(np.uint8)

    # Invert & Apply Threshold
    inverted_img = 255 - now_img
    flood_mask_now = (inverted_img > (255 - flood_threshold)).astype(np.uint8) * 255
    flood_mask_now = binary_closing(binary_opening(flood_mask_now, disk(2)), disk(2))

    # River mask
    river_threshold = 50
    river_mask = (now_img < river_threshold).astype(np.uint8) * 128
    flood_mask_now = np.where(river_mask == 128, 128, flood_mask_now)

    # Metrics
    flood_pixels = np.sum(flood_mask_now > 0)
    total_pixels = flood_mask_now.size
    flood_ratio = flood_pixels / total_pixels
    flood_detected = flood_ratio > 0.15

    # Save plots to base64
    plt.figure(figsize=(20, 5))
    plt.subplot(1, 4, 1); plt.title("Current Image"); plt.imshow(now_img, cmap="gray")
    plt.subplot(1, 4, 2); plt.title("Inverted Current Image"); plt.imshow(inverted_img, cmap="gray")
    plt.subplot(1, 4, 3); plt.title("Predicted Flood Mask"); plt.imshow(flood_mask_now, cmap="gray")
    plt.subplot(1, 4, 4); plt.title("Histogram"); plt.hist(now_img.flatten(), bins=256, range=(0, 255), color='gray')
    plt.axvline(x=255 - flood_threshold, color='r', linestyle='--', label=f'Flood Threshold')
    plt.axvline(x=river_threshold, color='g', linestyle='--', label=f'River Threshold')
    plt.legend()
    buf = io.BytesIO()
    plt.savefig(buf, format="png")
    buf.seek(0)
    plot_b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close()

    return {
        "flood_detected": flood_detected,
        "flood_ratio": round(flood_ratio, 4),
        "plot": plot_b64
    }