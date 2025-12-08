"""Script to create test users with different roles."""
from app import create_app, db
from app.models import User, Workspace, WorkspaceMember, Role
from flask_bcrypt import Bcrypt

app = create_app()
bcrypt = Bcrypt(app)

with app.app_context():
    # Clear existing test data (optional)
    print("🔄 Membuat test users...")

    # Get or create roles
    owner_role = Role.query.filter_by(name='Owner').first()
    admin_role = Role.query.filter_by(name='Admin').first()
    member_role = Role.query.filter_by(name='Member').first()
    viewer_role = Role.query.filter_by(name='Viewer').first()

    if not all([owner_role, admin_role, member_role, viewer_role]):
        print("❌ Roles belum dibuat! Jalankan script create_roles.py terlebih dahulu")
        exit(1)

    # Create test users
    test_users = [
        {
            'email': 'owner@test.com',
            'password': 'password123',
            'name': 'Test Owner',
            'role': owner_role
        },
        {
            'email': 'admin@test.com',
            'password': 'password123',
            'name': 'Test Admin',
            'role': admin_role
        },
        {
            'email': 'member@test.com',
            'password': 'password123',
            'name': 'Test Member',
            'role': member_role
        },
        {
            'email': 'viewer@test.com',
            'password': 'password123',
            'name': 'Test Viewer',
            'role': viewer_role
        }
    ]

    # Get or create test workspace
    workspace = Workspace.query.filter_by(name='Test Workspace').first()
    if not workspace:
        workspace = Workspace(name='Test Workspace')
        db.session.add(workspace)
        db.session.flush()
        print(f"✅ Workspace 'Test Workspace' dibuat (ID: {workspace.id})")
    else:
        print(f"ℹ️  Workspace 'Test Workspace' sudah ada (ID: {workspace.id})")

    created_users = []

    for user_data in test_users:
        # Check if user exists
        existing_user = User.query.filter_by(email=user_data['email']).first()

        if existing_user:
            user = existing_user
            print(f"ℹ️  User {user_data['email']} sudah ada")
        else:
            # Create new user
            hashed_password = bcrypt.generate_password_hash(user_data['password']).decode('utf-8')
            user = User(
                email=user_data['email'],
                hashed_password=hashed_password,
                name=user_data['name']
            )
            db.session.add(user)
            db.session.flush()
            print(f"✅ User {user_data['email']} dibuat")

        # Check if already member of workspace
        existing_membership = WorkspaceMember.query.filter_by(
            user_id=user.id,
            workspace_id=workspace.id
        ).first()

        if existing_membership:
            # Update role if different
            if existing_membership.role_id != user_data['role'].id:
                existing_membership.role_id = user_data['role'].id
                print(f"🔄 Role {user_data['email']} diupdate ke {user_data['role'].name}")
            else:
                print(f"ℹ️  {user_data['email']} sudah menjadi {user_data['role'].name}")
        else:
            # Add to workspace with role
            membership = WorkspaceMember(
                user_id=user.id,
                workspace_id=workspace.id,
                role_id=user_data['role'].id
            )
            db.session.add(membership)
            print(f"✅ {user_data['email']} ditambahkan sebagai {user_data['role'].name}")

        created_users.append({
            'email': user_data['email'],
            'password': user_data['password'],
            'name': user_data['name'],
            'role': user_data['role'].name
        })

    db.session.commit()

    print("\n" + "="*60)
    print("✅ TEST USERS BERHASIL DIBUAT!")
    print("="*60)
    print(f"\n📌 Workspace: Test Workspace (ID: {workspace.id})\n")
    print("👥 Login Credentials:\n")

    for user in created_users:
        print(f"   {user['role'].upper()}")
        print(f"   📧 Email    : {user['email']}")
        print(f"   🔑 Password : {user['password']}")
        print(f"   👤 Name     : {user['name']}")
        print(f"   🎭 Role     : {user['role']}")
        print()

    print("="*60)
    print("\n📝 PERMISSION SUMMARY:\n")
    print("   🟣 OWNER:")
    print("      • Full access ke semua workspace")
    print("      • Dapat manage semua data")
    print()
    print("   🔵 ADMIN:")
    print("      • Manage accounts, categories, transactions")
    print("      • Add/remove members")
    print("      • Cannot delete workspace")
    print()
    print("   🟢 MEMBER:")
    print("      • Create/edit/delete transactions")
    print("      • View dashboard & analytics")
    print("      • Cannot manage accounts/categories")
    print()
    print("   ⚪ VIEWER:")
    print("      • View only mode")
    print("      • Cannot create/edit/delete anything")
    print()
    print("="*60)
    print("\n🚀 Silakan login dengan salah satu akun di atas untuk testing!")
    print("   Backend: http://127.0.0.1:5000")
    print("   Frontend: http://localhost:3000")
    print()
