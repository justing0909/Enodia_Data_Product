// src/contexts/AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// AWS Cognito configuration
const COGNITO_CONFIG = {
  userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
  clientSecret: process.env.REACT_APP_COGNITO_CLIENT_SECRET,
  region: process.env.REACT_APP_COGNITO_REGION,
  redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
  domain: process.env.REACT_APP_COGNITO_DOMAIN,
};

// Debug: Log configuration on load (remove this after debugging)
console.log('🔧 Cognito Config Loaded:', {
  userPoolId: COGNITO_CONFIG.userPoolId,
  clientId: COGNITO_CONFIG.clientId,
  hasClientSecret: !!COGNITO_CONFIG.clientSecret,
  clientSecretLength: COGNITO_CONFIG.clientSecret ? COGNITO_CONFIG.clientSecret.length : 0,
  region: COGNITO_CONFIG.region,
  redirectUri: COGNITO_CONFIG.redirectUri,
  redirectUriFromEnv: process.env.REACT_APP_REDIRECT_URI,
  windowLocationOrigin: window.location.origin,
  domain: COGNITO_CONFIG.domain,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    console.log('🔍 Checking auth state...');
    
    try {
      // Check for authorization code in URL first
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      
      if (authCode) {
        console.log('✅ Found auth code in URL, processing...');
        await handleAuthCallback(authCode);
        // Clean up URL after processing
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      // Check for stored tokens or session
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      console.log('🔍 Checking stored tokens...', { hasToken: !!token, hasRefreshToken: !!refreshToken });
      
      if (token) {
        // Validate token and get user info
        const userInfo = await validateToken(token);
        if (userInfo) {
          console.log('✅ Valid token found, user authenticated');
          setUser(userInfo);
          setIsAuthenticated(true);
        } else {
          // Token invalid, try refresh
          console.log('❌ Token invalid, trying refresh...');
          if (refreshToken) {
            await refreshAccessToken(refreshToken);
          }
        }
      } else {
        console.log('❌ No tokens found, user needs to authenticate');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const validateToken = async (token) => {
    try {
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        return null;
      }
      
      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name,
      };
    } catch (error) {
      return null;
    }
  };

  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await fetch(`https://${COGNITO_CONFIG.domain}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: COGNITO_CONFIG.clientId,
          refresh_token: refreshToken,
        }),
      });

      if (response.ok) {
        const tokens = await response.json();
        localStorage.setItem('accessToken', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('refreshToken', tokens.refresh_token);
        }
        
        const userInfo = await validateToken(tokens.access_token);
        if (userInfo) {
          setUser(userInfo);
          setIsAuthenticated(true);
        }
      } else {
        clearTokens();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
    }
  };

  const signInWithCognito = () => {
    try {
      console.log('🚀 Initiating sign in with Cognito...');
      console.log('📋 Config:', {
        clientId: COGNITO_CONFIG.clientId,
        domain: COGNITO_CONFIG.domain,
        redirectUri: COGNITO_CONFIG.redirectUri,
        hasClientSecret: !!COGNITO_CONFIG.clientSecret
      });
      
      const params = new URLSearchParams({
        client_id: COGNITO_CONFIG.clientId,
        response_type: 'code',
        scope: 'email openid phone',
        redirect_uri: COGNITO_CONFIG.redirectUri,
      });
      
      const cognitoUrl = `https://${COGNITO_CONFIG.domain}/login?${params}`;
      console.log('🔗 Redirecting to:', cognitoUrl);
      
      window.location.href = cognitoUrl;
    } catch (error) {
      console.error('🚨 Error in signInWithCognito:', error);
    }
  };

  const signUpWithCognito = () => {
    const params = new URLSearchParams({
      client_id: COGNITO_CONFIG.clientId,
      response_type: 'code',
      scope: 'email openid phone',
      redirect_uri: COGNITO_CONFIG.redirectUri,
    });
    
    window.location.href = `https://${COGNITO_CONFIG.domain}/signup?${params}`;
  };

  const handleAuthCallback = async (authorizationCode) => {
    console.log('🔄 Processing auth callback with code:', authorizationCode.substring(0, 10) + '...');
    
    try {
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: COGNITO_CONFIG.clientId,
        code: authorizationCode,
        redirect_uri: COGNITO_CONFIG.redirectUri,
      };

      // Add client_secret if it exists
      if (COGNITO_CONFIG.clientSecret) {
        tokenRequestBody.client_secret = COGNITO_CONFIG.clientSecret;
        console.log('🔐 Using client secret (length):', COGNITO_CONFIG.clientSecret.length);
      }

      console.log('📡 Making token request to:', `https://${COGNITO_CONFIG.domain}/oauth2/token`);
      console.log('📡 Request body (sanitized):', { 
        ...tokenRequestBody, 
        client_secret: tokenRequestBody.client_secret ? '[REDACTED]' : 'Not provided',
        code: '[REDACTED]'
      });

      const response = await fetch(`https://${COGNITO_CONFIG.domain}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody),
      });

      console.log('📡 Token exchange response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const tokens = await response.json();
        console.log('✅ Tokens received successfully');
        
        localStorage.setItem('accessToken', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('refreshToken', tokens.refresh_token);
        }
        
        const userInfo = await validateToken(tokens.access_token);
        if (userInfo) {
          console.log('✅ User info validated:', userInfo.email);
          setUser(userInfo);
          setIsAuthenticated(true);
        }
      } else {
        const errorData = await response.text();
        console.error('❌ Token exchange failed:');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
        console.error('Error Body:', errorData);
        
        // Try to parse error as JSON
        try {
          const errorJson = JSON.parse(errorData);
          console.error('Parsed Error:', errorJson);
        } catch (e) {
          console.error('Error response is not JSON');
        }
      }
    } catch (error) {
      console.error('❌ Auth callback failed:', error);
    }
  };

  const signOut = () => {
    clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    
    // Optional: Sign out from Cognito hosted UI
    const params = new URLSearchParams({
      client_id: COGNITO_CONFIG.clientId,
      logout_uri: COGNITO_CONFIG.redirectUri,  // This should be 'logout_uri' for the logout endpoint
    });
    
    // For Cognito, the logout endpoint is /logout, not /oauth2/logout
    window.location.href = `https://${COGNITO_CONFIG.domain}/logout?${params}`;
  };

  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    signInWithCognito,
    signUpWithCognito,
    signOut,
    handleAuthCallback,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};