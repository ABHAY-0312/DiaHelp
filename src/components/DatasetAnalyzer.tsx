

"use client";

import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Database, BarChart, AlertCircle, PieChartIcon, RotateCw } from 'lucide-react';
import { healthFormSchema, type HealthFormData, type BatchPredictionResult } from '@/lib/types';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { Slider } from './ui/slider';

interface DatasetAnalyzerProps {
    onCalculateRisk: (data: Partial<HealthFormData>) => { riskScore: number; shapValues: { name: string; value: number }[] };
}

const requiredColumns = ["age", "glucose", "bmi", "bloodPressure"];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="p-2 bg-background border border-border rounded-lg shadow-lg text-sm">
                <p className="font-bold text-primary">{`Risk Score: ${Math.round(data.riskScore)}`}</p>
                <p>{`Age: ${data.age}`}</p>
                <p>{`Glucose: ${data.glucose}`}</p>
                <p>{`BMI: ${data.bmi}`}</p>
            </div>
        );
    }
    return null;
};

const RiskScatterPlot = ({ data, xKey, yKey, name }: { data: BatchPredictionResult[], xKey: keyof BatchPredictionResult, yKey: keyof BatchPredictionResult, name: string }) => {
    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey={xKey} name={xKey} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="number" dataKey={yKey} name={yKey} stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Legend />
                    <Scatter name={name} data={data} fill="hsl(var(--primary))" />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};

const FilterSlider = ({ label, range, setRange, min, max, step }: { label: string, range: [number, number], setRange: (val: [number, number]) => void, min: number, max: number, step: number }) => (
    <div>
        <div className="flex justify-between items-center mb-2">
            <Label htmlFor={`${label}-slider`} className="font-semibold text-sm">{label}</Label>
            <span className="px-2 py-1 text-xs font-mono rounded-md bg-primary/10 text-primary font-bold">
                {range[0]} - {range[1]}
            </span>
        </div>
        <Slider
            id={`${label}-slider`}
            value={range}
            onValueChange={(value) => setRange(value as [number, number])}
            min={min}
            max={max}
            step={step}
        />
    </div>
);


