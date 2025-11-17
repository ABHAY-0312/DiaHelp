
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';

/**
 * A client-side component that listens for Firestore permission errors
 * and throws them to be caught by the Next.js development error overlay.
 * This component does not render anything to the DOM.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: Error) => {
      // Throw the error so Next.js can catch it and display the overlay
      throw error;
    };

    errorEmitter.on('permission-error', handleError);

    // Cleanup listener on component unmount
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null; // This component does not render any UI
}
