"""Flask application factory."""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from config import config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()


def create_app(config_name: str = 'development') -> Flask:
    """
    Create and configure the Flask application.

    Args:
        config_name: Configuration name (development, production, testing)

    Returns:
        Configured Flask application
    """
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app)

    # Register blueprints
    from app.routes import auth_bp, workspace_bp, account_bp, category_bp, transaction_bp
    from app.routes.analytics import analytics_bp
    from app.routes.investment import investment_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(workspace_bp, url_prefix='/api/workspaces')
    app.register_blueprint(account_bp, url_prefix='/api/accounts')
    app.register_blueprint(category_bp, url_prefix='/api/categories')
    app.register_blueprint(transaction_bp, url_prefix='/api/transactions')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(investment_bp, url_prefix='/api/investments')

    return app
