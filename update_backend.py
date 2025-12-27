
import os

file_path = "/app/backend/routes/label_bmn.py"

with open(file_path, "r") as f:
    content = f.read()

# Define old and new strings for generate_pdf_task
old_task = """async def generate_pdf_task(job_id: str, items: List[Dict], canvas_size: str, instansi: Dict, user_id: str):
    \"\"\"Background task to generate PDF with improved layout matching frontend preview\"\"\"
    try:
        pdf_jobs[job_id]["status"] = "processing"
        pdf_jobs[job_id]["total"] = len(items)
        
        # Page sizes
        page_sizes = {
            "A4": A4,
            "A3": A3
        }
        page_size = page_sizes.get(canvas_size, A4)
        
        # Sticker sizes in mm (matching frontend STICKER_SIZES)
        sticker_sizes = {
            "kecil": {"width": 23.8, "height": 39.8, "layout": "portrait"},
            "sedang": {"width": 69.8, "height": 22.1, "layout": "landscape"},
            "besar": {"width": 94.9, "height": 32.2, "layout": "landscape"}
        }
        
        # Create PDF
        pdf_path = os.path.join(PDF_OUTPUT_DIR, f"{job_id}.pdf")
        c = pdf_canvas.Canvas(pdf_path, pagesize=page_size)
        
        page_width, page_height = page_size
        margin = 8 * mm
        gap = 4 * mm
        
        # Calculate grid once based on first item (assuming all same size)
        if items:
            first_size_type = items[0].get("ukuran", "sedang")
            first_size = sticker_sizes.get(first_size_type, sticker_sizes["sedang"])
            sticker_width = first_size["width"] * mm
            sticker_height = first_size["height"] * mm
            cols = max(1, int((page_width - 2 * margin + gap) / (sticker_width + gap)))
            rows = max(1, int((page_height - 2 * margin + gap) / (sticker_height + gap)))
            items_per_page = cols * rows
        else:
            cols, rows, items_per_page = 1, 1, 1
        
        for idx, item in enumerate(items):
            size_type = item.get("ukuran", "sedang")
            size = sticker_sizes.get(size_type, sticker_sizes["sedang"])
            is_portrait = size.get("layout") == "portrait"
            
            sticker_width = size["width"] * mm
            sticker_height = size["height"] * mm
            
            # Position on page
            item_on_page = idx % items_per_page
            col = item_on_page % cols
            row = item_on_page // cols
            
            # New page if needed
            if idx > 0 and item_on_page == 0:
                c.showPage()
            
            # Calculate position (from top-left)
            x = margin + col * (sticker_width + gap)
            y = page_height - margin - (row + 1) * sticker_height - row * gap
            
            # Draw sticker border
            c.setStrokeColorRGB(0.8, 0.8, 0.8)
            c.setLineWidth(0.5)
            c.rect(x, y, sticker_width, sticker_height, stroke=1, fill=0)
            
            # Generate QR code
            qr_data = item.get("kode_register") or item.get("kode_barang", "UNKNOWN")
            
            if is_portrait:
                # Portrait layout (kecil): QR on top, text below
                qr_size = int(min(sticker_width * 0.8, sticker_height * 0.5) / mm)
                qr_buffer = generate_qr_code(qr_data, qr_size * 3)  # Higher resolution
                qr_img = ImageReader(qr_buffer)
                
                qr_x = x + (sticker_width - qr_size * mm) / 2
                qr_y = y + sticker_height - qr_size * mm - 2 * mm
                c.drawImage(qr_img, qr_x, qr_y, qr_size * mm, qr_size * mm)
                
                # Text below QR
                text_y = qr_y - 3 * mm
                c.setFont("Helvetica-Bold", 5)
                
                # NUP
                nup = item.get("nup", "1")
                c.drawCentredString(x + sticker_width / 2, text_y, f"NUP: {nup}")
                text_y -= 2.5 * mm
                
                # Code (truncated)
                c.setFont("Helvetica", 4)
                code = f"#{qr_data}"[:15]
                c.drawCentredString(x + sticker_width / 2, text_y, code)
                
            else:
                # Landscape layout (sedang, besar): QR on left, text on right
                qr_size = int(sticker_height * 0.85 / mm)
                qr_buffer = generate_qr_code(qr_data, qr_size * 3)  # Higher resolution
                qr_img = ImageReader(qr_buffer)
                
                qr_x = x + 1.5 * mm
                qr_y = y + (sticker_height - qr_size * mm) / 2
                c.drawImage(qr_img, qr_x, qr_y, qr_size * mm, qr_size * mm)
                
                # Text area
                text_x = qr_x + qr_size * mm + 2 * mm
                text_y = y + sticker_height - 3.5 * mm
                max_text_width = sticker_width - qr_size * mm - 5 * mm
                
                # Header (Institution)
                if instansi and instansi.get("nama"):
                    c.setFont("Helvetica-Bold", 5.5)
                    inst_name = instansi.get("nama", "")[:25]
                    c.drawString(text_x, text_y, inst_name)
                    text_y -= 3 * mm
                
                # Asset name
                c.setFont("Helvetica-Bold", 5)
                asset_name = item.get("nama_barang", "")
                # Truncate based on available width
                max_chars = int(max_text_width / mm * 2.5)
                if len(asset_name) > max_chars:
                    asset_name = asset_name[:max_chars-2] + ".."
                c.drawString(text_x, text_y, asset_name)
                text_y -= 2.5 * mm
                
                # Code
                c.setFont("Helvetica", 4.5)
                c.drawString(text_x, text_y, f"#{qr_data}")
                text_y -= 2.5 * mm
                
                # Additional info line
                c.setFont("Helvetica", 4)
                year = item.get("tgl_perolehan", "")[:4] if item.get("tgl_perolehan") else ""
                merk = item.get("merk", "")[:15] if item.get("merk") else ""
                tipe = item.get("tipe", "")[:15] if item.get("tipe") else ""
                info_line = f"{year} - {merk}"
                if tipe:
                    info_line += f" {tipe}"
                c.drawString(text_x, text_y, info_line[:40])
                text_y -= 2 * mm
                
                # NUP line
                nup = item.get("nup", "1")
                kode_6 = (item.get("kode_barang") or "000000")[:6]
                tahun = year or str(datetime.now().year)
                vertical_code = f"{kode_6}T/{nup}/{tahun}"
                c.setFont("Helvetica", 3.5)
                c.drawString(text_x, text_y, vertical_code)
            
            # Update progress
            pdf_jobs[job_id]["progress"] = idx + 1
            
            # Small delay to prevent blocking
            if idx % 50 == 0:
                await asyncio.sleep(0.01)
        
        c.save()
        
        # Update job status
        pdf_jobs[job_id]["status"] = "completed"
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        pdf_jobs[job_id]["pdf_url"] = f"/api/label-bmn/pdf/{job_id}"
        
        # Record print logs
        db_client = AsyncIOMotorClient(mongo_url)
        db_async = db_client[os.environ["DB_NAME"]]
        
        for item in items:
            log = {
                "barang_id": item.get("id"),
                "ukuran": item.get("ukuran", "sedang"),
                "printed_at": datetime.now(timezone.utc).isoformat(),
                "printed_by": user_id,
                "print_type": "pdf_batch",
                "job_id": job_id
            }
            await db_async.label_print_logs.insert_one(log)
        
        db_client.close()
        
    except Exception as e:
        pdf_jobs[job_id]["status"] = "failed"
        pdf_jobs[job_id]["error"] = str(e)
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()"""

