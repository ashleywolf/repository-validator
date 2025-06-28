import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Add TypeScript global window property for GitHub API requests
declare global {
  interface Window {
    pendingGitHubRequests?: number;
    gitHubRequestCache?: Map<string, {data: any, timestamp: number, headers?: Record<string, string>}>;
    spark: any;
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// GitHub repository validation utilities
export type RepoFile = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  content?: string;
  size?: number;
  download_url?: string;
}

// License check data
export type LicenseCheck = {
  isValid: boolean;
  message: string;
  licenseName?: string;
  copyrightHolder?: string;
}

// Repo description rating
export type DescriptionRating = {
  text: string;
  rating: 'great' | 'good' | 'poor' | 'missing';
  feedback?: string;
}

// Dependency data
export type DependencyAnalysis = {
  total: number;
  gplCount: number;
  agplCount: number;
  gplDependencies: string[];
  agplDependencies: string[];
  dependenciesCount?: number; // Count of all dependencies from package.json
  devDependenciesCount?: number; // Count of all dev dependencies from package.json
  mitCount?: number; // Count of MIT licensed dependencies from SBOM
  sbomDependenciesCount?: number; // Total count of dependencies from SBOM
  hasCopyleft?: boolean; // Whether any copyleft licenses are present
  licenseBreakdown?: Record<string, number>; // Map of license names to counts
  rawSbomData?: any; // Raw SBOM data for export
}

export type SecurityFeatures = {
  secretScanningEnabled: boolean;
  dependabotSecurityUpdatesEnabled: boolean;
  codeqlEnabled: boolean;
}

export type OwnershipProperty = {
  exists: boolean;
  name: string | null;
}

export type TelemetryCheck = {
  containsTelemetry: boolean;
  telemetryFiles: string[];
}

export type ValidationResult = {
  exists: boolean;
  message: string;
  status: 'success' | 'warning' | 'error';
  location?: 'repo' | 'org' | 'none';
  prUrl?: string;
  licenseCheck?: LicenseCheck;
  dependencyAnalysis?: DependencyAnalysis;
  descriptionRating?: DescriptionRating;
  fileUrl?: string; // URL to view the file directly
  internalReferences?: string[]; // List of internal references found
  securityFeatures?: SecurityFeatures; // GitHub security features status
  telemetryCheck?: TelemetryCheck; // Telemetry files found
  ownershipProperty?: OwnershipProperty; // Custom ownership property
}

export type FileRequirement = {
  path: string;
  required: boolean;
  description: string;
}

export type ValidationSummary = {
  repoName: string;
  repoUrl: string;
  results: Record<string, ValidationResult>;
  missingRequired: number;
  missingRecommended: number;
  owner: string;
  repo: string;
}

// Extract owner and repo name from GitHub URL
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Handle various GitHub URL formats
  const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/i;
  const match = url.match(githubRegex);
  
  if (!match) return null;
  
  const [, owner, repoWithExt] = match;
  // Remove .git extension if present
  const repo = repoWithExt.replace(/\.git$/, '');
  
  return { owner, repo };
}

// Validate if URL is a GitHub repository URL
export function isValidGitHubUrl(url: string): boolean {
  return parseGitHubUrl(url) !== null;
}

// Get the URL for GitHub API calls
export function getApiUrl(url: string): string | null {
  const parsed = parseGitHubUrl(url);
  if (!parsed) return null;
  
  return `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents`;
}

// Get the URL for GitHub organization .github repo API calls
export function getOrgDotGithubApiUrl(owner: string): string {
  return `https://api.github.com/repos/${owner}/.github/contents`;
}

// Get the URL for GitHub open-source templates
export function getTemplateApiUrl(filename: string): string {
  // Updated to use the new template location
  return `https://api.github.com/repos/github/github-ospo/contents/release%20template/${filename}`;
}

