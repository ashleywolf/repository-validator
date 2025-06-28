import React from "react";

// Professional GitHub logo component
export const GitHubLogo: React.FC<{ size?: number; className?: string }> = ({ 
  size = 100, 
  className = ""
}) => {
  return (
    <div className={`github-logo-container ${className}`} style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 98 96" 
        xmlns="http://www.w3.org/2000/svg"
        className="github-logo"
      >
        <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217C0 70.973 13.993 89.389 33.405 95.907C35.832 96.397 36.721 94.848 36.721 93.545C36.721 92.404 36.641 88.493 36.641 84.418C23.051 87.352 20.14 78.551 20.14 78.551C17.961 72.847 14.727 71.381 14.727 71.381C10.325 68.366 15.044 68.366 15.044 68.366C19.928 68.692 22.512 73.414 22.512 73.414C26.834 80.917 33.811 78.795 36.886 77.492C37.299 74.314 38.596 72.111 40.04 70.89C29.172 69.751 17.802 65.514 17.802 46.547C17.802 41.175 19.697 36.777 22.593 33.354C22.099 32.133 20.453 27.08 23.051 20.315C23.051 20.315 27.129 19.011 36.641 25.349C40.579 24.291 44.684 23.749 48.854 23.749C53.025 23.749 57.13 24.291 61.067 25.349C70.578 19.011 74.657 20.315 74.657 20.315C77.254 27.08 75.608 32.133 75.114 33.354C78.091 36.777 79.986 41.175 79.986 46.547C79.986 65.514 68.615 69.669 57.748 70.89C59.686 72.437 61.304 75.291 61.304 79.938C61.304 86.478 61.224 91.931 61.224 93.545C61.224 94.848 62.112 96.397 64.54 95.907C83.952 89.389 97.945 70.973 97.945 49.217C97.945 22 76.025 0 48.854 0Z" 
          fill="currentColor"
          className="text-primary" />
      </svg>
    </div>
  );
};

// Compliance check icon component
export const ComplianceCheckIcon: React.FC<{ size?: number; className?: string }> = ({ 
  size = 100, 
  className = ""
}) => {
  return (
    <div className={`compliance-icon-container ${className}`} style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="compliance-icon"
      >
        <path 
          d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" 
          fill="currentColor"
          className="text-accent" 
        />
      </svg>
    </div>
  );
};

// For backward compatibility, we'll maintain the old name
export const OctocatWizard = GitHubLogo;