new_task = """async def generate_pdf_task(job_id: str, items: List[Dict], canvas_size: str, instansi: Dict, user_id: str, html_content: Optional[str] = None):
    \"\"\"Background task to generate PDF using WeasyPrint (HTML to PDF)\"\"\"
    try:
        pdf_jobs[job_id]["status"] = "processing"
        pdf_jobs[job_id]["total"] = len(items)
        
        pdf_path = os.path.join(PDF_OUTPUT_DIR, f"{job_id}.pdf")
        
        if html_content:
            # === NEW METHOD: Use HTML from Frontend ===
            # Use WeasyPrint to convert HTML to PDF
            await asyncio.to_thread(
                HTML(string=html_content).write_pdf, 
                target=pdf_path
            )
        else:
            # Fallback or Error
            raise Exception("Backend requires 'html_content' for high-quality PDF generation.")

        # Update job status
        pdf_jobs[job_id]["status"] = "completed"
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        pdf_jobs[job_id]["pdf_url"] = f"/api/label-bmn/pdf/{job_id}"
        
        # Record print logs
        db_client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
        db_async = db_client[os.environ.get("DB_NAME")]
        
        log_entries = []
        now = datetime.now(timezone.utc).isoformat()
        
        for item in items:
            # Handle both id and barang_id formats
            barang_id = item.get("id") or item.get("barang_id")
            
            log = {
                "barang_id": barang_id,
                "ukuran": item.get("ukuran", "sedang"),
                "printed_at": now,
                "printed_by": user_id,
                "print_type": "pdf_batch",
                "job_id": job_id
            }
            log_entries.append(log)
            
        if log_entries:
            await db_async.label_print_logs.insert_many(log_entries)
        
        db_client.close()

    except Exception as e:
        pdf_jobs[job_id]["status"] = "failed"
        pdf_jobs[job_id]["error"] = str(e)
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()"""

# Replace generate_pdf_task
content = content.replace(old_task, new_task)

# Define old and new strings for start_pdf_generation
old_start = """    # Start background task
    background_tasks.add_task(
        generate_pdf_task,
        job_id,
        request.items,
        request.canvas_size,
        instansi_data,
        user_id
    )"""

new_start = """    # Start background task
    background_tasks.add_task(
        generate_pdf_task,
        job_id,
        request.items,
        request.canvas_size,
        instansi_data,
        user_id,
        request.html_content
    )"""

# Replace start_pdf_generation call
content = content.replace(old_start, new_start)

with open(file_path, "w") as f:
    f.write(content)
