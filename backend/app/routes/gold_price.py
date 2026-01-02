"""Routes for managing daily gold prices."""
from datetime import datetime, date
from typing import Dict, Any, Tuple
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc, asc
from app import db
from app.models import GoldPrice
from app.decorators import require_role

gold_price_bp = Blueprint('gold_price', __name__, url_prefix='/api/gold-prices')


@gold_price_bp.route('', methods=['GET'])
@jwt_required()
def get_gold_prices() -> Tuple[Dict[str, Any], int]:
    """
    Get all gold prices with optional filtering.

    Query Parameters:
        - start_date: Filter from this date (YYYY-MM-DD)
        - end_date: Filter until this date (YYYY-MM-DD)
        - limit: Number of records to return (default: 100)
        - order: 'asc' or 'desc' (default: 'desc' - newest first)
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', type=int, default=100)
        order = request.args.get('order', 'desc')

        query = GoldPrice.query

        # Apply date filters
        if start_date:
            query = query.filter(GoldPrice.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        if end_date:
            query = query.filter(GoldPrice.date <= datetime.strptime(end_date, '%Y-%m-%d').date())

        # Apply ordering
        if order == 'asc':
            query = query.order_by(asc(GoldPrice.date))
        else:
            query = query.order_by(desc(GoldPrice.date))

        # Apply limit
        prices = query.limit(limit).all()

        return {
            'gold_prices': [
                {
                    'id': price.id,
                    'date': price.date.isoformat(),
                    'price_per_gram': float(price.price_per_gram),
                    'source': price.source,
                    'notes': price.notes,
                    'created_at': price.created_at.isoformat() if price.created_at else None,
                    'updated_at': price.updated_at.isoformat() if price.updated_at else None
                }
                for price in prices
            ],
            'total': query.count()
        }, 200
    except Exception as e:
        return {'error': f'Gagal mengambil data harga emas: {str(e)}'}, 500


@gold_price_bp.route('/latest', methods=['GET'])
@jwt_required()
def get_latest_gold_price() -> Tuple[Dict[str, Any], int]:
    """Get the latest gold price."""
    try:
        latest_price = GoldPrice.query.order_by(desc(GoldPrice.date)).first()

        if not latest_price:
            return {'error': 'Belum ada data harga emas'}, 404

        return {
            'id': latest_price.id,
            'date': latest_price.date.isoformat(),
            'price_per_gram': float(latest_price.price_per_gram),
            'source': latest_price.source,
            'notes': latest_price.notes,
            'created_at': latest_price.created_at.isoformat() if latest_price.created_at else None,
            'updated_at': latest_price.updated_at.isoformat() if latest_price.updated_at else None
        }, 200
    except Exception as e:
        return {'error': f'Gagal mengambil harga emas terbaru: {str(e)}'}, 500


@gold_price_bp.route('/date/<date_str>', methods=['GET'])
@jwt_required()
def get_gold_price_by_date(date_str: str) -> Tuple[Dict[str, Any], int]:
    """Get gold price for a specific date."""
    try:
        price_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        price = GoldPrice.query.filter_by(date=price_date).first()

        if not price:
            return {'error': f'Tidak ada data harga emas untuk tanggal {date_str}'}, 404

        return {
            'id': price.id,
            'date': price.date.isoformat(),
            'price_per_gram': float(price.price_per_gram),
            'source': price.source,
            'notes': price.notes,
            'created_at': price.created_at.isoformat() if price.created_at else None,
            'updated_at': price.updated_at.isoformat() if price.updated_at else None
        }, 200
    except ValueError:
        return {'error': 'Format tanggal tidak valid. Gunakan YYYY-MM-DD'}, 400
    except Exception as e:
        return {'error': f'Gagal mengambil harga emas: {str(e)}'}, 500


@gold_price_bp.route('', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin')
def create_gold_price() -> Tuple[Dict[str, Any], int]:
    """
    Create a new gold price entry.

    Expected JSON:
        {
            "date": "2026-01-02",
            "price_per_gram": 1250000,
            "source": "Manual",
            "notes": "Optional notes"
        }
    """
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('date'):
            return {'error': 'Tanggal harus diisi'}, 400
        if not data.get('price_per_gram'):
            return {'error': 'Harga per gram harus diisi'}, 400

        # Parse date
        try:
            price_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return {'error': 'Format tanggal tidak valid. Gunakan YYYY-MM-DD'}, 400

        # Check if price already exists for this date
        existing_price = GoldPrice.query.filter_by(date=price_date).first()
        if existing_price:
            return {'error': f'Harga emas untuk tanggal {data["date"]} sudah ada'}, 400

        # Create new gold price
        new_price = GoldPrice(
            date=price_date,
            price_per_gram=data['price_per_gram'],
            source=data.get('source', 'Manual'),
            notes=data.get('notes')
        )

        db.session.add(new_price)
        db.session.commit()

        return {
            'message': 'Harga emas berhasil ditambahkan',
            'gold_price': {
                'id': new_price.id,
                'date': new_price.date.isoformat(),
                'price_per_gram': float(new_price.price_per_gram),
                'source': new_price.source,
                'notes': new_price.notes
            }
        }, 201
    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menambahkan harga emas: {str(e)}'}, 500


@gold_price_bp.route('/<int:price_id>', methods=['PUT'])
@jwt_required()
@require_role('Owner', 'Admin')
def update_gold_price(price_id: int) -> Tuple[Dict[str, Any], int]:
    """
    Update an existing gold price.

    Expected JSON:
        {
            "price_per_gram": 1260000,
            "source": "Updated source",
            "notes": "Updated notes"
        }
    """
    try:
        price = GoldPrice.query.get(price_id)
        if not price:
            return {'error': 'Harga emas tidak ditemukan'}, 404

        data = request.get_json()

        # Update fields
        if 'price_per_gram' in data:
            price.price_per_gram = data['price_per_gram']
        if 'source' in data:
            price.source = data['source']
        if 'notes' in data:
            price.notes = data['notes']

        price.updated_at = datetime.utcnow()

        db.session.commit()

        return {
            'message': 'Harga emas berhasil diperbarui',
            'gold_price': {
                'id': price.id,
                'date': price.date.isoformat(),
                'price_per_gram': float(price.price_per_gram),
                'source': price.source,
                'notes': price.notes
            }
        }, 200
    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal memperbarui harga emas: {str(e)}'}, 500


@gold_price_bp.route('/<int:price_id>', methods=['DELETE'])
@jwt_required()
@require_role('Owner', 'Admin')
def delete_gold_price(price_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete a gold price entry."""
    try:
        price = GoldPrice.query.get(price_id)
        if not price:
            return {'error': 'Harga emas tidak ditemukan'}, 404

        db.session.delete(price)
        db.session.commit()

        return {'message': 'Harga emas berhasil dihapus'}, 200
    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menghapus harga emas: {str(e)}'}, 500


