# API Documentation

Complete API reference for the Finance Tracker backend.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### Register User

Create a new user account.

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response** (201):
```json
{
  "message": "User registered successfully",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbG...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe"
  },
  "workspace": {
    "id": 1,
    "name": "John Doe's Workspace"
  }
}
```

### Login

Authenticate and receive JWT token.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "message": "Login successful",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbG...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe"
  },
  "workspaces": [
    {
      "id": 1,
      "name": "John Doe's Workspace",
      "role": "Owner"
    }
  ]
}
```

### Get Current User

Get authenticated user information.

**Endpoint**: `GET /auth/me`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe"
  },
  "workspaces": [
    {
      "id": 1,
      "name": "John Doe's Workspace",
      "role": "Owner"
    }
  ]
}
```

---

## 🏢 Workspace Endpoints

### List Workspaces

Get all workspaces for the current user.

**Endpoint**: `GET /workspaces`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "workspaces": [
    {
      "id": 1,
      "name": "Personal Finance",
      "role": "Owner",
      "joined_at": "2024-01-15T10:30:00"
    }
  ]
}
```

### Create Workspace

Create a new workspace.

**Endpoint**: `POST /workspaces`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Family Budget"
}
```

**Response** (201):
```json
{
  "message": "Workspace created successfully",
  "workspace": {
    "id": 2,
    "name": "Family Budget",
    "role": "Owner"
  }
}
```

### Get Workspace Details

Get detailed information about a workspace.

**Endpoint**: `GET /workspaces/:id`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "workspace": {
    "id": 1,
    "name": "Personal Finance",
    "created_at": "2024-01-15T10:30:00",
    "your_role": "Owner",
    "members": [
      {
        "user_id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "Owner",
        "joined_at": "2024-01-15T10:30:00"
      }
    ]
  }
}
```

### Update Workspace

Update workspace details (Admin/Owner only).

**Endpoint**: `PUT /workspaces/:id`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Updated Workspace Name"
}
```

**Response** (200):
```json
{
  "message": "Workspace updated successfully",
  "workspace": {
    "id": 1,
    "name": "Updated Workspace Name"
  }
}
```

### Delete Workspace

Delete workspace (Owner only).

**Endpoint**: `DELETE /workspaces/:id`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Workspace deleted successfully"
}
```

---

## 🏦 Account Endpoints

### List Accounts

Get all accounts in a workspace.

**Endpoint**: `GET /accounts`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `workspace_id` (required): Workspace ID

**Example**: `GET /accounts?workspace_id=1`

**Response** (200):
```json
{
  "accounts": [
    {
      "id": 1,
      "name": "BCA Main Account",
      "type": "Bank",
      "initial_balance": 10000000,
      "current_balance": 12500000,
      "created_at": "2024-01-15T10:30:00"
    }
  ]
}
```

### Create Account

Create a new account.

**Endpoint**: `POST /accounts`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "workspace_id": 1,
  "name": "BCA Savings",
  "type": "Bank",
  "initial_balance": 5000000
}
```

**Response** (201):
```json
{
  "message": "Account created successfully",
  "account": {
    "id": 2,
    "name": "BCA Savings",
    "type": "Bank",
    "initial_balance": 5000000,
    "current_balance": 5000000
  }
}
```

### Get Account Details

Get detailed information about an account.

**Endpoint**: `GET /accounts/:id`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "account": {
    "id": 1,
    "name": "BCA Main Account",
    "type": "Bank",
    "initial_balance": 10000000,
    "current_balance": 12500000,
    "created_at": "2024-01-15T10:30:00"
  }
}
```

### Update Account

Update account details.

**Endpoint**: `PUT /accounts/:id`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "BCA Updated",
  "type": "Bank",
  "initial_balance": 11000000
}
```

**Response** (200):
```json
{
  "message": "Account updated successfully",
  "account": {
    "id": 1,
    "name": "BCA Updated",
    "type": "Bank",
    "initial_balance": 11000000
  }
}
```

### Delete Account

Delete an account.

