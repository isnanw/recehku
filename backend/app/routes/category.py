"""Category routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Category, WorkspaceMember
from app.decorators import require_role
from typing import Tuple, Dict, Any

category_bp = Blueprint('category', __name__)


def check_workspace_access(user_id: int, workspace_id: int) -> bool:
    """Check if user has access to workspace."""
    from app.models import User

    # Check if user is Owner (Superadmin) - they can access all workspaces
    user = User.query.get(user_id)
    if user and user.is_owner:
        return True

    # Check normal membership
    membership = WorkspaceMember.query.filter_by(
        user_id=user_id,
        workspace_id=workspace_id
    ).first()
    return membership is not None


@category_bp.route('', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_categories() -> Tuple[Dict[str, Any], int]:
    """
    Get all categories for a workspace.

    Query params:
        workspace_id: int (required)
        type: str (optional) - INCOME or EXPENSE

    Returns:
        JSON response with list of categories
    """
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)
        category_type = request.args.get('type')

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        # Check access
        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        query = Category.query.filter_by(workspace_id=workspace_id)

        if category_type:
            query = query.filter_by(type=category_type)

        categories = query.all()

        # Build flat list with all categories (parents and children)
        category_list = []
        for category in categories:
            category_data = {
                'id': category.id,
                'name': category.name,
                'type': category.type,
                'parent_id': category.parent_id,
                'created_at': category.created_at.isoformat(),
                'is_used': category.transactions.count() > 0
            }
            category_list.append(category_data)

        return {'categories': category_list}, 200

    except Exception as e:
        return {'error': f'Gagal mengambil kategori: {str(e)}'}, 500


@category_bp.route('', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin')
def create_category() -> Tuple[Dict[str, Any], int]:
    """
    Create a new category.

    Expected JSON:
        {
            "workspace_id": 1,
            "name": "Food",
            "type": "EXPENSE",
            "parent_id": null
        }

    Returns:
        JSON response with created category
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Validate input
        required_fields = ['workspace_id', 'name', 'type']
        if not data or not all(k in data for k in required_fields):
            return {'error': 'Data yang diperlukan tidak lengkap'}, 400

        workspace_id = data['workspace_id']

        # Check access
        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Validate type
        if data['type'] not in ['INCOME', 'EXPENSE']:
            return {'error': 'Type must be INCOME or EXPENSE'}, 400

        # Create category
        category = Category(
            workspace_id=workspace_id,
            name=data['name'],
            type=data['type'],
            parent_id=data.get('parent_id')
        )
        db.session.add(category)
        db.session.commit()

        return {
            'message': 'Kategori berhasil dibuat',
            'category': {
                'id': category.id,
                'name': category.name,
                'type': category.type,
                'parent_id': category.parent_id
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal membuat kategori: {str(e)}'}, 500


@category_bp.route('/<int:category_id>', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer', skip_workspace_check=True)
def get_category(category_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Get category details.

    Returns:
        JSON response with category details
    """
    try:
        current_user_id = int(get_jwt_identity())

        category = Category.query.get(category_id)
        if not category:
            return {'error': 'Kategori tidak ditemukan'}, 404

        # Check access
        if not check_workspace_access(current_user_id, category.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        return {
            'category': {
                'id': category.id,
                'name': category.name,
                'type': category.type,
                'parent_id': category.parent_id,
                'created_at': category.created_at.isoformat()
            }
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil kategori: {str(e)}'}, 500


@category_bp.route('/<int:category_id>', methods=['PUT'])
@jwt_required()
@require_role('Owner', 'Admin', skip_workspace_check=True)
def update_category(category_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Update category details.

    Expected JSON:
        {
            "name": "Updated Category",
            "type": "EXPENSE",
            "parent_id": 1
        }

    Returns:
        JSON response with updated category
    """
    try:
        current_user_id = int(get_jwt_identity())

        category = Category.query.get(category_id)
        if not category:
            return {'error': 'Kategori tidak ditemukan'}, 404

        # Check access
        if not check_workspace_access(current_user_id, category.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        data = request.get_json()
        if not data:
            return {'error': 'Tidak ada data yang diberikan'}, 400

        # Update fields
        if 'name' in data:
            category.name = data['name']
        if 'type' in data:
            if data['type'] not in ['INCOME', 'EXPENSE']:
                return {'error': 'Type must be INCOME or EXPENSE'}, 400
            category.type = data['type']
        if 'parent_id' in data:
            category.parent_id = data['parent_id']

        db.session.commit()

        return {
            'message': 'Kategori berhasil diperbarui',
            'category': {
                'id': category.id,
                'name': category.name,
                'type': category.type,
                'parent_id': category.parent_id
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui kategori: {str(e)}'}, 500


@category_bp.route('/<int:category_id>', methods=['DELETE'])
@jwt_required()
@require_role('Owner', 'Admin', skip_workspace_check=True)
def delete_category(category_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Delete category.

    Returns:
        JSON response confirming deletion
    """
    try:
        current_user_id = int(get_jwt_identity())

        category = Category.query.get(category_id)
        if not category:
            return {'error': 'Kategori tidak ditemukan'}, 404

        # Check access
        if not check_workspace_access(current_user_id, category.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Check if category is used in any transaction
        if category.transactions.count() > 0:
            return {'error': 'Kategori tidak dapat dihapus karena sudah digunakan dalam transaksi'}, 400

        db.session.delete(category)
        db.session.commit()

        return {'message': 'Kategori berhasil dihapus'}, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menghapus kategori: {str(e)}'}, 500
