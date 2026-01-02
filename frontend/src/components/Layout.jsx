import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faExchangeAlt,
  faWallet,
  faFolderOpen,
  faSignOutAlt,
  faBars,
  faTimes,
  faBuilding,
  faUserShield,
  faUsers,
  faUser,
  faChevronDown,
  faCog,
  faCircleUser,
  faCoins,
  faDatabase
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePermissions } from '../context/PermissionsContext';

const Layout = () => {
  const { user, logout, workspaces } = useAuth();
  const { currentWorkspace, switchWorkspace } = useWorkspace();
  const { role } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [masterMenuOpen, setMasterMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef(null);
  const masterMenuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (masterMenuRef.current && !masterMenuRef.current.contains(event.target)) {
        setMasterMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add scroll effect to navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleKeluar = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: faChartLine },
    { path: '/transactions', label: 'Transaksi', icon: faExchangeAlt },
    { path: '/budget', label: 'Budget', icon: faWallet },
    { path: '/investments', label: 'Investasi', icon: faCoins },
    {
      type: 'dropdown',
      label: 'Master',
      icon: faDatabase,
      items: [
        { path: '/accounts', label: 'Akun', icon: faWallet },
        { path: '/categories', label: 'Kategori', icon: faFolderOpen }
      ]
    },
    { path: '/members', label: 'Members', icon: faUsers },
  ];

  const isActive = (path) => location.pathname === path;
  const isMasterActive = () => location.pathname === '/accounts' || location.pathname === '/categories' || location.pathname === '/gold-prices';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg' : 'bg-white/80 backdrop-blur-md shadow-md'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300"></div>
                <div className="relative flex items-center justify-center w-11 h-11 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-xl shadow-lg transform group-hover:scale-105 transition duration-300">
                  <FontAwesomeIcon icon={faWallet} className="text-white text-xl" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  RecehKu
                </h1>
                <p className="hidden sm:block text-xs text-gray-500">Rencana Cermat Keuanganku</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item, index) => {
                if (item.type === 'dropdown') {
                  return (
                    <div key={index} className="relative" ref={masterMenuRef}>
                      <button
                        onClick={() => setMasterMenuOpen(!masterMenuOpen)}
                        className={`group relative px-4 py-2 rounded-lg transition-all duration-300 ${
                          isMasterActive()
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={item.icon}
                            className={`text-sm transition-transform duration-300 ${
                              isMasterActive() ? '' : 'group-hover:scale-110'
                            }`}
                          />
                          <span className="text-sm font-medium">{item.label}</span>
                          <FontAwesomeIcon
                            icon={faChevronDown}
                            className={`text-xs transition-transform duration-300 ${
                              masterMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Dropdown Menu */}
                      {masterMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fadeIn z-50">
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              onClick={() => setMasterMenuOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                                isActive(subItem.path)
                                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-l-4 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <FontAwesomeIcon icon={subItem.icon} className="text-sm" />
                              <span className="text-sm font-medium">{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group relative px-4 py-2 rounded-lg transition-all duration-300 ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={item.icon}
                        className={`text-sm transition-transform duration-300 ${
                          isActive(item.path) ? '' : 'group-hover:scale-110'
                        }`}
                      />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Right Section: User Menu */}
            <div className="flex items-center gap-3">
              {/* User Dropdown Menu - Desktop */}
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 ${
                    userMenuOpen
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg ring-2 ring-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                      <FontAwesomeIcon icon={faCircleUser} className="text-white text-lg" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                      {role && (
                        <p className="text-xs text-gray-500">{role}</p>
                      )}
                    </div>
                  </div>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-gray-400 text-xs transition-transform duration-300 ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn">
                    {/* User Info Card */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                          <span className="text-white text-xl font-bold">
                            {user?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{user?.name}</p>
                          <p className="text-xs text-gray-600">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {role && (
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            role === 'Owner' ? 'bg-purple-100 text-purple-700' :
                            role === 'Admin' ? 'bg-blue-100 text-blue-700' :
                            role === 'Member' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            <FontAwesomeIcon icon={faUserShield} />
                            <span>{role}</span>
                          </div>
                        )}
                        {!user?.is_owner && currentWorkspace && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                            <FontAwesomeIcon icon={faBuilding} />
                            <span>{currentWorkspace.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Workspace Selector */}
                    {workspaces && workspaces.length > 1 && (
                      <div className="p-4 border-b border-gray-100">
                        <label className="block text-xs font-semibold text-gray-500 mb-2">
                          <FontAwesomeIcon icon={faBuilding} className="mr-2" />
                          WORKSPACE
                        </label>
                        <select
                          value={currentWorkspace?.id || ''}
                          onChange={(e) => switchWorkspace(parseInt(e.target.value))}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          {workspaces.map((workspace) => (
                            <option key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200 group mb-1"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <FontAwesomeIcon icon={faCog} className="text-sm text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Pengaturan</p>
                          <p className="text-xs text-gray-500">Kelola profil dan akun</p>
                        </div>
                      </Link>

                      <button
                        onClick={handleKeluar}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                          <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Keluar</p>
                          <p className="text-xs text-gray-500">Keluar dari akun Anda</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => {
                  console.log('Hamburger clicked, current state:', mobileMenuOpen);
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-300"
              >
                <FontAwesomeIcon
                  icon={mobileMenuOpen ? faTimes : faBars}
                  className="text-xl text-gray-700"
                />
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* Mobile Menu Overlay - Outside header for proper layering */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white h-full w-80 max-w-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Mobile User Info */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl font-bold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{user?.name}</p>
                    <p className="text-xs text-gray-600">{user?.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {role && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      role === 'Owner' ? 'bg-purple-100 text-purple-700' :
                      role === 'Admin' ? 'bg-blue-100 text-blue-700' :
                      role === 'Member' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      <FontAwesomeIcon icon={faUserShield} />
                      <span>{role}</span>
                    </div>
                  )}
                  {!user?.is_owner && currentWorkspace && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                      <FontAwesomeIcon icon={faBuilding} />
                      <span>{currentWorkspace.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="p-2">
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</p>
                {navItems.map((item, index) => {
                  if (item.type === 'dropdown') {
                    return (
                      <div key={index} className="mb-1">
                        <button
                          onClick={() => setMasterMenuOpen(!masterMenuOpen)}
                          className={`flex items-center justify-between w-full mx-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                            isMasterActive()
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isMasterActive() ? 'bg-white/20' : 'bg-gray-100'
                            }`}>
                              <FontAwesomeIcon icon={item.icon} className="text-sm" />
                            </div>
                            <span>{item.label}</span>
                          </div>
                          <FontAwesomeIcon
                            icon={faChevronDown}
                            className={`text-xs transition-transform duration-300 ${
                              masterMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Dropdown Items */}
                        {masterMenuOpen && (
                          <div className="ml-4 mt-1 space-y-1">
                            {item.items.map((subItem) => (
                              <Link
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  setMasterMenuOpen(false);
                                }}
                                className={`flex items-center gap-3 mx-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  isActive(subItem.path)
                                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <FontAwesomeIcon icon={subItem.icon} className="text-sm" />
                                <span>{subItem.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 mx-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-1 ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive(item.path) ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        <FontAwesomeIcon icon={item.icon} className="text-sm" />
                      </div>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Logout */}
              <div className="p-4 border-t border-gray-100 mt-4">
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200 group mb-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <FontAwesomeIcon icon={faCog} className="text-sm text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold">Pengaturan</span>
                </Link>

                <button
                  onClick={handleKeluar}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                    <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
                  </div>
                  <span className="text-sm font-semibold">Keluar</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Main Content with padding for fixed navbar */}
      <main className="pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            key={location.pathname}
            className="animate-fadeIn"
            style={{
              animation: 'fadeIn 0.15s ease-in-out'
            }}
          >
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
