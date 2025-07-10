import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TopicWithPrompts {
  name: string;
  description: string;
  prompts: string[];
}

interface CompetitorSuggestion {
  name: string;
  url: string;
  category: string;
  validated: boolean;
}

interface GenerationSettings {
  promptsPerTopic: number;
  numberOfTopics: number;
  diversityThreshold: number; // Minimum % difference between prompts
}

export default function PromptGeneratorPage() {
  const { toast } = useToast();
  
  // State management with localStorage persistence
  const [brandUrl, setBrandUrl] = useState("");
  const [competitors, setCompetitors] = useState<CompetitorSuggestion[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>({
    promptsPerTopic: 10,
    numberOfTopics: 5,
    diversityThreshold: 50
  });
  const [generatedTopics, setGeneratedTopics] = useState<TopicWithPrompts[]>([]);
  const [currentStep, setCurrentStep] = useState<'url' | 'competitors' | 'settings' | 'topics' | 'ready'>('url');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [customTopicName, setCustomTopicName] = useState('');
  const [customTopicDescription, setCustomTopicDescription] = useState('');
  const [isAddingCustomTopic, setIsAddingCustomTopic] = useState(false);

  // Load saved state on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('promptGeneratorState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const hasData = parsed.brandUrl || parsed.competitors?.length > 0 || parsed.generatedTopics?.length > 0;
        
        if (hasData) {
          setBrandUrl(parsed.brandUrl || "");
          setCompetitors(parsed.competitors || []);
          setSettings(parsed.settings || {
            promptsPerTopic: 10,
            numberOfTopics: 5,
            diversityThreshold: 50
          });
          setGeneratedTopics(parsed.generatedTopics || []);
          setCurrentStep(parsed.currentStep || 'url');
          
          toast({
            title: "Previous session restored",
            description: "Your last prompt generation session has been loaded",
          });
        }
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      brandUrl,
      competitors,
      settings,
      generatedTopics,
      currentStep
    };
    localStorage.setItem('promptGeneratorState', JSON.stringify(stateToSave));
  }, [brandUrl, competitors, settings, generatedTopics, currentStep]);

  // Analyze brand URL and suggest competitors
  const analyzeUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      console.log(`[${new Date().toISOString()}] analyzeUrlMutation.mutationFn called with URL: ${url}`);
      const response = await apiRequest('POST', `/api/analyze-brand`, { url });
      console.log(`[${new Date().toISOString()}] analyzeUrlMutation response received`);
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log(`[${new Date().toISOString()}] analyzeUrlMutation onSuccess called with data:`, data);
      setCompetitors(data.competitors.map((comp: any) => ({ ...comp, validated: true })));
      setCurrentStep('competitors');
      toast({
        title: "Brand analyzed",
        description: `Found ${data.competitors.length} competitors (auto-validated)`,
      });
    },
    onError: (error: any) => {
      console.error(`[${new Date().toISOString()}] analyzeUrlMutation onError called:`, error);
      toast({
        title: "Analysis failed",
        description: "Unable to analyze the brand URL. Please check the URL and try again.",
        variant: "destructive",
      });
    }
  });

  // Generate topics and prompts
  const generatePromptsMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setGenerationProgress(0);
      
      const response = await apiRequest('POST', `/api/generate-prompts`, {
        brandUrl,
        competitors: competitors.filter(c => c.validated),
        settings
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setGeneratedTopics(data.topics);
      setCurrentStep('topics');
      setIsGenerating(false);
      toast({
        title: "Prompts generated",
        description: `Created ${data.topics.length} topics with diverse prompts`,
      });
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Generation failed",
        description: "Unable to generate prompts. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Save prompts and run analysis
  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/save-and-analyze`, { topics: generatedTopics });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analysis/progress'] });
      toast({
        title: "Analysis started",
        description: "New prompts saved and analysis is running",
      });
      setCurrentStep('ready');
    }
  });

  const handleAnalyzeBrand = () => {
    console.log(`[${new Date().toISOString()}] handleAnalyzeBrand called with URL: ${brandUrl}`);
    if (!brandUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a brand URL to analyze",
        variant: "destructive",
      });
      return;
    }
    console.log(`[${new Date().toISOString()}] Starting brand analysis for: ${brandUrl}`);
    analyzeUrlMutation.mutate(brandUrl);
  };



  const addCustomCompetitor = () => {
    setCompetitors(prev => [...prev, {
      name: "",
      url: "",
      category: "Custom",
      validated: true
    }]);
  };

  const updateCompetitor = (index: number, field: keyof CompetitorSuggestion, value: string) => {
    setCompetitors(prev => prev.map((comp, i) => 
      i === index ? { ...comp, [field]: value } : comp
    ));
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomTopic = async () => {
    if (!customTopicName.trim() || !customTopicDescription.trim()) {
      toast({
        title: "Topic details required",
        description: "Please provide both topic name and description",
        variant: "destructive",
      });
      return;
    }

    setIsAddingCustomTopic(true);
    try {
      const response = await apiRequest('POST', '/api/generate-topic-prompts', {
        topicName: customTopicName,
        topicDescription: customTopicDescription,
        competitors: competitors.filter(c => c.validated),
        promptCount: settings.promptsPerTopic
      });
      const data = await response.json();
      
      const newTopic: TopicWithPrompts = {
        name: customTopicName,
        description: customTopicDescription,
        prompts: data.prompts
      };
      
      setGeneratedTopics(prev => [...prev, newTopic]);
      setCustomTopicName('');
      setCustomTopicDescription('');
      
      toast({
        title: "Topic added",
        description: `Created ${data.prompts.length} prompts for "${customTopicName}"`,
      });
    } catch (error) {
      toast({
        title: "Failed to add topic",
        description: "Unable to generate prompts for custom topic",
        variant: "destructive",
      });
    } finally {
      setIsAddingCustomTopic(false);
    }
  };

  const proceedToSettings = () => {
    const validCompetitors = competitors.filter(c => c.name.trim());
    if (validCompetitors.length === 0) {
      toast({
        title: "Competitors required",
        description: "Please add at least one competitor",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('settings');
  };

  const startOver = async () => {
    try {
      console.log(`[${new Date().toISOString()}] Starting over - clearing database...`);
      const response = await apiRequest('POST', '/api/data/clear', { type: 'all' });
      const result = await response.json();
      console.log(`[${new Date().toISOString()}] Database cleared:`, result);
      
      localStorage.removeItem('promptGeneratorState');
      setBrandUrl("");
      setCompetitors([]);
      setSettings({
        promptsPerTopic: 10,
        numberOfTopics: 5,
        diversityThreshold: 50
      });
      setGeneratedTopics([]);
      setCurrentStep('url');
      setIsGenerating(false);
      setGenerationProgress(0);
      setCustomTopicName('');
      setCustomTopicDescription('');
      setIsAddingCustomTopic(false);
      toast({
        title: "Reset complete",
        description: "All data cleared and starting fresh",
      });
    } catch (error) {
      console.error('Failed to clear database:', error);
      toast({
        title: "Reset failed",
        description: "Failed to clear database data",
        variant: "destructive",
      });
    }
  };

  const navigateToStep = (step: 'url' | 'competitors' | 'settings' | 'topics' | 'ready') => {
    setCurrentStep(step);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prompt Generator</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={startOver}>
            Start Over
          </Button>
        </div>
      </div>

      {/* Progress Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button 
                variant={currentStep === 'url' ? "default" : "outline"} 
                size="sm"
                onClick={() => navigateToStep('url')}
              >
                1. Brand URL
              </Button>
              <Button 
                variant={currentStep === 'competitors' ? "default" : "outline"} 
                size="sm"
                onClick={() => navigateToStep('competitors')}
                disabled={!brandUrl}
              >
                2. Competitors
              </Button>
              <Button 
                variant={currentStep === 'settings' ? "default" : "outline"} 
                size="sm"
                onClick={() => navigateToStep('settings')}
                disabled={competitors.length === 0}
              >
                3. Settings
              </Button>
              <Button 
                variant={currentStep === 'topics' ? "default" : "outline"} 
                size="sm"
                onClick={() => navigateToStep('topics')}
                disabled={generatedTopics.length === 0}
              >
                4. Review
              </Button>
              <Button 
                variant={currentStep === 'ready' ? "default" : "outline"} 
                size="sm"
                onClick={() => navigateToStep('ready')}
                disabled={currentStep !== 'ready'}
              >
                5. Complete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Progress indicator */}
      <div className="flex items-center space-x-4">
        {['url', 'competitors', 'settings', 'topics', 'ready'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === step ? 'bg-blue-600 text-white' :
              ['url', 'competitors', 'settings', 'topics'].indexOf(currentStep) > index ? 'bg-green-600 text-white' :
              'bg-gray-200 text-gray-600'
            }`}>
              {['url', 'competitors', 'settings', 'topics'].indexOf(currentStep) > index ? 
                <CheckCircle className="h-4 w-4" /> : index + 1
              }
            </div>
            {index < 4 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Brand URL */}
      {currentStep === 'url' && (
        <Card>
          <CardHeader>
            <CardTitle>Brand Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="brandUrl">Brand Website URL</Label>
              <Input
                id="brandUrl"
                placeholder="https://yourbrand.com"
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleAnalyzeBrand}
              disabled={analyzeUrlMutation.isPending}
              className="w-full"
            >
              {analyzeUrlMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Brand...
                </>
              ) : (
                'Analyze Brand & Find Competitors'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Competitor Validation */}
      {currentStep === 'competitors' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Competitors</CardTitle>
            <p className="text-sm text-gray-600">
              Review the suggested competitors. Remove any irrelevant ones or add custom competitors.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {competitors.map((competitor, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg bg-green-50">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Competitor name"
                    value={competitor.name}
                    onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="Competitor URL"
                    value={competitor.url}
                    onChange={(e) => updateCompetitor(index, 'url', e.target.value)}
                  />
                </div>
                <Badge variant="default" className="bg-green-600">
                  {competitor.category}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCompetitor(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={addCustomCompetitor}>
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Competitor
              </Button>
              <Button onClick={proceedToSettings} className="flex-1">
                Continue to Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generation Settings */}
      {currentStep === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Prompt Generation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="promptsPerTopic">Prompts per Topic</Label>
                <Input
                  id="promptsPerTopic"
                  type="number"
                  min="5"
                  max="50"
                  value={settings.promptsPerTopic}
                  onChange={(e) => setSettings(prev => ({ ...prev, promptsPerTopic: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="numberOfTopics">Number of Topics</Label>
                <Input
                  id="numberOfTopics"
                  type="number"
                  min="3"
                  max="10"
                  value={settings.numberOfTopics}
                  onChange={(e) => setSettings(prev => ({ ...prev, numberOfTopics: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="diversityThreshold">Diversity Threshold (%)</Label>
                <Input
                  id="diversityThreshold"
                  type="number"
                  min="30"
                  max="80"
                  value={settings.diversityThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, diversityThreshold: parseInt(e.target.value) || 50 }))}
                />
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Generation Summary</h4>
              <p className="text-sm text-blue-800">
                Will generate <strong>{settings.numberOfTopics} topics</strong> with{' '}
                <strong>{settings.promptsPerTopic} prompts each</strong> ({settings.numberOfTopics * settings.promptsPerTopic} total).
                Prompts will differ by at least <strong>{settings.diversityThreshold}%</strong> in word content.
              </p>
            </div>
            <Button 
              onClick={() => generatePromptsMutation.mutate()}
              disabled={generatePromptsMutation.isPending}
              className="w-full"
            >
              {generatePromptsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Prompts...
                </>
              ) : (
                'Generate Topics & Prompts'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating prompts...</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Topic & Prompt Review */}
      {currentStep === 'topics' && generatedTopics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Review Generated Topics & Prompts</h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={() => generatePromptsMutation.mutate()}
                disabled={generatePromptsMutation.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button 
                onClick={() => runAnalysisMutation.mutate()}
                disabled={runAnalysisMutation.isPending}
              >
                {runAnalysisMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Analysis...
                  </>
                ) : (
                  'Run Analysis with These Prompts'
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedTopics.map((topic, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{topic.name}</CardTitle>
                  <p className="text-sm text-gray-600">{topic.description}</p>
                  <Badge variant="secondary">{topic.prompts.length} prompts</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Sample Prompts:</h4>
                    <div className="space-y-1">
                      {topic.prompts.slice(0, 3).map((prompt, pIndex) => (
                        <p key={pIndex} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                          "{prompt}"
                        </p>
                      ))}
                      {topic.prompts.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{topic.prompts.length - 3} more prompts...
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add Custom Topic Card */}
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Plus className="h-8 w-8 text-gray-400 mx-auto" />
                  <div className="space-y-3">
                    <Input
                      placeholder="Topic name (e.g., API Management)"
                      value={customTopicName}
                      onChange={(e) => setCustomTopicName(e.target.value)}
                    />
                    <Input
                      placeholder="Topic description"
                      value={customTopicDescription}
                      onChange={(e) => setCustomTopicDescription(e.target.value)}
                    />
                    <Button 
                      onClick={addCustomTopic}
                      disabled={isAddingCustomTopic}
                      className="w-full"
                    >
                      {isAddingCustomTopic ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Prompts...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Custom Topic
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 5: Ready State */}
      {currentStep === 'ready' && (
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analysis Started!</h3>
            <p className="text-gray-600 mb-4">
              Your new prompts have been saved and the analysis is now running with the diverse, weighted prompts.
            </p>
            <Button onClick={() => window.location.href = '/analysis-progress'}>
              View Analysis Progress
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}