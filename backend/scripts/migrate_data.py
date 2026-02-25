import json
import os
import asyncio
from app.db.mongodb import get_sync_database, connect_to_mongo

def migrate():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    mentors_file = os.path.join(base_dir, 'data', 'mentors.json')
    
    sync_db = get_sync_database()
    sync_mentors_collection = sync_db["mentors"]
    
    if not os.path.exists(mentors_file):
        print(f"Error: {mentors_file} not found.")
        return

    with open(mentors_file, 'r', encoding='utf-8') as file:
        mentors_data = json.load(file)
    
    print(f"Found {len(mentors_data)} mentors in {mentors_file}.")
    
    # Clear existing data
    result = sync_mentors_collection.delete_many({})
    print(f"Cleared {result.deleted_count} existing mentors from MongoDB.")
    
    # Insert new data
    if mentors_data:
        result = sync_mentors_collection.insert_many(mentors_data)
        print(f"Successfully inserted {len(result.inserted_ids)} mentors into MongoDB.")
    else:
        print("No mentors to insert.")

if __name__ == "__main__":
    asyncio.run(connect_to_mongo())
    migrate()
