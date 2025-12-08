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
