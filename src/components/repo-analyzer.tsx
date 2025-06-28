import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Robot, CheckCircle, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { analyzeRepositoryWithLLM, RepoAnalysisResult } from "../lib/repo-analysis";

export const RepoAnalyzer = ({ repoUrl }: { repoUrl: string }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RepoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeRepository = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const analysis = await analyzeRepositoryWithLLM(repoUrl);
      
      if (!analysis) {
        throw new Error("Failed to analyze repository");
      }
      
      setResult(analysis);
      toast.success("Repository analysis complete!");
      
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast.error("Failed to analyze repository");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card className="mt-6 github-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            Repository Analysis
          </CardTitle>
          <CardDescription>Error analyzing repository structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-destructive mb-4">{error}</div>
          <Button onClick={analyzeRepository} disabled={loading}>
            {loading ? "Analyzing..." : "Try Again"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 github-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="mr-2 h-5 w-5" />
          Repository Analysis
        </CardTitle>
        <CardDescription>
          AI-powered analysis of repository structure and purpose
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!result ? (
          <div className="text-center py-6">
            <div className="mb-4 text-muted-foreground">
              <Robot className="h-16 w-16 mx-auto mb-2" />
              <p>Get an AI analysis of what this repository does and who it's for</p>
            </div>
            <Button onClick={analyzeRepository} disabled={loading} className="mx-auto">
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Analyzing...
                </span>
              ) : (
                "Analyze Repository"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Repository Purpose</h3>
              <p className="text-sm text-muted-foreground">{result.purpose}</p>
            </div>
            
            <div>
              <div className="flex items-center mb-2">
                <h3 className="text-sm font-medium">Data Handling</h3>
                <Badge 
                  variant={result.sensitiveData ? "destructive" : "default"} 
                  className="ml-2"
                >
                  {result.sensitiveData ? (
                    <span className="flex items-center">
                      <XCircle className="mr-1 h-3 w-3" />
                      Handles Sensitive Data
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      No Sensitive Data
                    </span>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{result.handlesData}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Target Audience</h3>
              <p className="text-sm text-muted-foreground">{result.audienceAndUse}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};