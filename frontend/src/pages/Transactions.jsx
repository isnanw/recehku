import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave,
  faArrowUp,
  faArrowDown,
  faArrowRight,
  faExchangeAlt,
  faCalendarAlt,
  faSearch,
  faFilter,
  faRotateRight,
  faList,
  faEdit,
  faTrash,
  faPlus,
  faInbox,
  faEllipsisVertical,
  faMoneyBillTransfer,
  faDollarSign,
  faStickyNote
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Select from 'react-select';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import api from '../utils/api';
import { DateRangePicker } from 'react-date-range';
import { id } from 'date-fns/locale';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

const Transaksi = () => {
  const { currentWorkspace } = useWorkspace();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    account_id: '',
    transfer_to_account_id: '',
    category_id: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  // Filter state - Default to current month
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const lastDayFormatted = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    return {
      start_date: firstDay,
      end_date: lastDayFormatted,
      type: '',
      account_id: '',
    };
  });

  // Date range state for picker - Default to current month
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return [{
      startDate: firstDay,
      endDate: lastDay,
      key: 'selection'
    }];
  });
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Month tabs state (default to current month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDateRangePicker && !event.target.closest('.date-range-picker-wrapper')) {
        setShowDateRangePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateRangePicker]);

  // Fetch only transactions (fast, used when switching month/filter)
  const fetchTransactions = useCallback(async (overrideFilters = null) => {
    try {
      setTableLoading(true);
      const params = { workspace_id: currentWorkspace.id, ...(overrideFilters || filters) };
      const txnRes = await api.get('/transactions', { params });
      setTransactions(txnRes.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setTableLoading(false);
    }
  }, [currentWorkspace?.id, filters]);

  // Fetch all data (transactions + accounts + categories). Used on workspace switch and after create/delete.
  const fetchAllData = async (overrideFilters = null) => {
    try {
      setLoading(true);
      const params = { workspace_id: currentWorkspace.id, ...(overrideFilters || filters) };
      const [txnRes, accRes, catRes] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/accounts', { params: { workspace_id: currentWorkspace.id } }),
        api.get('/categories', { params: { workspace_id: currentWorkspace.id } }),
      ]);

      setTransactions(txnRes.data.transactions);
      setAccounts(accRes.data.accounts);
      setCategories(catRes.data.categories);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to compute start/end ISO dates for a month
  const getMonthRange = (year, monthIndex) => {
    // Use local date components to avoid UTC timezone shifts when using toISOString()
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const pad = (n) => String(n).padStart(2, '0');
    const toLocalDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { start: toLocalDate(start), end: toLocalDate(end) };
  };

  // When selectedMonth changes, update filters and fetch data
  useEffect(() => {
    if (!currentWorkspace) return;
    const { start, end } = getMonthRange(selectedMonth.year, selectedMonth.month);
    const newFilters = { ...filters, start_date: start, end_date: end };
    setFilters(newFilters);
    // Pass override filters to avoid waiting for setFilters to settle
    fetchTransactions(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, currentWorkspace]);

  // Month labels and handler
  const months = Array.from({ length: 12 }, (_, i) => ({
    index: i,
    label: new Date(selectedMonth.year, i, 1).toLocaleString('id-ID', { month: 'short' })
  }));

  const handleSelectMonth = (monthIndex) => {
    setSelectedMonth((prev) => ({ year: prev.year, month: monthIndex }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const toastId = toast.loading(editingId ? 'Memperbarui transaksi...' : 'Menambahkan transaksi...');

    try {
      // Preserve current scroll position so we can restore it after refreshing data
      const prevScroll = typeof window !== 'undefined' ? window.scrollY : 0;
      const payload = {
        workspace_id: currentWorkspace.id,
        type: formData.type,
        account_id: parseInt(formData.account_id),
        amount: parseFloat(formData.amount),
        transaction_date: formData.transaction_date,
        description: formData.description,
      };

      if (formData.type === 'TRANSFER') {
        payload.transfer_to_account_id = parseInt(formData.transfer_to_account_id);
      } else {
        payload.category_id = parseInt(formData.category_id);
      }

      if (editingId) {
        await api.put(`/transactions/${editingId}`, payload);
        toast.success('Transaksi berhasil diperbarui!', { id: toastId });
      } else {
        await api.post('/transactions', payload);
        toast.success('Transaksi berhasil ditambahkan!', { id: toastId });
      }

      // Reset form
      setFormData({
        type: 'EXPENSE',
        account_id: '',
        transfer_to_account_id: '',
        category_id: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
      });

      setShowModal(false);
      setEditingId(null);
      // Await data refresh then restore scroll position to where the user was
      await fetchAllData();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast.error(error.response?.data?.error || 'Gagal menyimpan transaksi', { id: toastId });
    }
  };

  const handleEdit = (transaction) => {
    setFormData({
      type: transaction.type,
      account_id: transaction.account?.id ? transaction.account.id.toString() : transaction.account_id?.toString() || '',
      transfer_to_account_id: transaction.transfer_to_account?.id ? transaction.transfer_to_account.id.toString() : transaction.transfer_to_account_id?.toString() || '',
      category_id: transaction.category?.id ? transaction.category.id.toString() : transaction.category_id?.toString() || '',
      amount: transaction.amount ? transaction.amount.toString() : '',
      transaction_date: transaction.transaction_date || new Date().toISOString().split('T')[0],
      description: transaction.description || '',
    });
    setEditingId(transaction.id);
    setShowModal(true);
  };

  const handleCancelEdit = () => {
    setFormData({
      type: 'EXPENSE',
      account_id: '',
      transfer_to_account_id: '',
      category_id: '',
      amount: '',
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setEditingId(null);
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Transaksi?',
      text: 'Transaksi ini akan dihapus permanen',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading('Menghapus transaksi...');

    try {
      // Preserve scroll position
      const prevScroll = typeof window !== 'undefined' ? window.scrollY : 0;
      await api.delete(`/transactions/${id}`);
      toast.success('Transaksi berhasil dihapus!', { id: toastId });
      await fetchAllData();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || 'Gagal menghapus transaksi';
      toast.error(errorMsg, { id: toastId });
    }
  };

  const applyFilters = () => {
    fetchTransactions();
  };

  const resetFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      type: '',
      account_id: '',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'INCOME':
        return 'bg-green-100 text-green-800';
      case 'EXPENSE':
        return 'bg-red-100 text-red-800';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredCategories = () => {
    if (!categories || !Array.isArray(categories)) return [];
    return categories.filter((cat) => {
      if (formData.type === 'TRANSFER') return false;
      return cat.type === formData.type;
    });
  };

  // Format categories for react-select with hierarchical display
  const formatCategoriesForSelect = () => {
    const filtered = getFilteredCategories();

    // Group by parent
    const parentCategories = filtered.filter(cat => !cat.parent_id);
    const childCategories = filtered.filter(cat => cat.parent_id);

    const options = [];

    // Add parent categories
    parentCategories.forEach(parent => {
      // Check if this parent has children
      const children = childCategories.filter(child => child.parent_id === parent.id);
      const hasChildren = children.length > 0;

      options.push({
        value: parent.id,
        label: parent.name,
        isParent: true,
        isDisabled: hasChildren // Disable if has children
      });

      // Add children of this parent
      children.forEach(child => {
        options.push({
          value: child.id,
          label: `  ↳ ${child.name}`,
          isChild: true,
          parent: parent.name
        });
      });
    });

    // Add categories without parent that aren't parents themselves
    const orphans = filtered.filter(cat =>
      !cat.parent_id &&
      !childCategories.some(child => child.parent_id === cat.id)
    );

    return options;
  };

  // Custom filter untuk pencarian kategori
  // Jika search cocok dengan parent → tampilkan parent + semua children
  // Jika search cocok dengan child → tampilkan parent + child yang cocok
  const filterCategoryOption = (option, inputValue) => {
    if (!inputValue) return true;

    const searchText = inputValue.toLowerCase();
    const optionLabel = option.label.toLowerCase().replace(/^\s*↳\s*/, ''); // Remove arrow prefix

    // Jika option ini cocok langsung
    if (optionLabel.includes(searchText)) {
      return true;
    }

    // Jika ini parent, cek apakah ada child yang cocok
    if (option.data.isParent) {
      const allOptions = formatCategoriesForSelect();
      const hasMatchingChild = allOptions.some(opt =>
        opt.isChild &&
        opt.parent === option.label &&
        opt.label.toLowerCase().replace(/^\s*↳\s*/, '').includes(searchText)
      );
      return hasMatchingChild;
    }

    // Jika ini child, cek apakah parentnya cocok
    if (option.data.isChild && option.data.parent) {
      return option.data.parent.toLowerCase().includes(searchText);
    }

    return false;
  };

  // Custom styles for react-select
  const selectStyles = {
    control: (base) => ({
      ...base,
      borderColor: '#e5e7eb',
      borderWidth: '2px',
      borderRadius: '0.75rem',
      padding: '0.25rem',
      '&:hover': {
        borderColor: '#3b82f6'
      },
      '&:focus': {
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
      }
    }),
    option: (base, { data, isSelected, isFocused, isDisabled }) => ({
      ...base,
      backgroundColor: isDisabled
        ? '#f3f4f6'
        : isSelected
        ? '#3b82f6'
        : isFocused
        ? '#eff6ff'
        : 'white',
      color: isDisabled
        ? '#9ca3af'
        : isSelected
        ? 'white'
        : data.isChild
        ? '#6b7280'
        : '#111827',
      fontWeight: data.isParent ? '600' : data.isChild ? '400' : '500',
      padding: '0.75rem 1rem',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      '&:active': {
        backgroundColor: isDisabled ? '#f3f4f6' : '#3b82f6'
      }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      marginTop: '0.5rem'
    }),
    menuList: (base) => ({
      ...base,
      padding: '0.5rem'
    })
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  // Change page without forcing scroll.
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Premium Header */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faList} className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Transaksi</h1>
              <p className="text-blue-100 mt-2">Kelola semua transaksi keuangan Anda</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="group w-full sm:w-auto px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} className="group-hover:rotate-90 transition-transform duration-300" />
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Transaction Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCancelEdit}
        title={
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={editingId ? faEdit : faPlus} className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{editingId ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}</h3>
              <p className="text-sm text-gray-500 mt-1">Lengkapi form di bawah dengan detail transaksi</p>
            </div>
          </div>
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipe */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FontAwesomeIcon icon={faFilter} className="text-blue-600 text-xs" />
                  </span>
                  Tipe Transaksi <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, category_id: '' })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  required
                >
                  <option value="EXPENSE">Pengeluaran</option>
                  <option value="INCOME">Pemasukan</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              {/* Jumlah */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-green-600 text-xs" />
                  </span>
                  Jumlah <span className="text-red-500">*</span>
                </label>
                <CurrencyInput
                  value={formData.amount}
                  onChange={(value) => setFormData({ ...formData, amount: value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold text-gray-900"
                  placeholder="0"
                  required
                />
              </div>

              {/* Dari Akun */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-purple-600 text-xs" />
                  </span>
                  {formData.type === 'TRANSFER' ? 'Dari Akun' : 'Akun'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  required
                >
                  <option value="">Pilih Akun</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ke Akun (untuk TRANSFER) */}
              {formData.type === 'TRANSFER' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <FontAwesomeIcon icon={faExchangeAlt} className="text-indigo-600 text-xs" />
                    </span>
                    Ke Akun <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.transfer_to_account_id}
                    onChange={(e) => setFormData({ ...formData, transfer_to_account_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                    required
                  >
                    <option value="">Pilih Akun Tujuan</option>
                    {accounts
                      .filter((acc) => acc.id !== parseInt(formData.account_id))
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.current_balance)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Kategori (untuk INCOME/EXPENSE) */}
              {formData.type !== 'TRANSFER' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-pink-100 flex items-center justify-center">
                      <FontAwesomeIcon icon={faList} className="text-pink-600 text-xs" />
                    </span>
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formatCategoriesForSelect().find(opt => opt.value === parseInt(formData.category_id)) || null}
                    onChange={(selected) => setFormData({ ...formData, category_id: selected ? selected.value.toString() : '' })}
                    options={formatCategoriesForSelect()}
                    styles={selectStyles}
                    placeholder="Pilih Kategori..."
                    isSearchable
                    isClearable
                    filterOption={filterCategoryOption}
                    noOptionsMessage={() => "Kategori tidak ditemukan"}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Tanggal */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-yellow-600 text-xs" />
                  </span>
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faStickyNote} className="text-gray-600 text-xs" />
                </span>
                Deskripsi (Opsional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium resize-none"
                rows="3"
                placeholder="Tambahkan catatan atau detail transaksi..."
              ></textarea>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={editingId ? faEdit : faPlus} />
                {editingId ? 'Perbarui Transaksi' : 'Buat Transaksi'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
              >
                ✕ Batal
              </button>
            </div>
          </form>
      </Modal>

      {/* Premium Filter Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
        <div
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-2xl"
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faSearch} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Filter & Pencarian</h3>
              <p className="text-sm text-gray-500">Temukan transaksi dengan cepat</p>
            </div>
          </div>
          <button className="text-gray-500 hover:text-blue-600 transition-colors">
            <FontAwesomeIcon
              icon={isFilterExpanded ? faRotateRight : faFilter}
              className={`text-xl transition-transform duration-300 ${isFilterExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <div className={`transition-all duration-300 ${isFilterExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative date-range-picker-wrapper z-[100]">
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500" />
              Rentang Tanggal
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={
                  dateRange[0].startDate && dateRange[0].endDate
                    ? `${dayjs(dateRange[0].startDate).format('DD MMM YYYY')} - ${dayjs(dateRange[0].endDate).format('DD MMM YYYY')}`
                    : ''
                }
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                placeholder="Pilih rentang tanggal"
                className="input-field cursor-pointer pr-10"
              />
              <FontAwesomeIcon
                icon={faCalendarAlt}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
            {showDateRangePicker && (
              <div className="absolute z-[9999] mt-2 bg-white rounded-lg shadow-xl border border-gray-200">
                <DateRangePicker
                  ranges={dateRange}
                  onChange={(item) => {
                    setDateRange([item.selection]);
                    if (item.selection.startDate && item.selection.endDate) {
                      setFilters({
                        ...filters,
                        start_date: dayjs(item.selection.startDate).format('YYYY-MM-DD'),
                        end_date: dayjs(item.selection.endDate).format('YYYY-MM-DD'),
                      });
                    }
                  }}
                  locale={id}
                  moveRangeOnFirstSelection={false}
                  months={2}
                  direction="horizontal"
                  rangeColors={['#3b82f6']}
                />
                <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange([{ startDate: null, endDate: null, key: 'selection' }]);
                      setFilters({
                        ...filters,
                        start_date: '',
                        end_date: '',
                      });
                      setShowDateRangePicker(false);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDateRangePicker(false)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
              Tipe
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input-field"
            >
              <option value="">Semua Tipe</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <FontAwesomeIcon icon={faMoneyBillWave} className="text-gray-500" />
              Akun
            </label>
            <select
              value={filters.account_id}
              onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}
              className="input-field"
            >
              <option value="">Semua Akun</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={applyFilters}
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faSearch} className="group-hover:scale-110 transition-transform" />
            Terapkan Filter
          </button>
          <button
            onClick={resetFilters}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faRotateRight} className="hover:rotate-180 transition-transform duration-500" />
            Reset Filter
          </button>
        </div>
          </div>
        </div>
      </div>

      {/* Riwayat Transaksi */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 hover:shadow-3xl transition-all duration-300">
        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <FontAwesomeIcon icon={faList} className="text-xl text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h2>
            <p className="text-sm text-gray-500 mt-1">Kelola semua transaksi keuangan Anda</p>
          </div>
          <span className="text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2 rounded-xl shadow-sm border border-gray-200">
            Total: <span className="text-blue-600">{transactions.length}</span>
          </span>
        </div>

        {/* Month Tabs - pilih bulan dengan navigasi tahun */}
        <div className="mt-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-700">Pilih Periode</h3>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
                <button
                  onClick={() => setSelectedMonth(prev => ({ ...prev, year: prev.year - 1 }))}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                  title="Tahun sebelumnya"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-bold text-gray-800 min-w-[60px] text-center">
                  {selectedMonth.year}
                </span>
                <button
                  onClick={() => setSelectedMonth(prev => ({ ...prev, year: prev.year + 1 }))}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                  title="Tahun berikutnya"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth({ year: now.getFullYear(), month: now.getMonth() });
                }}
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                Bulan Ini
              </button>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(selectedMonth.year, selectedMonth.month, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {months.map((m) => (
              <button
                key={m.index}
                onClick={() => handleSelectMonth(m.index)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${selectedMonth.month === m.index ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {transactions.length === 0 && !tableLoading ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faInbox} className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Belum ada transaksi</p>
            <p className="text-gray-400 text-sm mt-2">Klik tombol &quot;Tambah Transaksi&quot; untuk memulai</p>
          </div>
        ) : (
          <>
            {/* Tampilan Desktop - Table */}
            <div className="hidden lg:block overflow-visible relative">
              {tableLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600">Memuat data...</p>
                  </div>
                </div>
              )}
              <div className={`overflow-x-auto rounded-2xl border border-gray-200 shadow-md transition-opacity duration-200 ${tableLoading ? 'opacity-50' : 'opacity-100'}`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-white text-sm" />
                        </div>
                        Tanggal
                      </div>
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-sm">
                          <FontAwesomeIcon icon={faFilter} className="text-white text-sm" />
                        </div>
                        Tipe
                      </div>
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm">
                          <FontAwesomeIcon icon={faMoneyBillWave} className="text-white text-sm" />
                        </div>
                        Akun
                      </div>
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-sm">
                          <FontAwesomeIcon icon={faList} className="text-white text-sm" />
                        </div>
                        Detail
                      </div>
                    </th>
                    <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Jumlah
                    </th>
                    <th className="px-6 py-5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentTransactions.map((txn) => (
                    <tr key={txn.id} className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 hover:shadow-md">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 shadow-sm group-hover:shadow-md transition-all">
                            {new Date(txn.transaction_date).toLocaleDateString('id-ID', { day: '2-digit' })}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {new Date(txn.transaction_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-4 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-sm ${getTypeColor(txn.type)} group-hover:scale-105 transition-transform`}>
                          {txn.type === 'INCOME' && <><FontAwesomeIcon icon={faArrowUp} className="animate-bounce-slow" /> Pemasukan</>}
                          {txn.type === 'EXPENSE' && <><FontAwesomeIcon icon={faArrowDown} className="animate-bounce-slow" /> Pengeluaran</>}
                          {txn.type === 'TRANSFER' && <><FontAwesomeIcon icon={faExchangeAlt} /> Transfer</>}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-semibold text-gray-900">{txn.account?.name}</div>
                        {txn.transfer_to_account && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <FontAwesomeIcon icon={faArrowRight} className="text-blue-500" /> {txn.transfer_to_account.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="space-y-1">
                          {txn.category && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                {txn.category.name}
                              </span>
                            </div>
                          )}
                          {txn.description && (
                            <div className="text-gray-600 text-xs line-clamp-2">
                              {txn.description}
                            </div>
                          )}
                          {!txn.category && !txn.description && (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className={`text-base font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1 shadow-sm ${txn.type === 'INCOME' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} group-hover:scale-105 transition-transform`}>
                          {txn.type === 'INCOME' ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <div className="inline-block">
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const spaceAbove = rect.top;

                              // Calculate position
                              const top = spaceBelow < 120 && spaceAbove > 120
                                ? rect.top - 100
                                : rect.bottom + 5;

                              setDropdownPosition({
                                top,
                                left: rect.right - 160
                              });
                              setOpenDropdown(openDropdown === txn.id ? null : txn.id);
                            }}
                            className="p-2.5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 text-gray-600 hover:text-blue-600 hover:shadow-md transform hover:scale-110"
                            title="Menu"
                          >
                            <FontAwesomeIcon icon={faEllipsisVertical} />
                          </button>
                          {openDropdown === txn.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenDropdown(null)}
                              />
                              <div
                                className="fixed w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[9999] backdrop-blur-sm"
                                style={{
                                  top: `${dropdownPosition.top}px`,
                                  left: `${dropdownPosition.left}px`
                                }}
                              >
                                <button
                                  onClick={() => {
                                    handleEdit(txn);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full px-5 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 flex items-center gap-3 transition-all duration-300 group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <FontAwesomeIcon icon={faEdit} className="text-blue-600" />
                                  </div>
                                  <span>Ubah</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleDelete(txn.id);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full px-5 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-600 flex items-center gap-3 transition-all duration-300 group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                    <FontAwesomeIcon icon={faTrash} className="text-red-600" />
                                  </div>
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Tampilan Mobile/Tablet - Cards */}
            <div className="lg:hidden space-y-4 relative">
              {tableLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600">Memuat data...</p>
                  </div>
                </div>
              )}
              <div className={`space-y-4 transition-opacity duration-200 ${tableLoading ? 'opacity-50' : 'opacity-100'}`}>
              {currentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="bg-white rounded-2xl p-5 border-l-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                  style={{
                    borderLeftColor: txn.type === 'INCOME' ? '#10b981' : txn.type === 'EXPENSE' ? '#ef4444' : '#3b82f6'
                  }}
                >
                  {/* Header Card */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg ${getTypeColor(txn.type)}`}>
                        {txn.type === 'INCOME' && <><FontAwesomeIcon icon={faArrowUp} /> Pemasukan</>}
                        {txn.type === 'EXPENSE' && <><FontAwesomeIcon icon={faArrowDown} /> Pengeluaran</>}
                        {txn.type === 'TRANSFER' && <><FontAwesomeIcon icon={faExchangeAlt} /> Transfer</>}
                      </span>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <FontAwesomeIcon icon={faCalendarAlt} />
                        {new Date(txn.transaction_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${txn.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'INCOME' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Detail Card */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <FontAwesomeIcon icon={faMoneyBillWave} className="text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">{txn.account?.name}</span>
                        {txn.transfer_to_account && (
                          <span className="text-gray-500"> → {txn.transfer_to_account.name}</span>
                        )}
                      </div>
                    </div>
                    {txn.category && (
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
                        <span className="text-gray-600">{txn.category.name}</span>
                      </div>
                    )}
                    {txn.description && (
                      <div className="flex items-start gap-2">
                        <FontAwesomeIcon icon={faStickyNote} className="text-gray-400" />
                        <span className="text-gray-600 flex-1">{txn.description}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(txn)}
                      className="flex-1 px-4 py-3 text-sm font-semibold text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transform hover:scale-105"
                    >
                      <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FontAwesomeIcon icon={faEdit} className="text-blue-600 text-xs" />
                      </div>
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(txn.id)}
                      className="flex-1 px-4 py-3 text-sm font-semibold text-red-600 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transform hover:scale-105"
                    >
                      <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                        <FontAwesomeIcon icon={faTrash} className="text-red-600 text-xs" />
                      </div>
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>

            {/* Pagination Controls */}
            {transactions.length > 0 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
                {/* Items per page selector */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 font-semibold">Tampilkan:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm hover:border-blue-300 transition-all"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600 font-medium">
                    dari {transactions.length} transaksi
                  </span>
                </div>

                {/* Page info and navigation */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 font-semibold mr-2 px-3 py-1 bg-gray-50 rounded-lg">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  {/* First Page */}
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                  >
                    ⏮️
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                  >
                    ◀️
                  </button>

                  {/* Page Numbers */}
                  <div className="hidden sm:flex gap-2">
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // Show first page, last page, current page, and pages around current
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => handlePageChange(pageNumber)}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 shadow-sm transform hover:scale-105 ${
                              currentPage === pageNumber
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 hover:shadow-md'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        pageNumber === currentPage - 2 ||
                        pageNumber === currentPage + 2
                      ) {
                        return <span key={pageNumber} className="px-2 text-gray-400 font-bold">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                  >
                    ▶️
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                  >
                    ⏭️
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Transaksi;
