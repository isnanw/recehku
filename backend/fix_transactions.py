"""Fix transactions with NULL workspace_id."""
import os
from app import create_app
from app.models import Transaction, Account, db

app = create_app(os.getenv('FLASK_ENV', 'development'))

with app.app_context():
    # Find transactions with NULL workspace_id
    null_transactions = Transaction.query.filter(
        Transaction.workspace_id == None
    ).all()

    print(f"Found {len(null_transactions)} transactions with NULL workspace_id")

    for trans in null_transactions:
        print(f"\nTransaction ID: {trans.id}")
        print(f"  Account ID: {trans.account_id}")
        print(f"  Amount: {trans.amount}")
        print(f"  Date: {trans.date}")

        # Get workspace_id from account
        if trans.account_id:
            account = Account.query.get(trans.account_id)
            if account and account.workspace_id:
                print(f"  -> Setting workspace_id to {account.workspace_id}")
                trans.workspace_id = account.workspace_id
            else:
                print(f"  -> Account not found or has no workspace_id")
        else:
            print(f"  -> No account_id")

    # Commit changes
    try:
        db.session.commit()
        print(f"\n✓ Successfully updated {len(null_transactions)} transactions")
    except Exception as e:
        db.session.rollback()
        print(f"\n✗ Error updating transactions: {str(e)}")
