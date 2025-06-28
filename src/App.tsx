import React, { useState, useEffect } from "react";
import { 
  FileRequirement,
  ValidationSummary,
  ValidationResult,
  RepoFile,
  isValidGitHubUrl,
  parseGitHubUrl,
  getOrgDotGithubApiUrl,
  getTemplateApiUrl,
  consolidatedRequirements,
  checkLicenseFile,
  analyzeSbomData,
  rateRepoDescription,
  DescriptionRating,
  makeGitHubRequest,
  exportSbomData,
  scanForInternalReferences,
  checkSecurityFeatures,
  SecurityFeatures,
  checkForTelemetryFiles,
  TelemetryCheck,
  checkOwnershipProperty,
  OwnershipProperty,
  clearGitHubRequestCache,
  checkRateLimits
} from "./lib/utils";
import { FileTemplate, getAllTemplates } from "./lib/templates";
import { TemplateViewer } from "./components/template-viewer";
import { ThemeProvider } from "./context/theme-context";
import { ThemeToggle } from "./components/theme-toggle";
import { GitHubLogo } from "./components/github-logo";
import { CreatePRButton } from "./components/create-pr-button";
import { RepoAnalyzer } from "./components/repo-analyzer";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  GithubLogo, 
  MagnifyingGlass, 
  Check, 
  X, 
  Warning, 
  Package,
  Star,
  StarHalf,
  LinkSimple,
  FolderOpen as FolderOpenIcon,
  ShieldCheck,
  ShieldWarning,
  Gauge,
  UserCircle,
  Key,
  Brain
} from "@phosphor-icons/react";

