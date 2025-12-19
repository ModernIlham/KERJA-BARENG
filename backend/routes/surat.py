from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Dict, Any
from models import SuratTemplate, SuratArsip
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import os
import jinja2

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- TEMPLATE SEEDING ---
@router.post("/templates/seed")
async def seed_templates(current_user: str = Depends(get_current_user)):
    templates = [
        {
            "nama_template": "Surat Perintah Mulai Kerja (SPMK)",
            "jenis": "SPK",
            "kop_active": True,
            "konten": """<div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.5;">
    <div style="text-align: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 30px;">
        <h3 style="margin: 0;">PEMERINTAH KABUPATEN CONTOH</h3>
        <h2 style="margin: 0;">DINAS PEKERJAAN UMUM</h2>
        <p style="margin: 5px 0 0 0;">Alamat: Jl. Contoh No. 123, Telp. (021) 1234567</p>
    </div>
    
    <div style="text-align: center; margin-bottom: 30px;">
        <h3 style="text-decoration: underline; margin: 0;">SURAT PERINTAH MULAI KERJA (SPMK)</h3>
        <p>Nomor: {{ nomor_surat }}</p>
    </div>

    <p>Yang bertanda tangan di bawah ini:</p>
    <table style="margin-left: 20px;">
        <tr><td style="width: 150px;">Nama</td><td>: {{ ttd_nama }}</td></tr>
        <tr><td>NIP</td><td>: {{ ttd_nip }}</td></tr>
        <tr><td>Jabatan</td><td>: {{ ttd_jabatan }}</td></tr>
    </table>

    <p style="margin-top: 20px;">Memerintahkan kepada:</p>
    <table style="margin-left: 20px;">
        <tr><td style="width: 150px;">Nama Perusahaan</td><td>: {{ kepada }}</td></tr>
        <tr><td>Alamat</td><td>: [Alamat Perusahaan]</td></tr>
    </table>

    <p style="margin-top: 20px;">Untuk segera memulai pelaksanaan pekerjaan dengan rincian sebagai berikut:</p>
    
    <table border="1" cellspacing="0" cellpadding="5" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
            <tr style="background-color: #f0f0f0;">
                <th style="width: 50px;">No</th>
                <th>Uraian Pekerjaan / Barang</th>
                <th>Vol</th>
                <th>Satuan</th>
            </tr>
        </thead>
        <tbody>
            {% for item in daftar_barang %}
            <tr>
                <td style="text-align: center;">{{ loop.index }}</td>
                <td>{{ item.nama }}</td>
                <td style="text-align: center;">{{ item.jumlah }}</td>
                <td style="text-align: center;">{{ item.satuan }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div style="margin-top: 50px; float: right; width: 250px; text-align: center;">
        <p>Ditetapkan di: [Kota]</p>
        <p>Pada tanggal: {{ tanggal }}</p>
        <p style="margin-bottom: 10px;">{{ ttd_jabatan }}</p>
        
        <div style="height: 80px; display: flex; align-items: center; justify-content: center;">
            {{ ttd_image }}
        </div>
        
        <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">{{ ttd_nama }}</p>
        <p style="margin: 0;">NIP. {{ ttd_nip }}</p>
    </div>
</div>"""
        },
        {
            "nama_template": "Berita Acara Serah Terima (BAST)",
            "jenis": "BAST",
            "kop_active": True,
            "konten": """<div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.5;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h3 style="text-decoration: underline; margin: 0;">BERITA ACARA SERAH TERIMA BARANG</h3>
        <p>Nomor: {{ nomor_surat }}</p>
    </div>

    <p>Pada hari ini tanggal <b>{{ tanggal }}</b>, kami yang bertanda tangan di bawah ini:</p>

    <div style="margin-left: 20px;">
        <p><b>1. PIHAK PERTAMA</b></p>
        <table>
            <tr><td style="width: 100px;">Nama</td><td>: [Nama Penyedia]</td></tr>
            <tr><td>Jabatan</td><td>: Direktur</td></tr>
        </table>
        
        <p style="margin-top: 15px;"><b>2. PIHAK KEDUA</b></p>
        <table>
            <tr><td style="width: 100px;">Nama</td><td>: {{ ttd_nama }}</td></tr>
            <tr><td>NIP</td><td>: {{ ttd_nip }}</td></tr>
            <tr><td>Jabatan</td><td>: {{ ttd_jabatan }}</td></tr>
        </table>
    </div>

    <p style="margin-top: 20px;">PIHAK PERTAMA menyerahkan barang kepada PIHAK KEDUA, dan PIHAK KEDUA menerima barang tersebut dalam keadaan baik dan cukup, dengan rincian sebagai berikut:</p>

    <table border="1" cellspacing="0" cellpadding="5" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
            <tr style="background-color: #f0f0f0;">
                <th>No</th>
                <th>Kode Barang</th>
                <th>Nama Barang</th>
                <th>Jumlah</th>
                <th>Keterangan</th>
            </tr>
        </thead>
        <tbody>
            {% for item in daftar_barang %}
            <tr>
                <td style="text-align: center;">{{ loop.index }}</td>
                <td>{{ item.kode }}</td>
                <td>{{ item.nama }}</td>
                <td style="text-align: center;">{{ item.jumlah }} {{ item.satuan }}</td>
                <td>{{ item.keterangan }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div style="width: 250px; text-align: center;">
            <p>PIHAK PERTAMA</p>
            <br/><br/><br/><br/>
            <p style="font-weight: bold; text-decoration: underline;">(........................)</p>
        </div>
        <div style="width: 250px; text-align: center;">
            <p>PIHAK KEDUA</p>
            <div style="height: 80px; margin: 10px 0; display: flex; align-items: center; justify-content: center;">
                {{ ttd_image }}
            </div>
            <p style="font-weight: bold; text-decoration: underline;">{{ ttd_nama }}</p>
            <p>NIP. {{ ttd_nip }}</p>
        </div>
    </div>
</div>"""
        }
    ]
    
    count = 0
    for t in templates:
        # Check duplicate name
        exists = await db.surat_templates.find_one({"nama_template": t["nama_template"]})
        if not exists:
            new_tpl = SuratTemplate(**t)
            await db.surat_templates.insert_one(new_tpl.dict(exclude={"id"}))
            count += 1
            
    return {"message": f"Seeded {count} templates"}

