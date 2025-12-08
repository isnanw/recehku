import { createContext, useContext, useState, useEffect } from 'react';
import { useWorkspace } from './WorkspaceContext';
import api from '../utils/api';

const PermissionsContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const { currentWorkspace } = useWorkspace();
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      fetchRoleAndPermissions();
    } else {
      setRole(null);
      setPermissions({});
      setLoading(false);
    }
  }, [currentWorkspace]);

  const fetchRoleAndPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workspaces/${currentWorkspace.id}/role`);
      setRole(response.data.role);
      setPermissions(response.data.permissions);
    } catch (error) {
      console.error('Failed to fetch role and permissions:', error);
      setRole(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  const can = (permission) => {
    return permissions[permission] === true;
  };

  const isRole = (roleName) => {
    return role === roleName;
  };

  const isOwner = () => role === 'Owner';
  const isAdmin = () => role === 'Admin';
  const isMember = () => role === 'Member';
  const isViewer = () => role === 'Viewer';

  const value = {
    role,
    permissions,
    loading,
    can,
    isRole,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};
