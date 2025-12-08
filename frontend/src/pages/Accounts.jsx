import { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePermissions } from '../context/PermissionsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWallet,
  faUniversity,
  faCreditCard,
  faMobileAlt,
  faPlus,
  faEdit,
  faTrash,
  faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import api from '../utils/api';

const Accounts = () => {
  const { currentWorkspace } = useWorkspace();
  const { can } = usePermissions();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Bank',
    initial_balance: '',
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchAccounts();
    }
  }, [currentWorkspace]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts', {
        params: { workspace_id: currentWorkspace.id },
      });
      setAccounts(response.data.accounts);
    } catch (error) {
      toast.error('Gagal memuat akun');
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const loadingToast = toast.loading(editingAccount ? 'Memperbarui akun...' : 'Membuat akun...');

    try {
      const payload = {
        workspace_id: currentWorkspace.id,
        name: formData.name,
        type: formData.type,
        initial_balance: parseFloat(formData.initial_balance) || 0,
      };

      if (editingAccount) {
        await api.put(`/accounts/${editingAccount.id}`, payload);
        toast.success('Akun berhasil diperbarui! 🎉', { id: loadingToast });
      } else {
        await api.post('/accounts', payload);
        toast.success('Akun berhasil dibuat! 🎉', { id: loadingToast });
      }

      setFormData({ name: '', type: 'Bank', initial_balance: '' });
      setShowModal(false);
      setEditingAccount(null);
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menyimpan akun', { id: loadingToast });
      console.error('Failed to save account:', error);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      initial_balance: account.initial_balance.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id, transactionCount) => {
    if (transactionCount > 0) {
      // Show info that account cannot be deleted
      await Swal.fire({
        title: 'Akun Sedang Digunakan',
        html: `
          <div class="text-left">
            <p class="mb-2">Akun ini tidak dapat dihapus karena:</p>
            <ul class="list-disc list-inside text-gray-700 mb-3">
              <li>Sudah digunakan dalam <strong>${transactionCount}</strong> transaksi</li>
            </ul>
            <p class="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
              💡 <strong>Tips:</strong> Hapus atau pindahkan transaksi terkait terlebih dahulu jika ingin menghapus akun ini.
            </p>
          </div>
        `,
        icon: 'info',
        confirmButtonColor: '#3B82F6',
        confirmButtonText: 'Mengerti',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Hapus Akun?',
      text: 'Tindakan ini tidak dapat dibatalkan!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      const loadingToast = toast.loading('Menghapus akun...');
      try {
        await api.delete(`/accounts/${id}`);
        toast.success('Akun berhasil dihapus!', { id: loadingToast });
        fetchAccounts();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Gagal menghapus akun', { id: loadingToast });
        console.error('Failed to delete account:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({ name: '', type: 'Bank', initial_balance: '' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'Bank':
        return faUniversity;
      case 'Cash':
        return faWallet;
      case 'E-Wallet':
        return faMobileAlt;
      default:
        return faCreditCard;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faWallet} className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Akun Keuangan</h1>
              <p className="text-blue-100 mt-2">Kelola semua akun dan saldo Anda</p>
            </div>
          </div>
          {can('create_account') && (
            <button
              onClick={() => setShowModal(true)}
              className="group w-full sm:w-auto px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} className="group-hover:rotate-90 transition-transform duration-300" />
              Tambah Akun
            </button>
          )}
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={editingAccount ? faEdit : faPlus} className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
              <p className="text-sm text-gray-500 mt-1">Kelola informasi akun keuangan Anda</p>
            </div>
          </div>
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faWallet} className="text-blue-600 text-xs" />
              </span>
              Nama Akun <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              placeholder="contoh: BCA Tabungan, MANDIRI, GoPay"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faUniversity} className="text-purple-600 text-xs" />
              </span>
              Tipe Akun <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              required
            >
              <option value="Bank">🏦 Bank</option>
              <option value="Cash">💵 Tunai</option>
              <option value="E-Wallet">📱 E-Wallet</option>
              <option value="Credit Card">💳 Kartu Kredit</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faMoneyBillWave} className="text-green-600 text-xs" />
              </span>
              Saldo Awal <span className="text-red-500">*</span>
            </label>
            <CurrencyInput
              value={formData.initial_balance}
              onChange={(value) => setFormData({ ...formData, initial_balance: value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold text-gray-900"
              placeholder="0"
              required
            />
            <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
              💡 Masukkan saldo awal akun ini
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={editingAccount ? faEdit : faPlus} />
              {editingAccount ? 'Perbarui Akun' : 'Buat Akun'}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
            >
              ✕ Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum ada akun</h3>
          <p className="text-gray-600 mb-6">Buat akun pertama Anda untuk mulai melacak keuangan</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tambah Akun
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="group bg-white rounded-3xl p-6 shadow-xl hover:shadow-3xl transition-all duration-300 border border-gray-100 transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                    <FontAwesomeIcon icon={getAccountIcon(account.type)} className="text-2xl text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{account.name}</h3>
                    <span className="inline-block px-3 py-1 mt-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg">{account.type}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs text-blue-600 font-semibold mb-2 uppercase tracking-wide">Saldo Saat Ini</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatCurrency(account.current_balance)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 shadow-sm">
                    <p className="text-xs text-green-600 font-medium mb-1">Pemasukan</p>
                    <p className="text-sm font-bold text-green-700">
                      {formatCurrency(account.total_income || 0)}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 shadow-sm">
                    <p className="text-xs text-red-600 font-medium mb-1">Pengeluaran</p>
                    <p className="text-sm font-bold text-red-700">
                      {formatCurrency(account.total_expense || 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 font-medium mb-1">Saldo Awal</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(account.initial_balance)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                {can('edit_account') && (
                  <button
                    onClick={() => handleEdit(account)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <FontAwesomeIcon icon={faEdit} /> Ubah
                  </button>
                )}
                {can('delete_account') && (
                  <div className="relative flex-1 group/delete">
                    <button
                      onClick={() => handleDelete(account.id, account.transaction_count)}
                      disabled={account.transaction_count > 0}
                    className={`w-full px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 ${
                      account.transaction_count > 0
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    <FontAwesomeIcon icon={faTrash} /> Hapus
                  </button>
                  {account.transaction_count > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 bg-gray-900 text-white text-xs rounded-2xl opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-2xl">
                      <div className="text-center">
                        <div className="font-bold">Akun Terpakai</div>
                        <div className="text-gray-300 mt-1">{account.transaction_count} transaksi</div>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Accounts;
