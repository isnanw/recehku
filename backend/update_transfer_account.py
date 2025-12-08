"""Script untuk update transaksi dari akun Transfer ke Rekening Mandiri Utama."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from app.models import Account, Transaction

def update_transfer_accounts():
    """Update all transactions using 'Transfer' account to 'Rekening Mandiri Utama'."""
    app = create_app()
    
    with app.app_context():
        # Cari akun Transfer
        transfer_account = Account.query.filter_by(name='Transfer').first()
        
        if not transfer_account:
            print("❌ Akun 'Transfer' tidak ditemukan!")
            return
        
        # Cari atau buat akun Rekening Mandiri Utama
        mandiri_account = Account.query.filter_by(
            workspace_id=transfer_account.workspace_id,
            name='Rekening Mandiri Utama'
        ).first()
        
        if not mandiri_account:
            # Buat akun baru
            mandiri_account = Account(
                workspace_id=transfer_account.workspace_id,
                name='Rekening Mandiri Utama',
                type='BANK',
                initial_balance=0
            )
            db.session.add(mandiri_account)
            db.session.commit()
            print(f"✓ Akun 'Rekening Mandiri Utama' berhasil dibuat")
        
        # Update transaksi yang menggunakan Transfer sebagai account_id
        transactions_updated = Transaction.query.filter_by(
            account_id=transfer_account.id
        ).update({Transaction.account_id: mandiri_account.id})
        
        # Update transaksi yang menggunakan Transfer sebagai transfer_to_account_id
        transfer_transactions_updated = Transaction.query.filter_by(
            transfer_to_account_id=transfer_account.id
        ).update({Transaction.transfer_to_account_id: mandiri_account.id})
        
        db.session.commit()
        
        total_updated = transactions_updated + transfer_transactions_updated
        
        print("\n" + "="*60)
        print("📊 HASIL UPDATE")
        print("="*60)
        print(f"  Transaksi diupdate (account_id)          : {transactions_updated}")
        print(f"  Transaksi diupdate (transfer_to_account) : {transfer_transactions_updated}")
        print(f"  Total transaksi diupdate                 : {total_updated}")
        print("="*60)
        
        # Hapus akun Transfer jika sudah tidak ada transaksi
        remaining = Transaction.query.filter(
            (Transaction.account_id == transfer_account.id) |
            (Transaction.transfer_to_account_id == transfer_account.id)
        ).count()
        
        if remaining == 0:
            db.session.delete(transfer_account)
            db.session.commit()
            print(f"\n✅ Akun 'Transfer' berhasil dihapus (tidak ada transaksi tersisa)")
        else:
            print(f"\n⚠️  Masih ada {remaining} transaksi menggunakan akun Transfer")
        
        print("\n✨ UPDATE SELESAI! ✨\n")

if __name__ == '__main__':
    update_transfer_accounts()
