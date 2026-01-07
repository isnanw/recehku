"""Transaction routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Transaction, WorkspaceMember, Account, Category
from app.decorators import require_role
from sqlalchemy import func, and_, or_, extract
from datetime import datetime, date
from decimal import Decimal
from typing import Tuple, Dict, Any, Optional

transaction_bp = Blueprint('transaction', __name__)


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


@transaction_bp.route('', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_transactions() -> Tuple[Dict[str, Any], int]:
    """
    Get all transactions for a workspace.

    Query params:
        workspace_id: int (required)
        start_date: str (optional) - YYYY-MM-DD
        end_date: str (optional) - YYYY-MM-DD
        type: str (optional) - INCOME, EXPENSE, TRANSFER
        account_id: int (optional)
        category_id: int (optional)

    Returns:
        JSON response with list of transactions
    """
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        # Check access
        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Build query
        query = Transaction.query.filter_by(workspace_id=workspace_id)

        # Apply filters
        if request.args.get('start_date'):
            start_date = datetime.strptime(request.args.get('start_date'), '%Y-%m-%d').date()
            query = query.filter(Transaction.transaction_date >= start_date)

        if request.args.get('end_date'):
            end_date = datetime.strptime(request.args.get('end_date'), '%Y-%m-%d').date()
            query = query.filter(Transaction.transaction_date <= end_date)

        if request.args.get('type'):
            query = query.filter_by(type=request.args.get('type'))

        if request.args.get('account_id'):
            account_id = request.args.get('account_id', type=int)
            query = query.filter(
                or_(
                    Transaction.account_id == account_id,
                    Transaction.transfer_to_account_id == account_id
                )
            )

        if request.args.get('category_id'):
            category_id = request.args.get('category_id', type=int)
            query = query.filter_by(category_id=category_id)

        # Pagination support
        page = request.args.get('page', type=int, default=1)
        per_page = request.args.get('per_page', type=int, default=200)

        pagination = query.order_by(Transaction.transaction_date.desc()).paginate(page=page, per_page=per_page, error_out=False)
        transactions = pagination.items

        transaction_list = []
        for txn in transactions:
            txn_data = {
                'id': txn.id,
                'type': txn.type,
                'amount': float(txn.amount),
                'transaction_date': txn.transaction_date.isoformat(),
                'description': txn.description,
                'created_at': txn.created_at.isoformat(),
                'account': {
                    'id': txn.account.id,
                    'name': txn.account.name
                } if txn.account else None
            }

            if txn.transfer_to_account_id:
                txn_data['transfer_to_account'] = {
                    'id': txn.transfer_to_account.id,
                    'name': txn.transfer_to_account.name
                }

            if txn.category_id:
                txn_data['category'] = {
                    'id': txn.category.id,
                    'name': txn.category.name,
                    'type': txn.category.type
                }

            transaction_list.append(txn_data)

        return {
            'transactions': transaction_list,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages,
            'total': pagination.total
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil transaksi: {str(e)}'}, 500


@transaction_bp.route('', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member')
def create_transaction() -> Tuple[Dict[str, Any], int]:
    """
    Create a new transaction.

    Expected JSON:
        For INCOME/EXPENSE:
        {
            "workspace_id": 1,
            "account_id": 1,
            "category_id": 1,
            "type": "EXPENSE",
            "amount": 50000,
            "transaction_date": "2024-01-15",
            "description": "Lunch"
        }

        For TRANSFER:
        {
            "workspace_id": 1,
            "account_id": 1,
            "transfer_to_account_id": 2,
            "type": "TRANSFER",
            "amount": 100000,
            "transaction_date": "2024-01-15",
            "description": "Transfer to savings"
        }

    Returns:
        JSON response with created transaction
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Validate input
        required_fields = ['workspace_id', 'account_id', 'type', 'amount', 'transaction_date']
        if not data or not all(k in data for k in required_fields):
            return {'error': 'Data yang diperlukan tidak lengkap'}, 400

        workspace_id = data['workspace_id']

        # Check access
        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Validate type
        if data['type'] not in ['INCOME', 'EXPENSE', 'TRANSFER']:
            return {'error': 'Type must be INCOME, EXPENSE, or TRANSFER'}, 400

        # Validate amount
        if float(data['amount']) <= 0:
            return {'error': 'Amount must be positive'}, 400

        # Validate TRANSFER specific requirements
        if data['type'] == 'TRANSFER':
            if not data.get('transfer_to_account_id'):
                return {'error': 'transfer_to_account_id is required for TRANSFER'}, 400
            if data['account_id'] == data['transfer_to_account_id']:
                return {'error': 'Cannot transfer to the same account'}, 400
        else:
            # INCOME/EXPENSE require category
            if not data.get('category_id'):
                return {'error': 'category_id is required for INCOME and EXPENSE'}, 400

        # Verify account belongs to workspace
        account = Account.query.get(data['account_id'])
        if not account or account.workspace_id != workspace_id:
            return {'error': 'Invalid account'}, 400

        # Verify transfer account if applicable
        if data.get('transfer_to_account_id'):
            transfer_account = Account.query.get(data['transfer_to_account_id'])
            if not transfer_account or transfer_account.workspace_id != workspace_id:
                return {'error': 'Invalid transfer account'}, 400

        # Verify category if applicable
        if data.get('category_id'):
            category = Category.query.get(data['category_id'])
            if not category or category.workspace_id != workspace_id:
                return {'error': 'Invalid category'}, 400

        # Parse date
        txn_date = datetime.strptime(data['transaction_date'], '%Y-%m-%d').date()

        # Create transaction
        transaction = Transaction(
            workspace_id=workspace_id,
            account_id=data['account_id'],
            transfer_to_account_id=data.get('transfer_to_account_id'),
            category_id=data.get('category_id'),
            type=data['type'],
            amount=Decimal(str(data['amount'])),
            transaction_date=txn_date,
            description=data.get('description', '')
        )
        db.session.add(transaction)
        db.session.commit()

        return {
            'message': 'Transaksi berhasil dibuat',
            'transaction': {
                'id': transaction.id,
                'type': transaction.type,
                'amount': float(transaction.amount),
                'transaction_date': transaction.transaction_date.isoformat(),
                'description': transaction.description
            }
        }, 201

    except ValueError as e:
        return {'error': f'Invalid date format: {str(e)}'}, 400
    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal membuat transaksi: {str(e)}'}, 500


