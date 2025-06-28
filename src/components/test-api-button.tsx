import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { makeGitHubRequest, getCurrentRateLimit } from "../lib/utils";

export const TestApiButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  
  const testApiAccess = async () => {
    setLoading(true);
    try {
      // Test a simple API call to a public repository
      const testRepoUrl = 'https://api.github.com/repos/github/docs/contents';
      const response = await makeGitHubRequest(testRepoUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const rateLimit = getCurrentRateLimit();
      
      toast.success("GitHub API test successful!", {
        description: rateLimit 
          ? `Rate limit: ${rateLimit.remaining}/${rateLimit.limit} requests remaining` 
          : "Connected successfully to GitHub API"
      });
    } catch (error) {
      console.error("API test failed:", error);
      toast.error("GitHub API test failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={testApiAccess} 
      disabled={loading}
    >
      {loading ? "Testing..." : "Test GitHub API"}
    </Button>
  );
};