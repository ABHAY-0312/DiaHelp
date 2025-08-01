
"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Camera, Sparkles, ImageOff, FlaskConical, AlertCircle, FileText, Pill, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import type { AnalyzeDocumentOutput } from '@/app/api/analyze-document/route';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function ResearchHub() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeDocumentOutput | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
          toast({
              variant: "destructive",
              title: "Image Too Large",
              description: "Please select an image smaller than 4MB.",
          });
          return;
      }
      setAnalysis(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeClick = async () => {
    if (!imagePreview) {
      toast({
        variant: "destructive",
        title: "No Image Selected",
        description: "Please select an image to analyze.",
      });
      return;
    }

    setIsLoading(true);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentDataUri: imagePreview }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result: AnalyzeDocumentOutput = await response.json();
      if (result.documentType === "not_a_document") {
        toast({
          title: "Analysis Result",
          description: "The AI could not identify this image as a medical document. Please try another one.",
        });
        setAnalysis(null);
        setIsLoading(false);
        return;
      }
      setAnalysis(result);
    } catch (error: any) {
      console.error("Document analysis error:", error);
      const errorMessage = error.message || "";
      if (errorMessage.includes("429")) {
          toast({
              variant: "destructive",
              title: "AI Service Rate Limited",
              description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow. For more information, visit ai.google.dev/gemini-api/docs/rate-limits.",
          });
      } else if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
          toast({
              variant: "destructive",
              title: "AI Service Busy",
              description: "The analysis service is currently experiencing high demand. Please try again in a moment.",
          });
      } else {
           toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: "There was an error analyzing your document. Please try again.",
            });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const getDocumentTypeDisplay = (type: AnalyzeDocumentOutput['documentType']) => {
      switch(type) {
          case 'lab_result': return 'Lab Result';
          case 'prescription': return 'Prescription';
          case 'other': return 'Other Medical Document';
          default: return 'Unknown';
      }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
                <Camera className="w-8 h-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-2xl">Blood Report Auto-Reader</CardTitle>
                <CardDescription>Upload an image of a lab result to extract & interpret data.</CardDescription>
            </div>
          </div>
          <Alert>
            <FlaskConical className="h-4 w-4" />
            <AlertTitle>Feature in Development</AlertTitle>
            <AlertDescription>
                This AI-powered tool is experimental. We are continuously working to improve its accuracy.
            </AlertDescription>
           </Alert>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="doc-photo">Choose an image</Label>
            <Input id="doc-photo" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
          </div>
          <div className="w-full aspect-[4/5] rounded-lg border-2 border-dashed bg-secondary/50 flex items-center justify-center overflow-hidden">
            {imagePreview ? (
              <Image src={imagePreview} alt="Document preview" width={400} height={500} className="object-contain w-full h-full" />
            ) : (
                <div className="text-center text-muted-foreground p-4">
                    <ImageOff className="w-16 h-16 mx-auto mb-2 opacity-50"/>
                    <p>Document image preview will appear here</p>
                </div>
            )}
          </div>
          <Button onClick={handleAnalyzeClick} disabled={isLoading || !imagePreview} size="lg" className="w-full font-bold text-base">
            {isLoading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Report...</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" /> Analyze Document</>
            )}
          </Button>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg border-primary/20 lg:sticky lg:top-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
                <FlaskConical className="w-8 h-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-2xl">Extracted Information</CardTitle>
                <CardDescription>AI-powered data extraction from your document.</CardDescription>
            </div>
        </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
                <p className="text-center text-muted-foreground">AI is reading your document, this may take a moment...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              <Card className="bg-secondary/50 p-4">
                  <h4 className="font-semibold text-lg">AI Summary</h4>
                  <p className="text-sm"><strong>Document Type:</strong> {getDocumentTypeDisplay(analysis.documentType)}</p>
                  <p className="text-sm mt-1"><strong>Summary:</strong> {analysis.summary}</p>
              </Card>

              {analysis.interpretation && (
                <Alert variant="default" className="border-primary/50">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <AlertTitle className="font-bold text-lg text-primary">AI Interpretation</AlertTitle>
                    <AlertDescription className="prose prose-sm max-w-none text-foreground prose-p:my-1 prose-strong:text-foreground/90">
                        {analysis.interpretation.split('Disclaimer:').map((part, index) => (
                          <p key={index}>
                            {part}
                            {index === 0 && analysis.interpretation.includes('Disclaimer:') ? <strong><br/>Disclaimer:</strong> : ''}
                          </p>
                        ))}
                    </AlertDescription>
                </Alert>
              )}

              {analysis.extractedFields.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><FileText className="w-5 h-5"/> Extracted Data Fields</h4>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Value</TableHead><TableHead>Reference Range</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {analysis.extractedFields.map((field, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{field.label}</TableCell>
                                    <TableCell>{field.value}</TableCell>
                                    <TableCell>{field.referenceRange || 'N/A'}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                  </div>
              )}

              {analysis.extractedMedications.length > 0 && (
                   <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><Pill className="w-5 h-5"/> Extracted Medications</h4>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Dosage</TableHead><TableHead>Frequency</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {analysis.extractedMedications.map((med, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{med.name}</TableCell>
                                    <TableCell>{med.dosage}</TableCell>
                                    <TableCell>{med.frequency}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                  </div>
              )}
               {analysis.extractedFields.length === 0 && analysis.extractedMedications.length === 0 && !analysis.interpretation && (
                     <div className="text-center text-muted-foreground py-10">
                        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold">No Data Extracted</h3>
                        <p className="text-sm mt-1">The AI couldn't find structured data to extract from this document.</p>
                    </div>
               )}
            </div>
          ) : (
             <div className="text-center text-muted-foreground py-20">
                <FlaskConical className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold">Analysis will appear here</h3>
                <p className="text-sm mt-1">Upload a document and click "Analyze" to get started.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