// Get the URL for GitHub SBOM API calls
export function getSbomApiUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/dependency-graph/sbom`;
}

// Analyze SBOM data for license information
export async function analyzeSbomData(owner: string, repo: string): Promise<{
  mitCount: number;
  sbomDependenciesCount: number;
  licenseBreakdown?: Record<string, number>;
  rawSbomData?: any; // Store raw SBOM data for export
}> {
  try {
    const sbomUrl = getSbomApiUrl(owner, repo);
    
    try {
      // SBOM API tends to be heavy and more likely to hit rate limits
      // Add a small delay before this specific API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await makeGitHubRequest(sbomUrl, 4); // Use more retries for SBOM
      
      if (!response.ok) {
        console.warn(`SBOM API returned status ${response.status} for ${owner}/${repo}`);
        // Create a blank result rather than throwing an error
        return {
          mitCount: 0,
          sbomDependenciesCount: 0,
          licenseBreakdown: {}
        };
      }
      
      const sbomData = await response.json();
      
      // Count dependencies and breakdown licenses
      let sbomDependenciesCount = 0;
      let mitCount = 0;
      const licenseBreakdown: Record<string, number> = {};
      
      // Navigate SBOM structure - may vary based on actual API response
      if (sbomData.sbom && sbomData.sbom.packages) {
        sbomDependenciesCount = sbomData.sbom.packages.length;
        
        // Process all licenses
        sbomData.sbom.packages.forEach((pkg: any) => {
          const license = pkg.licenseConcluded || "Unknown";
          
          // Count for MIT specifically
          if (license === "MIT") {
            mitCount++;
          }
          
          // Add to breakdown
          licenseBreakdown[license] = (licenseBreakdown[license] || 0) + 1;
        });
      }
      
      return {
        mitCount,
        sbomDependenciesCount,
        licenseBreakdown,
        rawSbomData: sbomData // Include raw data for export functionality
      };
    } catch (error) {
      console.error("Error making request to SBOM API:", error);
      // Return an empty result instead of throwing
      return {
        mitCount: 0,
        sbomDependenciesCount: 0,
        licenseBreakdown: {}
      };
    }
  } catch (error) {
    console.error("Error analyzing SBOM data:", error);
    // Return an empty result instead of throwing
    return {
      mitCount: 0,
      sbomDependenciesCount: 0,
      licenseBreakdown: {}
    };
  }
}

// Helper function to export SBOM data as JSON file
export function exportSbomData(sbomData: any, repoName: string): void {
  try {
    // Format the data for download
    const formattedData = JSON.stringify(sbomData, null, 2);
    const blob = new Blob([formattedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create and click a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${repoName.replace('/', '-')}-sbom.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting SBOM data:", error);
    throw new Error("Failed to export SBOM data");
  }
}

// Check if a license file contains GitHub copyright
export async function checkLicenseFile(fileUrl: string): Promise<LicenseCheck> {
  try {
    const response = await makeGitHubRequest(fileUrl);
    if (!response.ok) {
      return {
        isValid: false,
        message: "Could not retrieve license content"
      };
    }
    
    const fileData = await response.text();
    let licenseText: string;
    
    try {
      // If it's a JSON response with base64 content
      const jsonData = JSON.parse(fileData);
      licenseText = atob(jsonData.content); // Decode base64 content
    } catch (error) {
      // If it's not a JSON response or can't be parsed as JSON
      licenseText = fileData;
    }
    
    // Find the sentence containing GitHub
    const githubSentenceRegex = /[^.!?]*(?:GitHub|GitHub, Inc|GitHub Inc)[^.!?]*[.!?]/i;
    const githubMatch = licenseText.match(githubSentenceRegex);
    
    // Try to extract copyright holder
    const copyrightRegex = /Copyright(?:\s+\(c\))?\s+(?:\d{4}(?:-\d{4})?)\s+([^\n.]+)/i;
    const copyrightMatch = licenseText.match(copyrightRegex);
    
    // Try to identify license type
    let licenseName = "Unknown";
    if (licenseText.includes("MIT License")) licenseName = "MIT";
    else if (licenseText.includes("Apache License")) licenseName = "Apache";
    else if (licenseText.includes("BSD")) licenseName = "BSD";
    else if (licenseText.includes("GNU General Public License")) {
      if (licenseText.includes("version 3")) licenseName = "GPL-3.0";
      else if (licenseText.includes("version 2")) licenseName = "GPL-2.0";
      else licenseName = "GPL";
    }
    else if (licenseText.includes("Mozilla Public License")) licenseName = "MPL";
    
    if (githubMatch) {
      return {
        isValid: true,
        message: githubMatch[0].trim(),
        licenseName,
        copyrightHolder: copyrightMatch ? copyrightMatch[1].trim() : undefined
      };
    } else {
      return {
        isValid: false,
        message: "License does not contain GitHub copyright notice",
        licenseName,
        copyrightHolder: copyrightMatch ? copyrightMatch[1].trim() : undefined
      };
    }
  } catch (error) {
    console.error("Error checking license file:", error);
    return {
      isValid: false,
      message: "Error analyzing license file"
    };
  }
}

// Analyze dependencies to check for licenses
export async function analyzeDependencies(fileUrl: string): Promise<DependencyAnalysis> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error("Could not retrieve package-lock.json");
    }
    
    const fileData = await response.json();
    const content = JSON.parse(atob(fileData.content)); // Decode base64 content and parse JSON
    
    const dependencies = content.packages || content.dependencies || {};
    const gplDependencies: string[] = [];
    const agplDependencies: string[] = [];
    const licenseBreakdown: Record<string, number> = {};
    
    // Count the actual dependencies (excluding the root package)
    const dependencyCount = Object.keys(dependencies).filter(name => name !== '').length;
    
    // Check license in each dependency
    Object.entries(dependencies).forEach(([name, info]: [string, any]) => {
      if (name === '') return; // Skip root package
      
      // Extract license information
      const license = typeof info.license === 'string' 
        ? info.license 
        : (info.licenses ? info.licenses.join(', ') : 'Unknown');
      
      // Normalize license name
      let normalizedLicense = license || 'Unknown';
      
      // Count licenses for breakdown
      if (normalizedLicense) {
        licenseBreakdown[normalizedLicense] = (licenseBreakdown[normalizedLicense] || 0) + 1;
      }
      
      // Track copyleft licenses specifically
      if (license) {
        if (/GPL-3\.0|GPL3|GNU General Public License v3|GPL-2\.0|GPL2|GNU General Public License v2/i.test(license) && !/LGPL|Lesser/i.test(license)) {
          gplDependencies.push(`${name.replace('node_modules/', '')}: ${license}`);
        }
        if (/AGPL|Affero/i.test(license)) {
          agplDependencies.push(`${name.replace('node_modules/', '')}: ${license}`);
        }
      }
    });
    
    // Determine if there are any copyleft licenses
    const hasCopyleft = gplDependencies.length > 0 || agplDependencies.length > 0;
    
    return {
      total: dependencyCount,
      gplCount: gplDependencies.length,
      agplCount: agplDependencies.length,
      gplDependencies,
      agplDependencies,
      hasCopyleft,
      licenseBreakdown
    };
  } catch (error) {
    console.error("Error analyzing dependencies:", error);
    return {
      total: 0,
      gplCount: 0,
      agplCount: 0,
      gplDependencies: [],
      agplDependencies: [],
      hasCopyleft: false,
      licenseBreakdown: {}
    };
  }
}

// Store rate limit information
export type RateLimitInfo = {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

// Global variable to store the latest rate limit information
let currentRateLimit: RateLimitInfo | null = null;

// Function to get current rate limit info
export function getCurrentRateLimit(): RateLimitInfo | null {
  return currentRateLimit;
}

// Function to preemptively check rate limits before making complex requests
export async function checkRateLimits(): Promise<{
  ok: boolean;
  remaining: number;
  resetTime: string;
  isAuthenticated: boolean;
}> {
  try {
    // First check if we have a cached or already obtained rate limit info
    if (currentRateLimit) {
      // If current rate limit info is recent (less than 30 seconds old), use it
      const rateLimitAge = Date.now() - currentRateLimit.reset.getTime();
      if (rateLimitAge < 30 * 1000) {
        return {
          ok: currentRateLimit.remaining > 10,
          remaining: currentRateLimit.remaining,
          resetTime: currentRateLimit.reset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          isAuthenticated: currentRateLimit.limit > 60
        };
      }
    }
    
    const rateLimitUrl = 'https://api.github.com/rate_limit';
    const response = await makeGitHubRequest(rateLimitUrl, 1); // Use fewer retries for this check
    
    if (!response.ok) {
      return {
        ok: false,
        remaining: 0,
        resetTime: new Date().toLocaleTimeString(),
        isAuthenticated: !!localStorage.getItem("github_access_token")
      };
    }
    
    const data = await response.json();
    const coreLimit = data.resources.core;
    
    // Update global rate limit info
    currentRateLimit = {
      limit: coreLimit.limit,
      remaining: coreLimit.remaining,
      reset: new Date(coreLimit.reset * 1000),
      used: coreLimit.used
    };
    
    return {
      ok: coreLimit.remaining > 10, // Consider "ok" if we have more than 10 requests left
      remaining: coreLimit.remaining,
      resetTime: new Date(coreLimit.reset * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      isAuthenticated: coreLimit.limit > 60 // If limit is > 60, we're authenticated
    };
  } catch (error) {
    console.error("Error checking rate limits:", error);
    return {
      ok: false,
      remaining: 0,
      resetTime: new Date().toLocaleTimeString(),
      isAuthenticated: !!localStorage.getItem("github_access_token")
    };
  }
}

// Helper function to make GitHub API requests with improved retries, rate limit handling, and caching
export async function makeGitHubRequest(url: string, maxRetries = 3): Promise<Response> {
  let retries = 0;
  let lastError: Error | null = null;
  
  // Initialize cache if not already created
  if (!window.gitHubRequestCache) {
    window.gitHubRequestCache = new Map();
  }
  
  // Check cache first (except for rate_limit endpoint which should always be fresh)
  const cacheKey = url;
  const isRateLimitUrl = url.includes('/rate_limit');
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL for most endpoints
  
  if (!isRateLimitUrl && window.gitHubRequestCache.has(cacheKey)) {
    const cachedData = window.gitHubRequestCache.get(cacheKey)!;
    const age = Date.now() - cachedData.timestamp;
    
    if (age < CACHE_TTL) {
      console.info(`Using cached data for ${url}, age: ${Math.round(age/1000)}s`);
      
      // Create a new Response object from the cached data
      const responseInit: ResponseInit = {};
      if (cachedData.headers) {
        responseInit.headers = cachedData.headers;
      }
      
      return new Response(
        typeof cachedData.data === 'string' 
          ? cachedData.data 
          : JSON.stringify(cachedData.data),
        responseInit
      );
    } else {
      console.info(`Cache expired for ${url}, fetching fresh data`);
    }
  }
  
  // Track ongoing requests to avoid overwhelming the API
  const pendingRequests = window.pendingGitHubRequests || 0;
  window.pendingGitHubRequests = pendingRequests + 1;
  
  try {
    // Add a small stagger for multiple concurrent requests
    if (pendingRequests > 2) {
      await new Promise(resolve => setTimeout(resolve, 200 * pendingRequests));
    }
    
    while (retries <= maxRetries) {
      try {
        const headers = addAuthHeaders();
        const response = await fetch(url, { headers });
        
        // Extract and store rate limit information from headers
        try {
          const rateLimit = {
            limit: parseInt(response.headers.get('x-ratelimit-limit') || '60', 10),
            remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10),
            reset: new Date(parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000),
            used: parseInt(response.headers.get('x-ratelimit-used') || '0', 10)
          };
          currentRateLimit = rateLimit;
          
          // Log rate limit info for debugging
          console.info(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit}, resets at ${rateLimit.reset.toLocaleTimeString()}`);
          
          // Low rate limit warning - consider slowing down future requests
          if (rateLimit.remaining < 5 && rateLimit.limit > 60) {
            // We're authenticated but still running low on requests
            console.warn(`Rate limit warning: only ${rateLimit.remaining} requests remaining`);
          }
        } catch (e) {
          console.warn('Failed to parse rate limit headers:', e);
        }
        
        // Check for rate limit or abuse detection responses
        if (response.status === 403 || response.status === 429) {
          const responseBody = await response.text();
          const isRateLimited = responseBody.includes("rate limit") || 
                               response.headers.get('x-ratelimit-remaining') === '0';
          const isAbuseDetection = responseBody.includes("abuse detection");
          
          const retryAfterHeader = response.headers.get('retry-after');
          const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : null;
          
          if (retries < maxRetries) {
            // For rate limits or abuse detection, use exponential backoff with jitter
            const baseWaitTime = retryAfter || (isAbuseDetection ? 5000 : 2000) * Math.pow(2, retries);
            // Add jitter to prevent thundering herd problem
            const jitter = Math.random() * 1000;
            const waitTime = baseWaitTime + jitter;
            
            console.warn(`API limit (${response.status}) on attempt ${retries + 1}. ` +
                        `Waiting ${Math.round(waitTime/1000)}s before retry...`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retries++;
            continue;
          } else {
            // If we've exhausted retries, throw with clear rate limit info
            const resetTime = currentRateLimit?.reset ? currentRateLimit.reset.toLocaleTimeString() : 'unknown time';
            const message = isRateLimited 
              ? `GitHub API rate limit exceeded. Limit resets at ${resetTime}.`
              : isAbuseDetection 
                ? `GitHub API abuse detection triggered. Please try again later.`
                : `GitHub API error: ${response.status}`;
            
            throw new Error(message);
          }
        }
        
        // Handle other potential error codes with retries
        if (!response.ok && retries < maxRetries) {
          const waitTime = 1000 * Math.pow(1.5, retries);
          console.warn(`API error ${response.status} on attempt ${retries + 1}. Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
          continue;
        }
        
        // Cache successful responses
        if (response.ok && !isRateLimitUrl) {
          try {
            // Clone the response so we can read it twice
            const clonedResponse = response.clone();
            
            // Try to get headers
            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
              headers[key] = value;
            });
            
            // Try to parse as JSON first
            try {
              const data = await clonedResponse.json();
              window.gitHubRequestCache!.set(cacheKey, {
                data,
                timestamp: Date.now(),
                headers
              });
            } catch (e) {
              // If not JSON, store as text
              const text = await clonedResponse.text();
              window.gitHubRequestCache!.set(cacheKey, {
                data: text,
                timestamp: Date.now(),
                headers
              });
            }
          } catch (e) {
            console.warn('Failed to cache response:', e);
          }
        }
        
        return response;
      } catch (error) {
        console.error(`API request failed (attempt ${retries + 1}):`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (retries < maxRetries) {
          // Wait a bit before retrying (increasing backoff)
          const waitTime = 1000 * Math.pow(2, retries);
          console.warn(`Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
          continue;
        }
        
        // If we've exhausted our retries, throw the last error
        throw lastError;
      }
    }
    
    // This should never be reached, but TypeScript requires a return
    throw lastError || new Error("Failed to complete request after retries");
  } finally {
    // Always decrement the pending request counter
    window.pendingGitHubRequests = Math.max(0, (window.pendingGitHubRequests || 1) - 1);
  }
}

