
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons/Logo";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SetUsernamePage() {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user && user.displayName) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Authenticated",
            description: "You must be logged in to set a username.",
        });
        return;
    }
    if (displayName.trim().length < 2) {
        toast({
            variant: "destructive",
            title: "Invalid Name",
            description: "Your name must be at least 2 characters long.",
        });
        return;
    }

    setIsLoading(true);
    try {
      await updateProfile(user, { displayName });
      toast({
          title: "Success!",
          description: `Welcome, ${displayName}!`,
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
       <motion.div
            className="mx-auto grid w-[350px] gap-6 bg-card p-8 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
          <div className="grid gap-2 text-center">
             <Logo className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-bold">One last step!</h1>
            <p className="text-balance text-muted-foreground">
              Please enter your name to personalize your account.
            </p>
          </div>
          <form onSubmit={handleSaveName} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="e.g. Jane Doe"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : "Save and Continue"}
            </Button>
          </form>
        </motion.div>
    </div>
  );
}
