# Smart Personal Finance Tracker

A sophisticated full-stack personal finance tracking application with multi-user and multi-workspace support.

## 🚀 Features

- **Multi-User & Multi-Workspace**: Users can belong to multiple workspaces with role-based access control (Owner, Admin, Member, Viewer)
- **Account Management**: Track multiple accounts (Bank, Cash, Credit Card, E-Wallet, etc.)
- **Category Management**: Organize transactions with hierarchical categories (parent/sub-categories)
- **Transaction Management**:
  - Record Income, Expense, and Transfer transactions
  - Dynamic form that adapts based on transaction type
  - Advanced filtering by date, type, and account
- **Dashboard Analytics**:
  - Total balance across all accounts
  - Income and expense tracking
  - Expense breakdown by category with pie charts
- **Responsive Design**: Beautiful UI built with Tailwind CSS

## 🛠️ Tech Stack

### Backend
- **Python 3.x** with **Flask**
- **SQLAlchemy** ORM
- **PostgreSQL** database
- **Flask-JWT-Extended** for authentication
- **Flask-Migrate** for database migrations
- **Flask-Bcrypt** for password hashing
- **Flask-CORS** for API access

### Frontend
- **React 18** with **Vite**
- **Tailwind CSS** for styling
- **React Router DOM** for navigation
- **Axios** for API requests
- **Recharts** for data visualization

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+

## 🔧 Installation

### 1. Clone the Repository

```bash
cd /Volumes/Data/react/keuangan
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Update .env with your database credentials
# Edit DATABASE_URL, SECRET_KEY, and JWT_SECRET_KEY
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb finance_tracker

# Or using psql:
psql -U postgres
CREATE DATABASE finance_tracker;
\q

# Initialize migrations
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Create default roles
python -c "
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
    print('Roles created successfully!')
"
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file (optional)
cp .env.example .env
```

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
source venv/bin/activate  # On macOS/Linux
python run.py
```

Backend will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📱 Usage

1. **Register**: Create a new account at `/register`
2. **Login**: Sign in at `/login`
3. **Dashboard**: View your financial overview
4. **Accounts**: Create and manage your financial accounts
5. **Categories**: Set up income and expense categories
6. **Transactions**: Record and track all your financial transactions

## 🏗️ Project Structure

```
keuangan/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── models.py            # Database models
│   │   └── routes/              # API endpoints
│   │       ├── auth.py
│   │       ├── workspace.py
│   │       ├── account.py
│   │       ├── category.py
│   │       └── transaction.py
│   ├── config.py                # Configuration
│   ├── run.py                   # Application entry point
│   └── requirements.txt         # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── components/          # React components
    │   │   ├── Layout.jsx
    │   │   └── PrivateRoute.jsx
    │   ├── context/             # Context providers
    │   │   ├── AuthContext.jsx
    │   │   └── WorkspaceContext.jsx
    │   ├── pages/               # Page components
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Accounts.jsx
    │   │   ├── Categories.jsx
    │   │   └── Transactions.jsx
    │   ├── utils/               # Utilities
    │   │   └── api.js
    │   ├── App.jsx              # Main app component
    │   ├── main.jsx             # Entry point
    │   └── index.css            # Global styles
    └── package.json             # Node dependencies
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Workspaces
- `GET /api/workspaces` - Get all workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

### Accounts
- `GET /api/accounts` - Get all accounts (requires workspace_id)
- `POST /api/accounts` - Create account
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Categories
- `GET /api/categories` - Get all categories (requires workspace_id)
- `POST /api/categories` - Create category
- `GET /api/categories/:id` - Get category details
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Transactions
- `GET /api/transactions` - Get all transactions (supports filtering)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary` - Get financial summary

## 🎨 Key Features Explained

### Transaction Types

1. **Income**: Money coming into an account
   - Requires: Account, Category, Amount, Date

2. **Expense**: Money going out of an account
   - Requires: Account, Category, Amount, Date

3. **Transfer**: Money moving between accounts
   - Requires: From Account, To Account, Amount, Date
   - No category needed

### Role-Based Access Control

- **Owner**: Full control, can delete workspace
- **Admin**: Can manage workspace and invite users
- **Member**: Can create/edit transactions, accounts, categories
- **Viewer**: Read-only access

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

MIT License

## 👨‍💻 Author

Built with ❤️ by a Senior Full Stack Developer

## 🐛 Known Issues

None at the moment. Please report any issues you encounter.

## 🔮 Future Enhancements

- [ ] Budget management
- [ ] Recurring transactions
- [ ] Financial goals tracking
- [ ] Export to CSV/PDF
- [ ] Multi-currency support
- [ ] Mobile app
- [ ] Email notifications
- [ ] Advanced analytics and reports

---

**Happy Finance Tracking! 💰📊**
