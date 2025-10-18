
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Heart } from 'lucide-react';
import { motion, type AnimationControls } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.2 },
    },
};

const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", damping: 12, stiffness: 100 },
    },
};

export default function LogoutPage() {
    const router = useRouter();
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);
    const message = "Thank you for your visit. See you again soon!";

    useEffect(() => {
        const performSignOut = async () => {
            await signOut(auth);
        };
        performSignOut();
    }, []);

    useEffect(() => {
        if (isAnimationComplete) {
            const timer = setTimeout(() => {
                router.replace('/login');
            }, 3000); // Wait 3 seconds after animation before redirecting

            return () => clearTimeout(timer);
        }
    }, [isAnimationComplete, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-secondary text-center p-4">
            <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <motion.h1
                    className="font-caveat text-4xl sm:text-5xl md:text-6xl text-foreground mb-6 flex flex-wrap justify-center"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    onAnimationComplete={() => setIsAnimationComplete(true)}
                >
                    {message.split(' ').map((word, wordIndex) => (
                        <span key={wordIndex} className="inline-block mr-3 whitespace-nowrap">
                            {word.split('').map((char, charIndex) => (
                                <motion.span key={charIndex} variants={childVariants} className="inline-block">
                                    {char}
                                </motion.span>
                            ))}
                        </span>
                    ))}
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                >
                    <Heart className="w-16 h-16 text-primary animate-pulse" fill="currentColor" />
                </motion.div>
                {isAnimationComplete && (
                     <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="text-muted-foreground mt-8"
                    >
                        Redirecting you shortly...
                    </motion.p>
                )}
            </motion.div>
        </div>
    );
}
