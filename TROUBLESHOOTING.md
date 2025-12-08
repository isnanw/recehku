# Troubleshooting Guide

Common issues and their solutions.

## Backend Issues

### 1. Database Connection Error

**Error**: `could not connect to server: Connection refused`

**Solution**:
```bash
# Check if PostgreSQL is running
psql --version

# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Or on Linux
sudo systemctl start postgresql

# Check if database exists
psql -U postgres -l

# Create database if missing
createdb finance_tracker
```

### 2. Module Not Found Error

**Error**: `ModuleNotFoundError: No module named 'flask'`

**Solution**:
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### 3. Migration Error

**Error**: `ERROR [flask_migrate] Error: Can't locate revision identified by 'xxxxx'`

**Solution**:
```bash
# Remove migrations folder and start fresh
rm -rf migrations/

# Reinitialize
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 4. Import Error in Models

**Error**: `ImportError: cannot import name 'db' from 'app'`

**Solution**:
- Check that `app/__init__.py` exists and initializes db
- Make sure you're running from the backend directory
- Verify PYTHONPATH includes the backend directory

### 5. JWT Token Error

**Error**: `RuntimeError: The SECRET_KEY or JWT_SECRET_KEY must not be 'None'.`

**Solution**:
```bash
# Create .env file if missing
cp .env.example .env

# Edit .env and set:
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
```

## Frontend Issues

### 1. Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change the port in vite.config.js
server: {
  port: 3001  # Change to different port
}
```

### 2. Module Not Found

**Error**: `Module not found: Can't resolve 'react-router-dom'`

**Solution**:
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### 3. API Connection Error

**Error**: `Network Error` or `ERR_CONNECTION_REFUSED`

**Solution**:
- Make sure backend is running on port 5000
- Check if proxy is configured in `vite.config.js`
- Verify API calls use correct endpoint

### 4. Tailwind Not Working

**Error**: Styles not applying

**Solution**:
```bash
# Make sure postcss and tailwind are installed
npm install -D tailwindcss postcss autoprefixer

# Check that index.css has:
@tailwind base;
@tailwind components;
@tailwind utilities;

# Restart dev server
npm run dev
```

### 5. Build Error

**Error**: `Build failed with errors`

**Solution**:
```bash
# Clear cache
rm -rf dist node_modules/.vite

# Reinstall and rebuild
npm install
npm run build
```

## Database Issues

### 1. Role Does Not Exist

**Error**: No roles in database after migration

**Solution**:
```bash
# Run the seed script
python seed.py

# Or manually create roles
python -c "
from app import create_app, db
from app.models import Role

app = create_app()
with app.app_context():
    for role_name in ['Owner', 'Admin', 'Member', 'Viewer']:
        if not Role.query.filter_by(name=role_name).first():
            db.session.add(Role(name=role_name))
    db.session.commit()
"
```

### 2. Unique Constraint Error

**Error**: `duplicate key value violates unique constraint`

**Solution**:
- Check if you're trying to create duplicate data
- Clear test data and try again
- Check your seeds or migrations

### 3. Foreign Key Constraint

**Error**: `ForeignKeyViolation`

**Solution**:
- Make sure referenced records exist
- Check cascade delete settings in models
- Verify workspace_id is passed correctly

## Authentication Issues

### 1. Token Expired

**Error**: `Token has expired`

**Solution**:
- Logout and login again
- Token expires after 1 hour (configurable in config.py)
- Frontend should redirect to login automatically

### 2. Unauthorized Access

**Error**: `401 Unauthorized`

**Solution**:
```bash
# Check if token is being sent in headers
# Open browser DevTools > Network > Headers
# Should see: Authorization: Bearer <token>

# Clear localStorage and login again
localStorage.clear()
```

### 3. CORS Error

**Error**: `Access to fetch blocked by CORS policy`

**Solution**:
```python
# In backend app/__init__.py, verify CORS is enabled:
from flask_cors import CORS
CORS(app)

# Or specify origins:
CORS(app, origins=["http://localhost:3000"])
```

## Development Tips

### Running Tests

```bash
# Backend
cd backend
source venv/bin/activate
pytest

# Frontend
cd frontend
npm test
```

### Debugging Backend

```python
# Add print statements
print(f"User: {user}")

# Use Flask debugger
app.run(debug=True)

# Check logs
tail -f /var/log/flask.log
```

### Debugging Frontend

```javascript
// Add console.logs
console.log("Data:", data);

// Use React DevTools
// Install from Chrome/Firefox extensions

// Check Network tab in DevTools
// See all API requests and responses
```

### Database Queries

```python
# Check data in Python shell
python
>>> from app import create_app, db
>>> from app.models import User, Account, Transaction
>>> app = create_app()
>>> with app.app_context():
...     users = User.query.all()
...     print(users)
```

### Reset Database

```bash
# Drop and recreate database
dropdb finance_tracker
createdb finance_tracker

# Run migrations
flask db upgrade

# Seed data
python seed.py
```

## Performance Issues

### Slow API Responses

- Add database indexes
- Use query optimization
- Implement caching
- Check N+1 query problems

### Slow Frontend Loading

- Enable production build
- Use code splitting
- Optimize images
- Enable compression

## Still Having Issues?

1. Check the console for error messages
2. Review the code in the relevant files
3. Ensure all dependencies are installed
4. Try restarting both servers
5. Check PostgreSQL logs: `tail -f /usr/local/var/log/postgres.log`

## Useful Commands

```bash
# Check if ports are in use
lsof -i :5000  # Backend
lsof -i :3000  # Frontend

# Check Python environment
which python
python --version
pip list

# Check Node environment
which node
node --version
npm list

# Database commands
psql -U postgres
\l              # List databases
\c finance_tracker  # Connect to database
\dt             # List tables
\d users        # Describe table
```

---

Most issues can be solved by restarting services and ensuring dependencies are installed! 🔧
