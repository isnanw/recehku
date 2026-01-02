# 💰 Recehku — Smart Personal Finance Tracker

> A comprehensive full-stack personal finance management system with multi-user, multi-workspace support, and advanced financial tracking features.

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-black.svg)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ Features

### 🏢 Multi-Workspace & Role-Based Access Control
- Create and manage multiple workspaces for different purposes (Personal, Business, Family)
- Invite members with granular permissions:
  - **Owner**: Full control including workspace deletion
  - **Admin**: Manage settings and members
  - **Member**: Create and edit transactions
  - **Viewer**: Read-only access
- Seamless workspace switching with context preservation

### 💳 Account Management
- Support for multiple account types:
  - 🏦 **Bank Accounts**
  - 💵 **Cash**
  - 💳 **Credit Cards**
  - 📱 **E-Wallets** (GoPay, OVO, Dana, ShopeePay, etc.)
- Real-time balance tracking
- Account transfer functionality
- Multi-currency support (IDR focused)

### 📊 Transaction Management
- Comprehensive transaction types:
  - ➕ **Income**: Track revenue and earnings
  - ➖ **Expense**: Monitor spending across categories
  - 🔄 **Transfer**: Move money between accounts
- Advanced filtering:
  - Date range selection
  - Account-based filtering
  - Category filtering
  - Transaction type filtering
- Monthly tab navigation for quick access
- Bulk operations support

### 🗂️ Category Management
- Hierarchical category structure with parent-child relationships
- Pre-defined categories for Income and Expense
- Custom category creation
- Subcategory support for detailed tracking
- Category-based analytics

### 📈 Analytics Dashboard
- **Real-time Financial Overview**:
  - Total balance across all accounts
  - Monthly income vs expense comparison
  - Net cash flow analysis
- **Visual Data Representation**:
  - 📊 Pie charts for expense/income breakdown by category
  - 📉 Line charts for trend analysis
  - 💹 Bar charts for monthly comparisons
- **Advanced Metrics**:
  - Top spending categories
  - Spending patterns by time period
  - Budget utilization tracking

### 🎯 Budget Planning
- Create monthly/periodic budgets
- Automatic income calculation from transactions
- Budget allocation by category
- Real-time budget tracking with visual indicators:
  - Budget Planning (allocated amount)
  - Realisasi Pengeluaran (actual spending)
  - Selisih Budget (surplus/deficit)
  - Progress Periode (time-based progress)
- Budget activation system (DRAFT/ACTIVE modes)
- Premium gradient UI with summary cards

### 💎 Investment Tracking (Gold Focus)
- **Gold Investment Management**:
  - Track multiple gold types (ANTAM, GALERI24, UBS)
  - Record purchase details (weight, price, date)
  - Current price tracking with auto-update
  - Profit/loss calculation
- **Gold Price History**:
  - Automatic daily price logging
  - Historical price charts with trend analysis
  - Price comparison across gold types
  - Buy vs Buyback price tracking
  - Statistical insights (highest, lowest, average, total change)
- **Interactive Charts**:
  - Line charts for price movement
  - Filter by gold type
  - Date range selection

### 👥 Member Management
- Invite users to workspace via email
- Manage member roles and permissions
- View member activity
- Remove or modify member access
- Pending invitation tracking

## 🛠️ Tech Stack

### Backend
```
Flask               - Web framework
SQLAlchemy         - ORM for database operations
PostgreSQL         - Primary database
Flask-JWT-Extended - JWT authentication
Flask-Migrate      - Database migrations (Alembic)
Flask-Bcrypt       - Password hashing
Flask-CORS         - Cross-origin resource sharing
PyTZ               - Timezone support (WIB/Asia Jakarta)
Requests           - HTTP library for external APIs
```

### Frontend
```
React 18           - UI library
Vite               - Build tool and dev server
React Router DOM   - Client-side routing
Axios              - HTTP client
Tailwind CSS       - Utility-first CSS framework
Recharts           - Chart library for data visualization
FontAwesome        - Icon library
SweetAlert2        - Beautiful alert/modal dialogs
React Hot Toast    - Toast notifications
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 16+** - [Download](https://nodejs.org/)
- **PostgreSQL 12+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/downloads/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/isnanw/recehku.git
cd recehku
```

### 2. Backend Setup

#### Create Virtual Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

**IMPORTANT**: Create a `config.py` file (this file is gitignored for security):

```bash
# Create config.py in backend directory
cat > config.py << 'EOF'
import os

class Config:
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://username:password@localhost/recehku_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT Configuration
    JWT_SECRET_KEY = 'your-super-secret-jwt-key-change-this-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours

    # Flask Configuration
    SECRET_KEY = 'your-super-secret-key-change-this-in-production'
    DEBUG = False
EOF
```

