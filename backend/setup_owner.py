"""Setup Owner (Superadmin) untuk aplikasi."""
import sys
from app import create_app, db, bcrypt
from app.models import User, Role

def setup_owner():
    """Create Owner/Superadmin user."""
    app = create_app()

    with app.app_context():
        try:
            # Check if Owner role exists
            owner_role = Role.query.filter_by(name='Owner').first()
            if not owner_role:
                owner_role = Role(name='Owner', description='Super Administrator - Pemilik Aplikasi')
                db.session.add(owner_role)
                db.session.flush()

            # Check if owner user already exists
            owner_email = 'owner@keuangan.app'
            existing_owner = User.query.filter_by(email=owner_email).first()

            if existing_owner:
                print(f"⚠️  Owner sudah ada: {owner_email}")
                response = input("Apakah ingin mereset password Owner? (y/n): ")
                if response.lower() == 'y':
                    new_password = input("Masukkan password baru: ")
                    existing_owner.hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
                    # Mark user as owner
                    existing_owner.is_owner = True
                    db.session.commit()
                    print(f"✅ Password Owner berhasil direset!")
                return

            # Create Owner user
            owner_password = input("Masukkan password untuk Owner (superadmin): ")
            if len(owner_password) < 6:
                print("❌ Password minimal 6 karakter!")
                return

            owner_user = User(
                email=owner_email,
                name='Owner',
                hashed_password=bcrypt.generate_password_hash(owner_password).decode('utf-8'),
                is_owner=True  # Flag khusus untuk Owner
            )
            db.session.add(owner_user)
            db.session.commit()

            print("\n" + "="*70)
            print("✅ OWNER (SUPERADMIN) BERHASIL DIBUAT!")
            print("="*70)
            print(f"\n📧 Email    : {owner_email}")
            print(f"🔑 Password : {owner_password}")
            print("\n⚠️  PENTING: Simpan kredensial ini dengan aman!")
            print("\n📝 Owner dapat:")
            print("   • Melihat SEMUA workspace dari semua user")
            print("   • Mengakses data workspace manapun")
            print("   • Mengelola seluruh sistem")
            print("="*70 + "\n")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    setup_owner()
