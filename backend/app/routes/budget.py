"""Budget planning routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, Tuple, List
from sqlalchemy import and_, func, extract
from pytz import timezone
from app import db
from app.models import BudgetPlan, BudgetAllocation, Category, Transaction, Investment
from app.decorators import require_role

budget_bp = Blueprint('budget', __name__)

# WIB timezone
WIB = timezone('Asia/Jakarta')


def get_wib_now():
    """Get current datetime in WIB timezone."""
    return datetime.now(WIB)


def check_workspace_access(user_id: int, workspace_id: int) -> bool:
    """Check if user has access to workspace."""
    from app.models import WorkspaceMember
    return WorkspaceMember.query.filter_by(
        user_id=user_id,
        workspace_id=workspace_id
    ).first() is not None


def calculate_income_for_period(workspace_id: int, period_start: date, period_end: date) -> Decimal:
    """
    Calculate total income from transactions within the budget period.

    Example: Budget period 2024-11-27 to 2024-12-29
    Income calculated from all INCOME transactions in that date range.
    This avoids double-counting salary and matches the actual budget period.
    """
    # Sum all INCOME transactions within the budget period
    total_income = db.session.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        and_(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'INCOME',
            Transaction.transaction_date >= period_start,
            Transaction.transaction_date <= period_end
        )
    ).scalar()

    return Decimal(str(total_income))


def build_hierarchical_allocations(allocations):
    """Build hierarchical allocation structure from flat list"""
    # Get all categories involved
    category_ids = [a.category_id for a in allocations]
    if not category_ids:
        return []

    categories = Category.query.filter(Category.id.in_(category_ids)).all()

    # Create mapping
    allocation_map = {a.category_id: a for a in allocations}
    category_map = {c.id: c for c in categories}

    # Find parent categories
    parent_ids = set()
    for cat in categories:
        if cat.parent_id is None:
            parent_ids.add(cat.id)
        elif cat.parent_id not in category_ids:
            # Child exists but parent not in allocations, get parent
            parent = Category.query.get(cat.parent_id)
            if parent:
                category_map[parent.id] = parent
                parent_ids.add(parent.id)

    result = []

    for parent_id in parent_ids:
        parent_cat = category_map.get(parent_id)
        if not parent_cat:
            continue

        children_allocs = [a for a in allocations if category_map.get(a.category_id) and category_map.get(a.category_id).parent_id == parent_id]

        if children_allocs:
            # Has children
            total = sum(a.allocated_amount for a in children_allocs)
            children_data = []

            for child_alloc in children_allocs:
                child_cat = category_map[child_alloc.category_id]
                children_data.append({
                    'category_id': child_cat.id,
                    'category_name': child_cat.name,
                    'allocated_amount': float(child_alloc.allocated_amount),
                    'is_system_recommended': child_alloc.is_system_recommended,
                    'notes': child_alloc.notes
                })

            result.append({
                'category_id': parent_cat.id,
                'category_name': parent_cat.name,
                'allocated_amount': float(total),
                'is_parent': True,
                'children': children_data
            })
        else:
            # No children, standalone
            if parent_id in allocation_map:
                alloc = allocation_map[parent_id]
                result.append({
                    'category_id': parent_cat.id,
                    'category_name': parent_cat.name,
                    'allocated_amount': float(alloc.allocated_amount),
                    'is_system_recommended': alloc.is_system_recommended,
                    'notes': alloc.notes,
                    'is_parent': False
                })

    return result


def build_hierarchical_realization(realization_list):
    """Build hierarchical realization structure from flat list"""
    if not realization_list:
        return []

    # Get all category IDs
    category_ids = [r['category_id'] for r in realization_list]
    categories = Category.query.filter(Category.id.in_(category_ids)).all()

    # Create mapping
    realization_map = {r['category_id']: r for r in realization_list}
    category_map = {c.id: c for c in categories}

    # Collect all parent IDs and ensure parents are in category_map
    parent_ids = set()
    for cat in categories:
        if cat.parent_id is None:
            # This is a parent category
            parent_ids.add(cat.id)
        else:
            # This is a child, ensure parent is loaded
            if cat.parent_id not in category_map:
                parent = Category.query.get(cat.parent_id)
                if parent:
                    category_map[parent.id] = parent
            parent_ids.add(cat.parent_id)

    result = []

    for parent_id in sorted(parent_ids):
        parent_cat = category_map.get(parent_id)
        if not parent_cat:
            continue

        # Find children realizations
        children_realizations = [r for r in realization_list
                                if category_map.get(r['category_id'])
                                and category_map.get(r['category_id']).parent_id == parent_id]

        if children_realizations:
            # Has children - calculate parent totals
            total_allocated = sum(r['allocated_amount'] for r in children_realizations)
            total_spent = sum(r['actual_spent'] for r in children_realizations)
            total_variance = total_spent - total_allocated
            variance_pct = (total_variance / total_allocated * 100) if total_allocated > 0 else 0

            children_data = []
            for child_real in children_realizations:
                children_data.append({
                    'category_id': child_real['category_id'],
                    'category_name': child_real['category_name'],
                    'allocated_amount': child_real['allocated_amount'],
                    'actual_spent': child_real['actual_spent'],
                    'variance': child_real['variance'],
                    'variance_percentage': child_real['variance_percentage'],
                    'status': child_real['status']
                })

            result.append({
                'category_id': parent_cat.id,
                'category_name': parent_cat.name,
                'allocated_amount': total_allocated,
                'actual_spent': total_spent,
                'variance': total_variance,
                'variance_percentage': round(variance_pct, 2),
                'status': 'over' if total_variance > 0 else 'under' if total_variance < 0 else 'on_track',
                'is_parent': True,
                'children': children_data
            })
        else:
            # No children, check if this is a standalone category in realization
            if parent_id in realization_map:
                real = realization_map[parent_id]
                result.append({
                    'category_id': real['category_id'],
                    'category_name': real['category_name'],
                    'allocated_amount': real['allocated_amount'],
                    'actual_spent': real['actual_spent'],
                    'variance': real['variance'],
                    'variance_percentage': real['variance_percentage'],
                    'status': real['status'],
                    'is_parent': False
                })

    return result


def generate_budget_recommendations(workspace_id: int, income_amount: float, period_start: date, period_end: date) -> List[Dict]:
    """
    Generate hierarchical budget allocation recommendations based on historical spending.
    Uses 50-30-20 rule as baseline:
    - 50% Needs (essential categories)
    - 30% Wants (lifestyle)
    - 20% Savings/Investment

    Returns hierarchical structure with parent categories and their children.
    """
    # Get categories for this workspace
    categories = Category.query.filter_by(workspace_id=workspace_id).all()

    if not categories:
        return []

    # Separate parent and child categories
    parent_categories = [c for c in categories if c.type == 'EXPENSE' and c.parent_id is None]
    child_categories = [c for c in categories if c.type == 'EXPENSE' and c.parent_id is not None]

    # Calculate historical spending per category (last 3 months average)
    from dateutil.relativedelta import relativedelta
    three_months_ago = period_start - relativedelta(months=3)

    historical_spending = {}
    total_historical = 0

    # Calculate for child categories (leaf nodes)
    for cat in child_categories:
        expenses = db.session.query(
            func.sum(Transaction.amount)
        ).filter(
            and_(
                Transaction.category_id == cat.id,
                Transaction.type == 'EXPENSE',
                Transaction.transaction_date >= three_months_ago,
                Transaction.transaction_date < period_start
            )
        ).scalar() or 0

        monthly_avg = float(expenses) / 3 if expenses > 0 else 0
        historical_spending[cat.id] = monthly_avg
        total_historical += monthly_avg

    # For parent categories without children, treat them as leaf nodes
    for cat in parent_categories:
        if not any(c.parent_id == cat.id for c in child_categories):
            expenses = db.session.query(
                func.sum(Transaction.amount)
            ).filter(
                and_(
                    Transaction.category_id == cat.id,
                    Transaction.type == 'EXPENSE',
                    Transaction.transaction_date >= three_months_ago,
                    Transaction.transaction_date < period_start
                )
            ).scalar() or 0

            monthly_avg = float(expenses) / 3 if expenses > 0 else 0
            historical_spending[cat.id] = monthly_avg
            total_historical += monthly_avg

    recommendations = []

    # Build hierarchical recommendations
    if total_historical == 0:
        # Use realistic budget allocation based on typical spending patterns
        # Define percentage ranges for different category types (case-insensitive matching)
        category_weights_map = {
            'makanan': 0.25,           # 25% - Food & Beverage
            'minum': 0.25,
            'food': 0.25,
            'transportasi': 0.15,      # 15% - Transportation
            'transport': 0.15,
            'tagihan': 0.15,           # 15% - Bills & Utilities
            'utilitas': 0.15,
            'kesehatan': 0.10,         # 10% - Health
            'health': 0.10,
            'pendidikan': 0.10,        # 10% - Education
            'education': 0.10,
            'hiburan': 0.08,           # 8% - Entertainment
            'entertainment': 0.08,
            'shopping': 0.07,          # 7% - Shopping
            'belanja': 0.07,
            'tabungan': 0.05,          # 5% - Savings
            'saving': 0.05,
            'investasi': 0.05,         # 5% - Investment
            'investment': 0.05,
        }

        # Count categories with children
        parents_with_children = [p for p in parent_categories if any(c.parent_id == p.id for c in child_categories)]

        if parents_with_children:
            # Calculate total weight for categories that exist
            existing_weights = {}
            total_weight = 0
            for parent in parents_with_children:
                # Match category name with weights (case-insensitive)
                weight = 0.05  # Default 5%
                parent_name_lower = parent.name.lower()
                for key, value in category_weights_map.items():
                    if key in parent_name_lower:
                        weight = value
                        break

                existing_weights[parent.id] = weight
                total_weight += weight

            # Normalize weights to ensure 100% allocation
            if total_weight > 0:
                for parent_id in existing_weights:
                    existing_weights[parent_id] = existing_weights[parent_id] / total_weight

            # Track total allocated to verify 100%
            total_allocated = 0

            # Only process parents with children (that have weights assigned)
            for parent in parents_with_children:
                children_list = [c for c in child_categories if c.parent_id == parent.id]

                # Get allocation percentage for this parent
                parent_percentage = existing_weights.get(parent.id, 0)
                parent_allocation = income_amount * parent_percentage
                total_allocated += parent_allocation

                # Distribute parent budget among children with weighted distribution
                # First child gets more (typically the most important)
                children_total_weight = sum(1.0 / (i + 1) for i in range(len(children_list)))
                children_data = []

                for idx, child in enumerate(children_list):
                    child_weight = 1.0 / (idx + 1)
                    child_allocation = parent_allocation * (child_weight / children_total_weight)

                    children_data.append({
                        'category_id': child.id,
                        'category_name': child.name,
                        'allocated_amount': int(round(child_allocation)),
                        'is_system_recommended': True
                    })

                recommendations.append({
                    'category_id': parent.id,
                    'category_name': parent.name,
                    'allocated_amount': int(round(parent_allocation)),
                    'is_system_recommended': True,
                    'is_parent': True,
                    'children': children_data
                })

            # Add parent categories without children with 0 allocation
            for parent in parent_categories:
                if parent not in parents_with_children:
                    recommendations.append({
                        'category_id': parent.id,
                        'category_name': parent.name,
                        'allocated_amount': 0,
                        'is_system_recommended': True,
                        'is_parent': False
                    })

            # Adjust last category to ensure exactly 100% allocation
            if recommendations:
                actual_total = sum(r['allocated_amount'] for r in recommendations)
                difference = int(income_amount) - actual_total
                if difference != 0:
                    # Add difference to the first category with children
                    for rec in recommendations:
                        if rec.get('is_parent') and rec.get('children'):
                            rec['allocated_amount'] += difference
                            # Also adjust first child
                            if rec['children']:
                                rec['children'][0]['allocated_amount'] += difference
                            break
    else:
        # Use historical data - normalize to 100% of income
        parents_with_children = [p for p in parent_categories if any(c.parent_id == p.id for c in child_categories)]

        for parent in parents_with_children:
            children_list = [c for c in child_categories if c.parent_id == parent.id]

            # Calculate total for children
            children_data = []
            parent_total = 0

            for child in children_list:
                if child.id in historical_spending:
                    historical_pct = historical_spending[child.id] / total_historical if total_historical > 0 else 0
                    recommended_amount = income_amount * historical_pct

                    children_data.append({
                        'category_id': child.id,
                        'category_name': child.name,
                        'allocated_amount': int(round(recommended_amount)),
                        'is_system_recommended': True
                    })
                    parent_total += recommended_amount
                else:
                    # Child has no historical data, allocate 0
                    children_data.append({
                        'category_id': child.id,
                        'category_name': child.name,
                        'allocated_amount': 0,
                        'is_system_recommended': True
                    })

            if children_data:
                recommendations.append({
                    'category_id': parent.id,
                    'category_name': parent.name,
                    'allocated_amount': int(round(parent_total)),
                    'is_system_recommended': True,
                    'is_parent': True,
                    'children': children_data
                })

        # Add parent categories without children with 0 allocation
        for parent in parent_categories:
            if parent not in parents_with_children:
                recommendations.append({
                    'category_id': parent.id,
                    'category_name': parent.name,
                    'allocated_amount': 0,
                    'is_system_recommended': True,
                    'is_parent': False
                })

        # Normalize to 100% if historical data doesn't reach 100%
        if recommendations:
            actual_total = sum(r['allocated_amount'] for r in recommendations if r.get('is_parent'))
            if actual_total > 0 and actual_total < income_amount:
                # Scale up all allocations proportionally to reach 100%
                scale_factor = income_amount / actual_total

                for rec in recommendations:
                    if rec.get('is_parent') and rec.get('children'):
                        # Scale parent and all children
                        rec['allocated_amount'] = int(round(rec['allocated_amount'] * scale_factor))
                        for child in rec['children']:
                            child['allocated_amount'] = int(round(child['allocated_amount'] * scale_factor))

                # Final adjustment to ensure exact 100%
                actual_total = sum(r['allocated_amount'] for r in recommendations)
                difference = int(income_amount) - actual_total
                if difference != 0:
                    for rec in recommendations:
                        if rec.get('is_parent') and rec.get('children'):
                            rec['allocated_amount'] += difference
                            if rec['children']:
                                rec['children'][0]['allocated_amount'] += difference
                            break

    return recommendations


@budget_bp.route('/plans', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_budget_plans() -> Tuple[Dict[str, Any], int]:
    """Get all budget plans for workspace."""
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        plans = BudgetPlan.query.filter_by(workspace_id=workspace_id).order_by(BudgetPlan.period_start.desc()).all()

        result = []
        for plan in plans:
            allocations = build_hierarchical_allocations(plan.allocations)

            # For DRAFT status, recalculate actual income from transactions
            if plan.status == 'DRAFT':
                actual_income = calculate_income_for_period(
                    plan.workspace_id,
                    plan.period_start,
                    plan.period_end
                )
            else:
                # ACTIVE status uses frozen income_amount
                actual_income = plan.income_amount

            result.append({
                'id': plan.id,
                'name': plan.name,
                'income_amount': float(plan.income_amount),
                'actual_income': float(actual_income),
                'income_date': plan.income_date.isoformat() if plan.income_date else None,
                'period_start': plan.period_start.isoformat(),
                'period_end': plan.period_end.isoformat(),
                'status': plan.status,
                'is_active': plan.is_active,
                'notes': plan.notes,
                'created_at': plan.created_at.isoformat(),
                'allocations': allocations
            })

        return {'budget_plans': result}, 200

    except Exception as e:
        return {'error': f'Gagal mengambil budget plans: {str(e)}'}, 500


@budget_bp.route('/plans', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member')
def create_budget_plan() -> Tuple[Dict[str, Any], int]:
    """Create new budget plan with allocations."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        workspace_id = data.get('workspace_id')
        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Validate required fields (income_amount removed - will be auto-calculated)
        required_fields = ['name', 'period_start', 'period_end']
        for field in required_fields:
            if field not in data:
                return {'error': f'{field} harus diisi'}, 400

        # Parse dates
        period_start = datetime.strptime(data['period_start'], '%Y-%m-%d').date()
        period_end = datetime.strptime(data['period_end'], '%Y-%m-%d').date()

        # Auto-calculate income from previous month transactions
        income_amount = calculate_income_for_period(workspace_id, period_start, period_end)

        # Create budget plan with DRAFT status
        budget_plan = BudgetPlan(
            workspace_id=workspace_id,
            name=data['name'],
            income_amount=income_amount,
            income_date=None,  # Optional now
            period_start=period_start,
            period_end=period_end,
            status='DRAFT',
            is_active=data.get('is_active', True),
            notes=data.get('notes'),
            created_by=current_user_id,
            created_at=get_wib_now(),
            updated_at=get_wib_now()
        )

        db.session.add(budget_plan)
        db.session.flush()  # Get budget_plan.id

        # Create allocations
        allocations_data = data.get('allocations', [])
        for alloc_data in allocations_data:
            # Skip parent categories - only save children or standalone categories
            if alloc_data.get('is_parent'):
                # Save children allocations
                for child in alloc_data.get('children', []):
                    allocation = BudgetAllocation(
                        budget_plan_id=budget_plan.id,
                        category_id=child['category_id'],
                        allocated_amount=Decimal(str(child['allocated_amount'])),
                        is_system_recommended=child.get('is_system_recommended', False),
                        notes=child.get('notes')
                    )
                    db.session.add(allocation)
            else:
                # Standalone category (parent without children)
                allocation = BudgetAllocation(
                    budget_plan_id=budget_plan.id,
                    category_id=alloc_data['category_id'],
                    allocated_amount=Decimal(str(alloc_data['allocated_amount'])),
                    is_system_recommended=alloc_data.get('is_system_recommended', False),
                    notes=alloc_data.get('notes')
                )
                db.session.add(allocation)

        db.session.commit()

        return {
            'message': 'Budget plan berhasil dibuat',
            'budget_plan_id': budget_plan.id,
            'income_amount': float(income_amount),
            'status': 'DRAFT'
        }, 201

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal membuat budget plan: {str(e)}'}, 500


