
import asyncio
import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body
from fastapi.responses import FileResponse
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import weasyprint
from weasyprint import HTML, CSS

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory setup
PDF_OUTPUT_DIR = "/app/pdf_output"
os.makedirs(PDF_OUTPUT_DIR, exist_ok=True)

# ... (Previous imports like db, auth, etc. are assumed to be in the file already, 
# but since I'm editing an existing file via search_replace, I just need the function)

async def generate_pdf_task(job_id: str, items: List[Dict], canvas_size: str, instansi: Dict, user_id: str, html_content: Optional[str] = None):
    """Background task to generate PDF using WeasyPrint (HTML to PDF)"""
    try:
        # Update status to processing
        pdf_jobs[job_id]["status"] = "processing"
        pdf_jobs[job_id]["total"] = len(items)
        
        pdf_path = os.path.join(PDF_OUTPUT_DIR, f"{job_id}.pdf")
        
        if html_content:
            # === NEW METHOD: Use HTML from Frontend ===
            logger.info(f"Job {job_id}: Generating PDF from HTML content using WeasyPrint")
            
            # Use WeasyPrint to convert HTML to PDF
            # We run this in a thread to avoid blocking the async event loop
            await asyncio.to_thread(
                HTML(string=html_content).write_pdf, 
                target=pdf_path
            )
            
        else:
            # === FALLBACK: Old Method (ReportLab) or Error ===
            # Since the user specifically requested "Canvas-like" quality which implies HTML fidelity,
            # and we are switching to WeasyPrint, we should try to construct HTML if not provided.
            # However, for now, we will fail gracefully or implement a basic fallback if needed.
            # But the plan is to ALWAYS send HTML from frontend.
            
            raise Exception("Backend requires 'html_content' for high-quality PDF generation. Please update frontend.")

        # Update job status
        pdf_jobs[job_id]["status"] = "completed"
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        pdf_jobs[job_id]["pdf_url"] = f"/api/label-bmn/pdf/{job_id}"
        
        # Record print logs in DB
        # Note: We need to reconnect to DB inside background task if the main connection is not thread-safe or context-bound
        # But motor is async, so we can reuse 'db' global if valid, or create new client.
        # The previous code created a new client, so we will do the same to be safe.
        
        db_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db_async = db_client[os.environ.get("DB_NAME", "bmn_db")]
        
        log_entries = []
        now = datetime.now(timezone.utc).isoformat()
        
        for item in items:
            log = {
                "barang_id": item.get("id") or item.get("barang_id"), # Handle both cases
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
        logger.info(f"Job {job_id}: PDF generated successfully")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        pdf_jobs[job_id]["status"] = "failed"
        pdf_jobs[job_id]["error"] = str(e)
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
