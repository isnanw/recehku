import { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePermissions } from '../context/PermissionsContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus,
  faUsers,
  faEdit,
  faTrash,
  faUserShield,
  faUser,
  faEye,
} from '@fortawesome/free-solid-svg-icons';

function Members() {
  const { currentWorkspace } = useWorkspace();
  const { can } = usePermissions();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentWorkspace) {
      fetchMembers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workspaces/${currentWorkspace.id}/members`);
      setMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError(error.response?.data?.error || 'Gagal memuat members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !name) {
      setError('Semua field harus diisi');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    try {
      const response = await api.post(`/workspaces/${currentWorkspace.id}/members`, {
        email,
        password,
        name,
        role,
      });
      setSuccess(response.data.message);
      setEmail('');
      setPassword('');
      setName('');
      setRole('Member');
      setShowAddModal(false);
      fetchMembers();
    } catch (error) {
      setError(error.response?.data?.error || 'Gagal menambahkan member');
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.put(
        `/workspaces/${currentWorkspace.id}/members/${selectedMember.id}`,
        { role }
      );
      setSuccess(response.data.message);
      setShowEditModal(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      setError(error.response?.data?.error || 'Gagal mengubah role');
    }
  };

  const handleDeleteMember = async (member) => {
    const result = await Swal.fire({
      title: 'Hapus Member?',
      html: `Apakah Anda yakin ingin menghapus <strong>${member.name}</strong> dari workspace ini?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading('Menghapus member...');

    try {
      const response = await api.delete(
        `/workspaces/${currentWorkspace.id}/members/${member.id}`
      );
      toast.success(response.data.message || 'Member berhasil dihapus!', { id: toastId });
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menghapus member', { id: toastId });
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setRole(member.role);
    setShowEditModal(true);
    setError('');
  };

  const getRoleIcon = (roleName) => {
    switch (roleName) {
      case 'Owner':
        return faUserShield;
      case 'Admin':
        return faUserShield;
      case 'Member':
        return faUser;
      case 'Viewer':
        return faEye;
      default:
        return faUser;
    }
  };

  const getRoleBadgeColor = (roleName) => {
    switch (roleName) {
      case 'Owner':
        return 'bg-purple-100 text-purple-800';
      case 'Admin':
        return 'bg-blue-100 text-blue-800';
      case 'Member':
        return 'bg-green-100 text-green-800';
      case 'Viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!can('view_members')) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faUsers} className="text-6xl text-gray-300 mb-4" />
        <p className="text-gray-500">Anda tidak memiliki akses untuk melihat members</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faUsers} className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Members</h1>
              <p className="text-indigo-100 mt-2">Kelola anggota workspace Anda</p>
            </div>
          </div>
          {can('add_member') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="group w-full sm:w-auto px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faUserPlus} className="group-hover:rotate-90 transition-transform duration-300" />
              Tambah Member
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Members List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2">Memuat members...</p>
        </div>
      ) : (
        <>
        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
              <tr>
                <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-sm">
                      <FontAwesomeIcon icon={faUser} className="text-white text-sm" />
                    </div>
                    Member
                  </div>
                </th>
                <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Bergabung
                </th>
                {(can('edit_member') || can('remove_member')) && (
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {members.map((member) => (
                <tr key={member.id} className="group hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:shadow-md">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                        <FontAwesomeIcon
                          icon={getRoleIcon(member.role)}
                          className="text-white text-xl"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{member.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm text-gray-700 font-medium">{member.email}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span
                      className={`px-4 py-2 inline-flex text-xs font-bold rounded-xl shadow-sm ${getRoleBadgeColor(
                        member.role
                      )}`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">
                    {member.joined_at ? new Date(member.joined_at).toLocaleDateString('id-ID') :
                     member.created_at ? new Date(member.created_at).toLocaleDateString('id-ID') : '-'}
                  </td>
                  {(can('edit_member') || can('remove_member')) && (
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {can('edit_member') && member.role !== 'Admin' && (
                          <button
                            onClick={() => openEditModal(member)}
                            className="px-3 py-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                        )}
                        {can('remove_member') && member.role !== 'Admin' && (
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="px-3 py-2 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                            title="Hapus member"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {members.length === 0 && (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faUsers} className="text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500">Belum ada member di workspace ini</p>
            </div>
          )}
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-4">
          {members.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FontAwesomeIcon icon={faUsers} className="text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500">Belum ada member di workspace ini</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FontAwesomeIcon icon={getRoleIcon(member.role)} className="text-white text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{member.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{member.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-lg ${getRoleBadgeColor(member.role)}`}>
                        {member.role}
                      </span>
                      <span className="text-xs text-gray-500">
                        {member.joined_at ? new Date(member.joined_at).toLocaleDateString('id-ID') : member.created_at ? new Date(member.created_at).toLocaleDateString('id-ID') : '-'}
                      </span>
                    </div>
                  </div>
                </div>
                {(can('edit_member') || can('remove_member')) && member.role !== 'Admin' && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    {can('edit_member') && (
                      <button
                        onClick={() => openEditModal(member)}
                        className="flex-1 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                        Edit Role
                      </button>
                    )}
                    {can('remove_member') && (
                      <button
                        onClick={() => handleDeleteMember(member)}
                        className="flex-1 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Buat Akun Member Baru</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Member">Member - Bisa input transaksi</option>
                  <option value="Viewer">Viewer - Hanya melihat data</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEmail('');
                    setPassword('');
                    setName('');
                    setRole('Member');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Ubah Role</h2>
            <p className="text-gray-600 mb-4">
              Mengubah role untuk: <strong>{selectedMember.name}</strong>
            </p>
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Member">Member - Bisa input transaksi</option>
                  <option value="Viewer">Viewer - Hanya melihat data</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;
