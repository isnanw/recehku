# Recehku — Smart Personal Finance Tracker

A lightweight full-stack personal finance tracker (Recehku) with multi-user and multi-workspace support.

## 🚀 Features

- **Multi-User & Multi-Workspace**: Users can belong to multiple workspaces with role-based access control (Owner, Admin, Member, Viewer).
- **Account Management**: Track multiple account types (Bank, Cash, Credit Card, E-Wallet).
- **Category Management**: Create and manage hierarchical categories for Income and Expense.
- **Transaction Management**:
  - Record Income, Expense, and Transfer transactions.
  - Filters by date, type, and account; supports monthly tab filtering in the Transactions page.
- **Dashboard Analytics**:
  - Total balance across accounts, monthly income/expense summaries.
  - Expense and income breakdown by category (pie charts). Server-side aggregation endpoint available.
- **Responsive UI**: Built with Tailwind CSS and Recharts for charts.

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
git clone https://github.com/isnanw/recehku.git
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (we use a local .venv)
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

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
source .venv/bin/activate  # On macOS/Linux
# The server listens on port 5001 by default. To avoid port conflicts you can override with PORT:
PORT=5002 python run.py
```

Backend will run on `http://localhost:5001` (or the `PORT` you set)

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

- ### Transactions
- `GET /api/transactions` - Get transactions (supports filtering and pagination via `page` and `per_page` query params)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary` - Get financial summary

### Analytics

- `GET /api/analytics/income-by-category` - Aggregate income by category on the server (supports `workspace_id`, `start_date`, `end_date`, `top_n`). The frontend will use this endpoint when available; otherwise it falls back to client-side paginated aggregation using `/api/transactions`.

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

Built with ❤️ by Isnan Wahyudi

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
