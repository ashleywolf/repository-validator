import React from "react";
import { useAuth } from "../context/auth-context";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LockOpen, LockSimple } from "@phosphor-icons/react";

export const AuthStatusBanner: React.FC = () => {
  const { authState, login, logout } = useAuth();
  const { isAuthenticated, accessToken, user } = authState;

  const canAccessPrivate = accessToken && (
    accessToken.startsWith('ghp_') || 
    accessToken.startsWith('ghs_') || 
    accessToken.startsWith('ghp_spark_')
  );

  if (!isAuthenticated) {
    return (
      <Alert variant="outline" className="border-amber-500/50 bg-amber-500/10 mb-4">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="flex items-center justify-between">
          <div className="text-sm text-amber-700">
            Using public repository mode only. API rate limits apply.
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-500 text-amber-700 hover:bg-amber-500/20 hover:text-amber-800"
            onClick={() => login()}
          >
            Sign in to improve access
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isAuthenticated && !canAccessPrivate) {
    return (
      <Alert variant="outline" className="border-primary/50 bg-primary/10 mb-4">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between">
          <div className="text-sm">
            Signed in as <span className="font-medium">{user?.login}</span> with public repository access.
            <Badge variant="outline" className="ml-2 bg-primary/20 border-primary/30">
              <LockOpen className="mr-1 h-3 w-3" /> Public Repos
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => logout()}
          >
            Sign out
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="outline" className="border-accent/50 bg-accent/10 mb-4">
      <ShieldCheck className="h-4 w-4 text-accent" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-sm">
          Full authentication active for <span className="font-medium">{user?.login}</span>.
          <Badge variant="outline" className="ml-2 bg-accent/20 border-accent/30 text-accent-foreground">
            <LockSimple className="mr-1 h-3 w-3" /> Private & Public Access
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={() => logout()}
        >
          Sign out
        </Button>
      </AlertDescription>
    </Alert>
  );
};