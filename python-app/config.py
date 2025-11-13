# python-bridge/config.py
import os

class Config:
    """Configuration de l'application"""
    DEBUG = os.getenv('DEBUG', False)
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5002))
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')