@transaction_bp.route('/<int:transaction_id>', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer', skip_workspace_check=True)
def get_transaction(transaction_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Get transaction details.

    Returns:
        JSON response with transaction details
    """
    try:
        from app.decorators import check_workspace_permission

        current_user_id = int(get_jwt_identity())

        transaction = Transaction.query.get(transaction_id)
        if not transaction:
            return {'error': 'Transaksi tidak ditemukan'}, 404

        # Check permission
        if not check_workspace_permission(current_user_id, transaction.workspace_id, ['Owner', 'Admin', 'Member', 'Viewer']):
            return {'error': 'Akses ditolak'}, 403

        txn_data = {
            'id': transaction.id,
            'type': transaction.type,
            'amount': float(transaction.amount),
            'transaction_date': transaction.transaction_date.isoformat(),
            'description': transaction.description,
            'created_at': transaction.created_at.isoformat(),
            'account': {
                'id': transaction.account.id,
                'name': transaction.account.name
            }
        }

        if transaction.transfer_to_account_id:
            txn_data['transfer_to_account'] = {
                'id': transaction.transfer_to_account.id,
                'name': transaction.transfer_to_account.name
            }

        if transaction.category_id:
            txn_data['category'] = {
                'id': transaction.category.id,
                'name': transaction.category.name,
                'type': transaction.category.type
            }

        return {'transaction': txn_data}, 200

    except Exception as e:
        return {'error': f'Gagal mengambil transaksi: {str(e)}'}, 500


@transaction_bp.route('/<int:transaction_id>', methods=['PUT'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', skip_workspace_check=True)
def update_transaction(transaction_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Update transaction details.

    Expected JSON: Same as create_transaction

    Returns:
        JSON response with updated transaction
    """
    try:
        from app.decorators import check_workspace_permission

        current_user_id = int(get_jwt_identity())

        transaction = Transaction.query.get(transaction_id)
        if not transaction:
            return {'error': 'Transaksi tidak ditemukan'}, 404

        # Check permission
        if not check_workspace_permission(current_user_id, transaction.workspace_id, ['Owner', 'Admin', 'Member']):
            return {'error': 'Akses ditolak'}, 403

        data = request.get_json()
        if not data:
            return {'error': 'Tidak ada data yang diberikan'}, 400

        # Update fields
        if 'amount' in data:
            if float(data['amount']) <= 0:
                return {'error': 'Amount must be positive'}, 400
            transaction.amount = Decimal(str(data['amount']))

        if 'transaction_date' in data:
            transaction.transaction_date = datetime.strptime(data['transaction_date'], '%Y-%m-%d').date()

        if 'description' in data:
            transaction.description = data['description']

        # Update type if provided
        if 'type' in data:
            if data['type'] not in ['INCOME', 'EXPENSE', 'TRANSFER']:
                return {'error': 'Type must be INCOME, EXPENSE, or TRANSFER'}, 400
            transaction.type = data['type']

        if 'category_id' in data:
            # For INCOME/EXPENSE ensure category provided
            if data.get('category_id') is not None:
                transaction.category_id = data['category_id']
            else:
                transaction.category_id = None

        if 'account_id' in data:
            # Validate account exists and belongs to same workspace
            new_account = Account.query.get(data['account_id'])
            if not new_account or new_account.workspace_id != transaction.workspace_id:
                return {'error': 'Akun tidak valid'}, 400
            transaction.account_id = data['account_id']

        if 'transfer_to_account_id' in data:
            if data['transfer_to_account_id']:
                # Validate transfer account
                transfer_account = Account.query.get(data['transfer_to_account_id'])
                if not transfer_account or transfer_account.workspace_id != transaction.workspace_id:
                    return {'error': 'Akun transfer tidak valid'}, 400
                transaction.transfer_to_account_id = data['transfer_to_account_id']
            else:
                transaction.transfer_to_account_id = None

        # Additional validation: if transaction is TRANSFER, ensure transfer_to_account_id exists
        if transaction.type == 'TRANSFER' and not transaction.transfer_to_account_id:
            return {'error': 'transfer_to_account_id is required for TRANSFER'}, 400

        # If transaction type is INCOME or EXPENSE, clear transfer_to_account_id
        if transaction.type in ['INCOME', 'EXPENSE']:
            transaction.transfer_to_account_id = None

        db.session.commit()

        txn_resp = {
            'id': transaction.id,
            'type': transaction.type,
            'amount': float(transaction.amount),
            'transaction_date': transaction.transaction_date.isoformat(),
            'description': transaction.description,
            'created_at': transaction.created_at.isoformat(),
            'account': {
                'id': transaction.account.id,
                'name': transaction.account.name
            } if transaction.account else None,
            'transfer_to_account': {
                'id': transaction.transfer_to_account.id,
                'name': transaction.transfer_to_account.name
            } if transaction.transfer_to_account_id and transaction.transfer_to_account else None,
            'category': {
                'id': transaction.category.id,
                'name': transaction.category.name,
                'type': transaction.category.type
            } if transaction.category_id and transaction.category else None
        }

        return {
            'message': 'Transaksi berhasil diperbarui',
            'transaction': txn_resp
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui transaksi: {str(e)}'}, 500


@transaction_bp.route('/<int:transaction_id>', methods=['DELETE'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', skip_workspace_check=True)
def delete_transaction(transaction_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Delete transaction.

    Returns:
        JSON response confirming deletion
    """
    try:
        from app.decorators import check_workspace_permission

        current_user_id = int(get_jwt_identity())

        transaction = Transaction.query.get(transaction_id)
        if not transaction:
            return {'error': 'Transaksi tidak ditemukan'}, 404

        # Check permission dengan role yang sesuai
        if not check_workspace_permission(current_user_id, transaction.workspace_id, ['Owner', 'Admin', 'Member']):
            return {'error': 'Akses ditolak'}, 403

        db.session.delete(transaction)
        db.session.commit()

        return {'message': 'Transaksi berhasil dihapus'}, 200

    except ValueError as e:
        db.session.rollback()
        return {'error': str(e)}, 400
    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menghapus transaksi: {str(e)}'}, 500


@transaction_bp.route('/summary', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_summary() -> Tuple[Dict[str, Any], int]:
    """
    Get financial summary for a workspace.

    Query params:
        workspace_id: int (required)
        month: int (optional) - 1-12
        year: int (optional)

    Returns:
        JSON response with summary data
    """
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        # Check access
        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Get month and year (default to current)
        month = request.args.get('month', type=int) or datetime.now().month
        year = request.args.get('year', type=int) or datetime.now().year

        # Calculate total balance across all accounts
        accounts = Account.query.filter_by(workspace_id=workspace_id).all()
        total_balance = Decimal('0')

        for account in accounts:
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

            account_balance = account.initial_balance + income - expense - transfer_out + transfer_in
            total_balance += account_balance

        # Get income for the month
        income_this_month = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'INCOME',
            extract('month', Transaction.transaction_date) == month,
            extract('year', Transaction.transaction_date) == year
        ).scalar() or Decimal('0')

        # Get expenses for the month
        expense_this_month = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'EXPENSE',
            extract('month', Transaction.transaction_date) == month,
            extract('year', Transaction.transaction_date) == year
        ).scalar() or Decimal('0')

        # Get expenses by category
        expenses_by_category = db.session.query(
            Category.name,
            func.sum(Transaction.amount).label('total')
        ).join(Transaction).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'EXPENSE',
            extract('month', Transaction.transaction_date) == month,
            extract('year', Transaction.transaction_date) == year
        ).group_by(Category.name).all()

        category_data = [
            {'name': name, 'amount': float(total)}
            for name, total in expenses_by_category
        ]

        return {
            'summary': {
                'total_balance': float(total_balance),
                'income_this_month': float(income_this_month),
                'expense_this_month': float(expense_this_month),
                'expenses_by_category': category_data,
                'month': month,
                'year': year
            }
        }, 200

    except Exception as e:
        return {'error': f'Failed to get summary: {str(e)}'}, 500
