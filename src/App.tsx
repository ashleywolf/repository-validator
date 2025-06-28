import React, { useState } from "react";
import { isValidGitHubUrl } from "./lib/utils";
import { validateRepository, RepoData } from "./lib/repo-services";
import { ThemeProvider } from "./context/theme-context";
import { ThemeToggle } from "./components/theme-toggle";
import { MissionOctocat } from "./components/repo-components";
import { ValidationResults } from "./components/validation-results";
import { Spinner } from "./components/spinner";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GithubLogo, MagnifyingGlass, X } from "@phosphor-icons/react";

function AppContent() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<RepoData | null>(null);

  // Handle repository validation
  const handleValidate = async () => {
    // Reset states
    setError(null);
    setRepoData(null);
    
    // Validate URL format
    if (!isValidGitHubUrl(url)) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate repository
      const data = await validateRepository(url);
      
      if (!data) {
        throw new Error("Failed to validate repository. Please check the URL and try again.");
      }
      
      // Set repository data
      setRepoData(data);
      
      // Show success toast
      toast.success("Repository validation complete!");
    } catch (err) {
      console.error("Repository validation error:", err);
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
          <MissionOctocat size={140} className="mb-4" />
          <h1 className="text-3xl font-bold mission-text py-2">GitHub Open Source Release Checklist</h1>
          <h2 className="text-xl text-muted-foreground">Mission RepOSSible</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Validate your GitHub repository for open source readiness and compliance.
          We'll check for required files and provide template-based solutions.
        </p>
      </header>
      
      <Card className="mb-8 mission-card spy-glow">
        <CardHeader>
          <CardTitle>Repository URL</CardTitle>
          <CardDescription>
            Enter a GitHub repository URL to validate open source readiness
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
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <MagnifyingGlass className="mr-2" weight="bold" />
                    Validate Repository
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
      
      {repoData && <ValidationResults repoData={repoData} />}
      
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>GitHub Open Source Release Checklist – Mission RepOSSible</p>
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