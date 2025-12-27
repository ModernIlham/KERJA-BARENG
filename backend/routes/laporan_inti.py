"""
Laporan Inti BMN - Comprehensive BMN Report API
Complete with all asset categories and dummy data
"""

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import math
import random
import weasyprint

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Currency formatter for PDF
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
    elif isinstance(data, datetime):
        return data.isoformat()
    return data


# ==================== DUMMY DATA GENERATOR ====================
def generate_comprehensive_dummy_data():
    """Generate comprehensive dummy data for all asset categories"""
    
    # ASET TETAP Categories with realistic government values
    aset_tetap = {
        "tanah": {
            "nama": "Tanah",
            "kode": "1.3.1",
            "unit": 47,
            "luas_m2": 125680,
            "nilai_perolehan": 485_000_000_000,  # 485 Milyar
            "nilai_penyusutan": 0,  # Tanah tidak disusutkan
            "nilai_buku": 485_000_000_000,
            "sertifikat": {"shm": 35, "hgb": 8, "belum": 4},
            "lokasi": [
                {"nama": "Gedung Utama", "luas": 45000, "nilai": 180_000_000_000},
                {"nama": "Kantor Cabang A", "luas": 25000, "nilai": 95_000_000_000},
                {"nama": "Kantor Cabang B", "luas": 18500, "nilai": 72_000_000_000},
                {"nama": "Gudang Pusat", "luas": 22180, "nilai": 85_000_000_000},
                {"nama": "Lahan Parkir", "luas": 15000, "nilai": 53_000_000_000}
            ]
        },
        "peralatan_mesin": {
            "nama": "Peralatan dan Mesin",
            "kode": "1.3.2",
            "unit": 8456,
            "nilai_perolehan": 156_500_000_000,  # 156.5 Milyar
            "nilai_penyusutan": 78_250_000_000,
            "nilai_buku": 78_250_000_000,
            "umur_ekonomis": "8 Tahun",
            "sub_kategori": [
                {"nama": "Alat Angkutan", "unit": 156, "nilai": 42_500_000_000, "kondisi_baik": 142, "rusak_ringan": 10, "rusak_berat": 4},
                {"nama": "Alat Bengkel", "unit": 85, "nilai": 2_800_000_000, "kondisi_baik": 78, "rusak_ringan": 5, "rusak_berat": 2},
                {"nama": "Alat Pertanian", "unit": 24, "nilai": 1_200_000_000, "kondisi_baik": 22, "rusak_ringan": 2, "rusak_berat": 0},
                {"nama": "Alat Kantor", "unit": 2450, "nilai": 18_500_000_000, "kondisi_baik": 2380, "rusak_ringan": 55, "rusak_berat": 15},
                {"nama": "Alat Studio", "unit": 185, "nilai": 8_500_000_000, "kondisi_baik": 175, "rusak_ringan": 8, "rusak_berat": 2},
                {"nama": "Alat Komunikasi", "unit": 520, "nilai": 12_500_000_000, "kondisi_baik": 498, "rusak_ringan": 18, "rusak_berat": 4},
                {"nama": "Alat Ukur", "unit": 125, "nilai": 4_200_000_000, "kondisi_baik": 118, "rusak_ringan": 5, "rusak_berat": 2},
                {"nama": "Alat Kedokteran", "unit": 245, "nilai": 15_800_000_000, "kondisi_baik": 235, "rusak_ringan": 8, "rusak_berat": 2},
                {"nama": "Alat Laboratorium", "unit": 312, "nilai": 22_500_000_000, "kondisi_baik": 298, "rusak_ringan": 12, "rusak_berat": 2},
                {"nama": "Komputer", "unit": 4354, "nilai": 28_000_000_000, "kondisi_baik": 4180, "rusak_ringan": 145, "rusak_berat": 29}
            ]
        },
        "gedung_bangunan": {
            "nama": "Gedung dan Bangunan",
            "kode": "1.3.3",
            "unit": 68,
            "luas_m2": 85420,
            "nilai_perolehan": 425_000_000_000,  # 425 Milyar
            "nilai_penyusutan": 127_500_000_000,
            "nilai_buku": 297_500_000_000,
            "umur_ekonomis": "50 Tahun",
            "sub_kategori": [
                {"nama": "Bangunan Gedung Kantor", "unit": 12, "luas": 45000, "nilai": 285_000_000_000, "imb": 12},
                {"nama": "Bangunan Gedung Tempat Tinggal", "unit": 8, "luas": 12500, "nilai": 45_000_000_000, "imb": 8},
                {"nama": "Bangunan Menara", "unit": 3, "luas": 450, "nilai": 8_500_000_000, "imb": 3},
                {"nama": "Bangunan Monumen", "unit": 2, "luas": 120, "nilai": 2_500_000_000, "imb": 2},
                {"nama": "Tugu Peringatan", "unit": 5, "luas": 85, "nilai": 1_800_000_000, "imb": 5},
                {"nama": "Bangunan Gudang", "unit": 15, "luas": 18500, "nilai": 52_000_000_000, "imb": 14},
                {"nama": "Bangunan Tempat Kerja", "unit": 18, "luas": 7200, "nilai": 25_200_000_000, "imb": 17},
                {"nama": "Bangunan Rambu", "unit": 5, "luas": 65, "nilai": 5_000_000_000, "imb": 5}
            ]
        },
        "jalan_irigasi": {
            "nama": "Jalan, Irigasi, dan Jaringan",
            "kode": "1.3.4",
            "unit": 125,
            "panjang_km": 45.8,
            "nilai_perolehan": 185_000_000_000,  # 185 Milyar
            "nilai_penyusutan": 55_500_000_000,
            "nilai_buku": 129_500_000_000,
            "umur_ekonomis": "10 Tahun",
            "sub_kategori": [
                {"nama": "Jalan", "unit": 28, "panjang": 12.5, "nilai": 85_000_000_000},
                {"nama": "Jembatan", "unit": 8, "panjang": 0.8, "nilai": 32_000_000_000},
                {"nama": "Bangunan Air/Irigasi", "unit": 15, "panjang": 8.5, "nilai": 28_000_000_000},
                {"nama": "Instalasi", "unit": 42, "panjang": 15.0, "nilai": 25_000_000_000},
                {"nama": "Jaringan", "unit": 32, "panjang": 9.0, "nilai": 15_000_000_000}
            ]
        },
        "aset_tetap_lainnya": {
            "nama": "Aset Tetap Lainnya",
            "kode": "1.3.5",
            "unit": 4857,
            "nilai_perolehan": 28_500_000_000,  # 28.5 Milyar
            "nilai_penyusutan": 8_550_000_000,
            "nilai_buku": 19_950_000_000,
            "umur_ekonomis": "4 Tahun",
            "sub_kategori": [
                {"nama": "Buku Perpustakaan", "unit": 3250, "nilai": 8_500_000_000},
                {"nama": "Barang Bercorak Kesenian", "unit": 185, "nilai": 4_200_000_000},
                {"nama": "Hewan", "unit": 12, "nilai": 450_000_000},
                {"nama": "Tanaman", "unit": 1250, "nilai": 3_850_000_000},
                {"nama": "Aset Tetap Renovasi", "unit": 160, "nilai": 11_500_000_000}
            ]
        }
    }
    
    # ASET LANCAR - PERSEDIAAN
    persediaan = {
        "nama": "Aset Lancar - Persediaan",
        "kode": "1.1.5",
        "total_nilai": 15_850_000_000,  # 15.85 Milyar
        "total_item": 892,
        "kategori": [
            {"nama": "Barang Konsumsi", "unit": 245, "nilai": 3_250_000_000, "persentase": 20.5},
            {"nama": "Amunisi", "unit": 0, "nilai": 0, "persentase": 0},
            {"nama": "Bahan Baku", "unit": 125, "nilai": 2_850_000_000, "persentase": 18.0},
            {"nama": "Bahan Penolong", "unit": 85, "nilai": 1_450_000_000, "persentase": 9.1},
            {"nama": "Suku Cadang", "unit": 156, "nilai": 2_100_000_000, "persentase": 13.2},
            {"nama": "Barang Lainnya", "unit": 281, "nilai": 6_200_000_000, "persentase": 39.2}
        ],
        "mutasi": {
            "saldo_awal": 12_500_000_000,
            "masuk": 8_750_000_000,
            "keluar": 5_400_000_000,
            "saldo_akhir": 15_850_000_000
        },
        "stok_kritis": [
            {"kode": "KNS-001", "nama": "Kertas HVS A4 80gsm", "stok": 125, "min": 300, "unit": "rim", "status": "Kritis"},
            {"kode": "KNS-015", "nama": "Tinta Printer HP", "stok": 18, "min": 50, "unit": "botol", "status": "Kritis"},
            {"kode": "BHP-008", "nama": "Bahan Bakar Minyak", "stok": 850, "min": 2000, "unit": "liter", "status": "Rendah"},
            {"kode": "SKC-012", "nama": "Oli Mesin", "stok": 45, "min": 100, "unit": "liter", "status": "Rendah"},
            {"kode": "BLN-025", "nama": "Alat Tulis Kantor", "stok": 85, "min": 150, "unit": "set", "status": "Rendah"}
        ]
    }
    
    # ASET TAK BERWUJUD
    aset_tak_berwujud = {
        "nama": "Aset Tak Berwujud",
        "kode": "1.5.3",
        "total_nilai": 12_500_000_000,  # 12.5 Milyar
        "total_item": 185,
        "nilai_penyusutan": 3_750_000_000,
        "nilai_buku": 8_750_000_000,
        "kategori": [
            {"nama": "Software Aplikasi", "unit": 45, "nilai_perolehan": 4_500_000_000, "amortisasi": 1_350_000_000, "nilai_buku": 3_150_000_000, "umur": "4 Tahun"},
            {"nama": "Lisensi", "unit": 85, "nilai_perolehan": 2_800_000_000, "amortisasi": 840_000_000, "nilai_buku": 1_960_000_000, "umur": "5 Tahun"},
            {"nama": "Hak Paten", "unit": 12, "nilai_perolehan": 1_500_000_000, "amortisasi": 450_000_000, "nilai_buku": 1_050_000_000, "umur": "10 Tahun"},
            {"nama": "Hak Cipta", "unit": 8, "nilai_perolehan": 850_000_000, "amortisasi": 255_000_000, "nilai_buku": 595_000_000, "umur": "10 Tahun"},
            {"nama": "Franchise", "unit": 5, "nilai_perolehan": 1_250_000_000, "amortisasi": 375_000_000, "nilai_buku": 875_000_000, "umur": "5 Tahun"},
            {"nama": "Hasil Kajian/Penelitian", "unit": 30, "nilai_perolehan": 1_600_000_000, "amortisasi": 480_000_000, "nilai_buku": 1_120_000_000, "umur": "4 Tahun"}
        ],
        "tren_amortisasi": [
            {"tahun": 2021, "nilai": 2_500_000_000},
            {"tahun": 2022, "nilai": 2_850_000_000},
            {"tahun": 2023, "nilai": 3_200_000_000},
            {"tahun": 2024, "nilai": 3_500_000_000},
            {"tahun": 2025, "nilai": 3_750_000_000}
        ]
    }
    
    # KONSTRUKSI DALAM PENGERJAAN (KDP)
    kdp = {
        "nama": "Konstruksi Dalam Pengerjaan",
        "kode": "1.3.6",
        "total_nilai": 85_000_000_000,  # 85 Milyar
        "total_proyek": 12,
        "proyek_aktif": [
            {"nama": "Pembangunan Gedung Kantor Baru", "lokasi": "Jakarta", "nilai_kontrak": 45_000_000_000, "realisasi": 28_500_000_000, "progress": 63.3, "target": "Des 2025"},
            {"nama": "Renovasi Gedung Utama", "lokasi": "Jakarta", "nilai_kontrak": 18_500_000_000, "realisasi": 15_200_000_000, "progress": 82.2, "target": "Mar 2025"},
            {"nama": "Pembangunan Gudang Regional", "lokasi": "Surabaya", "nilai_kontrak": 12_000_000_000, "realisasi": 8_500_000_000, "progress": 70.8, "target": "Jun 2025"},
            {"nama": "Pengadaan Sistem IT Terpadu", "lokasi": "Jakarta", "nilai_kontrak": 8_500_000_000, "realisasi": 5_200_000_000, "progress": 61.2, "target": "Sep 2025"},
            {"nama": "Pembangunan Jalan Akses", "lokasi": "Bandung", "nilai_kontrak": 6_800_000_000, "realisasi": 4_850_000_000, "progress": 71.3, "target": "Apr 2025"},
            {"nama": "Instalasi Jaringan Fiber Optik", "lokasi": "Multi-lokasi", "nilai_kontrak": 4_200_000_000, "realisasi": 2_750_000_000, "progress": 65.5, "target": "Jul 2025"}
        ],
        "status_proyek": {
            "on_track": 8,
            "delayed": 3,
            "completed": 1
        },
        "realisasi_anggaran": {
            "total_kontrak": 95_000_000_000,
            "total_realisasi": 65_000_000_000,
            "persentase": 68.4
        }
    }
    
    return {
        "aset_tetap": aset_tetap,
        "persediaan": persediaan,
        "aset_tak_berwujud": aset_tak_berwujud,
        "kdp": kdp
    }