**Endpoint**: `DELETE /accounts/:id`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Account deleted successfully"
}
```

---

## 📁 Category Endpoints

### List Categories

Get all categories in a workspace.

**Endpoint**: `GET /categories`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `workspace_id` (required): Workspace ID
- `type` (optional): INCOME or EXPENSE

**Example**: `GET /categories?workspace_id=1&type=EXPENSE`

**Response** (200):
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Food & Dining",
      "type": "EXPENSE",
      "parent_id": null,
      "created_at": "2024-01-15T10:30:00",
      "subcategories": [
        {
          "id": 2,
          "name": "Restaurant",
          "type": "EXPENSE"
        }
      ]
    }
  ]
}
```

### Create Category

Create a new category.

**Endpoint**: `POST /categories`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "workspace_id": 1,
  "name": "Transportation",
  "type": "EXPENSE",
  "parent_id": null
}
```

**Response** (201):
```json
{
  "message": "Category created successfully",
  "category": {
    "id": 3,
    "name": "Transportation",
    "type": "EXPENSE",
    "parent_id": null
  }
}
```

### Get Category Details

Get detailed information about a category.

**Endpoint**: `GET /categories/:id`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "category": {
    "id": 1,
    "name": "Food & Dining",
    "type": "EXPENSE",
    "parent_id": null,
    "created_at": "2024-01-15T10:30:00"
  }
}
```

### Update Category

Update category details.

**Endpoint**: `PUT /categories/:id`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Food & Beverages",
  "type": "EXPENSE",
  "parent_id": null
}
```

**Response** (200):
```json
{
  "message": "Category updated successfully",
  "category": {
    "id": 1,
    "name": "Food & Beverages",
    "type": "EXPENSE",
    "parent_id": null
  }
}
```

### Delete Category

Delete a category.

**Endpoint**: `DELETE /categories/:id`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Category deleted successfully"
}
```

---

## 💰 Transaction Endpoints

### List Transactions

Get all transactions in a workspace.

**Endpoint**: `GET /transactions`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `workspace_id` (required): Workspace ID
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `type` (optional): INCOME, EXPENSE, TRANSFER
- `account_id` (optional): Filter by account
- `page` (optional): Page number for pagination (default: 1)
- `per_page` (optional): Items per page for pagination (default: 200)

**Example**: `GET /transactions?workspace_id=1&start_date=2024-01-01&type=EXPENSE`

**Response** (200):
```json
{
  "transactions": [
    {
      "id": 1,
      "type": "EXPENSE",
      "amount": 150000,
      "transaction_date": "2024-01-20",
      "description": "Dinner with family",
      "created_at": "2024-01-20T19:30:00",
      "account": {
        "id": 1,
        "name": "BCA Main Account"
      },
      "category": {
        "id": 2,
        "name": "Restaurant",
        "type": "EXPENSE"
      }
    }
  ],
  "page": 1,
  "per_page": 200,
  "total_pages": 3,
  "total": 512
}
```

### Create Transaction

Create a new transaction.

**Endpoint**: `POST /transactions`

**Headers**: `Authorization: Bearer <token>`

**Request Body (Income/Expense)**:
```json
{
  "workspace_id": 1,
  "account_id": 1,
  "category_id": 2,
  "type": "EXPENSE",
  "amount": 150000,
  "transaction_date": "2024-01-20",
  "description": "Lunch"
}
```

**Request Body (Transfer)**:
```json
{
  "workspace_id": 1,
  "account_id": 1,
  "transfer_to_account_id": 2,
  "type": "TRANSFER",
  "amount": 1000000,
  "transaction_date": "2024-01-20",
  "description": "Transfer to savings"
}
```

**Response** (201):
```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": 10,
    "type": "EXPENSE",
    "amount": 150000,
    "transaction_date": "2024-01-20",
    "description": "Lunch"
  }
}
```

### Get Transaction Details

Get detailed information about a transaction.

**Endpoint**: `GET /transactions/:id`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "transaction": {
    "id": 1,
    "type": "EXPENSE",
    "amount": 150000,
    "transaction_date": "2024-01-20",
    "description": "Dinner with family",
    "created_at": "2024-01-20T19:30:00",
    "account": {
      "id": 1,
      "name": "BCA Main Account"
    },
    "category": {
      "id": 2,
      "name": "Restaurant",
      "type": "EXPENSE"
    }
  }
}
```

### Update Transaction

Update transaction details.

**Endpoint**: `PUT /transactions/:id`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "amount": 200000,
  "transaction_date": "2024-01-21",
  "description": "Updated description",
  "category_id": 3
}
```

