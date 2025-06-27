import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  AuthState, 
  fetchUserInfo, 
  getAccessToken, 
  clearAccessToken, 
  handleOAuthCallback, 
  getGitHubOAuthUrl,
  createOctokit,
  getSparkAuthToken
} from "../lib/auth";
import { Octokit } from "@octokit/core";
import { toast } from "sonner";

interface AuthContextType {
  authState: AuthState;
  login: () => void;
  logout: () => void;
  octokit: Octokit | null;
  initWithSparkAuth: () => Promise<boolean>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  authState: {
    isAuthenticated: false,
    accessToken: null,
    user: null,
    loading: false,
    error: null
  },
  login: () => {},
  logout: () => {},
  octokit: null,
  initWithSparkAuth: async () => false
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    user: null,
    loading: true,
    error: null
  });
  const [octokit, setOctokit] = useState<Octokit | null>(null);

  // Try to authenticate with Spark
  const initWithSparkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setAuthState(prev => ({
        ...prev,
        loading: true,
        error: null
      }));

      const token = await getSparkAuthToken();
      
      if (token) {
        try {
          const user = await fetchUserInfo(token);
          setAuthState({
            isAuthenticated: true,
            accessToken: token,
            user,
            loading: false,
            error: null
          });
          
          const oktokitInstance = createOctokit(token);
          setOctokit(oktokitInstance);
          return true;
        } catch (error) {
          console.error("Error initializing Spark auth:", error);
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: "Could not authenticate with Spark"
          }));
          return false;
        }
      }
      
      setAuthState(prev => ({
        ...prev,
        loading: false
      }));
      return false;
    } catch (error) {
      console.error("Error in Spark auth:", error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: "Error initializing Spark authentication"
      }));
      return false;
    }
  }, []);

  // Initialize auth state from local storage on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      
      if (token) {
        try {
          const user = await fetchUserInfo(token);
          setAuthState({
            isAuthenticated: true,
            accessToken: token,
            user,
            loading: false,
            error: null
          });
          
          const oktokitInstance = createOctokit(token);
          setOctokit(oktokitInstance);
        } catch (error) {
          console.error("Error initializing auth:", error);
          // Token might be invalid, clear it
          clearAccessToken();
          setAuthState({
            isAuthenticated: false,
            accessToken: null,
            user: null,
            loading: false,
            error: "Session expired. Please login again."
          });
        }
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false
        }));
      }
    };

    initializeAuth();
  }, []);
  
  // Check for OAuth callback code in URL
  useEffect(() => {
    const handleOAuthResponse = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      
      if (code && state) {
        setAuthState(prev => ({
          ...prev,
          loading: true,
          error: null
        }));
        
        try {
          // Handle the OAuth callback and get the token
          const token = await handleOAuthCallback(code, state);
          
          // Get user info with the token
          const user = await fetchUserInfo(token);
          
          // Create an Octokit instance
          const oktokitInstance = createOctokit(token);
          setOctokit(oktokitInstance);
          
          // Update auth state
          setAuthState({
            isAuthenticated: true,
            accessToken: token,
            user,
            loading: false,
            error: null
          });
          
          toast.success("Successfully signed in with GitHub");
          
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          toast.error("Authentication failed");
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : "Authentication failed"
          }));
        }
      }
    };
    
    handleOAuthResponse();
  }, []);
  
  // Redirect to GitHub for authorization
  const login = () => {
    window.location.href = getGitHubOAuthUrl();
  };
  
  // Clear auth state and local storage
  const logout = () => {
    clearAccessToken();
    setAuthState({
      isAuthenticated: false,
      accessToken: null,
      user: null,
      loading: false,
      error: null
    });
    setOctokit(null);
    toast.info("Signed out");
  };
  
  return (
    <AuthContext.Provider value={{ authState, login, logout, octokit, initWithSparkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};