@router.get("/ringkasan-eksekutif")
async def get_ringkasan_eksekutif(current_user: str = Depends(get_current_user)):
    """Section I: Ringkasan Eksekutif - Lengkap semua kategori"""
    
    dummy = generate_comprehensive_dummy_data()
    at = dummy["aset_tetap"]
    
    # Calculate totals
    total_perolehan = sum([
        at["tanah"]["nilai_perolehan"],
        at["peralatan_mesin"]["nilai_perolehan"],
        at["gedung_bangunan"]["nilai_perolehan"],
        at["jalan_irigasi"]["nilai_perolehan"],
        at["aset_tetap_lainnya"]["nilai_perolehan"]
    ])
    
    total_penyusutan = sum([
        at["tanah"]["nilai_penyusutan"],
        at["peralatan_mesin"]["nilai_penyusutan"],
        at["gedung_bangunan"]["nilai_penyusutan"],
        at["jalan_irigasi"]["nilai_penyusutan"],
        at["aset_tetap_lainnya"]["nilai_penyusutan"]
    ])
    
    total_buku = sum([
        at["tanah"]["nilai_buku"],
        at["peralatan_mesin"]["nilai_buku"],
        at["gedung_bangunan"]["nilai_buku"],
        at["jalan_irigasi"]["nilai_buku"],
        at["aset_tetap_lainnya"]["nilai_buku"]
    ])
    
    total_unit = sum([
        at["tanah"]["unit"],
        at["peralatan_mesin"]["unit"],
        at["gedung_bangunan"]["unit"],
        at["jalan_irigasi"]["unit"],
        at["aset_tetap_lainnya"]["unit"]
    ])
    
    return sanitize_json({
        "aset_tetap": {
            "tanah": at["tanah"],
            "peralatan_mesin": at["peralatan_mesin"],
            "gedung_bangunan": at["gedung_bangunan"],
            "jalan_irigasi": at["jalan_irigasi"],
            "aset_tetap_lainnya": at["aset_tetap_lainnya"],
            "total": {
                "unit": total_unit,
                "nilai_perolehan": total_perolehan,
                "nilai_penyusutan": total_penyusutan,
                "nilai_buku": total_buku
            }
        },
        "persediaan": dummy["persediaan"],
        "aset_tak_berwujud": dummy["aset_tak_berwujud"],
        "kdp": dummy["kdp"],
        "grand_total": {
            "nilai_perolehan": total_perolehan + dummy["persediaan"]["total_nilai"] + dummy["aset_tak_berwujud"]["total_nilai"] + dummy["kdp"]["total_nilai"],
            "nilai_buku": total_buku + dummy["persediaan"]["total_nilai"] + dummy["aset_tak_berwujud"]["nilai_buku"] + dummy["kdp"]["total_nilai"]
        }
    })


