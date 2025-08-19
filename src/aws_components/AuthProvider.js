// src/contexts/AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// AWS Cognito configuration
// establish environment variables for security
const COGNITO_CONFIG = {
  userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
  clientSecret: process.env.REACT_APP_COGNITO_CLIENT_SECRET,
  region: process.env.REACT_APP_COGNITO_REGION,
  redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
  domain: process.env.REACT_APP_COGNITO_DOMAIN,
};

// validate configuration
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component to manage authentication state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // check authentication state on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  // function to check authentication state
  const checkAuthState = async () => {
    console.log('🔍 Checking auth state...');
    
    try {
      // check for authorization code in URL first
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      
      // if we have an auth code, process it
      if (authCode) {
        console.log('✅ Found auth code in URL, processing...');
        await handleAuthCallback(authCode);

        // clean up URL after processing
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      // check for stored tokens or session
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      // console.log('🔍 Checking stored tokens...', { hasToken: !!token, hasRefreshToken: !!refreshToken });
      
      if (token) {
        // validate token and get user info
        const userInfo = await validateToken(token);

        // specifically checks if token is valid
        if (userInfo) {
          // console.log('✅ Valid token found, user authenticated');
          setUser(userInfo);
          setIsAuthenticated(true);
          }
          else {
          // token invalid, try refresh
          // console.log('❌ Token invalid, trying refresh...');
          if (refreshToken) {
            await refreshAccessToken(refreshToken);
          }
        }
      } else {
        console.log('No tokens found, user needs to authenticate');   // no tokens, user not authenticated
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearTokens();
    } finally {
      setLoading(false);
    }
  };

  // function to validate JWT token
  const validateToken = async (token) => {
    try {
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        return null;
      }
      
      // return user info from token payload
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

  // function to refresh access token using refresh token.
  // this function will be called if the access token is expired
  const refreshAccessToken = async (refreshToken) => {
    try {
      // communicates with Cognito to refresh the access token
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

      // Check if the response is ok
      if (response.ok) {
        const tokens = await response.json();
        localStorage.setItem('accessToken', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('refreshToken', tokens.refresh_token);
        }
        
        // validate the new access token
        const userInfo = await validateToken(tokens.access_token);
        if (userInfo) {
          setUser(userInfo);
          setIsAuthenticated(true);
        }

      // if the response is not ok, clear tokens
      } else {
        clearTokens();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
    }
  };

  // redirects the user to the Cognito hosted UI for authentication (when "Sign In" button is clicked)
  const signInWithCognito = () => {
    try {
      // console.log('🚀 Initiating sign in with Cognito...');
      /* console.log('📋 Config:', {
        clientId: COGNITO_CONFIG.clientId,
        domain: COGNITO_CONFIG.domain,
        redirectUri: COGNITO_CONFIG.redirectUri,
        hasClientSecret: !!COGNITO_CONFIG.clientSecret
      }); */
      
      const params = new URLSearchParams({
        client_id: COGNITO_CONFIG.clientId,
        response_type: 'code',
        scope: 'email openid phone',
        redirect_uri: COGNITO_CONFIG.redirectUri,
      });
      
      const cognitoUrl = `https://${COGNITO_CONFIG.domain}/login?${params}`;
      // console.log('🔗 Redirecting to:', cognitoUrl);
      
      window.location.href = cognitoUrl;
    } catch (error) {
      // console.error('🚨 Error in signInWithCognito:', error);
    }
  };

  // redirects the user to the Cognito hosted UI for sign up (when "Sign Up" button is clicked)
  const signUpWithCognito = () => {
    const params = new URLSearchParams({
      client_id: COGNITO_CONFIG.clientId,
      response_type: 'code',
      scope: 'email openid phone',
      redirect_uri: COGNITO_CONFIG.redirectUri,
    });
    
    window.location.href = `https://${COGNITO_CONFIG.domain}/signup?${params}`;
  };

  // handles the callback from Cognito after authentication
  // this function will be called after the user is redirected back to the app with an authorization
  const handleAuthCallback = async (authorizationCode) => {
    // console.log('🔄 Processing auth callback with code:', authorizationCode.substring(0, 10) + '...');
    
    try {
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: COGNITO_CONFIG.clientId,
        code: authorizationCode,
        redirect_uri: COGNITO_CONFIG.redirectUri,
      };

      // add client_secret
      if (COGNITO_CONFIG.clientSecret) {
        tokenRequestBody.client_secret = COGNITO_CONFIG.clientSecret;
        // console.log('🔐 Using client secret (length):', COGNITO_CONFIG.clientSecret.length);
      }

      // console.log('📡 Making token request to:', `https://${COGNITO_CONFIG.domain}/oauth2/token`);
      /* console.log('📡 Request body (sanitized):', { 
        ...tokenRequestBody, 
        client_secret: tokenRequestBody.client_secret ? '[REDACTED]' : 'Not provided',
        code: '[REDACTED]'
      }); */

      //* make the request to exchange authorization code for tokens (important)
      const response = await fetch(`https://${COGNITO_CONFIG.domain}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody),
      });

      // console.log('📡 Token exchange response status:', response.status);
      // console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      // check if the response is ok. if so, parse the tokens and validate the user info.
      // if not, log the error and clear tokens
      if (response.ok) {
        const tokens = await response.json();
        // console.log('✅ Tokens received successfully');
        
        localStorage.setItem('accessToken', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('refreshToken', tokens.refresh_token);
        }
        
        // validate the access token and get user info
        const userInfo = await validateToken(tokens.access_token);
        if (userInfo) {
          // console.log('✅ User info validated:', userInfo.email);
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
      console.error('Auth callback failed:', error);
    }
  };

  // function to sign out the user
  const signOut = () => {
    clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    
                                                                  //! IN DEVELOPMENT: Sign out from Cognito hosted UI
    const params = new URLSearchParams({
      client_id: COGNITO_CONFIG.clientId,
      logout_uri: COGNITO_CONFIG.redirectUri,
    });
    
    // redirect to Cognito logout endpoint
    window.location.href = `https://${COGNITO_CONFIG.domain}/logout?${params}`;
  };

  // clear tokens from local storage
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  // provide context value
  // this will be used by components to access authentication state and methods
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