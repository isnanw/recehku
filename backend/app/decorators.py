"""Authorization decorators for role-based access control."""
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.models import WorkspaceMember, Role, User
from typing import List, Callable


def get_user_role_in_workspace(user_id: int, workspace_id: int) -> str:
    """Get user's role name in a specific workspace."""
    membership = WorkspaceMember.query.filter_by(
        user_id=user_id,
        workspace_id=workspace_id
    ).first()

    if not membership:
        return None

    return membership.role.name


def check_workspace_permission(user_id: int, workspace_id: int, required_roles: List[str]) -> bool:
    """
    Check if user has required permission in workspace.

    Args:
        user_id: User ID
        workspace_id: Workspace ID
        required_roles: List of role names that have access

    Returns:
        True if user has permission, False otherwise
    """
    # Cek apakah user adalah Owner (Superadmin) - mereka bisa akses semua workspace
    user = User.query.get(user_id)
    if user and user.is_owner:
        return True

    # Get user's role di workspace ini
    user_role = get_user_role_in_workspace(user_id, workspace_id)

    if not user_role:
        return False

    # Check if user's role is in required roles
    return user_role in required_roles


def require_role(*allowed_roles, skip_workspace_check=False):
    """
    Decorator to check if user has required role in workspace.

    Usage:
        @require_role('Owner', 'Admin')
        def some_route():
            ...

    The workspace_id should be provided in:
    - Query params: ?workspace_id=123
    - JSON body: {"workspace_id": 123}
    - URL params will be handled by view function

    For endpoints that check workspace_id from resource (like transaction):
        @require_role('Owner', 'Admin', skip_workspace_check=True)
        def delete_transaction(transaction_id):
            # Function will handle workspace_id check internally
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                current_user_id = int(get_jwt_identity())

                # If skip_workspace_check is True, let the function handle it
                if skip_workspace_check:
                    return f(*args, **kwargs)

                # Try to get workspace_id from various sources
                workspace_id = None

                # 1. From URL parameters (kwargs)
                workspace_id = kwargs.get('workspace_id')

                # 2. From query parameters
                if not workspace_id:
                    workspace_id = request.args.get('workspace_id', type=int)

                # 3. From JSON body
                if not workspace_id and request.is_json:
                    workspace_id = request.json.get('workspace_id')

                if not workspace_id:
                    return jsonify({'error': 'workspace_id diperlukan'}), 400

                # Check permission
                has_permission = check_workspace_permission(current_user_id, workspace_id, list(allowed_roles))

                if not has_permission:
                    user_role = get_user_role_in_workspace(current_user_id, workspace_id)
                    if user_role:
                        return jsonify({
                            'error': 'Akses ditolak',
                            'message': f'Role {user_role} tidak memiliki izin untuk aksi ini',
                            'required_roles': list(allowed_roles)
                        }), 403
                    else:
                        return jsonify({'error': 'Anda bukan anggota workspace ini'}), 403

                return f(*args, **kwargs)

            except Exception as e:
                return jsonify({'error': f'Authorization error: {str(e)}'}), 500

        return decorated_function
    return decorator


def is_owner(user_id: int) -> bool:
    """Check if user is an Owner (global admin)."""
    # Owner is determined by having Owner role in any workspace
    # Or you can implement a different logic (e.g., specific user IDs)
    membership = WorkspaceMember.query.filter_by(user_id=user_id).first()
    if membership:
        return membership.role.name == 'Owner'
    return False


def require_owner(f: Callable) -> Callable:
    """Decorator to require Owner role (global admin)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = int(get_jwt_identity())

            if not is_owner(current_user_id):
                return jsonify({
                    'error': 'Akses ditolak',
                    'message': 'Hanya Owner yang dapat mengakses resource ini'
                }), 403

            return f(*args, **kwargs)

        except Exception as e:
            return jsonify({'error': f'Authorization error: {str(e)}'}), 500

    return decorated_function