@router.get("/rekapitulasi-kategori")
async def get_rekapitulasi_kategori(current_user: str = Depends(get_current_user)):
    """Section II: Rekapitulasi per Kategori"""
    
    dummy = generate_comprehensive_dummy_data()
    at = dummy["aset_tetap"]
    
    data = [
        {"kode": "1.3.1", "kategori": "Tanah", "unit": at["tanah"]["unit"], "perolehan": at["tanah"]["nilai_perolehan"], "penyusutan": at["tanah"]["nilai_penyusutan"], "nilai_buku": at["tanah"]["nilai_buku"]},
        {"kode": "1.3.2", "kategori": "Peralatan & Mesin", "unit": at["peralatan_mesin"]["unit"], "perolehan": at["peralatan_mesin"]["nilai_perolehan"], "penyusutan": at["peralatan_mesin"]["nilai_penyusutan"], "nilai_buku": at["peralatan_mesin"]["nilai_buku"]},
        {"kode": "1.3.3", "kategori": "Gedung & Bangunan", "unit": at["gedung_bangunan"]["unit"], "perolehan": at["gedung_bangunan"]["nilai_perolehan"], "penyusutan": at["gedung_bangunan"]["nilai_penyusutan"], "nilai_buku": at["gedung_bangunan"]["nilai_buku"]},
        {"kode": "1.3.4", "kategori": "Jalan, Irigasi, Jaringan", "unit": at["jalan_irigasi"]["unit"], "perolehan": at["jalan_irigasi"]["nilai_perolehan"], "penyusutan": at["jalan_irigasi"]["nilai_penyusutan"], "nilai_buku": at["jalan_irigasi"]["nilai_buku"]},
        {"kode": "1.3.5", "kategori": "Aset Tetap Lainnya", "unit": at["aset_tetap_lainnya"]["unit"], "perolehan": at["aset_tetap_lainnya"]["nilai_perolehan"], "penyusutan": at["aset_tetap_lainnya"]["nilai_penyusutan"], "nilai_buku": at["aset_tetap_lainnya"]["nilai_buku"]},
        {"kode": "1.3.6", "kategori": "KDP", "unit": dummy["kdp"]["total_proyek"], "perolehan": dummy["kdp"]["total_nilai"], "penyusutan": 0, "nilai_buku": dummy["kdp"]["total_nilai"]},
        {"kode": "1.5.3", "kategori": "Aset Tak Berwujud", "unit": dummy["aset_tak_berwujud"]["total_item"], "perolehan": dummy["aset_tak_berwujud"]["total_nilai"], "penyusutan": dummy["aset_tak_berwujud"]["nilai_penyusutan"], "nilai_buku": dummy["aset_tak_berwujud"]["nilai_buku"]},
        {"kode": "1.1.5", "kategori": "Persediaan", "unit": dummy["persediaan"]["total_item"], "perolehan": dummy["persediaan"]["total_nilai"], "penyusutan": 0, "nilai_buku": dummy["persediaan"]["total_nilai"]}
    ]
    
    total_perolehan = sum(d["perolehan"] for d in data)
    
    for d in data:
        d["persentase"] = round(d["perolehan"] / total_perolehan * 100, 1) if total_perolehan > 0 else 0
    
    return sanitize_json({
        "data": data,
        "total": {
            "unit": sum(d["unit"] for d in data),
            "perolehan": total_perolehan,
            "penyusutan": sum(d["penyusutan"] for d in data),
            "nilai_buku": sum(d["nilai_buku"] for d in data)
        }
    })


