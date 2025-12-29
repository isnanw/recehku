import { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash,
  faLightbulb,
  faCalendar,
  faWallet,
  faChartPie,
  faCheckCircle,
  faExclamationTriangle,
  faArrowUp,
  faArrowDown,
  faSave,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import api from '../utils/api';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';

const BudgetPlanning = () => {
  const { currentWorkspace } = useWorkspace();
  const [budgetPlans, setBudgetPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRealizationModal, setShowRealizationModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [realization, setRealization] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    period_start: '',
    period_end: '',
    notes: '',
    allocations: [],
    actual_income: 0  // Will be auto-calculated from backend
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchBudgetPlans();
      fetchCategories();
    }
  }, [currentWorkspace]);

  const fetchBudgetPlans = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const resp = await api.get('/budget/plans', {
        params: { workspace_id: currentWorkspace.id }
      });
      setBudgetPlans(resp.data.budget_plans || []);
    } catch (err) {
      console.error('Gagal memuat budget plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!currentWorkspace) return;
    try {
      const resp = await api.get('/categories', {
        params: { workspace_id: currentWorkspace.id }
      });
      setCategories((resp.data.categories || []).filter(cat => cat.type === 'EXPENSE'));
    } catch (err) {
      console.error('Gagal memuat categories:', err);
    }
  };

  const getRecommendations = async () => {
    if (!formData.period_start || !formData.period_end) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Tidak Lengkap',
        text: 'Mohon isi tanggal mulai dan tanggal akhir terlebih dahulu'
      });
      return;
    }

    if (!formData.actual_income || formData.actual_income === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Ada Pemasukan',
        text: 'Tidak ada pemasukan di bulan sebelumnya. Silakan tambahkan transaksi pemasukan terlebih dahulu.'
      });
      return;
    }

    try {
      const resp = await api.post('/budget/recommendations', {
        workspace_id: currentWorkspace.id,
        income_amount: parseFloat(formData.actual_income),
        period_start: formData.period_start,
        period_end: formData.period_end
      });

      setFormData(prev => ({
        ...prev,
        allocations: resp.data.recommendations
      }));
    } catch (err) {
      console.error('Gagal mendapatkan rekomendasi:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mendapatkan Rekomendasi',
        text: 'Terjadi kesalahan saat mengambil rekomendasi budget'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        period_start: formData.period_start,
        period_end: formData.period_end,
        notes: formData.notes,
        allocations: formData.allocations,
        workspace_id: currentWorkspace.id
      };

      if (selectedPlan) {
        await api.put(`/budget/plans/${selectedPlan.id}`, payload);
      } else {
        const resp = await api.post('/budget/plans', payload);
        // Update form with actual_income from response
        if (resp.data.income_amount !== undefined) {
          setFormData(prev => ({ ...prev, actual_income: resp.data.income_amount }));
        }
      }

      fetchBudgetPlans();
      handleCloseModal();
    } catch (err) {
      console.error('Gagal menyimpan budget plan:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: 'Terjadi kesalahan saat menyimpan budget plan'
      });
    }
  };

  const handleDelete = async (planId) => {
    const result = await Swal.fire({
      title: 'Hapus Budget Plan?',
      text: 'Budget plan ini akan dihapus permanen',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/budget/plans/${planId}`);
      fetchBudgetPlans();
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Budget plan berhasil dihapus',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Gagal menghapus budget plan:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: 'Terjadi kesalahan saat menghapus budget plan'
      });
    }
  };

  const viewRealization = async (plan) => {
    try {
      const resp = await api.get(`/budget/plans/${plan.id}/realization`, {
        params: { workspace_id: currentWorkspace.id }
      });
      setRealization(resp.data);
      setShowRealizationModal(true);
    } catch (err) {
      console.error('Gagal memuat realisasi:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Realisasi',
        text: 'Terjadi kesalahan saat memuat data realisasi budget'
      });
    }
  };

  const fetchIncomeForPeriod = async (periodStart, periodEnd) => {
    if (!periodStart || !periodEnd || !currentWorkspace) return;

    try {
      // Use new endpoint to calculate income
      const resp = await api.get('/budget/calculate-income', {
        params: {
          workspace_id: currentWorkspace.id,
          period_start: periodStart,
          period_end: periodEnd
        }
      });

      // Update form with calculated income
      setFormData(prev => ({ ...prev, actual_income: resp.data.income_amount || 0 }));
    } catch (err) {
      console.error('Gagal mengambil income:', err);
      // Set to 0 if error
      setFormData(prev => ({ ...prev, actual_income: 0 }));
    }
  };

  const handlePeriodStartChange = (newPeriodStart) => {
    setFormData(prev => ({ ...prev, period_start: newPeriodStart }));
    // Auto-recalculate income when period_start changes
    fetchIncomeForPeriod(newPeriodStart, formData.period_end);
  };

  const handlePeriodEndChange = (newPeriodEnd) => {
    setFormData(prev => ({ ...prev, period_end: newPeriodEnd }));
    // Auto-recalculate income when period_end changes
    fetchIncomeForPeriod(formData.period_start, newPeriodEnd);
  };

  const activateBudgetPlan = async (planId) => {
    const result = await Swal.fire({
      title: 'Aktifkan Budget Plan?',
      text: 'Income akan di-freeze dan tidak bisa diubah lagi',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Aktifkan!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      await api.post(`/budget/plans/${planId}/activate`);
      fetchBudgetPlans();
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Budget plan berhasil diaktifkan',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Gagal mengaktifkan budget plan:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengaktifkan',
        text: 'Terjadi kesalahan saat mengaktifkan budget plan'
      });
    }
  };

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setSelectedPlan(plan);
      setFormData({
        name: plan.name,
        period_start: plan.period_start,
        period_end: plan.period_end,
        notes: plan.notes || '',
        allocations: plan.allocations,
        actual_income: plan.actual_income || 0
      });
    } else {
      setSelectedPlan(null);
      // Set default period to next month
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const periodStart = nextMonth.toISOString().split('T')[0];
      const periodEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).toISOString().split('T')[0];

      setFormData({
        name: '',
        period_start: periodStart,
        period_end: periodEnd,
        notes: '',
        allocations: [],
        actual_income: 0
      });

      // Auto-fetch income for the period after setting dates
      fetchIncomeForPeriod(periodStart);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlan(null);
  };

  const updateAllocation = (parentCategoryId, amount, childCategoryId = null) => {
    setFormData(prev => ({
      ...prev,
      allocations: prev.allocations.map(alloc => {
        if (alloc.is_parent && alloc.category_id === parentCategoryId) {
          // Update child within parent
          if (childCategoryId) {
            const updatedChildren = alloc.children.map(child =>
              child.category_id === childCategoryId
                ? { ...child, allocated_amount: parseFloat(amount) || 0, is_system_recommended: false }
                : child
            );
            // Recalculate parent total
            const newTotal = updatedChildren.reduce((sum, child) => sum + (parseFloat(child.allocated_amount) || 0), 0);
            return {
              ...alloc,
              children: updatedChildren,
              allocated_amount: newTotal
            };
          }
          return alloc;
        } else if (!alloc.is_parent && alloc.category_id === parentCategoryId) {
          // Standalone category
          return { ...alloc, allocated_amount: parseFloat(amount) || 0, is_system_recommended: false };
        }
        return alloc;
      })
    }));
  };

  const updateParentPercentage = (parentCategoryId, percentage) => {
    setFormData(prev => ({
      ...prev,
      allocations: prev.allocations.map(alloc => {
        if (alloc.is_parent && alloc.category_id === parentCategoryId) {
          const newParentTotal = (prev.income_amount * percentage) / 100;
          const currentTotal = alloc.children.reduce((sum, child) => sum + (parseFloat(child.allocated_amount) || 0), 0);

          // Distribute new total proportionally to children
          const updatedChildren = alloc.children.map(child => {
            const childProportion = currentTotal > 0 ? (parseFloat(child.allocated_amount) || 0) / currentTotal : 1 / alloc.children.length;
            return {
              ...child,
              allocated_amount: Math.round(newParentTotal * childProportion),
              is_system_recommended: false
            };
          });

          return {
            ...alloc,
            children: updatedChildren,
            allocated_amount: Math.round(newParentTotal)
          };
        }
        return alloc;
      })
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate total allocated amount
  const totalAllocated = formData.allocations.reduce((sum, alloc) => {
    if (alloc.is_parent) {
      // For parent categories, sum children allocations
      return sum + (alloc.children?.reduce((childSum, child) =>
        childSum + (parseFloat(child.allocated_amount) || 0), 0) || 0);
    } else {
      // For standalone categories
      return sum + (parseFloat(alloc.allocated_amount) || 0);
    }
  }, 0);
  const remaining = parseFloat(formData.actual_income || 0) - totalAllocated;

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faChartPie} className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Perencanaan Keuangan</h1>
              <p className="text-emerald-100 mt-2">Kelola budget dan pantau realisasi pengeluaran</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="group w-full sm:w-auto px-6 py-3 bg-white text-emerald-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} className="group-hover:rotate-90 transition-transform duration-300" />
            Buat Budget Baru
          </button>
        </div>
      </div>

      {/* Budget Plans List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Memuat data...</p>
        </div>
      ) : budgetPlans.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <FontAwesomeIcon icon={faChartPie} className="text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Budget Plan</h3>
          <p className="text-gray-500 mb-6">Mulai merencanakan keuangan Anda dengan membuat budget plan pertama</p>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Buat Budget Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {budgetPlans.map((plan) => {
            const totalAllocated = plan.allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
            const actualIncome = plan.actual_income || plan.income_amount;
            const remaining = actualIncome - totalAllocated;

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      {plan.status === 'DRAFT' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                          Draft
                        </span>
                      )}
                      {plan.status === 'ACTIVE' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faWallet} className="text-blue-500" />
                        <span>Income: {formatCurrency(actualIncome)}</span>
                        {plan.status === 'DRAFT' && (
                          <span className="text-xs text-yellow-600">(Real-time)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendar} className="text-purple-500" />
                        <span>{formatDate(plan.period_start)} - {formatDate(plan.period_end)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {plan.status === 'DRAFT' && (
                      <button
                        onClick={() => activateBudgetPlan(plan.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} />
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => viewRealization(plan)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      Lihat Realisasi
                    </button>
                    <button
                      onClick={() => handleOpenModal(plan)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Dialokasikan</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(totalAllocated)}</p>
                  </div>
                  <div className={`rounded-lg p-4 ${remaining >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-sm text-gray-600 mb-1">Sisa Budget</p>
                    <p className={`text-xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Kategori</p>
                    <p className="text-xl font-bold text-purple-600">{plan.allocations.length}</p>
                  </div>
                </div>

                {plan.notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">{plan.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={selectedPlan ? 'Edit Budget Plan' : 'Buat Budget Baru'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Budget</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="e.g., Budget Januari 2025"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periode Mulai</label>
              <input
                type="date"
                value={formData.period_start}
                onChange={(e) => handlePeriodStartChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periode Akhir</label>
              <input
                type="date"
                value={formData.period_end}
                onChange={(e) => handlePeriodEndChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Display Auto-Calculated Income */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Income (dalam Periode Budget)</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(formData.actual_income || 0)}</p>
                <p className="text-xs text-blue-500 mt-1">
                  Otomatis dihitung dari transaksi INCOME dalam periode yang dipilih
                </p>
              </div>
              <FontAwesomeIcon icon={faWallet} className="text-4xl text-blue-300" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="2"
            />
          </div>

          {/* Period explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Cara Setting Periode:</strong><br/>
              Atur periode dari tanggal gaji pertama sampai sebelum gaji berikutnya.<br/>
              Contoh: Gaji tanggal 27 Nov, gaji berikutnya 30 Des → Periode: 27 Nov s/d 29 Des.<br/>
              Income otomatis dihitung dari semua pemasukan dalam periode ini.
            </p>
          </div>

          {/* Get Recommendations Button */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={getRecommendations}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2 font-medium"
              disabled={!formData.actual_income || formData.actual_income === 0}
            >
              <FontAwesomeIcon icon={faLightbulb} />
              Dapatkan Rekomendasi Alokasi dari Sistem
            </button>
          </div>

          {/* Allocations */}
          {formData.allocations.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Alokasi per Kategori</h4>
                <div className="text-sm">
                  <span className="text-gray-600">Total: </span>
                  <span className={`font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalAllocated)}
                  </span>
                  <span className="text-gray-600 ml-2">/ {formatCurrency(formData.actual_income || 0)}</span>
                </div>
              </div>

              {remaining !== 0 && (
                <div className={`mb-3 p-3 rounded-lg ${remaining > 0 ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'}`}>
                  <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                  {remaining > 0 ? `Masih ada sisa ${formatCurrency(remaining)}` : `Melebihi budget ${formatCurrency(Math.abs(remaining))}`}
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {formData.allocations.map((alloc) => {
                  if (alloc.is_parent) {
                    // Parent category with children
                    const parentPercentage = formData.actual_income > 0
                      ? Math.round((alloc.allocated_amount / formData.actual_income) * 100)
                      : 0;

                    return (
                      <div key={alloc.category_id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Parent Category with Percentage Input */}
                        <div className="flex items-center gap-3 p-3 bg-blue-50">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{alloc.category_name}</p>
                            <p className="text-xs text-gray-600">Total dari subkategori</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={parentPercentage}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  updateParentPercentage(alloc.category_id, value);
                                }}
                                className="w-20 px-2 py-2 pr-6 border-2 border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-sm pointer-events-none">%</span>
                            </div>
                            <input
                              type="text"
                              value={formatCurrency(alloc.allocated_amount)}
                              readOnly
                              className="w-40 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-right font-semibold text-gray-700 cursor-not-allowed"
                            />
                          </div>
                        </div>
                        {/* Children Categories */}
                        <div className="pl-6 bg-white">
                          {alloc.children.map((child) => (
                            <div key={child.category_id} className="flex items-center gap-3 p-3 border-t border-gray-100">
                              <div className="flex-1">
                                <p className="font-medium text-gray-700">
                                  <span className="text-gray-400 mr-2">↳</span>
                                  {child.category_name}
                                </p>
                                {child.is_system_recommended && (
                                  <p className="text-xs text-purple-600 ml-5">
                                    <FontAwesomeIcon icon={faLightbulb} className="mr-1" />
                                    Rekomendasi Sistem
                                  </p>
                                )}
                              </div>
                              <CurrencyInput
                                value={child.allocated_amount}
                                onChange={(value) => updateAllocation(alloc.category_id, value, child.category_id)}
                                className="w-40"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } else {
                    // Standalone category (no children)
                    return (
                      <div key={alloc.category_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{alloc.category_name}</p>
                          {alloc.is_system_recommended && (
                            <p className="text-xs text-purple-600">
                              <FontAwesomeIcon icon={faLightbulb} className="mr-1" />
                              Rekomendasi Sistem
                            </p>
                          )}
                        </div>
                        <CurrencyInput
                          value={alloc.allocated_amount}
                          onChange={(value) => updateAllocation(alloc.category_id, value)}
                          className="w-40"
                        />
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 btn-primary flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={faSave} />
              Simpan
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faTimes} />
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Realization Modal */}
      <Modal
        isOpen={showRealizationModal}
        onClose={() => setShowRealizationModal(false)}
        title="Realisasi Budget"
      >
        {realization && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-2">{realization.budget_plan.name}</h3>
              <p className="text-sm text-gray-600">
                Periode: {formatDate(realization.budget_plan.period_start)} - {formatDate(realization.budget_plan.period_end)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Budget</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(realization.summary.total_budgeted)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(realization.summary.total_spent)}</p>
              </div>
              <div className={`rounded-lg p-4 ${realization.summary.remaining >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-sm text-gray-600 mb-1">Sisa</p>
                <p className={`text-xl font-bold ${realization.summary.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(realization.summary.remaining)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Detail per Kategori</h4>
              <div className="space-y-2">
                {realization.realization.map((item) => (
                  <div key={item.category_id}>
                    {/* Parent Category */}
                    <div className={`rounded-lg p-4 ${item.is_parent ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className={`font-medium ${item.is_parent ? 'text-blue-900' : 'text-gray-900'}`}>
                            {item.category_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Budget: {formatCurrency(item.allocated_amount)} |
                            Actual: {formatCurrency(item.actual_spent)}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 ${
                          item.status === 'over' ? 'text-red-600' :
                          item.status === 'under' ? 'text-green-600' :
                          item.status === 'unbudgeted' ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          <FontAwesomeIcon icon={item.variance > 0 ? faArrowUp : item.variance < 0 ? faArrowDown : faCheckCircle} />
                          <span className="font-semibold">{formatCurrency(Math.abs(item.variance))}</span>
                          <span className="text-sm">({item.variance_percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="relative w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            item.status === 'over' ? 'bg-red-500' :
                            item.status === 'under' ? 'bg-green-500' :
                            item.status === 'unbudgeted' ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${item.allocated_amount > 0 ? Math.min((item.actual_spent / item.allocated_amount) * 100, 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Children Categories */}
                    {item.children && item.children.length > 0 && (
                      <div className="ml-6 mt-2 space-y-2">
                        {item.children.map((child) => (
                          <div key={child.category_id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-300">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  ↳ {child.category_name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Budget: {formatCurrency(child.allocated_amount)} |
                                  Actual: {formatCurrency(child.actual_spent)}
                                </p>
                              </div>
                              <div className={`flex items-center gap-1 text-sm ${
                                child.status === 'over' ? 'text-red-600' :
                                child.status === 'under' ? 'text-green-600' :
                                child.status === 'unbudgeted' ? 'text-orange-600' :
                                'text-gray-600'
                              }`}>
                                <FontAwesomeIcon icon={child.variance > 0 ? faArrowUp : child.variance < 0 ? faArrowDown : faCheckCircle} className="text-xs" />
                                <span className="font-semibold">{formatCurrency(Math.abs(child.variance))}</span>
                                <span className="text-xs">({child.variance_percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className="relative w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  child.status === 'over' ? 'bg-red-500' :
                                  child.status === 'under' ? 'bg-green-500' :
                                  child.status === 'unbudgeted' ? 'bg-orange-500' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${child.allocated_amount > 0 ? Math.min((child.actual_spent / child.allocated_amount) * 100, 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BudgetPlanning;
