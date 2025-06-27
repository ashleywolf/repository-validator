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
  mitCount?: number; // Count of MIT licensed dependencies from SBOM
  sbomDependenciesCount?: number; // Total count of dependencies from SBOM
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

// Get the URL for GitHub SBOM API calls
export function getSbomApiUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/dependency-graph/sbom`;
}

// Analyze SBOM data for license information
export async function analyzeSbomData(owner: string, repo: string): Promise<{
  mitCount: number;
  sbomDependenciesCount: number;
}> {
  try {
    const sbomUrl = getSbomApiUrl(owner, repo);
    const response = await fetch(sbomUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      console.error("SBOM API error:", response.status);
      return {
        mitCount: 0,
        sbomDependenciesCount: 0
      };
    }
    
    const sbomData = await response.json();
    
    // Count dependencies and MIT licenses
    let sbomDependenciesCount = 0;
    let mitCount = 0;
    
    // Navigate SBOM structure - may vary based on actual API response
    if (sbomData.sbom && sbomData.sbom.packages) {
      sbomDependenciesCount = sbomData.sbom.packages.length;
      
      // Count MIT licenses
      mitCount = sbomData.sbom.packages.filter((pkg: any) => {
        return pkg.licenseConcluded === "MIT";
      }).length;
    }
    
    return {
      mitCount,
      sbomDependenciesCount
    };
  } catch (error) {
    console.error("Error analyzing SBOM data:", error);
    return {
      mitCount: 0,
      sbomDependenciesCount: 0
    };
  }
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
    
    if (githubMatch) {
      return {
        isValid: true,
        message: githubMatch[0].trim()
      };
    } else {
      return {
        isValid: false,
        message: "License does not contain GitHub copyright notice"
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

// Analyze package-lock.json for GPL/AGPL dependencies and total count
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
    
    // Count the actual dependencies (excluding the root package)
    const dependencyCount = Object.keys(dependencies).filter(name => name !== '').length;
    
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
      total: dependencyCount,
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