**Security Note**:
- ⚠️ **NEVER commit `config.py` to version control**
- ⚠️ Change the secret keys to random secure strings
- ⚠️ Use strong database credentials

#### Setup Database

```bash
# Create PostgreSQL database
createdb recehku_db

# Or using psql
psql -U postgres
CREATE DATABASE recehku_db;
\q
```

#### Run Migrations
```bash
flask db upgrade
```

#### Create Initial Owner User
```bash
python setup_owner.py
```

#### Start Backend Server
```bash
python run.py
# Server will run on http://localhost:5000
```

### 3. Frontend Setup

```bash
# Open new terminal
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend will run on http://localhost:5173
```

### 4. Access Application

Open your browser and navigate to:
```
http://localhost:5173
```

Login with the owner credentials you created in the setup.

## 📁 Project Structure

```
recehku/
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Flask app factory
│   │   ├── models.py             # Database models
│   │   ├── decorators.py         # Custom decorators
│   │   └── routes/
│   │       ├── __init__.py       # Blueprint registration
│   │       ├── auth.py           # Authentication endpoints
│   │       ├── workspace.py      # Workspace management
│   │       ├── account.py        # Account CRUD
│   │       ├── category.py       # Category management
│   │       ├── transaction.py    # Transaction operations
│   │       ├── analytics.py      # Dashboard analytics
│   │       ├── budget.py         # Budget planning
│   │       ├── investment.py     # Investment tracking
│   │       └── gold_price.py     # Gold price history
│   ├── migrations/               # Alembic migrations
│   ├── config.py                 # Configuration (gitignored)
│   ├── requirements.txt          # Python dependencies
│   ├── run.py                    # Application entry point
│   └── setup_owner.py            # Owner user setup script
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx        # Main layout with navigation
│   │   │   ├── Modal.jsx         # Reusable modal component
│   │   │   ├── PrivateRoute.jsx  # Protected route wrapper
│   │   │   └── CurrencyInput.jsx # Currency input component
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # Authentication state
│   │   │   ├── WorkspaceContext.jsx  # Workspace state
│   │   │   └── PermissionsContext.jsx # Permissions state
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── Register.jsx      # Registration page
│   │   │   ├── Dashboard.jsx     # Analytics dashboard
│   │   │   ├── Accounts.jsx      # Account management
│   │   │   ├── Categories.jsx    # Category management
│   │   │   ├── Transactions.jsx  # Transaction list
│   │   │   ├── BudgetPlanning.jsx # Budget planning
│   │   │   ├── Investments.jsx   # Investment tracking
│   │   │   └── Members.jsx       # Member management
│   │   ├── utils/
│   │   │   └── api.js            # Axios instance & interceptors
│   │   ├── App.jsx               # Main app component
│   │   └── main.jsx              # React entry point
│   ├── package.json              # Node dependencies
│   ├── vite.config.js            # Vite configuration
│   └── tailwind.config.js        # Tailwind CSS config
│
├── .gitignore                    # Git ignore rules
├── README.md                     # This file
├── API_DOCUMENTATION.md          # API endpoints documentation
├── QUICKSTART.md                 # Quick start guide
└── TROUBLESHOOTING.md            # Common issues & solutions
```

## 🗄️ Database Schema

### Core Models

**User** - User accounts with authentication
- Email, password (hashed), name
- is_owner flag for super admin

**Workspace** - Organization units for financial data
- Name, description
- Owner relationship

**WorkspaceMember** - User-Workspace associations
- User ID, Workspace ID, Role
- Invitation system (pending/accepted)

**Role** - Permission levels
- Owner, Admin, Member, Viewer

**Account** - Financial accounts
- Name, type, balance, currency
- Workspace association

**Category** - Transaction categories
- Name, type (Income/Expense)
- Parent-child hierarchy support

**Transaction** - Financial transactions
- Amount, date, description
- Type (Income, Expense, Transfer)
- Account and category relationships

**BudgetPlan** - Budget planning
- Period (start/end dates)
- Income amount, status (DRAFT/ACTIVE)
- Category allocations

**Investment** - Investment tracking
- Type (GOLD, etc.)
- Buy price, current price, quantity
- Profit/loss calculation

**GoldPrice** - Historical gold prices
- Date, price per gram, buyback price
- Source (ANTAM, GALERI24, UBS)
- Global across all workspaces

**GoldPriceSetting** - Workspace-specific gold prices
- Buy and buyback prices per gold type
- Updated by workspace owners

