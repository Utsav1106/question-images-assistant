import os
from dotenv import load_dotenv
load_dotenv()

PORT = os.getenv('PORT', 5000)
OCR_SPACE_API_KEY = os.getenv('OCR_SPACE_API_KEY')
NVIDIA_API_KEY = os.getenv('NVIDIA_API_KEY')