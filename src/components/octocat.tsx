import React from "react";

// A cute animated Octocat component
export const Octocat: React.FC<{ size?: number; className?: string }> = ({ 
  size = 100, 
  className = ""
}) => {
  return (
    <div className={`octocat-container ${className}`} style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 96 96" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="octocat-svg animate-bounce-gentle"
      >
        {/* Body */}
        <path 
          d="M48 0C21.6 0 0 21.6 0 48c0 21.1 13.6 39 32.6 45.4 2.4 0.4 3.3-1 3.3-2.3 0-1.1 0-4.1-0.1-8-13.3 2.9-16.1-6.4-16.1-6.4-2.2-5.5-5.3-7-5.3-7-4.3-3 0.3-2.9 0.3-2.9 4.8 0.3 7.3 4.9 7.3 4.9 4.3 7.3 11.2 5.2 13.9 4 0.4-3.1 1.7-5.2 3-6.4-10.6-1.2-21.7-5.3-21.7-23.6 0-5.2 1.9-9.5 4.9-12.8-0.5-1.2-2.1-6 0.5-12.6 0 0 4-1.3 13.1 4.9 3.8-1.1 7.9-1.6 11.9-1.6 4 0 8.1 0.5 11.9 1.6 9.1-6.2 13.1-4.9 13.1-4.9 2.6 6.5 1 11.3 0.5 12.6 3.1 3.3 4.9 7.6 4.9 12.8 0 18.3-11.1 22.4-21.7 23.6 1.7 1.5 3.3 4.5 3.3 9 0 6.4-0.1 11.6-0.1 13.2 0 1.3 0.9 2.7 3.3 2.3C82.4 87 96 69.1 96 48 96 21.6 74.4 0 48 0z" 
          fill="currentColor"
          className="text-primary"
        />
        
        {/* Eyes */}
        <circle 
          cx="36" 
          cy="38" 
          r="4" 
          fill="white" 
          className="octocat-eye animate-blink"
        />
        <circle 
          cx="60" 
          cy="38" 
          r="4" 
          fill="white" 
          className="octocat-eye animate-blink"
        />
        
        {/* Tentacles */}
        <path 
          d="M16 60C18 68 14 82 10 86" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round"
          className="text-primary animate-wiggle-slow"
        />
        <path 
          d="M80 60C78 68 82 82 86 86" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round"
          className="text-primary animate-wiggle-slow"
        />
      </svg>
    </div>
  );
};

// A cute octocat with a wizard hat for the app
export const OctocatWizard: React.FC<{ size?: number; className?: string }> = ({ 
  size = 120, 
  className = "" 
}) => {
  return (
    <div className={`octocat-wizard-container relative ${className}`} style={{ width: size, height: size }}>
      {/* Wizard Hat */}
      <div className="absolute z-10" style={{ top: -size/3, left: size/4 }}>
        <svg 
          width={size/2} 
          height={size/2} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 2L3 11H21L12 2Z" 
            fill="#6E56CF" 
            className="animate-sparkle"
          />
          <path 
            d="M5 11H19V14C19 17.866 15.866 21 12 21C8.13401 21 5 17.866 5 14V11Z" 
            fill="#6E56CF"
          />
          <path 
            d="M10 14H14" 
            stroke="gold" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
          <path 
            d="M8 17H16" 
            stroke="gold" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
          <circle cx="10" cy="8" r="1" fill="gold" className="animate-twinkle" />
          <circle cx="14" cy="6" r="1" fill="gold" className="animate-twinkle-delay" />
          <circle cx="8" cy="6" r="1" fill="gold" className="animate-twinkle" />
        </svg>
      </div>
      
      {/* Octocat */}
      <Octocat size={size} />
    </div>
  );
};

// Add custom animation classes to index.css
export const addOctocatStyles = `
@keyframes bounce-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes blink {
  0%, 97% { opacity: 1; }
  98%, 99% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes wiggle-slow {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(3deg); }
  75% { transform: rotate(-3deg); }
}

@keyframes sparkle {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.2); }
  100% { filter: brightness(1); }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

@keyframes twinkle-delay {
  0%, 100% { opacity: 0.8; }
  70% { opacity: 1; }
}

.animate-bounce-gentle {
  animation: bounce-gentle 3s ease-in-out infinite;
}

.animate-blink {
  animation: blink 5s infinite;
}

.animate-wiggle-slow {
  animation: wiggle-slow 4s ease-in-out infinite;
}

.animate-sparkle {
  animation: sparkle 2s ease-in-out infinite;
}

.animate-twinkle {
  animation: twinkle 3s ease-in-out infinite;
}

.animate-twinkle-delay {
  animation: twinkle-delay 3s ease-in-out infinite;
}
`;