// Add auth headers for GitHub API requests
export function addAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  // Add a user-agent to help with rate limiting
  headers['User-Agent'] = 'GitHub-Open-Source-Checker';
  
  // Add authentication token if available - improves rate limits and allows access to private repos
  const token = localStorage.getItem("github_access_token");
  if (token) {
    headers['Authorization'] = `token ${token}`;
    console.info('Using authenticated GitHub API request');
  } else {
    console.info('Using unauthenticated GitHub API request');
  }
  
  return headers;
}

// Rate repository description quality using LLM analysis
export async function rateRepoDescription(owner: string, repo: string): Promise<DescriptionRating> {
  try {
    // Fetch repository information
    const repoInfoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    
    try {
      const response = await makeGitHubRequest(repoInfoUrl);
      
      if (!response.ok) {
        return {
          text: "Unable to fetch repository description",
          rating: "missing"
        };
      }
      
      const repoInfo = await response.json();
      const description = repoInfo.description || "";
      
      if (!description) {
        return {
          text: "Repository has no description",
          rating: "missing",
          feedback: "Add a clear description explaining the purpose of this repository"
        };
      }
      
      // Use LLM to analyze the description quality
      try {
        const prompt = spark.llmPrompt`
          


Rate the quality of this GitHub repository description: "${description}"

Consider:
1. Clarity - Does it clearly explain what the repository is for?
2. Completeness - Does it cover the key functionality and purpose?
3. Conciseness - Is it appropriately detailed without being verbose?

In a polite and helpful tone provide:
1. A rating of either "great", "good", "poor" (exactly one of these words)
2. A brief explanation of why you gave this rating (1-2 sentences)

Format your response as JSON with two fields:
{
"rating": "great|good|poor",
"feedback": "explanation here"
}


        `;
        
        const analysis = await spark.llm(prompt, "gpt-4o-mini", true);
        const result = JSON.parse(analysis);
        
        return {
          text: description,
          rating: result.rating as 'great' | 'good' | 'poor',
          feedback: result.feedback
        };
      } catch (error) {
        console.error("Error using LLM for description analysis:", error);
        
        // Fallback to basic length check if LLM fails
        if (description.length < 10) {
          return {
            text: description,
            rating: "poor",
            feedback: "Description is too short. Add more details about what the project does."
          };
        } else if (description.length < 30) {
          return {
            text: description,
            rating: "good",
            feedback: "Decent description but could be more detailed."
          };
        } else {
          return {
            text: description,
            rating: "great",
            feedback: "Excellent description with good detail."
          };
        }
      }
    } catch (error) {
      console.error("Error fetching repository info:", error);
      return {
        text: "Error fetching repository description",
        rating: "missing"
      };
    }
  } catch (error) {
    console.error("Error rating repository description:", error);
    return {
      text: "Error analyzing repository description",
      rating: "missing"
    };
  }
}

