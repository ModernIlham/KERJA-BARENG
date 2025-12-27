from fastapi import APIRouter, Depends
from fastapi.responses import Response
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from bson import ObjectId
import math
import weasyprint

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Currency formatter
def format_currency(value):
    if not value or value == 0:
        return 'Rp 0'
    if value >= 1e12:
        return f'Rp {value/1e12:.2f}T'
    if value >= 1e9:
        return f'Rp {value/1e9:.2f}M'
    if value >= 1e6:
        return f'Rp {value/1e6:.1f}Jt'
    return f'Rp {value:,.0f}'.replace(',', '.')

def format_number(value):
    return f'{value:,}'.replace(',', '.') if value else '0'

def sanitize_json(data):
    if isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return 0.0
    if isinstance(data, list):
        return [sanitize_json(item) for item in data]
    elif isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    return data

@router.get("/bmn-summary")
async def get_laporan_bmn_summary(current_user: str = Depends(get_current_user)):
    # 1. Ringkasan Nilai Aset (By Category)
    pipeline_nilai = [
        {"$project": {
            "nilai_perolehan": 1,
            "nilai_penyusutan": 1,
            "nilai_buku": 1,
            "category": {
                "$switch": {
                    "branches": [
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\.01"}}, "then": "Tanah"},
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\.03"}}, "then": "Gedung & Bangunan"},
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\.02"}}, "then": "Peralatan & Mesin"},
                    ],
                    "default": "Aset Lainnya"
                }
            }
        }},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "nilai_perolehan": {"$sum": "$nilai_perolehan"},
            "nilai_penyusutan": {"$sum": "$nilai_penyusutan"},
            "nilai_buku": {"$sum": "$nilai_buku"}
        }}
    ]
    nilai_stats = await db.barang.aggregate(pipeline_nilai).to_list(100)
    
    # 2. Kondisi Aset
    pipeline_kondisi = [
        {"$group": {
            "_id": "$kondisi",
            "count": {"$sum": 1}
        }}
    ]
    kondisi_stats = await db.barang.aggregate(pipeline_kondisi).to_list(100)
    
    # 3. Mutasi Summary (Current Year)
    current_year = datetime.now().year
    start_date = datetime(current_year, 1, 1)
    
    pipeline_mutasi = [
        {"$match": {
            "timestamp": {"$gte": start_date}
        }},
        {"$group": {
            "_id": "$jenis", # MASUK, KELUAR, PENYESUAIAN
            "count": {"$sum": 1}, # Unit count
            "qty": {"$sum": "$jumlah"},
            "total_nilai": {"$sum": "$total_nilai"}
        }}
    ]
    mutasi_stats = await db.transaksi.aggregate(pipeline_mutasi).to_list(100)
    
    # 4. KIB List (Top 50 by Value)
    kib_list = await db.barang.find({}).sort("nilai_perolehan", -1).limit(50).to_list(50)
    
    # Format data for frontend
    summary = {
        "nilai_aset": {
            "Tanah": next((x for x in nilai_stats if x["_id"] == "Tanah"), {"count": 0, "nilai_perolehan": 0}),
            "Gedung & Bangunan": next((x for x in nilai_stats if x["_id"] == "Gedung & Bangunan"), {"count": 0, "nilai_perolehan": 0}),
            "Peralatan & Mesin": next((x for x in nilai_stats if x["_id"] == "Peralatan & Mesin"), {"count": 0, "nilai_perolehan": 0}),
            "Aset Lainnya": next((x for x in nilai_stats if x["_id"] == "Aset Lainnya"), {"count": 0, "nilai_perolehan": 0}),
        },
        "penyusutan": {
            "total": sum(x["nilai_penyusutan"] for x in nilai_stats),
            "tahun_berjalan": 0 
        },
        "nilai_buku": {
            "total": sum(x["nilai_buku"] for x in nilai_stats)
        },
        "kondisi": {
            "Baik": next((x['count'] for x in kondisi_stats if x["_id"] == "Baik"), 0),
            "Rusak Ringan": next((x['count'] for x in kondisi_stats if x["_id"] == "Rusak Ringan"), 0),
            "Rusak Berat": next((x['count'] for x in kondisi_stats if x["_id"] == "Rusak Berat"), 0),
            "total": sum(x['count'] for x in kondisi_stats)
        },
        "mutasi": mutasi_stats,


@router.get("/bmn-summary/pdf")
async def get_laporan_bmn_pdf(current_user = Depends(get_current_user)):
    """Generate PDF for Laporan BMN using WeasyPrint"""
    # Get summary data
    nilai_stats = await db.assets.aggregate([
        {"$project": {
            "nilai_perolehan": 1,
            "nilai_penyusutan": 1,
            "nilai_buku": 1,
            "category": {
                "$switch": {
                    "branches": [
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\\.01"}}, "then": "Tanah"},
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\\.03"}}, "then": "Gedung & Bangunan"},
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\\.02"}}, "then": "Peralatan & Mesin"},
                    ],
                    "default": "Aset Lainnya"
                }
            }
        }},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "nilai_perolehan": {"$sum": "$nilai_perolehan"},
            "nilai_penyusutan": {"$sum": "$nilai_penyusutan"},
            "nilai_buku": {"$sum": "$nilai_buku"}
        }}
    ]).to_list(100)
    
    kondisi_stats = await db.assets.aggregate([
        {"$group": {"_id": "$kondisi", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    total_perolehan = sum(x.get("nilai_perolehan", 0) or 0 for x in nilai_stats)
    total_buku = sum(x.get("nilai_buku", 0) or 0 for x in nilai_stats)
    total_penyusutan = sum(x.get("nilai_penyusutan", 0) or 0 for x in nilai_stats)
    total_unit = sum(x.get("count", 0) for x in nilai_stats)
    
    kondisi_baik = next((x['count'] for x in kondisi_stats if x["_id"] == "Baik"), 0)
    kondisi_rr = next((x['count'] for x in kondisi_stats if x["_id"] == "Rusak Ringan"), 0)
    kondisi_rb = next((x['count'] for x in kondisi_stats if x["_id"] == "Rusak Berat"), 0)
    
    # Generate HTML
    html_content = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 15mm;
            }}
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                font-family: Arial, sans-serif;
                font-size: 9pt;
                color: #1a1a1a;
                line-height: 1.4;
            }}
            .header {{
                background: #1e293b;
                color: white;
                padding: 15px 20px;
                margin: -15mm -15mm 15px -15mm;
            }}
            .header-title {{
                font-size: 8pt;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .header-main {{
                font-size: 14pt;
                font-weight: bold;
                margin-top: 4px;
            }}
            .header-sub {{
                font-size: 9pt;
                color: #cbd5e1;
                margin-top: 2px;
            }}
            .badge {{
                background: #2563eb;
                color: white;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 9pt;
                font-weight: bold;
            }}
            .section {{
                margin-bottom: 20px;
            }}
            .section-title {{
                font-size: 11pt;
                font-weight: bold;
                border-bottom: 2px solid #1e293b;
                padding-bottom: 6px;
                margin-bottom: 12px;
                text-transform: uppercase;
            }}
            .grand-total {{
                background: linear-gradient(135deg, #1e3a5f, #2563eb);
                color: white;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 20px;
            }}
            .grand-total-grid {{
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }}
            .grand-total-item {{
                text-align: center;
            }}
            .grand-total-label {{
                font-size: 7pt;
                color: #bfdbfe;
                text-transform: uppercase;
            }}
            .grand-total-value {{
                font-size: 16pt;
                font-weight: bold;
                margin-top: 4px;
            }}
            .data-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }}
            .data-table th {{
                background: #f1f5f9;
                padding: 10px;
                text-align: left;
                font-weight: bold;
                border-bottom: 2px solid #e2e8f0;
            }}
            .data-table td {{
                padding: 8px 10px;
                border-bottom: 1px solid #e2e8f0;
            }}
            .data-table td.right {{
                text-align: right;
            }}
            .data-table tr:last-child {{
                font-weight: bold;
                background: #f8fafc;
            }}
            .kondisi-grid {{
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }}
            .kondisi-item {{
                text-align: center;
                padding: 15px;
                border-radius: 6px;
            }}
            .kondisi-item.green {{ background: #f0fdf4; border: 2px solid #86efac; }}
            .kondisi-item.amber {{ background: #fffbeb; border: 2px solid #fde68a; }}
            .kondisi-item.red {{ background: #fef2f2; border: 2px solid #fecaca; }}
            .kondisi-value {{
                font-size: 20pt;
                font-weight: bold;
            }}
            .kondisi-item.green .kondisi-value {{ color: #16a34a; }}
            .kondisi-item.amber .kondisi-value {{ color: #d97706; }}
            .kondisi-item.red .kondisi-value {{ color: #dc2626; }}
            .kondisi-label {{
                font-size: 9pt;
                font-weight: bold;
                margin-top: 6px;
            }}
            .kondisi-count {{
                font-size: 8pt;
                color: #64748b;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                font-size: 8pt;
                color: #64748b;
            }}
            .flex {{
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
        </style>
    </head>
    <body>
        <!-- HEADER -->
        <div class="header">
            <div class="flex">
                <div>
                    <div class="header-title">Kementerian/Lembaga</div>
                    <div class="header-main">LAPORAN BARANG MILIK NEGARA (BMN)</div>
                    <div class="header-sub">Periode: Tahun Anggaran {datetime.now().year}</div>
                </div>
                <div>
                    <span class="badge">TA {datetime.now().year}</span>
                </div>
            </div>
        </div>
        
        <!-- GRAND TOTAL -->
        <div class="grand-total">
            <div class="grand-total-grid">
                <div class="grand-total-item">
                    <div class="grand-total-label">Total Nilai Perolehan</div>
                    <div class="grand-total-value">{format_currency(total_perolehan)}</div>
                </div>
                <div class="grand-total-item">
                    <div class="grand-total-label">Total Nilai Buku</div>
                    <div class="grand-total-value">{format_currency(total_buku)}</div>
                </div>
                <div class="grand-total-item">
                    <div class="grand-total-label">Total Unit Aset</div>
                    <div class="grand-total-value">{format_number(total_unit)}</div>
                </div>
            </div>
        </div>
        
        <!-- RINGKASAN NILAI ASET -->
        <div class="section">
            <div class="section-title">I. Ringkasan Nilai Aset per Kategori</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Kategori Aset</th>
                        <th class="right">Jumlah Unit</th>
                        <th class="right">Nilai Perolehan</th>
                        <th class="right">Akum. Penyusutan</th>
                        <th class="right">Nilai Buku</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join([f'<tr><td>{x.get("_id", "Lainnya")}</td><td class="right">{format_number(x.get("count", 0))}</td><td class="right">{format_currency(x.get("nilai_perolehan", 0))}</td><td class="right">{format_currency(x.get("nilai_penyusutan", 0))}</td><td class="right">{format_currency(x.get("nilai_buku", 0))}</td></tr>' for x in nilai_stats])}
                    <tr>
                        <td><strong>TOTAL</strong></td>
                        <td class="right"><strong>{format_number(total_unit)}</strong></td>
                        <td class="right"><strong>{format_currency(total_perolehan)}</strong></td>
                        <td class="right"><strong>{format_currency(total_penyusutan)}</strong></td>
                        <td class="right"><strong>{format_currency(total_buku)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- KONDISI ASET -->
        <div class="section">
            <div class="section-title">II. Kondisi Aset</div>
            <div class="kondisi-grid">
                <div class="kondisi-item green">
                    <div class="kondisi-value">{kondisi_baik}</div>
                    <div class="kondisi-label">Kondisi Baik</div>
                    <div class="kondisi-count">{round(kondisi_baik/max(total_unit,1)*100, 1)}% dari total</div>
                </div>
                <div class="kondisi-item amber">
                    <div class="kondisi-value">{kondisi_rr}</div>
                    <div class="kondisi-label">Rusak Ringan</div>
                    <div class="kondisi-count">{round(kondisi_rr/max(total_unit,1)*100, 1)}% dari total</div>
                </div>
                <div class="kondisi-item red">
                    <div class="kondisi-value">{kondisi_rb}</div>
                    <div class="kondisi-label">Rusak Berat</div>
                    <div class="kondisi-count">{round(kondisi_rb/max(total_unit,1)*100, 1)}% dari total</div>
                </div>
            </div>
        </div>
        
        <!-- FOOTER -->
        <div class="footer">
            <p>Laporan BMN - Dicetak pada {datetime.now().strftime('%d %B %Y %H:%M')}</p>
            <p>Dokumen ini dibuat secara otomatis oleh Sistem Informasi BMN</p>
        </div>
    </body>
    </html>
    '''
    
    # Convert to PDF
    pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=laporan_bmn_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )

        "kib": kib_list
    }
    
    return sanitize_json(summary)
