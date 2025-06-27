import { useState } from "react";
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
  DescriptionRating
} from "./lib/utils";
import { FileTemplate, getAllTemplates } from "./lib/templates";
import { TemplateViewer } from "./components/template-viewer";
import { GitHubAuth } from "./components/github-auth";
import { AuthProvider, useAuth } from "./context/auth-context";
import { OctocatWizard } from "./components/octocat";
import { CreatePRButton } from "./components/create-pr-button";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GithubLogo, 
  MagnifyingGlass, 
  Check, 
  X, 
  Warning, 
  FilePlus,
  FileText,
  File,
  Package,
  Star,
  StarHalf,
  LinkSimple,
  Folder,
  FolderOpen,
  LockSimple,
  LockOpen
} from "@phosphor-icons/react";

function AppContent() {
  const { authState, octokit } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [requirements] = useState<FileRequirement[]>(consolidatedRequirements);
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [showTemplateView, setShowTemplateView] = useState(false);
  const [descriptionRating, setDescriptionRating] = useState<DescriptionRating | null>(null);
  const [isPrivateRepo, setIsPrivateRepo] = useState(false);

  // Handle URL validation and repo scanning
  const handleValidate = async () => {
    // Reset states
    setError(null);
    setValidationSummary(null);
    setSelectedTemplate(null);
    setShowTemplateView(false);
    setDescriptionRating(null);
    setIsPrivateRepo(false);
    
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
      let isPrivate = false;
      
      // Check if we should use authenticated API call
      if (authState.isAuthenticated && octokit) {
        try {
          // Get repository info first to check if it's private
          const repoInfoResponse = await octokit.request("GET /repos/{owner}/{repo}", {
            owner,
            repo
          });
          
          isPrivate = repoInfoResponse.data.private;
          setIsPrivateRepo(isPrivate);
          
          // Fetch repository contents using authenticated client
          const response = await octokit.request("GET /repos/{owner}/{repo}/contents", {
            owner,
            repo
          });
          
          repoContents = response.data;
        } catch (error: any) {
          console.error("Error fetching with authentication:", error);
          
          if (error.status === 404) {
            throw new Error("Repository not found or you don't have access to it");
          } else {
            throw new Error(`GitHub API error: ${error.status}`);
          }
        }
      } else {
        // Unauthenticated API call for public repositories
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Repository not found or is private. Please sign in with GitHub to access private repositories.");
          } else if (response.status === 403) {
            throw new Error("API rate limit exceeded. Please sign in with GitHub to increase your rate limit.");
          } else {
            throw new Error(`GitHub API error: ${response.status}`);
          }
        }
        
        repoContents = await response.json();
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
      const repoDescriptionRating = await rateRepoDescription(owner, repo);
      setDescriptionRating(repoDescriptionRating);
      
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
            
            // Use authenticated client if available
            if (authState.isAuthenticated && octokit) {
              try {
                const orgResponse = await octokit.request("GET /repos/{owner}/.github/contents", {
                  owner
                });
                orgContents = orgResponse.data;
              } catch (error) {
                // Organization .github repo might not exist or be inaccessible
                orgContents = [];
              }
            } else {
              const orgResponse = await fetch(orgDotGithubUrl);
              orgContents = orgResponse.ok ? await orgResponse.json() : [];
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
      if (sbomAnalysis && !results['package.json']) {
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
            licenseBreakdown: sbomAnalysis.licenseBreakdown
          }
        };
      }
      
      // Set validation summary
      setValidationSummary({
        repoName: `${owner}/${repo}`,
        repoUrl: url,
        results,
        missingRequired,
        missingRecommended,
        owner,
        repo
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
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
        
        let templateData;
        
        // Use authenticated client if available
        if (authState.isAuthenticated && octokit) {
          try {
            const response = await octokit.request("GET {url}", {
              url: templateUrl
            });
            templateData = response.data;
          } catch (error) {
            throw new Error(`Template not found: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } else {
          const response = await fetch(templateUrl);
          
          if (!response.ok) {
            throw new Error(`Template for ${filePath} not found. You can create your own.`);
          }
          
          templateData = await response.json();
        }
        
        const content = atob(templateData.content); // Decode base64 content
        
        const customTemplate: FileTemplate = {
          filename: filePath,
          description: `${filePath} template from GitHub's OSPO templates`,
          content: content
        };
        
        setSelectedTemplate(customTemplate);
        setShowTemplateView(true);
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
          <OctocatWizard size={120} className="mb-4" />
          <h1 className="text-3xl font-bold">GitHub Repo Wizard</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Validate your GitHub repository structure to ensure it contains all required files for open source best practices and compliance.
        </p>
      </header>
      
      {!showTemplateView ? (
        <>
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Repository Validation</CardTitle>
                  <CardDescription>
                    Enter a GitHub repository URL to check for required files
                  </CardDescription>
                </div>
                <GitHubAuth />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      id="repo-url"
                      placeholder="https://github.com/username/repository"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button 
                    onClick={handleValidate} 
                    disabled={loading || !url.trim()}
                    className="sm:w-auto w-full"
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
                
                {error && (
                  <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {!authState.isAuthenticated && (
                  <Alert>
                    <LockOpen className="h-4 w-4" />
                    <AlertTitle>Sign in to access more features</AlertTitle>
                    <AlertDescription>
                      Sign in with GitHub to validate private repositories and increase API rate limits.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
          
          {validationSummary && (
            <>
              {/* Repository Status Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>Repository Status</span>
                    {isPrivateRepo ? (
                      <Badge variant="outline" className="bg-secondary/50">
                        <LockSimple className="mr-1 h-3 w-3" />
                        Private
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-secondary/50">
                        <Folder className="mr-1 h-3 w-3" />
                        Public
                      </Badge>
                    )}
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
              
              {/* File Validation Results Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>Compliance Results</span>
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
                    Check if all required files are present in {validationSummary.repoName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {Object.entries(validationSummary.results).map(([path, result]) => (
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
                              <div className="text-xs font-medium mb-1 flex items-center">
                                <Package className="h-3 w-3 mr-1" />
                                Dependency Analysis:
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
        <p>GitHub Repo Wizard – Check your repositories for required open source files and best practices</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;