function AppContent() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [requirements] = useState<FileRequirement[]>(consolidatedRequirements);
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [showTemplateView, setShowTemplateView] = useState(false);
  const [descriptionRating, setDescriptionRating] = useState<DescriptionRating | null>(null);
  
  // Handle URL validation and repo scanning
  const handleValidate = async () => {
    // Reset states
    setError(null);
    setValidationSummary(null);
    setSelectedTemplate(null);
    setShowTemplateView(false);
    setDescriptionRating(null);
    
    // Clear any cached data when validating a new repo
    clearGitHubRequestCache();
    
    // Validate URL format
    if (!isValidGitHubUrl(url)) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }
    
    setLoading(true);
    
    try {
      // Parse GitHub URL
      const repoInfo = parseGitHubUrl(url);
      if (!repoInfo) {
        throw new Error("Invalid GitHub URL format");
      }
      
      const { owner, repo } = repoInfo;
      
      // Create the API URL for fetching contents
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
      
      let repoContents;
      
      // First check rate limits proactively before making any requests
      // to avoid hitting limits unexpectedly
      const rateLimitCheck = await checkRateLimits();
      if (!rateLimitCheck.ok) {
        throw new Error(`Rate limit exceeded. GitHub limits API requests to 60 per hour for unauthenticated users. Limit resets at approximately ${rateLimitCheck.resetTime}.`);
      }
      
      // Use the makeGitHubRequest helper with retries, auth handling and caching
      try {
        // Log API request for debugging
        console.info(`Making GitHub API request to: ${apiUrl}`);
        
        const response = await makeGitHubRequest(apiUrl);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Repository not found. The URL may be incorrect.");
          } else if (response.status === 403) {
            // Show a more friendly error for public repos
            const responseText = await response.text();
            if (responseText.toLowerCase().includes("rate limit exceeded")) {
              throw new Error(`GitHub API rate limit exceeded. Please try again later.`);
            } else if (response.status === 404) {
              throw new Error(`Repository not found. The URL may be incorrect or the repository doesn't exist.`);
            } else if (response.status === 401) {
              throw new Error(`Repository not found or inaccessible. Please verify the URL is correct and the repository is public.`);
            } else {
              throw new Error(`GitHub API error: ${response.status}`);
            }
          } else if (response.status === 401) {
            throw new Error(`Repository not found or inaccessible. Please verify the URL is correct and the repository is public.`);
          } else {
            throw new Error(`GitHub API error: ${response.status}`);
          }
        }
        
        repoContents = await response.json();
      } catch (error) {
        console.error("Error fetching repository contents:", error);
        throw error;
      }
      
      // Transform API response to our RepoFile format
      const files: RepoFile[] = repoContents.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        download_url: item.download_url
      }));
      
      // Get repository description rating
      let repoDescriptionRating = null;
      try {
        repoDescriptionRating = await rateRepoDescription(owner, repo);
        setDescriptionRating(repoDescriptionRating);
      } catch (error) {
        console.error("Error getting repo description:", error);
        // Continue without description rating
      }
      
      // Validate files against requirements
      const results: Record<string, ValidationResult> = {};
      let missingRequired = 0;
      let missingRecommended = 0;
      
      // Try to fetch SBOM data
      let sbomAnalysis = null;
      try {
        sbomAnalysis = await analyzeSbomData(owner, repo);
      } catch (error) {
        console.error("Error fetching SBOM data:", error);
        // Continue without SBOM data
      }
      
      // Check each requirement
      for (const req of requirements) {
        // Check if file exists in repo - handle LICENSE as the only license file
        const fileInRepo = files.find(file => {
          return file.path.toLowerCase() === req.path.toLowerCase();
        });
        
        const fileExists = !!fileInRepo;
        
        if (fileExists) {
          const result: ValidationResult = {
            exists: true,
            message: `${req.description} found in repository`,
            status: 'success',
            location: 'repo',
            fileUrl: `https://github.com/${owner}/${repo}/blob/main/${fileInRepo.path}`
          };
          
          // Special checks for specific files
          if (fileInRepo.path === 'LICENSE') {
            // Check license content
            try {
              const licenseCheck = await checkLicenseFile(fileInRepo.download_url);
              result.licenseCheck = licenseCheck;
              
              if (!licenseCheck.isValid) {
                result.status = 'warning';
                result.message = `${req.description} found but missing GitHub copyright notice`;
              }
            } catch (error) {
              console.error("Error checking license:", error);
            }
          }
          
          // Add SBOM data to the appropriate result
          if (sbomAnalysis && req.path === 'package.json') {
            if (!result.dependencyAnalysis) {
              result.dependencyAnalysis = {
                total: 0,
                gplCount: 0,
                agplCount: 0,
                gplDependencies: [],
                agplDependencies: [],
                sbomDependenciesCount: sbomAnalysis.sbomDependenciesCount,
                mitCount: sbomAnalysis.mitCount
              };
            }
            
            // Add license breakdown from SBOM data
            if (sbomAnalysis.licenseBreakdown) {
              result.dependencyAnalysis.licenseBreakdown = sbomAnalysis.licenseBreakdown;
              
              // Check for GPL/AGPL licenses in SBOM data
              let hasWarningLicenses = false;
              for (const [license, count] of Object.entries(sbomAnalysis.licenseBreakdown)) {
                const licenseType = license.toLowerCase();
                if (
                  (licenseType.includes('gpl') && !licenseType.includes('lgpl')) || 
                  licenseType.includes('agpl') || 
                  licenseType === 'unknown'
                ) {
                  hasWarningLicenses = true;
                  break;
                }
              }
              
              if (hasWarningLicenses) {
                result.status = 'warning';
                result.message = `${req.description} found with dependencies that require license review`;
              }
            }
          }
          
          results[req.path] = result;
        } else {
          // File not found in repo, check organization .github repo
          try {
            const orgDotGithubUrl = getOrgDotGithubApiUrl(owner);
            
            let orgContents;
            
            try {
              const response = await makeGitHubRequest(orgDotGithubUrl);
              orgContents = response.ok ? await response.json() : [];
            } catch (error) {
              console.warn("Error checking organization .github repo:", error);
              orgContents = [];
            }
            
            const fileExistsInOrg = orgContents.some((item: any) => 
              item.path.toLowerCase() === req.path.toLowerCase()
            );
            
            if (fileExistsInOrg) {
              const orgFile = orgContents.find((item: any) => 
                item.path.toLowerCase() === req.path.toLowerCase()
              );
              
              results[req.path] = {
                exists: true,
                message: `${req.description} found in organization .github repo`,
                status: 'success',
                location: 'org',
                fileUrl: `https://github.com/${owner}/.github/blob/main/${orgFile.path}`
              };
              continue;
            }
          } catch (error) {
            console.error("Error checking organization .github repo:", error);
            // Continue with validation, we'll mark as missing
          }
          
          // File not found in repo or org .github
          if (req.required) {
            missingRequired++;
            
            // For missing required files, create template info for PR
            results[req.path] = {
              exists: false,
              message: `Required ${req.description} is missing`,
              status: 'error',
              location: 'none',
              prUrl: `https://github.com/${owner}/${repo}/new/main?filename=${req.path}&value=`
            };
          } else {
            missingRecommended++;
            results[req.path] = {
              exists: false,
              message: `Recommended ${req.description} is missing`,
              status: 'warning',
              location: 'none'
            };
          }
        }
      }
      
      // Add standalone dependency analysis if SBOM data exists
      if (sbomAnalysis && !results['dependency-analysis']) {
        results['dependency-analysis'] = {
          exists: true,
          message: 'Dependency analysis completed',
          status: sbomAnalysis.licenseBreakdown && 
            Object.keys(sbomAnalysis.licenseBreakdown).some(license => 
              (license.toLowerCase().includes('gpl') && !license.toLowerCase().includes('lgpl')) || 
              license.toLowerCase().includes('agpl') || 
              license.toLowerCase() === 'unknown'
            ) ? 'warning' : 'success',
          dependencyAnalysis: {
            total: sbomAnalysis.sbomDependenciesCount,
            gplCount: 0,
            agplCount: 0,
            gplDependencies: [],
            agplDependencies: [],
            sbomDependenciesCount: sbomAnalysis.sbomDependenciesCount,
            mitCount: sbomAnalysis.mitCount,
            licenseBreakdown: sbomAnalysis.licenseBreakdown,
            rawSbomData: sbomAnalysis.rawSbomData
          }
        };
      }
      
      // Set validation summary with basic results first
      setValidationSummary({
        repoName: `${owner}/${repo}`,
        repoUrl: url,
        results,
        missingRequired,
        missingRecommended,
        owner,
        repo
      });
      
      // Progressive loading approach for additional checks
      setTimeout(async () => {
        try {
          // Only show toast notification if user is still on the page
          if (document.visibilityState === 'visible') {
            toast.info("Loading additional repository data...", {
              description: "We're gathering more information about the repository. This may take a moment."
            });
          }
            
          // Perform these checks sequentially rather than in parallel to avoid rate limits
          const results = { ...validationSummary.results };
          
          // Security features check - first priority
          try {
            const securityFeaturesCheck = await checkSecurityFeatures(owner, repo);
            
            // Determine status based on enabled features
            const allFeaturesEnabled = 
              securityFeaturesCheck.secretScanningEnabled && 
              securityFeaturesCheck.dependabotSecurityUpdatesEnabled && 
              securityFeaturesCheck.codeqlEnabled;
              
            const someFeaturesEnabled = 
              securityFeaturesCheck.secretScanningEnabled || 
              securityFeaturesCheck.dependabotSecurityUpdatesEnabled || 
              securityFeaturesCheck.codeqlEnabled;
            
            results['security-features-check'] = {
              exists: true,
              message: allFeaturesEnabled 
                ? 'All security features are enabled' 
                : someFeaturesEnabled 
                  ? 'Some security features are enabled, but not all'
                  : 'No security features are enabled',
              status: allFeaturesEnabled ? 'success' : someFeaturesEnabled ? 'warning' : 'error',
              location: 'repo',
              securityFeatures: securityFeaturesCheck
            };
            
            // Update UI with each successful check
            setValidationSummary(prevState => ({
              ...prevState,
              results: { ...prevState.results, ...results }
            }));
          } catch (error) {
            console.error("Error checking security features:", error);
            // Continue with other checks
          }
          
          // Add small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Ownership property check - second priority
          try {
            const ownershipProperty = await checkOwnershipProperty(owner, repo);
            
            results['ownership-property-check'] = {
              exists: true,
              message: ownershipProperty.exists 
                ? `Ownership property found: ${ownershipProperty.name}` 
                : 'No ownership property set for this repository',
              status: ownershipProperty.exists ? 'success' : 'warning',
              location: 'repo',
              ownershipProperty: ownershipProperty
            };
            
            // Update UI with this check's results
            setValidationSummary({
              ...validationSummary,
              results
            });
          } catch (error) {
            console.error("Error checking for ownership property:", error);
            // Continue with other checks
          }
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Internal references check - third priority
          try {
            const internalRefsCheck = await scanForInternalReferences(owner, repo);
            
            results['internal-references-check'] = {
              exists: true,
              message: internalRefsCheck.containsInternalRefs 
                ? 'Found potential internal references or confidential information'
                : 'No internal references or confidential information detected',
              status: internalRefsCheck.containsInternalRefs ? 'warning' : 'success',
              location: 'repo',
              internalReferences: internalRefsCheck.issues
            };
            
            // Update UI with this check's results
            setValidationSummary({
              ...validationSummary,
              results
            });
          } catch (error) {
            console.error("Error scanning for internal references:", error);
            // Continue with other checks
          }
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Telemetry check - lowest priority
          try {
            const telemetryCheck = await checkForTelemetryFiles(owner, repo);
            
            results['telemetry-check'] = {
              exists: true,
              message: telemetryCheck.containsTelemetry 
                ? 'Telemetry/analytics files found in repository' 
                : 'No telemetry or analytics files detected',
              status: telemetryCheck.containsTelemetry ? 'warning' : 'success',
              location: 'repo',
              telemetryCheck: telemetryCheck
            };
            
            // Final update with all results
            setValidationSummary(prevState => ({
              ...prevState,
              results: { ...prevState.results, ...results }
            }));
          } catch (error) {
            console.error("Error checking for telemetry files:", error);
          }
          
          // Notify user that all checks are complete
          if (document.visibilityState === 'visible') {
            toast.success("Repository scan complete!", {
              description: "All checks have been completed. Review the results below."
            });
          }
          
        } catch (err) {
          console.error("Error in progressive loading:", err);
          
          if (document.visibilityState === 'visible') {
            toast.error("Some advanced checks couldn't be completed", {
              description: "Basic validation is complete, but some detailed checks failed to run."
            });
          }
        }
      }, 100); // Small delay to let the UI update with initial results first
      
    } catch (err) {
      console.error("Validation error:", err);
      let errorMessage = "An unknown error occurred";
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check for specific API error status codes
        if (errorMessage.includes("GitHub API error: 401")) {
          errorMessage = "Repository not found or inaccessible. Please verify the URL is correct and the repository is public.";
        } else if (errorMessage.includes("GitHub API error: 403")) {
          errorMessage = "Access forbidden (403). Please try again in a few minutes.";
        } else if (errorMessage.includes("rate limit exceeded")) {
          errorMessage = "The GitHub API is temporarily unavailable. Please try again in a few minutes.";
        } else if (errorMessage.includes("GitHub API error: 404")) {
          errorMessage = "Repository not found (404). Please check that the URL is correct and the repository exists.";
        } else if (errorMessage.includes("GitHub API error: 500")) {
          errorMessage = "GitHub server error (500). Please try again later.";
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Get appropriate template for a file
  const handleSelectTemplate = async (filePath: string) => {
    const templates = getAllTemplates();
    
    if (templates[filePath]) {
      setSelectedTemplate(templates[filePath]);
      setShowTemplateView(true);
    } else {
      // If we don't have a local template, try to fetch from GitHub OSPO repository
      try {
        setLoading(true);
        const templateUrl = getTemplateApiUrl(filePath);
        
        try {
          const response = await makeGitHubRequest(templateUrl);
          
          if (!response.ok) {
            throw new Error(`Template for ${filePath} not found. You can create your own.`);
          }
          
          const templateData = await response.json();
          const content = atob(templateData.content); // Decode base64 content
          
          const customTemplate: FileTemplate = {
            filename: filePath,
            description: `${filePath} template from GitHub's OSPO templates`,
            content: content
          };
          
          setSelectedTemplate(customTemplate);
          setShowTemplateView(true);
        } catch (error) {
          console.error("Error fetching template:", error);
          throw error;
        }
      } catch (error) {
        setError(`Error fetching template: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Go back to validation view
  const handleBackToResults = () => {
    setSelectedTemplate(null);
    setShowTemplateView(false);
  };
  
  // Render the rating badge based on the rating level
  const renderRatingBadge = (rating: 'great' | 'good' | 'poor' | 'missing') => {
    switch (rating) {
      case 'great':
        return (
          <Badge className="bg-green-500">
            <Star className="mr-1 h-3 w-3" weight="fill" />
            Great
          </Badge>
        );
      case 'good':
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            <StarHalf className="mr-1 h-3 w-3" weight="fill" />
            Good
          </Badge>
        );
      case 'poor':
        return (
          <Badge variant="outline" className="text-orange-500 border-orange-500">
            <Warning className="mr-1 h-3 w-3" />
            Poor
          </Badge>
        );
      case 'missing':
        return (
          <Badge variant="destructive">
            <X className="mr-1 h-3 w-3" />
            Missing
          </Badge>
        );
    }
  };
  
  return (
    <div className="container mx-auto py-10 px-4">
      <header className="text-center mb-10">
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <ThemeToggle />
          </div>
          <GitHubLogo size={120} className="mb-4 animate-bounce-gentle" />
          <h1 className="text-3xl font-bold github-text py-2">GitHub OSS Compliance Checker</h1>
          <h2 className="text-xl text-muted-foreground">Open Source Repository Validator</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Validate your GitHub repository structure to ensure all
          required files for open source compliance are in place.
        </p>
      </header>
      
      {!showTemplateView ? (
        <>
          <Card className="mb-8 github-card github-glow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Repository Validation</CardTitle>
                  <CardDescription>
                    Enter a GitHub repository URL to begin validation
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      id="repo-url"
                      placeholder="https://github.com/github/github-ospo"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-secondary/50 border-primary/30"
                    />
                  </div>
                  <Button 
                    onClick={handleValidate} 
                    disabled={loading || !url.trim()}
                    className="sm:w-auto w-full github-badge"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⏳</span>
                        Scanning...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <MagnifyingGlass className="mr-2" weight="bold" />
                        Validate Repo
                      </span>
                    )}
                  </Button>
                </div>
                
                {/* Rate limit info alert */}
                <div className="flex flex-col text-xs text-muted-foreground bg-secondary/30 p-2 rounded">
                  <div className="flex justify-between items-center">
                    <p className="flex items-center">
                      <Warning className="h-3 w-3 mr-1" />
                      This tool works with public GitHub repositories
                    </p>
                  </div>
                </div>
                
                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <X className="h-4 w-4" />
                      <AlertTitle>Repository Access Error</AlertTitle>
                      <AlertDescription>
                        {error}
                        {error.includes("Rate limit exceeded") && (
                          <div className="mt-2 text-xs border-l-2 border-destructive-foreground/50 pl-2">
                            <p>The application cannot access the GitHub API right now:</p>
                            <ul className="list-disc pl-4 mt-1">
                              <li>The API request limit has been temporarily reached</li>
                              <li>Please try again in a few minutes</li>
                            </ul>
                            <div className="mt-2 p-2 bg-card rounded flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  if (url) handleValidate();
                                }}
                              >
                                <MagnifyingGlass className="mr-2 h-4 w-4" />
                                Retry Request
                              </Button>
                            </div>
                          </div>
                        )}
                        {error.includes("Authentication required") && (
                          <div className="mt-2 text-xs border-l-2 border-destructive-foreground/50 pl-2">
                            <p>This repository appears to be private or doesn't exist:</p>
                            <ul className="list-disc pl-4 mt-1">
                              <li>Verify the repository URL is correct and the repository exists</li>
                              <li>Ensure the repository is public</li>
                              <li>This tool works best with public repositories</li>
                            </ul>
                            <div className="mt-2 p-2 bg-card rounded">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  setUrl("");
                                }}
                              >
                                <MagnifyingGlass className="mr-2 h-4 w-4" />
                                Try Another Repository
                              </Button>
                            </div>
                          </div>
                        )}
                        {error.includes("Repository not found") && (
                          <div className="mt-2 text-xs border-l-2 border-destructive-foreground/50 pl-2">
                            <p>Make sure the repository exists and is public. This tool only works with public repositories.</p>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
            </CardContent>
          </Card>
          
          {validationSummary && (
            <>
              {/* Repository Status Card */}
              <Card className="mb-6 github-card github-glow">
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>Repository Overview</span>
                    <Badge variant="outline" className="bg-secondary/50 flex items-center">
                      <FolderOpenIcon className="mr-1 h-3 w-3" />
                      Public Repository
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Description Rating */}
                    {descriptionRating && (
                      <div className="p-4 bg-card rounded-md shadow-sm">
                        <div className="flex justify-between mb-2">
                          <h3 className="font-medium">Description</h3>
                          {renderRatingBadge(descriptionRating.rating)}
                        </div>
                        <p className="text-sm">{descriptionRating.text || "No description provided"}</p>
                        {descriptionRating.feedback && (
                          <p className="text-xs text-muted-foreground mt-2">{descriptionRating.feedback}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Compliance Summary */}
                    <div className="p-4 bg-card rounded-md shadow-sm">
                      <h3 className="font-medium mb-2">Compliance Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Required files:</span>
                          <span className={validationSummary.missingRequired > 0 ? "text-destructive font-medium" : "text-accent font-medium"}>
                            {validationSummary.missingRequired > 0 ? 
                              `${validationSummary.missingRequired} missing` : 
                              "All present"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Recommended files:</span>
                          <span className={validationSummary.missingRecommended > 0 ? "text-amber-500 font-medium" : "text-accent font-medium"}>
                            {validationSummary.missingRecommended > 0 ? 
                              `${validationSummary.missingRecommended} missing` : 
                              "All present"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Repository Analysis Card - uses LLM to analyze the repo */}
              {validationSummary && (
                <RepoAnalyzer repoUrl={validationSummary.repoUrl} />
              )}
              
              {/* File Validation Results Card */}
              <Card className="github-card github-glow mt-6">
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>Validation Results</span>
                    <div className="flex gap-2">
                      {validationSummary.missingRequired > 0 ? (
                        <Badge variant="destructive">
                          {validationSummary.missingRequired} required missing
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-accent">
                          All required files present
                        </Badge>
                      )}
                      {validationSummary.missingRecommended > 0 && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          {validationSummary.missingRecommended} recommended missing
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Compliance status for {validationSummary.repoName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {/* Sort validation results to prioritize dependency analysis */}
                      {Object.entries(validationSummary.results)
                        .sort(([pathA], [pathB]) => {
                          // Priority order: dependency-analysis first, followed by LICENSE, then others alphabetically
                          if (pathA === 'dependency-analysis') return -1;
                          if (pathB === 'dependency-analysis') return 1;
                          if (pathA === 'LICENSE') return -1;
                          if (pathB === 'LICENSE') return 1;
                          return pathA.localeCompare(pathB);
                        })
                        .map(([path, result]) => (
                        <div key={path} className="border rounded-md p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium flex items-center">
                              {path}
                              {result.fileUrl && (
                                <a 
                                  href={result.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-2 text-primary hover:underline flex items-center text-sm"
                                >
                                  <LinkSimple className="h-3 w-3" />
                                  <span className="ml-1">View</span>
                                </a>
                              )}
                            </div>
                            <Badge 
                              variant={
                                result.status === 'success' 
                                  ? 'default' 
                                  : result.status === 'warning' 
                                    ? 'outline' 
                                    : 'destructive'
                              }
                              className={
                                result.status === 'warning'
                                  ? 'text-amber-500 border-amber-500'
                                  : ''
                              }
                            >
                              {result.status === 'success' && (
                                <Check className="mr-1 h-3 w-3" />
                              )}
                              {result.status === 'warning' && (
                                <Warning className="mr-1 h-3 w-3" />
                              )}
                              {result.status === 'error' && (
                                <X className="mr-1 h-3 w-3" />
                              )}
                              {result.status === 'success' ? 'Present' : result.status === 'warning' ? 'Warning' : 'Required'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{result.message}</p>
                          
                          {result.location === 'org' && (
                            <div className="mt-2 text-xs bg-secondary/50 text-secondary-foreground rounded p-1">
                              Found in organization-level .github repository
                            </div>
                          )}
                          
                          {/* License check result - simplified */}
                          {result.licenseCheck && (
                            <div className="mt-2 text-xs bg-secondary/50 rounded p-2">
                              <div className="font-medium mb-1">License Information:</div>
                              {result.licenseCheck.copyrightHolder && (
                                <div>Copyright holder: <span className="font-medium">{result.licenseCheck.copyrightHolder}</span></div>
                              )}
                              {result.licenseCheck.licenseName && (
                                <div>License type: <span className="font-medium">{result.licenseCheck.licenseName}</span></div>
                              )}
                            </div>
                          )}
                          
                          {/* Dependency Analysis */}
                          {result.dependencyAnalysis?.licenseBreakdown && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1 flex items-center justify-between">
                                <div className="flex items-center">
                                  <Package className="h-3 w-3 mr-1" />
                                  Dependency Analysis:
                                </div>
                                {result.dependencyAnalysis.rawSbomData && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-6 text-xs py-0 px-2"
                                    onClick={() => exportSbomData(
                                      result.dependencyAnalysis?.rawSbomData, 
                                      validationSummary.repoName
                                    )}
                                  >
                                    Export SBOM
                                  </Button>
                                )}
                              </div>
                              <div className="bg-secondary/20 p-2 rounded text-xs">
                                {/* License breakdown */}
                                {result.dependencyAnalysis.licenseBreakdown && 
                                  Object.keys(result.dependencyAnalysis.licenseBreakdown).length > 0 && (
                                  <div className="col-span-2 mb-2">
                                    <div className="font-medium mb-1">License Breakdown:</div>
                                    <div className="space-y-1">
                                      {Object.entries(result.dependencyAnalysis.licenseBreakdown)
                                        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                                        .map(([license, count], index) => {
                                          const isWarningLicense = 
                                            (license.toLowerCase().includes('gpl') && !license.toLowerCase().includes('lgpl')) || 
                                            license.toLowerCase().includes('agpl') || 
                                            license.toLowerCase() === 'unknown';
                                          
                                          return (
                                            <div key={index} className="flex justify-between">
                                              <span className={isWarningLicense ? 'text-amber-700 font-medium' : ''}>
                                                {license || 'Unknown'}:
                                                {isWarningLicense && (
                                                  <span className="ml-1 text-amber-700">
                                                    <Warning className="inline h-3 w-3" />
                                                  </span>
                                                )}
                                              </span>
                                              <span className="font-medium">{count}</span>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}
                                
                                {/* SBOM dependency counts */}
                                {result.dependencyAnalysis.sbomDependenciesCount !== undefined && (
                                  <div className="grid grid-cols-2 gap-1">
                                    <div className="flex justify-between col-span-2">
                                      <span>Total dependencies:</span>
                                      <span className="font-medium">{result.dependencyAnalysis.sbomDependenciesCount}</span>
                                    </div>
                                    {result.dependencyAnalysis.mitCount !== undefined && (
                                      <div className="flex justify-between col-span-2">
                                        <span>MIT licensed dependencies:</span>
                                        <span className="font-medium">{result.dependencyAnalysis.mitCount}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Dependency warning */}
                                {Object.entries(result.dependencyAnalysis.licenseBreakdown || {}).some(
                                  ([license]) => 
                                    (license.toLowerCase().includes('gpl') && !license.toLowerCase().includes('lgpl')) || 
                                    license.toLowerCase().includes('agpl') || 
                                    license.toLowerCase() === 'unknown'
                                ) && (
                                  <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded">
                                    <p className="font-medium">⚠️ Warning: Dependencies with copyleft or unknown licenses detected</p>
                                    <p className="text-xs mt-1">
                                      These licenses may have requirements that affect your code distribution. Review them carefully.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Internal References Check */}
                          {result.internalReferences && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1 flex items-center">
                                <Warning className="h-3 w-3 mr-1" />
                                Internal References & Confidential Info Check:
                              </div>
                              <div className="bg-secondary/20 p-2 rounded text-xs">
                                {result.internalReferences.length === 0 ? (
                                  <div className="text-accent flex items-center">
                                    <Check className="h-3 w-3 mr-1" />
                                    No internal references or confidential information detected
                                  </div>
                                ) : (
                                  <div>
                                    <div className="text-amber-500 font-medium mb-1">
                                      Potential internal references or confidential information found:
                                    </div>
                                    <div className="space-y-1 mt-1 bg-secondary/30 p-2 rounded">
                                      {result.internalReferences.map((issue, index) => (
                                        <div key={index} className="text-amber-700">
                                          • {issue}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded">
                                      <p className="font-medium">⚠️ Warning: Review these issues before open-sourcing</p>
                                      <p className="text-xs mt-1">
                                        Internal references, trademarks, and confidential information should be removed prior to public release.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Security Features Check */}
                          {result.securityFeatures && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1 flex items-center">
                                {result.status === 'success' ? (
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                ) : (
                                  <ShieldWarning className="h-3 w-3 mr-1" />
                                )}
                                GitHub Security Features:
                              </div>
                              <div className="bg-secondary/20 p-2 rounded text-xs">
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="flex justify-between col-span-2">
                                    <span>Secret Scanning:</span>
                                    <span className={`font-medium ${result.securityFeatures.secretScanningEnabled ? 'text-accent' : 'text-destructive'}`}>
                                      {result.securityFeatures.secretScanningEnabled ? (
                                        <span className="flex items-center">
                                          <Check className="inline h-3 w-3 mr-1" />
                                          Enabled
                                        </span>
                                      ) : (
                                        <span className="flex items-center">
                                          <X className="inline h-3 w-3 mr-1" />
                                          Disabled
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between col-span-2">
                                    <span>Dependabot Security Updates:</span>
                                    <span className={`font-medium ${result.securityFeatures.dependabotSecurityUpdatesEnabled ? 'text-accent' : 'text-destructive'}`}>
                                      {result.securityFeatures.dependabotSecurityUpdatesEnabled ? (
                                        <span className="flex items-center">
                                          <Check className="inline h-3 w-3 mr-1" />
                                          Enabled
                                        </span>
                                      ) : (
                                        <span className="flex items-center">
                                          <X className="inline h-3 w-3 mr-1" />
                                          Disabled
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between col-span-2">
                                    <span>CodeQL Analysis:</span>
                                    <span className={`font-medium ${result.securityFeatures.codeqlEnabled ? 'text-accent' : 'text-destructive'}`}>
                                      {result.securityFeatures.codeqlEnabled ? (
                                        <span className="flex items-center">
                                          <Check className="inline h-3 w-3 mr-1" />
                                          Enabled
                                        </span>
                                      ) : (
                                        <span className="flex items-center">
                                          <X className="inline h-3 w-3 mr-1" />
                                          Disabled
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                                
                                {!result.securityFeatures.secretScanningEnabled || 
                                 !result.securityFeatures.dependabotSecurityUpdatesEnabled || 
                                 !result.securityFeatures.codeqlEnabled ? (
                                  <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded">
                                    <p className="font-medium">⚠️ Security Recommendation</p>
                                    <p className="text-xs mt-1">
                                      Enable all security features to enhance your repository's security posture.
                                      Visit repository settings → Security & analysis to enable these features.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-2 p-2 bg-green-50 text-green-800 rounded">
                                    <p className="font-medium">✅ Good security posture</p>
                                    <p className="text-xs mt-1">
                                      All recommended security features are enabled for this repository.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Telemetry Files Check */}
                          {result.telemetryCheck && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1 flex items-center">
                                {result.status === 'success' ? (
                                  <Gauge className="h-3 w-3 mr-1" />
                                ) : (
                                  <Gauge className="h-3 w-3 mr-1" />
                                )}
                                Telemetry & Analytics Files:
                              </div>
                              <div className="bg-secondary/20 p-2 rounded text-xs">
                                {!result.telemetryCheck.containsTelemetry ? (
                                  <div className="text-accent flex items-center">
                                    <Check className="h-3 w-3 mr-1" />
                                    No telemetry or analytics files detected
                                  </div>
                                ) : (
                                  <div>
                                    <div className="text-amber-500 font-medium mb-1">
                                      Telemetry/analytics files found:
                                    </div>
                                    <div className="space-y-1 mt-1 bg-secondary/30 p-2 rounded">
                                      {result.telemetryCheck.telemetryFiles.map((file, index) => (
                                        <div key={index} className="text-amber-700">
                                          • {file}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded">
                                      <p className="font-medium">⚠️ Telemetry Notice</p>
                                      <p className="text-xs mt-1">
                                        Review telemetry and analytics code to ensure compliance with privacy laws and to document data collection in your project documentation.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Ownership Property Check */}
                          {result.ownershipProperty && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1 flex items-center">
                                {result.ownershipProperty.exists ? (
                                  <UserCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <UserCircle className="h-3 w-3 mr-1" />
                                )}
                                Repository Ownership Property:
                              </div>
                              <div className="bg-secondary/20 p-2 rounded text-xs">
                                {result.ownershipProperty.exists ? (
                                  <div>
                                    <div className="flex justify-between">
                                      <span>Ownership property:</span>
                                      <span className="font-medium text-accent">{result.ownershipProperty.name}</span>
                                    </div>
                                    <div className="mt-2 p-2 bg-green-50 text-green-800 rounded">
                                      <p className="font-medium">✅ Ownership defined</p>
                                      <p className="text-xs mt-1">
                                        Repository has a defined ownership property which helps track responsibility and maintenance.
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="text-amber-500 flex items-center">
                                      <X className="h-3 w-3 mr-1" />
                                      No ownership property defined
                                    </div>
                                    <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded">
                                      <p className="font-medium">⚠️ Recommendation</p>
                                      <p className="text-xs mt-1">
                                        Consider setting an ownership-name property to clearly define who is responsible for maintaining this repository.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Repository History Squash Option */}
                          {path === 'internal-references-check' && (
                            <div className="mt-3 text-xs bg-secondary/20 p-2 rounded">
                              <div className="font-medium mb-1 flex items-center">
                                <Warning className="h-3 w-3 mr-1" />
                                Repository History Recommendation:
                              </div>
                              <p className="mb-2">
                                Consider squashing repository history before open-sourcing to remove any sensitive information
                                from previous commits that may no longer be in the current files.
                              </p>
                              <button 
                                className="text-xs text-primary hover:underline cursor-pointer mt-1"
                                onClick={() => {
                                  navigator.clipboard.writeText(`
# Commands to squash repository history
# Run these in your local repository

# Create a new orphaned branch
git checkout --orphan temp_branch

# Add all files to the new branch
git add .

# Commit the files
git commit -m "Initial commit - Repository history squashed for open source release"

# Delete the old branch
git branch -D main

# Rename the temporary branch to main
git branch -m main

# Force push to remote repository
git push -f origin main
                                  `.trim());
                                  toast.success("Squash instructions copied to clipboard", {
                                    description: "Paste in your terminal to see the commands for squashing repository history"
                                  });
                                }}
                              >
                                Copy squash instructions
                              </button>
                            </div>
                          )}
                          
                          {result.status === 'error' && (
                            <div className="mt-2 flex justify-end">
                              <CreatePRButton 
                                filePath={path}
                                owner={validationSummary.owner}
                                repo={validationSummary.repo}
                                onSelectTemplate={(template) => {
                                  setSelectedTemplate(template);
                                  setShowTemplateView(true);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <a 
                    href={validationSummary.repoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline flex items-center"
                  >
                    <GithubLogo className="mr-1" size={16} />
                    View Repository
                  </a>
                </CardFooter>
              </Card>
            </>
          )}
        </>
      ) : (
        <div className="mb-8">
          <Button 
            variant="outline" 
            className="mb-4"
            onClick={handleBackToResults}
          >
            ← Back to results
          </Button>
          
          {selectedTemplate && (
            <TemplateViewer 
              template={selectedTemplate} 
              repoOwner={validationSummary?.owner}
              repoName={validationSummary?.repo}
            />
          )}
        </div>
      )}
      
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>GitHub OSS Compliance Checker – Helping repositories meet open source standards</p>
        <div className="flex justify-center mt-2">
          <a 
            href="https://github.com/github/github-ospo/tree/main/release%20template" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary text-xs hover:underline flex items-center opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg className="mr-1" width="12" height="12" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217C0 70.973 13.993 89.389 33.405 95.907C35.832 96.397 36.721 94.848 36.721 93.545C36.721 92.404 36.641 88.493 36.641 84.418C23.051 87.352 20.14 78.551 20.14 78.551C17.961 72.847 14.727 71.381 14.727 71.381C10.325 68.366 15.044 68.366 15.044 68.366C19.928 68.692 22.512 73.414 22.512 73.414C26.834 80.917 33.811 78.795 36.886 77.492C37.299 74.314 38.596 72.111 40.04 70.89C29.172 69.751 17.802 65.514 17.802 46.547C17.802 41.175 19.697 36.777 22.593 33.354C22.099 32.133 20.453 27.08 23.051 20.315C23.051 20.315 27.129 19.011 36.641 25.349C40.579 24.291 44.684 23.749 48.854 23.749C53.025 23.749 57.13 24.291 61.067 25.349C70.578 19.011 74.657 20.315 74.657 20.315C77.254 27.08 75.608 32.133 75.114 33.354C78.091 36.777 79.986 41.175 79.986 46.547C79.986 65.514 68.615 69.669 57.748 70.89C59.686 72.437 61.304 75.291 61.304 79.938C61.304 86.478 61.224 91.931 61.224 93.545C61.224 94.848 62.112 96.397 64.54 95.907C83.952 89.389 97.945 70.973 97.945 49.217C97.945 22 76.025 0 48.854 0Z" 
                fill="currentColor" className="text-primary" />
            </svg>
            Open Source Templates
          </a>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}

export default App;