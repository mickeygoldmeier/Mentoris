import json
import os
import time
import argparse
from google import genai
from pydantic import BaseModel
from typing import List, Optional

# Add backend to path so we can import settings
import sys
import os

# Force stdout to be line-buffered
sys.stdout.reconfigure(line_buffering=True)

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

class ContactInfo(BaseModel):
    email: Optional[str] = None
    calendar: Optional[str] = None
    phone: Optional[str] = None
    free_text: Optional[str] = None

class EnrichedMentor(BaseModel):
    name: str
    summary: str
    tags: List[str]
    role: str
    contact: ContactInfo

def enrich(limit=None):
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    input_file = os.path.join(os.path.dirname(__file__), '../data/mentors.json')
    output_file = os.path.join(os.path.dirname(__file__), '../data/enriched_mentors.json')
    
    with open(input_file, 'r', encoding='utf-8') as f:
        mentors = json.load(f)
        
    enriched_data = []
    
    # Check if we already have some enriched data to resume
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            try:
                enriched_data = json.load(f)
                print(f"Resuming from {len(enriched_data)} mentors...")
            except json.JSONDecodeError:
                print("Output file exists but is empty or invalid. Starting fresh.")

    already_done_names = {m.get('name') for m in enriched_data if m.get('name')}
    
    count = 0
    for i, mentor in enumerate(mentors):
        if limit and count >= limit:
            break
            
        name = mentor.get("טוויטר / שם", "Unknown")
        if name in already_done_names:
            continue
            
        print(f"[{i+1}/{len(mentors)}] Enriching {name}...")
        
        prompt = f"""
        Analyze the following mentor data (in Hebrew) and extract structured information.
        
        NAME: {mentor.get('טוויטר / שם')}
        FIELDS: {mentor.get('באיזה תחומים אתם מציעים מנטורינג?')}
        BACKGROUND: {mentor.get('רקע רלוונטי')}
        CONTACT: {mentor.get('איך ליצור קשר בנוסף ל-DM?')}
        
        Return a JSON object with:
        1. "summary": A concise 1-sentence elevator pitch in Hebrew.
        2. "tags": A list of up to 5 relevant tags in Hebrew starting with # (e.g., #ניהול, #פיתוח, #הסבה).
        3. "role": A short 1-2 word role badge in Hebrew (e.g., "CTO", "מפתח סיניור", "מגייסת").
        4. "contact": An object with "email", "calendar" (URL), "phone" (string), and "free_text". 
           Extract these from the CONTACT field if possible.
        """
        
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': EnrichedMentor,
                }
            )
            
            result = json.loads(response.text)
            # Add original data back
            full_mentor = mentor.copy()
            # Rename 'name' to the expected schema if necessary or just store it
            full_mentor.update(result)
            enriched_data.append(full_mentor)
            
            count += 1
            
            # Save progress every batch
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(enriched_data, f, ensure_ascii=False, indent=2)
                
            # Basic rate limiting
            time.sleep(2)
            
        except Exception as e:
            print(f"Error enriching {name}: {e}")
            time.sleep(5)
            continue

    print(f"Enrichment complete! Saved to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, help="Limit the number of mentors to enrich")
    args = parser.parse_args()
    
    enrich(limit=args.limit)
