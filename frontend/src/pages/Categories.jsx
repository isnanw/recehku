import { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFolderOpen,
  faPlus,
  faEdit,
  faTrash,
  faArrowUp,
  faArrowDown,
  faTags
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';
import api from '../utils/api';

const Kategori = () => {
  const { currentWorkspace } = useWorkspace();
  const [categories, setKategori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE',
    parent_id: '',
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchKategori();
    }
  }, [currentWorkspace]);

  const fetchKategori = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories', {
        params: { workspace_id: currentWorkspace.id },
      });
      setKategori(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const toastId = toast.loading(editingCategory ? 'Memperbarui kategori...' : 'Menambahkan kategori...');

    try {
      const payload = {
        workspace_id: currentWorkspace.id,
        name: formData.name,
        type: formData.type,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
        toast.success('Kategori berhasil diperbarui!', { id: toastId });
      } else {
        await api.post('/categories', payload);
        toast.success('Kategori berhasil ditambahkan!', { id: toastId });
      }

      setFormData({ name: '', type: 'EXPENSE', parent_id: '' });
      setShowModal(false);
      setEditingCategory(null);
      fetchKategori();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error(error.response?.data?.error || 'Gagal menyimpan kategori', { id: toastId });
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      parent_id: category.parent_id?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Kategori?',
      text: 'Ini akan mempengaruhi transaksi terkait',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading('Menghapus kategori...');

    try {
      await api.delete(`/categories/${id}`);
      toast.success('Kategori berhasil dihapus!', { id: toastId });
      fetchKategori();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Gagal menghapus kategori', { id: toastId });
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', type: 'EXPENSE', parent_id: '' });
  };

  const buildCategoryHierarchy = (categoryList) => {
    // Build a map for quick lookup
    const categoryMap = {};
    categoryList.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });

    // Build hierarchy
    const roots = [];
    Object.values(categoryMap).forEach(cat => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].children.push(cat);
      } else if (!cat.parent_id) {
        roots.push(cat);
      }
    });

    return roots;
  };

  const getParentKategori = () => {
    return categories.filter((cat) => !cat.parent_id && cat.type === formData.type);
  };

  const getIncomeKategori = () => {
    const incomeCategories = categories.filter((cat) => cat.type === 'INCOME');
    return buildCategoryHierarchy(incomeCategories);
  };

  const getExpenseKategori = () => {
    const expenseCategories = categories.filter((cat) => cat.type === 'EXPENSE');
    return buildCategoryHierarchy(expenseCategories);
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
      <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faTags} className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Kategori</h1>
              <p className="text-purple-100 mt-2">Kelola kategori pemasukan dan pengeluaran</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="group w-full sm:w-auto px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} className="group-hover:rotate-90 transition-transform duration-300" />
            Tambah Kategori
          </button>
        </div>
      </div>

      {/* Category Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCancel}
        title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Food, Salary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, parent_id: '' })}
                  className="input-field"
                  required
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori Induk (Optional)
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">None (Main Category)</option>
                  {getParentKategori().map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingCategory ? 'Perbarui Kategori' : 'Buat Kategori'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Batal
              </button>
            </div>
          </form>
      </Modal>

      {/* Kategori Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Kategori */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <FontAwesomeIcon icon={faArrowUp} className="text-2xl text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Pemasukan</h2>
            </div>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg font-semibold text-sm">
              {getIncomeKategori().length}
            </span>
          </div>

          {getIncomeKategori().length === 0 ? (
            <p className="text-gray-400 text-center py-8 font-medium">Belum ada kategori pemasukan</p>
          ) : (
            <div className="space-y-3">
              {getIncomeKategori().map((category) => (
                <div key={category.id} className="group border-2 border-gray-100 rounded-2xl p-4 hover:border-green-200 hover:bg-green-50 transition-all duration-300 hover:shadow-md">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-lg">{category.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 flex items-center gap-2 transition-all duration-300 transform hover:scale-105"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                        Edit
                      </button>
                      <div className="relative group/delete">
                        <button
                          onClick={() => {
                            const hasSubcategories = category.children && category.children.length > 0;
                            if (!category.is_used && !hasSubcategories) {
                              handleDelete(category.id);
                            }
                          }}
                          disabled={category.is_used || (category.children && category.children.length > 0)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all duration-300 ${
                            category.is_used || (category.children && category.children.length > 0)
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 transform hover:scale-105'
                          }`}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          Hapus
                        </button>
                        {(category.is_used || (category.children && category.children.length > 0)) && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gray-900 text-white text-xs rounded-2xl opacity-0 group-hover/delete:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10 shadow-2xl">
                            <div className="font-bold">
                              {category.is_used
                                ? 'Kategori sudah digunakan dalam transaksi'
                                : 'Hapus subkategori terlebih dahulu'}
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {category.children && category.children.length > 0 && (
                    <div className="mt-2 ml-4 space-y-2">
                      {category.children.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-2 rounded"
                        >
                          <span>↳ {sub.name}</span>
                          <div className="flex gap-2">
                              <button
                              onClick={() => handleEdit(categories.find((c) => c.id === sub.id))}
                              className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded hover:bg-primary-100 flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                              Ubah
                            </button>
                            <div className="relative group/subsdelincome">
                              <button
                                onClick={() => !sub.is_used && handleDelete(sub.id)}
                                disabled={sub.is_used}
                                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                  sub.is_used
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-red-700 hover:bg-red-50 cursor-pointer'
                                }`}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                                Hapus
                              </button>
                              {sub.is_used && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover/subsdelincome:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                  Kategori sudah digunakan dalam transaksi
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="border-4 border-transparent border-t-gray-800"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense Kategori */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
                <FontAwesomeIcon icon={faArrowDown} className="text-2xl text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Pengeluaran</h2>
            </div>
            <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg font-semibold text-sm">
              {getExpenseKategori().length}
            </span>
          </div>

          {getExpenseKategori().length === 0 ? (
            <p className="text-gray-400 text-center py-8 font-medium">Belum ada kategori pengeluaran</p>
          ) : (
            <div className="space-y-3">
              {getExpenseKategori().map((category) => (
                <div key={category.id} className="group border-2 border-gray-100 rounded-2xl p-4 hover:border-red-200 hover:bg-red-50 transition-all duration-300 hover:shadow-md">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-lg">{category.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 flex items-center gap-2 transition-all duration-300 transform hover:scale-105"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                        Ubah
                      </button>
                      <div className="relative group/delete">
                        <button
                          onClick={() => {
                            const hasSubcategories = category.children && category.children.length > 0;
                            if (!category.is_used && !hasSubcategories) {
                              handleDelete(category.id);
                            }
                          }}
                          disabled={category.is_used || (category.children && category.children.length > 0)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all duration-300 ${
                            category.is_used || (category.children && category.children.length > 0)
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 transform hover:scale-105'
                          }`}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          Hapus
                        </button>
                        {(category.is_used || (category.children && category.children.length > 0)) && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gray-900 text-white text-xs rounded-2xl opacity-0 group-hover/delete:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10 shadow-2xl">
                            <div className="font-bold">
                              {category.is_used
                                ? 'Kategori sudah digunakan dalam transaksi'
                                : 'Hapus subkategori terlebih dahulu'}
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {category.children && category.children.length > 0 && (
                    <div className="mt-2 ml-4 space-y-2">
                      {category.children.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-2 rounded"
                        >
                          <span>↳ {sub.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(categories.find((c) => c.id === sub.id))}
                              className="text-xs px-2 py-1 bg-white text-primary-700 rounded hover:bg-primary-50 flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                              Edit
                            </button>
                            <div className="relative group/subsdelexpense">
                              <button
                                onClick={() => !sub.is_used && handleDelete(sub.id)}
                                disabled={sub.is_used}
                                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                  sub.is_used
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-red-700 hover:bg-red-50 cursor-pointer'
                                }`}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                                Hapus
                              </button>
                              {sub.is_used && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover/subsdelexpense:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                  Kategori sudah digunakan dalam transaksi
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="border-4 border-transparent border-t-gray-800"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Kategori;
