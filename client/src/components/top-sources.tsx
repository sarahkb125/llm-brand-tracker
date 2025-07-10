import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Globe, Download, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { SiReddit, SiGithub, SiMedium } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SourceAnalysis {
  sourceId: number;
  domain: string;
  citationCount: number;
  urls: string[];
}

const getDomainIcon = (domain: string) => {
  if (domain.includes('reddit')) return SiReddit;
  if (domain.includes('github')) return SiGithub;
  if (domain.includes('medium')) return SiMedium;
  return Globe;
};

const getDomainColor = (domain: string) => {
  if (domain.includes('reddit')) return { bg: "bg-orange-100", icon: "text-orange-600" };
  if (domain.includes('github')) return { bg: "bg-gray-100", icon: "text-gray-600" };
  if (domain.includes('medium')) return { bg: "bg-purple-100", icon: "text-purple-600" };
  if (domain.includes('dev.to')) return { bg: "bg-blue-100", icon: "text-blue-600" };
  return { bg: "bg-slate-100", icon: "text-slate-600" };
};

const getDomainLabel = (domain: string) => {
  if (domain.includes('docs.')) return 'Documentation';
  if (domain.includes('reddit')) return 'Community';
  if (domain.includes('dev.to')) return 'Blog Platform';
  if (domain.includes('medium')) return 'Articles';
  if (domain.includes('github')) return 'Code Repository';
  return 'Website';
};

export default function TopSources() {
  const { toast } = useToast();
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  
  const { data: sources, isLoading, error } = useQuery<SourceAnalysis[]>({
    queryKey: ["/api/sources/analysis"],
  });

  const handleExport = async () => {
    try {
      const response = await apiRequest("GET", "/api/export");
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `your-brand-analysis-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Analysis data has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleDomain = (domain: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-6">
          <p className="text-red-600">Failed to load sources</p>
        </CardContent>
      </Card>
    );
  }

  const sortedSources = (sources || []).sort((a, b) => b.citationCount - a.citationCount); // Sort by citation count descending
  const displaySources = showAll ? sortedSources : sortedSources.slice(0, 6);

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Top Sources</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-indigo-600 hover:text-indigo-700"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'View All'}
          </Button>
        </div>

        {(sources || []).length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500">No source data available</p>
            <p className="text-sm text-slate-400 mt-1">Run an analysis to see source citations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displaySources.map((source: SourceAnalysis) => {
              const Icon = getDomainIcon(source.domain);
              const colors = getDomainColor(source.domain);
              const label = getDomainLabel(source.domain);
              const isExpanded = expandedDomains.has(source.domain);
              
              return (
                <Collapsible key={source.domain} open={isExpanded} onOpenChange={() => toggleDomain(source.domain)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 ${colors.bg} rounded flex items-center justify-center`}>
                          <Icon className={`w-3 h-3 ${colors.icon}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{source.domain}</p>
                          <p className="text-xs text-slate-500">{label} • {source.urls.length} links</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{source.citationCount}</p>
                          <p className="text-xs text-slate-500">mentions</p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1">
                    <div className="pl-9 pr-3 space-y-1">
                      {source.urls.slice(0, 5).map((url: string, index: number) => (
                        <div key={index} className="flex items-center justify-between py-1 px-2 bg-slate-50 rounded text-xs">
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-indigo-600 truncate flex-1 mr-2"
                          >
                            {url.replace(/^https?:\/\//, '').slice(0, 40)}...
                          </a>
                          <ExternalLink className="w-3 h-3 text-slate-400 hover:text-indigo-600 cursor-pointer" />
                        </div>
                      ))}
                      {source.urls.length > 5 && (
                        <div className="text-xs text-slate-500 px-2 py-1">
                          +{source.urls.length - 5} more links
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Export Button */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <Button 
            onClick={handleExport}
            className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            variant="secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
