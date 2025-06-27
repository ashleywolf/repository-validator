import { useState } from "react";
import { 
  FileRequirement,
  ValidationSummary,
  ValidationResult,
  RepoFile,
  isValidGitHubUrl,
  parseGitHubUrl,
  commonRequirements
} from "./lib/utils";
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
  FolderOpen,
  File
} from "@phosphor-icons/react";

function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState("basic");
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [requirements, setRequirements] = useState<FileRequirement[]>(commonRequirements.basic);

  // Handle URL validation and repo scanning
  const handleValidate = async () => {
    // Reset states
    setError(null);
    setValidationSummary(null);
    
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
      
      // Create the API URL for fetching contents
      const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents`;
      
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
        size: item.size
      }));
      
      // Validate files against requirements
      const results: Record<string, ValidationResult> = {};
      let missingRequired = 0;
      let missingRecommended = 0;
      
      requirements.forEach(req => {
        // Check if file exists in repo
        const fileExists = files.some(file => 
          file.path.toLowerCase() === req.path.toLowerCase()
        );
        
        if (fileExists) {
          results[req.path] = {
            exists: true,
            message: `${req.description} found`,
            status: 'success'
          };
        } else {
          if (req.required) {
            missingRequired++;
            results[req.path] = {
              exists: false,
              message: `Required ${req.description} is missing`,
              status: 'error'
            };
          } else {
            missingRecommended++;
            results[req.path] = {
              exists: false,
              message: `Recommended ${req.description} is missing`,
              status: 'warning'
            };
          }
        }
      });
      
      // Set validation summary
      setValidationSummary({
        repoName: `${repoInfo.owner}/${repoInfo.repo}`,
        repoUrl: url,
        files,
        results,
        missingRequired,
        missingRecommended
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
  };
  
  return (
    <div className="container mx-auto py-10 px-4">
      <header className="text-center mb-10">
        <div className="flex items-center justify-center mb-4">
          <GithubLogo size={40} weight="duotone" className="text-primary mr-2" />
          <h1 className="text-3xl font-bold">GitHub Repo Wizard</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Validate your GitHub repository structure to ensure it contains all required files for best practices and compliance.
        </p>
      </header>
      
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
                    {activePreset === "basic" && "Checks for essential files in any repository"}
                    {activePreset === "javascript" && "Checks for JS/TS project requirements"}
                    {activePreset === "python" && "Checks for Python project requirements"}
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {validationSummary && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GithubLogo className="mr-2" weight="fill" />
                Repository Structure
              </CardTitle>
              <CardDescription>
                Files and directories found in {validationSummary.repoName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <ul className="space-y-2">
                  {validationSummary.files.length > 0 ? (
                    validationSummary.files.map((file) => (
                      <li key={file.path} className="flex items-start">
                        {file.type === 'dir' ? (
                          <FolderOpen className="mr-2 text-primary mt-0.5" weight="fill" />
                        ) : (
                          <File className="mr-2 text-muted-foreground mt-0.5" weight="fill" />
                        )}
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-xs text-muted-foreground">{file.path}</div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground italic">No files found in repository</li>
                  )}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
          
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
                Check if all required files are present
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
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
                          {result.status === 'success' ? 'Present' : result.status === 'warning' ? 'Recommended' : 'Required'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
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
        </div>
      )}
      
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>GitHub Repo Wizard – Check your repositories for required files and best practices</p>
      </footer>
    </div>
  );
}

export default App;