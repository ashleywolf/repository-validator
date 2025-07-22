import { parseGitHubUrl } from "@/lib/utils";

// Types for our API responses
export interface RepoData {
  owner: string;
  repo: string;
  repoUrl: string;
  files: {
    readme: boolean;
    license: boolean;
    contributing: boolean;
    codeOfConduct: boolean;
    security: boolean;
  };
  description: {
    text: string;
    rating: "great" | "good" | "poor" | "missing";
  };
  licenses: {
    name: string | null;
    holder: string | null;
    text: string | null;
  };
  dependencies: {
    total: number;
    licenses: Record<string, number>;
    hasCopyleft: boolean;
  };
}

// Helper function to check if a license might be copyleft
const isCopyleftLicense = (license: string): boolean => {
  const copyleftLicenses = ["GPL", "AGPL", "LGPL", "MPL", "EPL", "CDDL", "CPL"];
  return copyleftLicenses.some(l => license.toUpperCase().includes(l));
};

// Function to check if a GitHub file exists
const checkFileExists = async (owner: string, repo: string, path: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    return response.status === 200;
  } catch (error) {
    console.error(`Error checking ${path}:`, error);
    return false;
  }
};

// Function to fetch file content
const fetchFileContent = async (owner: string, repo: string, path: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    if (response.status === 200) {
      const data = await response.json();
      // GitHub API returns content as base64 encoded
      return atob(data.content);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    return null;
  }
};

// Function to check repository description
const checkRepoDescription = async (owner: string, repo: string): Promise<{ text: string; rating: "great" | "good" | "poor" | "missing" }> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (response.status === 200) {
      const data = await response.json();
      const description = data.description || "";
      
      // Use LLM to rate the description
      const prompt = spark.llmPrompt`Rate this GitHub repository description as "great", "good", "poor", or "missing" (if empty):
      
      "${description}"
      
      Provide a JSON response with both the rating and a brief explanation why:
      { "rating": "great|good|poor|missing", "explanation": "brief reason for rating" }`;
      
      const ratingResult = await spark.llm(prompt, "gpt-4o-mini", true);
      const parsedRating = JSON.parse(ratingResult);
      
      return {
        text: description,
        rating: parsedRating.rating as "great" | "good" | "poor" | "missing"
      };
    }
    return { text: "", rating: "missing" };
  } catch (error) {
    console.error("Error checking repo description:", error);
    return { text: "", rating: "missing" };
  }
};

// Parse license information
const parseLicenseInfo = async (owner: string, repo: string): Promise<{ name: string | null; holder: string | null; text: string | null }> => {
  const licenseFiles = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md", "license.txt"];
  let licenseContent = null;
  
  // Try to find and fetch license file
  for (const file of licenseFiles) {
    licenseContent = await fetchFileContent(owner, repo, file);
    if (licenseContent) break;
  }
  
  if (!licenseContent) {
    return { name: null, holder: null, text: null };
  }
  
  // Use LLM to extract license type and copyright holder
  const prompt = spark.llmPrompt`Extract the license type and copyright holder from this license text. 
  The license text is: "${licenseContent.substring(0, 2000)}"
  
  Respond with a JSON object like this:
  {
    "licenseType": "MIT|Apache-2.0|GPL-3.0|etc",
    "copyrightHolder": "The extracted copyright holder name or null if not found",
    "copyrightText": "The full copyright sentence if GitHub is mentioned as the copyright holder, or null"
  }`;
  
  try {
    const licenseInfo = await spark.llm(prompt, "gpt-4o-mini", true);
    const parsedInfo = JSON.parse(licenseInfo);
    
    return {
      name: parsedInfo.licenseType,
      holder: parsedInfo.copyrightHolder,
      text: parsedInfo.copyrightText
    };
  } catch (error) {
    console.error("Error parsing license:", error);
    return {
      name: "Unknown",
      holder: "Unknown",
      text: null
    };
  }
};

// Fetch dependency data from SBOM
const fetchDependencies = async (owner: string, repo: string): Promise<{ total: number; licenses: Record<string, number>; hasCopyleft: boolean }> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dependency-graph/sbom`);
    
    if (response.status === 200) {
      const data = await response.json();
      const packages = data.sbom?.packages || [];
      
      // Count total dependencies and licenses
      const licenseCount: Record<string, number> = {};
      let hasCopyleft = false;
      
      packages.forEach((pkg: any) => {
        const license = pkg.licenseConcluded || "Unknown";
        licenseCount[license] = (licenseCount[license] || 0) + 1;
        
        if (isCopyleftLicense(license)) {
          hasCopyleft = true;
        }
      });
      
      return {
        total: packages.length - 1, // Subtract 1 to exclude the repository itself
        licenses: licenseCount,
        hasCopyleft
      };
    }
    
    return { total: 0, licenses: {}, hasCopyleft: false };
  } catch (error) {
    console.error("Error fetching dependencies:", error);
    return { total: 0, licenses: {}, hasCopyleft: false };
  }
};

// Main function to validate a repository
export const validateRepository = async (repoUrl: string): Promise<RepoData | null> => {
  try {
    const parsedUrl = parseGitHubUrl(repoUrl);
    if (!parsedUrl) return null;
    
    const { owner, repo } = parsedUrl;
    
    // Check for required files
    const [
      hasReadme,
      hasLicense,
      hasContributing,
      hasCodeOfConduct,
      hasSecurity,
      description,
      licenseInfo,
      dependencyInfo
    ] = await Promise.all([
      checkFileExists(owner, repo, "README.md") || checkFileExists(owner, repo, "readme.md"),
      checkFileExists(owner, repo, "LICENSE") || checkFileExists(owner, repo, "LICENSE.md") || checkFileExists(owner, repo, "LICENSE.txt"),
      checkFileExists(owner, repo, "CONTRIBUTING.md") || checkFileExists(owner, repo, "CONTRIBUTING"),
      checkFileExists(owner, repo, "CODE_OF_CONDUCT.md") || checkFileExists(owner, repo, ".github/CODE_OF_CONDUCT.md"),
      checkFileExists(owner, repo, "SECURITY.md") || checkFileExists(owner, repo, ".github/SECURITY.md"),
      checkRepoDescription(owner, repo),
      parseLicenseInfo(owner, repo),
      fetchDependencies(owner, repo)
    ]);
    
    return {
      owner,
      repo,
      repoUrl: `https://github.com/${owner}/${repo}`,
      files: {
        readme: hasReadme,
        license: hasLicense,
        contributing: hasContributing,
        codeOfConduct: hasCodeOfConduct,
        security: hasSecurity
      },
      description,
      licenses: licenseInfo,
      dependencies: dependencyInfo
    };
  } catch (error) {
    console.error("Error validating repository:", error);
    return null;
  }
};

// Get a template URL for missing files
export const getTemplateUrl = (fileType: string): string => {
  const templateBaseUrl = "https://github.com/github/github-ospo/tree/main/release%20template";
  
  switch (fileType.toLowerCase()) {
    case "readme":
      return `${templateBaseUrl}/README.md`;
    case "license":
      return `${templateBaseUrl}/LICENSE`;
    case "contributing":
      return `${templateBaseUrl}/CONTRIBUTING.md`;
    case "codeofconduct":
      return `${templateBaseUrl}/CODE_OF_CONDUCT.md`;
    case "security":
      return `${templateBaseUrl}/SECURITY.md`;
    default:
      return templateBaseUrl;
  }
};