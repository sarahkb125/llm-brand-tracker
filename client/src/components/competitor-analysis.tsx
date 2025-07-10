import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CompetitorAnalysis {
  competitorId: number;
  name: string;
  category: string | null;
  mentionCount: number;
  mentionRate: number;
  changeRate: number;
}

const getCompetitorInitial = (name: string) => {
  return name.charAt(0).toUpperCase();
};

const getCompetitorColor = (index: number) => {
  const colors = [
    { bg: "bg-purple-100", text: "text-purple-700" },
    { bg: "bg-blue-100", text: "text-blue-700" },
    { bg: "bg-orange-100", text: "text-orange-700" },
    { bg: "bg-green-100", text: "text-green-700" },
    { bg: "bg-pink-100", text: "text-pink-700" },
    { bg: "bg-indigo-100", text: "text-indigo-700" },
  ];
  return colors[index % colors.length];
};

export default function CompetitorAnalysis() {
  const { data: competitors, isLoading, error } = useQuery<CompetitorAnalysis[]>({
    queryKey: ["/api/competitors/analysis"],
  });

  const { data: responses } = useQuery<any[]>({
    queryKey: ['/api/responses', { limit: 1000, full: true }],
    queryFn: () => fetch('/api/responses?limit=1000&full=true').then(res => res.json()),
  });

  // Calculate actual percentage of prompts each competitor appears in
  const competitorsWithPromptPercentage = competitors?.map(competitor => {
    const totalPrompts = responses?.length || 1;
    const promptsWithCompetitor = responses?.filter(response => 
      response.competitorsMentioned?.includes(competitor.name)
    ).length || 0;

    return {
      ...competitor,
      promptPercentage: ((promptsWithCompetitor / totalPrompts) * 100),
      promptsAppeared: promptsWithCompetitor,
      totalPrompts
    };
  }) || [];

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <p className="text-red-600">Failed to load competitor analysis</p>
        </CardContent>
      </Card>
    );
  }

  const topCompetitors = competitorsWithPromptPercentage.slice(0, 4);

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Competitor Analysis</h3>
          <Select defaultValue="30days">
            <SelectTrigger className="w-32 text-sm border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="24hours">Last 24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {topCompetitors.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500">No competitor data available</p>
            <p className="text-sm text-slate-400 mt-1">Run an analysis to see competitor mentions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topCompetitors.map((competitor, index) => {
              const color = getCompetitorColor(index);
              const isPositive = competitor.changeRate > 0;
              const isNegative = competitor.changeRate < 0;
              
              return (
                <div key={competitor.competitorId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 ${color.bg} rounded-full flex items-center justify-center`}>
                      <span className={`text-xs font-semibold ${color.text}`}>
                        {getCompetitorInitial(competitor.name)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{competitor.name}</p>
                      <p className="text-xs text-slate-500">{competitor.category || 'Platform'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      competitor.promptPercentage >= 50 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {competitor.promptPercentage.toFixed(0)}%
                    </p>
                    <div className="flex items-center justify-end">
                      <p className="text-xs text-slate-500">
                        {competitor.promptsAppeared}/{competitor.totalPrompts} prompts
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
