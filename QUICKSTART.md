# Quick Start Guide

Get your Finance Tracker up and running in 5 minutes!

## Prerequisites Check

Before starting, ensure you have:
- ✅ Python 3.8+ installed (`python3 --version`)
- ✅ Node.js 16+ installed (`node --version`)
- ✅ PostgreSQL 12+ installed (`psql --version`)

## Step 1: Database Setup

```bash
# Create the database
createdb finance_tracker

# Or using psql:
psql -U postgres
CREATE DATABASE finance_tracker;
\q
```

## Step 2: Backend Setup (Automated)

```bash
cd backend

# Run the setup script
./setup.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

**Important**: Update the `.env` file with your database credentials:
```
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/finance_tracker
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
```

## Step 3: Frontend Setup (Automated)

```bash
cd frontend

# Run the setup script
./setup.sh

# Or manually:
npm install
```

## Step 4: Start the Application

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
python run.py
```
Backend runs at: `http://localhost:5000`

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
Frontend runs at: `http://localhost:3000`

## Step 5: First Login

1. Open `http://localhost:3000` in your browser
2. Click "Sign up" to create a new account
3. Fill in your name, email, and password
4. You'll be automatically logged in with your first workspace created!

## Common Issues

### Database Connection Error
- Make sure PostgreSQL is running
- Check your DATABASE_URL in `.env`
- Ensure the database `finance_tracker` exists

### Port Already in Use
- Backend (5000): Change port in `run.py`
- Frontend (3000): Change port in `vite.config.js`

### Module Not Found
- Backend: Activate virtual environment and reinstall dependencies
- Frontend: Delete `node_modules` and run `npm install` again

## Next Steps

1. **Create Accounts**: Go to Accounts page and add your bank accounts, cash, etc.
2. **Set Up Categories**: Create income and expense categories
3. **Add Transactions**: Record your first transaction
4. **View Dashboard**: See your financial overview with charts

## Need Help?

Check the main README.md for detailed documentation or raise an issue.

---

Happy tracking! 💰
