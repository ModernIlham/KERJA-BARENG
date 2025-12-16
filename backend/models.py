from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, values=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

class MongoBaseModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# --- Auth Models ---
class SystemSettings(BaseModel):
    key: str = "general"
    monthly_upload_limit: int = 500
    current_month: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m"))
    current_month_count: int = 0

class InstansiSettings(BaseModel):
    key: str = "instansi"
    nama_instansi: str = ""
    alamat: str = ""
    telepon: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    kota: Optional[str] = None
    kodepos: Optional[str] = None
    logo_url: Optional[str] = None
    nama_pimpinan: Optional[str] = None
    nip_pimpinan: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(MongoBaseModel):
    email: EmailStr
    full_name: str
    role: str = "user" 
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "user"

# --- Referensi Kodefikasi ---
class Kodefikasi(MongoBaseModel):
    kode: str 
    uraian: str 
    level: int 
    parent_kode: Optional[str] = None

class KodefikasiCreate(BaseModel):
    kode: str
    uraian: str
    level: Optional[int] = None

# --- Stok FIFO Batch Model ---
class StokBatch(MongoBaseModel):
    barang_id: str
    kode_barang: str
    nup: str = "1"
    tgl_masuk: datetime
    jumlah_awal: int
    jumlah_sisa: int
    nilai_satuan: float
    dokumen_ref: Optional[str] = None 

# --- Barang (Asset) Models - EXTENDED ---
class Barang(MongoBaseModel):
    # Identifiers
    kode_barang: str
    nup: str = "1"
    kode_satker: Optional[str] = None
    nama_satker: Optional[str] = None
    kode_register: Optional[str] = None
    
    # Details
    nama_barang: str
    merk: Optional[str] = None
    tipe: Optional[str] = None
    kategori: Optional[str] = None
    satuan: Optional[str] = None
    kondisi: Optional[str] = None 
    
    # Dates
    tgl_perolehan: Optional[str] = None 
    tgl_buku: Optional[str] = None
    tgl_penghapusan: Optional[str] = None
    tahun_anggaran: Optional[str] = None
    
    # Financials
    nilai_satuan: float = 0 
    nilai_perolehan_pertama: float = 0
    nilai_perolehan: float = 0
    nilai_buku: float = 0
    nilai_penyusutan: float = 0
    nilai_mutasi: float = 0
    
    # Classification / SIMAN
    intra_ekstra: Optional[str] = None 
    status_aset: str = "Aktif"
    status_penggunaan: Optional[str] = None
    kode_akun: Optional[str] = None
    uraian_akun: Optional[str] = None
    golongan_barang: Optional[str] = None
    sub_sub_kelompok: Optional[str] = None
    penggolongan_siman: Optional[str] = None
    
    # Location
    lokasi_fisik: Optional[str] = None
    ruang: Optional[str] = None
    alamat: Optional[str] = None
    kelurahan: Optional[str] = None
    kecamatan: Optional[str] = None
    kab_kota: Optional[str] = None
    provinsi: Optional[str] = None
    kode_pos: Optional[str] = None
    rt_rw: Optional[str] = None
    
    # Land/Building Specs
    luas_tanah: float = 0
    # Photos
    fotos: List[Dict[str, Any]] = [] # [{"url": "/uploads/...", "is_thumbnail": True, "keterangan": "Depan"}]
    
    luas_bangunan: float = 0
    
    # Certificates & Documents
    no_sertifikat: Optional[str] = None
    status_sertifikasi: Optional[str] = None
    tgl_sertifikat: Optional[str] = None
    jenis_sertifikat: Optional[str] = None
    no_psp: Optional[str] = None
    tgl_psp: Optional[str] = None
    
    # Inventory
    stok: int = 0
    batas_stok_kritis: int = 1
    
    # IMPORT DATA LAINNYA (Dynamic)
    detail_lainnya: Dict[str, Any] = {}
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BarangCreate(BaseModel):
    kode_barang: str
    nup: str = "1"
    nama_barang: str
    merk: Optional[str] = None
    tipe: Optional[str] = None
    kondisi: Optional[str] = None
    tgl_perolehan: Optional[str] = None
    nilai_perolehan: Optional[float] = 0
    nilai_satuan: Optional[float] = 0
    lokasi_fisik: Optional[str] = None
    stok: int = 0
    golongan_barang: Optional[str] = None
    batas_stok_kritis: Optional[int] = 1
    
    kode_satker: Optional[str] = None
    nama_satker: Optional[str] = None
    kode_register: Optional[str] = None
    tahun_anggaran: Optional[str] = None
    intra_ekstra: Optional[str] = None
    status_penggunaan: Optional[str] = None
    
    alamat: Optional[str] = None
    rt_rw: Optional[str] = None
    kelurahan: Optional[str] = None
    kecamatan: Optional[str] = None
    kab_kota: Optional[str] = None
    provinsi: Optional[str] = None
    kode_pos: Optional[str] = None
    ruang: Optional[str] = None
    
    no_sertifikat: Optional[str] = None
    status_sertifikasi: Optional[str] = None
    tgl_sertifikat: Optional[str] = None
    no_psp: Optional[str] = None
    tgl_psp: Optional[str] = None
    
    luas_tanah: Optional[float] = 0
    luas_bangunan: Optional[float] = 0
    
    detail_lainnya: Optional[Dict[str, Any]] = {}

