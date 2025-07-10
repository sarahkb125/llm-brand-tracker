import { storage } from "../storage";
import type { 
  InsertPrompt, 
  InsertResponse, 
  Analytics,
  TopicAnalysis,
  CompetitorAnalysis,
  SourceAnalysis 
} from "@shared/schema";

export interface AnalysisProgress {
  status: 'initializing' | 'scraping' | 'generating_prompts' | 'testing_prompts' | 'analyzing' | 'complete' | 'error';
  message: string;
  progress: number;
  totalPrompts?: number;
  completedPrompts?: number;
}

let currentProgress: AnalysisProgress = {
  status: 'initializing',
  message: 'Ready to start analysis...',
  progress: 0,
  totalPrompts: 0,
  completedPrompts: 0
};

let isAnalysisRunning = false;

export function stopCurrentAnalysis() {
  isAnalysisRunning = false;
  currentProgress = {
    status: 'error',
    message: 'Analysis cancelled by user',
    progress: 0,
    totalPrompts: 0,
    completedPrompts: 0
  };
}

export async function getCurrentProgress(): Promise<AnalysisProgress> {
  return currentProgress;
}

export class MockBrandAnalyzer {
  public progressCallback?: (progress: AnalysisProgress) => void;
  private brandName: string = '';

  constructor(progressCallback?: (progress: AnalysisProgress) => void) {
    this.progressCallback = progressCallback;
  }

  setBrandName(brandName: string) {
    this.brandName = brandName;
  }

  private updateProgress(update: Partial<AnalysisProgress>) {
    currentProgress = { ...currentProgress, ...update };
    if (this.progressCallback) {
      this.progressCallback(currentProgress);
    }
  }

