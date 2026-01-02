"""Database models for the finance tracker application."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from app import db


class Role(db.Model):
    """Role model for workspace permissions."""
    __tablename__ = 'roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # Owner, Admin, Member, Viewer

    # Relationships
    workspace_members = db.relationship('WorkspaceMember', back_populates='role', lazy='dynamic')

    def __repr__(self) -> str:
        return f'<Role {self.name}>'


class User(db.Model):
    """User model."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    hashed_password = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    is_owner = db.Column(db.Boolean, default=False, nullable=False)  # Super Admin flag
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    workspace_members = db.relationship('WorkspaceMember', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self) -> str:
        return f'<User {self.email}>'


class Workspace(db.Model):
    """Workspace model - isolated container for finance data."""
    __tablename__ = 'workspaces'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    members = db.relationship('WorkspaceMember', back_populates='workspace', lazy='dynamic', cascade='all, delete-orphan')
    accounts = db.relationship('Account', back_populates='workspace', lazy='dynamic', cascade='all, delete-orphan')
    categories = db.relationship('Category', back_populates='workspace', lazy='dynamic', cascade='all, delete-orphan')
    transactions = db.relationship('Transaction', back_populates='workspace', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self) -> str:
        return f'<Workspace {self.name}>'


class WorkspaceMember(db.Model):
    """Many-to-many relationship between Users and Workspaces with roles."""
    __tablename__ = 'workspace_members'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', back_populates='workspace_members')
    workspace = db.relationship('Workspace', back_populates='members')
    role = db.relationship('Role', back_populates='workspace_members')

    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('user_id', 'workspace_id', name='unique_user_workspace'),
    )

    def __repr__(self) -> str:
        return f'<WorkspaceMember user_id={self.user_id} workspace_id={self.workspace_id}>'


class Account(db.Model):
    """Account model for tracking different financial accounts."""
    __tablename__ = 'accounts'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    initial_balance = db.Column(db.Numeric(15, 2), default=0, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # e.g., Bank, Cash, Credit Card
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    workspace = db.relationship('Workspace', back_populates='accounts')
    transactions = db.relationship('Transaction', foreign_keys='Transaction.account_id', back_populates='account', lazy='dynamic')
    transfer_transactions = db.relationship('Transaction', foreign_keys='Transaction.transfer_to_account_id', back_populates='transfer_to_account', lazy='dynamic')

    def __repr__(self) -> str:
        return f'<Account {self.name}>'


class Category(db.Model):
    """Category model for organizing transactions."""
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # INCOME or EXPENSE
    parent_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    workspace = db.relationship('Workspace', back_populates='categories')
    parent = db.relationship('Category', remote_side=[id], backref='subcategories')
    transactions = db.relationship('Transaction', back_populates='category', lazy='dynamic')

    def __repr__(self) -> str:
        return f'<Category {self.name} ({self.type})>'


class Transaction(db.Model):
    """Transaction model for recording financial transactions."""
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False)
    transfer_to_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    type = db.Column(db.String(20), nullable=False)  # INCOME, EXPENSE, TRANSFER
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    transaction_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    workspace = db.relationship('Workspace', back_populates='transactions')
    account = db.relationship('Account', foreign_keys=[account_id], back_populates='transactions')
    transfer_to_account = db.relationship('Account', foreign_keys=[transfer_to_account_id], back_populates='transfer_transactions')
    category = db.relationship('Category', back_populates='transactions')

    def __repr__(self) -> str:
        return f'<Transaction {self.type} {self.amount}>'


class WorkspaceInvitation(db.Model):
    """Workspace invitation model for inviting users."""
    __tablename__ = 'workspace_invitations'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    email = db.Column(db.String(120), nullable=False, index=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    invited_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)  # pending, accepted, expired
    token = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    # Relationships
    workspace = db.relationship('Workspace')
    role = db.relationship('Role')
    inviter = db.relationship('User', foreign_keys=[invited_by])

    def __repr__(self) -> str:
        return f'<WorkspaceInvitation {self.email} to {self.workspace_id}>'


