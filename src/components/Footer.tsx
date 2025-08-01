
"use client";

import Link from 'next/link';
import { Mail, Linkedin } from 'lucide-react';
import { motion } from 'framer-motion';

export function Footer() {
    const text = "Crafted by Abhay";
    
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.04 * i },
        }),
    };

    const childVariants = {
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
            },
        },
        hidden: {
            opacity: 0,
            y: 20,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
            },
        },
    };

    return (
        <div className="text-center text-sm text-muted-foreground">
            <motion.p 
                style={{ display: "flex", overflow: "hidden" }}
                className="font-caveat text-xl text-foreground/80"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {text.split("").map((char, index) => (
                    <motion.span
                        key={index}
                        variants={childVariants}
                        style={{ marginRight: char === " " ? "0.25em" : "0" }}
                    >
                        {char}
                    </motion.span>
                ))}
            </motion.p>
            <div className="flex items-center justify-center gap-4 mt-2">
                <Link 
                    href="mailto:abhay.dec03@gmail.com" 
                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                    aria-label="Email Abhay"
                >
                    <Mail className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                </Link>
                 <Link 
                    href="https://www.linkedin.com/in/abhay-608339248/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                    aria-label="Abhay's LinkedIn Profile"
                >
                    <Linkedin className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                </Link>
            </div>
        </div>
    )
}
