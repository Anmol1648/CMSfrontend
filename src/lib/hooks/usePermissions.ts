import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export const usePermissions = () => {
  const { permissions, isAuthenticated } = useSelector((state: RootState) => state.auth);

  /**
   * Check if user has explicit permission for a resource and action.
   * If a permission has conditional limits (own_data), it still returns true here 
   * since the UI should allow them to attempt the action (the backend enforces conditions).
   */
  const can = (resource: string, action: string): boolean => {
    if (!isAuthenticated) return false;
    
    // Exact match
    return permissions.some(p => p.resource === resource && p.action === action);
  };

  /**
   * Check if user lacks a specific permission
   */
  const cannot = (resource: string, action: string): boolean => {
    return !can(resource, action);
  };

  return { permissions, can, cannot };
};
