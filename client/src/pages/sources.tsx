import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ExternalLink, TrendingUp, TrendingDown, Download } from "lucide-react";
import type { SourceAnalysis } from "@shared/schema";

type CategoryType = 'all' | 'social' | 'business' | 'publisher' | 'other';

interface DomainData {
  id: number;
  domain: string;
  category: string;
  impact: number;
  trend: 'up' | 'down' | 'stable';
  pages: number;
  favicon?: string;
  urls: string[];
}

export default function SourcesPage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryType>('all');
  const [domainSearch, setDomainSearch] = useState('');
  const [articleSearch, setArticleSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const { data: sources, isLoading } = useQuery<SourceAnalysis[]>({
    queryKey: ['/api/sources/analysis'],
  });

  // Auto-select first domain when data loads
  useEffect(() => {
    if (sources && sources.length > 0) {
      setSelectedDomain(sources[0].domain);
    }
  }, [sources]);

  // Transform source data into domain format
  const domains: DomainData[] = (sources || []).map(source => {
    const category = getDomainCategory(source.domain);
    return {
      id: source.sourceId,
      domain: source.domain,
      category,
      impact: Math.min(100, (source.citationCount || 0) * 10), // Scale citation count to percentage
      trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend data
      pages: source.urls.length,
      urls: source.urls
    };
  });

  // Filter domains by category and search
  const filteredDomains = domains.filter(domain => {
    if (categoryFilter !== 'all' && domain.category !== categoryFilter) return false;
    if (domainSearch && !domain.domain.toLowerCase().includes(domainSearch.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.impact - a.impact); // Sort by impact descending

  // Get articles - show all domains when "all categories" or show selected domain
  const articlesToShow = selectedDomain && categoryFilter !== 'all' 
    ? domains.filter(d => d.domain === selectedDomain)
    : filteredDomains;
  
  const articles = articlesToShow.flatMap(domain => 
    domain.urls.map((url, index) => ({
      id: `${domain.id}-${index}`,
      url,
      domain: domain.domain,
      impact: Math.random() * 20 + 5, // Mock impact percentage
      queries: Math.floor(Math.random() * 10) + 1
    }))
  );

  const filteredArticles = articles.filter(article => 
    !articleSearch || article.url.toLowerCase().includes(articleSearch.toLowerCase())
  ).sort((a, b) => b.impact - a.impact); // Sort by impact descending

  function getDomainCategory(domain: string): string {
    if (domain.includes('twitter') || domain.includes('linkedin') || domain.includes('reddit')) return 'social';
    if (domain.includes('business') || domain.includes('forbes') || domain.includes('bloomberg')) return 'business';
    if (domain.includes('medium') || domain.includes('dev.to') || domain.includes('blog')) return 'publisher';
    return 'other';
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case 'social': return 'bg-blue-100 text-blue-800';
      case 'business': return 'bg-green-100 text-green-800';
      case 'publisher': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getFavicon(domain: string) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  }

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
    <div className="p-8 space-y-8">
      {/* Source Domains Section */}
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Source Domains</h1>
          <p className="text-gray-600 mb-6">Which domains hold the most influence for your relevant queries</p>
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('all')}
              className="h-8"
            >
              All Categories
            </Button>
            <Button
              variant={categoryFilter === 'social' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('social')}
              className="h-8"
            >
              Social media
            </Button>
            <Button
              variant={categoryFilter === 'business' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('business')}
              className="h-8"
            >
              Business
            </Button>
            <Button
              variant={categoryFilter === 'publisher' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('publisher')}
              className="h-8"
            >
              Publisher
            </Button>
            <Button
              variant={categoryFilter === 'other' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('other')}
              className="h-8"
            >
              Other
            </Button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search domains..."
                value={domainSearch}
                onChange={(e) => setDomainSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Domains Table */}
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>ROOT DOMAIN</TableHead>
                <TableHead className="w-32">CATEGORY</TableHead>
                <TableHead className="w-48">IMPACT %</TableHead>
                <TableHead className="w-24">TREND</TableHead>
                <TableHead className="w-24">PAGES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No domains found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredDomains.map((domain, index) => (
                  <TableRow key={`${domain.domain}-${index}`} className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedDomain(domain.domain)}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img 
                          src={getFavicon(domain.domain)} 
                          alt="" 
                          className="w-4 h-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="font-medium">{domain.domain}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getCategoryColor(domain.category)}`}>
                        {domain.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${domain.impact}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {domain.impact.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {domain.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between">
                        <span>{domain.pages}</span>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-blue-600 h-auto p-0 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDomain(domain.domain);
                          }}
                        >
                          Examine
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Source Articles Section - Always show if we have domains */}
      {domains.length > 0 && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Source Articles</h2>
            <p className="text-gray-600 mb-6">
              Explore the specific articles and pages that contribute to your AI visibility
              {categoryFilter === 'all' ? ' from all domains' : selectedDomain && ` from ${selectedDomain}`}
            </p>
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={categoryFilter === 'all' ? "Search all articles..." : `Search within ${selectedDomain}...`}
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Articles Table */}
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-32">DOMAIN</TableHead>
                  <TableHead className="w-32">IMPACT %</TableHead>
                  <TableHead className="w-24">QUERIES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No articles found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArticles.map((article, index) => (
                    <TableRow key={`${article.domain}-${article.url}-${index}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                            {article.url}
                          </span>
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{article.domain}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-blue-600 h-1 rounded-full" 
                              style={{ width: `${article.impact}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {article.impact.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{article.queries}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}