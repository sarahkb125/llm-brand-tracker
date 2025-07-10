import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Search } from "lucide-react";
import type { ResponseWithPrompt, Topic } from "@shared/schema";

type FilterType = 'all' | 'mentioned' | 'not-mentioned';

export default function PromptResultsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set());

  const { data: responses, isLoading } = useQuery<ResponseWithPrompt[]>({
    queryKey: ['/api/responses?limit=1000&full=true'],
  });

  const { data: topics } = useQuery<Topic[]>({
    queryKey: ['/api/topics'],
  });

  const allPrompts = responses || [];
  const mentionedCount = allPrompts.filter(p => p.brandMentioned).length;
  const notMentionedCount = allPrompts.filter(p => !p.brandMentioned).length;

  const filteredPrompts = allPrompts.filter(prompt => {
    if (filter === 'mentioned' && !prompt.brandMentioned) return false;
    if (filter === 'not-mentioned' && prompt.brandMentioned) return false;
    if (selectedTopic !== 'all' && prompt.prompt.topicId !== parseInt(selectedTopic)) return false;
    if (searchTerm && !prompt.prompt.text.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const togglePromptSelection = (promptId: number) => {
    setSelectedPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promptId)) {
        newSet.delete(promptId);
      } else {
        newSet.add(promptId);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedPrompts.size === filteredPrompts.length) {
      setSelectedPrompts(new Set());
    } else {
      setSelectedPrompts(new Set(filteredPrompts.map(p => p.id)));
    }
  };

  const getTopicName = (topicId: number | null) => {
    if (!topicId) return 'General';
    const topic = topics?.find(t => t.id === topicId);
    return topic?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Prompt Results</h1>
        <p className="text-gray-600 mb-6">Results from prompts where your brand should be mentioned</p>
        
        {/* Filter Pills */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className="h-8"
          >
            All ({allPrompts.length})
          </Button>
          <Button
            variant={filter === 'mentioned' ? 'default' : 'outline'}
            onClick={() => setFilter('mentioned')}
            className={`h-8 ${filter === 'mentioned' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600 text-green-600 hover:bg-green-50'}`}
          >
            Mentioned ({mentionedCount})
          </Button>
          <Button
            variant={filter === 'not-mentioned' ? 'default' : 'outline'}
            onClick={() => setFilter('not-mentioned')}
            className={`h-8 ${filter === 'not-mentioned' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-600 hover:bg-red-50'}`}
          >
            Not mentioned ({notMentionedCount})
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {topics?.map(topic => (
                <SelectItem key={topic.id} value={topic.id.toString()}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedPrompts.size === filteredPrompts.length && filteredPrompts.length > 0}
                  onCheckedChange={toggleAllSelection}
                />
              </TableHead>
              <TableHead>USER QUERY</TableHead>
              <TableHead className="w-48">IS BRAND MENTIONED?</TableHead>
              <TableHead className="w-32">TOPICS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPrompts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No queries found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredPrompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPrompts.has(prompt.id)}
                      onCheckedChange={() => togglePromptSelection(prompt.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-xl">
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {prompt.prompt.text}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {prompt.brandMentioned ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-600 font-medium">Yes</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="text-red-600 font-medium">No</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {getTopicName(prompt.prompt.topicId)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Selection Actions */}
      {selectedPrompts.size > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedPrompts.size} item{selectedPrompts.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export Selected
              </Button>
              <Button variant="outline" size="sm">
                Analyze Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}