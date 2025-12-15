import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone

# Config
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_admin():
    email = "admin@example.com"
    password = "admin"
    
    # Check if exists
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"User {email} already exists. Updating password...")
        hashed_password = pwd_context.hash(password)
        await db.users.update_one(
            {"email": email},
            {"$set": {"hashed_password": hashed_password, "full_name": "Administrator", "role": "admin"}}
        )
        print("Password reset to 'admin'.")
    else:
        print(f"Creating user {email}...")
        hashed_password = pwd_context.hash(password)
        user_doc = {
            "email": email,
            "full_name": "Administrator",
            "role": "admin",
            "hashed_password": hashed_password,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
        print("User created.")

if __name__ == "__main__":
    asyncio.run(seed_admin())
