"""Analytics routes with AI-powered insights."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Transaction, Account, Category, WorkspaceMember
from app.decorators import require_role
from sqlalchemy import func, extract
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Tuple, Dict, Any
import calendar

analytics_bp = Blueprint('analytics', __name__)


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


def generate_ai_insights(data: Dict[str, Any]) -> list:
    """Generate AI-powered financial insights and recommendations."""
    insights = []

    # Basic totals
    total_income = float(data.get('total_income', 0))
    total_expense = float(data.get('total_expense', 0))

    # If the request is for more than 1 month, return a limited set of insights
    # to avoid running trend-based analysis (which should only run for 'Bulan Ini').
    months = int(data.get('months', 1)) if data.get('months') is not None else 1
    if months != 1:
        # Provide only lightweight, period-agnostic insights (avoid monthly-trend comparisons)
        if total_income > 0:
            expense_ratio = (total_expense / total_income) * 100

            if expense_ratio > 90:
                insights.append({
                    'type': 'warning',
                    'category': 'Pengeluaran Tinggi',
                    'message': f'Pengeluaran Anda mencapai {expense_ratio:.1f}% dari pemasukan. Ini cukup tinggi untuk periode ini.',
                    'recommendation': 'Tinjau pengeluaran utama dan pertimbangkan pengurangan untuk kategori besar.',
                    'priority': 'high'
                })
            elif expense_ratio > 70:
                insights.append({
                    'type': 'warning',
                    'category': 'Pengeluaran Cukup Tinggi',
                    'message': f'Pengeluaran Anda {expense_ratio:.1f}% dari pemasukan selama periode terpilih.',
                    'recommendation': 'Pertimbangkan untuk mengurangi pengeluaran 10-20% agar bisa menabung lebih banyak.',
                    'priority': 'medium'
                })
            elif expense_ratio < 50:
                insights.append({
                    'type': 'success',
                    'category': 'Keuangan Relatif Sehat',
                    'message': f'Pengeluaran hanya {expense_ratio:.1f}% dari pemasukan selama periode terpilih.',
                    'recommendation': 'Pertimbangkan meningkatkan tabungan atau investasi.',
                    'priority': 'low'
                })

        # Short emergency fund hint
        total_accounts = data.get('total_balance', 0)
        if total_accounts > 0 and total_expense > 0:
            emergency_fund_target = total_expense * 6
            if total_accounts < emergency_fund_target:
                insights.append({
                    'type': 'info',
                    'category': 'Dana Darurat',
                    'message': f'Dana darurat Anda saat ini Rp {total_accounts:,.0f}. Target ideal kira-kira Rp {emergency_fund_target:,.0f}.',
                    'recommendation': 'Sisihkan sebagian setiap bulan untuk mencapai target dana darurat.',
                    'priority': 'medium'
                })

        if not insights:
            insights.append({
                'type': 'info',
                'category': 'Ringkasan Periode',
                'message': 'Analisa lengkap tren hanya tersedia untuk filter "Bulan Ini". Untuk insight tren, pilih Bulan Ini.',
                'recommendation': 'Gunakan filter Bulan Ini untuk rekomendasi berbasis tren.',
                'priority': 'low'
            })

        return sorted(insights, key=lambda x: {'high': 0, 'medium': 1, 'low': 2}[x['priority']])

    if total_income > 0:
        expense_ratio = (total_expense / total_income) * 100

        if expense_ratio > 90:
            insights.append({
                'type': 'warning',
                'category': 'Pengeluaran Tinggi',
                'message': f'Pengeluaran Anda mencapai {expense_ratio:.1f}% dari pemasukan. Ini sangat tinggi!',
                'recommendation': 'Segera kurangi pengeluaran tidak penting dan fokus pada kebutuhan pokok.',
                'priority': 'high'
            })
        elif expense_ratio > 70:
            insights.append({
                'type': 'warning',
                'category': 'Pengeluaran Cukup Tinggi',
                'message': f'Pengeluaran Anda {expense_ratio:.1f}% dari pemasukan.',
                'recommendation': 'Pertimbangkan untuk mengurangi pengeluaran 10-20% agar bisa menabung lebih banyak.',
                'priority': 'medium'
            })
        elif expense_ratio < 50:
            insights.append({
                'type': 'success',
                'category': 'Keuangan Sehat',
                'message': f'Bagus! Pengeluaran hanya {expense_ratio:.1f}% dari pemasukan.',
                'recommendation': 'Pertimbangkan untuk menginvestasikan sisa dana atau menambah tabungan darurat.',
                'priority': 'low'
            })

    # Analisa potensi tabungan
    if total_income > total_expense:
        savings_potential = total_income - total_expense
        savings_percentage = (savings_potential / total_income) * 100

        insights.append({
            'type': 'info',
            'category': 'Potensi Tabungan',
            'message': f'Anda bisa menabung Rp {savings_potential:,.0f} ({savings_percentage:.1f}%) bulan ini.',
            'recommendation': 'Otomatis transfer ke rekening tabungan setiap awal bulan untuk mencapai target.',
            'priority': 'medium'
        })

    # Analisa kategori pengeluaran terbesar
    if 'expense_by_category' in data and data['expense_by_category']:
        sorted_expenses = sorted(data['expense_by_category'], key=lambda x: x['total'], reverse=True)
        if sorted_expenses:
            top_category = sorted_expenses[0]
            top_percentage = (float(top_category['total']) / total_expense * 100) if total_expense > 0 else 0

            if top_percentage > 40:
                amount_suggestion = float(top_category['total']) * 0.15
                insights.append({
                    'type': 'warning',
                    'category': 'Kategori Pengeluaran Dominan',
                    'message': f'{top_category["category_name"]} menyerap {top_percentage:.1f}% dari total pengeluaran bulan ini (Rp {float(top_category["total"]):,.0f}).',
                    'recommendation': f'Untuk bulan depan, cobalah batasi pengeluaran {top_category["category_name"]} maksimal Rp {(float(top_category["total"]) - amount_suggestion):,.0f}. Buat budget plan dan cari alternatif yang lebih hemat.',
                    'priority': 'high'
                })

    # Analisa tren transaksi
    if 'monthly_trend' in data and len(data['monthly_trend']) >= 2:
        trends = data['monthly_trend']
        latest = trends[-1]
        previous = trends[-2]

        expense_change = ((latest['expense'] - previous['expense']) / previous['expense'] * 100) if previous['expense'] > 0 else 0

        if expense_change > 20:
            excess_amount = latest['expense'] - previous['expense']
            insights.append({
                'type': 'warning',
                'category': 'Tren Pengeluaran Naik',
                'message': f'Pengeluaran naik {expense_change:.1f}% dari bulan lalu (tambahan Rp {excess_amount:,.0f}).',
                'recommendation': 'Review kategori pengeluaran bulan ini untuk identifikasi pola. Bulan depan, buat daftar prioritas belanja dan gunakan metode "tunggu 24 jam" sebelum membeli barang non-esensial.',
                'priority': 'high'
            })
        elif expense_change < -10:
            insights.append({
                'type': 'success',
                'category': 'Pengeluaran Menurun',
                'message': f'Bagus! Pengeluaran turun {abs(expense_change):.1f}% dari bulan lalu.',
                'recommendation': 'Pertahankan pola pengeluaran ini dan alokasikan selisihnya ke tabungan.',
                'priority': 'low'
            })

    # Rekomendasi umum jika belum ada insight
    if not insights:
        insights.append({
            'type': 'info',
            'category': 'Mulai Tracking',
            'message': 'Terus catat semua transaksi untuk mendapatkan insight yang lebih akurat.',
            'recommendation': 'Target menabung minimal 20% dari pemasukan setiap bulan.',
            'priority': 'medium'
        })

    # Tambahkan rekomendasi tabungan darurat
    total_accounts = data.get('total_balance', 0)
    if total_accounts > 0 and total_expense > 0:
        emergency_fund_target = total_expense * 6  # 6 bulan pengeluaran
        if total_accounts < emergency_fund_target:
            shortage = emergency_fund_target - total_accounts
            monthly_target = shortage / 12
            insights.append({
                'type': 'info',
                'category': 'Dana Darurat',
                'message': f'Dana darurat Anda saat ini Rp {total_accounts:,.0f}. Target ideal: Rp {emergency_fund_target:,.0f} (6x pengeluaran bulanan).',
                'recommendation': f'Sisihkan Rp {monthly_target:,.0f} setiap bulan ke rekening terpisah khusus dana darurat. Dalam 1 tahun, target dana darurat Anda akan tercapai!',
                'priority': 'medium'
            })

    # Tambahkan tips hemat untuk kategori dengan pengeluaran tinggi
    if 'expense_by_category' in data and len(data['expense_by_category']) >= 2:
        sorted_expenses = sorted(data['expense_by_category'], key=lambda x: x['total'], reverse=True)
        if len(sorted_expenses) >= 2:
            second_category = sorted_expenses[1]
            second_percentage = (float(second_category['total']) / total_expense * 100) if total_expense > 0 else 0

            if second_percentage > 25:
                insights.append({
                    'type': 'info',
                    'category': 'Optimasi Pengeluaran',
                    'message': f'Kategori {second_category["category_name"]} juga cukup besar ({second_percentage:.1f}% dari total).',
                    'recommendation': f'Tips bulan depan: Bandingkan harga sebelum beli, cari promo/diskon, atau pertimbangkan alternatif lebih murah untuk {second_category["category_name"]}.',
                    'priority': 'low'
                })

    return sorted(insights, key=lambda x: {'high': 0, 'medium': 1, 'low': 2}[x['priority']])


@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_dashboard_analytics() -> Tuple[Dict[str, Any], int]:
    """
    Get comprehensive dashboard analytics with AI insights.

    Query params:
        workspace_id: int (required)
        months: int (optional, default 6) - number of months for trend analysis
    """
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)
        months = request.args.get('months', type=int, default=6)

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Get current date info
        now_dt = datetime.now()
        today = now_dt.date()
        start_of_month = date(today.year, today.month, 1)

        # Total saldo semua akun
        accounts = Account.query.filter_by(workspace_id=workspace_id).all()
        total_balance = sum(float(acc.initial_balance) for acc in accounts)

        # Hitung perubahan saldo dari transaksi
        for account in accounts:
            income = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == 'INCOME'
            ).scalar() or Decimal('0')

            expense = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == 'EXPENSE'
            ).scalar() or Decimal('0')

            transfer_in = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.transfer_to_account_id == account.id,
                Transaction.type == 'TRANSFER'
            ).scalar() or Decimal('0')

            transfer_out = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == 'TRANSFER'
            ).scalar() or Decimal('0')

            account_balance = float(account.initial_balance) + float(income) - float(expense) + float(transfer_in) - float(transfer_out)
            total_balance += account_balance - float(account.initial_balance)

        # Income dan expense bulan ini
        current_month_income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'INCOME',
            Transaction.transaction_date >= start_of_month
        ).scalar() or Decimal('0')

        current_month_expense = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'EXPENSE',
            Transaction.transaction_date >= start_of_month
        ).scalar() or Decimal('0')

        # Expense by category - untuk periode yang dipilih
        # Hitung start date berdasarkan periode (gunakan per-bulan calendar-aware, bukan 30 hari tetap)
        if months == 1:
            # Bulan ini saja
            period_start = start_of_month
        else:
            # N bulan terakhir: tentukan bulan pertama (awal bulan) dari periode
            # total_months = year*12 + (month-1)
            total_months = today.year * 12 + (today.month - 1)
            # start month index (0-based) = total_months - (months - 1)
            start_total = total_months - (months - 1)
            start_year = start_total // 12
            start_month = (start_total % 12) + 1
            period_start = date(start_year, start_month, 1)

        expense_by_category = db.session.query(
            Category.name.label('category_name'),
            func.sum(Transaction.amount).label('total')
        ).join(
            Transaction, Transaction.category_id == Category.id
        ).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'EXPENSE',
            Transaction.transaction_date >= period_start
        ).group_by(Category.name).all()

        expense_categories = [
            {'category_name': cat.category_name, 'total': float(cat.total)}
            for cat in expense_by_category
        ]

        # Trend data - daily for current month, monthly for longer periods
        trend_data = []
        month_ranges = []
        is_daily_view = (months == 1)

        if is_daily_view:
            # Daily data for current month (use date objects)
            days_in_month = calendar.monthrange(today.year, today.month)[1]

            for day in range(1, today.day + 1):
                day_date = date(today.year, today.month, day)

                day_income = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.workspace_id == workspace_id,
                    Transaction.type == 'INCOME',
                    Transaction.transaction_date >= day_date,
                    Transaction.transaction_date <= day_date
                ).scalar() or Decimal('0')

                day_expense = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.workspace_id == workspace_id,
                    Transaction.type == 'EXPENSE',
                    Transaction.transaction_date >= day_date,
                    Transaction.transaction_date <= day_date
                ).scalar() or Decimal('0')

                trend_data.append({
                    'label': str(day),
                    'date': day_date.strftime('%Y-%m-%d'),
                    'income': float(day_income),
                    'expense': float(day_expense),
                    'savings': float(day_income - day_expense)
                })
        else:
            # Monthly data for multiple months (calendar-aware)
            total_months = today.year * 12 + (today.month - 1)

            # For debugging/verification include the exact start/end date used for each month
            month_ranges = []

            for i in range(months - 1, -1, -1):
                month_index = total_months - i
                month_year = month_index // 12
                month_month = (month_index % 12) + 1
                month_start = date(month_year, month_month, 1)

                if i > 0:
                    # next month's first day as date
                    next_index = month_index + 1
                    next_year = next_index // 12
                    next_month = (next_index % 12) + 1
                    month_end = date(next_year, next_month, 1)
                else:
                    # current month: end is tomorrow (exclusive) so include today
                    month_end = today + timedelta(days=1)

                month_income = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.workspace_id == workspace_id,
                    Transaction.type == 'INCOME',
                    Transaction.transaction_date >= month_start,
                    Transaction.transaction_date < month_end
                ).scalar() or Decimal('0')

                month_expense = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.workspace_id == workspace_id,
                    Transaction.type == 'EXPENSE',
                    Transaction.transaction_date >= month_start,
                    Transaction.transaction_date < month_end
                ).scalar() or Decimal('0')

                trend_data.append({
                    'label': month_start.strftime('%b %Y'),
                    'month_num': month_start.month,
                    'year': month_start.year,
                    'income': float(month_income),
                    'expense': float(month_expense),
                    'savings': float(month_income - month_expense)
                })
                month_ranges.append({
                    'label': month_start.strftime('%b %Y'),
                    'start': month_start.isoformat(),
                    'end': month_end.isoformat()
                })

        # Top spending categories (all time)
        top_categories = db.session.query(
            Category.name.label('category_name'),
            func.sum(Transaction.amount).label('total'),
            func.count(Transaction.id).label('count')
        ).join(
            Transaction, Transaction.category_id == Category.id
        ).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'EXPENSE'
        ).group_by(Category.name).order_by(func.sum(Transaction.amount).desc()).limit(5).all()

        top_spending = [
            {
                'category': cat.category_name,
                'total': float(cat.total),
                'count': cat.count
            }
            for cat in top_categories
        ]

        # Prepare data for AI analysis
        analysis_data = {
            'total_balance': total_balance,
            'total_income': float(current_month_income),
            'total_expense': float(current_month_expense),
            'expense_by_category': expense_categories,
            'monthly_trend': trend_data if not is_daily_view else [],
            'top_spending': top_spending,
            'months': months
        }

        # Generate AI insights
        ai_insights = generate_ai_insights(analysis_data)

        # Indicate whether AI insights are limited for the selected period
        ai_insights_limited = (months != 1)
        ai_insights_note = None
        if ai_insights_limited:
            ai_insights_note = 'Analisa tren dibatasi untuk periode selain "Bulan Ini". Pilih Bulan Ini untuk insight berbasis tren.'

        return {
            'summary': {
                'total_balance': total_balance,
                'current_month_income': float(current_month_income),
                'current_month_expense': float(current_month_expense),
                'savings_this_month': float(current_month_income - current_month_expense),
                'expense_ratio': (float(current_month_expense) / float(current_month_income) * 100) if current_month_income > 0 else 0
            },
            'trend_data': trend_data,
            'is_daily_view': is_daily_view,
            'expense_by_category': expense_categories,
            'top_spending_categories': top_spending,
            'trend_ranges': month_ranges,
            'ai_insights': ai_insights,
            'ai_insights_limited': ai_insights_limited,
            'ai_insights_note': ai_insights_note,
            'accounts_summary': [
                {
                    'name': acc.name,
                    'type': acc.type,
                    'balance': float(acc.initial_balance)
                }
                for acc in accounts
            ]
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil analitik: {str(e)}'}, 500


@analytics_bp.route('/daily-comparison', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_daily_comparison() -> Tuple[Dict[str, Any], int]:
    """
    Get daily income vs expense comparison.

    Query params:
        workspace_id: int (required)
        months: int (optional, default 1) - 1 for current month, or N for last N months
    """
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)
        months = request.args.get('months', type=int, default=1)

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        # Use date objects to avoid datetime vs date mismatches
        now_dt = datetime.now()
        today = now_dt.date()
        daily_data = []

        if months == 1:
            # Current month only (daily aggregation)
            start_of_month_dt = datetime(now_dt.year, now_dt.month, 1)
            days_in_month = calendar.monthrange(now_dt.year, now_dt.month)[1]

            for day in range(1, days_in_month + 1):
                day_dt = start_of_month_dt.replace(day=day)

                # Only include dates up to today
                if day_dt.date() > today:
                    break

                # Get income for this day
                daily_income = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.workspace_id == workspace_id,
                    Transaction.type == 'INCOME',
                    func.date(Transaction.transaction_date) == day_dt.date()
                ).scalar() or Decimal('0')

                # Get expense for this day
                daily_expense = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.workspace_id == workspace_id,
                    Transaction.type == 'EXPENSE',
                    func.date(Transaction.transaction_date) == day_dt.date()
                ).scalar() or Decimal('0')

                daily_data.append({
                    'date': day_dt.strftime('%Y-%m-%d'),
                    'day': day,
                    'day_name': day_dt.strftime('%a'),
                    'income': float(daily_income),
                    'expense': float(daily_expense),
                    'net': float(daily_income - daily_expense)
                })
        else:
            # Multiple months - aggregate by calendar month (calendar-aware)
            total_months = today.year * 12 + (today.month - 1)

            for i in range(months - 1, -1, -1):
                month_index = total_months - i
                month_year = month_index // 12
                month_month = (month_index % 12) + 1
                month_start = date(month_year, month_month, 1)

                if i > 0:
                    next_index = month_index + 1
                    next_year = next_index // 12
                    next_month = (next_index % 12) + 1
                    month_end = date(next_year, next_month, 1)
                else:
                    # current month: end is tomorrow (exclusive) to include today
                    month_end = today + timedelta(days=1)

                # Get income for this month
                month_income = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.workspace_id == workspace_id,
                    Transaction.type == 'INCOME',
                    Transaction.transaction_date >= month_start,
                    Transaction.transaction_date < month_end
                ).scalar() or Decimal('0')

                # Get expense for this month
                month_expense = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.workspace_id == workspace_id,
                    Transaction.type == 'EXPENSE',
                    Transaction.transaction_date >= month_start,
                    Transaction.transaction_date < month_end
                ).scalar() or Decimal('0')

                daily_data.append({
                    'date': month_start.strftime('%Y-%m-%d'),
                    'month': month_start.strftime('%b'),
                    'month_full': month_start.strftime('%B %Y'),
                    'income': float(month_income),
                    'expense': float(month_expense),
                    'net': float(month_income - month_expense)
                })

        # Calculate summary
        total_income = sum(d['income'] for d in daily_data)
        total_expense = sum(d['expense'] for d in daily_data)

        period_label = 'Bulan Ini' if months == 1 else f'{months} Bulan Terakhir'

        return {
            'daily_data': daily_data,
            'summary': {
                'total_income': total_income,
                'total_expense': total_expense,
                'net_savings': total_income - total_expense,
                'days_tracked': len(daily_data),
                'avg_daily_income': total_income / len(daily_data) if daily_data else 0,
                'avg_daily_expense': total_expense / len(daily_data) if daily_data else 0
            },
            'period': period_label,
            'months': months,
            'is_current_month': months == 1
        }, 200

    except Exception as e:
        return {'error': f'Gagal mengambil data harian: {str(e)}'}, 500


@analytics_bp.route('/income-by-category', methods=['GET'])
@jwt_required()
@require_role('Owner', 'Admin', 'Member', 'Viewer')
def get_income_by_category() -> Tuple[Dict[str, Any], int]:
    """
    Aggregate INCOME by category for a workspace and optional date range.

    Query params:
        workspace_id: int (required)
        start_date: YYYY-MM-DD (optional)
        end_date: YYYY-MM-DD (optional)
        top_n: int (optional, default=8)
    """
    try:
        current_user_id = int(get_jwt_identity())
        workspace_id = request.args.get('workspace_id', type=int)

        if not workspace_id:
            return {'error': 'workspace_id harus diisi'}, 400

        if not check_workspace_access(current_user_id, workspace_id):
            return {'error': 'Akses ditolak'}, 403

        top_n = request.args.get('top_n', type=int, default=8)

        q = db.session.query(
            Category.name.label('category_name'),
            func.sum(Transaction.amount).label('total')
        ).join(Transaction, Transaction.category_id == Category.id).filter(
            Transaction.workspace_id == workspace_id,
            Transaction.type == 'INCOME'
        )

        if request.args.get('start_date'):
            start_date = datetime.strptime(request.args.get('start_date'), '%Y-%m-%d').date()
            q = q.filter(Transaction.transaction_date >= start_date)
        if request.args.get('end_date'):
            end_date = datetime.strptime(request.args.get('end_date'), '%Y-%m-%d').date()
            q = q.filter(Transaction.transaction_date <= end_date)

        q = q.group_by(Category.name).order_by(func.sum(Transaction.amount).desc())
        results = q.limit(top_n).all()

        data = [{'category_name': r.category_name, 'total': float(r.total)} for r in results]
        return {'income_by_category': data}, 200
    except Exception as e:
        return {'error': f'Gagal mengumpulkan data: {str(e)}'}, 500
