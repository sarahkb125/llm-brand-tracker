import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  RefreshCw,
  BarChart3
} from "lucide-react";

interface AnalysisProgress {
  status: 'initializing' | 'scraping' | 'generating_prompts' | 'testing_prompts' | 'analyzing' | 'complete' | 'error';
  message: string;
  progress: number;
  totalPrompts?: number;
  completedPrompts?: number;
}

export default function AnalysisProgressPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [promptsPerTopic, setPromptsPerTopic] = useState(20);
  const [numberOfTopics, setNumberOfTopics] = useState(5);

  const { data: progress, refetch, isLoading } = useQuery<AnalysisProgress>({
    queryKey: ['/api/analysis/progress'],
    refetchInterval: isRunning ? 2000 : false, // Poll every 2 seconds when running
    enabled: true,
  });

  const startAnalysis = async () => {
    try {
      setIsRunning(true);
      const response = await fetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            promptsPerTopic,
            numberOfTopics
          }
        })
      });
      
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setIsRunning(false);
    }
  };

  const cancelAnalysis = async () => {
    try {
      const response = await fetch('/api/analysis/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setIsRunning(false);
        refetch();
      }
    } catch (error) {
      console.error('Failed to cancel analysis:', error);
    }
  };

  useEffect(() => {
    if (progress?.status === 'complete' || progress?.status === 'error') {
      setIsRunning(false);
    } else if (progress?.status === 'initializing' || progress?.status === 'generating_prompts' || progress?.status === 'testing_prompts' || progress?.status === 'analyzing') {
      setIsRunning(true);
    }
  }, [progress]);

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
    
    switch (progress?.status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'initializing':
      case 'scraping':
      case 'generating_prompts':
      case 'testing_prompts':
      case 'analyzing':
        return <Activity className="h-5 w-5 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (progress?.status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Complete</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      case 'initializing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Initializing</Badge>;
      case 'scraping':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scraping Content</Badge>;
      case 'generating_prompts':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Generating Prompts</Badge>;
      case 'testing_prompts':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Testing Prompts</Badge>;
      case 'analyzing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Analyzing Results</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Ready</Badge>;
    }
  };

  const getStageDetails = () => {
    const stages = [
      { 
        key: 'initializing', 
        title: 'Initialization', 
        description: 'Setting up analysis environment',
        completed: ['scraping', 'generating_prompts', 'testing_prompts', 'analyzing', 'complete'].includes(progress?.status || '')
      },
      { 
        key: 'scraping', 
        title: 'Content Scraping', 
        description: 'Analyzing brand content and features',
        completed: ['generating_prompts', 'testing_prompts', 'analyzing', 'complete'].includes(progress?.status || '')
      },
      { 
        key: 'generating_prompts', 
        title: 'Prompt Generation', 
        description: 'Creating test prompts for each topic',
        completed: ['testing_prompts', 'analyzing', 'complete'].includes(progress?.status || '')
      },
      { 
        key: 'testing_prompts', 
        title: 'Response Testing', 
        description: 'Getting AI responses to generated prompts',
        completed: ['analyzing', 'complete'].includes(progress?.status || '')
      },
      { 
        key: 'analyzing', 
        title: 'Analysis & Storage', 
        description: 'Analyzing mentions and storing results',
        completed: ['complete'].includes(progress?.status || '')
      }
    ];

    return stages;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Analysis Progress</h1>
          <p className="text-gray-600">Monitor the current brand tracking analysis</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                Current Status
              </div>
              {getStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{progress?.progress || 0}%</span>
              </div>
              <Progress value={progress?.progress || 0} className="h-2" />
            </div>

            {progress?.message && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">{progress.message}</p>
              </div>
            )}

            {progress?.totalPrompts && progress?.completedPrompts !== undefined && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Prompts:</span>
                  <span className="font-medium ml-2">{progress.totalPrompts}</span>
                </div>
                <div>
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium ml-2">{progress.completedPrompts}</span>
                </div>
              </div>
            )}

            {/* Show historical totals */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Historical Data:</span>
                <button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/counts');
                      const counts = await response.json();
                      alert(`Total prompts in database: ${counts.totalPrompts}\nTotal responses: ${counts.totalResponses}`);
                    } catch (error) {
                      console.error('Error fetching counts:', error);
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  View Total Counts
                </button>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Prompts per Topic
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={promptsPerTopic}
                    onChange={(e) => setPromptsPerTopic(parseInt(e.target.value) || 20)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Number of Topics
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={numberOfTopics}
                    onChange={(e) => setNumberOfTopics(parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isRunning}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Data Management
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={async () => {
                      if (confirm('This will clear all prompts and responses. Are you sure?')) {
                        try {
                          const response = await fetch('/api/data/clear', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'all' })
                          });
                          if (response.ok) {
                            alert('All data cleared successfully');
                            window.location.reload();
                          }
                        } catch (error) {
                          console.error('Error clearing data:', error);
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    disabled={isRunning}
                  >
                    Clear All Data
                  </button>
                  <span className="text-xs text-gray-500">
                    Use this to reset the analysis and start fresh
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  Total prompts to generate: <span className="font-medium">{promptsPerTopic * numberOfTopics}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={startAnalysis}
                  disabled={isRunning || isLoading}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isRunning ? 'Analysis Running...' : 'Start New Analysis'}
                </Button>
                
                {isRunning && (
                  <Button 
                    onClick={cancelAnalysis}
                    variant="destructive"
                    className="px-6"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Stages */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Stages</CardTitle>
            <p className="text-sm text-gray-600">
              Detailed breakdown of the analysis process
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getStageDetails().map((stage, index) => (
                <div key={stage.key} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {stage.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : progress?.status === stage.key ? (
                      <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${
                        stage.completed ? 'text-green-800' : 
                        progress?.status === stage.key ? 'text-blue-800' : 'text-gray-600'
                      }`}>
                        {stage.title}
                      </h4>
                      {progress?.status === stage.key && (
                        <Badge variant="outline" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Analysis Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">What happens during analysis:</h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Brand content is scraped to understand services and features</li>
                <li>Relevant topics are generated based on brand offerings</li>
                <li>Test prompts are created for each topic using OpenAI</li>
                <li>AI responses are generated and analyzed for brand mentions</li>
                <li>Competitor mentions and source citations are tracked</li>
                <li>Results are stored and analytics are updated</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Performance Notes:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Analysis typically takes 5-10 minutes to complete</li>
                <li>Progress updates every 2 seconds during active analysis</li>
                <li>Each prompt analysis costs approximately $0.01-0.03 in OpenAI credits</li>
                <li>Results are immediately available in the dashboard upon completion</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}