from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
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
class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(MongoBaseModel):
    email: EmailStr
    full_name: str
    role: str = "user"  # admin, user
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "user"

# --- Barang (Asset) Models ---
class Barang(MongoBaseModel):
    kode_barang: str
    nama_barang: str
    kategori: str
    sub_kategori: Optional[str] = None
    satuan: str
    stok: int = 0
    nilai_per_unit: float = 0
    lokasi: Optional[str] = None
    keterangan: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BarangCreate(BaseModel):
    kode_barang: str
    nama_barang: str
    kategori: str
    satuan: str
    nilai_per_unit: float
    lokasi: Optional[str] = None

# --- Pegawai (Employee) Models ---
class Pegawai(MongoBaseModel):
    nip: str
    nama_lengkap: str
    jabatan: str
    unit_kerja: str
    status: str = "AKTIF"  # AKTIF, NON_AKTIF
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PegawaiCreate(BaseModel):
    nip: str
    nama_lengkap: str
    jabatan: str
    unit_kerja: str

# --- Transaksi Models ---
class Transaksi(MongoBaseModel):
    jenis: str  # MASUK, KELUAR
    barang_id: str
    nama_barang: str
    jumlah: int
    pegawai_id: Optional[str] = None  # Who took/received it
    nama_pegawai: Optional[str] = None
    keterangan: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransaksiCreate(BaseModel):
    jenis: str
    barang_id: str
    jumlah: int
    pegawai_id: Optional[str] = None
    keterangan: Optional[str] = None
