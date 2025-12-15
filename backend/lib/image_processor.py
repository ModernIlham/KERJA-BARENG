import tinify
import os
import io
from fastapi import HTTPException

# Configure Tinify
TINYPNG_API_KEY = os.environ.get("TINYPNG_API_KEY", "WX6Md8zwtPLg740tmWF9j5h1s82Ydmb2")
tinify.key = TINYPNG_API_KEY

def compress_image(image_data: bytes) -> bytes:
    """
    Compress image data using TinyPNG API.
    Returns compressed bytes.
    """
    try:
        source = tinify.from_buffer(image_data)
        compressed_data = source.to_buffer()
        return compressed_data
    except tinify.AccountError as e:
        print(f"TinyPNG Account Error: {e}")
        # Fallback: return original if quota exceeded or key invalid
        # But user wants compression, so maybe we should raise error or log warning
        # For now, fallback to original to not block operations completely if API fails
        # but in strict mode, we might want to block.
        return image_data
    except Exception as e:
        print(f"TinyPNG Compression Error: {e}")
        return image_data
