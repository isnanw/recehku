"""Account routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Account, WorkspaceMember, Transaction
from app.decorators import require_role, get_user_role_in_workspace
from sqlalchemy import func
from decimal import Decimal
from typing import Tuple, Dict, Any

account_bp = Blueprint('account', __name__)


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


@account_bp.route('', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_accounts() -> Tuple[Dict[str, Any], int]:
    """
    Get all accounts for a workspace.

    Query params:
        workspace_id: int (required)

    Returns:
        JSON response with list of accounts
    """
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        # Check access
        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        accounts = Account.query.filter_by(workspace_id=workspace_id).all()

        account_list = []
        for account in accounts:
            # Calculate current balance
            income = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == 'INCOME'
            ).scalar() or Decimal('0')

            expense = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == 'EXPENSE'
            ).scalar() or Decimal('0')

            transfer_out = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == 'TRANSFER'
            ).scalar() or Decimal('0')

            transfer_in = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.transfer_to_account_id == account.id,
                Transaction.type == 'TRANSFER'
            ).scalar() or Decimal('0')

            # Include transfers into income/expense totals so sums reconcile:
            # total_income = income (INCOME) + transfer_in (TRANSFER received)
            # total_expense = expense (EXPENSE) + transfer_out (TRANSFER sent)
            total_income = income + transfer_in
            total_expense = expense + transfer_out

            current_balance = account.initial_balance + total_income - total_expense

            # Count transactions using this account
            transaction_count = Transaction.query.filter(
                (Transaction.account_id == account.id) |
                (Transaction.transfer_to_account_id == account.id)
            ).count()

            account_list.append({
                'id': account.id,
                'name': account.name,
                'type': account.type,
                'initial_balance': float(account.initial_balance),
                'current_balance': float(current_balance),
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'total_transfer_in': float(transfer_in),
                'total_transfer_out': float(transfer_out),
                'transaction_count': transaction_count,
                'created_at': account.created_at.isoformat()
            })

        return {'accounts': account_list}, 200

    except Exception as e:
        return {'error': f'Gagal mengambil akun: {str(e)}'}, 500


@account_bp.route('', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin')
def create_account() -> Tuple[Dict[str, Any], int]:
    """
    Create a new account.

    Expected JSON:
        {
            "workspace_id": 1,
            "name": "BCA",
            "type": "Bank",
            "initial_balance": 1000000
        }

    Returns:
        JSON response with created account
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

        # Create account
        account = Account(
            workspace_id=workspace_id,
            name=data['name'],
            type=data['type'],
            initial_balance=Decimal(str(data.get('initial_balance', 0)))
        )
        db.session.add(account)
        db.session.commit()

        return {
            'message': 'Akun berhasil dibuat',
            'account': {
                'id': account.id,
                'name': account.name,
                'type': account.type,
                'initial_balance': float(account.initial_balance),
                'current_balance': float(account.initial_balance)
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal membuat akun: {str(e)}'}, 500


@account_bp.route('/<int:account_id>', methods=['GET'])
@jwt_required()
def get_account(account_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Get account details.

    Returns:
        JSON response with account details
    """
    try:
        current_user_id = int(get_jwt_identity())

        account = Account.query.get(account_id)
        if not account:
            return {'error': 'Akun tidak ditemukan'}, 404

        # Check access
        if not check_workspace_access(current_user_id, account.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Calculate current balance
        income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.account_id == account.id,
            Transaction.type == 'INCOME'
        ).scalar() or Decimal('0')

        expense = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.account_id == account.id,
            Transaction.type == 'EXPENSE'
        ).scalar() or Decimal('0')

        transfer_out = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.account_id == account.id,
            Transaction.type == 'TRANSFER'
        ).scalar() or Decimal('0')

        transfer_in = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.transfer_to_account_id == account.id,
            Transaction.type == 'TRANSFER'
        ).scalar() or Decimal('0')

        # Include transfers into income/expense totals so sums reconcile
        total_income = income + transfer_in
        total_expense = expense + transfer_out

        current_balance = account.initial_balance + total_income - total_expense

        return {
            'account': {
                'id': account.id,
                'name': account.name,
                'type': account.type,
                'initial_balance': float(account.initial_balance),
                'current_balance': float(current_balance),
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'created_at': account.created_at.isoformat()
            }
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil akun: {str(e)}'}, 500


@account_bp.route('/<int:account_id>', methods=['PUT'])
@jwt_required()
@require_role('Owner', 'Admin')
def update_account(account_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Update account details.

    Expected JSON:
        {
            "name": "Updated Name",
            "type": "Cash",
            "initial_balance": 2000000
        }

    Returns:
        JSON response with updated account
    """
    try:
        current_user_id = int(get_jwt_identity())

        account = Account.query.get(account_id)
        if not account:
            return {'error': 'Akun tidak ditemukan'}, 404

        # Check access
        if not check_workspace_access(current_user_id, account.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        data = request.get_json()
        if not data:
            return {'error': 'Tidak ada data yang diberikan'}, 400

        # Update fields
        if 'name' in data:
            account.name = data['name']
        if 'type' in data:
            account.type = data['type']
        if 'initial_balance' in data:
            account.initial_balance = Decimal(str(data['initial_balance']))

        db.session.commit()

        return {
            'message': 'Akun berhasil diperbarui',
            'account': {
                'id': account.id,
                'name': account.name,
                'type': account.type,
                'initial_balance': float(account.initial_balance)
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui akun: {str(e)}'}, 500


@account_bp.route('/<int:account_id>', methods=['DELETE'])
@jwt_required()
@require_role('Owner', 'Admin', skip_workspace_check=True)
def delete_account(account_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Delete account.

    Returns:
        JSON response confirming deletion
    """
    try:
        current_user_id = int(get_jwt_identity())

        account = Account.query.get(account_id)
        if not account:
            return {'error': 'Akun tidak ditemukan'}, 404

        # Check access
        if not check_workspace_access(current_user_id, account.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Check if account is used in any transactions
        transaction_count = Transaction.query.filter(
            (Transaction.account_id == account_id) |
            (Transaction.transfer_to_account_id == account_id)
        ).count()

        if transaction_count > 0:
            return {
                'error': f'Akun tidak dapat dihapus karena sudah digunakan dalam {transaction_count} transaksi',
                'in_use': True,
                'transaction_count': transaction_count
            }, 400

        db.session.delete(account)
        db.session.commit()

        return {'message': 'Akun berhasil dihapus'}, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menghapus akun: {str(e)}'}, 500


@account_bp.route('/<int:account_id>/merge', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin')
def merge_accounts(account_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Merge source account into target account.
    All transactions from source account will be moved to target account,
    and source account will be deleted.

    Path params:
        account_id: int (source account id)

    Request body:
        target_account_id: int (required) - Account to merge into
        workspace_id: int (required)

    Returns:
        JSON response with success message
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        target_account_id = data.get('target_account_id')
        workspace_id = data.get('workspace_id')

        if not target_account_id or not workspace_id:
            return {'error': 'target_account_id dan workspace_id harus diisi'}, 400

        if account_id == target_account_id:
            return {'error': 'Tidak dapat menggabungkan akun dengan dirinya sendiri'}, 400

        # Check workspace access
        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        # Get source account
        source_account = Account.query.filter_by(
            id=account_id,
            workspace_id=workspace_id
        ).first()

        if not source_account:
            return {'error': 'Akun sumber tidak ditemukan'}, 404

        # Get target account
        target_account = Account.query.filter_by(
            id=target_account_id,
            workspace_id=workspace_id
        ).first()

        if not target_account:
            return {'error': 'Akun tujuan tidak ditemukan'}, 404

        # Move all transactions from source to target
        # Update transactions where source_account is the main account
        Transaction.query.filter_by(account_id=account_id).update({
            'account_id': target_account_id
        })

        # Update transactions where source_account is the transfer destination
        Transaction.query.filter_by(transfer_to_account_id=account_id).update({
            'transfer_to_account_id': target_account_id
        })

        # Recalculate target account balance
        income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.account_id == target_account_id,
            Transaction.type == 'INCOME'
        ).scalar() or Decimal('0')

        expense = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.account_id == target_account_id,
            Transaction.type == 'EXPENSE'
        ).scalar() or Decimal('0')

        transfer_out = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.account_id == target_account_id,
            Transaction.type == 'TRANSFER'
        ).scalar() or Decimal('0')

        transfer_in = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.transfer_to_account_id == target_account_id,
            Transaction.type == 'TRANSFER'
        ).scalar() or Decimal('0')

        new_balance = target_account.initial_balance + income - expense - transfer_out + transfer_in
        target_account.current_balance = new_balance

        # Delete source account
        db.session.delete(source_account)
        db.session.commit()

        return {
            'message': f'Akun "{source_account.name}" berhasil digabungkan ke "{target_account.name}"',
            'target_account': {
                'id': target_account.id,
                'name': target_account.name,
                'current_balance': float(target_account.current_balance)
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menggabungkan akun: {str(e)}'}, 500
