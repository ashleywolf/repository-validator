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
}

export type ValidationResult = {
  exists: boolean;
  message: string;
  status: 'success' | 'warning' | 'error';
  location?: 'repo' | 'org' | 'none';
  prUrl?: string;
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
  return `https://api.github.com/repos/github/open-source-releases/contents/templates/${filename}`;
}

// Common file requirements presets
export const commonRequirements: Record<string, FileRequirement[]> = {
  basic: [
    { path: 'README.md', required: true, description: 'Project documentation' },
    { path: 'LICENSE', required: true, description: 'License information' },
    { path: 'CONTRIBUTING.md', required: true, description: 'Contribution guidelines' },
    { path: 'SUPPORT.md', required: true, description: 'Support information' },
    { path: 'SECURITY.md', required: true, description: 'Security policy' },
    { path: '.gitignore', required: false, description: 'Git ignore rules' }
  ],
  javascript: [
    { path: 'package.json', required: true, description: 'NPM package configuration' },
    { path: 'README.md', required: true, description: 'Project documentation' },
    { path: 'LICENSE', required: true, description: 'License information' },
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
    { path: 'CONTRIBUTING.md', required: true, description: 'Contribution guidelines' },
    { path: 'SUPPORT.md', required: true, description: 'Support information' },
    { path: 'SECURITY.md', required: true, description: 'Security policy' },
    { path: '.gitignore', required: false, description: 'Git ignore rules' },
    { path: 'requirements.txt', required: true, description: 'Python dependencies' },
    { path: 'setup.py', required: false, description: 'Package installation script' }
  ]
}