class Investment(db.Model):
    """Investment model for tracking gold assets."""
    __tablename__ = 'investment'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True, index=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id', ondelete='SET NULL'), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)  # e.g., "Investasi Emas Antam"
    type = db.Column(db.String(50), nullable=False)  # GOLD (kept for backward compatibility)
    gold_type = db.Column(db.String(50), nullable=True)  # ANTAM, GALERI24, UBS, PEGADAIAN
    weight = db.Column(db.Numeric(10, 2), nullable=True)  # Weight in grams (for gold)
    quantity = db.Column(db.Numeric(15, 4), nullable=False)  # Amount owned (backward compatibility)
    buy_price = db.Column(db.Numeric(15, 2), nullable=False)  # Price per gram
    current_price = db.Column(db.Numeric(15, 2), nullable=True)  # Current market price per gram
    purchase_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    workspace = db.relationship('Workspace', backref=db.backref('investments', lazy='dynamic', cascade='all, delete-orphan'))
    account = db.relationship('Account', backref=db.backref('investments', lazy='dynamic'))
    transaction = db.relationship('Transaction', backref=db.backref('investment', uselist=False))

    def __repr__(self) -> str:
        return f'<Investment {self.name}>'

    @property
    def total_buy_value(self) -> Decimal:
        """Total amount spent on this investment."""
        effective_quantity = Decimal(self.weight) if self.weight else Decimal(self.quantity)
        return effective_quantity * Decimal(self.buy_price)

    @property
    def total_current_value(self) -> Optional[Decimal]:
        """Current market value of investment."""
        if self.current_price is None:
            return None
        effective_quantity = Decimal(self.weight) if self.weight else Decimal(self.quantity)
        return effective_quantity * Decimal(self.current_price)

    @property
    def profit_loss(self) -> Optional[Decimal]:
        """Profit or loss amount."""
        if self.current_price is None:
            return None
        return self.total_current_value - self.total_buy_value

    @property
    def profit_loss_percentage(self) -> Optional[Decimal]:
        """Profit or loss as percentage."""
        if self.current_price is None or self.total_buy_value == 0:
            return None
        return (self.profit_loss / self.total_buy_value) * 100


class GoldPriceSetting(db.Model):
    """Gold price settings configured by workspace owner."""
    __tablename__ = 'gold_price_settings'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    gold_type = db.Column(db.String(50), nullable=False)  # ANTAM, GALERI24, UBS
    buy_price = db.Column(db.Numeric(15, 2), nullable=False)  # Harga jual (ke customer)
    buyback_price = db.Column(db.Numeric(15, 2), nullable=False)  # Harga buyback (beli kembali)
    source_link = db.Column(db.String(500), nullable=True)  # Link sumber harga emas
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workspace = db.relationship('Workspace', backref=db.backref('gold_price_settings', lazy='dynamic', cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('gold_price_settings', lazy='dynamic'))

    # Unique constraint
    __table_args__ = (
        db.Index('idx_gold_price_workspace_type', 'workspace_id', 'gold_type', unique=True),
    )

    def __repr__(self) -> str:
        return f'<GoldPriceSetting {self.gold_type} - {self.buy_price}>'


class GoldPrice(db.Model):
    """Daily gold price model - global for all workspaces."""
    __tablename__ = 'gold_prices'
    __table_args__ = (
        db.UniqueConstraint('date', 'source', name='uq_gold_prices_date_source'),
    )

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)  # Tanggal harga emas
    price_per_gram = db.Column(db.Numeric(15, 2), nullable=False)  # Harga beli per gram dalam IDR
    buyback_price = db.Column(db.Numeric(15, 2), nullable=True)  # Harga buyback per gram dalam IDR
    source = db.Column(db.String(100), nullable=True)  # Sumber data (e.g., "ANTAM", "GALERI24", "UBS")
    notes = db.Column(db.Text, nullable=True)  # Catatan tambahan
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f'<GoldPrice {self.date} {self.source} - {self.price_per_gram}>'


class BudgetPlan(db.Model):
    """Budget plan model for financial planning."""
    __tablename__ = 'budget_plans'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)  # e.g., "Budget Januari 2025"
    income_amount = db.Column(db.Numeric(15, 2), nullable=False)  # Total income (frozen when active)
    income_date = db.Column(db.Date, nullable=True)  # Tanggal gajian (optional)
    period_start = db.Column(db.Date, nullable=False)  # Awal periode budget
    period_end = db.Column(db.Date, nullable=False)  # Akhir periode budget
    status = db.Column(db.String(20), nullable=False, default='DRAFT')  # DRAFT or ACTIVE
    is_active = db.Column(db.Boolean, default=True)  # Active budget
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workspace = db.relationship('Workspace', backref=db.backref('budget_plans', lazy='dynamic', cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('budget_plans', lazy='dynamic'))
    allocations = db.relationship('BudgetAllocation', back_populates='budget_plan', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self) -> str:
        return f'<BudgetPlan {self.name}>'


class BudgetAllocation(db.Model):
    """Budget allocation per category."""
    __tablename__ = 'budget_allocations'

    id = db.Column(db.Integer, primary_key=True)
    budget_plan_id = db.Column(db.Integer, db.ForeignKey('budget_plans.id', ondelete='CASCADE'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='CASCADE'), nullable=False)
    allocated_amount = db.Column(db.Numeric(15, 2), nullable=False)  # Planned amount
    is_system_recommended = db.Column(db.Boolean, default=False)  # True if auto-generated, False if manual
    notes = db.Column(db.Text, nullable=True)

    # Relationships
    budget_plan = db.relationship('BudgetPlan', back_populates='allocations')
    category = db.relationship('Category', backref=db.backref('budget_allocations', lazy='dynamic'))

    # Unique constraint - one allocation per category per budget plan
    __table_args__ = (
        db.Index('idx_budget_category', 'budget_plan_id', 'category_id', unique=True),
    )

    def __repr__(self) -> str:
        return f'<BudgetAllocation {self.budget_plan_id} - {self.category_id}>'
