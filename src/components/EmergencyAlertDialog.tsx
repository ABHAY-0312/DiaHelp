
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateEmergencyAlertOutput } from "@/app/api/generate-emergency-alert/route";

interface EmergencyAlertDialogProps {
  alertData: GenerateEmergencyAlertOutput | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmergencyAlertDialog({ alertData, isOpen, onClose }: EmergencyAlertDialogProps) {
  const { toast } = useToast();
  
  const handleCopyToClipboard = () => {
    if (!alertData) return;
    const textToCopy = `Subject: ${alertData.subject}\n\n${alertData.body}`;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied to Clipboard",
      description: "The alert message has been copied.",
    });
  };

  const handleSendEmail = () => {
     if (!alertData) return;
     const subject = encodeURIComponent(alertData.subject);
     const body = encodeURIComponent(alertData.body);
     const mailtoLink = `mailto:${alertData.emergencyContactEmail}?subject=${subject}&body=${body}`;
     window.location.href = mailtoLink;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg border-destructive border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-destructive">
            <AlertTriangle className="h-8 w-8" />
            Medical Alert Triggered
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            A critical health metric has been detected. Please take immediate action. This is not a drill.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-destructive/10 rounded-lg">
             <h4 className="font-semibold text-lg text-destructive">Critical Reading Detected:</h4>
             <p className="text-destructive font-bold text-xl">{alertData?.criticalReading}</p>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold text-lg mb-2">Generated Alert Message:</h4>
            <div className="p-3 bg-secondary rounded-md max-h-60 overflow-y-auto">
                <p className="text-sm font-semibold">To: {alertData?.emergencyContactEmail || 'Not Provided'}</p>
                <p className="text-sm font-semibold">Subject: {alertData?.subject}</p>
                <hr className="my-2"/>
                <p className="text-sm whitespace-pre-wrap">{alertData?.body}</p>
            </div>
             <p className="text-xs text-muted-foreground mt-2">
                This is a simulated alert. Click the buttons below to copy the text or open your default email client.
             </p>
          </div>
        </div>
        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
           <Button variant="outline" onClick={handleCopyToClipboard}>
            <Copy className="mr-2 h-4 w-4" /> Copy Alert Text
          </Button>
          <Button onClick={handleSendEmail} className="bg-destructive hover:bg-destructive/90">
            <Mail className="mr-2 h-4 w-4" /> Email Emergency Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