@router.get("/kondisi-aset")
async def get_kondisi_aset(current_user: str = Depends(get_current_user)):
    """Section III: Kondisi Aset"""
    
    dummy = generate_comprehensive_dummy_data()
    pm = dummy["aset_tetap"]["peralatan_mesin"]
    
    # Calculate condition from peralatan_mesin sub categories
    total_baik = sum(s["kondisi_baik"] for s in pm["sub_kategori"])
    total_rr = sum(s["rusak_ringan"] for s in pm["sub_kategori"])
    total_rb = sum(s["rusak_berat"] for s in pm["sub_kategori"])
    total_all = total_baik + total_rr + total_rb
    
    return sanitize_json({
        "distribusi": [
            {"label": "Baik", "count": total_baik, "persentase": round(total_baik/total_all*100, 1), "color": "#16a34a"},
            {"label": "Rusak Ringan", "count": total_rr, "persentase": round(total_rr/total_all*100, 1), "color": "#ca8a04"},
            {"label": "Rusak Berat", "count": total_rb, "persentase": round(total_rb/total_all*100, 1), "color": "#dc2626"}
        ],
        "total_aset": total_all,
        "per_kategori": [
            {"kategori": s["nama"], "baik": s["kondisi_baik"], "rr": s["rusak_ringan"], "rb": s["rusak_berat"], "total": s["kondisi_baik"]+s["rusak_ringan"]+s["rusak_berat"]}
            for s in pm["sub_kategori"][:6]
        ],
        "per_unit_kerja": [
            {"unit": "Sekretariat", "baik": 1250, "rusak_ringan": 45, "rusak_berat": 12, "total": 1307},
            {"unit": "Dit. Perencanaan", "baik": 980, "rusak_ringan": 32, "rusak_berat": 8, "total": 1020},
            {"unit": "Dit. Pelaksanaan", "baik": 1450, "rusak_ringan": 55, "rusak_berat": 15, "total": 1520},
            {"unit": "Dit. Pengawasan", "baik": 820, "rusak_ringan": 28, "rusak_berat": 6, "total": 854},
            {"unit": "Inspektorat", "baik": 450, "rusak_ringan": 12, "rusak_berat": 3, "total": 465},
            {"unit": "Pusdatin", "baik": 680, "rusak_ringan": 22, "rusak_berat": 5, "total": 707}
        ]
    })


