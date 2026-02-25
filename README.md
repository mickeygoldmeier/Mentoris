# Mentoris

Mentoris is a premium platform designed to match users with mentors based on their backgrounds and goals. It features an AI-driven search and comparison tool powered by Google Gemini.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.9 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Running locally or via Atlas)

## Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment and activate it:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   > [!NOTE]
   > If `requirements.txt` is missing, manual installation required:
   > `pip install fastapi uvicorn motor pymongo google-genai numpy python-bidi`

4. **Environment Variables:**
   Create a `.env` file in the `backend` directory (or set them in your environment):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGO_URL=mongodb://localhost:27017
   ```

5. **Data Migration (Optional):**
   If you need to seed the database with mentors:
   ```bash
   python migrate_data.py
   ```

## Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Running the Application

To run the full application, you need to start both the backend and the frontend.

### 1. Start the Backend
```bash
cd backend
# Ensure virtual environment is active
# Run using uvicorn from the root of the backend directory
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend server will start at `http://localhost:8000`.

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```
The frontend will start at `http://localhost:5173`. Open this URL in your browser to use the app.
