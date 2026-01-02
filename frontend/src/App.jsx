import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { PermissionsProvider } from './context/PermissionsContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Transactions from './pages/Transactions';
import Investments from './pages/Investments';
import BudgetPlanning from './pages/BudgetPlanning';
import Members from './pages/Members';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Login and Register outside all providers to prevent remount */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* All other routes inside providers */}
        <Route path="/*" element={
          <AuthProvider>
            <WorkspaceProvider>
              <PermissionsProvider>
                <Routes>
                  <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/investments" element={<Investments />} />
                    <Route path="/budget" element={<BudgetPlanning />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </PermissionsProvider>
            </WorkspaceProvider>
          </AuthProvider>
        } />
      </Routes>
    </Router>
  );
}

export default App;
