"""Route blueprints initialization."""
from app.routes.auth import auth_bp
from app.routes.workspace import workspace_bp
from app.routes.account import account_bp
from app.routes.category import category_bp
from app.routes.transaction import transaction_bp

__all__ = ['auth_bp', 'workspace_bp', 'account_bp', 'category_bp', 'transaction_bp']
