import React, { useState } from "react";
import { useAuth } from "../context/auth-context";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { PatInput } from "./pat-input";
import { AuthExplainer } from "./auth-explainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GithubLogo, Key, List } from "@phosphor-icons/react";

export const AuthDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { authState, login } = useAuth();
  const { isAuthenticated } = authState;

  const handleSignIn = () => {
    if (isAuthenticated) {
      setOpen(false);
      return;
    }
    
    login();
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="text-sm"
        onClick={() => setOpen(true)}
      >
        Authentication Help
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GithubLogo className="h-5 w-5" />
              <span>GitHub Repository Access</span>
            </DialogTitle>
            <DialogDescription>
              Choose the authentication method that matches your repository access requirements
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview" className="text-xs">
                <List className="h-3 w-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="oauth" className="text-xs">
                <GithubLogo className="h-3 w-3 mr-1" />
                OAuth Login
              </TabsTrigger>
              <TabsTrigger value="pat" className="text-xs">
                <Key className="h-3 w-3 mr-1" />
                PAT Token
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <AuthExplainer />
            </TabsContent>
            
            <TabsContent value="oauth" className="space-y-4">
              <div className="space-y-4">
                <div className="bg-card p-4 rounded-md">
                  <h3 className="text-sm font-medium mb-2">GitHub OAuth Authentication</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Sign in with your GitHub account to access:
                  </p>
                  <ul className="text-xs space-y-2 mb-4">
                    <li className="flex items-start">
                      <span className="bg-accent/20 text-accent rounded-full h-4 w-4 flex items-center justify-center text-[10px] mr-2 mt-0.5">✓</span>
                      <span>Public repositories (with increased API rate limits)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-accent/20 text-accent rounded-full h-4 w-4 flex items-center justify-center text-[10px] mr-2 mt-0.5">✓</span>
                      <span>Private repositories you own or have access to</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-destructive/20 text-destructive rounded-full h-4 w-4 flex items-center justify-center text-[10px] mr-2 mt-0.5">✗</span>
                      <span>SSO/SAML protected repositories (requires PAT with SSO)</span>
                    </li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handleSignIn} 
                  className="w-full"
                  disabled={isAuthenticated}
                >
                  {isAuthenticated ? "Already Signed In" : "Sign in with GitHub"}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="pat" className="space-y-4">
              <PatInput />
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="secondary" 
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};