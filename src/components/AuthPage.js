// src/components/AuthPage.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import logo from '../assets/enodia_logo.png';
import './AuthPage.css';

export default function AuthPage() {
  const { signInWithCognito, signUpWithCognito } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);

  const handleCognitoAuth = () => {
    if (isSignUp) {
      signUpWithCognito();
    } else {
      signInWithCognito();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="Enodia" className="auth-logo" />
          <h1 className="auth-title">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="auth-subtitle">
            {isSignUp 
              ? 'Create your account to get started.' 
              : 'Sign in to your account.'
            }
          </p>
        </div>

        <div className="auth-form">
          <button
            onClick={handleCognitoAuth}
            className="auth-button primary"
          >
            {isSignUp ? 'Continue to Sign Up' : 'Continue to Sign In'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-toggle">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="auth-link"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            By continuing, you agree to our{' '}
            <a href="/terms" className="auth-link">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="auth-link">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}