import React from "react";
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
import { SignIn, SignOut, User } from "@phosphor-icons/react";

export const GitHubAuth: React.FC = () => {
  const { authState, login, logout } = useAuth();
  const { isAuthenticated, user, loading } = authState;

  if (loading) {
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
    <Button onClick={login} variant="outline" className="flex items-center gap-2">
      <SignIn className="h-4 w-4" />
      <span>Sign in with GitHub</span>
    </Button>
  );
};