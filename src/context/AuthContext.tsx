
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { usePathname, useRouter } from 'next/navigation';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

const protectedRoutes = ['/dashboard', '/set-username'];
const authRoutes = ['/login', '/signup'];
const publicRoutes = ['/logout'];

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
    const isPublicRoute = publicRoutes.includes(pathname);
    const isSetUsernameRoute = pathname === '/set-username';

    if (isPublicRoute) {
        return;
    }

    if (!user && isProtectedRoute) {
      router.replace('/login');
    }

    if (user) {
      if (isAuthRoute) {
        router.replace('/dashboard');
      }
      if (!user.displayName && isProtectedRoute && !isSetUsernameRoute) {
        router.replace('/set-username');
      }
      if (user.displayName && isSetUsernameRoute) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);


  return (
    <AuthContext.Provider value={{ user, loading }}>
      {process.env.NODE_ENV === 'development' && <FirebaseErrorListener />}
      {children}
    </AuthContext.Provider>
  );
};
