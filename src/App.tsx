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
  commonRequirements,
  checkLicenseFile,
  analyzeDependencies
} from "./lib/utils";
import { FileTemplate, getTemplatesByType } from "./lib/templates";
import { TemplateViewer } from "./components/template-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  File
} from "@phosphor-icons/react";

function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState("basic");
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [requirements, setRequirements] = useState<FileRequirement[]>(commonRequirements.basic);
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [showTemplateView, setShowTemplateView] = useState(false);

  // Handle URL validation and repo scanning
  const handleValidate = async () => {
    // Reset states
    setError(null);
    setValidationSummary(null);
    setSelectedTemplate(null);
    setShowTemplateView(false);
    
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
      
      // Fetch repository contents
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Repository not found or is private");
        } else if (response.status === 403) {
          throw new Error("API rate limit exceeded. Please try again later");
        } else {
          throw new Error(`GitHub API error: ${response.status}`);
        }
      }
      
      const repoContents = await response.json();
      
      // Transform API response to our RepoFile format
      const files: RepoFile[] = repoContents.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        download_url: item.download_url
      }));
      
      // Validate files against requirements
      const results: Record<string, ValidationResult> = {};
      let missingRequired = 0;
      let missingRecommended = 0;
      
      // Check each requirement
      for (const req of requirements) {
        // Check if file exists in repo
        const fileInRepo = files.find(file => 
          file.path.toLowerCase() === req.path.toLowerCase()
        );
        
        const fileExists = !!fileInRepo;
        
        if (fileExists) {
          const result: ValidationResult = {
            exists: true,
            message: `${req.description} found in repository`,
            status: 'success',
            location: 'repo'
          };
          
          // Special checks for specific files
          if (req.path === 'LICENSE') {
            // Check license content
            try {
              const licenseCheck = await checkLicenseFile(fileInRepo.download_url);
              result.licenseCheck = licenseCheck;
              
              if (!licenseCheck.isValid) {
                result.status = 'warning';
                result.message = `${req.description} found but ${licenseCheck.message.toLowerCase()}`;
              }
            } catch (error) {
              console.error("Error checking license:", error);
            }
          } else if (req.path === 'package-lock.json') {
            // Analyze dependencies for GPL/AGPL licenses
            try {
              const dependencyAnalysis = await analyzeDependencies(fileInRepo.download_url);
              result.dependencyAnalysis = dependencyAnalysis;
              
              if (dependencyAnalysis.gplCount > 0 || dependencyAnalysis.agplCount > 0) {
                result.status = 'warning';
                result.message = `${req.description} found with ${dependencyAnalysis.gplCount} GPL and ${dependencyAnalysis.agplCount} AGPL dependencies`;
              }
            } catch (error) {
              console.error("Error analyzing dependencies:", error);
            }
          }
          
          results[req.path] = result;
        } else {
          // File not found in repo, check organization .github repo
          try {
            const orgDotGithubUrl = getOrgDotGithubApiUrl(owner);
            const orgResponse = await fetch(orgDotGithubUrl);
            
            if (orgResponse.ok) {
              const orgContents = await orgResponse.json();
              const fileExistsInOrg = orgContents.some((item: any) => 
                item.path.toLowerCase() === req.path.toLowerCase()
              );
              
              if (fileExistsInOrg) {
                results[req.path] = {
                  exists: true,
                  message: `${req.description} found in organization .github repo`,
                  status: 'success',
                  location: 'org'
                };
                continue;
              }
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
  
  // Handle changing requirements preset
  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
    setRequirements(commonRequirements[preset]);
    // Reset validation if requirements change
    setValidationSummary(null);
    setSelectedTemplate(null);
    setShowTemplateView(false);
  };
  
  // Get appropriate template for a file
  const handleSelectTemplate = async (filePath: string) => {
    const templates = getTemplatesByType(activePreset);
    
    if (templates[filePath]) {
      setSelectedTemplate(templates[filePath]);
      setShowTemplateView(true);
    } else {
      // If we don't have a local template, try to fetch from GitHub OSPO repository
      try {
        setLoading(true);
        const templateUrl = getTemplateApiUrl(filePath);
        const response = await fetch(templateUrl);
        
        if (response.ok) {
          const data = await response.json();
          const content = atob(data.content); // Decode base64 content
          
          const customTemplate: FileTemplate = {
            filename: filePath,
            description: `${filePath} template from GitHub's OSPO templates`,
            content: content
          };
          
          setSelectedTemplate(customTemplate);
          setShowTemplateView(true);
        } else {
          setError(`Template for ${filePath} not found. You can create your own.`);
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
  
  
  return (
    <div className="container mx-auto py-10 px-4">
      <header className="text-center mb-10">
        <div className="flex items-center justify-center mb-4">
          <GithubLogo size={40} weight="duotone" className="text-primary mr-2" />
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
              <CardTitle>Repository Validation</CardTitle>
              <CardDescription>
                Enter a GitHub repository URL to check for required files
              </CardDescription>
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
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Validation Template:</h3>
                  <Tabs value={activePreset} onValueChange={handlePresetChange}>
                    <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                    </TabsList>
                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground">
                        {activePreset === "basic" && "Checks for essential files in any open source repository"}
                        {activePreset === "javascript" && "Checks for JS/TS open source project requirements"}
                        {activePreset === "python" && "Checks for Python open source project requirements"}
                      </div>
                    </div>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {validationSummary && (
            <Card>
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
                  Check if all required files are present in {validationSummary.repoName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {Object.entries(validationSummary.results).map(([path, result]) => (
                      <div key={path} className="border rounded-md p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{path}</span>
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
                        
                        {/* License check result */}
                        {result.licenseCheck && !result.licenseCheck.isValid && (
                          <div className="mt-2 text-xs bg-amber-100 text-amber-800 rounded p-1">
                            {result.licenseCheck.message}
                          </div>
                        )}
                        
                        {/* Dependency analysis result */}
                        {result.dependencyAnalysis && (result.dependencyAnalysis.gplCount > 0 || result.dependencyAnalysis.agplCount > 0) && (
                          <div className="mt-2">
                            <div className="text-xs font-medium mb-1">Dependency License Analysis:</div>
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span>Total Dependencies:</span>
                                <span>{result.dependencyAnalysis.total}</span>
                              </div>
                              
                              {result.dependencyAnalysis.gplCount > 0 && (
                                <>
                                  <div className="flex justify-between text-amber-700">
                                    <span>GPL Dependencies:</span>
                                    <span>{result.dependencyAnalysis.gplCount}</span>
                                  </div>
                                  <div className="bg-amber-50 p-1 rounded text-amber-800">
                                    {result.dependencyAnalysis.gplDependencies.map((dep, i) => (
                                      <div key={i}>{dep}</div>
                                    ))}
                                  </div>
                                </>
                              )}
                              
                              {result.dependencyAnalysis.agplCount > 0 && (
                                <>
                                  <div className="flex justify-between text-red-700">
                                    <span>AGPL Dependencies:</span>
                                    <span>{result.dependencyAnalysis.agplCount}</span>
                                  </div>
                                  <div className="bg-red-50 p-1 rounded text-red-800">
                                    {result.dependencyAnalysis.agplDependencies.map((dep, i) => (
                                      <div key={i}>{dep}</div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {result.status === 'error' && (
                          <div className="mt-2 flex justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => handleSelectTemplate(path)}
                            >
                              <FilePlus className="mr-1 h-3 w-3" />
                              Create from template
                            </Button>
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
                <div className="text-sm text-muted-foreground">
                  Validated against {activePreset} template
                </div>
              </CardFooter>
            </Card>
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

export default App;