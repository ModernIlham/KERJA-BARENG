
# --- PHOTO MANAGEMENT ENDPOINTS ---

@router.post("/{id}/upload-fotos")
async def upload_fotos(
    id: str,
    files: List[UploadFile] = File(...),
    keterangan: Optional[str] = Body(""),
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    upload_dir = "/app/uploads/persediaan"
    os.makedirs(upload_dir, exist_ok=True)
    
    new_fotos = []
    for file in files:
        safe_name = f"{id}_{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(upload_dir, safe_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        new_fotos.append({
            "url": f"/api/uploads/persediaan/{safe_name}",
            "is_thumbnail": False,
            "keterangan": keterangan,
            "uploaded_at": datetime.now(timezone.utc)
        })
    
    # If no photos existed before, make first one thumbnail
    item = await db.persediaan.find_one({"_id": ObjectId(id)})
    if not item.get("fotos") and new_fotos:
        new_fotos[0]["is_thumbnail"] = True
        
    await db.persediaan.update_one(
        {"_id": ObjectId(id)},
        {"$push": {"fotos": {"$each": new_fotos}}}
    )
    return {"message": "Uploaded", "fotos": new_fotos}

@router.put("/{id}/set-thumbnail")
async def set_thumbnail(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    if not url: raise HTTPException(status_code=400)
    
    # Unset all
    await db.persediaan.update_one(
        {"_id": ObjectId(id), "fotos.is_thumbnail": True},
        {"$set": {"fotos.$.is_thumbnail": False}}
    )
    
    # Set specific
    await db.persediaan.update_one(
        {"_id": ObjectId(id), "fotos.url": url},
        {"$set": {"fotos.$.is_thumbnail": True}}
    )
    return {"message": "Thumbnail updated"}

@router.delete("/{id}/foto")
async def delete_foto(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    await db.persediaan.update_one(
        {"_id": ObjectId(id)},
        {"$pull": {"fotos": {"url": url}}}
    )
    # Ideally delete file from disk too
    try:
        # Remove /api prefix to get disk path relative to /app
        # url is like /api/uploads/persediaan/filename
        # we want /app/uploads/persediaan/filename
        # But wait, app.mount("/api/uploads", ...)
        # So /api/uploads maps to /app/uploads
        # So we just replace /api/uploads with /app/uploads
        
        file_path = url.replace("/api/uploads", "/app/uploads")
        if os.path.exists(file_path): os.remove(file_path)
    except: pass
    return {"message": "Foto deleted"}

@router.put("/{id}/foto-metadata")
async def update_foto_metadata(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    keterangan = payload.get("keterangan")
    
    await db.persediaan.update_one(
        {"_id": ObjectId(id), "fotos.url": url},
        {"$set": {"fotos.$.keterangan": keterangan}}
    )
    return {"message": "Updated"}
