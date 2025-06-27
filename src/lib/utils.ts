import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
}

export type ValidationResult = {
  exists: boolean;
  message: string;
  status: 'success' | 'warning' | 'error';
  location?: 'repo' | 'org' | 'none';
  prUrl?: string;
  licenseCheck?: LicenseCheck;
  dependencyAnalysis?: DependencyAnalysis;
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

// Check if a license file contains GitHub copyright
export async function checkLicenseFile(fileUrl: string): Promise<LicenseCheck> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return {
        isValid: false,
        message: "Could not retrieve license content"
      };
    }
    
    const fileData = await response.text();
    
    try {
      // If it's a JSON response with base64 content
      const jsonData = JSON.parse(fileData);
      const content = atob(jsonData.content); // Decode base64 content
      
      // Check for variations of GitHub copyright
      const githubPatterns = [
        /GitHub, Inc/i,
        /GitHub Inc/i,
        /GitHub/i
      ];
      
      const containsGitHub = githubPatterns.some(pattern => pattern.test(content));
      
      if (containsGitHub) {
        return {
          isValid: true,
          message: "License contains GitHub copyright notice"
        };
      } else {
        return {
          isValid: false,
          message: "License does not contain GitHub copyright notice"
        };
      }
    } catch (error) {
      // If it's not a JSON response or can't be parsed as JSON
      // Check for GitHub directly in the response text
      const githubPatterns = [
        /GitHub, Inc/i,
        /GitHub Inc/i,
        /GitHub/i
      ];
      
      const containsGitHub = githubPatterns.some(pattern => pattern.test(fileData));
      
      if (containsGitHub) {
        return {
          isValid: true,
          message: "License contains GitHub copyright notice"
        };
      } else {
        return {
          isValid: false,
          message: "License does not contain GitHub copyright notice"
        };
      }
    }
  } catch (error) {
    console.error("Error checking license file:", error);
    return {
      isValid: false,
      message: "Error analyzing license file"
    };
  }
}

// Analyze package-lock.json for GPL/AGPL dependencies
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
    
    // Check license in each dependency
    Object.entries(dependencies).forEach(([name, info]: [string, any]) => {
      if (name === '') return; // Skip root package
      
      const license = typeof info.license === 'string' 
        ? info.license 
        : (info.licenses ? info.licenses.join(', ') : '');
      
      if (license) {
        if (/GPL-3\.0|GPL3|GNU General Public License v3/i.test(license) && !/LGPL|Lesser/i.test(license)) {
          gplDependencies.push(`${name.replace('node_modules/', '')}: ${license}`);
        }
        if (/AGPL|Affero/i.test(license)) {
          agplDependencies.push(`${name.replace('node_modules/', '')}: ${license}`);
        }
      }
    });
    
    return {
      total: Object.keys(dependencies).length - 1, // Subtract root package
      gplCount: gplDependencies.length,
      agplCount: agplDependencies.length,
      gplDependencies,
      agplDependencies
    };
  } catch (error) {
    console.error("Error analyzing dependencies:", error);
    return {
      total: 0,
      gplCount: 0,
      agplCount: 0,
      gplDependencies: [],
      agplDependencies: []
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

// Common file requirements presets
export const commonRequirements: Record<string, FileRequirement[]> = {
  basic: [
    { path: 'README.md', required: true, description: 'Project documentation' },
    { path: 'LICENSE', required: true, description: 'License information' },
    { path: 'LICENSE.txt', required: false, description: 'License information (alternate)' },
    { path: 'CONTRIBUTING.md', required: true, description: 'Contribution guidelines' },
    { path: 'SUPPORT.md', required: true, description: 'Support information' },
    { path: 'SECURITY.md', required: true, description: 'Security policy' },
    { path: '.gitignore', required: false, description: 'Git ignore rules' }
  ],
  javascript: [
    { path: 'package.json', required: true, description: 'NPM package configuration' },
    { path: 'package-lock.json', required: false, description: 'NPM dependency lock file' },
    { path: 'README.md', required: true, description: 'Project documentation' },
    { path: 'LICENSE', required: true, description: 'License information' },
    { path: 'LICENSE.txt', required: false, description: 'License information (alternate)' },
    { path: 'CONTRIBUTING.md', required: true, description: 'Contribution guidelines' },
    { path: 'SUPPORT.md', required: true, description: 'Support information' },
    { path: 'SECURITY.md', required: true, description: 'Security policy' },
    { path: '.gitignore', required: false, description: 'Git ignore rules' },
    { path: '.eslintrc.json', required: false, description: 'ESLint configuration' },
    { path: 'tsconfig.json', required: false, description: 'TypeScript configuration' }
  ],
  python: [
    { path: 'README.md', required: true, description: 'Project documentation' },
    { path: 'LICENSE', required: true, description: 'License information' },
    { path: 'LICENSE.txt', required: false, description: 'License information (alternate)' },
    { path: 'CONTRIBUTING.md', required: true, description: 'Contribution guidelines' },
    { path: 'SUPPORT.md', required: true, description: 'Support information' },
    { path: 'SECURITY.md', required: true, description: 'Security policy' },
    { path: '.gitignore', required: false, description: 'Git ignore rules' },
    { path: 'requirements.txt', required: true, description: 'Python dependencies' },
    { path: 'setup.py', required: false, description: 'Package installation script' }
  ]
}
