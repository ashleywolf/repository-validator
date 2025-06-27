import React, { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignIn, SignOut, User, Check, LockSimple, LockOpen } from "@phosphor-icons/react";
import { getSparkAuthToken, isSparkEnvironment } from "../lib/auth";
import { toast } from "sonner";

export const GitHubAuth: React.FC = () => {
  const { authState, login, logout, initWithSparkAuth } = useAuth();
  const { isAuthenticated, user, loading: authLoading, accessToken } = authState;
  const [loading, setLoading] = useState(false);
  const [canAccessPrivate, setCanAccessPrivate] = useState(false);

  // Determine if we have private repo access
  useEffect(() => {
    if (accessToken) {
      // Both real GitHub tokens and our special Spark tokens can access private repos
      setCanAccessPrivate(
        accessToken.startsWith('ghp_') || 
        accessToken.startsWith('ghs_') || 
        accessToken.startsWith('ghp_spark_')
      );
    } else {
      setCanAccessPrivate(false);
    }
  }, [accessToken]);

  // Try to authenticate with Spark user on mount
  useEffect(() => {
    const attemptAuth = async () => {
      if (!isAuthenticated && !authLoading && !loading) {
        try {
          setLoading(true);
          const success = await initWithSparkAuth();
          if (success) {
            console.log("Successfully authenticated with Spark on load");
          } else {
            console.log("Could not authenticate with Spark on load");
          }
        } catch (error) {
          console.error("Error during initial auth:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    attemptAuth();
  }, [isAuthenticated, authLoading, loading, initWithSparkAuth]);
  
  const handleDirectAuth = async () => {
    try {
      setLoading(true);
      
      // First try to use Spark authentication
      const success = await initWithSparkAuth();
      
      if (success) {
        toast.success("Authenticated with GitHub via Spark");
      } else {
        // If in the Spark environment but auth failed, use public mode
        if (isSparkEnvironment()) {
          toast.info("Using public repository access only", {
            description: "To access private repositories, you'll need to use a GitHub Personal Access Token. The application will prompt you for one when needed."
          });
        } else {
          // In regular web environment, initiate OAuth flow
          login();
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Authentication failed. Using public access mode.", {
        description: `Error details: ${errorMessage}`
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Button variant="outline" disabled>
        <span className="animate-pulse">Loading...</span>
      </Button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar_url} alt={user.login} />
              <AvatarFallback>{user.login.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{user.login}</span>
            <span className="flex items-center">
              {canAccessPrivate ? (
                <LockOpen className="h-3 w-3 text-accent ml-1" title="Private repo access enabled" />
              ) : (
                <Check className="h-3 w-3 text-accent" />
              )}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex justify-between items-center">
            <span>Repository Access:</span>
            <span className="flex items-center text-xs">
              {canAccessPrivate ? (
                <>
                  <LockOpen className="h-3 w-3 mr-1 text-accent" />
                  <span className="text-accent">Public & Private</span>
                </>
              ) : (
                <>
                  <LockSimple className="h-3 w-3 mr-1" />
                  <span>Public Only</span>
                </>
              )}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a 
              href={user.html_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
            <SignOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div>
      <Button onClick={handleDirectAuth} variant="outline" className="flex items-center gap-2">
        <SignIn className="h-4 w-4" />
        <span>Sign in with GitHub</span>
      </Button>
      <div className="text-xs text-muted-foreground mt-1">
        Authenticate to access private repositories & increase API limits.
        {isSparkEnvironment() && (
          <div className="mt-1 text-xs text-primary">
            Using Spark environment - authentication will happen automatically for your repositories.
          </div>
        )}
      </div>
    </div>
  );
};