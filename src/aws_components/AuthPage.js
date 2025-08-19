// src/components/AuthPage.js
// This component handles user authentication via AWS Cognito.
// It allows users to sign in or sign up, and displays a simple UI with branding.

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import logo from '../img_assets/enodia_logo.png';
import '../styles/AuthPage.css';
import backgroundImage from '../img_assets/auth_background.jpg';

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
    /* Signing up or signing in */
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="Enodia" className="auth-logo" />
          <h1 className="auth-title">
            {isSignUp ? 'Create Your Account' : 'Sign Into Your Account'}
          </h1>
          <p className="auth-subtitle">
            {isSignUp 
              ? '' 
              : ''
            }
          </p>
        </div>

        <div className="auth-form">
          <button
            onClick={handleCognitoAuth}
            className="auth-button primary"
          >
            {isSignUp ? 'Get Started' : 'Continue'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>


          {/* For if you don't have an account. */}
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


        {/* Footer content with terms & conditions */}
        {/* <div className="auth-footer">
          <p>
            By continuing, you agree to our{' '}
            <a href="/terms" className="auth-link">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="auth-link">Privacy Policy</a>
          </p>
        </div> */}
      </div>
    </div>
  );
}