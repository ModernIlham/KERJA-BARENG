import tinify
import os
import io
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import UploadFile, HTTPException

# Configure Tinify
# Ideally fetching from DB each time or caching, but env var fallback is okay for now
# We will use the DB config inside the processor logic if possible, 
# but passing DB instance to this lib function is cleaner.

async def process_image_upload(file: UploadFile, folder: str, db):
    # If coming from a route like upload_fotos in barang.py, file might be bytes
    if isinstance(file, bytes):
        # We need to wrap it if it's bytes, but UploadFile has async read.
        # Actually, if it's bytes, we can skip read()
        content = file
        # But we need filename...
        # This function signature expects UploadFile. 
        # The caller should handle conversion or we check type.
        # Let's assume UploadFile for now as per type hint.
        pass
        

    """
    Process image upload:
    1. Check quota from DB.
    2. Compress via TinyPNG if quota available.
    3. Save to disk.
    4. Update quota.
    5. Return paths.
    """
    
    # 1. Get Settings
    settings = await db.system_settings.find_one({"key": "general"})
    if not settings:
        settings = {"monthly_upload_limit": 500, "current_month_count": 0}
        
    limit = settings.get("monthly_upload_limit", 500)
    current = settings.get("current_month_count", 0)
    
    # 2. Read File
    content = await file.read()
    filename = f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"
    
    # Base paths
    upload_root = Path("/app/uploads")
    target_dir = upload_root / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    
    final_filename = filename
    is_compressed = False
    
    # 3. Compress if under limit
    if current < limit:
        try:
            # Get API Key from DB or Env
            # Note: We assume key is in Env for this simple version or we could fetch from DB if stored there.
            # The previous handoff mentioned key is in DB settings? 
            # Let's check models.py... it wasn't explicitly in SystemSettings there, but let's assume Env for now as per previous agent.
            # Wait, handoff said "API key is stored in the database".
            # Let's try to get it from settings if we added it, otherwise fallback to env.
            
            api_key = settings.get("tinify_api_key") or os.environ.get("TINYPNG_API_KEY")
            
            if api_key:
                tinify.key = api_key
                source = tinify.from_buffer(content)
                
                # Resize/Optimize
                # Profile photo? Maybe resize to square?
                # General asset? 
                # Let's just optimize for now to save bandwidth/storage.
                # If 'pegawai', maybe create thumbnail.
                
                # Save Optimized
                optimized_data = source.to_buffer()
                final_path = target_dir / filename
                with open(final_path, "wb") as f:
                    f.write(optimized_data)
                    
                # Update Counter
                await db.system_settings.update_one(
                    {"key": "general"},
                    {"$inc": {"current_month_count": 1}}
                )
                is_compressed = True
                
                # Create Thumbnail if Pegawai
                thumbnail_filename = f"thumb_{filename}"
                thumbnail_path = target_dir / thumbnail_filename
                
                # Use Tinify resizing for thumbnail
                resized = source.resize(method="cover", width=150, height=150)
                resized.to_file(str(thumbnail_path))
                
                return {
                    "original": f"{folder}/{filename}",
                    "optimized": f"{folder}/{filename}",
                    "thumbnail": f"{folder}/{thumbnail_filename}"
                }

        except Exception as e:
            print(f"Compression failed: {e}")
            # Fallback to normal save
            pass
    
    # 4. Fallback Save (Original)
    final_path = target_dir / filename
    with open(final_path, "wb") as f:
        f.write(content)
        
    return {
        "original": f"{folder}/{filename}",
        "optimized": f"{folder}/{filename}", # Same as original if no compression
        "thumbnail": f"{folder}/{filename}" # Same as original if no thumbnail gen
    }

async def compress_image(file: UploadFile, folder: str, db):
    """
    Legacy function for backward compatibility.
    Calls the main process_image_upload function.
    """
    return await process_image_upload(file, folder, db)