// Scan repository code for internal references and confidential information
export async function scanForInternalReferences(owner: string, repo: string): Promise<{
  containsInternalRefs: boolean;
  issues: string[];
}> {
  try {
    // Since we can't scan all files in a repository easily via the API,
    // we'll use LLM to analyze content of commonly problematic files
    
    // Fetch common files that might contain internal references
    const filesToCheck = [
      'README.md',
      'CONTRIBUTING.md',
      'docs/README.md',
      'src/config.js',
      'src/config.ts',
      '.env.example',
      'config/default.json',
      'package.json'
    ];
    
    const issues: string[] = [];
    let containsInternalRefs = false;
    
    // Process files in smaller batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < filesToCheck.length; i += batchSize) {
      const batch = filesToCheck.slice(i, i + batchSize);
      
      // Process each batch in parallel
      const batchPromises = batch.map(async (filePath) => {
        try {
          const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
          
          // Use a slight delay between batches to avoid rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const response = await makeGitHubRequest(fileUrl);
          
          if (!response.ok) return null; // File doesn't exist, skip
          
          const fileData = await response.json();
          // Skip directories or empty files
          if (fileData.type !== 'file' || !fileData.content) return null;
          
          const content = atob(fileData.content); // Decode base64 content
          
          // Only analyze if content is substantial
          if (content.length < 10) return null;
          
          // Use LLM to analyze the content for internal references
          const prompt = spark.llmPrompt`
            
    Analyze this file content for a GitHub repository that will be open-sourced.
    
    File path: ${filePath}
    Content: ${content.substring(0, 4000)} ${content.length > 4000 ? '[content truncated for length]' : ''}
    
    Check for any of these concerning elements:
    1. Internal company paths, tools, or codenames
    2. Employee names or email aliases (especially internal patterns like username@github)
    3. API keys, tokens, or secrets
    4. Internal URLs, hostnames, or IP addresses
    5. References to proprietary or internal-only technology
    6. Company confidential information
    7. Trademarks or product icons/assets
    8. References to not-yet-announced products or features
    
    If you find any concerning elements, provide:
    1. A brief description of each issue found
    2. The general location in the file (e.g., "API key in configuration section")
    
    Format your response as JSON:
    {
      "hasIssues": true|false,
      "issues": ["issue description 1", "issue description 2", ...]
    }
    
    If no issues are found, return {"hasIssues": false, "issues": []}.

          `;
          
          try {
            // Use the mini model for faster analysis and to avoid hitting rate limits
            const analysis = await spark.llm(prompt, "gpt-4o-mini", true);
            const result = JSON.parse(analysis);
            
            if (result.hasIssues) {
              containsInternalRefs = true;
              return result.issues.map((issue: string) => `${filePath}: ${issue}`);
            }
          } catch (error) {
            console.error(`Error analyzing ${filePath} for internal references:`, error);
            return [`${filePath}: Error analyzing file content`];
          }
          
          return null;
        } catch (error) {
          console.error(`Error fetching ${filePath}:`, error);
          return null;
        }
      });
      
      // Wait for all files in this batch to be processed
      const batchResults = await Promise.all(batchPromises);
      
      // Filter out null results and flatten arrays
      batchResults.forEach(result => {
        if (Array.isArray(result)) {
          issues.push(...result);
        }
      });
      
      // Add a small delay between batches
      if (i + batchSize < filesToCheck.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      containsInternalRefs: issues.length > 0,
      issues
    };
  } catch (error) {
    console.error("Error scanning for internal references:", error);
    return {
      containsInternalRefs: false,
      issues: ["Error scanning repository files"]
    };
  }
}

