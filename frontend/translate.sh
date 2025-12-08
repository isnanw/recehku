#!/bin/bash

# Script untuk mengganti teks Inggris ke Bahasa Indonesia

cd /Volumes/Data/react/keuangan/frontend/src

# Register.jsx
sed -i '' "s/'Passwords do not match'/'Password tidak cocok'/g" pages/Register.jsx
sed -i '' "s/'Password must be at least 6 characters'/'Password harus minimal 6 karakter'/g" pages/Register.jsx
sed -i '' "s/Create Account/Buat Akun/g" pages/Register.jsx
sed -i '' "s/Start managing your finances today/Mulai kelola keuangan Anda hari ini/g" pages/Register.jsx
sed -i '' "s/Full Name/Nama Lengkap/g" pages/Register.jsx
sed -i '' "s/John Doe/Nama Anda/g" pages/Register.jsx
sed -i '' "s/you@example.com/anda@contoh.com/g" pages/Register.jsx
sed -i '' "s/Confirm Password/Konfirmasi Password/g" pages/Register.jsx
sed -i '' "s/'Creating Account...'/'Membuat akun...'/g" pages/Register.jsx
sed -i '' "s/'Sign Up'/'Daftar'/g" pages/Register.jsx
sed -i '' "s/Already have an account?/Sudah punya akun?/g" pages/Register.jsx
sed -i '' "s/>Sign in</>Masuk</g" pages/Register.jsx

# Dashboard.jsx
sed -i '' "s/Dashboard/Dasbor/g" pages/Dashboard.jsx
sed -i '' "s/Total Balance/Total Saldo/g" pages/Dashboard.jsx
sed -i '' "s/Total Income/Total Pemasukan/g" pages/Dashboard.jsx
sed -i '' "s/Total Expenses/Total Pengeluaran/g" pages/Dashboard.jsx
sed -i '' "s/Expense Breakdown/Rincian Pengeluaran/g" pages/Dashboard.jsx
sed -i '' "s/No expense data available/Tidak ada data pengeluaran/g" pages/Dashboard.jsx
sed -i '' "s/'Failed to load dashboard data'/'Gagal memuat data dasbor'/g" pages/Dashboard.jsx

# Accounts.jsx
sed -i '' "s/Accounts/Akun/g" pages/Accounts.jsx
sed -i '' "s/Add Account/Tambah Akun/g" pages/Accounts.jsx
sed -i '' "s/Account Name/Nama Akun/g" pages/Accounts.jsx
sed -i '' "s/Account Type/Tipe Akun/g" pages/Accounts.jsx
sed -i '' "s/Initial Balance/Saldo Awal/g" pages/Accounts.jsx
sed -i '' "s/Current Balance/Saldo Saat Ini/g" pages/Accounts.jsx
sed -i '' "s/Create Account/Buat Akun/g" pages/Accounts.jsx
sed -i '' "s/Edit Account/Edit Akun/g" pages/Accounts.jsx
sed -i '' "s/Update Account/Perbarui Akun/g" pages/Accounts.jsx
sed -i '' "s/Delete Account/Hapus Akun/g" pages/Accounts.jsx
sed -i '' "s/'Failed to load accounts'/'Gagal memuat akun'/g" pages/Accounts.jsx
sed -i '' "s/'Failed to create account'/'Gagal membuat akun'/g" pages/Accounts.jsx
sed -i '' "s/'Failed to update account'/'Gagal memperbarui akun'/g" pages/Accounts.jsx
sed -i '' "s/'Failed to delete account'/'Gagal menghapus akun'/g" pages/Accounts.jsx
sed -i '' "s/My Savings Account/Akun Tabungan Saya/g" pages/Accounts.jsx
sed -i '' "s/No accounts yet/Belum ada akun/g" pages/Accounts.jsx
sed -i '' "s/Create your first account to get started/Buat akun pertama Anda untuk memulai/g" pages/Accounts.jsx
sed -i '' "s/Cancel/Batal/g" pages/Accounts.jsx
sed -i '' "s/Enter account name/Masukkan nama akun/g" pages/Accounts.jsx

