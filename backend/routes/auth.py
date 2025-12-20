from fastapi import APIRouter, HTTPException, status, Depends
from models import UserLogin, Token, User, UserCreate
from auth import verify_password, create_access_token, get_password_hash, get_current_user
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# DB Connection for Routes
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user['email']})
    return {"access_token": access_token, "token_type": "bearer"}

from bson import ObjectId

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate Pegawai if provided
    pegawai_data = None
    if user_in.pegawai_id:
        if not ObjectId.is_valid(user_in.pegawai_id):
            raise HTTPException(status_code=400, detail="Invalid Pegawai ID")
            
        pegawai_data = await db.pegawai.find_one({"_id": ObjectId(user_in.pegawai_id)})
        if not pegawai_data:
            raise HTTPException(status_code=404, detail="Pegawai not found")
            
        if pegawai_data.get('status') != 'AKTIF':
             raise HTTPException(status_code=400, detail="Hanya pegawai status AKTIF yang bisa didaftarkan")
             
        # Check if this pegawai already has an account
        existing_account = await db.users.find_one({"pegawai_id": user_in.pegawai_id})
        if existing_account:
            raise HTTPException(status_code=400, detail=f"Pegawai {pegawai_data.get('nama_lengkap')} sudah memiliki akun user")

        # Force full_name from Pegawai to ensure consistency
        user_in.full_name = pegawai_data.get('nama_lengkap')

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_pw,
        role=user_in.role,
        pegawai_id=user_in.pegawai_id
    )
    
    await db.users.insert_one(new_user.model_dump(by_alias=True, exclude=["id"]))
    
    access_token = create_access_token(data={"sub": user_in.email})
    return {"access_token": access_token, "token_type": "bearer"}
