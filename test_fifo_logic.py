import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from bson import ObjectId

# Setup DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def test_fifo():
    print("--- Starting FIFO Test ---")
    
    # 1. Create a Test Item
    item_id = ObjectId()
    item_data = {
        "_id": item_id,
        "nama_barang": "Test Item FIFO",
        "kode_barang": "TEST-FIFO-001",
        "stok": 0,
        "nilai_satuan": 0,
        "batches": [],
        "created_at": datetime.now(timezone.utc)
    }
    await db.persediaan.insert_one(item_data)
    print(f"Created Item: {item_id}")

    try:
        # 2. Stock In Batch A: 10 @ 10,000
        # We simulate the request payload structure
        batch_a = {
            "qty": 10,
            "price": 10000.0,
            "date": datetime.now(timezone.utc),
            "batch_id": str(ObjectId())
        }
        await db.persediaan.update_one(
            {"_id": item_id},
            {
                "$inc": {"stok": 10},
                "$push": {"batches": batch_a}
            }
        )
        print("Stock In: Batch A (10 @ 10,000)")

        # 3. Stock In Batch B: 10 @ 12,000
        batch_b = {
            "qty": 10,
            "price": 12000.0,
            "date": datetime.now(timezone.utc),
            "batch_id": str(ObjectId())
        }
        await db.persediaan.update_one(
            {"_id": item_id},
            {
                "$inc": {"stok": 10},
                "$push": {"batches": batch_b}
            }
        )
        print("Stock In: Batch B (10 @ 12,000)")
        
        # Verify State
        item = await db.persediaan.find_one({"_id": item_id})
        print(f"Current Stock: {item['stok']} (Expected 20)")
        print(f"Batches: {len(item.get('batches', []))} (Expected 2)")
        
        # 4. Simulate Stock Out Logic (Simulating what the route does)
        # Request 5 units
        req_qty = 5
        batches = item.get('batches', [])
        batches.sort(key=lambda x: x.get('date'))
        
        cost = 0
        remaining = req_qty
        updated_batches = []
        
        print(f"\nRequesting Out: {req_qty}")
        
        for b in batches:
            if remaining <= 0:
                updated_batches.append(b)
                continue
                
            qty = b['qty']
            price = b['price']
            
            if qty > remaining:
                take = remaining
                cost += take * price
                b['qty'] -= take
                remaining = 0
                updated_batches.append(b)
                print(f"Took {take} from Batch {b['batch_id']} @ {price}")
            else:
                take = qty
                cost += take * price
                remaining -= take
                # Batch consumed, not appended
                print(f"Took {take} from Batch {b['batch_id']} @ {price} (Consumed)")
                
        print(f"Total Cost: {cost} (Expected {5 * 10000} = 50000)")
        assert cost == 50000.0
        
        # Update DB State 1
        await db.persediaan.update_one({"_id": item_id}, {"$set": {"batches": updated_batches, "stok": item['stok'] - req_qty}})
        
        # 5. Request Out: 10 units
        # Expect: 5 from A (@10000) + 5 from B (@12000) = 50000 + 60000 = 110000
        req_qty = 10
        item = await db.persediaan.find_one({"_id": item_id})
        batches = item.get('batches', [])
        
        cost = 0
        remaining = req_qty
        updated_batches = []
        
        print(f"\nRequesting Out: {req_qty}")
        
        for b in batches:
            if remaining <= 0:
                updated_batches.append(b)
                continue
                
            qty = b['qty']
            price = b['price']
            
            if qty > remaining:
                take = remaining
                cost += take * price
                b['qty'] -= take
                remaining = 0
                updated_batches.append(b)
                print(f"Took {take} from Batch {b['batch_id']} @ {price}")
            else:
                take = qty
                cost += take * price
                remaining -= take
                print(f"Took {take} from Batch {b['batch_id']} @ {price} (Consumed)")
        
        print(f"Total Cost: {cost} (Expected 110000)")
        assert cost == 110000.0
        
        print("\n✅ FIFO Logic Test Passed")

    except Exception as e:
        print(f"\n❌ Test Failed: {e}")
    finally:
        # Cleanup
        await db.persediaan.delete_one({"_id": item_id})

if __name__ == "__main__":
    asyncio.run(test_fifo())
