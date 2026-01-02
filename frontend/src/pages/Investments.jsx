import { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCoins,
  faPlus,
  faEdit,
  faTrash,
  faArrowTrendUp,
  faArrowTrendDown,
  faRefresh,
  faChartLine,
  faPenToSquare,
  faTag,
  faUniversity,
  faChartColumn,
  faDollarSign,
  faCalendar,
  faStickyNote,
  faChartLine as faStock,
  faBitcoinSign,
  faHome,
  faBriefcase,
  faClock,
  faExternalLinkAlt,
  faInfoCircle,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Investments = () => {
  const { currentWorkspace } = useWorkspace();
  const { can } = usePermissions();
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPriceSettingModal, setShowPriceSettingModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [goldPrice, setGoldPrice] = useState(null);
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    gold_type: 'ANTAM',
    account_id: '',
    weight: '',
    total_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [goldPrices, setGoldPrices] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [selectedGoldType, setSelectedGoldType] = useState('ALL'); // Filter untuk jenis emas

  const [priceSettings, setPriceSettings] = useState({
    ANTAM: { buy_price: '', buyback_price: '', source_link: '' },
    GALERI24: { buy_price: '', buyback_price: '', source_link: '' },
    UBS: { buy_price: '', buyback_price: '', source_link: '' }
  });

  // Calculate price per gram from total price
  const calculatePricePerGram = () => {
    if (formData.weight && formData.total_price) {
      return parseFloat(formData.total_price) / parseFloat(formData.weight);
    }
    return 0;
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchInvestments();
      fetchAccounts();
      fetchGoldPrice();
      fetchPriceHistory();
    }
  }, [currentWorkspace]);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts', {
        params: { workspace_id: currentWorkspace.id },
      });
      setAccounts(response.data.accounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/investments', {
        params: { workspace_id: currentWorkspace.id },
      });
      setInvestments(response.data.investments);
    } catch (error) {
      toast.error('Gagal memuat investasi');
      console.error('Failed to fetch investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoldPrice = async () => {
    try {
      const response = await api.get('/investments/gold-price', {
        params: { workspace_id: currentWorkspace.id }
      });
      setGoldPrices(response.data.prices);

      // Populate price settings from current prices
      if (response.data.prices) {
        const settings = {};
        Object.entries(response.data.prices).forEach(([key, price]) => {
          settings[key] = {
            buy_price: price.sell.toString(),
            buyback_price: price.buyback.toString(),
            source_link: price.source_link || ''
          };
        });
        setPriceSettings(settings);
      }
    } catch (error) {
      console.error('Failed to fetch gold price:', error);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      const response = await api.get('/investments/gold-price/history', {
        params: { limit: 30 }
      });
      setPriceHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to fetch price history:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(editingInvestment ? 'Memperbarui investasi...' : 'Menambahkan investasi...');

    try {
      const weight = parseFloat(formData.weight);
      const totalPrice = parseFloat(formData.total_price);
      const buyPricePerGram = totalPrice / weight;

      const payload = {
        workspace_id: currentWorkspace.id,
        name: formData.name,
        gold_type: formData.gold_type,
        account_id: formData.account_id ? parseInt(formData.account_id) : null,
        weight: weight,
        buy_price: buyPricePerGram,
        purchase_date: formData.purchase_date,
        notes: formData.notes,
      };

      if (editingInvestment) {
        await api.put(`/investments/${editingInvestment.id}`, payload);
        toast.success('Investasi berhasil diperbarui!', { id: loadingToast });
      } else {
        await api.post('/investments', payload);
        toast.success('Investasi berhasil ditambahkan!', { id: loadingToast });
      }

      handleCloseModal();
      fetchInvestments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menyimpan investasi', { id: loadingToast });
      console.error('Failed to save investment:', error);
    }
  };

  const handleEdit = (investment) => {
    const weight = investment.weight || investment.quantity;
    const totalPrice = weight * investment.buy_price;

    setFormData({
      name: investment.name,
      gold_type: investment.gold_type || 'ANTAM',
      account_id: investment.account_id ? investment.account_id.toString() : '',
      weight: weight.toString(),
      total_price: totalPrice.toString(),
      purchase_date: investment.purchase_date,
      notes: investment.notes || '',
    });
    setEditingInvestment(investment);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Investasi?',
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
      const loadingToast = toast.loading('Menghapus investasi...');
      try {
        await api.delete(`/investments/${id}`);
        toast.success('Investasi berhasil dihapus!', { id: loadingToast });
        fetchInvestments();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Gagal menghapus investasi', { id: loadingToast });
        console.error('Failed to delete investment:', error);
      }
    }
  };

  const handleUpdatePrice = async (investmentId, currentPrice) => {
    try {
      setUpdatingPrice(true);
      await api.post(`/investments/${investmentId}/update-price`, {
        current_price: parseFloat(currentPrice),
      });
      toast.success('Harga berhasil diperbarui!');
      fetchInvestments();
    } catch (error) {
      toast.error('Gagal memperbarui harga');
      console.error('Failed to update price:', error);
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleAutoUpdateGoldPrice = async () => {
    const loadingToast = toast.loading('Memperbarui harga emas...');

    try {
      const response = await api.post('/investments/auto-update-prices', {
        workspace_id: currentWorkspace.id,
      });
      toast.success(response.data.message, { id: loadingToast });
      fetchInvestments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal memperbarui harga emas', { id: loadingToast });
    }
  };

  const handleSavePriceSettings = async () => {
    const loadingToast = toast.loading('Menyimpan pengaturan harga...');

    try {
      const prices = Object.entries(priceSettings).map(([gold_type, prices]) => ({
        gold_type,
        buy_price: parseFloat(prices.buy_price),
        buyback_price: parseFloat(prices.buyback_price),
        source_link: prices.source_link || null
      })).filter(p => p.buy_price && p.buyback_price);

      await api.post('/investments/gold-price/settings/bulk', {
        workspace_id: currentWorkspace.id,
        prices
      });

      toast.success('Harga emas berhasil diperbarui!', { id: loadingToast });
      setShowPriceSettingModal(false);
      fetchGoldPrice();
      fetchPriceHistory();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menyimpan harga', { id: loadingToast });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInvestment(null);
    setFormData({
      name: '',
      gold_type: 'ANTAM',
      account_id: '',
      weight: '',
      total_price: '',
      purchase_date: new Date().toISOString().split('T')[0],
      notes: '',
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
      case 'GOLD':
        return 'bg-yellow-100 text-yellow-800';
      case 'STOCK':
        return 'bg-blue-100 text-blue-800';
      case 'CRYPTO':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      GOLD: 'Emas',
      STOCK: 'Saham',
      CRYPTO: 'Kripto',
      PROPERTY: 'Properti',
      OTHER: 'Lainnya'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type) => {
    const icons = {
      GOLD: faCoins,
      STOCK: faStock,
      CRYPTO: faBitcoinSign,
      PROPERTY: faHome,
      OTHER: faBriefcase
    };
    return icons[type] || faBriefcase;
  };

  // Calculate totals
  const totalBuyValue = investments.reduce((sum, inv) => sum + (inv.total_buy_value || 0), 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.total_current_value || 0), 0);
  const totalProfitLoss = totalCurrentValue - totalBuyValue;
  const totalProfitLossPercentage = totalBuyValue > 0 ? (totalProfitLoss / totalBuyValue) * 100 : 0;

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
      <div className="relative bg-gradient-to-br from-yellow-600 via-yellow-700 to-orange-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faCoins} className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Investasi</h1>
              <p className="text-yellow-100 mt-2">Tracking aset dan profit/loss Anda</p>
            </div>
          </div>
          {can('create_account') && (
            <button
              onClick={() => setShowModal(true)}
              className="group w-full sm:w-auto px-6 py-3 bg-white text-yellow-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} className="group-hover:rotate-90 transition-transform duration-300" />
              Tambah Investasi
            </button>
          )}
        </div>
      </div>

      {/* Gold Price Cards */}
      {goldPrices && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {Object.entries(goldPrices).map(([key, price]) => (
            <div key={key} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 border-2 border-yellow-200 shadow-lg">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                <FontAwesomeIcon icon={faCoins} className="text-yellow-600" />
                {price.name}
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Buyback</p>
                  <p className="text-lg font-bold text-yellow-700">{formatCurrency(price.buyback)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Beli</p>
                  <p className="text-lg font-bold text-orange-700">{formatCurrency(price.sell)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">per gram</p>

              {/* Last Update & Source */}
              <div className="mt-3 pt-3 border-t border-yellow-200 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <FontAwesomeIcon icon={faClock} className="text-gray-500" />
                  <span>{new Date(price.last_update).toLocaleString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} WIB</span>
                </div>
                {price.source_link ? (
                  <a
                    href={price.source_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 font-medium hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                    {price.source_link}
                  </a>
                ) : price.source && (
                  <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                    <FontAwesomeIcon icon={faTag} className="text-[10px]" />
                    {price.source}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto Update Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowPriceHistoryModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faChartLine} />
          Lihat Histori Harga
        </button>
        {user?.is_owner && (
          <button
            onClick={() => setShowPriceSettingModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPenToSquare} />
            Atur Harga Emas
          </button>
        )}
        <button
          onClick={handleAutoUpdateGoldPrice}
          disabled={updatingPrice}
          className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faRefresh} className={updatingPrice ? 'animate-spin' : ''} />
          Update Semua Harga Otomatis
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FontAwesomeIcon icon={faChartLine} className="text-blue-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Modal</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBuyValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <FontAwesomeIcon icon={faCoins} className="text-green-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Nilai Sekarang</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCurrentValue)}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl p-6 shadow-lg border ${totalProfitLoss >= 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalProfitLoss >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <FontAwesomeIcon icon={totalProfitLoss >= 0 ? faArrowTrendUp : faArrowTrendDown} className={`${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'} text-xl`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Profit/Loss</p>
              <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
              </p>
              <p className={`text-sm font-semibold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLossPercentage.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={editingInvestment ? faEdit : faPlus} className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{editingInvestment ? 'Edit Investasi' : 'Tambah Investasi Baru'}</h3>
              <p className="text-sm text-gray-500 mt-1">Kelola portofolio investasi Anda</p>
            </div>
          </div>
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faPenToSquare} className="text-yellow-600 text-sm" />
                </span>
                Nama Investasi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-medium"
                placeholder="contoh: Emas Antam 10 gram"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faTag} className="text-blue-600 text-sm" />
                </span>
                Jenis Emas <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gold_type}
                onChange={(e) => setFormData({ ...formData, gold_type: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-medium"
                required
              >
                <option value="ANTAM">Antam</option>
                <option value="GALERI24">Galeri24</option>
                <option value="UBS">UBS</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUniversity} className="text-purple-600 text-sm" />
                </span>
                Akun
              </label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-medium"
              >
                <option value="">Pilih Akun (Opsional)</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Akun asal dana investasi</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faChartColumn} className="text-green-600 text-sm" />
                </span>
                Berat (gram) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-medium"
                placeholder="contoh: 10.5"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Berat emas dalam gram</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faDollarSign} className="text-red-600 text-sm" />
                </span>
                Total Harga Beli <span className="text-red-500">*</span>
              </label>
              <CurrencyInput
                value={formData.total_price}
                onChange={(value) => setFormData({ ...formData, total_price: value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-semibold text-gray-900"
                placeholder="0"
                required
              />
              {formData.weight && formData.total_price && (
                <p className="text-xs text-gray-500 mt-1">
                  Harga per gram: {formatCurrency(calculatePricePerGram())}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-pink-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faCalendar} className="text-pink-600 text-sm" />
                </span>
                Tanggal Pembelian <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faStickyNote} className="text-gray-600 text-sm" />
              </span>
              Catatan (Opsional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all font-medium resize-none"
              rows="3"
              placeholder="Tambahkan catatan tentang investasi ini..."
            ></textarea>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={editingInvestment ? faEdit : faPlus} />
              {editingInvestment ? 'Perbarui Investasi' : 'Tambah Investasi'}
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

      {/* Investments List */}
      {investments.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🪙</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum ada investasi</h3>
          <p className="text-gray-600 mb-6">Mulai tracking investasi Anda sekarang</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            Tambah Investasi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {investments.map((investment) => (
            <div
              key={investment.id}
              className="group bg-white rounded-3xl p-6 shadow-xl hover:shadow-3xl transition-all duration-300 border border-gray-100 transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FontAwesomeIcon icon={faCoins} className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{investment.name}</h3>
                    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-lg bg-yellow-100 text-yellow-800">
                      {investment.gold_type || 'ANTAM'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Berat:</span>
                  <span className="text-sm font-bold text-gray-900">{investment.weight || investment.quantity} gram</span>
                </div>
                {investment.account && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Akun:</span>
                    <span className="text-sm font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg">
                      <FontAwesomeIcon icon={faUniversity} className="mr-1" /> {investment.account.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    Harga Beli/gram
                    <span className="relative inline-block">
                      <FontAwesomeIcon icon={faInfoCircle} className="peer text-gray-400 hover:text-blue-500 cursor-help text-xs" />
                      <span className="absolute left-0 top-5 w-48 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                        Harga emas per gram saat Anda membeli. Misal Anda membeli 10 gram dengan total harga Rp10.000.000, maka harga beli per gram adalah Rp1.000.000.
                      </span>
                    </span>
                  </span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(investment.buy_price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Modal:</span>
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(investment.total_buy_value)}</span>
                </div>

                {investment.current_price && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        Harga Sekarang
                        <span className="relative inline-block">
                          <FontAwesomeIcon icon={faInfoCircle} className="peer text-gray-400 hover:text-blue-500 cursor-help text-xs" />
                          <span className="absolute left-0 top-5 w-48 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                            Harga emas per gram saat ini (harga buyback). Ini adalah kemungkinan harga jika Anda menjual emas sekarang. Harga bisa berbeda tergantung sumber dan kondisi pasar.
                          </span>
                        </span>
                      </span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(investment.current_price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        Nilai Sekarang
                        <span className="relative inline-block">
                          <FontAwesomeIcon icon={faInfoCircle} className="peer text-gray-400 hover:text-blue-500 cursor-help text-xs" />
                          <span className="absolute left-0 top-5 w-56 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                            Total nilai investasi jika dijual sekarang (berat × harga sekarang)
                          </span>
                        </span>
                      </span>
                      <span className="text-sm font-bold text-green-700">{formatCurrency(investment.total_current_value)}</span>
                    </div>
                    <div className={`flex justify-between items-center p-3 rounded-xl ${investment.profit_loss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <span className="text-sm font-semibold text-gray-700">Profit/Loss:</span>
                      <div className="text-right">
                        <div className={`text-base font-bold ${investment.profit_loss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {investment.profit_loss >= 0 ? '+' : ''}{formatCurrency(investment.profit_loss)}
                        </div>
                        <div className={`text-xs font-semibold ${investment.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {investment.profit_loss >= 0 ? '+' : ''}{investment.profit_loss_percentage?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                <FontAwesomeIcon icon={faCalendar} />
                <span>Dibeli: {new Date(investment.purchase_date).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}</span>
              </div>

              {investment.notes && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl mb-4">
                  <FontAwesomeIcon icon={faStickyNote} className="mr-1" /> {investment.notes}
                </div>
              )}

              <div className="flex gap-3">
                {can('edit_account') && (
                  <button
                    onClick={() => handleEdit(investment)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <FontAwesomeIcon icon={faEdit} /> Ubah
                  </button>
                )}
                {can('delete_account') && (
                  <button
                    onClick={() => handleDelete(investment.id)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <FontAwesomeIcon icon={faTrash} /> Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Price Setting Modal */}
      <Modal
        isOpen={showPriceSettingModal}
        onClose={() => setShowPriceSettingModal(false)}
        title="Atur Harga Emas"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSavePriceSettings(); }}>
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-blue-800">
                <FontAwesomeIcon icon={faPenToSquare} className="mr-2" />
                Atur harga beli dan buyback untuk setiap jenis emas. Harga ini akan digunakan untuk perhitungan profit/loss.
              </p>
            </div>

            {/* ANTAM */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-yellow-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faCoins} className="text-yellow-600" />
                Antam
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Beli (per gram)
                  </label>
                  <CurrencyInput
                    value={priceSettings.ANTAM.buy_price}
                    onChange={(value) => setPriceSettings({
                      ...priceSettings,
                      ANTAM: { ...priceSettings.ANTAM, buy_price: value }
                    })}
                    placeholder="1.100.000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Buyback (per gram)
                  </label>
                  <CurrencyInput
                    value={priceSettings.ANTAM.buyback_price}
                    onChange={(value) => setPriceSettings({
                      ...priceSettings,
                      ANTAM: { ...priceSettings.ANTAM, buyback_price: value }
                    })}
                    placeholder="1.050.000"
                    required
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
                  Link Sumber (Opsional)
                </label>
                <input
                  type="url"
                  value={priceSettings.ANTAM.source_link}
                  onChange={(e) => setPriceSettings({
                    ...priceSettings,
                    ANTAM: { ...priceSettings.ANTAM, source_link: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="https://tokopedia.com/..."
                />
              </div>
            </div>

            {/* GALERI24 */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-yellow-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faCoins} className="text-yellow-600" />
                Galeri24
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Beli (per gram)
                  </label>
                  <CurrencyInput
                    value={priceSettings.GALERI24.buy_price}
                    onChange={(value) => setPriceSettings({
                      ...priceSettings,
                      GALERI24: { ...priceSettings.GALERI24, buy_price: value }
                    })}
                    placeholder="1.095.000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Buyback (per gram)
                  </label>
                  <CurrencyInput
                    value={priceSettings.GALERI24.buyback_price}
                    onChange={(value) => setPriceSettings({
                      ...priceSettings,
                      GALERI24: { ...priceSettings.GALERI24, buyback_price: value }
                    })}
                    placeholder="1.045.000"
                    required
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
                  Link Sumber (Opsional)
                </label>
                <input
                  type="url"
                  value={priceSettings.GALERI24.source_link}
                  onChange={(e) => setPriceSettings({
                    ...priceSettings,
                    GALERI24: { ...priceSettings.GALERI24, source_link: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="https://tokopedia.com/..."
                />
              </div>
            </div>

            {/* UBS */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-yellow-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faCoins} className="text-yellow-600" />
                UBS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Beli (per gram)
                  </label>
                  <CurrencyInput
                    value={priceSettings.UBS.buy_price}
                    onChange={(value) => setPriceSettings({
                      ...priceSettings,
                      UBS: { ...priceSettings.UBS, buy_price: value }
                    })}
                    placeholder="1.098.000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Buyback (per gram)
                  </label>
                  <CurrencyInput
                    value={priceSettings.UBS.buyback_price}
                    onChange={(value) => setPriceSettings({
                      ...priceSettings,
                      UBS: { ...priceSettings.UBS, buyback_price: value }
                    })}
                    placeholder="1.048.000"
                    required
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
                  Link Sumber (Opsional)
                </label>
                <input
                  type="url"
                  value={priceSettings.UBS.source_link}
                  onChange={(e) => setPriceSettings({
                    ...priceSettings,
                    UBS: { ...priceSettings.UBS, source_link: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="https://tokopedia.com/..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowPriceSettingModal(false)}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              Simpan Harga
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Histori Harga Emas */}
      {showPriceHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <FontAwesomeIcon icon={faChartLine} />
                    Histori Harga Emas
                  </h2>
                  <p className="mt-1 text-amber-50">Pantau pergerakan harga emas setiap hari</p>
                </div>
                <button
                  onClick={() => setShowPriceHistoryModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {priceHistory.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-5xl mb-4" />
                  <p className="text-xl font-semibold">Belum ada histori harga emas</p>
                  <p className="text-sm mt-2">Histori akan tersimpan setiap kali Anda mengatur harga</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Filter Jenis Emas */}
                  <div className="flex gap-2 flex-wrap">
                    {['ALL', 'ANTAM', 'GALERI24', 'UBS'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedGoldType(type)}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${
                          selectedGoldType === type
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type === 'ALL' ? 'Semua' : type}
                      </button>
                    ))}
                  </div>

                  {/* Statistik Cards */}
                  {(() => {
                    const filteredData = selectedGoldType === 'ALL'
                      ? priceHistory
                      : priceHistory.filter(h => h.source === selectedGoldType);

                    if (filteredData.length === 0) {
                      return (
                        <div className="text-center py-16 text-gray-500">
                          <FontAwesomeIcon icon={faInfoCircle} className="text-4xl mb-3" />
                          <p className="text-lg">Tidak ada data untuk {selectedGoldType}</p>
                        </div>
                      );
                    }

                    const prices = filteredData.map(h => h.price_per_gram);
                    const maxPrice = Math.max(...prices);
                    const minPrice = Math.min(...prices);
                    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

                    const latestPrice = filteredData[0].price_per_gram;
                    const oldestPrice = filteredData[filteredData.length - 1].price_per_gram;
                    const totalChange = ((latestPrice - oldestPrice) / oldestPrice) * 100;

                    return (
                      <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200">
                            <div className="text-sm text-green-600 font-medium mb-2">Harga Tertinggi</div>
                            <div className="text-2xl font-bold text-green-700">{formatCurrency(maxPrice)}</div>
                          </div>
                          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-xl border-2 border-red-200">
                            <div className="text-sm text-red-600 font-medium mb-2">Harga Terendah</div>
                            <div className="text-2xl font-bold text-red-700">{formatCurrency(minPrice)}</div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200">
                            <div className="text-sm text-blue-600 font-medium mb-2">Harga Rata-rata</div>
                            <div className="text-2xl font-bold text-blue-700">{formatCurrency(avgPrice)}</div>
                          </div>
                          <div className={`bg-gradient-to-br p-5 rounded-xl border-2 ${
                            totalChange >= 0
                              ? 'from-emerald-50 to-green-50 border-emerald-200'
                              : 'from-red-50 to-rose-50 border-red-200'
                          }`}>
                            <div className={`text-sm font-medium mb-2 ${totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              Perubahan Total
                            </div>
                            <div className={`text-2xl font-bold flex items-center gap-2 ${
                              totalChange >= 0 ? 'text-emerald-700' : 'text-red-700'
                            }`}>
                              <FontAwesomeIcon icon={totalChange >= 0 ? faArrowTrendUp : faArrowTrendDown} />
                              {Math.abs(totalChange).toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        {/* Grafik */}
                        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FontAwesomeIcon icon={faChartLine} className="text-amber-600" />
                            Pergerakan Harga {selectedGoldType === 'ALL' ? 'Semua Jenis Emas' : selectedGoldType}
                          </h4>
                          <ResponsiveContainer width="100%" height={400}>
                            <LineChart
                              data={[...filteredData].reverse().map(h => ({
                                date: new Date(h.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                                'Harga Beli': h.price_per_gram,
                                'Harga Buyback': h.buyback_price || 0,
                                source: h.source
                              }))}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis
                                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                              />
                              <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                labelStyle={{ color: '#374151' }}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="Harga Beli"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                dot={{ fill: '#f59e0b', r: 5 }}
                                activeDot={{ r: 7 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="Harga Buyback"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{ fill: '#3b82f6', r: 5 }}
                                activeDot={{ r: 7 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Data Table */}
                        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                          <div className="p-4 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                              <FontAwesomeIcon icon={faCalendar} className="text-gray-600" />
                              Detail Histori Harga ({filteredData.length} data)
                            </h4>
                          </div>
                          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                            {filteredData.map((history, index) => {
                              const previousPrice = filteredData[index + 1];
                              const priceChange = previousPrice
                                ? ((history.price_per_gram - previousPrice.price_per_gram) / previousPrice.price_per_gram) * 100
                                : null;

                              return (
                                <div
                                  key={history.id}
                                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FontAwesomeIcon icon={faCalendar} className="text-gray-400" />
                                      <span className="font-semibold text-gray-800">
                                        {new Date(history.date).toLocaleDateString('id-ID', {
                                          weekday: 'long',
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric'
                                        })}
                                      </span>
                                      {index === 0 && (
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                                          Terbaru
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-lg font-medium">
                                        {history.source || 'Manual'}
                                      </span>
                                      {priceChange !== null && (
                                        <span className={`text-sm font-semibold ${
                                          priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          <FontAwesomeIcon
                                            icon={priceChange >= 0 ? faArrowTrendUp : faArrowTrendDown}
                                            className="mr-1"
                                          />
                                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="space-y-2">
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Harga Beli</div>
                                        <div className="text-xl font-bold text-gray-900">
                                          {formatCurrency(history.price_per_gram)}
                                        </div>
                                      </div>
                                      {history.buyback_price && (
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Harga Buyback</div>
                                          <div className="text-lg font-semibold text-blue-600">
                                            {formatCurrency(history.buyback_price)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowPriceHistoryModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
