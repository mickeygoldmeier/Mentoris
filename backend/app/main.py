from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .db.mongodb import connect_to_mongo, close_mongo_connection
from .api.endpoints import auth, mentors, chat, messaging, bookings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lifecycle
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

# Routers
app.include_router(auth.router, tags=["auth"])
app.include_router(mentors.router, prefix="/mentors", tags=["mentors"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(messaging.router, prefix="/messaging", tags=["messaging"])
app.include_router(bookings.router, prefix="/bookings", tags=["bookings"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
