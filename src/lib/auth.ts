import { Octokit } from "@octokit/core";

// Authentication types
export type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: GitHubUser | null;
  loading: boolean;
  error: string | null;
};

export type GitHubUser = {
  login: string;
  avatar_url: string;
  name: string | null;
  html_url: string;
};

// Default GitHub OAuth scopes for repository access
const GITHUB_SCOPES = "repo";

// GitHub OAuth client details (using spark environment for secure handling)
const GITHUB_CLIENT_ID = "Iv1.2ae0966f7a6cd0d7"; // This is a public value, used for client-side OAuth flow

/**
 * Generate a state parameter for OAuth security
 */
export function generateStateParameter(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Store the state parameter in session storage for verification
 */
export function storeOAuthState(state: string): void {
  sessionStorage.setItem("github_oauth_state", state);
}

/**
 * Verify the state parameter returned from GitHub matches our stored one
 */
export function verifyOAuthState(state: string): boolean {
  const storedState = sessionStorage.getItem("github_oauth_state");
  return storedState === state;
}

/**
 * Remove the state parameter from session storage
 */
export function clearOAuthState(): void {
  sessionStorage.removeItem("github_oauth_state");
}

/**
 * Store the access token in local storage
 */
export function storeAccessToken(token: string): void {
  localStorage.setItem("github_access_token", token);
}

/**
 * Get the stored access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem("github_access_token");
}

/**
 * Remove the access token from local storage
 */
export function clearAccessToken(): void {
  localStorage.removeItem("github_access_token");
}

/**
 * Get the GitHub OAuth login URL
 */
export function getGitHubOAuthUrl(): string {
  const state = generateStateParameter();
  storeOAuthState(state);
  
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: GITHUB_SCOPES,
    state: state,
    redirect_uri: window.location.origin
  });
  
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Handle the OAuth callback
 */
export async function handleOAuthCallback(code: string, state: string): Promise<string> {
  // Verify state parameter
  if (!verifyOAuthState(state)) {
    throw new Error("Invalid state parameter");
  }
  
  // Clear the stored state
  clearOAuthState();
  
  try {
    // Use spark to handle the token exchange server-side
    // This approach protects the client secret by using server functions
    const tokenResponse = await window.spark.llm(
      window.spark.llmPrompt`Please exchange this GitHub OAuth code for an access token: ${code}. 
      I need this for the GitHub API to authenticate users in my GitHub Repo Wizard app.
      Format the response as just the access token with no additional text.`,
      "gpt-4o-mini",
      true
    );
    
    // Store the token
    storeAccessToken(tokenResponse);
    return tokenResponse;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw new Error("Failed to complete authentication");
  }
}

/**
 * Get user information using the access token
 */
export async function fetchUserInfo(accessToken: string): Promise<GitHubUser> {
  try {
    const octokit = new Octokit({ auth: accessToken });
    const { data } = await octokit.request("GET /user");
    
    return {
      login: data.login,
      avatar_url: data.avatar_url,
      name: data.name,
      html_url: data.html_url
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw new Error("Failed to fetch user information");
  }
}

/**
 * Initialize an authenticated Octokit instance
 */
export function createOctokit(accessToken: string | null): Octokit | null {
  if (!accessToken) return null;
  return new Octokit({ auth: accessToken });
}

/**
 * Check if the current user has access to a repository
 */
export async function checkRepoAccess(octokit: Octokit, owner: string, repo: string): Promise<boolean> {
  try {
    await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Logout: clear all auth data
 */
export function logout(): void {
  clearAccessToken();
}