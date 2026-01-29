from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType, ImageContent
import io
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Gemini API Key
gemini_api_key = os.environ.get('GEMINI_API_KEY', '')
if not gemini_api_key:
    logging.warning("GEMINI_API_KEY not found in environment variables")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic Models
class DiseasePrediction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_base64: Optional[str] = None
    disease_name: str
    confidence: float
    description: str
    treatments: List[str]
    prevention_tips: List[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiseasePredictionCreate(BaseModel):
    image_base64: str

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' or 'assistant'
    message: str
    image_base64: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessageCreate(BaseModel):
    session_id: str
    message: str
    image_base64: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    response: str

# Helper function to analyze plant disease
async def analyze_plant_disease(image_base64: str) -> DiseasePrediction:
    try:
        # Create a chat instance for image analysis
        chat = LlmChat(
            api_key=gemini_api_key,
            session_id=str(uuid.uuid4()),
            system_message="""You are an expert plant pathologist specializing in Indian agriculture. 
            Analyze plant leaf images to identify diseases common in India. 
            Provide disease name, confidence level (0-100), detailed description, treatment recommendations, and prevention tips.
            Focus on diseases affecting crops like rice, wheat, cotton, sugarcane, pulses, vegetables, and fruits common in India.
            If the leaf appears healthy, indicate that clearly."""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Create message with image
        user_message = UserMessage(
            text="""Analyze this plant leaf image and provide:
            1. Disease name (or "Healthy" if no disease detected)
            2. Confidence level (0-100)
            3. Detailed description of the condition
            4. List of 3-5 specific treatment recommendations
            5. List of 3-5 prevention tips
            
            Format your response EXACTLY as JSON:
            {
                "disease_name": "name here",
                "confidence": 85,
                "description": "detailed description",
                "treatments": ["treatment 1", "treatment 2", "treatment 3"],
                "prevention_tips": ["tip 1", "tip 2", "tip 3"]
            }""",
            file_contents=[image_content]
        )
        
        # Get response
        response = await chat.send_message(user_message)
        
        # Parse response
        import json
        # Extract JSON from response
        response_text = response.strip()
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0]
        
        result = json.loads(response_text)
        
        # Create prediction object
        prediction = DiseasePrediction(
            disease_name=result.get('disease_name', 'Unknown'),
            confidence=float(result.get('confidence', 0)),
            description=result.get('description', ''),
            treatments=result.get('treatments', []),
            prevention_tips=result.get('prevention_tips', [])
        )
        
        return prediction
        
    except Exception as e:
        logger.error(f"Error analyzing plant disease: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Plant Disease Prediction API"}

@api_router.post("/predict", response_model=DiseasePrediction)
async def predict_disease(input_data: DiseasePredictionCreate):
    try:
        # Analyze the plant disease
        prediction = await analyze_plant_disease(input_data.image_base64)
        
        # Store in database (without storing the full image)
        doc = prediction.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        doc.pop('image_base64', None)  # Don't store full image
        
        await db.predictions.insert_one(doc)
        
        return prediction
        
    except Exception as e:
        logger.error(f"Error in predict_disease: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/predictions", response_model=List[DiseasePrediction])
async def get_predictions():
    try:
        predictions = await db.predictions.find({}, {"_id": 0}).sort("timestamp", -1).limit(50).to_list(50)
        
        # Convert ISO string timestamps back to datetime objects
        for pred in predictions:
            if isinstance(pred['timestamp'], str):
                pred['timestamp'] = datetime.fromisoformat(pred['timestamp'])
        
        return predictions
    except Exception as e:
        logger.error(f"Error getting predictions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/chat", response_model=ChatResponse)
async def chat(input_data: ChatMessageCreate):
    try:
        # Store user message
        user_msg = ChatMessage(
            session_id=input_data.session_id,
            role="user",
            message=input_data.message,
            image_base64=input_data.image_base64
        )
        user_doc = user_msg.model_dump()
        user_doc['timestamp'] = user_doc['timestamp'].isoformat()
        await db.chat_messages.insert_one(user_doc)
        
        # Get chat history
        history = await db.chat_messages.find(
            {"session_id": input_data.session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(100)
        
        # Create chat instance
        chat_instance = LlmChat(
            api_key=gemini_api_key,
            session_id=input_data.session_id,
            system_message="""You are a helpful plant care expert specializing in Indian agriculture. 
            You help farmers and gardeners with:
            - General plant care advice
            - Disease diagnosis from symptoms
            - Treatment recommendations
            - Best practices for growing common Indian crops
            - Organic and chemical pest control methods
            - Seasonal planting guidance
            
            Be concise, practical, and use simple language. Focus on solutions applicable in Indian farming conditions."""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        # Create user message
        if input_data.image_base64:
            image_content = ImageContent(image_base64=input_data.image_base64)
            user_message = UserMessage(
                text=input_data.message,
                file_contents=[image_content]
            )
        else:
            user_message = UserMessage(text=input_data.message)
        
        # Get AI response
        ai_response = await chat_instance.send_message(user_message)
        
        # Store AI response
        ai_msg = ChatMessage(
            session_id=input_data.session_id,
            role="assistant",
            message=ai_response
        )
        ai_doc = ai_msg.model_dump()
        ai_doc['timestamp'] = ai_doc['timestamp'].isoformat()
        await db.chat_messages.insert_one(ai_doc)
        
        return ChatResponse(session_id=input_data.session_id, response=ai_response)
        
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    try:
        messages = await db.chat_messages.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(1000)
        
        # Convert ISO string timestamps back to datetime objects
        for msg in messages:
            if isinstance(msg['timestamp'], str):
                msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
        
        return messages
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
