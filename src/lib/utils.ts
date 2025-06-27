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
      licenseBreakdown
    };
  } catch (error) {
    console.error("Error analyzing SBOM data:", error);
    return {
      mitCount: 0,
      sbomDependenciesCount: 0,
      licenseBreakdown: {}
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

// Rate repository description quality using LLM analysis
export async function rateRepoDescription(owner: string, repo: string): Promise<DescriptionRating> {
  try {
    // Fetch repository information
    const repoInfoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(repoInfoUrl);
    
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
        
        Provide:
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
    console.error("Error rating repository description:", error);
    return {
      text: "Error analyzing repository description",
      rating: "missing"
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

// Combined comprehensive file requirements list
export const consolidatedRequirements: FileRequirement[] = [
  { path: 'README.md', required: true, description: 'Project documentation' },
  { path: 'LICENSE', required: true, description: 'License information' },
  { path: 'LICENSE.txt', required: false, description: 'License information (alternate)' },
  { path: 'CONTRIBUTING.md', required: true, description: 'Contribution guidelines' },
  { path: 'SUPPORT.md', required: true, description: 'Support information' },
  { path: 'SECURITY.md', required: true, description: 'Security policy' },
  { path: '.gitignore', required: false, description: 'Git ignore rules' },
  { path: 'CODE_OF_CONDUCT.md', required: false, description: 'Code of conduct' },
  // JavaScript/TypeScript specific
  { path: 'package.json', required: false, description: 'NPM package configuration' },
  { path: 'package-lock.json', required: false, description: 'NPM dependency lock file' },
  { path: '.eslintrc.json', required: false, description: 'ESLint configuration' },
  { path: 'tsconfig.json', required: false, description: 'TypeScript configuration' },
  // Python specific
  { path: 'requirements.txt', required: false, description: 'Python dependencies' },
  { path: 'setup.py', required: false, description: 'Package installation script' }
];
