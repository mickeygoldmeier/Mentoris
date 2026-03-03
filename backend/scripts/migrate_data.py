import json
import os
import asyncio
from app.db.mongodb import get_sync_database, connect_to_mongo

def migrate():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Prefer enriched data if it exists
    enriched_file = os.path.join(base_dir, '../data/enriched_mentors.json')
    original_file = os.path.join(base_dir, '../data/mentors.json')
    
    mentors_file = enriched_file if os.path.exists(enriched_file) else original_file
    
    sync_db = get_sync_database()
    sync_mentors_collection = sync_db["mentors"]
    
    if not os.path.exists(mentors_file):
        print(f"Error: Neither enriched nor original file found.")
        return

    print(f"Loading data from {mentors_file}...")
    with open(mentors_file, 'r', encoding='utf-8') as file:
        mentors_data = json.load(file)
    
    print(f"Found {len(mentors_data)} mentors.")
    
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