## 🔐 Security Features

- **Password Security**: Bcrypt hashing with salt
- **JWT Authentication**: Secure token-based auth
- **Role-Based Access Control**: Granular permissions
- **SQL Injection Protection**: SQLAlchemy ORM
- **CORS Configuration**: Controlled API access
- **Environment Variables**: Sensitive data protection
- **Git Security**: Comprehensive .gitignore for secrets

### Protected Files (Gitignored)
```
config.py           # Database & secret keys
*.sh                # Shell scripts with credentials
*.log               # Application logs
.env                # Environment variables
*.db, *.sql         # Database files
*.key, *.pem        # Private keys
nohup.out           # Background process logs
```

## 📊 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/me` - Get current user info

### Workspaces
- `GET /api/workspaces` - List user workspaces
- `POST /api/workspaces` - Create workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/switch` - Switch workspace

### Accounts
- `GET /api/accounts` - List accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Transactions
- `GET /api/transactions` - List transactions (with filters)
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Budget
- `GET /api/budget/plans` - List budget plans
- `POST /api/budget/plans` - Create budget plan
- `POST /api/budget/plans/:id/activate` - Activate budget
- `GET /api/budget/calculate-income` - Calculate income

### Investments
- `GET /api/investments` - List investments
- `POST /api/investments` - Create investment
- `GET /api/investments/gold-price` - Get gold prices
- `POST /api/investments/gold-price/settings/bulk` - Update prices
- `GET /api/investments/gold-price/history` - Price history

*For complete API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)*

## 🎨 UI Features

### Design System
- **Color Palette**: Gradient-based with blue, indigo, amber, green themes
- **Typography**: Modern, clean font hierarchy
- **Components**: Reusable, consistent design patterns
- **Responsive**: Mobile-first approach with Tailwind breakpoints
- **Icons**: FontAwesome for consistent iconography
- **Charts**: Recharts for beautiful data visualization

### User Experience
- **Toast Notifications**: Real-time feedback with react-hot-toast
- **Modal Dialogs**: SweetAlert2 for confirmations
- **Loading States**: Skeleton screens and spinners
- **Error Handling**: User-friendly error messages
- **Keyboard Shortcuts**: Quick navigation support
- **Dark Mode Ready**: CSS structure for theme switching

## 🔧 Development

### Running Tests
```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

### Database Migrations

#### Create New Migration
```bash
cd backend
flask db migrate -m "description of changes"
```

#### Apply Migrations
```bash
flask db upgrade
```

#### Rollback Migration
```bash
flask db downgrade
```

### Code Quality

#### Backend
```bash
# Format code
black .

# Lint code
flake8 .
```

#### Frontend
```bash
# Format code
npm run format

# Lint code
npm run lint
```

## 🚢 Deployment

### Production Checklist

- [ ] Change all secret keys in `config.py`
- [ ] Set `DEBUG = False` in config
- [ ] Use production-grade database
- [ ] Configure CORS for production domain
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure reverse proxy (Nginx/Apache)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set environment variables properly
- [ ] Test all features in production mode

### Environment Variables

Create `.env` file (gitignored):
```env
DATABASE_URL=postgresql://user:pass@localhost/recehku_prod
JWT_SECRET_KEY=your-production-jwt-secret
SECRET_KEY=your-production-secret-key
FLASK_ENV=production
CORS_ORIGINS=https://yourdomain.com
```

## 🤝 Contributing

Contributions are welcome! However, please note:

1. **Security First**: Never commit sensitive files (credentials, keys, logs)
2. **Follow .gitignore**: Respect the gitignore rules
3. **Code Quality**: Follow existing code style and patterns
4. **Documentation**: Update docs for new features
5. **Testing**: Add tests for new functionality

### Setup for Contributors
```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/recehku.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git commit -m "Add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Open Pull Request
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Isnan Wibowo**
- GitHub: [@isnanw](https://github.com/isnanw)

## 🙏 Acknowledgments

- Flask framework and community
- React team for amazing UI library
- Tailwind CSS for utility-first CSS
- Recharts for beautiful charts
- All open-source contributors

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common problems
- Review [QUICKSTART.md](QUICKSTART.md) for setup help

## 🗺️ Roadmap

- [ ] Multi-currency support
- [ ] Recurring transactions
- [ ] Budget alerts and notifications
- [ ] Export to CSV/PDF
- [ ] Mobile app (React Native)
- [ ] Dark mode
- [ ] More investment types (stocks, crypto)
- [ ] Financial goals tracking
- [ ] AI-powered insights
- [ ] Integration with banking APIs

---

Made with ❤️ for better personal finance management