@gold_price_bp.route('/bulk', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin')
def bulk_create_gold_prices() -> Tuple[Dict[str, Any], int]:
    """
    Bulk create gold price entries.

    Expected JSON:
        {
            "prices": [
                {
                    "date": "2026-01-01",
                    "price_per_gram": 1250000,
                    "source": "Manual"
                },
                {
                    "date": "2026-01-02",
                    "price_per_gram": 1255000,
                    "source": "Manual"
                }
            ]
        }
    """
    try:
        data = request.get_json()

        if not data.get('prices') or not isinstance(data['prices'], list):
            return {'error': 'Data prices harus berupa array'}, 400

        created_count = 0
        skipped_count = 0
        errors = []

        for price_data in data['prices']:
            try:
                # Parse date
                price_date = datetime.strptime(price_data['date'], '%Y-%m-%d').date()

                # Check if exists
                if GoldPrice.query.filter_by(date=price_date).first():
                    skipped_count += 1
                    continue

                # Create price
                new_price = GoldPrice(
                    date=price_date,
                    price_per_gram=price_data['price_per_gram'],
                    source=price_data.get('source', 'Manual'),
                    notes=price_data.get('notes')
                )
                db.session.add(new_price)
                created_count += 1

            except Exception as e:
                errors.append(f"Error on date {price_data.get('date')}: {str(e)}")

        db.session.commit()

        return {
            'message': f'Berhasil menambahkan {created_count} harga emas',
            'created': created_count,
            'skipped': skipped_count,
            'errors': errors
        }, 201
    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menambahkan harga emas: {str(e)}'}, 500
