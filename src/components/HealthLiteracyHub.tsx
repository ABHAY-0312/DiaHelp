
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Lightbulb, GraduationCap, CheckCircle2, XCircle, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import type { QuizAttempt } from '@/lib/types';
import { saveQuizAttempt, getQuizHistory } from '@/lib/firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { GenerateQuizOutput, GenerateQuizInput } from '@/app/api/generate-quiz/route';

const healthTopics = [
    { value: 'Blood Sugar', label: 'Blood Sugar Basics' },
    { value: 'Carbohydrates', label: 'Understanding Carbohydrates' },
    { value: 'Insulin', label: 'The Role of Insulin' },
    { value: 'BMI', label: 'Body Mass Index (BMI)' },
    { value: 'Healthy Fats', label: 'Healthy vs. Unhealthy Fats' },
    { value: 'Glycemic Index', label: 'Glycemic Index' },
];

export function HealthLiteracyHub() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
    const [quizData, setQuizData] = useState<GenerateQuizOutput | null>(null);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
    const [showResults, setShowResults] = useState(false);
    
    const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setIsHistoryLoading(true);
        try {
            const history = await getQuizHistory(user.uid);
            setQuizHistory(history);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quiz history.' });
        } finally {
            setIsHistoryLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleGenerateQuiz = async () => {
        if (!selectedTopic) {
            toast({ variant: 'destructive', title: 'No Topic Selected', description: 'Please choose a topic to start a quiz.' });
            return;
        }
        setIsLoadingQuiz(true);
        setQuizData(null);
        setShowResults(false);
        try {
            const quizInput: GenerateQuizInput = { topic: selectedTopic };
            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quizInput),
            });
            if (!response.ok) {
              throw new Error(await response.text());
            }

            const quiz: GenerateQuizOutput = await response.json();
            setQuizData(quiz);
            setUserAnswers(new Array(quiz.questions.length).fill(null));
        } catch (error: any) {
            console.error('Quiz generation error:', error);
            const errorMessage = error.message || "";
            if (errorMessage.includes("429")) {
                toast({
                    variant: "destructive",
                    title: "AI Service Rate Limited",
                    description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow. For more information, visit ai.google.dev/gemini-api/docs/rate-limits.",
                });
            } else {
                 toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate the quiz. Please try again.' });
            }
        } finally {
            setIsLoadingQuiz(false);
        }
    };

    const handleSubmitQuiz = async () => {
        if (!quizData || !user) return;
        const score = quizData.questions.reduce((correct, q, i) => (userAnswers[i] === q.correctAnswer ? correct + 1 : correct), 0);
        setShowResults(true);
        try {
            await saveQuizAttempt(user.uid, {
                topic: quizData.topic,
                score,
                totalQuestions: quizData.questions.length,
            });
            fetchHistory(); // Refresh history after saving
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not save your quiz attempt.' });
        }
    };

    const healthIQ = useMemo(() => {
        if (quizHistory.length === 0) return 0;
        const totalScore = quizHistory.reduce((sum, item) => sum + item.score, 0);
        const totalQuestions = quizHistory.reduce((sum, item) => sum + item.totalQuestions, 0);
        return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    }, [quizHistory]);
    
    const chartData = useMemo(() => {
        const topicData: {[key: string]: { score: number, total: number }} = {};
        quizHistory.forEach(attempt => {
            if (!topicData[attempt.topic]) {
                topicData[attempt.topic] = { score: 0, total: 0 };
            }
            topicData[attempt.topic].score += attempt.score;
            topicData[attempt.topic].total += attempt.totalQuestions;
        });
        return Object.entries(topicData).map(([name, data]) => ({
            name,
            score: Math.round((data.score / data.total) * 100),
        }));
    }, [quizHistory]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl"><GraduationCap className="w-8 h-8 text-primary" /></div>
                            <div>
                                <CardTitle className="text-2xl">Health Literacy Quiz</CardTitle>
                                <CardDescription>Boost your health knowledge. Select a topic and start a quiz!</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                            <SelectTrigger><SelectValue placeholder="Choose a health topic..." /></SelectTrigger>
                            <SelectContent>
                                {healthTopics.map(topic => <SelectItem key={topic.value} value={topic.value}>{topic.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateQuiz} disabled={isLoadingQuiz || !selectedTopic}>
                            {isLoadingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Start New Quiz
                        </Button>
                    </CardContent>
                </Card>

                {isLoadingQuiz && <Skeleton className="h-96 w-full" />}
                
                {quizData && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">{quizData.topic} Quiz</CardTitle>
                            <Card className="p-4 bg-secondary/50 mt-2">
                                <CardTitle className="text-base flex items-center gap-2 mb-2"><Lightbulb className="text-primary"/> Micro-Lesson</CardTitle>
                                <CardDescription>{quizData.microLesson}</CardDescription>
                            </Card>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {quizData.questions.map((q, qIndex) => (
                                <div key={qIndex} className={cn("p-4 rounded-lg border", showResults && (userAnswers[qIndex] === q.correctAnswer ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'))}>
                                    <p className="font-semibold mb-2">{qIndex + 1}. {q.question}</p>
                                    <RadioGroup
                                        value={userAnswers[qIndex] ?? undefined}
                                        onValueChange={(value) => {
                                            const newAnswers = [...userAnswers];
                                            newAnswers[qIndex] = value;
                                            setUserAnswers(newAnswers);
                                        }}
                                        disabled={showResults}
                                    >
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center space-x-2">
                                                <RadioGroupItem value={opt} id={`q${qIndex}o${oIndex}`} />
                                                <Label htmlFor={`q${qIndex}o${oIndex}`}>{opt}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                    {showResults && (
                                        <div className="mt-3 p-3 text-sm rounded-md bg-background">
                                            {userAnswers[qIndex] === q.correctAnswer ? (
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <p><strong>Correct!</strong> {q.explanation}</p>
                                                </div>
                                            ) : (
                                                <div className="text-red-600 space-y-1">
                                                    <div className="flex items-center gap-2"><XCircle className="h-4 w-4" /> <p><strong>Incorrect.</strong></p></div>
                                                    <p>The correct answer is <strong>{q.correctAnswer}</strong>. {q.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {!showResults && (
                                <Button className="w-full" onClick={handleSubmitQuiz} disabled={userAnswers.some(a => a === null)}>Submit Quiz</Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            <Card className="sticky top-6">
                <CardHeader>
                    <CardTitle>Your Health IQ</CardTitle>
                    <CardDescription>An overall score based on your quiz performance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center">
                        <p className="text-6xl font-bold text-primary">{healthIQ}</p>
                        <p className="text-muted-foreground">Overall Score</p>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2 text-center text-sm flex items-center justify-center gap-2"><BarChart2 className="w-4 h-4"/> Performance by Topic</h4>
                         {isHistoryLoading ? <Skeleton className="h-56 w-full" /> : quizHistory.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm p-4">Complete a quiz to see your topic scores.</p>
                         ) : (
                             <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 25 }}>
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} fontSize={10} />
                                        <Tooltip cursor={{fill: 'hsl(var(--secondary))'}} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))"}} />
                                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                          {chartData.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.score > 75 ? 'hsl(var(--primary))' : entry.score > 40 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'} />
                                          ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                         )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
