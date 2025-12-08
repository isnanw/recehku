"""Script untuk import data dari spreadsheet ke database RecehKu."""
import sys
import os
from datetime import datetime
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from app.models import User, Workspace, WorkspaceMember, Account, Category, Transaction

# Data Income (per bulan)
income_data = {
    'Juli': {
        'Sisa Uang Cash': 700000,
        'Gaji Bulanan': 4455000,
        'Freelance': 1225000
    },
    'Agustus': {
        'Sisa Uang Cash': 534500,
        'Gaji Bulanan': 3776266,
        'Sisa Uang Tabungan': 3021900
    },
    'September': {
        'Sisa Uang Cash': 0
    }
}

# Data Expenses (detail per transaksi)
expense_transactions = [
    {'date': '2025-09-23', 'description': 'Sarapan dan Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 20000},
    {'date': '2025-09-23', 'description': 'Camilan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 2000},
    {'date': '2025-09-23', 'description': 'Listrik Bulan September', 'category': 'Listrik dan Sampah', 'bank': 'MANDIRI', 'amount': 81134},
    {'date': '2025-09-23', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 14000},
    {'date': '2025-09-23', 'description': 'Bensin', 'category': 'Bensin', 'bank': 'Cash', 'amount': 30000},
    {'date': '2025-09-23', 'description': 'Paket Data ne Mamak', 'category': 'Pulsa Paket Data', 'bank': 'MANDIRI', 'amount': 28000},
    {'date': '2025-09-23', 'description': 'Simulasi Kontrakan Bulanan', 'category': 'Kontrakan', 'bank': 'MANDIRI', 'amount': 750000},
    {'date': '2025-09-24', 'description': 'Sarapan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 8000},
    {'date': '2025-09-24', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 8000},
    {'date': '2025-09-24', 'description': 'Buah', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 15000},
    {'date': '2025-09-25', 'description': 'Bensin Klaten', 'category': 'Bensin', 'bank': 'Cash', 'amount': 33000},
    {'date': '2025-09-25', 'description': 'Bakso', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 14000},
    {'date': '2025-09-25', 'description': 'Paket Data FS 80Gb', 'category': 'Pulsa Paket Data', 'bank': 'MANDIRI', 'amount': 101000},
    {'date': '2025-09-25', 'description': 'Lemparan jumat', 'category': 'Hiburan', 'bank': 'Cash', 'amount': 6000},
    {'date': '2025-09-28', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 47000},
    {'date': '2025-09-29', 'description': 'Sayur dan Lauk', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 13000},
    {'date': '2025-09-28', 'description': 'Pulsa', 'category': 'Pulsa Paket Data', 'bank': 'MANDIRI', 'amount': 30900},
    {'date': '2025-09-29', 'description': 'Cuci Sepatu', 'category': 'Hiburan', 'bank': 'Cash', 'amount': 30000},
    {'date': '2024-09-29', 'description': 'Camilan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 2000},
    {'date': '2024-09-29', 'description': 'Buah', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 15000},
    {'date': '2025-09-29', 'description': 'Makan malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-09-30', 'description': 'Sayur dan Lauk', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 20000},
    {'date': '2025-09-30', 'description': 'Tabungan Bulan September', 'category': 'Tabungan', 'bank': 'Transfer', 'amount': 554000},
    {'date': '2025-09-30', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 25000},
    {'date': '2025-09-30', 'description': 'Simpan ke Rek Istri', 'category': 'Lainnya', 'bank': 'MANDIRI', 'amount': 875966},
    {'date': '2025-09-30', 'description': 'Simpan ke Rek Istri', 'category': 'Lainnya', 'bank': 'MANDIRI', 'amount': 258900},
    {'date': '2025-10-01', 'description': 'Tenongan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 26500},
    {'date': '2025-10-01', 'description': 'Makan siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 8000},
    {'date': '2025-10-02', 'description': 'Pertalite Piyungan', 'category': 'Bensin', 'bank': 'Cash', 'amount': 27000},
    {'date': '2025-10-03', 'description': 'Pertamak Suroboyo', 'category': 'Bensin', 'bank': 'Cash', 'amount': 37000},
    {'date': '2025-10-03', 'description': 'Lemparan jumat', 'category': 'Lainnya', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-04', 'description': 'Gocar Gulon-Palur', 'category': 'Lainnya', 'bank': 'MANDIRI', 'amount': 36000},
    {'date': '2025-10-04', 'description': 'Wisata ke Bromo', 'category': 'Hiburan', 'bank': 'MANDIRI', 'amount': 1600000},
    {'date': '2025-10-05', 'description': 'Jajan di Bromo', 'category': 'Hiburan', 'bank': 'Cash', 'amount': 72000},
    {'date': '2025-10-05', 'description': 'Sewa Jaket dan Beli Sarung Tangan', 'category': 'Hiburan', 'bank': 'Cash', 'amount': 65000},
    {'date': '2025-10-06', 'description': 'Bakso Wonogiri', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 35000},
    {'date': '2025-10-06', 'description': 'LeMineral Galon', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 23000},
    {'date': '2025-10-07', 'description': 'Sayur dan Lauk', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 16000},
    {'date': '2025-10-07', 'description': 'Dana Untuk Shanum Opname', 'category': 'Lainnya', 'bank': 'MANDIRI', 'amount': 300000},
    {'date': '2025-10-07', 'description': 'Camilan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 4500},
    {'date': '2025-10-07', 'description': 'Belanja Sabun2', 'category': 'Belanja', 'bank': 'MANDIRI', 'amount': 165900},
    {'date': '2025-10-07', 'description': 'Lauk Rocketchiken', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 20000},
    {'date': '2025-10-08', 'description': 'Buah', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 15000},
    {'date': '2025-10-08', 'description': 'Batagor', 'category': 'Makan Minum', 'bank': 'MANDIRI', 'amount': 5000},
    {'date': '2025-10-08', 'description': 'Pertamax Berbah', 'category': 'Bensin', 'bank': 'Cash', 'amount': 35000},
    {'date': '2025-10-08', 'description': 'Bakso', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 27000},
    {'date': '2025-10-09', 'description': 'Sayur dan Lauk', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 16500},
    {'date': '2025-10-09', 'description': 'Tenongan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 20500},
    {'date': '2025-10-09', 'description': 'Makan Malam Penyetan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 45000},
    {'date': '2025-10-10', 'description': 'Sarapan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 21500},
    {'date': '2025-10-10', 'description': 'Mie Ayam Temen2', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 68000},
    {'date': '2025-10-10', 'description': 'Nomino food factory', 'category': 'Makan Minum', 'bank': 'MANDIRI', 'amount': 81000},
    {'date': '2025-10-15', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'MANDIRI', 'amount': 12000},
    {'date': '2025-10-17', 'description': 'Seteak WS', 'category': 'Makan Minum', 'bank': 'MANDIRI', 'amount': 90000},
    {'date': '2025-10-19', 'description': 'Sikat gigi hotel', 'category': 'Lainnya', 'bank': 'MANDIRI', 'amount': 5000},
    {'date': '2025-10-19', 'description': 'Paket Data Suami', 'category': 'Pulsa Paket Data', 'bank': 'MANDIRI', 'amount': 161000},
    {'date': '2025-10-20', 'description': 'Listrik Bulan Oktober', 'category': 'Listrik dan Sampah', 'bank': 'MANDIRI', 'amount': 82884},
    {'date': '2025-10-21', 'description': 'Nasi dan Mendoan', 'category': 'Makan Minum', 'bank': 'MANDIRI', 'amount': 5000},
    {'date': '2025-10-22', 'description': 'Paket data Istri', 'category': 'Pulsa Paket Data', 'bank': 'MANDIRI', 'amount': 85000},
    {'date': '2025-10-27', 'description': 'Sandal', 'category': 'Belanja', 'bank': 'MANDIRI', 'amount': 43499},
    {'date': '2025-10-19', 'description': 'Sumbang si Jhon', 'category': 'Lainnya', 'bank': 'Cash', 'amount': 500000},
    {'date': '2025-10-11', 'description': 'Bensin Suroboyo', 'category': 'Bensin', 'bank': 'Cash', 'amount': 37000},
    {'date': '2025-10-13', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 35000},
    {'date': '2025-10-13', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-13', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 35000},
    {'date': '2025-10-14', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 32500},
    {'date': '2025-10-14', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-14', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-15', 'description': 'Sarapan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 14000},
    {'date': '2025-10-15', 'description': 'Bensin', 'category': 'Bensin', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-15', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 35000},
    {'date': '2025-10-16', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 32500},
    {'date': '2025-10-16', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-16', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-17', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 32500},
    {'date': '2025-10-17', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-18', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 32500},
    {'date': '2025-10-18', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 38000},
    {'date': '2025-10-18', 'description': 'Bensin Klaten', 'category': 'Bensin', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-19', 'description': 'Bensin Magelang', 'category': 'Bensin', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-19', 'description': 'Bakso', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 36000},
    {'date': '2025-10-20', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 32500},
    {'date': '2025-10-20', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-20', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-21', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 32500},
    {'date': '2025-10-21', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-21', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-22', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 32500},
    {'date': '2025-10-22', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-22', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-23', 'description': 'Sarapan + Teningan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 32500},
    {'date': '2025-10-23', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-23', 'description': 'Makan Malam', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 40000},
    {'date': '2025-10-24', 'description': 'Sarapan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 35000},
    {'date': '2025-10-25', 'description': 'BELANJA SENTING', 'category': 'Belanja', 'bank': 'Transfer', 'amount': 148000},
    {'date': '2025-10-26', 'description': 'Air Galon + Telur', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 28000},
    {'date': '2025-10-27', 'description': 'Sarapan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-27', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-27', 'description': 'Lele bakar', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 11000},
    {'date': '2025-10-28', 'description': 'Sarapan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 12000},
    {'date': '2025-10-28', 'description': 'Makan Siang', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
    {'date': '2025-10-28', 'description': 'Lele bakar', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 17000},
    {'date': '2025-10-29', 'description': 'Kontrakan Oktober', 'category': 'Kontrakan', 'bank': 'Transfer', 'amount': 800000},
    {'date': '2025-10-29', 'description': 'Sarapan', 'category': 'Makan Minum', 'bank': 'Cash', 'amount': 10000},
]

# Mapping kategori dari spreadsheet ke sistem
category_mapping = {
    'Makan Minum': 'Food & Dining',
    'Bensin': 'Transportation',
    'Pulsa Paket Data': 'Bills & Utilities',
    'Listrik dan Sampah': 'Bills & Utilities',
    'Kontrakan': 'Housing',
    'Hiburan': 'Entertainment',
    'Belanja': 'Shopping',
    'Tabungan': 'Savings',
    'Lainnya': 'Others',
    'Gaji Bulanan': 'Salary',
    'Freelance': 'Freelance',
    'Sisa Uang Cash': 'Others',
    'Sisa Uang Tabungan': 'Others'
}

def get_or_create_category(workspace_id, category_name, category_type):
    """Get or create category."""
    # Map to system category
    system_category = category_mapping.get(category_name, 'Others')

    category = Category.query.filter_by(
        workspace_id=workspace_id,
        name=system_category,
        type=category_type
    ).first()

    if not category:
        category = Category(
            workspace_id=workspace_id,
            name=system_category,
            type=category_type
        )
        db.session.add(category)
        db.session.commit()

    return category

def get_or_create_account(workspace_id, account_name):
    """Get or create account."""
    account = Account.query.filter_by(
        workspace_id=workspace_id,
        name=account_name
    ).first()

    if not account:
        account = Account(
            workspace_id=workspace_id,
            name=account_name,
            type='CASH' if account_name == 'Cash' else 'BANK',
            initial_balance=Decimal('0')
        )
        db.session.add(account)
        db.session.commit()

    return account

def import_data():
    """Main import function."""
    app = create_app()

    with app.app_context():
        # Get or create user (assuming user with email exists)
        user_email = input("Masukkan email user Anda: ")
        user = User.query.filter_by(email=user_email).first()

        if not user:
            print(f"User dengan email {user_email} tidak ditemukan!")
            return

        # Get workspace where user is Admin or Owner
        membership = WorkspaceMember.query.filter_by(user_id=user.id).first()

        if not membership:
            print("Anda tidak memiliki workspace! Buat workspace terlebih dahulu.")
            return

        workspace = membership.workspace

        print(f"\n✓ Menggunakan workspace: {workspace.name}")
        print(f"✓ User: {user.name} ({user.email})")
        print("\n" + "="*60)

        # Import Income Data
        print("\n📥 IMPORT DATA PEMASUKAN...")
        print("="*60)

        income_count = 0
        for month, categories in income_data.items():
            # Tentukan tanggal berdasarkan bulan
            month_map = {
                'Juli': '2025-07-01',
                'Agustus': '2025-08-01',
                'September': '2025-09-01'
            }

            transaction_date = datetime.strptime(month_map[month], '%Y-%m-%d')

            for cat_name, amount in categories.items():
                if amount > 0:
                    category = get_or_create_category(workspace.id, cat_name, 'INCOME')
                    account = get_or_create_account(workspace.id, 'Cash')

                    transaction = Transaction(
                        workspace_id=workspace.id,
                        account_id=account.id,
                        category_id=category.id,
                        type='INCOME',
                        amount=Decimal(str(amount)),
                        description=f'{cat_name} - {month}',
                        transaction_date=transaction_date
                    )
                    db.session.add(transaction)
                    income_count += 1
                    print(f"  ✓ {transaction_date.strftime('%Y-%m-%d')} | {cat_name:30} | Rp {amount:>12,}")

        db.session.commit()
        print(f"\n✅ Berhasil import {income_count} transaksi pemasukan")

        # Import Expense Data
        print("\n📤 IMPORT DATA PENGELUARAN...")
        print("="*60)

        expense_count = 0
        error_count = 0

        for trx in expense_transactions:
            try:
                transaction_date = datetime.strptime(trx['date'], '%Y-%m-%d')

                # Skip data tahun 2024 (data error di spreadsheet)
                if transaction_date.year == 2024:
                    continue

                category = get_or_create_category(workspace.id, trx['category'], 'EXPENSE')
                account = get_or_create_account(workspace.id, trx['bank'])

                transaction = Transaction(
                    workspace_id=workspace.id,
                    account_id=account.id,
                    category_id=category.id,
                    type='EXPENSE',
                    amount=Decimal(str(trx['amount'])),
                    description=trx['description'],
                    transaction_date=transaction_date
                )
                db.session.add(transaction)
                expense_count += 1

                if expense_count % 10 == 0:
                    print(f"  ⏳ Progress: {expense_count} transaksi...")

            except Exception as e:
                error_count += 1
                print(f"  ❌ Error pada transaksi: {trx['description']} - {str(e)}")

        db.session.commit()

        print(f"\n✅ Berhasil import {expense_count} transaksi pengeluaran")
        if error_count > 0:
            print(f"⚠️  {error_count} transaksi gagal diimport")

        # Summary
        print("\n" + "="*60)
        print("📊 RINGKASAN IMPORT")
        print("="*60)
        print(f"  Total Pemasukan  : {income_count} transaksi")
        print(f"  Total Pengeluaran: {expense_count} transaksi")
        print(f"  Total Import     : {income_count + expense_count} transaksi")
        print("="*60)
        print("\n✨ IMPORT DATA SELESAI! ✨\n")

if __name__ == '__main__':
    import_data()
