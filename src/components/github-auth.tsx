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
import { SignIn, SignOut, User, Check } from "@phosphor-icons/react";
import { getSparkAuthToken, isSparkEnvironment } from "../lib/auth";
import { toast } from "sonner";

export const GitHubAuth: React.FC = () => {
  const { authState, login, logout, initWithSparkAuth } = useAuth();
  const { isAuthenticated, user, loading: authLoading } = authState;
  const [loading, setLoading] = useState(false);

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
          toast.info("Using public repository access only");
        } else {
          // In regular web environment, initiate OAuth flow
          login();
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Authentication failed. Using public access mode.");
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
            <Check className="h-3 w-3 text-accent" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
    <Button onClick={handleDirectAuth} variant="outline" className="flex items-center gap-2">
      <SignIn className="h-4 w-4" />
      <span>Sign in with GitHub</span>
    </Button>
  );
};