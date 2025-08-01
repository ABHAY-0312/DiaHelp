
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

// The root page `/` is now the public landing page.
const protectedRoutes = ['/dashboard', '/set-username'];
const authRoutes = ['/login', '/signup'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.includes(pathname);
    const isSetUsernameRoute = pathname === '/set-username';

    if (!user && isProtectedRoute) {
      router.push('/login');
    }

    if (user) {
      if (isAuthRoute) {
        router.push('/dashboard');
      }
      // If user has no name, redirect them to set it, unless they are already there.
      if (!user.displayName && isProtectedRoute && !isSetUsernameRoute) {
        router.push('/set-username');
      }
      // If user has a name but is on the set-username page, redirect them away.
      if (user.displayName && isSetUsernameRoute) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);


  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