@router.get("/pelabelan-aset")
async def get_pelabelan_aset(current_user: str = Depends(get_current_user)):
    """Section V: Manajemen Pelabelan Aset"""
    
    dummy = generate_comprehensive_dummy_data()
    total = dummy["aset_tetap"]["peralatan_mesin"]["unit"]
    
    terlabel = int(total * 0.915)
    belum = total - terlabel
    tercetak = int(total * 0.92)
    rusak = int(total * 0.03)
    
    return sanitize_json({
        "status_label": {"terlabel": terlabel, "belum": belum, "total": total, "persentase_terlabel": 91.5},
        "status_cetak": {"tercetak": tercetak, "belum": total - tercetak, "total": total, "persentase_tercetak": 92.0},
        "total_rusak": rusak,
        "jenis_rusak": [
            {"jenis": "Pudar", "count": int(rusak*0.33), "persentase": 33},
            {"jenis": "Terkelupas", "count": int(rusak*0.25), "persentase": 25},
            {"jenis": "Sobek", "count": int(rusak*0.17), "persentase": 17},
            {"jenis": "Hilang", "count": int(rusak*0.17), "persentase": 17},
            {"jenis": "Cairan", "count": int(rusak*0.08), "persentase": 8}
        ],
        "detail_per_kategori": [
            {"kategori": "Peralatan & Mesin", "total": 8456, "label": 7737, "belum": 719, "persentase": 91.5},
            {"kategori": "Gedung & Bangunan", "total": 68, "label": 66, "belum": 2, "persentase": 97.1},
            {"kategori": "Jalan, Irigasi", "total": 125, "label": 118, "belum": 7, "persentase": 94.4},
            {"kategori": "Aset Tetap Lainnya", "total": 4857, "label": 4420, "belum": 437, "persentase": 91.0}
        ],
        "rekomendasi": [
            "Percepat pelabelan 719 unit peralatan & mesin yang belum terlabel",
            "Ganti 254 label yang rusak (prioritas: pudar dan terkelupas)",
            "Verifikasi kode barang untuk menghindari kesalahan pencatatan"
        ]
    })


