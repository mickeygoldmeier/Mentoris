import json
import os
import numpy as np
import time
from google import genai
from google.genai import types
from ..core.config import settings
from ..db.mongodb import get_sync_database

class AIService:
    def __init__(self):
        self.embeddings_file = os.path.join(os.path.dirname(__file__), '../../data/mentors_embeddings.json')
        
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set.")
            
        self.client = genai.Client(api_key=api_key)
        self.sync_db = get_sync_database()
        
        # We'll load the data on demand or in the first call to avoid issues with sync_db before it's ready
        self._mentors_data = None
        self._embeddings = None

    @property
    def mentors_data(self):
        if self._mentors_data is None:
            self._mentors_data = list(self.sync_db["mentors"].find({}, {"_id": 0}))
        return self._mentors_data

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = self._load_or_generate_embeddings()
        return self._embeddings

    def _load_or_generate_embeddings(self):
        if os.path.exists(self.embeddings_file):
            with open(self.embeddings_file, 'r') as f:
                return np.array(json.load(f))
        
        print(f"--> [AI Service] Generating embeddings for {len(self.mentors_data)} mentors...")
        texts = [f"{m.get('רקע רלוונטי', '')} {m.get('באיזה תחומים אתם מציעים מנטורינג?', '')}" for m in self.mentors_data]
        
        all_embeddings = []
        for i in range(0, len(texts), 100):
            if i > 0:
                time.sleep(65)
                
            chunk = [c if c.strip() else "N/A" for c in texts[i:i + 100]]
            response = self.client.models.embed_content(
                model="gemini-embedding-001",
                contents=chunk
            )
            all_embeddings.extend([e.values for e in response.embeddings])
        
        os.makedirs(os.path.dirname(self.embeddings_file), exist_ok=True)
        with open(self.embeddings_file, 'w') as f:
            json.dump(all_embeddings, f)
            
        return np.array(all_embeddings)

    def search_mentors(self, keyword: str) -> list[dict]:
        query = {
            "$or": [
                {"רקע רלוונטי": {"$regex": keyword, "$options": "i"}},
                {"באיזה תחומים אתם מציעים מנטורינג?": {"$regex": keyword, "$options": "i"}}
            ]
        }
        results = self.sync_db["mentors"].find(query, {"_id": 0})
        return [self._format_mentor(mentor) for mentor in results]

    def semantic_search_mentors(self, query: str) -> list[dict]:
        query_embedding = self.client.models.embed_content(
            model="gemini-embedding-001",
            contents=[query]
        ).embeddings[0].values
        
        similarities = np.dot(self.embeddings, query_embedding)
        top_indices = np.argsort(similarities)[-5:][::-1]
        
        return [self._format_mentor(self.mentors_data[i]) for i in top_indices]

    def _find_mentor_by_name(self, name: str) -> dict:
        target = name.strip()
        if target.startswith('@'):
            target = target[1:]
        query = {"טוויטר / שם": {"$regex": f"^@?{target}$", "$options": "i"}}
        return self.sync_db["mentors"].find_one(query, {"_id": 0})

    def draft_intro_message(self, mentor_name: str, user_goal: str) -> str:
        mentor = self._find_mentor_by_name(mentor_name)
        if not mentor:
            return f"Mentor '{mentor_name}' not found."
            
        return (f"Mentor: {mentor.get('טוויטר / שם')}\n"
                f"Background: {mentor.get('רקע רלוונטי')}\n"
                f"Fields: {mentor.get('באיזה תחומים אתם מציעים מנטורינג?')}\n"
                f"User Goal: {user_goal}")

    def summarize_mentor(self, mentor_name: str) -> str:
        mentor = self._find_mentor_by_name(mentor_name)
        if not mentor:
            return f"Mentor '{mentor_name}' not found."
            
        return json.dumps(self._format_mentor(mentor), ensure_ascii=False)

    def compare_mentors(self, mentor_names: list[str]) -> str:
        results = []
        for name in mentor_names:
            mentor = self._find_mentor_by_name(name)
            if mentor:
                results.append(self._format_mentor(mentor))
        return json.dumps(results, ensure_ascii=False)

    def _format_mentor(self, mentor):
        return {
            "Name": mentor.get("טוויטר / שם", "Unknown"),
            "Fields": mentor.get("באיזה תחומים אתם מציעים מנטורינג?", ""),
            "Background": mentor.get("רקע רלוונטי", ""),
            "Contact": mentor.get("איך ליצור קשר בנוסף ל-DM?", "")
        }

    def create_chat(self, history=None):
        tools = [
            self.search_mentors,
            self.semantic_search_mentors,
            self.draft_intro_message,
            self.summarize_mentor,
            self.compare_mentors
        ]
        config = types.GenerateContentConfig(
            tools=tools,
            temperature=0.0,
            system_instruction=(
                "You are Mentoris AI, a premium assistant for matching users with mentors. "
                "Your goal is to provide beautiful, structured information in Hebrew.\n\n"
                "Formatting Guidelines:\n"
                "1. Use **bold text** for mentor names and key facts.\n"
                "2. Use Markdown **tables** when comparing multiple mentors side-by-side.\n"
                "3. Use **bullet points** or numbered lists for summaries and intro drafts.\n"
                "4. Use 'semantic_search_mentors' for goal-based queries.\n"
                "5. Use 'search_mentors' for specific names.\n"
                "6. Use 'draft_intro_message' for message drafts.\n"
                "7. Use 'summarize_mentor' or 'compare_mentors' for deep analysis.\n\n"
                "Always respond in Hebrew. Be professional, encouraging, and clear."
            )
        )
        return self.client.chats.create(
            model="gemini-2.0-flash",
            config=config,
            history=history
        )

ai_service = AIService()
