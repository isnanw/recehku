import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faSave, faEye, faEyeSlash, faCamera, faTrash, faImage } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // Force refresh user data to get latest profile_picture_url
    const fetchFreshUserData = async () => {
      if (refreshUser) {
        await refreshUser();
      }
    };
    fetchFreshUserData();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });

      // Set profile picture URL
      if (user.profile_picture_url) {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const fullUrl = `${baseUrl}${user.profile_picture_url}`;
        setProfilePictureUrl(fullUrl);
        setPreviewUrl(fullUrl);
      } else {
        setProfilePictureUrl(null);
        setPreviewUrl(null);
      }
    }
  }, [user]);

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (!profileData.name.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }

    if (!profileData.email.trim()) {
      toast.error('Email tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/auth/profile', {
        name: profileData.name,
        email: profileData.email,
      });

      // Update localStorage dengan data user baru
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Profil berhasil diperbarui!');

      // Reload page untuk update AuthContext
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Gagal memperbarui profil';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      toast.error('Password saat ini harus diisi');
      return;
    }

    if (!passwordData.newPassword) {
      toast.error('Password baru harus diisi');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Password baru dan konfirmasi password tidak sama');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      toast.success('Password berhasil diubah!');

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Gagal mengubah password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format file tidak didukung. Gunakan: PNG, JPG, JPEG, GIF, atau WEBP');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }

      setSelectedFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) {
      toast.error('Pilih foto terlebih dahulu');
      return;
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('profile_picture', selectedFile);

    try {
      const response = await api.post('/auth/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const fullUrl = `${baseUrl}${response.data.profile_picture_url}`;
      setProfilePictureUrl(fullUrl);
      setPreviewUrl(fullUrl);

      toast.success('Foto profil berhasil diupload!');
      setSelectedFile(null);

      // Refresh user data from AuthContext
      await refreshUser();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Gagal mengupload foto profil';
      toast.error(errorMessage);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!profilePictureUrl) return;

    setUploadingPhoto(true);
    try {
      await api.delete('/auth/profile-picture');

      setProfilePictureUrl(null);
      setPreviewUrl(null);
      setSelectedFile(null);

      toast.success('Foto profil berhasil dihapus!');

      // Update user data in localStorage
      const storedUser = JSON.parse(localStorage.getItem('user'));
      storedUser.profile_picture = null;
      storedUser.profile_picture_url = null;
      localStorage.setItem('user', JSON.stringify(storedUser));

      // Reload to update AuthContext
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Gagal menghapus foto profil';
      toast.error(errorMessage);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    if (profilePictureUrl) {
      setPreviewUrl(profilePictureUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan Akun</h1>
        <p className="text-gray-600 mt-1">Kelola informasi profil dan keamanan akun Anda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <FontAwesomeIcon icon={faUser} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Informasi Profil</h2>
              <p className="text-sm text-gray-500">Update nama dan email Anda</p>
            </div>
          </div>

          {/* Profile Picture Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Foto Profil
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Left: File Input */}
              <div className="space-y-3">
                <input
                  type="file"
                  id="profile-picture"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="profile-picture"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition-all cursor-pointer font-medium text-sm"
                >
                  <FontAwesomeIcon icon={faCamera} />
                  Pilih Foto
                </label>

                {selectedFile && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUploadPhoto}
                        disabled={uploadingPhoto}
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        {uploadingPhoto ? 'Uploading...' : 'Upload'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        disabled={uploadingPhoto}
                        className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {profilePictureUrl && !selectedFile && (
                  <button
                    type="button"
                    onClick={handleDeletePhoto}
                    disabled={uploadingPhoto}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Hapus Foto
                  </button>
                )}

                <p className="text-xs text-gray-500">
                  Format: PNG, JPG, JPEG, GIF, WEBP (Max 5MB)
                </p>
              </div>

              {/* Right: Preview */}
              <div className="flex items-center justify-center">
                <div className="relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile Preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-gray-200 shadow-lg">
                      <FontAwesomeIcon icon={faImage} className="text-4xl text-gray-400" />
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  className="pl-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faEnvelope} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  className="pl-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Masukkan email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faSave} />
              <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </form>
        </div>

        {/* Password Settings Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <FontAwesomeIcon icon={faLock} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Keamanan Password</h2>
              <p className="text-sm text-gray-500">Ubah password akun Anda</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Password Saat Ini
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                </div>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="pl-10 pr-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Masukkan password saat ini"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Password Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="pl-10 pr-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Masukkan password baru (min. 6 karakter)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="pl-10 pr-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ulangi password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faLock} />
              <span>{loading ? 'Mengubah...' : 'Ubah Password'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-sm border border-blue-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Akun</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">User ID</p>
            <p className="font-semibold text-gray-800">#{user?.id}</p>
          </div>
          <div className="bg-white/50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Status Akun</p>
            <p className="font-semibold text-green-600">Aktif</p>
          </div>
          <div className="bg-white/50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Tipe Akun</p>
            <p className="font-semibold text-purple-600">{user?.is_owner ? 'Owner' : 'User'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