# --- Pegawai (Employee) Models ---
class RiwayatKarir(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    tanggal: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    jenis: str # "Pengangkatan", "Mutasi Internal", "Mutasi Eksternal", "Kenaikan Pangkat"
    deskripsi: str
    jabatan_baru: Optional[str] = None
    unit_kerja_baru: Optional[str] = None # Eselon combined or full string
    pangkat_baru: Optional[str] = None
    sk_ref: Optional[str] = None

class Pegawai(MongoBaseModel):
    # Informasi Utama
    nip: str
    nik: Optional[str] = None
    npwp: Optional[str] = None
    nama_lengkap: str
    gelar_depan: Optional[str] = None
    gelar_belakang: Optional[str] = None
    kewarganegaraan: str = "WNI"
    
    # Kontak
    no_telp: Optional[str] = None
    email: Optional[str] = None
    
    # Bank
    nama_bank: Optional[str] = None
    no_rekening: Optional[str] = None
    
    # Jabatan & Unit Kerja
    jabatan: str # Jabatan Struktural Utama
    eselon1: Optional[str] = None
    # Leadership
    is_pimpinan_tertinggi: bool = False # Kepala / Wakil Kepala
    jenis_pimpinan: Optional[str] = None # "Kepala", "Wakil"
    
    # Photo
    foto_url: Optional[str] = None
    foto_thumbnail_url: Optional[str] = None
    eselon2: Optional[str] = None
    eselon3: Optional[str] = None
    eselon4: Optional[str] = None
    jabatan_melekat: List[str] = [] # Jabatan Fungsional Melekat
    eselon5: Optional[str] = None
    
    # Atribut & Status
    status_kepegawaian: Optional[str] = None # PNS, PPPK, Non-ASN
    kategori_pegawai: Optional[str] = None # Struktural, Fungsional, Pelaksana
    status_penempatan: Optional[str] = None # Pusat, Daerah, Penugasan
    status_jabatan: Optional[str] = None # Definitif, Plt, Plh
    pangkat_golongan: Optional[str] = None # e.g. Penata Muda (III/a)
    
    # System Status
    status: str = "AKTIF" # AKTIF, CUTI, PENSIUN, KELUAR
    keterangan: Optional[str] = None
    
    # History
    riwayat_karir: List[RiwayatKarir] = []
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PegawaiCreate(BaseModel):
    # Mandatory
    nip: str
    nama_lengkap: str
    jabatan: str
    
    # Optional Fields
    nik: Optional[str] = None
    npwp: Optional[str] = None
    gelar_depan: Optional[str] = None
    gelar_belakang: Optional[str] = None
    is_pimpinan_tertinggi: Optional[bool] = False
    jenis_pimpinan: Optional[str] = None
    foto_url: Optional[str] = None
    foto_thumbnail_url: Optional[str] = None
    kewarganegaraan: Optional[str] = "WNI"
    
    no_telp: Optional[str] = None
    email: Optional[str] = None
    nama_bank: Optional[str] = None
    no_rekening: Optional[str] = None
    
    eselon1: Optional[str] = None
    eselon2: Optional[str] = None
    eselon3: Optional[str] = None
    eselon4: Optional[str] = None
    eselon5: Optional[str] = None
    jabatan_melekat: List[str] = []
    
    status_kepegawaian: Optional[str] = None
    kategori_pegawai: Optional[str] = None
    status_penempatan: Optional[str] = None
    status_jabatan: Optional[str] = None
    pangkat_golongan: Optional[str] = None
    
    keterangan: Optional[str] = None

class MutasiPegawai(BaseModel):
    jenis_mutasi: str # "Internal", "Eksternal", "Promosi", "Demosi"
    jabatan_baru: str
    unit_kerja_baru: Optional[Dict[str, str]] = {} # {"eselon1": "...", "eselon2": "..."}
    unit_kerja_baru: Optional[Dict[str, str]] = {} # {"eselon1": "...", "eselon2": "..."}
    pangkat_baru: Optional[str] = None
    sk_ref: Optional[str] = None
    keterangan: Optional[str] = None
    tgl_efektif: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- Transaksi Models ---
class Transaksi(MongoBaseModel):
    jenis: str  
    barang_id: str
    kode_barang: str
    nup: Optional[str] = None
    nama_barang: str
    jumlah: int
    nilai_satuan: float = 0
    total_nilai: float = 0
    pegawai_id: Optional[str] = None
    nama_pegawai: Optional[str] = None
    unit_penerima: Optional[str] = None 
    keterangan: Optional[str] = None
    dokumen_ref: Optional[str] = None 
    petugas: Optional[str] = None 
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransaksiCreate(BaseModel):
    jenis: str
    barang_id: str
    jumlah: int
    nilai_satuan: Optional[float] = 0 
    pegawai_id: Optional[str] = None
    keterangan: Optional[str] = None
    dokumen_ref: Optional[str] = None

# --- Stock Opname Model ---
class StockOpname(MongoBaseModel):
    tanggal: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    barang_id: str
    asset_type: str = "barang" # "barang" or "persediaan"
    nama_barang: str
    stok_sistem: int
    stok_fisik: int
    selisih: int
    keterangan: Optional[str] = None
    petugas: str
    status: str = "Completed"

# --- Persediaan (Inventory) Models ---
class PersediaanBatch(BaseModel):
    batch_id: str = Field(default_factory=lambda: str(ObjectId()))
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    qty: int
    price: float
    nota_dinas: Optional[str] = None
    expiry: Optional[datetime] = None

class Persediaan(MongoBaseModel):
    # Identifiers
    kode_barang: str
    nup: str = "1"
    kode_satker: Optional[str] = None
    nama_satker: Optional[str] = None
    kode_register: Optional[str] = None
    
    # Details
    nama_barang: str
    merk: Optional[str] = None
    tipe: Optional[str] = None
    kategori: Optional[str] = None
    satuan: Optional[str] = None
    kondisi: Optional[str] = None
    
    # Dates
    tgl_perolehan: Optional[str] = None
    tahun_anggaran: Optional[str] = None
    expired_date: Optional[str] = None
    batch_number: Optional[str] = None
    
    # Financials
    nilai_satuan: float = 0
    nilai_perolehan: float = 0
    
    # Classification
    status_aset: str = "Aktif"
    golongan_barang: Optional[str] = None
    
    # Location
    lokasi_fisik: Optional[str] = None
    ruang: Optional[str] = None
    
    # Inventory - FIFO
    stok: int = 0
    batas_kritis: int = 0
    batches: List[PersediaanBatch] = []
    # Photos
    fotos: List[Dict[str, Any]] = []

    
    # Financials (Calculated/History)
    nilai_mutasi: float = 0
    
    # Import data
    detail_lainnya: Dict[str, Any] = {}
    source: Optional[str] = "manual"
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Config:
        extra = "allow"

class PersediaanCreate(BaseModel):
    kode_barang: str
    nup: str = "1"
    nama_barang: str
    merk: Optional[str] = None
    tipe: Optional[str] = None
    kondisi: Optional[str] = None
    satuan: Optional[str] = None
    tgl_perolehan: Optional[str] = None
    expired_date: Optional[str] = None
    batch_number: Optional[str] = None
    nilai_perolehan: Optional[float] = 0
    nilai_satuan: Optional[float] = 0
    lokasi_fisik: Optional[str] = None
    ruang: Optional[str] = None
    stok: int = 0
    batas_kritis: int = 0
    nilai_mutasi: Optional[float] = 0
    golongan_barang: Optional[str] = None
    status_aset: str = "Aktif"
    kode_satker: Optional[str] = None
    nama_satker: Optional[str] = None
    tahun_anggaran: Optional[str] = None
    detail_lainnya: Optional[Dict[str, Any]] = {}

# --- Transaksi Persediaan (Stock In/Out) Models ---
class TransaksiPersediaan(MongoBaseModel):
    jenis: str  # "in" atau "out"
    persediaan_id: str
    kode_barang: str
    nup: Optional[str] = None
    nama_barang: str
    batch_number: Optional[str] = None
    expired_date: Optional[str] = None
    jumlah: int
    nilai_satuan: float = 0
    total_nilai: float = 0
    stok_sebelum: int = 0
    stok_sesudah: int = 0
    pegawai_id: Optional[str] = None
    nama_pegawai: Optional[str] = None
    unit_penerima: Optional[str] = None
    keterangan: Optional[str] = None
    dokumen_ref: Optional[str] = None
    petugas: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransaksiPersediaanCreate(BaseModel):
    jenis: str
    persediaan_id: str
    jumlah: int
    batch_number: Optional[str] = None
    expired_date: Optional[str] = None
    nilai_satuan: Optional[float] = 0
    pegawai_id: Optional[str] = None
    unit_penerima: Optional[str] = None
    keterangan: Optional[str] = None
    dokumen_ref: Optional[str] = None 

class TransaksiPersediaanBulkItem(BaseModel):
    persediaan_id: str
    jumlah: int
    nilai_satuan: float
    expired_date: Optional[str] = None

    unit_penerima: Optional[str] = None
class TransaksiPersediaanBulkCreate(BaseModel):
    items: List[TransaksiPersediaanBulkItem]
    dokumen_ref: str
    keterangan: Optional[str] = None
    pegawai_id: Optional[str] = None
    unit_penerima: Optional[str] = None
