
"use client";

import { useEffect } from 'react';

export function DevToolsWarning() {
  useEffect(() => {
    const threshold = 160;
    
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        console.warn('%cSTOP!', 'color: red; font-size: 50px; font-weight: bold;');
        console.warn('%cThis is a browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or "hack" someone\'s account, it is a scam and will give them access to your account.', 'font-size: 16px;');
      }
    };
    
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F12') {
            e.preventDefault();
        }
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
            e.preventDefault();
        }
        if (e.ctrlKey && e.key.toUpperCase() === 'U') {
            e.preventDefault();
        }
    }

    const interval = setInterval(checkDevTools, 1000);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
