import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, MessageSquare, Trophy, Globe, TrendingUp } from "lucide-react";

interface CompetitorAnalysis {
  competitorId: number;
  name: string;
  category: string | null;
  mentionCount: number;
  mentionRate: number;
  changeRate: number;
}

interface Metrics {
  brandMentionRate: number;
  totalPrompts: number;
  topCompetitor: string;
  totalSources: number;
  totalDomains: number;
}

export default function MetricsOverview() {
  const { data: metrics, isLoading, error } = useQuery<Metrics>({
    queryKey: ["/api/metrics"],
  });

  // Get accurate counts from the new endpoint
  const { data: counts } = useQuery<any>({
    queryKey: ["/api/counts"],
  });

  // Get competitor analysis data to calculate actual mention rates
  const { data: competitorAnalysis } = useQuery<CompetitorAnalysis[]>({
    queryKey: ["/api/competitors/analysis"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Failed to load metrics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use accurate counts from the counts endpoint
  const totalPrompts = counts?.totalPrompts || metrics?.totalPrompts || 0;
  const brandMentions = counts?.brandMentions || Math.round((metrics?.brandMentionRate || 0) / 100 * totalPrompts);
  
  const topCompetitorData = competitorAnalysis?.find((comp: CompetitorAnalysis) => comp.name === metrics?.topCompetitor);
  const competitorMentionRate = topCompetitorData?.mentionRate || 0;

  const metricCards = [
    {
      title: "Brand Mentions",
      value: `${brandMentions}/${metrics?.totalPrompts || 0}`,
      icon: Megaphone,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      trend: `${(metrics?.brandMentionRate || 0).toFixed(1)}% mention rate`,
      trendColor: "text-slate-600"
    },
    {
      title: "Total Prompts Tested",
      value: totalPrompts.toString(),
      icon: MessageSquare,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      trend: "Analysis complete",
      trendColor: "text-slate-600"
    },
    {
      title: "Top Competitor",
      value: metrics?.topCompetitor || "N/A",
      icon: Trophy,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      trend: `${competitorMentionRate}% mention rate`,
      trendColor: "text-amber-600"
    },
    {
      title: "Sources Found",
      value: metrics?.totalSources?.toString() || "0",
      icon: Globe,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      trend: `Across ${metrics?.totalDomains || 0} domains`,
      trendColor: "text-slate-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <Card key={index} className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{metric.value}</p>
                </div>
                <div className={`w-10 h-10 ${metric.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                </div>
              </div>
              <div className="flex items-center mt-4">
                {metric.trend.includes('%') && metric.trend.includes('+') && (
                  <TrendingUp className="w-3 h-3 text-emerald-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${metric.trendColor} mr-1`}>
                  {metric.trend}
                </span>
                {metric.trend.includes('%') && (
                  <span className="text-sm text-slate-500">from last week</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
