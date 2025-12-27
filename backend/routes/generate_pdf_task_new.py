
async def generate_pdf_task(job_id: str, items: List[Dict], canvas_size: str, instansi: Dict, user_id: str, html_content: Optional[str] = None):
    """Background task to generate PDF using WeasyPrint (HTML to PDF)"""
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
            log = {
                "barang_id": item.get("id") or item.get("barang_id"),
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
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()


@router.post("/generate-pdf")
async def start_pdf_generation(
    request: PDFGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user)
):
    """Start PDF generation in background"""
    job_id = str(uuid.uuid4())
    
    # Get instansi info
    instansi = await db.instansi.find_one({})
    instansi_data = sanitize_doc(instansi) if instansi else {}
    
    # Get user ID
    user_id = str(current_user.id) if hasattr(current_user, "id") else str(current_user)
    
    # Create job record
    pdf_jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "total": len(request.items),
        "pdf_url": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    # Start background task
    background_tasks.add_task(
        generate_pdf_task,
        job_id,
        request.items,
        request.canvas_size,
        instansi_data,
        user_id,
        request.html_content
    )
    
    return {"job_id": job_id, "message": "PDF generation started"}
