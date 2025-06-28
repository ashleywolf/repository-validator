import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FolderOpen, Copy, PlusCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

// Button to open a pull request with a template
interface TemplatePrButtonProps {
  owner: string;
  repo: string;
  fileType: string;
  className?: string;
}

export const TemplatePrButton: React.FC<TemplatePrButtonProps> = ({ 
  owner, 
  repo, 
  fileType,
  className = ""
}) => {
  const getTemplateFileName = (type: string): string => {
    switch (type.toLowerCase()) {
      case "readme": return "README.md";
      case "license": return "LICENSE";
      case "contributing": return "CONTRIBUTING.md";
      case "codeofconduct": return "CODE_OF_CONDUCT.md";
      case "security": return "SECURITY.md";
      default: return "";
    }
  };
  
  const handleCreatePR = () => {
    // This would need to be implemented with GitHub API in a real environment
    // Here we'll just open the template file URL
    const templateBaseUrl = "https://github.com/github/github-ospo/tree/main/release%20template";
    const templateFile = getTemplateFileName(fileType);
    
    window.open(`${templateBaseUrl}/${templateFile}`, "_blank");
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`flex items-center gap-1 ${className}`}
            onClick={handleCreatePR}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add from Template</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Create a PR to add this file from a template</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Button to squash repository history
interface SquashHistoryButtonProps {
  owner: string;
  repo: string;
  className?: string;
}

export const SquashHistoryButton: React.FC<SquashHistoryButtonProps> = ({
  owner,
  repo,
  className = ""
}) => {
  const squashInstructions = `
# Repository History Squashing Instructions

To squash your repository's history, follow these steps:

1. Create a new branch from your current state:
   git checkout -b squashed-history

2. Create a new orphan branch:
   git checkout --orphan temp-squashed

3. Add all files and commit:
   git add .
   git commit -m "Initial commit with squashed history"

4. Delete the old branch and rename the new one:
   git branch -D squashed-history
   git branch -m squashed-history

5. Force push to update the repository:
   git push -f origin squashed-history

6. In GitHub, set squashed-history as the default branch and delete the old branch.
  `;
  
  const copyInstructions = () => {
    navigator.clipboard.writeText(squashInstructions);
    toast.success("Squash instructions copied to clipboard!");
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`flex items-center gap-1 ${className}`}
            onClick={copyInstructions}
          >
            <Copy className="h-4 w-4" />
            <span>Copy Squash Instructions</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy instructions to squash repository history</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};