  async runAnalysisWithSavedPrompts(savedPrompts: any[]): Promise<void> {
    if (isAnalysisRunning) {
      return;
    }

    isAnalysisRunning = true;

    try {
      this.updateProgress({
        status: 'initializing',
        message: 'Starting analysis with saved prompts...',
        progress: 10
      });

      // Clear existing data
      await storage.clearAllPrompts();
      await storage.clearAllResponses();

      this.updateProgress({
        status: 'testing_prompts',
        message: `Testing ${savedPrompts.length} prompts...`,
        progress: 30,
        totalPrompts: savedPrompts.length,
        completedPrompts: 0
      });

      let completedCount = 0;

      // Process prompts in smaller batches
      for (let i = 0; i < savedPrompts.length; i++) {
        if (!isAnalysisRunning) break;

        const promptData = savedPrompts[i];
        
        try {
          // Create prompt record
          const prompt = await storage.createPrompt({
            text: promptData.text,
            topicId: promptData.topicId || null
          });

          // Generate realistic analysis results
          const brandMentioned = Math.random() < 0.15; // 15% mention rate
          const competitors = await this.generateCompetitors(promptData.text);
          const sources = await this.generateSources(promptData.text);

          // Process competitors
          for (const competitorName of competitors) {
            let competitor = await storage.getCompetitorByName(competitorName);
            if (!competitor) {
                          competitor = await storage.createCompetitor({
              name: competitorName,
              category: await this.categorizeCompetitor(competitorName),
              mentionCount: 0
            });
            }
            await storage.updateCompetitorMentionCount(competitorName, 1);
          }

          // Process sources
          for (const url of sources) {
            try {
              const domain = new URL(url).hostname;
              let source = await storage.getSourceByDomain(domain);
              if (!source) {
                source = await storage.createSource({
                  domain,
                  url,
                  title: `Resource from ${domain}`,
                  citationCount: 0
                });
              }
              await storage.updateSourceCitationCount(domain, 1);
            } catch (e) {
              // Skip invalid URLs
            }
          }

          // Create response record
          await storage.createResponse({
            promptId: prompt.id,
            text: `Based on your requirements, I'd recommend considering ${competitors.join(', ')} for deployment.${brandMentioned ? ' There are also other platforms worth considering for their simplicity.' : ''}`,
            brandMentioned,
            competitorsMentioned: competitors,
            sources
          });

          completedCount++;
          this.updateProgress({
            status: 'testing_prompts',
            message: `Testing prompts... (${completedCount}/${savedPrompts.length})`,
            progress: 30 + (completedCount / savedPrompts.length) * 50,
            totalPrompts: savedPrompts.length,
            completedPrompts: completedCount
          });

          // Small delay for progress visibility
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing prompt: ${promptData.text}`, error as Error);
        }
      }

      if (isAnalysisRunning) {
        this.updateProgress({
          status: 'analyzing',
          message: 'Generating analytics...',
          progress: 90
        });

        // Generate analytics
        await this.generateAnalytics();

        this.updateProgress({
          status: 'complete',
          message: `Analysis completed successfully! Processed ${completedCount} prompts.`,
          progress: 100,
          totalPrompts: savedPrompts.length,
          completedPrompts: completedCount
        });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      this.updateProgress({
        status: 'error',
        message: `Analysis failed: ${(error as Error).message}`,
        progress: 0
      });
    } finally {
      isAnalysisRunning = false;
    }
  }



  private async generateCompetitors(promptText: string): Promise<string[]> {
    const lowerPrompt = promptText.toLowerCase();
    const competitors: string[] = [];

    // Add specific competitors based on prompt content using AI extraction
    try {
      const { extractCompetitorsFromText } = await import("./openai");
      const extractedCompetitors = await extractCompetitorsFromText(promptText, this.brandName);
      competitors.push(...extractedCompetitors);
    } catch (error) {
      console.error("Failed to extract competitors from text:", error);
      // Fallback: look for common deployment/hosting keywords
      const deploymentKeywords = ['deploy', 'hosting', 'platform', 'cloud', 'service'];
      if (deploymentKeywords.some(keyword => lowerPrompt.includes(keyword))) {
        // Let the analysis discover competitors naturally
        console.log("Using fallback competitor detection");
      }
    }

    // For deployment-related prompts, let the analysis discover competitors naturally
    // rather than using hardcoded fallbacks

    return Array.from(new Set(competitors)); // Remove duplicates
  }

  private async generateSources(promptText: string): Promise<string[]> {
    // Use AI to extract relevant sources from the prompt
    try {
      const { extractSourcesFromText } = await import("./openai");
      const extractedSources = await extractSourcesFromText(promptText);
      return extractedSources.map(source => source.url);
    } catch (error) {
      console.error("Failed to extract sources from text:", error);
      // Fallback: return generic sources
      return [
        'https://stackoverflow.com/questions/deployment',
        'https://medium.com/cloud-deployment-guide',
        'https://reddit.com/r/webdev'
      ];
    }
  }

  private async categorizeCompetitor(name: string): Promise<string> {
    // Try to get existing competitor to see if it already has a category
    const existingCompetitor = await storage.getCompetitorByName(name);
    if (existingCompetitor?.category) {
      return existingCompetitor.category;
    }
    
    // Dynamic categorization based on name patterns and context
    const lowerName = name.toLowerCase();
    
    // Cloud platform patterns
    if (lowerName.includes('cloud') || lowerName.includes('aws') || lowerName.includes('azure') || 
        lowerName.includes('gcp') || lowerName.includes('digitalocean')) {
      return 'Cloud Platform';
    }
    
    // Platform as a Service patterns - look for common PaaS indicators
    if (lowerName.includes('platform') || lowerName.includes('service') || 
        lowerName.includes('deploy') || lowerName.includes('hosting') ||
        lowerName.includes('app') || lowerName.includes('web')) {
      return 'Platform as a Service';
    }
    
    // Database patterns
    if (lowerName.includes('database') || lowerName.includes('db') || lowerName.includes('sql') ||
        lowerName.includes('postgres') || lowerName.includes('mysql') || lowerName.includes('redis')) {
      return 'Database Service';
    }
    
    // CDN/Edge patterns
    if (lowerName.includes('cdn') || lowerName.includes('edge') || lowerName.includes('cloudflare')) {
      return 'CDN/Edge Service';
    }
    
    // Default to a generic category
    return 'Cloud Service';
  }

  async generateAnalytics(): Promise<Analytics> {
    const responses = await storage.getResponses();
    const competitors = await storage.getCompetitors();
            const brandMentions = responses.filter(r => r.brandMentioned).length;
            const mentionRate = responses.length > 0 ? (brandMentions / responses.length) * 100 : 0;

    // Find the top competitor based on actual mention counts
    const topCompetitor = competitors
      .sort((a, b) => (b.mentionCount || 0) - (a.mentionCount || 0))[0]?.name || null;

    const analytics = await storage.createAnalytics({
      totalPrompts: responses.length,
      brandMentionRate: mentionRate,
      topCompetitor,
      totalSources: (await storage.getSources()).length,
      totalDomains: Array.from(new Set((await storage.getSources()).map(s => s.domain))).length
    });

    return analytics;
  }

  async getOverviewMetrics() {
    const analytics = await storage.getLatestAnalytics();
    return {
      brandMentionRate: analytics?.brandMentionRate || 0,
      totalPrompts: analytics?.totalPrompts || 0,
      topCompetitor: analytics?.topCompetitor || 'N/A',
      totalSources: analytics?.totalSources || 0,
      totalDomains: analytics?.totalDomains || 0
    };
  }

  async getTopicAnalysis(): Promise<TopicAnalysis[]> {
    return storage.getTopicAnalysis();
  }

  async getCompetitorAnalysis(): Promise<CompetitorAnalysis[]> {
    return storage.getCompetitorAnalysis();
  }

  async getSourceAnalysis(): Promise<SourceAnalysis[]> {
    return storage.getSourceAnalysis();
  }
}

export const mockAnalyzer = new MockBrandAnalyzer();