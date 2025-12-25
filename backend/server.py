from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Import Routers
from routes import auth, barang, pegawai, pegawai_photos, transaksi, dashboard, banding, opname, laporan, settings, referensi, persediaan, persediaan_transaksi, laporan_bmn, surat, dokumen, kepegawaian, tasks, activity, kib, aset_pegawai, gudang, notifications, transaksi_cross, approval

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="SIMAN-G API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads Directory
# Mounted at /api/uploads to be accessible via the same proxy/domain path as API
upload_dir = "/app/uploads"
os.makedirs(upload_dir, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=upload_dir), name="uploads")

# API Router
api_router = APIRouter(prefix="/api")

# Include Sub-routers
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(barang.router, prefix="/barang", tags=["Barang"])
api_router.include_router(persediaan.router, prefix="/persediaan", tags=["Persediaan"])
api_router.include_router(pegawai_photos.router, prefix="/pegawai", tags=["Pegawai Photos"])
api_router.include_router(pegawai.router, prefix="/pegawai", tags=["Pegawai"])
api_router.include_router(transaksi.router, prefix="/transaksi", tags=["Transaksi"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(banding.router, prefix="/banding", tags=["Banding"])
api_router.include_router(opname.router, prefix="/opname", tags=["Opname"])
api_router.include_router(laporan.router, prefix="/laporan", tags=["Laporan"])
api_router.include_router(settings.router, prefix="/settings", tags=["Pengaturan"])
api_router.include_router(referensi.router, prefix="/referensi", tags=["Referensi"])
api_router.include_router(persediaan_transaksi.router, prefix="/persediaan-transaksi", tags=["Persediaan Transaksi"])
api_router.include_router(laporan_bmn.router, prefix="/laporan-bmn", tags=["Laporan BMN"])
api_router.include_router(surat.router, prefix="/surat", tags=["Manajemen Persuratan"])

api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks (Kanban)"])
api_router.include_router(kepegawaian.router, prefix="/kepegawaian", tags=["Kepegawaian (HR)"])
api_router.include_router(activity.router, prefix="/activity", tags=["Activity Logging"])
api_router.include_router(kib.router, prefix="/aset", tags=["KIB (Kartu Inventarisasi Barang)"])
api_router.include_router(aset_pegawai.router, prefix="/aset-pegawai", tags=["Aset Pegawai (Tracking)"])

# Gudang (Warehouse Management)
api_router.include_router(gudang.router, prefix="/gudang", tags=["Gudang (Warehouse)"])

# Notifications (Asset Return Alerts)
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# Cross-module transactions (Persediaan <-> Aset)
api_router.include_router(transaksi_cross.router, prefix="/transaksi-cross", tags=["Transaksi Cross Module"])

# Transaction approval system
api_router.include_router(approval.router, prefix="/approval", tags=["Transaction Approval"])

@api_router.get("/")
async def root():
    return {"message": "SIMAN-G API Ready"}
@api_router.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(api_router)

app.include_router(dokumen.router, prefix="/api/dokumen-sumber", tags=["Dokumen Sumber"])
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
