import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from ..core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    sync_client: MongoClient = None
    db = None
    sync_db = None

mongodb = MongoDB()

async def connect_to_mongo():
    ca = certifi.where()
    mongodb.client = AsyncIOMotorClient(settings.MONGO_URL, tlsCAFile=ca)
    mongodb.db = mongodb.client[settings.DATABASE_NAME]
    mongodb.sync_client = MongoClient(settings.MONGO_URL, tlsCAFile=ca)
    mongodb.sync_db = mongodb.sync_client[settings.DATABASE_NAME]

async def close_mongo_connection():
    if mongodb.client:
        mongodb.client.close()
    if mongodb.sync_client:
        mongodb.sync_client.close()

def get_database():
    return mongodb.db

def get_sync_database():
    return mongodb.sync_db
