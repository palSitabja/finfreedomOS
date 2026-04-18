import logging
import sys
from typing import Optional

def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    Configures a logger with a standard format and output to stdout.
    """
    logger = logging.getLogger(name)
    
    # Avoid adding multiple handlers if the logger is already configured
    if not logger.handlers:
        logger.setLevel(level)
        
        # Create console handler and set level
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Add formatter to handler
        handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(handler)
        
        # Disable propagation so logs don't double up in uvicorn
        logger.propagate = False
        
    return logger

# Global default logger for generic use
logger = setup_logger("app")
