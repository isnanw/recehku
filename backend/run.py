"""Application entry point."""
import os
from app import create_app

app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    # Allow overriding port via PORT env var for local testing
    port = int(os.getenv('PORT', '5001'))
    app.run(host='0.0.0.0', port=port, debug=True)
