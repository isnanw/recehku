"""Investment routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Investment, WorkspaceMember, Transaction, Category, Account, GoldPriceSetting
from app.decorators import require_role
from datetime import datetime, date
from decimal import Decimal
from typing import Tuple, Dict, Any
import requests
import pytz

investment_bp = Blueprint('investment', __name__)

# Timezone Indonesia Barat (WIB)
WIB = pytz.timezone('Asia/Jakarta')

def get_wib_now():
    """Get current datetime in WIB timezone."""
    return datetime.now(WIB)


def formatCurrency(amount: float) -> str:
    """Format number as Indonesian Rupiah."""
    return f"Rp {amount:,.0f}".replace(',', '.')


def check_workspace_access(user_id: int, workspace_id: int) -> bool:
    """Check if user has access to workspace."""
    from app.models import User

    # Check if user is Owner (Superadmin)
    user = User.query.get(user_id)
    if user and user.is_owner:
        return True

    # Check normal membership
    membership = WorkspaceMember.query.filter_by(
        user_id=user_id,
        workspace_id=workspace_id
    ).first()
    return membership is not None


@investment_bp.route('', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_investments() -> Tuple[Dict[str, Any], int]:
    """
    Get all investments for a workspace.

    Query params:
        workspace_id: int (required)

    Returns:
        JSON response with list of investments
    """
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        investments = Investment.query.filter_by(workspace_id=workspace_id).order_by(Investment.purchase_date.desc()).all()

        return {
            'investments': [{
                'id': inv.id,
                'name': inv.name,
                'type': inv.type,
                'gold_type': inv.gold_type,
                'weight': float(inv.weight) if inv.weight else None,
                'account_id': inv.account_id,
                'account': {
                    'id': inv.account.id,
                    'name': inv.account.name,
                } if inv.account else None,
                'quantity': float(inv.quantity),
                'buy_price': float(inv.buy_price),
                'current_price': float(inv.current_price) if inv.current_price else None,
                'purchase_date': inv.purchase_date.isoformat(),
                'notes': inv.notes,
                'total_buy_value': float(inv.total_buy_value),
                'total_current_value': float(inv.total_current_value) if inv.total_current_value else None,
                'profit_loss': float(inv.profit_loss) if inv.profit_loss else None,
                'profit_loss_percentage': float(inv.profit_loss_percentage) if inv.profit_loss_percentage else None,
            } for inv in investments]
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil data investasi: {str(e)}'}, 500


@investment_bp.route('', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member')
def create_investment() -> Tuple[Dict[str, Any], int]:
    """
    Create a new investment.

    Request body:
        workspace_id: int (required)
        account_id: int (optional)
        name: str (required)
        type: str (required) - GOLD, STOCK, CRYPTO, etc
        quantity: float (required)
        buy_price: float (required)
        purchase_date: str (required) - YYYY-MM-DD
        notes: str (optional)

    Returns:
        JSON response with created investment
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        workspace_id = data.get('workspace_id')
        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        # Validate required fields
        required_fields = ['name', 'gold_type', 'weight', 'buy_price', 'purchase_date']
        for field in required_fields:
            if field not in data:
                return {'error': f'{field} harus diisi'}, 400

        # Parse purchase date
        try:
            purchase_date = datetime.strptime(data['purchase_date'], '%Y-%m-%d').date()
        except ValueError:
            return {'error': 'Format tanggal tidak valid (gunakan YYYY-MM-DD)'}, 400

        # Calculate total value
        weight = Decimal(str(data['weight']))
        buy_price = Decimal(str(data['buy_price']))
        total_value = weight * buy_price

        # Create investment
        investment = Investment(
            workspace_id=workspace_id,
            account_id=data.get('account_id'),
            name=data['name'],
            type='GOLD',  # Fixed to GOLD only
            gold_type=data['gold_type'],
            weight=weight,
            quantity=weight,  # Keep quantity same as weight for compatibility
            buy_price=buy_price,
            purchase_date=purchase_date,
            notes=data.get('notes'),
            created_at=get_wib_now(),
            updated_at=get_wib_now()
        )

        db.session.add(investment)
        db.session.flush()  # Get investment.id without committing

        # Create expense transaction if account is specified
        transaction = None
        if data.get('account_id'):
            # Find or create "Investasi Emas" category
            category = Category.query.filter_by(
                workspace_id=workspace_id,
                name='Investasi Emas',
                type='EXPENSE'
            ).first()

            if not category:
                category = Category(
                    workspace_id=workspace_id,
                    name='Investasi Emas',
                    type='EXPENSE',
                    parent_id=None,
                    created_at=get_wib_now()
                )
                db.session.add(category)
                db.session.flush()

            # Create transaction
            transaction = Transaction(
                workspace_id=workspace_id,
                account_id=data['account_id'],
                category_id=category.id,
                type='EXPENSE',
                amount=total_value,
                transaction_date=purchase_date,
                description=f"Pembelian {data['name']} - {weight}g @ {formatCurrency(float(buy_price))}/g",
                created_at=get_wib_now()
            )
            db.session.add(transaction)
            db.session.flush()

            # Link transaction to investment
            investment.transaction_id = transaction.id

        db.session.commit()

        return {
            'message': 'Investasi berhasil ditambahkan',
            'investment': {
                'id': investment.id,
                'name': investment.name,
                'type': investment.type,
                'quantity': float(investment.quantity),
                'buy_price': float(investment.buy_price),
                'total_buy_value': float(investment.total_buy_value),
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menambahkan investasi: {str(e)}'}, 500


@investment_bp.route('/<int:investment_id>', methods=['PUT'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', skip_workspace_check=True)
def update_investment(investment_id: int) -> Tuple[Dict[str, Any], int]:
    """Update an investment."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        investment = Investment.query.get(investment_id)
        if not investment:
            return {'error': 'Investasi tidak ditemukan'}, 404

        if not check_workspace_access(current_user_id, investment.workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        # Update fields
        if 'name' in data:
            investment.name = data['name']
        if 'gold_type' in data:
            investment.gold_type = data['gold_type']
        if 'weight' in data:
            investment.weight = Decimal(str(data['weight']))
            investment.quantity = Decimal(str(data['weight']))  # Keep in sync
        if 'account_id' in data:
            investment.account_id = data['account_id']
        if 'buy_price' in data:
            investment.buy_price = Decimal(str(data['buy_price']))
        if 'purchase_date' in data:
            investment.purchase_date = datetime.strptime(data['purchase_date'], '%Y-%m-%d').date()
        if 'notes' in data:
            investment.notes = data['notes']

        investment.updated_at = get_wib_now()
        db.session.commit()

        return {'message': 'Investasi berhasil diperbarui'}, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui investasi: {str(e)}'}, 500


@investment_bp.route('/<int:investment_id>', methods=['DELETE'])
@jwt_required()
@require_role('Owner', 'Admin', skip_workspace_check=True)
def delete_investment(investment_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete an investment."""
    try:
        current_user_id = int(get_jwt_identity())

        investment = Investment.query.get(investment_id)
        if not investment:
            return {'error': 'Investasi tidak ditemukan'}, 404

        if not check_workspace_access(current_user_id, investment.workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        # Delete linked transaction if exists
        if investment.transaction_id:
            transaction = Transaction.query.get(investment.transaction_id)
            if transaction:
                db.session.delete(transaction)

        db.session.delete(investment)
        db.session.commit()

        return {'message': 'Investasi dan transaksi terkait berhasil dihapus'}, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menghapus investasi: {str(e)}'}, 500


@investment_bp.route('/gold-price', methods=['GET'])
@jwt_required()
def get_gold_price() -> Tuple[Dict[str, Any], int]:
    """
    Get current gold prices for different brands/types.
    Prioritizes workspace-specific settings over default prices.

    Query params:
        workspace_id: int (optional) - to get workspace-specific prices

    Returns:
        JSON response with gold prices per brand
    """
    try:
        workspace_id = request.args.get('workspace_id', type=int)
        gold_prices = {}

        # Priority 1: Check workspace-specific gold price settings
        if workspace_id:
            price_settings = GoldPriceSetting.query.filter_by(workspace_id=workspace_id).all()

            if price_settings:
                for setting in price_settings:
                    gold_prices[setting.gold_type] = {
                        'name': setting.gold_type.title(),
                        'buyback': float(setting.buyback_price),
                        'sell': float(setting.buy_price),
                        'last_update': setting.updated_at.isoformat(),
                        'source': 'Workspace Settings',
                        'source_link': setting.source_link
                    }

        # Priority 2: If no workspace settings, use default manual prices
        if not gold_prices:
            gold_prices = {
                'ANTAM': {
                    'name': 'Antam',
                    'buyback': 1050000,
                    'sell': 1100000,
                    'last_update': get_wib_now().isoformat(),
                    'source': 'Default Price'
                },
                'GALERI24': {
                    'name': 'Galeri24',
                    'buyback': 1045000,
                    'sell': 1095000,
                    'last_update': get_wib_now().isoformat(),
                    'source': 'Default Price'
                },
                'UBS': {
                    'name': 'UBS',
                    'buyback': 1048000,
                    'sell': 1098000,
                    'last_update': get_wib_now().isoformat(),
                    'source': 'Default Price'
                },
            }

        return {'prices': gold_prices}, 200

    except Exception as e:
        return {'error': f'Gagal mengambil harga emas: {str(e)}'}, 500


@investment_bp.route('/gold-price/settings', methods=['POST'])
@jwt_required()
@require_role('Owner')
def set_gold_price() -> Tuple[Dict[str, Any], int]:
    """
    Set or update gold price for a specific type in workspace.
    Only Owner can set prices.

    Request body:
        workspace_id: int (required)
        gold_type: str (required) - ANTAM, GALERI24, or UBS
        buy_price: float (required) - Harga jual (ke customer)
        buyback_price: float (required) - Harga buyback (beli kembali)

    Returns:
        JSON response with success message
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        workspace_id = data.get('workspace_id')
        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        # Validate required fields
        required_fields = ['gold_type', 'buy_price', 'buyback_price']
        for field in required_fields:
            if field not in data:
                return {'error': f'{field} harus diisi'}, 400

        # Validate gold type
        valid_types = ['ANTAM', 'GALERI24', 'UBS']
        if data['gold_type'] not in valid_types:
            return {'error': f'Jenis emas harus salah satu dari: {", ".join(valid_types)}'}, 400

        # Check if setting already exists
        setting = GoldPriceSetting.query.filter_by(
            workspace_id=workspace_id,
            gold_type=data['gold_type']
        ).first()

        if setting:
            # Update existing setting
            setting.buy_price = Decimal(str(data['buy_price']))
            setting.buyback_price = Decimal(str(data['buyback_price']))
            setting.source_link = data.get('source_link')
            setting.updated_by = current_user_id
            setting.updated_at = get_wib_now()
            message = f'Harga {data["gold_type"]} berhasil diperbarui'
        else:
            # Create new setting
            setting = GoldPriceSetting(
                workspace_id=workspace_id,
                gold_type=data['gold_type'],
                buy_price=Decimal(str(data['buy_price'])),
                buyback_price=Decimal(str(data['buyback_price'])),
                source_link=data.get('source_link'),
                updated_by=current_user_id,
                created_at=get_wib_now(),
                updated_at=get_wib_now()
            )
            db.session.add(setting)
            message = f'Harga {data["gold_type"]} berhasil ditambahkan'

        db.session.commit()

        return {
            'message': message,
            'setting': {
                'gold_type': setting.gold_type,
                'buy_price': float(setting.buy_price),
                'buyback_price': float(setting.buyback_price),
                'last_update': setting.updated_at.isoformat()
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menyimpan harga emas: {str(e)}'}, 500


@investment_bp.route('/gold-price/settings/bulk', methods=['POST'])
@jwt_required()
@require_role('Owner')
def set_all_gold_prices() -> Tuple[Dict[str, Any], int]:
    """
    Set or update all gold prices at once.
    Only Owner can set prices.

    Request body:
        workspace_id: int (required)
        prices: array of objects with:
            - gold_type: str (required)
            - buy_price: float (required)
            - buyback_price: float (required)

    Returns:
        JSON response with success message
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        workspace_id = data.get('workspace_id')
        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        prices = data.get('prices', [])
        if not prices:
            return {'error': 'prices harus diisi'}, 400

        valid_types = ['ANTAM', 'GALERI24', 'UBS']
        updated_count = 0

        for price_data in prices:
            gold_type = price_data.get('gold_type')
            if gold_type not in valid_types:
                continue

            buy_price = price_data.get('buy_price')
            buyback_price = price_data.get('buyback_price')
            source_link = price_data.get('source_link')

            if not buy_price or not buyback_price:
                continue

            # Check if setting exists
            setting = GoldPriceSetting.query.filter_by(
                workspace_id=workspace_id,
                gold_type=gold_type
            ).first()

            if setting:
                # Update existing
                setting.buy_price = Decimal(str(buy_price))
                setting.buyback_price = Decimal(str(buyback_price))
                setting.source_link = source_link
                setting.updated_by = current_user_id
                setting.updated_at = get_wib_now()
            else:
                # Create new
                setting = GoldPriceSetting(
                    workspace_id=workspace_id,
                    gold_type=gold_type,
                    buy_price=Decimal(str(buy_price)),
                    buyback_price=Decimal(str(buyback_price)),
                    source_link=source_link,
                    updated_by=current_user_id,
                    created_at=get_wib_now(),
                    updated_at=get_wib_now()
                )
                db.session.add(setting)

            updated_count += 1

        db.session.commit()

        return {
            'message': f'{updated_count} harga emas berhasil diperbarui',
            'updated_count': updated_count
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menyimpan harga emas: {str(e)}'}, 500


@investment_bp.route('/<int:investment_id>/update-price', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member')
def update_current_price(investment_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Update current price of an investment.

    Request body:
        current_price: float (required)

    Returns:
        JSON response with updated investment
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        investment = Investment.query.get(investment_id)
        if not investment:
            return {'error': 'Investasi tidak ditemukan'}, 404

        if not check_workspace_access(current_user_id, investment.workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        if 'current_price' not in data:
            return {'error': 'current_price harus diisi'}, 400

        investment.current_price = Decimal(str(data['current_price']))
        investment.updated_at = get_wib_now()
        db.session.commit()

        return {
            'message': 'Harga berhasil diperbarui',
            'profit_loss': float(investment.profit_loss) if investment.profit_loss else None,
            'profit_loss_percentage': float(investment.profit_loss_percentage) if investment.profit_loss_percentage else None,
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui harga: {str(e)}'}, 500


@investment_bp.route('/auto-update-prices', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member')
def auto_update_all_prices() -> Tuple[Dict[str, Any], int]:
    """
    Auto-update all gold investment prices based on their gold_type.

    Request body:
        workspace_id: int (required)

    Returns:
        JSON response with update summary
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        workspace_id = data.get('workspace_id')
        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Anda tidak memiliki akses ke workspace ini'}, 403

        # Get workspace-specific gold prices
        price_settings = GoldPriceSetting.query.filter_by(workspace_id=workspace_id).all()

        if not price_settings:
            return {'error': 'Belum ada pengaturan harga emas untuk workspace ini. Silakan atur harga terlebih dahulu.'}, 400

        # Build prices dictionary from settings
        prices = {}
        for setting in price_settings:
            prices[setting.gold_type] = {
                'buyback': float(setting.buyback_price),
                'sell': float(setting.buy_price)
            }

        # Get all gold investments in workspace
        investments = Investment.query.filter_by(
            workspace_id=workspace_id,
            type='GOLD'
        ).all()

        updated_count = 0
        for investment in investments:
            if investment.gold_type and investment.gold_type in prices:
                # Use buyback price for current price
                buyback_price = prices[investment.gold_type]['buyback']
                investment.current_price = Decimal(str(buyback_price))
                investment.updated_at = get_wib_now()
                updated_count += 1

        db.session.commit()

        return {
            'message': f'{updated_count} investasi berhasil diperbarui',
            'updated_count': updated_count,
            'total_investments': len(investments),
            'timestamp': get_wib_now().isoformat()
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui harga otomatis: {str(e)}'}, 500
