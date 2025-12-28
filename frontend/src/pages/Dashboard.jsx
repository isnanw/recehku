import { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot,
  faExclamationTriangle,
  faLightbulb,
  faCheckCircle,
  faInfoCircle,
  faArrowTrendUp,
  faArrowTrendDown,
  faGem,
  faBolt,
  faWallet,
  faEye,
  faEyeSlash,
  faChevronLeft,
  faChevronRight,
  faCoins
} from '@fortawesome/free-solid-svg-icons';
import api from '../utils/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
// AI Insights Slider Component
const AIInsightsSlider = ({ insights, getPriorityColor, getPriorityIcon }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef(null);

  useEffect(() => {
    if (!isHovered && insights.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % insights.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isHovered, insights.length]);

  const goToNext = () => setCurrentIndex((prevIndex) => (prevIndex + 1) % insights.length);
  const goToPrev = () => setCurrentIndex((prevIndex) => (prevIndex - 1 + insights.length) % insights.length);

  return (
    <div className="relative h-full" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="overflow-hidden rounded-2xl h-full" ref={sliderRef}>
        <div className="flex transition-transform duration-500 ease-out h-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {insights.map((insight, index) => {
            const priorityClass = getPriorityColor(insight.priority);
            const isHighPriority = insight.priority === 'high';
            const isMediumPriority = insight.priority === 'medium';

            return (
              <div key={index} className="w-full flex-shrink-0 px-2 h-full">
                <div className={`relative bg-white rounded-2xl border-l-4 ${priorityClass} shadow-lg hover:shadow-2xl transition-all duration-300 p-5 group h-full flex ${isHighPriority ? 'hover:animate-shake border-l-8' : ''}`}>
                  {isHighPriority && (
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-2xl opacity-20 blur animate-pulse"></div>
                  )}

                  <div className="relative flex items-center gap-4 h-full">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 ${
                      insight.priority === 'high' ? 'bg-red-100 group-hover:bg-red-200 group-hover:scale-110 animate-bounce-slow' :
                      insight.priority === 'medium' ? 'bg-yellow-100 group-hover:bg-yellow-200' : 'bg-green-100 group-hover:bg-green-200'
                    }`}>
                      <FontAwesomeIcon
                        icon={getPriorityIcon(insight.priority)}
                        className={`text-2xl transition-all duration-300 ${
                          insight.priority === 'high' ? 'text-red-600 group-hover:text-red-700' :
                          insight.priority === 'medium' ? 'text-yellow-600 group-hover:text-yellow-700' : 'text-green-600 group-hover:text-green-700'
                        } ${isHighPriority ? 'group-hover:animate-wiggle' : ''}`}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-bold text-lg ${isHighPriority ? 'text-red-700' : isMediumPriority ? 'text-yellow-700' : 'text-gray-900'}`}>
                          {insight.category}
                        </h3>
                        {isHighPriority && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
                            ⚠️ URGENT
                          </span>
                        )}
                      </div>

                      <p className={`text-sm mb-3 ${isHighPriority ? 'text-red-800 font-semibold' : 'text-gray-700'}`}>{insight.message}</p>

                      <div className={`rounded-xl p-4 border ${
                        isHighPriority
                          ? 'bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-red-200'
                          : isMediumPriority
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                          : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100'
                      }`}>
                        <div className="flex items-start gap-2">
                          <FontAwesomeIcon icon={faLightbulb} className={`mt-0.5 ${isHighPriority ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`} />
                          <div>
                            <p className={`text-xs font-semibold mb-1 ${isHighPriority ? 'text-red-700' : isMediumPriority ? 'text-yellow-700' : 'text-gray-600'}`}>{isHighPriority ? '🚨 TINDAKAN SEGERA DIPERLUKAN' : 'REKOMENDASI'}</p>
                            <p className={`text-sm ${isHighPriority ? 'text-red-900 font-semibold' : 'text-gray-800'}`}>{insight.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      {insights.length > 1 && (
        <>
          <button onClick={goToPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-gray-600 hover:text-blue-600 transition-all duration-300 hover:scale-110 z-10">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button onClick={goToNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-gray-600 hover:text-blue-600 transition-all duration-300 hover:scale-110 z-10">
            <FontAwesomeIcon icon={faChevronRight} />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {insights.map((_, index) => (
              <button key={index} onClick={() => setCurrentIndex(index)} className={`transition-all duration-300 rounded-full ${index === currentIndex ? 'w-8 h-2 bg-gradient-to-r from-purple-500 to-pink-500' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};


// Account Card Slider Component (one ATM-like card per slide)
const AccountCardSlider = ({ accounts = [], hideBalance, formatCurrency }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered && accounts.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % accounts.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isHovered, accounts.length]);

  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % accounts.length);
  const goToPrev = () => setCurrentIndex((prev) => (prev - 1 + accounts.length) % accounts.length);

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-4 text-center">
        <p className="text-sm text-gray-500">Belum ada akun</p>
      </div>
    );
  }

  return (
    <div className="relative h-full" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="overflow-hidden rounded-2xl h-full">
        <div className="flex transition-transform duration-500 ease-out h-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {accounts.map((acc, idx) => (
            <div key={acc.id || idx} className="w-full flex-shrink-0 px-2 h-full">
              <div className="bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-600 text-white rounded-2xl shadow p-5 h-full">
                <div className="flex items-center justify-between gap-4 h-full">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow">
                        <FontAwesomeIcon icon={faWallet} className="text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{acc.name || acc.account_name || 'Akun'}</div>
                        <div className="text-xs text-white/80">{acc.account_type || acc.type || '—'}</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-xs text-white/80">Saldo</div>
                      <div className="text-lg font-bold">
                        {hideBalance ? <span className="tracking-widest">••••••••</span> : formatCurrency(acc.current_balance || acc.balance || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-white/80">
                    <div>ID: {acc.id || '-'}</div>
                    <div className="mt-3 text-xs text-white/70">{acc.note || ''}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {accounts.length > 1 && (
        <>
          <button onClick={goToPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button onClick={goToNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
            <FontAwesomeIcon icon={faChevronRight} />
          </button>

          <div className="flex justify-center gap-2 mt-3">
            {accounts.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)} className={`rounded-full ${i === currentIndex ? 'w-8 h-2 bg-gradient-to-r from-purple-500 to-pink-500' : 'w-2 h-2 bg-gray-300'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { currentWorkspace } = useWorkspace();
  const [analytics, setAnalytics] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [incomeByCategory, setIncomeByCategory] = useState(null);
  const [incomeByCategoryLoading, setIncomeByCategoryLoading] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(false);
  const deriveDebounceRef = useRef(null);
  const [hideBalance, setHideBalance] = useState(() => {
    try {
      const v = localStorage.getItem('hide_balance');
      if (v === null) return true; // default: hidden
      return v === 'true';
    } catch (e) {
      return true;
    }
  });

  // Persist preference so hide/show survives refresh/navigation
  useEffect(() => {
    try {
      localStorage.setItem('hide_balance', hideBalance ? 'true' : 'false');
    } catch (e) {
      // ignore storage errors
    }
  }, [hideBalance]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchAnalytics();
      fetchDailyComparison();
      fetchAccounts();
      fetchInvestments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace, selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard', {
        params: {
          workspace_id: currentWorkspace.id,
          months: selectedPeriod,
        },
      });
      setAnalytics(response.data);
      // If backend provided income_by_category, use it; otherwise derive from transactions
      if (response.data && Array.isArray(response.data.income_by_category) && response.data.income_by_category.length > 0) {
        setIncomeByCategory(response.data.income_by_category);
      } else {
        deriveIncomeByCategory();
      }
    } catch (error) {
      console.error('Gagal memuat data analitik:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: format local date yyyy-mm-dd
  const toLocalDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Compute start date based on selectedPeriod (months)
  const computeStartDateForPeriod = (months) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    return toLocalDate(start);
  };

  // Derive income_by_category from /transactions endpoint when analytics doesn't provide it
  const deriveIncomeByCategory = async () => {
    if (!currentWorkspace) return;
    try {
      setIncomeByCategoryLoading(true);
      // First, try server-side aggregation endpoint
      try {
        const params = { workspace_id: currentWorkspace.id, top_n: 8 };
        if (selectedPeriod && selectedPeriod > 0) {
          params.start_date = computeStartDateForPeriod(selectedPeriod);
          params.end_date = toLocalDate(new Date());
        }
        const resp = await api.get('/analytics/income-by-category', { params });
        if (resp && resp.data && Array.isArray(resp.data.income_by_category) && resp.data.income_by_category.length > 0) {
          setIncomeByCategory(resp.data.income_by_category);
          return;
        }
      } catch (errServer) {
        // Server aggregation not available or failed — fall back to paginated derivation
        console.debug('Server aggregation not available, falling back to client-side derivation', errServer);
      }

      // Paginated client-side derivation using /transactions (per_page to reasonable batch)
      const perPage = 200;
      let page = 1;
      const sums = new Map();
      let totalPages = null;
      while (true) {
        const params2 = { workspace_id: currentWorkspace.id, page, per_page: perPage };
        if (selectedPeriod && selectedPeriod > 0) {
          params2.start_date = computeStartDateForPeriod(selectedPeriod);
          params2.end_date = toLocalDate(new Date());
        }
        const r = await api.get('/transactions', { params: params2 });
        const data = r.data || {};
        const txns = data.transactions || [];
        txns.forEach((t) => {
          if (t.type !== 'INCOME') return;
          const cat = (t.category && t.category.name) || t.category_name || 'Uncategorized';
          const amt = Number(t.amount) || 0;
          sums.set(cat, (sums.get(cat) || 0) + amt);
        });
        totalPages = data.total_pages || null;
        // Stop conditions: no transactions returned OR we've reached last page
        if ((totalPages && page >= totalPages) || txns.length === 0 || (!totalPages && txns.length < perPage)) {
          break;
        }
        page += 1;
      }

      let arr = Array.from(sums.entries()).map(([category_name, total]) => ({ category_name, total }));
      arr.sort((a, b) => b.total - a.total);
      const TOP_N = 8;
      if (arr.length > TOP_N) {
        const top = arr.slice(0, TOP_N);
        const rest = arr.slice(TOP_N);
        const restTotal = rest.reduce((s, e) => s + e.total, 0);
        top.push({ category_name: 'Lainnya', total: restTotal });
        arr = top;
      }
      setIncomeByCategory(arr);
    } catch (err) {
      console.error('Gagal menyusun pemasukan per kategori:', err);
      setIncomeByCategory([]);
    } finally {
      setIncomeByCategoryLoading(false);
    }
  };

  // Debounce deriveIncomeByCategory when selectedPeriod or workspace changes
  useEffect(() => {
    // If analytics already has income_by_category, skip deriving
    if (!currentWorkspace) return;
    const hasServer = analytics && Array.isArray(analytics.income_by_category) && analytics.income_by_category.length > 0;
    if (hasServer) return;

    if (deriveDebounceRef.current) clearTimeout(deriveDebounceRef.current);
    deriveDebounceRef.current = setTimeout(() => {
      deriveIncomeByCategory();
    }, 300);

    return () => {
      if (deriveDebounceRef.current) clearTimeout(deriveDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, currentWorkspace]);

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload, total }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    const name = item.payload.category_name || item.name;
    const value = item.payload.total || item.value || 0;
    const percent = total ? (value / total) * 100 : 0;
    return (
      <div className="bg-white rounded-lg shadow p-3 text-sm border">
        <div className="font-semibold text-gray-800">{name}</div>
        <div className="text-gray-600">{formatCurrency(value)} • {percent.toFixed(1)}%</div>
      </div>
    );
  };

  const fetchDailyComparison = async () => {
    try {
      const response = await api.get('/analytics/daily-comparison', {
        params: {
          workspace_id: currentWorkspace.id,
          months: selectedPeriod,
        },
      });
      setDailyData(response.data);
    } catch (error) {
      console.error('Gagal memuat data harian:', error);
    }
  };

  const fetchAccounts = async () => {
    if (!currentWorkspace) return;
    try {
      setAccountsLoading(true);
      const resp = await api.get('/accounts', {
        params: { workspace_id: currentWorkspace.id },
      });
      // Expecting an array in resp.data
      setAccounts(Array.isArray(resp.data) ? resp.data : resp.data.accounts || []);
    } catch (err) {
      console.error('Gagal memuat akun:', err);
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchInvestments = async () => {
    if (!currentWorkspace) return;
    try {
      setInvestmentsLoading(true);
      const resp = await api.get('/investments', {
        params: { workspace_id: currentWorkspace.id },
      });
      setInvestments(resp.data.investments || []);
    } catch (err) {
      console.error('Gagal memuat investasi:', err);
      setInvestments([]);
    } finally {
      setInvestmentsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Short currency formatter for chart axes using Indonesian abbreviations (rb = ribu, jt = juta)
  const formatShortCurrency = (value) => {
    if (value === null || value === undefined) return '';
    const abs = Math.abs(Number(value) || 0);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1e9) {
      // Miliar -> use 'M' (or 'm') if you prefer, keep 'M' for clarity
      return `${sign}Rp${(abs / 1e9).toFixed(abs % 1e9 === 0 ? 0 : 1)}M`;
    }
    if (abs >= 1e6) {
      // Juta -> 'jt'
      return `${sign}Rp${(abs / 1e6).toFixed(abs % 1e6 === 0 ? 0 : 1)}jt`;
    }
    if (abs >= 1000) {
      // Ribu -> 'rb'
      return `${sign}Rp${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}rb`;
    }

    // Under 1000 -> show full formatted Rupiah (adds thousand separator)
    return formatCurrency(value);
  };

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return faExclamationTriangle;
      case 'medium':
        return faLightbulb;
      case 'low':
        return faCheckCircle;
      default:
        return faInfoCircle;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-8">Tidak ada data analitik</div>;
  }

  const { summary, trend_data, is_daily_view, expense_by_category, top_spending_categories, ai_insights, ai_insights_limited, ai_insights_note } = analytics;

  // Fallback untuk kompatibilitas dengan data lama
  const chartData = trend_data || analytics.monthly_trend || [];

  // Debug - cek data yang diterima
  // console.log('Analytics data:', analytics);
  // console.log('Expense by category:', expense_by_category);
  // console.log('Trend ranges:', analytics.trend_ranges);

  // Compute a human-readable period label for charts
  const periodLabel = (() => {
    if (is_daily_view) return 'Bulan Ini';
    const ranges = analytics.trend_ranges || analytics.month_ranges || null;
    if (ranges && ranges.length) {
      const first = ranges[0].label;
      const last = ranges[ranges.length - 1].label;
      return first === last ? first : `${first} - ${last}`;
    }
    return `${selectedPeriod} Bulan Terakhir`;
  })();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Dashboard Analitik
          </h1>
          <p className="text-gray-600 mt-1">Selamat datang! Berikut ringkasan keuangan Anda</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all"
          >
            <option value={1}>Bulan Ini</option>
            <option value={3}>3 Bulan Terakhir</option>
            <option value={6}>6 Bulan Terakhir</option>
            <option value={12}>12 Bulan Terakhir</option>
          </select>

          {/* Move show/hide balance toggle next to the filter for visibility */}
          <button
            onClick={() => setHideBalance((s) => !s)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm"
            aria-pressed={hideBalance}
            aria-label={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
            title={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
          >
            <FontAwesomeIcon icon={hideBalance ? faEyeSlash : faEye} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            <div className="flex-1 h-full">
              <div className="bg-white rounded-2xl shadow-xl p-6 h-full">
                {/* AI Insights limited note */}
                {ai_insights_limited && ai_insights_note && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-yellow-600 mt-0.5">
                        <FontAwesomeIcon icon={faInfoCircle} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">{ai_insights_note}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights Section - Auto Slider */}
                {ai_insights && ai_insights.length > 0 && (
                  <div className="space-y-5 h-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <FontAwesomeIcon icon={faRobot} className="text-white text-lg" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Analisa AI</h2>
                        <p className="text-sm text-gray-600">Rekomendasi cerdas untuk keuangan Anda</p>
                      </div>
                    </div>
                    <div className="h-full">
                      <AIInsightsSlider insights={ai_insights} getPriorityColor={getPriorityColor} getPriorityIcon={getPriorityIcon} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-80 h-full">
              <div className="bg-white rounded-2xl shadow-xl p-6 h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 via-amber-400 to-yellow-600 flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faWallet} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Rekening</h3>
                    <p className="text-xs text-gray-500">Saldo per akun (geser untuk melihat)</p>
                  </div>
                </div>

                <div className="h-full">
                  <AccountCardSlider accounts={accounts} hideBalance={hideBalance} formatCurrency={formatCurrency} />
                </div>
                {accountsLoading && <p className="text-xs text-gray-400 mt-2">Memuat rekening...</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Total Balance Card */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 hover:scale-105 animate-scaleIn">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FontAwesomeIcon icon={faWallet} className="text-white text-xl" />
              </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-blue-100 bg-white/20 px-3 py-1 rounded-full">SALDO</div>
                </div>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Total Saldo</p>
              <p className="text-3xl font-bold text-white">
                {hideBalance ? (
                  <span className="tracking-widest">••••••••</span>
                ) : (
                  formatCurrency(summary.total_balance)
                )}
              </p>
          </div>
        </div>

        {/* Income Card */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 hover:scale-105 animate-scaleIn" style={{ animationDelay: '100ms' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FontAwesomeIcon icon={faArrowTrendUp} className="text-white text-xl" />
              </div>
              <div className="text-xs font-semibold text-green-100 bg-white/20 px-3 py-1 rounded-full">PEMASUKAN</div>
            </div>
            <p className="text-green-100 text-sm font-medium mb-1">Pemasukan Bulan Ini</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(summary.current_month_income)}</p>
          </div>
        </div>

        {/* Expense Card */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 hover:scale-105 animate-scaleIn" style={{ animationDelay: '200ms' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FontAwesomeIcon icon={faArrowTrendDown} className="text-white text-xl" />
              </div>
              <div className="text-xs font-semibold text-red-100 bg-white/20 px-3 py-1 rounded-full">PENGELUARAN</div>
            </div>
            <p className="text-red-100 text-sm font-medium mb-1">Pengeluaran Bulan Ini</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(summary.current_month_expense)}</p>
          </div>
        </div>

        {/* Savings Card */}
        <div className={`group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 hover:scale-105 animate-scaleIn ${
          summary.savings_this_month >= 0
            ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600'
            : 'bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600'
        }`} style={{ animationDelay: '300ms' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FontAwesomeIcon
                  icon={summary.savings_this_month >= 0 ? faGem : faBolt}
                  className="text-white text-xl"
                />
              </div>
              <div className={`text-xs font-semibold bg-white/20 px-3 py-1 rounded-full ${
                summary.savings_this_month >= 0 ? 'text-purple-100' : 'text-orange-100'
              }`}>
                {summary.savings_this_month >= 0 ? 'TABUNGAN' : 'DEFISIT'}
              </div>
            </div>
            <p className={`text-sm font-medium mb-1 ${
              summary.savings_this_month >= 0 ? 'text-purple-100' : 'text-orange-100'
            }`}>Selisih Bulan Ini</p>
            <p className="text-3xl font-bold text-white mb-2">{formatCurrency(summary.savings_this_month)}</p>
            <div className="flex items-center gap-2 text-sm">
              <div className={`px-2 py-1 rounded-lg ${
                summary.savings_this_month >= 0 ? 'bg-white/20' : 'bg-white/20'
              }`}>
                <span className="text-white font-semibold">{summary.expense_ratio.toFixed(1)}%</span>
                <span className={summary.savings_this_month >= 0 ? 'text-purple-100' : 'text-orange-100'}> dari pemasukan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Profit/Loss Card */}
        {(() => {
          const totalBuyValue = investments.reduce((sum, inv) => sum + (inv.total_buy_value || 0), 0);
          const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.total_current_value || 0), 0);
          const totalProfitLoss = totalCurrentValue - totalBuyValue;
          const isProfit = totalProfitLoss >= 0;

          return (
            <div className={`group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 hover:scale-105 animate-scaleIn ${
              isProfit
                ? 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-orange-600'
                : 'bg-gradient-to-br from-gray-500 via-gray-600 to-slate-600'
            }`} style={{ animationDelay: '400ms' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <FontAwesomeIcon icon={faCoins} className="text-white text-xl" />
                  </div>
                  <div className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full text-white">
                    INVESTASI
                  </div>
                </div>
                <p className="text-sm font-medium mb-1 text-white/90">Profit/Loss Investasi</p>
                {investmentsLoading ? (
                  <p className="text-2xl font-bold text-white">Loading...</p>
                ) : investments.length === 0 ? (
                  <p className="text-xl font-bold text-white">Belum ada data</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-white mb-2">
                      {isProfit ? '+' : ''}{formatCurrency(totalProfitLoss)}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="px-2 py-1 rounded-lg bg-white/20">
                        <span className="text-white font-semibold">
                          {totalBuyValue > 0 ? ((totalProfitLoss / totalBuyValue) * 100).toFixed(2) : '0'}%
                        </span>
                        <span className="text-white/90"> return</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Daily Comparison Chart - Full Width */}
      {dailyData && dailyData.daily_data && dailyData.daily_data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-scaleIn">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                <FontAwesomeIcon icon={faArrowTrendUp} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {dailyData.is_current_month ? 'Perbandingan Harian Bulan Ini' : 'Perbandingan Bulanan'}
                </h2>
                <p className="text-sm text-gray-600">
                  Pemasukan vs Pengeluaran {dailyData.is_current_month ? 'per hari' : 'per bulan'} - {dailyData.period}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                Total {dailyData.is_current_month ? 'Hari' : 'Bulan'}: {dailyData.summary.days_tracked}
              </p>
              <p className="text-xs text-gray-500">
                Rata-rata: {formatCurrency(dailyData.summary.avg_daily_income)} /
                {formatCurrency(dailyData.summary.avg_daily_expense)}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={dailyData.daily_data}>
              <defs>
                <linearGradient id="colorDailyIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorDailyExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey={dailyData.is_current_month ? "day" : "month"}
                stroke="#6b7280"
                label={{
                  value: dailyData.is_current_month ? 'Tanggal' : 'Bulan',
                  position: 'insideBottom',
                  offset: -5
                }}
              />
              <YAxis
                stroke="#6b7280"
                tickFormatter={(value) => formatShortCurrency(value)}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  backgroundColor: 'white'
                }}
                labelFormatter={(label) => dailyData.is_current_month ? `Tanggal ${label}` : label}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                name="Pemasukan"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDailyIncome)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Pengeluaran"
                stroke="#EF4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDailyExpense)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pemasukan per Kategori - Pie Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-scaleIn">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-md">
              <FontAwesomeIcon icon={faArrowTrendUp} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pemasukan per Kategori</h2>
              <p className="text-sm text-gray-600">Ringkasan pemasukan dibagi menurut kategori</p>
            </div>
          </div>
          {incomeByCategoryLoading ? (
            <p className="text-gray-500 text-center py-12">Memuat data pemasukan...</p>
          ) : (() => {
            const incomeData = (analytics && Array.isArray(analytics.income_by_category) && analytics.income_by_category.length > 0)
              ? analytics.income_by_category
              : incomeByCategory || [];
            if (!incomeData || incomeData.length === 0) {
              return <p className="text-gray-500 text-center py-12">Tidak ada data pemasukan per kategori</p>;
            }
            const totalAll = incomeData.reduce((s, e) => s + (e.total || 0), 0);
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={incomeData}
                        dataKey="total"
                        nameKey="category_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => entry.category_name}
                      >
                        {incomeData.map((entry, index) => (
                          <Cell key={`cell-inc-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip total={totalAll} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {incomeByCategoryLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {incomeData
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((entry, index) => {
                      const percent = totalAll ? (entry.total / totalAll) * 100 : 0;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{entry.category_name}</div>
                              <div className="text-xs text-gray-500">{percent.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{formatCurrency(entry.total)}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })()
          }
        </div>

        {/* Tren Tabungan - Bar Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-scaleIn" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
              <FontAwesomeIcon icon={faGem} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tren Tabungan {is_daily_view ? 'Harian' : 'Bulanan'}</h2>
              <p className="text-sm text-gray-600">Pantau pertumbuhan tabungan Anda — {periodLabel}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => formatShortCurrency(value)} />

              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend />
              <Bar dataKey="savings" name="Tabungan" fill="url(#savingsGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Kategori Pengeluaran */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-scaleIn">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md">
              <FontAwesomeIcon icon={faArrowTrendDown} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pengeluaran per Kategori</h2>
              <p className="text-sm text-gray-600">Rincian — {periodLabel}</p>
            </div>
          </div>
          {expense_by_category && Array.isArray(expense_by_category) && expense_by_category.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={expense_by_category}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${((entry.total / expense_by_category.reduce((sum, e) => sum + e.total, 0)) * 100).toFixed(1)}%`}
                  >
                    {expense_by_category.map((entry, index) => (
                      <Cell key={"cell-" + index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>

              {/* Modern Table with Scroll */}
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Jumlah
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Persentase
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {expense_by_category
                      .sort((a, b) => b.total - a.total)
                      .map((category, index) => {
                        const total = expense_by_category.reduce((sum, e) => sum + e.total, 0);
                        const percentage = (category.total / total) * 100;
                        return (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-4 h-4 rounded-full shadow-sm"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></div>
                                <span className="text-sm font-medium text-gray-900">
                                  {category.category_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(category.total)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: COLORS[index % COLORS.length],
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 min-w-[45px]">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {formatCurrency(expense_by_category.reduce((sum, e) => sum + e.total, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">100%</td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">Belum ada data pengeluaran</p>
          )}
        </div>

        {/* Top Spending Categories */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-scaleIn" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-md">
              <FontAwesomeIcon icon={faBolt} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Kategori Pengeluaran Terbesar</h2>
              <p className="text-sm text-gray-600">Pengeluaran terbesar Anda</p>
            </div>
          </div>
          <div className="space-y-3">
            {top_spending_categories && top_spending_categories.length > 0 ? (
              top_spending_categories.map((cat, index) => {
                const totalSpending = top_spending_categories.reduce((sum, c) => sum + c.total, 0);
                const percentage = (cat.total / totalSpending) * 100;
                return (
                  <div key={index} className="group p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-800 flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm"
                          style={{ backgroundColor: COLORS[index % COLORS.length] + '20' }}>
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></span>
                        </span>
                        {cat.category}
                      </span>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{formatCurrency(cat.total)}</div>
                        <div className="text-xs text-gray-500">{cat.count} transactions</div>
                      </div>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: percentage + '%',
                          background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[index % COLORS.length]}dd)`,
                        }}
                      ></div>
                      <div className="absolute top-0 right-0 bg-white/30 h-full" style={{ width: `${100 - percentage}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">{percentage.toFixed(1)}%</div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-8">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Comparison Line Chart */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Perbandingan Pemasukan vs Pengeluaran {is_daily_view ? '(Harian)' : '(Bulanan)'}</h2>
        <p className="text-sm text-gray-600 mb-4">{periodLabel}</p>
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(value) => formatShortCurrency(value)} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              name="Pemasukan"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Pengeluaran"
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="savings"
              name="Selisih"
              stroke="#8B5CF6"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
