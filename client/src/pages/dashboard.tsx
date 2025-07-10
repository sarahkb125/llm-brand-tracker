import { useQuery } from "@tanstack/react-query";
import MetricsOverview from "@/components/metrics-overview";
import TopicAnalysis from "@/components/topic-analysis";
import CompetitorAnalysis from "@/components/competitor-analysis";
import RecentResults from "@/components/recent-results";
import TopSources from "@/components/top-sources";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const [brandName, setBrandName] = useState(() => localStorage.getItem('brandName') || '');
  const [brandUrl, setBrandUrl] = useState(() => localStorage.getItem('brandUrl') || '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSessionId, setAnalysisSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('brandName', brandName);
  }, [brandName]);

  useEffect(() => {
    localStorage.setItem('brandUrl', brandUrl);
  }, [brandUrl]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all queries to force refresh
      await queryClient.invalidateQueries();
      toast({
        title: "Data Refreshed",
        description: "All data has been refreshed successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!brandName.trim()) {
      toast({
        title: "Brand Name Required",
        description: "Please enter your brand name before running analysis.",
        variant: "destructive",
      });
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/analysis/start", { 
        brandName,
        brandUrl: brandUrl.trim() || undefined
      });
      const result = await response.json();
      
      if (result.success) {
        setAnalysisSessionId(result.sessionId);
        toast({
          title: "Analysis Started",
          description: "Brand analysis is running in the background.",
        });
        
        // Poll for progress (simplified - in production you'd use WebSockets)
        const pollProgress = setInterval(async () => {
          try {
            const progressResponse = await apiRequest("GET", `/api/analysis/${result.sessionId}/progress`);
            const progress = await progressResponse.json();
            
            if (progress.status === 'complete') {
              clearInterval(pollProgress);
              setIsAnalyzing(false);
              setAnalysisSessionId(null);
              await queryClient.invalidateQueries();
              toast({
                title: "Analysis Complete",
                description: "Brand analysis has finished successfully.",
              });
            } else if (progress.status === 'error') {
              clearInterval(pollProgress);
              setIsAnalyzing(false);
              setAnalysisSessionId(null);
              toast({
                title: "Analysis Failed",
                description: progress.message || "Analysis failed with an error.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("Error polling progress:", error);
          }
        }, 2000);
        
        // Clear polling after 5 minutes max
        setTimeout(() => {
          clearInterval(pollProgress);
          if (isAnalyzing) {
            setIsAnalyzing(false);
            setAnalysisSessionId(null);
          }
        }, 300000);
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to start analysis. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Brand Analytics {brandName && <span className="text-blue-600">({brandName})</span>}
          </h1>
          <p className="text-gray-600">
            Track your brand mentions across AI responses
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Enter your brand name"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            className="w-48"
          />
          <Input
            placeholder="Brand URL (optional)"
            value={brandUrl}
            onChange={e => setBrandUrl(e.target.value)}
            className="w-48"
          />
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
          >
            <Play className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Running...' : 'Run Analysis'}
          </Button>
        </div>
      </div>

      <MetricsOverview />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopicAnalysis />
        <CompetitorAnalysis />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentResults />
        <TopSources />
      </div>
    </div>
  );
}