// Analyze package.json for total dependencies
export async function analyzePackageJson(fileUrl: string): Promise<{
  dependenciesCount: number;
  devDependenciesCount: number;
}> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error("Could not retrieve package.json");
    }
    
    const fileData = await response.json();
    const content = JSON.parse(atob(fileData.content)); // Decode base64 content and parse JSON
    
    const dependencies = content.dependencies || {};
    const devDependencies = content.devDependencies || {};
    
    return {
      dependenciesCount: Object.keys(dependencies).length,
      devDependenciesCount: Object.keys(devDependencies).length
    };
  } catch (error) {
    console.error("Error analyzing package.json:", error);
    return {
      dependenciesCount: 0,
      devDependenciesCount: 0
    };
  }
}

// Check GitHub security features status (Secret scanning, Dependabot, CodeQL)
export async function checkSecurityFeatures(owner: string, repo: string): Promise<SecurityFeatures> {
  try {
    // GitHub API endpoints for different security features
    const securitySettingsUrl = `https://api.github.com/repos/${owner}/${repo}/security-and-analysis`;
    
    // Default result - assume features are disabled
    const result: SecurityFeatures = {
      secretScanningEnabled: false,
      dependabotSecurityUpdatesEnabled: false,
      codeqlEnabled: false
    };
    
    try {
      const response = await makeGitHubRequest(securitySettingsUrl);
      
      if (!response.ok) {
        console.warn(`Security settings API returned status ${response.status} for ${owner}/${repo}`);
        return result; // Return default disabled state
      }
      
      const securitySettings = await response.json();
      
      // Check secret scanning status
      if (securitySettings.secret_scanning && securitySettings.secret_scanning.status === 'enabled') {
        result.secretScanningEnabled = true;
      }
      
      // Check Dependabot security updates status
      if (securitySettings.dependabot_security_updates && securitySettings.dependabot_security_updates.status === 'enabled') {
        result.dependabotSecurityUpdatesEnabled = true;
      }
      
      // Check CodeQL analysis status
      if (securitySettings.advanced_security && securitySettings.advanced_security.status === 'enabled') {
        // Advanced Security is enabled, now check if CodeQL is specifically enabled
        // This is a simplification - in reality, you'd need to check workflow files or other APIs
        result.codeqlEnabled = true;
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching security features:", error);
      return result; // Return default disabled state on error
    }
  } catch (error) {
    console.error("Error checking security features:", error);
    return {
      secretScanningEnabled: false,
      dependabotSecurityUpdatesEnabled: false,
      codeqlEnabled: false
    };
  }
}

// Check for telemetry files in repository
export async function checkForTelemetryFiles(owner: string, repo: string): Promise<TelemetryCheck> {
  try {
    // Files to check for telemetry implementation
    const telemetryFilePatterns = [
      'telemetry.py', 
      'tracking.js',
      'analytics.js',
      'tracking.py',
      'telemetry.js',
      'analytics.py',
      'tracking/index.js',
      'telemetry/index.js',
      'analytics/index.js',
      'src/telemetry.js',
      'src/telemetry.ts',
      'src/analytics.js',
      'src/analytics.ts',
      'src/tracking.js',
      'src/tracking.ts'
    ];
    
    const foundTelemetryFiles: string[] = [];
    
    // First, let's check the root directory
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const response = await makeGitHubRequest(apiUrl);
    
    if (!response.ok) {
      console.warn(`Could not fetch repository contents for ${owner}/${repo}`);
      return {
        containsTelemetry: false,
        telemetryFiles: []
      };
    }
    
    const contents = await response.json();
    
    // Check files in root directory
    for (const item of contents) {
      if (item.type === 'file' && telemetryFilePatterns.includes(item.name)) {
        foundTelemetryFiles.push(item.path);
      }
    }
    
    // Check for telemetry files in common subdirectories
    const commonDirs = ['src', 'lib', 'utils', 'telemetry', 'analytics', 'tracking'];
    
    for (const dir of commonDirs) {
      // Check if the directory exists first
      const dirItem = contents.find((item: any) => item.name === dir && item.type === 'dir');
      
      if (dirItem) {
        const dirUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dir}`;
        try {
          const dirResponse = await makeGitHubRequest(dirUrl);
          
          if (dirResponse.ok) {
            const dirContents = await dirResponse.json();
            
            for (const item of dirContents) {
              if (item.type === 'file') {
                const filename = item.name.toLowerCase();
                if (
                  filename.includes('telemetry') || 
                  filename.includes('tracking') || 
                  filename.includes('analytics')
                ) {
                  foundTelemetryFiles.push(item.path);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error checking directory ${dir}:`, error);
        }
      }
    }
    
    return {
      containsTelemetry: foundTelemetryFiles.length > 0,
      telemetryFiles: foundTelemetryFiles
    };
  } catch (error) {
    console.error("Error checking for telemetry files:", error);
    return {
      containsTelemetry: false,
      telemetryFiles: []
    };
  }
}

