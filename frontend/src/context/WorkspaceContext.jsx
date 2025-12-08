import { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { workspaces, isAuthenticated } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      const workspace = savedWorkspaceId
        ? workspaces.find((w) => w.id === parseInt(savedWorkspaceId))
        : workspaces[0];

      setCurrentWorkspace(workspace || workspaces[0]);
    }
  }, [workspaces]);

  const switchWorkspace = (workspaceId) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspaceId.toString());
    }
  };

  const value = {
    currentWorkspace,
    switchWorkspace,
    workspaces,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
