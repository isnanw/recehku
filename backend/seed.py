"""Seed script to populate the database with sample data for testing."""
from app import create_app, db, bcrypt
from app.models import Role, User, Workspace, WorkspaceMember, Account, Category, Transaction
from datetime import datetime, timedelta
from decimal import Decimal
import random

def seed_database():
    """Seed the database with sample data."""
    app = create_app()

    with app.app_context():
        print("🌱 Mengisi database...")

        # Clear existing data (optional, comment out if you don't want to clear)
        # print("⚠️  Clearing existing data...")
        # db.drop_all()
        # db.create_all()

        # Create Roles
        print("👥 Membuat role...")
        roles_data = ['Owner', 'Admin', 'Member', 'Viewer']
        roles = {}
        for role_name in roles_data:
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name)
                db.session.add(role)
                db.session.flush()
            roles[role_name] = role

        # Create Test User
        print("👤 Membuat user test...")
        test_email = "test@example.com"
        user = User.query.filter_by(email=test_email).first()
        if not user:
            hashed_password = bcrypt.generate_password_hash("password123").decode('utf-8')
            user = User(
                email=test_email,
                hashed_password=hashed_password,
                name="Test User"
            )
            db.session.add(user)
            db.session.flush()

        # Create Workspace
        print("🏢 Membuat workspace...")
        workspace = Workspace.query.filter_by(name="Workspace Pribadi").first()
        if not workspace:
            workspace = Workspace(name="Workspace Pribadi")
            db.session.add(workspace)
            db.session.flush()

            # Add user as owner
            membership = WorkspaceMember(
                user_id=user.id,
                workspace_id=workspace.id,
                role_id=roles['Owner'].id
            )
            db.session.add(membership)

        # Create Accounts
        print("🏦 Membuat akun...")
        accounts_data = [
            {"name": "Rekening BCA Utama", "type": "Bank", "initial_balance": 10000000},
            {"name": "Dompet Tunai", "type": "Cash", "initial_balance": 500000},
            {"name": "Tabungan Mandiri", "type": "Bank", "initial_balance": 5000000},
            {"name": "GoPay", "type": "E-Wallet", "initial_balance": 200000},
        ]

        accounts = []
        for acc_data in accounts_data:
            account = Account.query.filter_by(
                workspace_id=workspace.id,
                name=acc_data["name"]
            ).first()
            if not account:
                account = Account(
                    workspace_id=workspace.id,
                    name=acc_data["name"],
                    type=acc_data["type"],
                    initial_balance=Decimal(str(acc_data["initial_balance"]))
                )
                db.session.add(account)
                db.session.flush()
            accounts.append(account)

        # Create Categories
        print("📁 Membuat kategori...")
        categories_data = {
            "INCOME": [
                {"name": "Gaji", "subcategories": []},
                {"name": "Freelance", "subcategories": ["Desain Web", "Konsultasi"]},
                {"name": "Investasi", "subcategories": ["Saham", "Crypto"]},
            ],
            "EXPENSE": [
                {"name": "Makanan & Minuman", "subcategories": ["Restoran", "Belanja Bulanan", "Jajan"]},
                {"name": "Transportasi", "subcategories": ["Bensin", "Transportasi Umum", "Taksi"]},
                {"name": "Belanja", "subcategories": ["Pakaian", "Elektronik", "Buku"]},
                {"name": "Tagihan & Utilitas", "subcategories": ["Listrik", "Internet", "Pulsa"]},
                {"name": "Hiburan", "subcategories": ["Film", "Game", "Langganan"]},
                {"name": "Kesehatan", "subcategories": ["Dokter", "Obat", "Gym"]},
            ]
        }

        categories = {"INCOME": [], "EXPENSE": []}
        for cat_type, cats in categories_data.items():
            for cat_data in cats:
                # Create parent category
                parent = Category.query.filter_by(
                    workspace_id=workspace.id,
                    name=cat_data["name"],
                    type=cat_type
                ).first()
                if not parent:
                    parent = Category(
                        workspace_id=workspace.id,
                        name=cat_data["name"],
                        type=cat_type,
                        parent_id=None
                    )
                    db.session.add(parent)
                    db.session.flush()
                categories[cat_type].append(parent)

                # Create subcategories
                for subcat_name in cat_data["subcategories"]:
                    subcat = Category.query.filter_by(
                        workspace_id=workspace.id,
                        name=subcat_name,
                        type=cat_type
                    ).first()
                    if not subcat:
                        subcat = Category(
                            workspace_id=workspace.id,
                            name=subcat_name,
                            type=cat_type,
                            parent_id=parent.id
                        )
                        db.session.add(subcat)
                        db.session.flush()
                    categories[cat_type].append(subcat)

        # Create Sample Transactions
        print("💰 Membuat transaksi contoh...")

        # Check if transactions already exist
        existing_txns = Transaction.query.filter_by(workspace_id=workspace.id).count()
        if existing_txns == 0:
            # Income transactions
            income_txns = [
                {
                    "account": accounts[0],
                    "category": categories["INCOME"][0],  # Gaji
                    "amount": 15000000,
                    "days_ago": 5,
                    "description": "Gaji bulanan"
                },
                {
                    "account": accounts[0],
                    "category": categories["INCOME"][1],  # Freelance
                    "amount": 3000000,
                    "days_ago": 10,
                    "description": "Pembayaran proyek website"
                },
            ]

            for txn_data in income_txns:
                txn = Transaction(
                    workspace_id=workspace.id,
                    account_id=txn_data["account"].id,
                    category_id=txn_data["category"].id,
                    type="INCOME",
                    amount=Decimal(str(txn_data["amount"])),
                    transaction_date=datetime.now().date() - timedelta(days=txn_data["days_ago"]),
                    description=txn_data["description"]
                )
                db.session.add(txn)

            # Expense transactions
            expense_txns = [
                {"category": "Restoran", "amount": 150000, "days_ago": 1, "desc": "Makan malam bersama keluarga"},
                {"category": "Belanja Bulanan", "amount": 350000, "days_ago": 2, "desc": "Belanja mingguan"},
                {"category": "Bensin", "amount": 200000, "days_ago": 3, "desc": "Isi bensin"},
                {"category": "Listrik", "amount": 450000, "days_ago": 4, "desc": "Tagihan listrik bulanan"},
                {"category": "Internet", "amount": 350000, "days_ago": 4, "desc": "Langganan internet"},
                {"category": "Film", "amount": 100000, "days_ago": 6, "desc": "Tiket bioskop"},
                {"category": "Jajan", "amount": 75000, "days_ago": 7, "desc": "Kopi dan jajanan"},
                {"category": "Transportasi Umum", "amount": 50000, "days_ago": 8, "desc": "Isi ulang kartu transportasi"},
            ]

            for txn_data in expense_txns:
                # Find category by name
                category = next(
                    (c for c in categories["EXPENSE"] if c.name == txn_data["category"]),
                    categories["EXPENSE"][0]
                )

                txn = Transaction(
                    workspace_id=workspace.id,
                    account_id=random.choice(accounts).id,
                    category_id=category.id,
                    type="EXPENSE",
                    amount=Decimal(str(txn_data["amount"])),
                    transaction_date=datetime.now().date() - timedelta(days=txn_data["days_ago"]),
                    description=txn_data["desc"]
                )
                db.session.add(txn)

            # Transfer transaction
            transfer = Transaction(
                workspace_id=workspace.id,
                account_id=accounts[0].id,  # Dari BCA
                transfer_to_account_id=accounts[2].id,  # Ke Mandiri
                type="TRANSFER",
                amount=Decimal("2000000"),
                transaction_date=datetime.now().date() - timedelta(days=3),
                description="Transfer ke tabungan"
            )
            db.session.add(transfer)

        # Commit all changes
        db.session.commit()

        print("✅ Database berhasil di-seed!")
        print(f"\n📧 User test berhasil dibuat:")
        print(f"   Email: {test_email}")
        print(f"   Password: password123")
        print(f"\n🎉 Anda sekarang dapat login dan menjelajahi aplikasi!")


if __name__ == "__main__":
    seed_database()