// Check for ownership-name custom property
export async function checkOwnershipProperty(owner: string, repo: string): Promise<OwnershipProperty> {
  try {
    // API endpoint for custom properties
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/properties/ownership-name`;
    
    try {
      const response = await makeGitHubRequest(apiUrl);
      
      if (response.ok) {
        const propertyData = await response.json();
        return {
          exists: true,
          name: propertyData.value || null
        };
      } else if (response.status === 404) {
        // Property doesn't exist
        return {
          exists: false,
          name: null
        };
      } else {
        console.warn(`Error fetching ownership property: ${response.status}`);
        return {
          exists: false,
          name: null
        };
      }
    } catch (error) {
      console.error("Error making request for ownership property:", error);
      return {
        exists: false,
        name: null
      };
    }
  } catch (error) {
    console.error("Error checking ownership property:", error);
    return {
      exists: false,
      name: null
    };
  }
}

// Clear cached request data, useful when revalidating
export function clearGitHubRequestCache(url?: string): void {
  if (!window.gitHubRequestCache) {
    return;
  }
  
  if (url) {
    // Clear just one specific URL from cache
    window.gitHubRequestCache.delete(url);
    console.info(`Cleared cache for ${url}`);
  } else {
    // Clear all cached data
    window.gitHubRequestCache.clear();
    console.info("Cleared all GitHub API request cache");
  }
}

// Combined comprehensive file requirements list
export const consolidatedRequirements: FileRequirement[] = [
  { path: 'README.md', required: true, description: 'Project documentation' },
  { path: 'LICENSE', required: true, description: 'License information' },
  { path: 'CONTRIBUTING.md', required: true, description: 'Contribution guidelines' },
  { path: 'SUPPORT.md', required: true, description: 'Support information' },
  { path: 'SECURITY.md', required: true, description: 'Security policy' },
  { path: 'CODE_OF_CONDUCT.md', required: false, description: 'Code of conduct' },
  // JavaScript/TypeScript specific
  { path: '.eslintrc.json', required: false, description: 'ESLint configuration' },
  { path: 'tsconfig.json', required: false, description: 'TypeScript configuration' },
  // Python specific
  { path: 'requirements.txt', required: false, description: 'Python dependencies' },
  { path: 'setup.py', required: false, description: 'Package installation script' },
  // Special scan elements - these don't represent actual files but additional checks
  { path: 'internal-references-check', required: false, description: 'Internal references & confidential info check' },
  { path: 'security-features-check', required: false, description: 'GitHub security features check' },
  { path: 'telemetry-check', required: false, description: 'Telemetry files check' },
  { path: 'ownership-property-check', required: false, description: 'Ownership property check' }
];