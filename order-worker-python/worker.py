import os
import time
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("Order worker started")
    
    # Простой цикл для имитации работы
    while True:
        try:
            logger.info("Waiting for orders...")
            time.sleep(10)
        except Exception as e:
            logger.error(f"Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()