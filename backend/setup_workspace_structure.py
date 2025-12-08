"""Script to setup proper workspace structure for testing roles."""
from app import create_app, db
from app.models import User, Workspace, WorkspaceMember, Role

app = create_app()

with app.app_context():
    print("🔄 Setting up workspace structure for role testing...")

    # Get roles
    owner_role = Role.query.filter_by(name='Owner').first()
    admin_role = Role.query.filter_by(name='Admin').first()
    member_role = Role.query.filter_by(name='Member').first()
    viewer_role = Role.query.filter_by(name='Viewer').first()

    # Get users
    owner_user = User.query.filter_by(email='owner@test.com').first()
    admin_user = User.query.filter_by(email='admin@test.com').first()
    member_user = User.query.filter_by(email='member@test.com').first()
    viewer_user = User.query.filter_by(email='viewer@test.com').first()

    if not all([owner_user, admin_user, member_user, viewer_user]):
        print("❌ Test users belum dibuat! Jalankan create_test_users.py dulu")
        exit(1)

    # Create/Get Workspace 1 - Main workspace (semua role ada)
    ws1 = Workspace.query.filter_by(name='Main Workspace').first()
    if not ws1:
        ws1 = Workspace(name='Main Workspace')
        db.session.add(ws1)
        db.session.flush()
        print(f"✅ Workspace 'Main Workspace' dibuat (ID: {ws1.id})")

    # Create/Get Workspace 2 - Admin & Member workspace
    ws2 = Workspace.query.filter_by(name='Team Workspace').first()
    if not ws2:
        ws2 = Workspace(name='Team Workspace')
        db.session.add(ws2)
        db.session.flush()
        print(f"✅ Workspace 'Team Workspace' dibuat (ID: {ws2.id})")

    # Create/Get Workspace 3 - Owner only workspace
    ws3 = Workspace.query.filter_by(name='Owner Private Workspace').first()
    if not ws3:
        ws3 = Workspace(name='Owner Private Workspace')
        db.session.add(ws3)
        db.session.flush()
        print(f"✅ Workspace 'Owner Private Workspace' dibuat (ID: {ws3.id})")

    # Setup memberships
    memberships = [
        # Main Workspace - semua user
        (owner_user.id, ws1.id, owner_role.id, 'Owner di Main Workspace'),
        (admin_user.id, ws1.id, admin_role.id, 'Admin di Main Workspace'),
        (member_user.id, ws1.id, member_role.id, 'Member di Main Workspace'),
        (viewer_user.id, ws1.id, viewer_role.id, 'Viewer di Main Workspace'),

        # Team Workspace - hanya admin & member
        (admin_user.id, ws2.id, admin_role.id, 'Admin di Team Workspace'),
        (member_user.id, ws2.id, member_role.id, 'Member di Team Workspace'),

        # Owner Private Workspace - hanya owner
        (owner_user.id, ws3.id, owner_role.id, 'Owner di Owner Private Workspace'),
    ]

    for user_id, workspace_id, role_id, desc in memberships:
        existing = WorkspaceMember.query.filter_by(
            user_id=user_id,
            workspace_id=workspace_id
        ).first()

        if existing:
            if existing.role_id != role_id:
                existing.role_id = role_id
                print(f"🔄 Update: {desc}")
            else:
                print(f"ℹ️  {desc} - sudah ada")
        else:
            membership = WorkspaceMember(
                user_id=user_id,
                workspace_id=workspace_id,
                role_id=role_id
            )
            db.session.add(membership)
            print(f"✅ {desc}")

    db.session.commit()

    print("\n" + "="*70)
    print("✅ WORKSPACE STRUCTURE BERHASIL DIBUAT!")
    print("="*70)
    print("\n📊 STRUKTUR WORKSPACE:\n")

    print(f"1️⃣  Main Workspace (ID: {ws1.id})")
    print("   👥 Members:")
    print("      • Owner  : owner@test.com")
    print("      • Admin  : admin@test.com")
    print("      • Member : member@test.com")
    print("      • Viewer : viewer@test.com")
    print()

    print(f"2️⃣  Team Workspace (ID: {ws2.id})")
    print("   👥 Members:")
    print("      • Admin  : admin@test.com")
    print("      • Member : member@test.com")
    print("   ℹ️  Viewer TIDAK punya akses ke workspace ini")
    print()

    print(f"3️⃣  Owner Private Workspace (ID: {ws3.id})")
    print("   👥 Members:")
    print("      • Owner  : owner@test.com")
    print("   ℹ️  User lain TIDAK punya akses (kecuali Owner karena bisa lihat semua)")
    print()

    print("="*70)
    print("\n🧪 TESTING SCENARIO:\n")
    print("✅ Login sebagai OWNER:")
    print("   → Bisa lihat SEMUA 3 workspace")
    print("   → Punya akses penuh ke semua workspace")
    print()
    print("✅ Login sebagai ADMIN:")
    print("   → Hanya lihat 2 workspace (Main & Team)")
    print("   → Di Main: bisa manage accounts, categories, transactions, members")
    print("   → Di Team: sama seperti di Main")
    print()
    print("✅ Login sebagai MEMBER:")
    print("   → Hanya lihat 2 workspace (Main & Team)")
    print("   → Di kedua workspace: hanya bisa manage transactions")
    print("   → TIDAK bisa manage accounts/categories")
    print()
    print("✅ Login sebagai VIEWER:")
    print("   → Hanya lihat 1 workspace (Main saja)")
    print("   → View only - tidak bisa create/edit/delete apapun")
    print()
    print("="*70)
