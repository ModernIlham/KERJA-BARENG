    new_fotos = []
    
    for file in files:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files allowed")
        
        # Generate path
        timestamp = int(datetime.now().timestamp())
        safe_name = f"{id}_{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(upload_dir, safe_name)
        
        # Read content
        content = await file.read()
        
        # Compress
        try:
            compressed_content = compress_image(content)
        except Exception as e:
            print(f"Compression error: {e}")
            compressed_content = content
            
        # Save
        with open(file_path, "wb") as f:
            f.write(compressed_content)
            
        new_fotos.append({
            "url": f"/api/uploads/persediaan/{safe_name}",
            "is_thumbnail": False,
            "uploaded_at": datetime.now(timezone.utc)
        })
