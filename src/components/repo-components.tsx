import React from "react";
import { Octocat as BaseOctocat } from "./octocat";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Warning } from "@phosphor-icons/react";

// Mission-themed Octocat with spy glasses, hat and briefcase
export const MissionOctocat: React.FC<{ size?: number; className?: string }> = ({ 
  size = 120,
  className = ""
}) => {
  return (
    <div className={`mission-octocat relative ${className}`} style={{ width: size, height: size }}>
      {/* Agent Hat */}
      <div className="absolute z-10" style={{ top: -size/3.5, left: size/4 }}>
        <svg 
          width={size/2} 
          height={size/3} 
          viewBox="0 0 24 12" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M2 12H22C23.1 12 24 11.1 24 10V2C24 0.9 23.1 0 22 0H2C0.9 0 0 0.9 0 2V10C0 11.1 0.9 12 2 12Z" 
            fill="currentColor" 
            className="text-muted-foreground animate-sparkle"
          />
          <path 
            d="M3 12H21L22 8H2L3 12Z" 
            fill="currentColor"
            className="text-primary"
          />
        </svg>
      </div>
      
      {/* Agent Glasses */}
      <div className="absolute z-20" style={{ top: size/5, left: size/6 }}>
        <svg 
          width={size*2/3} 
          height={size/6} 
          viewBox="0 0 32 8" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="2" width="12" height="4" rx="2" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-foreground" />
          <rect x="18" y="2" width="12" height="4" rx="2" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-foreground" />
          <path d="M14 4H18" stroke="currentColor" strokeWidth="1" className="text-foreground" />
        </svg>
      </div>
      
      {/* Mission Briefcase */}
      <div className="absolute" style={{ bottom: -size/10, left: size/4 }}>
        <svg 
          width={size/2} 
          height={size/4} 
          viewBox="0 0 24 12" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="1" width="20" height="10" rx="1" fill="currentColor" className="text-primary" />
          <rect x="10" y="0" width="4" height="2" fill="currentColor" className="text-primary" />
          <rect x="11" y="5" width="2" height="2" rx="1" fill="gold" className="animate-twinkle" />
        </svg>
      </div>
      
      {/* Base Octocat */}
      <BaseOctocat size={size} />
    </div>
  );
};

// Status badges for repository checks
interface StatusBadgeProps {
  status: boolean | null | undefined;
  label: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = "" }) => {
  if (status === null || status === undefined) {
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${className}`}>
        <Warning size={14} className="text-muted-foreground" />
        <span>{label}</span>
      </Badge>
    );
  }
  
  if (status) {
    return (
      <Badge variant="default" className={`bg-accent flex items-center gap-1 ${className}`}>
        <CheckCircle size={14} />
        <span>{label}</span>
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className={`flex items-center gap-1 ${className}`}>
      <XCircle size={14} className="text-destructive" />
      <span>{label}</span>
    </Badge>
  );
};

// Description quality badge
interface DescriptionBadgeProps {
  rating: "great" | "good" | "poor" | "missing";
  className?: string;
}

export const DescriptionBadge: React.FC<DescriptionBadgeProps> = ({ rating, className = "" }) => {
  const getVariant = () => {
    switch (rating) {
      case "great":
        return "default bg-accent";
      case "good":
        return "default";
      case "poor":
        return "secondary";
      case "missing":
        return "destructive";
      default:
        return "outline";
    }
  };
  
  const getIcon = () => {
    switch (rating) {
      case "great":
        return <CheckCircle size={14} />;
      case "good":
        return <CheckCircle size={14} />;
      case "poor":
        return <Warning size={14} />;
      case "missing":
        return <XCircle size={14} />;
      default:
        return null;
    }
  };
  
  return (
    <Badge variant={getVariant() as any} className={`flex items-center gap-1 ${className}`}>
      {getIcon()}
      <span>Description: {rating}</span>
    </Badge>
  );
};

// License badge
interface LicenseBadgeProps {
  name: string | null;
  holder: string | null;
  className?: string;
}

export const LicenseBadge: React.FC<LicenseBadgeProps> = ({ name, holder, className = "" }) => {
  if (!name && !holder) {
    return (
      <Badge variant="destructive" className={`flex items-center gap-1 ${className}`}>
        <XCircle size={14} />
        <span>No License Found</span>
      </Badge>
    );
  }
  
  return (
    <Badge variant="default" className={`flex items-center gap-1 ${className}`}>
      <CheckCircle size={14} />
      <span>{name || "Unknown"} ({holder || "Unknown"})</span>
    </Badge>
  );
};