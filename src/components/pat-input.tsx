import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { Key } from "@phosphor-icons/react";

export const PatInput: React.FC = () => {
  const [token, setToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToken = () => {
    if (!token.trim()) {
      toast.error("Please enter a token");
      return;
    }

    if (!token.trim().startsWith("ghp_") && !token.trim().startsWith("ghs_") && !token.trim().startsWith("github_pat_")) {
      toast.warning("This doesn't appear to be a valid GitHub PAT format", {
        description: "Personal access tokens usually start with 'ghp_', 'ghs_', or 'github_pat_'"
      });
      // Continue anyway as we can't be 100% sure of all token formats
    }

    setIsSaving(true);
    try {
      // Store token in localStorage
      localStorage.setItem("github_access_token", token.trim());
      
      toast.success("Personal access token saved", {
        description: "Your token has been saved and will be used for authentication"
      });
      
      // Clear the input
      setToken("");
    } catch (error) {
      toast.error("Failed to save token", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyToken = () => {
    // Reload the page to apply the token
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card p-3 rounded-md border">
        <div className="flex items-center gap-2 mb-2">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">GitHub Personal Access Token</h3>
        </div>
        
        <div className="text-xs text-muted-foreground mb-3">
          <p>
            Use a PAT with SSO enabled for accessing organization repositories protected by SAML/SSO
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="pat-token" className="text-xs font-medium">Token</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoCircledIcon className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] p-3">
                    <p className="text-xs">
                      Your token must have the <code className="bg-muted px-1 py-0.5 rounded text-xs">repo</code> scope 
                      and have SSO enabled for your organization. Tokens are stored only in your browser.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="pat-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs"
              onClick={handleSaveToken}
              disabled={isSaving || !token.trim()}
            >
              {isSaving ? "Saving..." : "Save Token"}
            </Button>
            <Button 
              size="sm" 
              className="h-7 text-xs"
              onClick={handleApplyToken}
            >
              Apply & Reload
            </Button>
          </div>
        </div>
      </div>
      
      <div className="text-xs bg-muted/30 p-2 rounded">
        <p className="font-medium mb-1">How to create a token with SSO access:</p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub token settings</a></li>
          <li>Create a new token with the <code className="bg-muted px-1 py-0.5 rounded">repo</code> scope</li>
          <li>After creating the token, click "Configure SSO" and authorize your organization</li>
          <li>Copy the token and paste it here</li>
        </ol>
      </div>
    </div>
  );
};