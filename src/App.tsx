import React, { useState } from "react";
import { isValidGitHubUrl, parseGitHubUrl } from "./lib/utils";
import { ThemeProvider } from "./context/theme-context";
import { ThemeToggle } from "./components/theme-toggle";
import { OctocatWizard } from "./components/octocat";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GithubLogo, MagnifyingGlass, X, LinkSimple } from "@phosphor-icons/react";

function AppContent() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; url: string } | null>(null);

  // Handle URL validation and parsing
  const handleValidate = () => {
    // Reset states
    setError(null);
    setRepoInfo(null);
    
    // Validate URL format
    if (!isValidGitHubUrl(url)) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }
    
    setLoading(true);
    
    try {
      // Parse GitHub URL
      const parsedRepoInfo = parseGitHubUrl(url);
      if (!parsedRepoInfo) {
        throw new Error("Invalid GitHub URL format");
      }
      
      const { owner, repo } = parsedRepoInfo;
      
      // Set repository info
      setRepoInfo({
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`
      });
      
      // Show success toast
      toast.success("Repository URL parsed successfully");
    } catch (err) {
      console.error("URL parsing error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <header className="text-center mb-10">
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="absolute right-4 top-4">
            <ThemeToggle />
          </div>
          <OctocatWizard size={140} className="mb-4" />
          <h1 className="text-3xl font-bold mission-text py-2">GitHub Repo Explorer</h1>
          <h2 className="text-xl text-muted-foreground">Simple Repository URL Tool</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A streamlined tool to quickly work with GitHub repository URLs.
        </p>
      </header>
      
      <Card className="mb-8 mission-card spy-glow">
        <CardHeader>
          <CardTitle>Repository URL</CardTitle>
          <CardDescription>
            Enter a GitHub repository URL to explore
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
                  className="w-full bg-secondary/50 border-primary/30"
                />
              </div>
              <Button 
                onClick={handleValidate} 
                disabled={loading || !url.trim()}
                className="sm:w-auto w-full mission-badge"
              >
                {loading ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <MagnifyingGlass className="mr-2" weight="bold" />
                    Parse URL
                  </span>
                )}
              </Button>
            </div>
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <X className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
      
      {repoInfo && (
        <Card className="mission-card spy-glow">
          <CardHeader>
            <CardTitle>Repository Information</CardTitle>
            <CardDescription>
              Parsed details for the provided GitHub URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-card rounded-md shadow-sm">
                <h3 className="font-medium mb-2">Repository Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Owner:</span>
                    <span className="font-medium">{repoInfo.owner}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Repository:</span>
                    <span className="font-medium">{repoInfo.repo}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <a 
              href={repoInfo.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary text-sm hover:underline flex items-center"
            >
              <GithubLogo className="mr-1" size={16} />
              View Repository
            </a>
            <div className="flex space-x-2">
              <a 
                href={`${repoInfo.url}/issues`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline flex items-center"
              >
                <LinkSimple className="mr-1" size={16} />
                Issues
              </a>
              <a 
                href={`${repoInfo.url}/pulls`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline flex items-center"
              >
                <LinkSimple className="mr-1" size={16} />
                Pull Requests
              </a>
            </div>
          </CardFooter>
        </Card>
      )}
      
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>GitHub Repo Explorer – A simple tool for GitHub repository URLs</p>
        <div className="flex justify-center mt-2">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary text-xs hover:underline flex items-center opacity-70 hover:opacity-100 transition-opacity"
          >
            <GithubLogo className="mr-1" size={12} />
            GitHub
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