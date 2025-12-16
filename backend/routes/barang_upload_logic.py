    new_fotos = []
    for file in files:
        # Generate path
        timestamp = int(datetime.now().timestamp())
        safe_name = f"{id}_{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(upload_dir, safe_name)
        
        # Read content
        content = await file.read()
        
        # Compress
        try:
            # Only compress if image
            if file.content_type.startswith('image/'):
                compressed_content = compress_image(content)
            else:
                compressed_content = content
        except Exception as e:
            print(f"Compression error: {e}")
            compressed_content = content
            
        # Save
        with open(file_path, "wb") as f:
            f.write(compressed_content)
            
        new_fotos.append({
            "url": f"/api/uploads/barang/{safe_name}",
            "is_thumbnail": False,
            "keterangan": keterangan,
            "uploaded_at": datetime.now(timezone.utc)
        })
