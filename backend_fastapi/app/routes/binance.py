from fastapi import APIRouter, HTTPException, Body, Depends
from sqlmodel import Session, select
from app.db import ENGINE, BinanceCredentials
from app.binance_service import binance_service
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class BinanceCredentialsRequest(BaseModel):
    api_key: str
    api_secret: str

class BinanceCredentialsResponse(BaseModel):
    ok: bool
    message: str
    credentials_id: Optional[int] = None

class ConnectionStatusResponse(BaseModel):
    ok: bool
    connected: bool
    message: str
    account_info: Optional[Dict[str, Any]] = None

@router.post("/credentials", response_model=BinanceCredentialsResponse)
async def store_credentials(credentials: BinanceCredentialsRequest):
    """Store Binance API credentials with enhanced validation"""
    try:
        # Validate input
        if not credentials.api_key or not credentials.api_secret:
            raise HTTPException(
                status_code=400, 
                detail="API key and secret are required"
            )
            
        # Test connection first with explicit validation
        try:
            binance_service.connect(credentials.api_key, credentials.api_secret)
        except ValueError as e:
            # Return a structured error response instead of throwing an exception
            # This helps the frontend handle errors more gracefully
            return BinanceCredentialsResponse(
                ok=False,
                message=str(e),
                credentials_id=None
            )
        
        # Encrypt and store credentials
        encrypted_secret = binance_service.encrypt_secret(credentials.api_secret)
        
        with Session(ENGINE) as session:
            # Deactivate existing credentials
            existing = session.exec(select(BinanceCredentials).where(BinanceCredentials.is_active == True)).all()
            for cred in existing:
                cred.is_active = False
                cred.updated_at = datetime.utcnow()
            
            # Store new credentials
            new_credentials = BinanceCredentials(
                api_key=credentials.api_key,
                encrypted_secret=encrypted_secret,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            session.add(new_credentials)
            session.commit()
            session.refresh(new_credentials)
            
            logger.info("Binance credentials stored successfully")
            
            return BinanceCredentialsResponse(
                ok=True,
                message="Credentials stored and connection verified successfully",
                credentials_id=new_credentials.id
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to store credentials: {e}")
        return BinanceCredentialsResponse(
            ok=False,
            message=f"Failed to store credentials: {str(e)}",
            credentials_id=None
        )

@router.get("/credentials", response_model=BinanceCredentialsResponse)
async def get_credentials():
    """Get current Binance credentials status"""
    try:
        with Session(ENGINE) as session:
            credentials = session.exec(
                select(BinanceCredentials).where(BinanceCredentials.is_active == True)
            ).first()
            
            if not credentials:
                return BinanceCredentialsResponse(
                    ok=True,
                    message="No credentials found. Please add your Binance API credentials.",
                    credentials_id=None
                )
            
            return BinanceCredentialsResponse(
                ok=True,
                message="Credentials found",
                credentials_id=credentials.id
            )
            
    except Exception as e:
        logger.error(f"Failed to get credentials: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get credentials: {str(e)}")

@router.delete("/credentials/{credentials_id}")
async def delete_credentials(credentials_id: int):
    """Delete Binance credentials"""
    try:
        with Session(ENGINE) as session:
            credentials = session.exec(
                select(BinanceCredentials).where(BinanceCredentials.id == credentials_id)
            ).first()
            
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            
            credentials.is_active = False
            credentials.updated_at = datetime.utcnow()
            session.commit()
            
            # Disconnect from Binance
            binance_service.client = None
            
            return {"ok": True, "message": "Credentials deleted successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete credentials: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete credentials: {str(e)}")

@router.post("/connect", response_model=ConnectionStatusResponse)
async def connect_to_binance():
    """Connect to Binance using stored credentials with enhanced error handling"""
    try:
        with Session(ENGINE) as session:
            credentials = session.exec(
                select(BinanceCredentials).where(BinanceCredentials.is_active == True)
            ).first()
            
            if not credentials:
                return ConnectionStatusResponse(
                    ok=False,
                    connected=False,
                    message="No credentials found. Please add your Binance API credentials first."
                )
            
            try:
                # Decrypt and connect
                api_secret = binance_service.decrypt_secret(credentials.encrypted_secret)
                binance_service.connect(credentials.api_key, api_secret)
                
                # Update last used timestamp
                credentials.last_used = datetime.utcnow()
                session.commit()
                
                # Get account info
                account_info = binance_service.get_account_info()
                
                return ConnectionStatusResponse(
                    ok=True,
                    connected=True,
                    message="Successfully connected to Binance API",
                    account_info=account_info
                )
            except ValueError as e:
                # Return structured error response for API key issues
                logger.warning(f"Connection validation failed: {e}")
                return ConnectionStatusResponse(
                    ok=False,
                    connected=False,
                    message=str(e)
                )
            
    except Exception as e:
        logger.error(f"Failed to connect to Binance: {e}")
        return ConnectionStatusResponse(
            ok=False,
            connected=False,
            message=f"Connection error: {str(e)}"
        )

@router.get("/status", response_model=ConnectionStatusResponse)
async def get_connection_status():
    """Get current connection status with enhanced error handling"""
    try:
        if not binance_service.client:
            return ConnectionStatusResponse(
                ok=True,
                connected=False,
                message="Not connected to Binance API"
            )
        
        try:
            # Test connection by getting account info
            account_info = binance_service.get_account_info()
            
            return ConnectionStatusResponse(
                ok=True,
                connected=True,
                message="Connected to Binance API",
                account_info=account_info
            )
        except ValueError as e:
            # Handle API-specific errors
            logger.warning(f"Connection validation failed: {e}")
            # Reset client as connection is invalid
            binance_service.client = None
            return ConnectionStatusResponse(
                ok=False,
                connected=False,
                message=str(e)
            )
        
    except Exception as e:
        logger.error(f"Connection status check failed: {e}")
        # Reset client as connection is invalid
        binance_service.client = None
        return ConnectionStatusResponse(
            ok=False,
            connected=False,
            message=f"Connection error: {str(e)}"
        )

@router.get("/test")
async def test_connection():
    """Test Binance API connection"""
    try:
        if not binance_service.client:
            raise HTTPException(
                status_code=400, 
                detail="Not connected to Binance API. Please connect first."
            )
        
        # Test with a simple API call
        server_time = binance_service.client.get_server_time()
        
        return {
            "ok": True,
            "message": "Connection test successful",
            "server_time": server_time
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")