@router.get("/pengamanan-aset")
async def get_pengamanan_aset(current_user: str = Depends(get_current_user)):
    """Section VI: Pengamanan Aset BMN"""
    
    return sanitize_json({
        "tertib": {
            "administrasi": {"persentase": 93.8, "count": 12580, "total": 13415},
            "fisik": {"persentase": 91.5, "count": 12272, "total": 13415},
            "hukum": {"persentase": 89.0, "count": 11939, "total": 13415}
        },
        "tren_pengamanan": [
            {"bulan": "Jan", "admin": 88, "fisik": 85, "hukum": 80},
            {"bulan": "Apr", "admin": 90, "fisik": 88, "hukum": 83},
            {"bulan": "Jul", "admin": 92, "fisik": 90, "hukum": 86},
            {"bulan": "Okt", "admin": 93, "fisik": 91, "hukum": 88},
            {"bulan": "Des", "admin": 93.8, "fisik": 91.5, "hukum": 89.0}
        ],
        "per_unit_kerja": [
            {"unit": "Sekretariat", "total": 1307, "admin": 96.3, "fisik": 94.6, "hukum": 92.5, "overall": 94.5},
            {"unit": "Dit. Perencanaan", "total": 1020, "admin": 94.8, "fisik": 93.2, "hukum": 90.1, "overall": 92.7},
            {"unit": "Dit. Pelaksanaan", "total": 1520, "admin": 95.2, "fisik": 92.8, "hukum": 88.5, "overall": 92.2},
            {"unit": "Dit. Pengawasan", "total": 854, "admin": 93.6, "fisik": 91.5, "hukum": 87.2, "overall": 90.8},
            {"unit": "Inspektorat", "total": 465, "admin": 97.1, "fisik": 95.3, "hukum": 93.8, "overall": 95.4}
        ],
        "rencana_aksi": [
            {"kegiatan": "Inventarisasi & Verifikasi Fisik", "pic": "Ka. BMN", "target": "15 Jan 2025", "status": "Proses"},
            {"kegiatan": "Penyelesaian Sertifikasi Tanah", "pic": "Ka. Hukum", "target": "31 Mar 2025", "status": "Jadwal"},
            {"kegiatan": "Pembaruan Data SIMAK-BMN", "pic": "Operator", "target": "28 Feb 2025", "status": "Proses"}
        ]
    })


