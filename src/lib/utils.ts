import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
