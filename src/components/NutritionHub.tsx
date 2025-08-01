
"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Bot, ChefHat, Salad } from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Switch } from './ui/switch';
import type { GenerateMealPlanInput, GenerateMealPlanOutput } from '@/app/api/generate-meal-plan/route';
import type { FindRecipesInput, FindRecipesOutput } from '@/app/api/find-recipes/route';
import type { ModerateTextOutput } from '@/app/api/moderate-text/route';

interface NutritionHubProps {
  latestResult: AnalysisResult | null;
}

export function NutritionHub({ latestResult }: NutritionHubProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Salad className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Nutrition Hub</h1>
          <p className="text-muted-foreground">AI-powered tools to help you eat healthier.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <MealPlanGenerator latestResult={latestResult} />
        <RecipeFinder />
      </div>
    </div>
  );
}

function MealPlanGenerator({ latestResult }: { latestResult: AnalysisResult | null }) {
  const [preferences, setPreferences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<GenerateMealPlanOutput | null>(null);
  const { toast } = useToast();

  const handleGeneratePlan = async () => {
    if (!latestResult) {
      toast({
        variant: 'destructive',
        title: 'No Health Data',
        description: 'Please complete a risk assessment on the dashboard first.',
      });
      return;
    }
    setIsLoading(true);
    setMealPlan(null);

    try {
       if (preferences) {
        const moderationResponse = await fetch('/api/moderate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textToCheck: preferences }),
        });
        const moderationResult: ModerateTextOutput = await moderationResponse.json();
        if (!moderationResult.isAppropriate) {
          toast({
            variant: "destructive",
            title: "Inappropriate Content Detected",
            description: "Please keep your language respectful in the preferences field.",
          });
          setIsLoading(false);
          return;
        }
      }

      const planInput: GenerateMealPlanInput = {
        riskScore: latestResult.riskScore,
        keyFactors: latestResult.keyFactors.map((f) => f.name),
        preferences: preferences,
      };

      const response = await fetch('/api/generate-meal-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planInput),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const plan: GenerateMealPlanOutput = await response.json();
      setMealPlan(plan);
    } catch (error: any) {
      console.error('Meal plan error:', error);
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
              description: "The meal plan generator is currently experiencing high demand. Please try again in a moment.",
          });
      } else {
           toast({
              variant: 'destructive',
              title: 'Generation Failed',
              description: 'Could not generate a meal plan. Please try again.',
           });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const MealCard = ({ title, meal }: { title: string; meal: { name: string; description: string } }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <h4 className="font-semibold text-primary">{meal.name}</h4>
        <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot /> Personalized Meal Plan
        </CardTitle>
        <CardDescription>
          Generate a 1-day sample meal plan based on your latest health assessment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="preferences">Dietary Preferences (Optional)</Label>
          <Textarea
            id="preferences"
            placeholder="e.g., vegetarian, gluten-free, no seafood"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
          />
        </div>
        <Button onClick={handleGeneratePlan} disabled={isLoading || !latestResult} className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate My Plan
        </Button>
        {!latestResult && (
          <p className="text-sm text-center text-destructive">
            Please complete a risk assessment on the dashboard to enable this feature.
          </p>
        )}
      </CardContent>

      {isLoading && <MealPlanSkeleton />}
      
      {mealPlan && (
        <CardContent className="space-y-4">
          <Card className="bg-primary/5">
            <CardHeader>
                <CardTitle className="text-lg">Nutritionist's Note</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-primary/90 font-medium">{mealPlan.summary}</p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MealCard title="Breakfast" meal={mealPlan.breakfast} />
            <MealCard title="Lunch" meal={mealPlan.lunch} />
            <MealCard title="Dinner" meal={mealPlan.dinner} />
            <MealCard title="Snack" meal={mealPlan.snack} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}


function RecipeFinder() {
  const [ingredients, setIngredients] = useState('');
  const [dietaryNeeds, setDietaryNeeds] = useState('');
  const [translateToHindi, setTranslateToHindi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recipes, setRecipes] = useState<FindRecipesOutput | null>(null);
  const { toast } = useToast();

  const handleFindRecipes = async () => {
    if (!ingredients) {
      toast({
        variant: 'destructive',
        title: 'No Ingredients',
        description: 'Please list some ingredients you have.',
      });
      return;
    }
    setIsLoading(true);
    setRecipes(null);
    try {
      const recipeInput: FindRecipesInput = { ingredients, dietaryNeeds, translateToHindi };
      const response = await fetch('/api/find-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeInput),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result: FindRecipesOutput = await response.json();
      setRecipes(result);
    } catch (error: any) {
      console.error('Recipe finder error:', error);
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
              description: "The recipe finder is currently experiencing high demand. Please try again in a moment.",
          });
      } else {
          toast({
            variant: 'destructive',
            title: 'Search Failed',
            description: 'Could not find recipes. Please try again.',
          });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-accent/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat /> Recipe Finder
        </CardTitle>
        <CardDescription>Find healthy, diabetes-friendly recipes with ingredients you already have.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="ingredients">Ingredients You Have</Label>
          <Input
            id="ingredients"
            placeholder="e.g., tofu, broccoli, quinoa"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dietary-needs">Dietary Needs (Optional)</Label>
          <Input
            id="dietary-needs"
            placeholder="e.g., low-carb, vegan"
            value={dietaryNeeds}
            onChange={(e) => setDietaryNeeds(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
            <Switch id="translate-hindi" checked={translateToHindi} onCheckedChange={setTranslateToHindi} />
            <Label htmlFor="translate-hindi">Translate to Hindi (हिंदी में अनुवाद करें)</Label>
        </div>
        <Button onClick={handleFindRecipes} disabled={isLoading} variant="secondary" className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Find Recipes
        </Button>
      </CardContent>

      {isLoading && <RecipeSkeleton />}

      {recipes && recipes.recipes.length > 0 && (
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {recipes.recipes.map((recipe, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-lg font-semibold text-accent hover:no-underline">
                  {recipe.name}
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{recipe.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold">Ingredients:</h5>
                      <ul className="list-disc list-inside text-sm">
                        {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <h5 className="font-semibold">Prep Time:</h5>
                            <p className="text-sm">{recipe.prepTime}</p>
                        </div>
                        <div>
                            <h5 className="font-semibold">Total Calories:</h5>
                            <p className="text-sm">{recipe.totalCalories} kcal (approx.)</p>
                        </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-semibold">Instructions:</h5>
                    <ol className="list-decimal list-inside text-sm space-y-1">
                      {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      )}
       {recipes && recipes.recipes.length === 0 && (
         <CardContent>
            <p className="text-center text-muted-foreground">No recipes found for these ingredients. Try a different combination!</p>
         </CardContent>
       )}
    </Card>
  );
}

const MealPlanSkeleton = () => (
    <CardContent className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    </CardContent>
);

const RecipeSkeleton = () => (
    <CardContent className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
    </CardContent>
)