@router.get("/persediaan")
async def get_persediaan_summary(current_user: str = Depends(get_current_user)):
    """Section VII: Persediaan"""
    
    dummy = generate_comprehensive_dummy_data()
    p = dummy["persediaan"]
    
    return sanitize_json({
        "nilai_persediaan": {
            "total_nilai": p["total_nilai"],
            "total_item": p["total_item"]
        },
        "mutasi": p["mutasi"],
        "distribusi_kategori": p["kategori"],
        "stok_rendah": p["stok_kritis"],
        "gudang": [
            {"gudang": "Utama", "pic": "Ahmad S.", "item": 285, "nilai": 5_250_000_000, "kapasitas": 85},
            {"gudang": "ATK", "pic": "Budi W.", "item": 245, "nilai": 3_250_000_000, "kapasitas": 60},
            {"gudang": "IT", "pic": "Dewi R.", "item": 156, "nilai": 2_100_000_000, "kapasitas": 45},
            {"gudang": "Bahan", "pic": "Eko P.", "item": 125, "nilai": 2_850_000_000, "kapasitas": 70},
            {"gudang": "Suku Cadang", "pic": "Fitri A.", "item": 81, "nilai": 2_400_000_000, "kapasitas": 55}
        ],
        "permintaan_unit": [
            {"unit": "Sekretariat", "total": 478, "nilai": 1_250_000_000, "persentase": 25.5},
            {"unit": "Dit. Perencanaan", "total": 425, "nilai": 980_000_000, "persentase": 22.7},
            {"unit": "Dit. Pelaksanaan", "total": 385, "nilai": 850_000_000, "persentase": 20.6},
            {"unit": "Dit. Pengawasan", "total": 312, "nilai": 720_000_000, "persentase": 16.7}
        ],
        "tren_mutasi": [
            {"bulan": "Jan", "masuk": 1_450_000_000, "keluar": 1_020_000_000},
            {"bulan": "Apr", "masuk": 1_680_000_000, "keluar": 1_250_000_000},
            {"bulan": "Jul", "masuk": 1_520_000_000, "keluar": 1_380_000_000},
            {"bulan": "Okt", "masuk": 1_950_000_000, "keluar": 1_450_000_000},
            {"bulan": "Des", "masuk": 2_150_000_000, "keluar": 1_300_000_000}
        ]
    })


@router.get("/dasar-hukum")
async def get_dasar_hukum(current_user: str = Depends(get_current_user)):
    """Section VIII: Dasar Hukum & Pengesahan"""
    
    return sanitize_json({
        "dasar_hukum": [
            "UU No. 1 Tahun 2004 tentang Perbendaharaan Negara",
            "PP No. 27 Tahun 2014 tentang Pengelolaan BMN/D",
            "PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN",
            "PMK No. 83/PMK.06/2016 tentang Tata Cara Penghapusan BMN",
            "Perdirjen KN No. PER-7/KN/2009 tentang Rekonsiliasi Data BMN"
        ],
        "catatan_penting": [
            "Laporan disusun berdasarkan data SIMAK-BMN",
            "Data telah direkonsiliasi dengan SAI per tanggal pelaporan",
            "Nilai penyusutan menggunakan metode garis lurus",
            "Aset rusak berat diusulkan penghapusan sesuai PMK 83/2016"
        ],
        "pengesahan": [
            {"jabatan": "Kepala Bagian Pengelolaan BMN", "nama": "Dr. H. Ahmad Suryadi, M.Si", "nip": "19700812 199503 1 002"},
            {"jabatan": "Kepala Sub Bagian Umum", "nama": "Drs. Bambang Wijaya, M.M.", "nip": "19750520 200112 1 001"},
            {"jabatan": "Auditor Internal", "nama": "Ir. Siti Rahayu, M.Ak.", "nip": "19681110 199203 2 001"}
        ],
        "metadata": {
            "tanggal_cetak": datetime.now().strftime("%d %B %Y"),
            "versi_dokumen": "1.0",
            "tahun_anggaran": datetime.now().year
        }
    })


@router.get("/full-report")
async def get_full_report(current_user: str = Depends(get_current_user)):
    """Get complete report data"""
    
    ringkasan = await get_ringkasan_eksekutif(current_user)
    rekapitulasi = await get_rekapitulasi_kategori(current_user)
    kondisi = await get_kondisi_aset(current_user)
    pelabelan = await get_pelabelan_aset(current_user)
    pengamanan = await get_pengamanan_aset(current_user)
    persediaan = await get_persediaan_summary(current_user)
    dasar_hukum = await get_dasar_hukum(current_user)
    
    return sanitize_json({
        "ringkasan_eksekutif": ringkasan,
        "rekapitulasi_kategori": rekapitulasi,
        "kondisi_aset": kondisi,
        "pelabelan_aset": pelabelan,
        "pengamanan_aset": pengamanan,
        "persediaan": persediaan,
        "dasar_hukum": dasar_hukum,
        "header": {
            "kementerian": "KEMENTERIAN CONTOH REPUBLIK INDONESIA",
            "direktorat": "DIREKTORAT JENDERAL PENGELOLAAN ASET",
            "alamat": "Jl. Merdeka Barat No. 15, Jakarta Pusat 10110",
            "nomor_dokumen": f"DOC/BMN/{datetime.now().year}/XII/001",
            "tahun_anggaran": datetime.now().year,
            "judul_laporan": "LAPORAN BARANG MILIK NEGARA (BMN)",
            "regulasi": "Sesuai PP No. 27 Tahun 2014 tentang Pengelolaan BMN"
        }
    })


