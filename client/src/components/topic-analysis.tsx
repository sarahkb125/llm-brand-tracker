import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TopicAnalysis {
  topicId: number;
  topicName: string;
  mentionRate: number;
  totalPrompts: number;
  brandMentions: number;
}

const topicColors = [
  { bg: "bg-indigo-500", ring: "ring-indigo-200" },
  { bg: "bg-violet-500", ring: "ring-violet-200" },
  { bg: "bg-emerald-500", ring: "ring-emerald-200" },
  { bg: "bg-amber-500", ring: "ring-amber-200" },
  { bg: "bg-red-500", ring: "ring-red-200" },
  { bg: "bg-blue-500", ring: "ring-blue-200" },
  { bg: "bg-green-500", ring: "ring-green-200" },
];

export default function TopicAnalysis() {
  const { data: topics, isLoading, error } = useQuery<TopicAnalysis[]>({
    queryKey: ["/api/topics/analysis"],
  });

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
          <p className="text-red-600">Failed to load topic analysis</p>
        </CardContent>
      </Card>
    );
  }

  const sortedTopics = (topics || []).sort((a, b) => b.mentionRate - a.mentionRate);

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Brand Mentions by Topic</h3>
          <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
            View All
          </Button>
        </div>

        {sortedTopics.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500">No topic data available</p>
            <p className="text-sm text-slate-400 mt-1">Run an analysis to see topic breakdown</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTopics.slice(0, 5).map((topic, index) => {
              const color = topicColors[index % topicColors.length];
              const progressWidth = Math.max(topic.mentionRate, 2); // Minimum 2% for visibility
              
              return (
                <div key={topic.topicId} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 ${color.bg} rounded-full`}></div>
                    <span className="text-sm text-slate-700 truncate max-w-[140px]">{topic.topicName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-900 min-w-[32px] text-right">
                      {topic.mentionRate.toFixed(0)}%
                    </span>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full">
                      <div 
                        className={`h-1.5 ${color.bg} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(progressWidth, 100)}%` }}
                      ></div>
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