# Categories.jsx
sed -i '' "s/Categories/Kategori/g" pages/Categories.jsx
sed -i '' "s/Add Category/Tambah Kategori/g" pages/Categories.jsx
sed -i '' "s/Category Name/Nama Kategori/g" pages/Categories.jsx
sed -i '' "s/Category Type/Tipe Kategori/g" pages/Categories.jsx
sed -i '' "s/Parent Category/Kategori Induk/g" pages/Categories.jsx
sed -i '' "s/None (Top Level)/Tidak Ada (Level Atas)/g" pages/Categories.jsx
sed -i '' "s/Create Category/Buat Kategori/g" pages/Categories.jsx
sed -i '' "s/Edit Category/Edit Kategori/g" pages/Categories.jsx
sed -i '' "s/Update Category/Perbarui Kategori/g" pages/Categories.jsx
sed -i '' "s/Delete Category/Hapus Kategori/g" pages/Categories.jsx
sed -i '' "s/'Failed to load categories'/'Gagal memuat kategori'/g" pages/Categories.jsx
sed -i '' "s/'Failed to create category'/'Gagal membuat kategori'/g" pages/Categories.jsx
sed -i '' "s/'Failed to update category'/'Gagal memperbarui kategori'/g" pages/Categories.jsx
sed -i '' "s/'Failed to delete category'/'Gagal menghapus kategori'/g" pages/Categories.jsx
sed -i '' "s/No categories yet/Belum ada kategori/g" pages/Categories.jsx
sed -i '' "s/Create your first category to organize transactions/Buat kategori pertama untuk mengatur transaksi/g" pages/Categories.jsx
sed -i '' "s/Enter category name/Masukkan nama kategori/g" pages/Categories.jsx

# Transactions.jsx
sed -i '' "s/Transactions/Transaksi/g" pages/Transactions.jsx
sed -i '' "s/Add Transaction/Tambah Transaksi/g" pages/Transactions.jsx
sed -i '' "s/Transaction Type/Tipe Transaksi/g" pages/Transactions.jsx
sed -i '' "s/Amount/Jumlah/g" pages/Transactions.jsx
sed -i '' "s/Date/Tanggal/g" pages/Transactions.jsx
sed -i '' "s/Description/Deskripsi/g" pages/Transactions.jsx
sed -i '' "s/Account/Akun/g" pages/Transactions.jsx
sed -i '' "s/Category/Kategori/g" pages/Transactions.jsx
sed -i '' "s/Transfer To/Transfer Ke/g" pages/Transactions.jsx
sed -i '' "s/Create Transaction/Buat Transaksi/g" pages/Transactions.jsx
sed -i '' "s/Edit Transaction/Edit Transaksi/g" pages/Transactions.jsx
sed -i '' "s/Update Transaction/Perbarui Transaksi/g" pages/Transactions.jsx
sed -i '' "s/Delete Transaction/Hapus Transaksi/g" pages/Transactions.jsx
sed -i '' "s/Select account/Pilih akun/g" pages/Transactions.jsx
sed -i '' "s/Select category/Pilih kategori/g" pages/Transactions.jsx
sed -i '' "s/Select destination account/Pilih akun tujuan/g" pages/Transactions.jsx
sed -i '' "s/'Failed to load transactions'/'Gagal memuat transaksi'/g" pages/Transactions.jsx
sed -i '' "s/'Failed to create transaction'/'Gagal membuat transaksi'/g" pages/Transactions.jsx
sed -i '' "s/'Failed to delete transaction'/'Gagal menghapus transaksi'/g" pages/Transactions.jsx
sed -i '' "s/No transactions yet/Belum ada transaksi/g" pages/Transactions.jsx
sed -i '' "s/Start by adding your first transaction/Mulai dengan menambahkan transaksi pertama/g" pages/Transactions.jsx
sed -i '' "s/Filter by type/Filter berdasarkan tipe/g" pages/Transactions.jsx
sed -i '' "s/All Types/Semua Tipe/g" pages/Transactions.jsx
sed -i '' "s/Enter description/Masukkan deskripsi/g" pages/Transactions.jsx
sed -i '' "s/Optional/Opsional/g" pages/Transactions.jsx

# Layout.jsx
sed -i '' "s/Select Workspace/Pilih Workspace/g" components/Layout.jsx
sed -i '' "s/Logout/Keluar/g" components/Layout.jsx

echo "✅ Semua teks frontend berhasil diterjemahkan!"
