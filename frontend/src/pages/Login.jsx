import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isSubmitting = useRef(false);

  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent multiple submissions
    if (isSubmitting.current || loading) {
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    try {
      // Direct API call instead of using context
      const response = await api.post('/auth/login', { email, password });

      // Success - save token, user, and workspaces
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('workspaces', JSON.stringify(response.data.workspaces));

      // Set current workspace to first workspace if not set
      if (response.data.workspaces && response.data.workspaces.length > 0) {
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        if (!savedWorkspaceId) {
          localStorage.setItem('currentWorkspaceId', response.data.workspaces[0].id.toString());
        }
      }

      toast.success('Login berhasil! Mengarahkan ke dashboard...', {
        duration: 2000,
      });

      isSubmitting.current = false;

      // Navigate with full reload to ensure all contexts are properly initialized
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);

    } catch (error) {
      // Failed - show error toast that persists
      isSubmitting.current = false;
      setLoading(false);

      const errorMessage = error.response?.data?.error || 'Email atau password salah. Silakan periksa kembali.';

      toast.error(errorMessage, {
        duration: 6000, // 6 seconds - long enough to read
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          border: '1px solid #FCA5A5',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
        icon: '❌',
      });
    }
  }, [email, password, loading, navigate]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
    return false;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full mx-4">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-600 mb-2">Pelacak Keuangan</h1>
            <p className="text-gray-600">Masuk untuk mengelola keuangan Anda</p>
          </div>

          <div className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyPress}
                autoComplete="off"
                className="input-field"
                placeholder="anda@contoh.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                autoComplete="off"
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sedang masuk...' : 'Masuk'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Belum punya akun?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Daftar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
