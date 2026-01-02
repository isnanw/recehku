"""Authentication routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db, bcrypt
from app.models import User, Workspace, WorkspaceMember, Role
from typing import Tuple, Dict, Any

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register() -> Tuple[Dict[str, Any], int]:
    """
    Register a new user and create their first workspace.

    Expected JSON:
        {
            "email": "user@example.com",
            "password": "password123",
            "name": "John Doe"
        }

    Returns:
        JSON response with access token and user info
    """
    try:
        data = request.get_json()

        # Validate input
        if not data or not all(k in data for k in ['email', 'password', 'name']):
            return {'error': 'Data yang diperlukan tidak lengkap'}, 400

        email = data['email'].lower().strip()
        password = data['password']
        name = data['name'].strip()

        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return {'error': 'Email sudah terdaftar'}, 400

        # Hash password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Create user
        user = User(
            email=email,
            hashed_password=hashed_password,
            name=name
        )
        db.session.add(user)
        db.session.flush()  # Get user ID

        # Create default workspace for the user
        workspace = Workspace(name=f"{name}'s Workspace")
        db.session.add(workspace)
        db.session.flush()  # Get workspace ID

        # Get or create Admin role
        admin_role = Role.query.filter_by(name='Admin').first()
        if not admin_role:
            admin_role = Role(name='Admin')
            db.session.add(admin_role)
            db.session.flush()

        # Add user as Admin of their own workspace
        workspace_member = WorkspaceMember(
            user_id=user.id,
            workspace_id=workspace.id,
            role_id=admin_role.id
        )
        db.session.add(workspace_member)

        db.session.commit()

        # Create access token
        access_token = create_access_token(identity=str(user.id))

        return {
            'message': 'Pendaftaran berhasil',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'is_owner': user.is_owner
            },
            'workspace': {
                'id': workspace.id,
                'name': workspace.name
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {'error': f'Pendaftaran gagal: {str(e)}'}, 500


@auth_bp.route('/login', methods=['POST'])
def login() -> Tuple[Dict[str, Any], int]:
    """
    Login user and return JWT token.

    Expected JSON:
        {
            "email": "user@example.com",
            "password": "password123"
        }

    Returns:
        JSON response with access token and user info
    """
    try:
        data = request.get_json()

        # Validate input
        if not data or not all(k in data for k in ['email', 'password']):
            return {'error': 'Email atau password tidak boleh kosong'}, 400

        email = data['email'].lower().strip()
        password = data['password']

        # Find user
        user = User.query.filter_by(email=email).first()

        if not user:
            return {'error': 'Email tidak ditemukan. Silakan periksa kembali email Anda.'}, 401

        if not bcrypt.check_password_hash(user.hashed_password, password):
            return {'error': 'Password salah. Silakan periksa kembali password Anda.'}, 401

        # Get user's workspaces
        workspaces = []
        for membership in user.workspace_members:
            workspaces.append({
                'id': membership.workspace.id,
                'name': membership.workspace.name,
                'role': membership.role.name
            })

        # Create access token
        access_token = create_access_token(identity=str(user.id))

        return {
            'message': 'Login berhasil',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'is_owner': user.is_owner
            },
            'workspaces': workspaces
        }, 200

    except Exception as e:
        return {'error': f'Login gagal: {str(e)}'}, 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user() -> Tuple[Dict[str, Any], int]:
    """
    Get current user information.

    Returns:
        JSON response with user info and workspaces
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return {'error': 'Pengguna tidak ditemukan'}, 404

        # Get user's workspaces
        workspaces = []

        if user.is_owner:
            # Owner (Superadmin) bisa lihat SEMUA workspace
            all_workspaces = Workspace.query.all()
            for workspace in all_workspaces:
                # Cek apakah owner punya membership di workspace ini
                membership = WorkspaceMember.query.filter_by(
                    user_id=user.id,
                    workspace_id=workspace.id
                ).first()

                # Jika punya membership, gunakan role asli, jika tidak gunakan 'Owner' (untuk akses superadmin)
                if membership:
                    role_name = membership.role.name
                else:
                    role_name = 'Owner'

                # Cari admin workspace ini untuk info
                admin_membership = WorkspaceMember.query.filter_by(
                    workspace_id=workspace.id
                ).join(Role).filter(Role.name == 'Admin').first()

                admin_name = admin_membership.user.name if admin_membership else 'Unknown'

                workspaces.append({
                    'id': workspace.id,
                    'name': workspace.name,
                    'role': role_name,
                    'admin': admin_name  # Info siapa admin workspace ini
                })
        else:
            # User biasa hanya lihat workspace yang di-join
            for membership in user.workspace_members:
                workspaces.append({
                    'id': membership.workspace.id,
                    'name': membership.workspace.name,
                    'role': membership.role.name
                })

        return {
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'is_owner': user.is_owner
            },
            'workspaces': workspaces
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil info pengguna: {str(e)}'}, 500


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile() -> Tuple[Dict[str, Any], int]:
    """
    Update user profile (name and email).

    Expected JSON:
        {
            "name": "New Name",
            "email": "newemail@example.com"
        }

    Returns:
        JSON response with updated user info
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return {'error': 'Pengguna tidak ditemukan'}, 404

        data = request.get_json()

        # Validate input
        if not data:
            return {'error': 'Data tidak boleh kosong'}, 400

        # Update name if provided
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return {'error': 'Nama tidak boleh kosong'}, 400
            user.name = name

        # Update email if provided
        if 'email' in data:
            email = data['email'].lower().strip()
            if not email:
                return {'error': 'Email tidak boleh kosong'}, 400

            # Check if email is already used by another user
            existing_user = User.query.filter_by(email=email).first()
            if existing_user and existing_user.id != user.id:
                return {'error': 'Email sudah digunakan oleh pengguna lain'}, 400

            user.email = email

        db.session.commit()

        return {
            'message': 'Profil berhasil diperbarui',
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'is_owner': user.is_owner
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui profil: {str(e)}'}, 500


@auth_bp.route('/password', methods=['PUT'])
@jwt_required()
def update_password() -> Tuple[Dict[str, Any], int]:
    """
    Update user password.

    Expected JSON:
        {
            "current_password": "oldpassword123",
            "new_password": "newpassword123"
        }

    Returns:
        JSON response with success message
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return {'error': 'Pengguna tidak ditemukan'}, 404

        data = request.get_json()

        # Validate input
        if not data or not all(k in data for k in ['current_password', 'new_password']):
            return {'error': 'Password saat ini dan password baru harus diisi'}, 400

        current_password = data['current_password']
        new_password = data['new_password']

        # Verify current password
        if not bcrypt.check_password_hash(user.hashed_password, current_password):
            return {'error': 'Password saat ini salah'}, 401

        # Validate new password
        if len(new_password) < 6:
            return {'error': 'Password baru minimal 6 karakter'}, 400

        # Update password
        user.hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        db.session.commit()

        return {
            'message': 'Password berhasil diubah'
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal mengubah password: {str(e)}'}, 500
