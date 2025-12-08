#!/bin/bash

echo "🚀 Setting up Finance Tracker Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL."
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your database credentials and secret keys!"
fi

# Initialize database migrations
echo "🗄️  Initializing database migrations..."
flask db init

echo "📝 Creating initial migration..."
flask db migrate -m "Initial migration"

echo "⬆️  Applying migrations..."
flask db upgrade

# Create default roles
echo "👥 Creating default roles..."
python3 << EOF
from app import create_app, db
from app.models import Role

app = create_app()
with app.app_context():
    roles = ['Owner', 'Admin', 'Member', 'Viewer']
    for role_name in roles:
        if not Role.query.filter_by(name=role_name).first():
            role = Role(name=role_name)
            db.session.add(role)
    db.session.commit()
    print('✅ Roles created successfully!')
EOF

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "To start the server:"
echo "  source venv/bin/activate"
echo "  python run.py"
echo ""
