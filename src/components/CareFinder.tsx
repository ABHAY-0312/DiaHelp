
"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Hospital, AlertTriangle, Phone, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import type { FindHospitalsOutput } from '@/app/api/find-hospitals/route';

export function CareFinder() {
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FindHospitalsOutput | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!location.trim()) {
      toast({
        variant: 'destructive',
        title: 'Location Required',
        description: 'Please enter a location to search.',
      });
      return;
    }
    setIsLoading(true);
    setResults(null);
    try {
      const response = await fetch('/api/find-hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const responseData: FindHospitalsOutput = await response.json();
      setResults(responseData);

       if (responseData.hospitals.length === 0) {
           toast({
               title: "No Hospitals Found",
               description: "The AI couldn't find hospitals for that location. Please try a broader search (e.g., 'County, State')."
           })
       }
    } catch (error: any) {
      console.error('Care finder error:', error);
       const errorMessage = error.message || "";
       if (errorMessage.includes("429")) {
            toast({
                variant: "destructive",
                title: "AI Service Rate Limited",
                description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow. For more information, visit ai.google.dev/gemini-api/docs/rate-limits.",
            });
       } else {
            toast({
                variant: 'destructive',
                title: 'Search Failed',
                description: 'Could not complete the search. Please try again later.',
            });
       }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Hospital className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Care Finder</CardTitle>
              <CardDescription>
                Find hospitals and medical centers near you. Enter a city, county, or state.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Your Location</Label>
            <div className="flex gap-2">
                <Input
                id="location"
                placeholder="e.g., Mumbai, Maharashtra"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Search
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isLoading && <ResultsSkeleton />}

      {results && (
        <Card>
            <CardHeader>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important Disclaimer</AlertTitle>
                    <AlertDescription>{results.disclaimer}</AlertDescription>
                </Alert>
            </CardHeader>
            <CardContent className="space-y-4">
                {results.hospitals.length > 0 ? (
                    results.hospitals.map((hospital, index) => (
                        <Card key={index} className="p-4 bg-secondary/50">
                           <CardTitle className="text-xl text-primary">{hospital.name}</CardTitle>
                           <div className="text-sm text-muted-foreground mt-2 space-y-1">
                             <p className="flex items-center gap-2"><MapPin className="w-4 h-4"/> {hospital.address}</p>
                             <p className="flex items-center gap-2"><Phone className="w-4 h-4"/> {hospital.phone}</p>
                           </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <Hospital className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold">No Results Found</h3>
                        <p className="text-sm mt-1">Try searching for a different or broader location.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      )}

    </div>
  );
}

const ResultsSkeleton = () => (
    <Card>
        <CardHeader>
             <Skeleton className="h-12 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </CardContent>
    </Card>
)
