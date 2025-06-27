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

      // Try to get a token via Spark
      try {
        const token = await getSparkAuthToken();
        
        if (token) {
          try {
            const user = await fetchUserInfo(token);
            
            // Set authentication state with user info
            setAuthState({
              isAuthenticated: true,
              accessToken: token,
              user,
              loading: false,
              error: null
            });
            
            // Create octokit instance for API requests
            const oktokitInstance = createOctokit(token);
            setOctokit(oktokitInstance);
            
            console.log("Successfully authenticated with Spark");
            return true;
          } catch (error) {
            console.error("Error initializing Spark auth:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setAuthState(prev => ({
              ...prev,
              loading: false,
              error: `Failed to get user information: ${errorMessage}`
            }));
          }
        } else {
          console.log("No Spark token available");
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: "No authentication token available from GitHub"
          }));
        }
      } catch (error) {
        console.warn("Spark authentication not available:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: `Spark authentication error: ${errorMessage}`
        }));
      }
      
      // If we get here, either there was no token or fetching user info failed
      return false;
    } catch (error) {
      console.error("Error in Spark auth:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: `Authentication initialization error: ${errorMessage}`
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
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          setAuthState({
            isAuthenticated: false,
            accessToken: null,
            user: null,
            loading: false,
            error: `Session expired (${errorMessage}). Please login again.`
          });
          toast.error("Authentication session expired", {
            description: "Your GitHub session is no longer valid. Please sign in again."
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
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          toast.error("Authentication failed", {
            description: `Error details: ${errorMessage}`
          });
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage
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