export function DatasetAnalyzer({ onCalculateRisk }: DatasetAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BatchPredictionResult[] | null>(null);

  // Filter states
  const [riskRange, setRiskRange] = useState<[number, number]>([0, 100]);
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 120]);
  const [bmiRange, setBmiRange] = useState<[number, number]>([0, 70]);
  const [glucoseRange, setGlucoseRange] = useState<[number, number]>([0, 300]);

  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: "destructive", title: "File Too Large", description: "Please select a CSV file smaller than 5MB." });
            return;
        }
        if (selectedFile.type !== "text/csv") {
            toast({ variant: "destructive", title: "Invalid File Type", description: "Please select a valid .csv file." });
            return;
        }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleAnalyzeClick = () => {
    if (!file) {
      toast({ variant: "destructive", title: "No File Selected", description: "Please select a CSV file to analyze." });
      return;
    }

    setIsLoading(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => {
        const { data, errors, meta } = result;
        if (errors.length > 0) {
            toast({ variant: "destructive", title: "CSV Parsing Error", description: `Error on row ${errors[0].row}: ${errors[0].message}` });
            setIsLoading(false);
            return;
        }

        const headers = meta.fields;
        if (!headers || !requiredColumns.every(col => headers.includes(col))) {
            toast({ variant: "destructive", title: "Invalid CSV Format", description: `CSV must contain the following columns: ${requiredColumns.join(', ')}.`});
            setIsLoading(false);
            return;
        }
        
        if (data.length > 5000) {
            toast({ variant: "destructive", title: "Dataset Too Large", description: `The dataset cannot exceed 5000 rows.`});
            setIsLoading(false);
            return;
        }

        try {
            const predictions = data.map((row: any) => {
                const parsedRow = healthFormSchema.partial().parse(row);
                const { riskScore, shapValues } = onCalculateRisk(parsedRow);
                return { 
                    riskScore, 
                    glucose: parsedRow.glucose || 0, 
                    bmi: parsedRow.bmi || 0, 
                    age: parsedRow.age || 0,
                    shapValues
                };
            });
            setResults(predictions);
        } catch (error: any) {
             const errorMessage = error.message || "";
             if (errorMessage.includes("429")) {
                  toast({
                     variant: "destructive",
                     title: "AI Service Rate Limited",
                     description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow. For more information, visit ai.google.dev/gemini-api/docs/rate-limits.",
                 });
             } else {
                toast({ variant: "destructive", title: "Validation Error", description: error.errors[0]?.message || "A row in your CSV has invalid data."});
             }
        } finally {
            setIsLoading(false);
        }
      },
      error: () => {
          toast({ variant: "destructive", title: "Parsing Error", description: "Could not parse the CSV file." });
          setIsLoading(false);
      }
    });
  };
  
   const filteredResults = useMemo(() => {
    if (!results) return null;
    return results.filter(r => 
        r.riskScore >= riskRange[0] && r.riskScore <= riskRange[1] &&
        r.age >= ageRange[0] && r.age <= ageRange[1] &&
        r.bmi >= bmiRange[0] && r.bmi <= bmiRange[1] &&
        r.glucose >= glucoseRange[0] && r.glucose <= glucoseRange[1]
    );
  }, [results, riskRange, ageRange, bmiRange, glucoseRange]);


  const summary = filteredResults ? {
      total: filteredResults.length,
      highRisk: filteredResults.filter(r => r.riskScore > 70).length,
      averageScore: filteredResults.length > 0 ? Math.round(filteredResults.reduce((acc, r) => acc + r.riskScore, 0) / filteredResults.length) : 0,
  } : null;
  
  const topFactorsData = useMemo(() => {
    if (!filteredResults) return [];
    
    const factorMap = new Map<string, number>();
    
    filteredResults.forEach(result => {
        result.shapValues
            .filter(shap => shap.name !== 'Baseline' && shap.name !== 'Glucose x BMI' && shap.name !== 'Age x BP')
            .forEach(shap => {
                const positiveImpact = Math.max(0, shap.value);
                factorMap.set(shap.name, (factorMap.get(shap.name) || 0) + positiveImpact);
            });
    });

    const sortedFactors = Array.from(factorMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
        
    return sortedFactors.slice(0, 5);
  }, [filteredResults]);

  const resetFilters = () => {
      setRiskRange([0, 100]);
      setAgeRange([0, 120]);
      setBmiRange([0, 70]);
      setGlucoseRange([0, 300]);
  }

  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#3b82f6", "#f97316", "#10b981"];

  return (
    <div className="space-y-8">
      <Card className="shadow-lg border-primary/20">
        <CardHeader>
           <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
                <Database className="w-8 h-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-2xl">Dataset Analyzer</CardTitle>
                <CardDescription>Upload a CSV file to get batch risk predictions and insights.</CardDescription>
            </div>
           </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Upload CSV File (Max 5MB, 5000 rows)</Label>
            <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} />
             <p className="text-xs text-muted-foreground">Required columns: {requiredColumns.join(', ')}. Other columns from the Health Profile form are optional.</p>
          </div>
          <Button onClick={handleAnalyzeClick} disabled={isLoading || !file} size="lg" className="w-full font-bold">
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Analyzing...</> : <><Upload className="mr-2 h-4 w-4"/> Analyze Dataset</>}
          </Button>
        </CardContent>
      </Card>
      
      {isLoading && (
          <div className="text-center p-12"><Loader2 className="w-12 h-12 text-primary animate-spin mx-auto"/> <p className="mt-4 text-muted-foreground">Processing dataset...</p></div>
      )}

      {filteredResults && summary && (
        <Card className="shadow-lg border-primary/20">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <BarChart className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Analysis Results</CardTitle>
                        <CardDescription>Interactive dashboard for the uploaded dataset.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <Card className="p-4 bg-muted/30">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold">Interactive Filters</h4>
                        <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCw className="mr-2 h-4 w-4"/> Reset Filters</Button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FilterSlider label="Risk Score" range={riskRange} setRange={setRiskRange} min={0} max={100} step={1} />
                        <FilterSlider label="Age" range={ageRange} setRange={setAgeRange} min={0} max={120} step={1} />
                        <FilterSlider label="BMI" range={bmiRange} setRange={setBmiRange} min={0} max={70} step={1} />
                        <FilterSlider label="Glucose" range={glucoseRange} setRange={setGlucoseRange} min={0} max={300} step={5} />
                     </div>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <Card className="p-4 bg-secondary">
                        <p className="text-sm text-muted-foreground">Filtered Records</p>
                        <p className="text-3xl font-bold">{summary.total}</p>
                    </Card>
                     <Card className="p-4 bg-secondary">
                        <p className="text-sm text-muted-foreground">Average Risk Score</p>
                        <p className="text-3xl font-bold">{summary.averageScore}</p>
                    </Card>
                     <Card className="p-4 bg-destructive/10 border-destructive">
                        <p className="text-sm text-destructive/80">High-Risk Predictions</p>
                        <p className="text-3xl font-bold text-destructive">{summary.highRisk}</p>
                    </Card>
                </div>

                {filteredResults.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                         <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold">No Data Found</h3>
                        <p>No records match the current filter settings. Try adjusting or resetting the filters.</p>
                    </div>
                ) : (
                    <div className='grid grid-cols-1 xl:grid-cols-2 gap-8'>
                        <div>
                             <h4 className="text-lg font-semibold mb-2 text-center">Glucose vs. Risk Score</h4>
                             <RiskScatterPlot data={filteredResults} xKey="glucose" yKey="riskScore" name="Glucose vs. Risk" />
                        </div>
                         <div>
                            <h4 className="text-lg font-semibold mb-2 text-center">BMI vs. Risk Score</h4>
                             <RiskScatterPlot data={filteredResults} xKey="bmi" yKey="riskScore" name="BMI vs. Risk" />
                        </div>
                        <div className="xl:col-span-2">
                             <div className="flex items-center justify-center gap-2 mb-2">
                                <PieChartIcon className="w-5 h-5"/>
                                <h4 className="text-lg font-semibold text-center">Top 5 Risk Factors by Impact</h4>
                            </div>
                            <div className="w-full h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={topFactorsData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                                return (
                                                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                                                    {`${(percent * 100).toFixed(0)}%`}
                                                </text>
                                                );
                                            }}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                        >
                                            {topFactorsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value, name) => [value.toFixed(2), name]} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      )}

      {!isLoading && !results && (
        <div className="text-center text-muted-foreground py-20 border-2 border-dashed rounded-lg">
            <BarChart className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold">Awaiting Data</h3>
            <p className="text-sm mt-1">Upload a CSV file to see your dataset analysis.</p>
        </div>
      )}
    </div>
  );
}