@router.get("/ringkas")
async def get_laporan_ringkas(current_user: str = Depends(get_current_user)):
    """
    Laporan Ringkas - Executive Summary 1 halaman A4
    Merangkum seluruh informasi dari Laporan Inti
    """
    
    dummy = generate_comprehensive_dummy_data()
    at = dummy["aset_tetap"]
    
    # Calculate totals
    total_at_perolehan = sum([at[k]["nilai_perolehan"] for k in at])
    total_at_buku = sum([at[k]["nilai_buku"] for k in at])
    total_at_unit = sum([at[k]["unit"] for k in at])
    
    grand_perolehan = total_at_perolehan + dummy["persediaan"]["total_nilai"] + dummy["aset_tak_berwujud"]["total_nilai"] + dummy["kdp"]["total_nilai"]
    grand_buku = total_at_buku + dummy["persediaan"]["total_nilai"] + dummy["aset_tak_berwujud"]["nilai_buku"] + dummy["kdp"]["total_nilai"]
    
    return sanitize_json({
        "header": {
            "kementerian": "KEMENTERIAN CONTOH REPUBLIK INDONESIA",
            "direktorat": "DIREKTORAT JENDERAL PENGELOLAAN ASET",
            "nomor_dokumen": f"DOC/BMN-RINGKAS/{datetime.now().year}/XII/001",
            "tahun_anggaran": datetime.now().year,
            "tanggal": datetime.now().strftime("%d %B %Y")
        },
        "ikhtisar_bmn": {
            "grand_total_perolehan": grand_perolehan,
            "grand_total_buku": grand_buku,
            "aset_tetap": {
                "total_perolehan": total_at_perolehan,
                "total_buku": total_at_buku,
                "total_unit": total_at_unit,
                "breakdown": [
                    {"nama": "Tanah", "nilai": at["tanah"]["nilai_buku"], "unit": at["tanah"]["unit"]},
                    {"nama": "Peralatan & Mesin", "nilai": at["peralatan_mesin"]["nilai_buku"], "unit": at["peralatan_mesin"]["unit"]},
                    {"nama": "Gedung & Bangunan", "nilai": at["gedung_bangunan"]["nilai_buku"], "unit": at["gedung_bangunan"]["unit"]},
                    {"nama": "Jalan, Irigasi, Jaringan", "nilai": at["jalan_irigasi"]["nilai_buku"], "unit": at["jalan_irigasi"]["unit"]},
                    {"nama": "Aset Tetap Lainnya", "nilai": at["aset_tetap_lainnya"]["nilai_buku"], "unit": at["aset_tetap_lainnya"]["unit"]}
                ]
            },
            "persediaan": {
                "total_nilai": dummy["persediaan"]["total_nilai"],
                "total_item": dummy["persediaan"]["total_item"],
                "stok_kritis": len(dummy["persediaan"]["stok_kritis"])
            },
            "aset_tak_berwujud": {
                "total_nilai": dummy["aset_tak_berwujud"]["total_nilai"],
                "nilai_buku": dummy["aset_tak_berwujud"]["nilai_buku"],
                "total_item": dummy["aset_tak_berwujud"]["total_item"]
            },
            "kdp": {
                "total_nilai": dummy["kdp"]["total_nilai"],
                "proyek_aktif": dummy["kdp"]["total_proyek"],
                "progress_rata": 68.4
            }
        },
        "kondisi_aset": {
            "baik_persen": 96.1,
            "rusak_ringan_persen": 3.2,
            "rusak_berat_persen": 0.7,
            "total_unit": 8456
        },
        "pengamanan": {
            "administrasi": 93.8,
            "fisik": 91.5,
            "hukum": 89.0,
            "rata_rata": 91.4
        },
        "pelabelan": {
            "terlabel_persen": 91.5,
            "belum_label": 1153,
            "label_rusak": 254
        },
        "highlight": [
            {"icon": "up", "text": "Total BMN naik 12.5% dari tahun sebelumnya", "color": "green"},
            {"icon": "check", "text": "96.1% aset dalam kondisi baik", "color": "green"},
            {"icon": "alert", "text": "5 item persediaan dalam status stok kritis", "color": "amber"},
            {"icon": "clock", "text": "4 proyek KDP on-track untuk selesai 2025", "color": "blue"}
        ],
        "tanda_tangan": {
            "jabatan": "Kepala Bagian BMN",
            "nama": "Dr. H. Ahmad Suryadi, M.Si",
            "nip": "19700812 199503 1 002"
        }
    })
