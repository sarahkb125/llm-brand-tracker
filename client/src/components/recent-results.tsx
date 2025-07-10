import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Clock } from "lucide-react";

interface PromptResult {
  id: number;
  promptId: number;
  text: string;
  brandMentioned: boolean;
  competitorsMentioned: string[];
  sources: string[];
  createdAt: string;
  prompt: {
    id: number;
    text: string;
    topicId: number | null;
    createdAt: string;
    topic: {
      id: number;
      name: string;
      description: string | null;
    } | null;
  };
}

type FilterType = 'all' | 'mentioned' | 'not-mentioned';

export default function RecentResults() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [limit, setLimit] = useState(10);

  const { data: results, isLoading, error } = useQuery<PromptResult[]>({
    queryKey: ["/api/responses", { limit }],
  });

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
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
          <p className="text-red-600">Failed to load recent results</p>
        </CardContent>
      </Card>
    );
  }

  const filteredResults = (results || []).filter(result => {
    if (filter === 'mentioned') return result.brandMentioned;
    if (filter === 'not-mentioned') return !result.brandMentioned;
    return true;
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Recent Prompt Results</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}
            >
              All
            </Button>
            <Button
              variant={filter === 'mentioned' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('mentioned')}
              className={filter === 'mentioned' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}
            >
              Mentioned
            </Button>
            <Button
              variant={filter === 'not-mentioned' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('not-mentioned')}
              className={filter === 'not-mentioned' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}
            >
              Not Mentioned
            </Button>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500">No prompt results available</p>
            <p className="text-sm text-slate-400 mt-1">Run an analysis to see prompt results</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.slice(0, 5).map((result) => (
              <div key={result.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 mb-1 line-clamp-2">
                      "{truncateText(result.prompt.text, 80)}"
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span>{result.prompt.topic?.name || 'Uncategorized'}</span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeAgo(result.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <Badge 
                      variant={result.brandMentioned ? "default" : "destructive"}
                      className={result.brandMentioned 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                      }
                    >
                      {result.brandMentioned ? (
                        <span>Yes</span>
                      ) : (
                        <span>No</span>
                      )}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 mb-2">
                  {truncateText(result.text, 100)}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span>Sources: {result.sources?.length || 0}</span>
                    <span>Competitors: {result.competitorsMentioned?.length || 0}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 text-xs h-6 px-2">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredResults.length > 0 && (
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              onClick={() => setLimit(limit + 10)}
              className="text-indigo-600 hover:text-indigo-700"
            >
              Load More Results
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
