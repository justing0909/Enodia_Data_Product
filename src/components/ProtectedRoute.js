// src/components/ProtectedRoute.js
import React from 'react';
import { useAuth } from '../contexts/AuthProvider';
import AuthPage from './AuthPage';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return children;
}