# --- EXISTING ENDPOINTS RE-ADDED ---

@router.get("/templates", response_model=List[SuratTemplate])
async def get_templates(current_user: str = Depends(get_current_user)):
    cursor = db.surat_templates.find().sort("nama_template", 1)
    items = await cursor.to_list(100)
    for i in items: i["id"] = str(i["_id"])
    return items

@router.post("/templates")
async def create_template(tpl: SuratTemplate, current_user: str = Depends(get_current_user)):
    new_tpl = tpl.dict(exclude={"id"})
    res = await db.surat_templates.insert_one(new_tpl)
    return {"message": "Template created", "id": str(res.inserted_id)}

@router.put("/templates/{id}")
async def update_template(id: str, tpl: SuratTemplate, current_user: str = Depends(get_current_user)):
    await db.surat_templates.update_one({"_id": ObjectId(id)}, {"$set": tpl.dict(exclude={"id", "created_at"})})
    return {"message": "Template updated"}

@router.delete("/templates/{id}")
async def delete_template(id: str, current_user: str = Depends(get_current_user)):
    await db.surat_templates.delete_one({"_id": ObjectId(id)})
    return {"message": "Template deleted"}

# --- ARCHIVE / GENERATION ---

@router.get("/arsip")
async def get_archives(limit: int = 20, current_user: str = Depends(get_current_user)):
    cursor = db.surat_arsip.find().sort("created_at", -1).limit(limit)
    items = await cursor.to_list(limit)
    for i in items: i["id"] = str(i["_id"])
    return items

@router.post("/generate-preview")
async def preview_surat(payload: Dict[str, Any], current_user: str = Depends(get_current_user)):
    """
    Takes template_id and transaction_ids. 
    Fetches data, renders Jinja2 template, returns HTML.
    """
    tpl_id = payload.get("template_id")
    tx_ids = payload.get("transaksi_ids", [])
    custom_data = payload.get("custom_data", {}) # e.g. nomor_surat, tanggal override
    
    # 1. Get Template
    tpl = await db.surat_templates.find_one({"_id": ObjectId(tpl_id)})
    if not tpl: raise HTTPException(404, "Template not found")
    
    # 2. Fetch Data
    transactions = []
    if tx_ids:
        # Check 'transaksi' collection first
        cursor = db.transaksi.find({"_id": {"$in": [ObjectId(i) for i in tx_ids if ObjectId.is_valid(i)]}})
        transactions = await cursor.to_list(None)
        
        # If empty, maybe check 'transaksi_persediaan'? (Since ID usually unique enough)
        if not transactions:
             cursor = db.transaksi_persediaan.find({"_id": {"$in": [ObjectId(i) for i in tx_ids if ObjectId.is_valid(i)]}})
             transactions = await cursor.to_list(None)
             
    # 3. Context Builder
    items_list = []
    for tx in transactions:
        items_list.append({
            "kode": tx.get("kode_barang", "-"),
            "nama": tx.get("nama_barang", "-"),
            "jumlah": tx.get("jumlah", 0),
            "satuan": "Unit", 
            "keterangan": tx.get("keterangan", "")
        })
        
    context = {
        "nomor_surat": custom_data.get("nomor_surat", "[NOMOR SURAT]"),
        "tanggal": custom_data.get("tanggal_surat", datetime.now().strftime("%d %B %Y")),
        "daftar_barang": items_list,
        "instansi": "DINAS CONTOH PEMERINTAH",
        
        # TTD Mapping
        "ttd_nama": custom_data.get("ttd_nama", "...................."),
        "ttd_nip": custom_data.get("ttd_nip", "...................."),
        "ttd_jabatan": custom_data.get("ttd_jabatan", "...................."),
        "ttd_image": custom_data.get("ttd_image", ""),
        
        "kepada": custom_data.get("kepada", "....................")
    }
    
    # 4. Render
    try:
        env = jinja2.Environment()
        template = env.from_string(tpl["konten"])
        rendered_html = template.render(**context)
        return {"html": rendered_html}
    except Exception as e:
        raise HTTPException(500, f"Render Error: {str(e)}")

@router.post("/save-generated")
async def save_generated_surat(payload: Dict[str, Any], current_user: str = Depends(get_current_user)):
    # Save the HTML snapshot as an archive record
    archive = SuratArsip(
        nomor_surat=payload.get("nomor_surat", "DRAFT"),
        tanggal_surat=payload.get("tanggal_surat", ""),
        jenis_surat=payload.get("jenis_surat", "General"),
        template_id=payload.get("template_id"),
        transaksi_ids=payload.get("transaksi_ids", []),
        konten_final=payload.get("html_content"),
        created_by=current_user
    )
    res = await db.surat_arsip.insert_one(archive.dict(exclude={"id"}))
    return {"message": "Surat saved", "id": str(res.inserted_id)}
