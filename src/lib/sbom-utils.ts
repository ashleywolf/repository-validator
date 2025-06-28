// SBOM data handling utilities
import { makeGitHubRequest, getSbomApiUrl } from './utils';

// Type definition for dependency license data
export type DependencyLicense = {
  name: string;
  license: string;
  version: string;
};

/**
 * Efficiently fetches and processes SBOM data with built-in caching and rate limit awareness
 * 
 * @param owner Repository owner
 * @param repo Repository name
 * @returns Object containing license breakdown and other dependency statistics
 */
export async function fetchSbomData(owner: string, repo: string) {
  try {
    // Check for cached SBOM data first
    const storageKey = `sbom_${owner}_${repo}`;
    const cachedData = localStorage.getItem(storageKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheTime = parsed.timestamp || 0;
        
        // Use cache if less than 24 hours old
        if (Date.now() - cacheTime < 24 * 60 * 60 * 1000) {
          console.info(`Using cached SBOM data for ${owner}/${repo}`);
          return parsed.data;
        }
      } catch (e) {
        console.warn("Error parsing cached SBOM data:", e);
        // Continue to fetch fresh data if cache parsing failed
      }
    }
    
    // Fetch fresh SBOM data
    const sbomUrl = getSbomApiUrl(owner, repo);
    const response = await makeGitHubRequest(sbomUrl, 3); // Use fewer retries to respect rate limits
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`SBOM data not available for ${owner}/${repo}`);
        return {
          mitCount: 0,
          sbomDependenciesCount: 0,
          licenseBreakdown: {},
          dependencies: []
        };
      }
      
      console.warn(`SBOM API returned status ${response.status} for ${owner}/${repo}`);
      throw new Error(`Failed to fetch SBOM data: ${response.status}`);
    }
    
    const sbomData = await response.json();
    
    // Process SBOM data
    const result = processSbomData(sbomData);
    
    // Cache the result
    localStorage.setItem(storageKey, JSON.stringify({
      data: result,
      timestamp: Date.now()
    }));
    
    return result;
  } catch (error) {
    console.error("Error fetching SBOM data:", error);
    return {
      mitCount: 0,
      sbomDependenciesCount: 0,
      licenseBreakdown: {},
      dependencies: []
    };
  }
}

/**
 * Processes raw SBOM data into a more usable format
 */
function processSbomData(sbomData: any) {
  // Initialize result with default values
  const result = {
    mitCount: 0,
    sbomDependenciesCount: 0,
    licenseBreakdown: {} as Record<string, number>,
    dependencies: [] as DependencyLicense[],
    rawSbomData: sbomData
  };
  
  // If SBOM data is not available or doesn't have expected structure, return defaults
  if (!sbomData || !sbomData.sbom || !sbomData.sbom.packages) {
    return result;
  }
  
  // Count packages and build license breakdown
  result.sbomDependenciesCount = sbomData.sbom.packages.length;
  
  // Process each package
  sbomData.sbom.packages.forEach((pkg: any) => {
    const license = pkg.licenseConcluded || "Unknown";
    
    // Count MIT licenses specifically
    if (license === "MIT") {
      result.mitCount++;
    }
    
    // Add to license breakdown
    result.licenseBreakdown[license] = (result.licenseBreakdown[license] || 0) + 1;
    
    // Add to dependencies list
    if (pkg.name) {
      result.dependencies.push({
        name: pkg.name,
        license: license,
        version: pkg.versionInfo || "unknown"
      });
    }
  });
  
  return result;
}

/**
 * Gets a simple summary of copyleft licenses in SBOM data
 */
export function getSbomCopyleftSummary(licenseBreakdown: Record<string, number>) {
  const copyleftLicenses = Object.keys(licenseBreakdown).filter(license => {
    const lower = license.toLowerCase();
    return (lower.includes('gpl') && !lower.includes('lgpl')) || 
           lower.includes('agpl') || 
           lower === 'unknown';
  });
  
  return {
    hasCopyleft: copyleftLicenses.length > 0,
    copyleftCount: copyleftLicenses.reduce((sum, license) => sum + licenseBreakdown[license], 0),
    copyleftLicenses
  };
}