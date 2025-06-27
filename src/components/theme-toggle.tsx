import React from "react";
import { useTheme } from "@/context/theme-context";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "@phosphor-icons/react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="w-9 px-0"
    >
      {theme === "dark" ? (
        <Sun weight="bold" className="h-5 w-5" />
      ) : (
        <Moon weight="bold" className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}