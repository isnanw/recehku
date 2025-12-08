"""Workspace routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Workspace, WorkspaceMember, User, Role
from app.decorators import require_role
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, Optional

workspace_bp = Blueprint('workspace', __name__)


def get_user_workspace_role(user_id: int, workspace_id: int) -> Optional[str]:
    """Get user's role in a workspace."""
    membership = WorkspaceMember.query.filter_by(
        user_id=user_id,
        workspace_id=workspace_id
    ).first()

    if membership:
        return membership.role.name
    return None


def check_workspace_permission(user_id: int, workspace_id: int, required_roles: list) -> bool:
    """Check if user has required permission in workspace."""
    role = get_user_workspace_role(user_id, workspace_id)
    return role in required_roles if role else False


@workspace_bp.route('', methods=['GET'])
@jwt_required()
def get_workspaces() -> Tuple[Dict[str, Any], int]:
    """
    Get all workspaces for the current user.
    - Owner: dapat melihat SEMUA workspace
    - Lainnya: hanya workspace yang di-join

    Returns:
        JSON response with list of workspaces
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        workspaces = []

        if user.is_owner:
            # Owner (Superadmin) bisa lihat SEMUA workspace
            all_workspaces = Workspace.query.all()
            for workspace in all_workspaces:
                # Cari admin workspace ini untuk info
                admin_membership = WorkspaceMember.query.filter_by(
                    workspace_id=workspace.id
                ).join(Role).filter(Role.name == 'Admin').first()

                admin_name = admin_membership.user.name if admin_membership else 'Unknown'

                workspaces.append({
                    'id': workspace.id,
                    'name': workspace.name,
                    'role': 'Owner',  # Owner selalu punya akses penuh
                    'admin': admin_name,  # Info siapa admin workspace ini
                    'joined_at': workspace.created_at.isoformat()
                })
        else:
            # User biasa hanya lihat workspace yang di-join
            memberships = WorkspaceMember.query.filter_by(user_id=current_user_id).all()
            for membership in memberships:
                workspaces.append({
                    'id': membership.workspace.id,
                    'name': membership.workspace.name,
                    'role': membership.role.name,
                    'joined_at': membership.joined_at.isoformat()
                })

        return {'workspaces': workspaces}, 200

    except Exception as e:
        return {'error': f'Gagal mengambil workspace: {str(e)}'}, 500


@workspace_bp.route('', methods=['POST'])
@jwt_required()
def create_workspace() -> Tuple[Dict[str, Any], int]:
    """
    Create a new workspace.

    Expected JSON:
        {
            "name": "My Workspace"
        }

    Returns:
        JSON response with created workspace
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data or 'name' not in data:
            return {'error': 'Nama workspace harus diisi'}, 400

        # Create workspace
        workspace = Workspace(name=data['name'])
        db.session.add(workspace)
        db.session.flush()

        # Get Owner role
        owner_role = Role.query.filter_by(name='Owner').first()

        # Add creator as owner
        membership = WorkspaceMember(
            user_id=current_user_id,
            workspace_id=workspace.id,
            role_id=owner_role.id
        )
        db.session.add(membership)
        db.session.commit()

        return {
            'message': 'Workspace berhasil dibuat',
            'workspace': {
                'id': workspace.id,
                'name': workspace.name,
                'role': 'Owner'
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal membuat workspace: {str(e)}'}, 500


@workspace_bp.route('/<int:workspace_id>', methods=['GET'])
@jwt_required()
def get_workspace(workspace_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Get workspace details.

    Returns:
        JSON response with workspace details
    """
    try:
        current_user_id = int(get_jwt_identity())

        # Check if user has access to workspace
        role = get_user_workspace_role(current_user_id, workspace_id)
        if not role:
            return {'error': 'Akses ditolak'}, 403

        workspace = Workspace.query.get(workspace_id)
        if not workspace:
            return {'error': 'Workspace tidak ditemukan'}, 404

        # Get workspace members
        members = []
        for membership in workspace.members:
            members.append({
                'user_id': membership.user.id,
                'name': membership.user.name,
                'email': membership.user.email,
                'role': membership.role.name,
                'joined_at': membership.joined_at.isoformat()
            })

        return {
            'workspace': {
                'id': workspace.id,
                'name': workspace.name,
                'created_at': workspace.created_at.isoformat(),
                'your_role': role,
                'members': members
            }
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil workspace: {str(e)}'}, 500


@workspace_bp.route('/<int:workspace_id>', methods=['PUT'])
@jwt_required()
def update_workspace(workspace_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Update workspace details.

    Expected JSON:
        {
            "name": "Updated Workspace Name"
        }

    Returns:
        JSON response with updated workspace
    """
    try:
        current_user_id = int(get_jwt_identity())

        # Check permission (only Owner and Admin can update)
        if not check_workspace_permission(current_user_id, workspace_id, ['Owner', 'Admin']):
            return {'error': 'Izin tidak cukup'}, 403

        workspace = Workspace.query.get(workspace_id)
        if not workspace:
            return {'error': 'Workspace tidak ditemukan'}, 404

        data = request.get_json()
        if not data or 'name' not in data:
            return {'error': 'Nama workspace harus diisi'}, 400

        workspace.name = data['name']
        db.session.commit()

        return {
            'message': 'Workspace berhasil diperbarui',
            'workspace': {
                'id': workspace.id,
                'name': workspace.name
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui workspace: {str(e)}'}, 500


@workspace_bp.route('/<int:workspace_id>', methods=['DELETE'])
@jwt_required()
def delete_workspace(workspace_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Delete workspace (only Owner can delete).

    Returns:
        JSON response confirming deletion
    """
    try:
        current_user_id = int(get_jwt_identity())

        # Check permission (only Owner can delete)
        if not check_workspace_permission(current_user_id, workspace_id, ['Owner']):
            return {'error': 'Hanya pemilik workspace yang dapat menghapus workspace'}, 403

        workspace = Workspace.query.get(workspace_id)
        if not workspace:
            return {'error': 'Workspace tidak ditemukan'}, 404

        db.session.delete(workspace)
        db.session.commit()

        return {'message': 'Workspace berhasil dihapus'}, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menghapus workspace: {str(e)}'}, 500


@workspace_bp.route('/<int:workspace_id>/role', methods=['GET'])
@jwt_required()
def get_user_role(workspace_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Get current user's role and permissions in workspace.

    Returns:
        JSON response with role and permissions
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        # Get role dari workspace membership
        role_name = get_user_workspace_role(current_user_id, workspace_id)

        # Jika tidak ada role di workspace ini, cek apakah Owner (Superadmin)
        if not role_name:
            if user and user.is_owner:
                # Owner bisa akses tapi dengan permission Owner
                role_name = 'Owner'
            else:
                return {'error': 'Anda bukan anggota workspace ini'}, 403

        # Get role permissions
        permissions = get_role_permissions(role_name)

        return {
            'role': role_name,
            'permissions': permissions
        }, 200

    except Exception as e:
        return {'error': f'Gagal memuat role: {str(e)}'}, 500


def get_role_permissions(role_name: str) -> Dict[str, bool]:
    """Get permissions map for a role."""
    permissions = {
        'Owner': {
            'view_dashboard': True,
            'view_transactions': True,
            'create_transaction': True,
            'edit_transaction': True,
            'delete_transaction': True,
            'view_accounts': True,
            'create_account': True,
            'edit_account': True,
            'delete_account': True,
            'view_categories': True,
            'create_category': True,
            'edit_category': True,
            'delete_category': True,
            'view_members': True,
            'add_member': True,
            'edit_member': True,
            'remove_member': True,
        },
        'Admin': {
            'view_dashboard': True,
            'view_transactions': True,
            'create_transaction': True,
            'edit_transaction': True,
            'delete_transaction': True,
            'view_accounts': True,
            'create_account': True,
            'edit_account': True,
            'delete_account': True,
            'view_categories': True,
            'create_category': True,
            'edit_category': True,
            'delete_category': True,
            'view_members': True,
            'add_member': True,
            'edit_member': True,
            'remove_member': True,
        },
        'Member': {
            'view_dashboard': True,
            'view_transactions': True,
            'create_transaction': True,
            'edit_transaction': True,
            'delete_transaction': True,
            'view_accounts': True,
            'create_account': False,
            'edit_account': False,
            'delete_account': False,
            'view_categories': True,
            'create_category': False,
            'edit_category': False,
            'delete_category': False,
            'view_members': False,
            'add_member': False,
            'edit_member': False,
            'remove_member': False,
        },
        'Viewer': {
            'view_dashboard': True,
            'view_transactions': True,
            'create_transaction': False,
            'edit_transaction': False,
            'delete_transaction': False,
            'view_accounts': True,
            'create_account': False,
            'edit_account': False,
            'delete_account': False,
            'view_categories': True,
            'create_category': False,
            'edit_category': False,
            'delete_category': False,
            'view_members': False,
            'add_member': False,
            'edit_member': False,
            'remove_member': False,
        },
    }

    return permissions.get(role_name, {})


# ============================================================================
# MEMBER MANAGEMENT ENDPOINTS
# ============================================================================

@workspace_bp.route('/<int:workspace_id>/members', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin')
def get_workspace_members(workspace_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Get all members of a workspace.

    Returns:
        JSON response with list of members
    """
    try:
        members = WorkspaceMember.query.filter_by(workspace_id=workspace_id).all()
        member_list = []
        for member in members:
            member_list.append({
                'id': member.id,
                'user_id': member.user.id,
                'name': member.user.name,
                'email': member.user.email,
                'role': member.role.name,
                'joined_at': member.joined_at.isoformat()
            })

        return {
            'members': member_list,
            'total': len(member_list)
        }, 200

    except Exception as e:
        return {'error': f'Gagal memuat members: {str(e)}'}, 500


@workspace_bp.route('/<int:workspace_id>/members', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin')
def add_workspace_member(workspace_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Create new user account and add as member to workspace.

    Expected JSON:
        {
            "email": "user@example.com",
            "password": "password123",
            "name": "User Name",
            "role": "Member" or "Viewer"
        }

    Returns:
        JSON response with created user and membership info
    """
    try:
        from app import bcrypt

        data = request.get_json()

        if not data or not all(k in data for k in ['email', 'password', 'name', 'role']):
            return {'error': 'Email, password, name, dan role harus diisi'}, 400

        email = data['email'].lower().strip()
        password = data['password']
        name = data['name'].strip()
        role_name = data['role']

        # Validate password
        if len(password) < 6:
            return {'error': 'Password minimal 6 karakter'}, 400

        # Validate role (Admin can only add Member or Viewer)
        if role_name not in ['Member', 'Viewer']:
            return {'error': 'Role hanya bisa Member atau Viewer'}, 400

        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            # Check if already a member of this workspace
            existing_member = WorkspaceMember.query.filter_by(
                user_id=existing_user.id,
                workspace_id=workspace_id
            ).first()

            if existing_member:
                return {'error': f'User {email} sudah menjadi member workspace ini'}, 400

            # User exists but not in this workspace - add as member
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name)
                db.session.add(role)
                db.session.flush()

            membership = WorkspaceMember(
                user_id=existing_user.id,
                workspace_id=workspace_id,
                role_id=role.id
            )
            db.session.add(membership)
            db.session.commit()

            return {
                'message': f'{existing_user.name} berhasil ditambahkan sebagai {role_name}',
                'member': {
                    'id': membership.id,
                    'user_id': existing_user.id,
                    'name': existing_user.name,
                    'email': existing_user.email,
                    'role': role_name,
                    'status': 'active',
                    'joined_at': membership.joined_at.isoformat()
                }
            }, 201

        # Create new user
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        new_user = User(
            email=email,
            hashed_password=hashed_password,
            name=name,
            is_owner=False
        )
        db.session.add(new_user)
        db.session.flush()

        # Get role
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name)
            db.session.add(role)
            db.session.flush()

        # Add as member to workspace
        membership = WorkspaceMember(
            user_id=new_user.id,
            workspace_id=workspace_id,
            role_id=role.id
        )
        db.session.add(membership)
        db.session.commit()

        return {
            'message': f'Akun {name} berhasil dibuat dan ditambahkan sebagai {role_name}',
            'member': {
                'id': membership.id,
                'user_id': new_user.id,
                'name': new_user.name,
                'email': new_user.email,
                'role': role_name,
                'status': 'active',
                'joined_at': membership.joined_at.isoformat()
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal membuat akun: {str(e)}'}, 500
@workspace_bp.route('/<int:workspace_id>/members/<int:member_id>', methods=['PUT'])
@jwt_required()
@require_role('Owner', 'Admin')
def update_member_role(workspace_id: int, member_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Update member's role in workspace.

    Expected JSON:
        {
            "role": "Member" or "Viewer"
        }

    Returns:
        JSON response with updated member info
    """
    try:
        data = request.get_json()

        if not data or 'role' not in data:
            return {'error': 'Role harus diisi'}, 400

        role_name = data['role']

        # Validate role
        if role_name not in ['Member', 'Viewer']:
            return {'error': 'Role hanya bisa Member atau Viewer'}, 400

        # Get membership
        membership = WorkspaceMember.query.filter_by(
            id=member_id,
            workspace_id=workspace_id
        ).first()

        if not membership:
            return {'error': 'Member tidak ditemukan'}, 404

        # Prevent changing Admin role
        if membership.role.name == 'Admin':
            return {'error': 'Tidak bisa mengubah role Admin'}, 403

        # Get new role
        new_role = Role.query.filter_by(name=role_name).first()
        if not new_role:
            new_role = Role(name=role_name)
            db.session.add(new_role)
            db.session.flush()

        # Update role
        membership.role_id = new_role.id
        db.session.commit()

        return {
            'message': f'Role {membership.user.name} berhasil diubah menjadi {role_name}',
            'member': {
                'id': membership.id,
                'user_id': membership.user.id,
                'name': membership.user.name,
                'email': membership.user.email,
                'role': role_name,
                'joined_at': membership.joined_at.isoformat()
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal mengubah role: {str(e)}'}, 500


@workspace_bp.route('/<int:workspace_id>/members/<int:member_id>', methods=['DELETE'])
@jwt_required()
@require_role('Owner', 'Admin')
def remove_workspace_member(workspace_id: int, member_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Remove a member from workspace.

    Returns:
        JSON response confirming removal
    """
    try:
        # Get membership
        membership = WorkspaceMember.query.filter_by(
            id=member_id,
            workspace_id=workspace_id
        ).first()

        if not membership:
            return {'error': 'Member tidak ditemukan'}, 404

        # Prevent removing Admin
        if membership.role.name == 'Admin':
            return {'error': 'Tidak bisa menghapus Admin workspace'}, 403

        member_name = membership.user.name

        # Delete membership
        db.session.delete(membership)
        db.session.commit()

        return {
            'message': f'{member_name} berhasil dihapus dari workspace'
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menghapus member: {str(e)}'}, 500