**Response** (200):
```json
{
  "message": "Transaction updated successfully",
  "transaction": {
    "id": 1,
    "type": "EXPENSE",
    "amount": 200000,
    "transaction_date": "2024-01-21",
    "description": "Updated description"
  }
}
```

### Delete Transaction

Delete a transaction.

**Endpoint**: `DELETE /transactions/:id`

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Transaction deleted successfully"
}
```

### Get Financial Summary

Get financial summary and analytics.

**Endpoint**: `GET /transactions/summary`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `workspace_id` (required): Workspace ID
- `month` (optional): 1-12 (default: current month)
- `year` (optional): YYYY (default: current year)

**Example**: `GET /transactions/summary?workspace_id=1&month=1&year=2024`

**Response** (200):
```json
{
  "summary": {
    "total_balance": 15700000,
    "income_this_month": 18000000,
    "expense_this_month": 2300000,
    "expenses_by_category": [
      {
        "name": "Food & Dining",
        "amount": 850000
      },
      {
        "name": "Transportation",
        "amount": 450000
      }
    ],
    "month": 1,
    "year": 2024
  }
}
```

---

## 📊 Analytics Endpoints

### Income By Category (Server-side aggregation)

Aggregate income grouped by category. This endpoint performs the aggregation in the database (recommended for large datasets).

**Endpoint**: `GET /analytics/income-by-category`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `workspace_id` (required): Workspace ID
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `top_n` (optional): Limit to top N categories (default: 8)

**Example**: `GET /analytics/income-by-category?workspace_id=1&start_date=2024-01-01&end_date=2024-12-31&top_n=8`

**Response** (200):
```json
{
  "income_by_category": [
    { "category_name": "Gaji", "total": 12000000 },
    { "category_name": "Proyek Sampingan", "total": 3500000 },
    { "category_name": "Lainnya", "total": 500000 }
  ]
}
```

---

## 💰 Investment Endpoints

### Get All Investments

Retrieve all gold investments for a workspace.

**Endpoint**: `GET /investments`

**Authentication**: Required

**Role**: Owner, Admin, Member, Viewer

**Query Parameters**:
- `workspace_id` (required): Workspace ID

**Response** (200):
```json
{
  "investments": [
    {
      "id": 1,
      "name": "Emas Antam 5g",
      "type": "GOLD",
      "gold_type": "ANTAM",
      "weight": 5.0,
      "account_id": 1,
      "account": {
        "id": 1,
        "name": "BCA"
      },
      "quantity": 5.0,
      "buy_price": 1100000,
      "current_price": 1150000,
      "purchase_date": "2024-01-15",
      "notes": "Investasi jangka panjang",
      "total_buy_value": 5500000,
      "total_current_value": 5750000,
      "profit_loss": 250000,
      "profit_loss_percentage": 4.55
    }
  ]
}
```

---

### Create Investment

Create a new gold investment and automatically deduct from account.

**Endpoint**: `POST /investments`

**Authentication**: Required

**Role**: Owner, Admin, Member

**Request Body**:
```json
{
  "workspace_id": 1,
  "account_id": 1,
  "name": "Emas UBS 10g",
  "gold_type": "UBS",
  "weight": 10,
  "buy_price": 1050000,
  "purchase_date": "2024-12-28",
  "notes": "Pembelian akhir tahun"
}
```

**Response** (201):
```json
{
  "message": "Investasi berhasil ditambahkan",
  "investment": {
    "id": 2,
    "name": "Emas UBS 10g",
    "type": "GOLD",
    "quantity": 10,
    "buy_price": 1050000,
    "total_buy_value": 10500000
  }
}
```

**Note**:
- Automatically creates an EXPENSE transaction in "Investasi Emas" category
- Deducts total value (weight × buy_price) from specified account

---

### Update Investment

Update an existing investment.

**Endpoint**: `PUT /investments/<investment_id>`

**Authentication**: Required

**Role**: Owner, Admin, Member

**Request Body** (all fields optional):
```json
{
  "name": "Emas UBS 10g - Updated",
  "gold_type": "GALERI24",
  "weight": 12,
  "account_id": 2,
  "buy_price": 1045000,
  "purchase_date": "2024-12-25",
  "notes": "Updated notes"
}
```

**Response** (200):
```json
{
  "message": "Investasi berhasil diperbarui"
}
```

---

### Delete Investment

Delete an investment and its linked transaction.

**Endpoint**: `DELETE /investments/<investment_id>`

**Authentication**: Required

**Role**: Owner, Admin

**Response** (200):
```json
{
  "message": "Investasi dan transaksi terkait berhasil dihapus"
}
```

**Note**: Also deletes the linked EXPENSE transaction created when the investment was made.

---

### Get Gold Prices

Get current gold prices for all types. Returns workspace-specific prices if set by Owner, otherwise returns default prices.

**Endpoint**: `GET /investments/gold-price`

**Authentication**: Required

**Query Parameters**:
- `workspace_id` (optional): To get workspace-specific prices

**Response** (200):
```json
{
  "prices": {
    "ANTAM": {
      "name": "Antam",
      "buyback": 1050000,
      "sell": 1100000,
      "last_update": "2024-12-28T21:00:00",
      "source": "Workspace Settings"
    },
    "GALERI24": {
      "name": "Galeri24",
      "buyback": 1045000,
      "sell": 1095000,
      "last_update": "2024-12-28T21:00:00",
      "source": "Workspace Settings"
    },
    "UBS": {
      "name": "UBS",
      "buyback": 1048000,
      "sell": 1098000,
      "last_update": "2024-12-28T21:00:00",
      "source": "Default Price"
    }
  }
}
```

**Source Types**:
- `Workspace Settings`: Price set by workspace Owner/Admin
- `Default Price`: System default price

---

### Set Gold Price (Single)

Set or update gold price for a specific type. Only Owner and Admin can set prices.

**Endpoint**: `POST /investments/gold-price/settings`

**Authentication**: Required

**Role**: Owner, Admin

**Request Body**:
```json
{
  "workspace_id": 1,
  "gold_type": "ANTAM",
  "buy_price": 1100000,
  "buyback_price": 1050000
}
```

**Response** (200):
```json
{
  "message": "Harga ANTAM berhasil diperbarui",
  "setting": {
    "gold_type": "ANTAM",
    "buy_price": 1100000,
    "buyback_price": 1050000,
    "last_update": "2024-12-28T21:30:00"
  }
}
```

**Valid Gold Types**: `ANTAM`, `GALERI24`, `UBS`

---

### Set Gold Prices (Bulk)

Set or update all gold prices at once.

**Endpoint**: `POST /investments/gold-price/settings/bulk`

**Authentication**: Required

**Role**: Owner, Admin

**Request Body**:
```json
{
  "workspace_id": 1,
  "prices": [
    {
      "gold_type": "ANTAM",
      "buy_price": 1100000,
      "buyback_price": 1050000
    },
    {
      "gold_type": "GALERI24",
      "buy_price": 1095000,
      "buyback_price": 1045000
    },
    {
      "gold_type": "UBS",
      "buy_price": 1098000,
      "buyback_price": 1048000
    }
  ]
}
```

**Response** (200):
```json
{
  "message": "3 harga emas berhasil diperbarui",
  "updated_count": 3
}
```

---

### Update Current Price

Manually update the current market price of a specific investment.

**Endpoint**: `POST /investments/<investment_id>/update-price`

**Authentication**: Required

**Role**: Owner, Admin, Member

**Request Body**:
```json
{
  "current_price": 1150000
}
```

**Response** (200):
```json
{
  "message": "Harga berhasil diperbarui",
  "profit_loss": 250000,
  "profit_loss_percentage": 4.55
}
```

---

### Auto Update All Prices

Automatically update all investment prices based on workspace gold price settings.

**Endpoint**: `POST /investments/auto-update-prices`

**Authentication**: Required

**Role**: Owner, Admin, Member

**Request Body**:
```json
{
  "workspace_id": 1
}
```

**Response** (200):
```json
{
  "message": "5 investasi berhasil diperbarui",
  "updated_count": 5,
  "total_investments": 5,
  "timestamp": "2024-12-28T21:40:00"
}
```

**Note**: Uses the buyback price from workspace settings as current_price for each investment.

---

## Error Responses

All endpoints return error responses in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding it for production.

## Pagination

`GET /transactions` now supports pagination. Use the `page` and `per_page` query parameters to iterate pages. Responses include the fields `page`, `per_page`, `total_pages`, and `total` alongside the `transactions` array.

Other list endpoints currently return all records unless noted otherwise.

---

**Last Updated**: December 28, 2025