@budget_bp.route('/plans/<int:plan_id>', methods=['PUT'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member')
def update_budget_plan(plan_id: int) -> Tuple[Dict[str, Any], int]:
    """Update budget plan and allocations."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        budget_plan = BudgetPlan.query.get(plan_id)
        if not budget_plan:
            return {'error': 'Budget plan tidak ditemukan'}, 404

        if not check_workspace_access(current_user_id, budget_plan.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Update budget plan fields
        if 'name' in data:
            budget_plan.name = data['name']
        if 'income_amount' in data:
            budget_plan.income_amount = Decimal(str(data['income_amount']))
        if 'income_date' in data:
            budget_plan.income_date = datetime.strptime(data['income_date'], '%Y-%m-%d').date()
        if 'period_start' in data:
            budget_plan.period_start = datetime.strptime(data['period_start'], '%Y-%m-%d').date()
        if 'period_end' in data:
            budget_plan.period_end = datetime.strptime(data['period_end'], '%Y-%m-%d').date()
        if 'is_active' in data:
            budget_plan.is_active = data['is_active']
        if 'notes' in data:
            budget_plan.notes = data['notes']

        budget_plan.updated_at = get_wib_now()

        # Update allocations if provided
        if 'allocations' in data:
            # Delete existing allocations
            BudgetAllocation.query.filter_by(budget_plan_id=plan_id).delete()

            # Create new allocations
            for alloc_data in data['allocations']:
                # Skip parent categories - only save children or standalone categories
                if alloc_data.get('is_parent'):
                    # Save children allocations
                    for child in alloc_data.get('children', []):
                        allocation = BudgetAllocation(
                            budget_plan_id=plan_id,
                            category_id=child['category_id'],
                            allocated_amount=Decimal(str(child['allocated_amount'])),
                            is_system_recommended=child.get('is_system_recommended', False),
                            notes=child.get('notes')
                        )
                        db.session.add(allocation)
                else:
                    # Standalone category (parent without children)
                    allocation = BudgetAllocation(
                        budget_plan_id=plan_id,
                        category_id=alloc_data['category_id'],
                        allocated_amount=Decimal(str(alloc_data['allocated_amount'])),
                        is_system_recommended=alloc_data.get('is_system_recommended', False),
                        notes=alloc_data.get('notes')
                    )
                    db.session.add(allocation)

        db.session.commit()

        return {'message': 'Budget plan berhasil diupdate'}, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal mengupdate budget plan: {str(e)}'}, 500


@budget_bp.route('/plans/<int:plan_id>', methods=['DELETE'])
@jwt_required()
@require_role('Owner', 'Admin', skip_workspace_check=True)
def delete_budget_plan(plan_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete budget plan."""
    try:
        current_user_id = int(get_jwt_identity())

        budget_plan = BudgetPlan.query.get(plan_id)
        if not budget_plan:
            return {'error': 'Budget plan tidak ditemukan'}, 404

        if not check_workspace_access(current_user_id, budget_plan.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        db.session.delete(budget_plan)
        db.session.commit()

        return {'message': 'Budget plan berhasil dihapus'}, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal menghapus budget plan: {str(e)}'}, 500


@budget_bp.route('/plans/<int:plan_id>/activate', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', skip_workspace_check=True)
def activate_budget_plan(plan_id: int) -> Tuple[Dict[str, Any], int]:
    """Activate budget plan and freeze income amount."""
    try:
        current_user_id = int(get_jwt_identity())

        budget_plan = BudgetPlan.query.get(plan_id)
        if not budget_plan:
            return {'error': 'Budget plan tidak ditemukan'}, 404

        if not check_workspace_access(current_user_id, budget_plan.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        if budget_plan.status == 'ACTIVE':
            return {'error': 'Budget plan sudah aktif'}, 400

        # Recalculate income one last time before freezing
        actual_income = calculate_income_for_period(
            budget_plan.workspace_id,
            budget_plan.period_start,
            budget_plan.period_end
        )

        # Update status and freeze income
        budget_plan.status = 'ACTIVE'
        budget_plan.income_amount = actual_income
        budget_plan.updated_at = get_wib_now()

        db.session.commit()

        return {
            'message': 'Budget plan berhasil diaktifkan',
            'income_amount': float(actual_income),
            'status': 'ACTIVE'
        }, 200

    except Exception as e:
        db.session.rollback()
        return {'error': f'Gagal mengaktifkan budget plan: {str(e)}'}, 500


@budget_bp.route('/calculate-income', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def calculate_income_endpoint() -> Tuple[Dict[str, Any], int]:
    """Calculate income for budget period (from period_start to period_end)."""
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)
        period_start_str = request.args.get('period_start')
        period_end_str = request.args.get('period_end')

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not period_start_str:
            return {'error': 'period_start harus diisi'}, 400

        if not period_end_str:
            return {'error': 'period_end harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Parse dates
        period_start = datetime.strptime(period_start_str, '%Y-%m-%d').date()
        period_end = datetime.strptime(period_end_str, '%Y-%m-%d').date()

        # Calculate income within the period
        income_amount = calculate_income_for_period(workspace_id, period_start, period_end)

        return {
            'income_amount': float(income_amount),
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat()
        }, 200

    except Exception as e:
        return {'error': f'Gagal menghitung income: {str(e)}'}, 500


@budget_bp.route('/recommendations', methods=['POST'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member')
def get_budget_recommendations() -> Tuple[Dict[str, Any], int]:
    """Get AI-based budget allocation recommendations."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        workspace_id = data.get('workspace_id')
        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        income_amount = float(data.get('income_amount', 0))
        period_start = datetime.strptime(data['period_start'], '%Y-%m-%d').date()
        period_end = datetime.strptime(data['period_end'], '%Y-%m-%d').date()

        if income_amount <= 0:
            return {'error': 'income_amount harus lebih dari 0'}, 400

        recommendations = generate_budget_recommendations(
            workspace_id,
            income_amount,
            period_start,
            period_end
        )

        return {'recommendations': recommendations}, 200

    except Exception as e:
        return {'error': f'Gagal membuat rekomendasi: {str(e)}'}, 500


@budget_bp.route('/plans/<int:plan_id>/realization', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_budget_realization(plan_id: int) -> Tuple[Dict[str, Any], int]:
    """Get budget vs actual spending comparison."""
    try:
        current_user_id = int(get_jwt_identity())

        budget_plan = BudgetPlan.query.get(plan_id)
        if not budget_plan:
            return {'error': 'Budget plan tidak ditemukan'}, 404

        if not check_workspace_access(current_user_id, budget_plan.workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Get actual spending per category during budget period
        realization = []
        total_budgeted = 0
        total_spent = 0

        # Track categories that have budget allocation
        allocated_category_ids = set()

        for allocation in budget_plan.allocations:
            allocated_category_ids.add(allocation.category_id)

            # Calculate actual spending
            actual_spent = db.session.query(
                func.sum(Transaction.amount)
            ).filter(
                and_(
                    Transaction.category_id == allocation.category_id,
                    Transaction.type == 'EXPENSE',
                    Transaction.transaction_date >= budget_plan.period_start,
                    Transaction.transaction_date <= budget_plan.period_end
                )
            ).scalar() or 0

            actual_spent = float(actual_spent)
            allocated = float(allocation.allocated_amount)

            total_budgeted += allocated
            total_spent += actual_spent

            variance = actual_spent - allocated
            variance_pct = (variance / allocated * 100) if allocated > 0 else 0

            realization.append({
                'category_id': allocation.category_id,
                'category_name': allocation.category.name,
                'allocated_amount': allocated,
                'actual_spent': actual_spent,
                'variance': variance,
                'variance_percentage': round(variance_pct, 2),
                'status': 'over' if variance > 0 else 'under' if variance < 0 else 'on_track'
            })

        # Include spending from categories not in budget (like "Investasi Emas")
        unbudgeted_spending = db.session.query(
            Transaction.category_id,
            Category.name,
            func.sum(Transaction.amount).label('total')
        ).join(
            Category, Transaction.category_id == Category.id
        ).filter(
            and_(
                Transaction.workspace_id == budget_plan.workspace_id,
                Transaction.type == 'EXPENSE',
                Transaction.transaction_date >= budget_plan.period_start,
                Transaction.transaction_date <= budget_plan.period_end,
                ~Transaction.category_id.in_(allocated_category_ids)
            )
        ).group_by(
            Transaction.category_id,
            Category.name
        ).all()

        for category_id, category_name, amount in unbudgeted_spending:
            if amount and float(amount) > 0:
                actual_spent = float(amount)
                total_spent += actual_spent

                realization.append({
                    'category_id': category_id,
                    'category_name': category_name,
                    'allocated_amount': 0,
                    'actual_spent': actual_spent,
                    'variance': actual_spent,
                    'variance_percentage': 0,
                    'status': 'unbudgeted'
                })

        # Build hierarchical structure
        hierarchical_realization = build_hierarchical_realization(realization)

        return {
            'budget_plan': {
                'id': budget_plan.id,
                'name': budget_plan.name,
                'income_amount': float(budget_plan.income_amount),
                'period_start': budget_plan.period_start.isoformat(),
                'period_end': budget_plan.period_end.isoformat()
            },
            'summary': {
                'total_budgeted': total_budgeted,
                'total_spent': total_spent,
                'total_variance': total_spent - total_budgeted,
                'total_variance_percentage': round((total_spent - total_budgeted) / total_budgeted * 100, 2) if total_budgeted > 0 else 0,
                'remaining': float(budget_plan.income_amount) - total_spent
            },
            'realization': hierarchical_realization
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil realisasi budget: {str(e)}'}, 500
