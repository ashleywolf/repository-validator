import React from "react";
import { RepoData } from "@/lib/repo-services";
import { StatusBadge, DescriptionBadge, LicenseBadge } from "@/components/repo-components";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GithubLogo, 
  BookOpen, 
  FileText, 
  Users, 
  Shield, 
  ArrowSquareOut, 
  Warning, 
  Package 
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";

interface ValidationResultsProps {
  repoData: RepoData;
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({ repoData }) => {
  const { owner, repo, repoUrl, files, description, licenses, dependencies } = repoData;
  
  const getFileUrl = (fileType: string): string => {
    switch (fileType.toLowerCase()) {
      case "readme":
        return `${repoUrl}/blob/main/README.md`;
      case "license":
        return `${repoUrl}/blob/main/LICENSE`;
      case "contributing":
        return `${repoUrl}/blob/main/CONTRIBUTING.md`;
      case "codeofconduct":
        return `${repoUrl}/blob/main/CODE_OF_CONDUCT.md`;
      case "security":
        return `${repoUrl}/blob/main/SECURITY.md`;
      default:
        return repoUrl;
    }
  };
  
  const getTemplateUrl = (fileType: string): string => {
    const templateBaseUrl = "https://github.com/github/github-ospo/tree/main/release%20template";
    
    switch (fileType.toLowerCase()) {
      case "readme":
        return `${templateBaseUrl}/README.md`;
      case "license":
        return `${templateBaseUrl}/LICENSE`;
      case "contributing":
        return `${templateBaseUrl}/CONTRIBUTING.md`;
      case "codeofconduct":
        return `${templateBaseUrl}/CODE_OF_CONDUCT.md`;
      case "security":
        return `${templateBaseUrl}/SECURITY.md`;
      default:
        return templateBaseUrl;
    }
  };
  
  // Helper to render file status with links
  const renderFileStatus = (
    fileExists: boolean, 
    fileType: string, 
    icon: React.ReactNode,
    label: string
  ) => {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={fileExists} label={fileExists ? "Found" : "Missing"} />
          
          {fileExists ? (
            <a 
              href={getFileUrl(fileType)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1"
            >
              <ArrowSquareOut size={14} />
              <span>View</span>
            </a>
          ) : (
            <a 
              href={getTemplateUrl(fileType)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1"
            >
              <ArrowSquareOut size={14} />
              <span>Get Template</span>
            </a>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Repository Info Card */}
      <Card className="mission-card spy-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GithubLogo className="h-5 w-5" />
            <span>{owner}/{repo}</span>
          </CardTitle>
          <CardDescription>
            {description.text || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <DescriptionBadge rating={description.rating} />
            <LicenseBadge name={licenses.name} holder={licenses.holder} />
          </div>
          
          {licenses.text && (
            <div className="mt-2 p-3 bg-muted rounded-md text-sm">
              <p className="font-medium mb-1">Copyright Notice:</p>
              <p className="text-muted-foreground">{licenses.text}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <a 
            href={repoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary text-sm hover:underline flex items-center gap-1"
          >
            <GithubLogo size={16} />
            <span>View Repository</span>
          </a>
        </CardFooter>
      </Card>
      
      {/* Required Files Card */}
      <Card className="mission-card spy-glow">
        <CardHeader>
          <CardTitle>Required Files Check</CardTitle>
          <CardDescription>
            Verifying presence of essential open source repository files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {renderFileStatus(
              files.readme, 
              "readme", 
              <BookOpen size={18} className="text-primary" />,
              "README"
            )}
            
            {renderFileStatus(
              files.license, 
              "license", 
              <FileText size={18} className="text-primary" />,
              "LICENSE"
            )}
            
            {renderFileStatus(
              files.contributing, 
              "contributing", 
              <Users size={18} className="text-primary" />,
              "CONTRIBUTING"
            )}
            
            {renderFileStatus(
              files.codeOfConduct, 
              "codeOfConduct", 
              <Users size={18} className="text-primary" />,
              "CODE OF CONDUCT"
            )}
            
            {renderFileStatus(
              files.security, 
              "security", 
              <Shield size={18} className="text-primary" />,
              "SECURITY"
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Dependency Analysis Card */}
      <Card className="mission-card spy-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package size={20} className="text-primary" />
            <span>Dependency Analysis</span>
          </CardTitle>
          <CardDescription>
            Analyzing {dependencies.total} dependencies and their licenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dependencies.total > 0 ? (
            <div className="space-y-4">
              {dependencies.hasCopyleft && (
                <div className="p-3 bg-destructive/20 border border-destructive/30 rounded-md flex items-center gap-2">
                  <Warning size={18} className="text-destructive" />
                  <p className="text-sm">
                    Copyleft licenses detected. These may require additional review for compliance.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">License Distribution</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(dependencies.licenses).map(([license, count]) => (
                    <div 
                      key={license} 
                      className={`
                        p-2 rounded-md text-sm flex items-center justify-between
                        ${isCopyleftLicense(license) ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted'}
                      `}
                    >
                      <span>{license}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                Export SBOM Results
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No dependency information available for this repository
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper to check if a license is copyleft
const isCopyleftLicense = (license: string): boolean => {
  const copyleftLicenses = ["GPL", "AGPL", "LGPL", "MPL", "EPL", "CDDL", "CPL"];
  return copyleftLicenses.some(l => license.toUpperCase().includes(l));
};