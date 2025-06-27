import { useAuth } from "../context/auth-context";
import { Button } from "@/components/ui/button";
import { 
  FileTemplate,
  getAllTemplates 
} from "../lib/templates";
import { getTemplateApiUrl } from "../lib/utils";
import { FilePlus, GitPullRequest } from "@phosphor-icons/react";
import { toast } from "sonner";

type CreatePRButtonProps = {
  filePath: string;
  owner: string;
  repo: string;
  onSelectTemplate: (template: FileTemplate) => void;
}

export const CreatePRButton: React.FC<CreatePRButtonProps> = ({ 
  filePath, 
  owner, 
  repo,
  onSelectTemplate 
}) => {
  const { authState, octokit } = useAuth();

  const handleCreatePR = async () => {
    try {
      // First check for local templates
      const templates = getAllTemplates();
      
      if (templates[filePath]) {
        onSelectTemplate(templates[filePath]);
        return;
      }
      
      // If we don't have a local template, try to fetch from GitHub OSPO repository
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
      
      onSelectTemplate(customTemplate);
    } catch (error) {
      toast.error(`Error fetching template: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="text-xs"
      onClick={handleCreatePR}
    >
      <FilePlus className="mr-1 h-3 w-3" />
      Fix Missing File
    </Button>
  );
};