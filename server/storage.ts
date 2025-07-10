import {
  topics,
  prompts,
  responses,
  competitors,
  sources,
  analytics,
  type Topic,
  type Prompt,
  type Response,
  type Competitor,
  type Source,
  type Analytics,
  type InsertTopic,
  type InsertPrompt,
  type InsertResponse,
  type InsertCompetitor,
  type InsertSource,
  type InsertAnalytics,
  type PromptWithTopic,
  type ResponseWithPrompt,
  type TopicAnalysis,
  type CompetitorAnalysis,
  type SourceAnalysis
} from "@shared/schema";

export interface IStorage {
  // Topics
  getTopics(): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  getTopicById(id: number): Promise<Topic | undefined>;

  // Prompts
  getPrompts(): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  getPromptById(id: number): Promise<Prompt | undefined>;
  getPromptsWithTopics(): Promise<PromptWithTopic[]>;
  getPromptsByTopic(topicId: number): Promise<Prompt[]>;

  // Responses
  getResponses(): Promise<Response[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  getResponseById(id: number): Promise<Response | undefined>;
  getResponsesWithPrompts(): Promise<ResponseWithPrompt[]>;
  getRecentResponses(limit?: number): Promise<ResponseWithPrompt[]>;

  // Competitors
  getCompetitors(): Promise<Competitor[]>;
  createCompetitor(competitor: InsertCompetitor): Promise<Competitor>;
  getCompetitorByName(name: string): Promise<Competitor | undefined>;
  updateCompetitorMentionCount(name: string, increment: number): Promise<void>;

  // Sources
  getSources(): Promise<Source[]>;
  createSource(source: InsertSource): Promise<Source>;
  getSourceByDomain(domain: string): Promise<Source | undefined>;
  updateSourceCitationCount(domain: string, increment: number): Promise<void>;

  // Analytics
  getLatestAnalytics(): Promise<Analytics | undefined>;
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;

  // Analysis methods
  getTopicAnalysis(): Promise<TopicAnalysis[]>;
  getCompetitorAnalysis(): Promise<CompetitorAnalysis[]>;
  getSourceAnalysis(): Promise<SourceAnalysis[]>;
  
  // Latest analysis results only
  getLatestResponses(): Promise<ResponseWithPrompt[]>;
  getLatestPrompts(): Promise<Prompt[]>;

  // Data clearing methods
  clearAllPrompts(): Promise<void>;
  clearAllResponses(): Promise<void>;
  clearAllCompetitors(): Promise<void>;
}

export class MemStorage implements IStorage {
  private topics: Map<number, Topic> = new Map();
  private prompts: Map<number, Prompt> = new Map();
  private responses: Map<number, Response> = new Map();
  private competitors: Map<number, Competitor> = new Map();
  private sources: Map<number, Source> = new Map();
  private analytics: Map<number, Analytics> = new Map();
  
  private currentTopicId = 1;
  private currentPromptId = 1;
  private currentResponseId = 1;
  private currentCompetitorId = 1;
  private currentSourceId = 1;
  private currentAnalyticsId = 1;

  constructor() {
    // Initialize only basic reference data - no sample prompts/responses
    this.initializeBasicData();
  }

  private initializeBasicData() {
    this.initializeTopics();
    this.initializeCompetitors();
    this.initializeSources();
  }

  private initializeTopics() {
    // Don't pre-populate topics - they will be created dynamically during analysis
    // This makes the system flexible and based on actual analysis needs
  }

  private initializeCompetitors() {
    // Don't pre-populate competitors - they will be discovered during analysis
    // This makes the system dynamic and based on actual analysis results
  }

  private initializeSources() {
    // Start with empty sources - they will be populated from actual analysis
  }

  async getTopics(): Promise<Topic[]> {
    return Array.from(this.topics.values());
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const newTopic: Topic = {
      id: this.currentTopicId++,
      name: topic.name,
      description: topic.description ?? null,
      createdAt: new Date(),
    };
    this.topics.set(newTopic.id, newTopic);
    return newTopic;
  }

  async getTopicById(id: number): Promise<Topic | undefined> {
    return this.topics.get(id);
  }

  async getPrompts(): Promise<Prompt[]> {
    return Array.from(this.prompts.values());
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const newPrompt: Prompt = {
      id: this.currentPromptId++,
      text: prompt.text,
      topicId: prompt.topicId ?? null,
      createdAt: new Date(),
    };
    this.prompts.set(newPrompt.id, newPrompt);
    return newPrompt;
  }

  async getPromptById(id: number): Promise<Prompt | undefined> {
    return this.prompts.get(id);
  }

  async getPromptsWithTopics(): Promise<PromptWithTopic[]> {
    const prompts = Array.from(this.prompts.values());
    return prompts.map(prompt => ({
      ...prompt,
      topic: prompt.topicId ? this.topics.get(prompt.topicId) || null : null
    }));
  }

  async getPromptsByTopic(topicId: number): Promise<Prompt[]> {
    return Array.from(this.prompts.values()).filter(p => p.topicId === topicId);
  }

  async getResponses(): Promise<Response[]> {
    return Array.from(this.responses.values());
  }

  async createResponse(response: InsertResponse): Promise<Response> {
    const newResponse: Response = {
      id: this.currentResponseId++,
      promptId: response.promptId,
      text: response.text,
              brandMentioned: response.brandMentioned ?? null,
      competitorsMentioned: response.competitorsMentioned ?? null,
      sources: response.sources ?? null,
      createdAt: new Date(),
    };
    this.responses.set(newResponse.id, newResponse);
    return newResponse;
  }

  async getResponseById(id: number): Promise<Response | undefined> {
    return this.responses.get(id);
  }

  async getResponsesWithPrompts(): Promise<ResponseWithPrompt[]> {
    const responses = Array.from(this.responses.values());
    return responses.map(response => {
      const prompt = this.prompts.get(response.promptId);
      const topic = prompt ? this.topics.get(prompt.topicId || 0) : null;
      return {
        ...response,
        prompt: {
          ...prompt!,
          topic: topic || null
        }
      };
    });
  }

  async getRecentResponses(limit = 10): Promise<ResponseWithPrompt[]> {
    const responses = await this.getResponsesWithPrompts();
    return responses
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async getCompetitors(): Promise<Competitor[]> {
    return Array.from(this.competitors.values());
  }

  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const newCompetitor: Competitor = {
      id: this.currentCompetitorId++,
      name: competitor.name,
      category: competitor.category || null,
      mentionCount: competitor.mentionCount || null,
      lastMentioned: null,
    };
    this.competitors.set(newCompetitor.id, newCompetitor);
    return newCompetitor;
  }

  async getCompetitorByName(name: string): Promise<Competitor | undefined> {
    return Array.from(this.competitors.values()).find(c => c.name === name);
  }

  async updateCompetitorMentionCount(name: string, increment: number): Promise<void> {
    const competitor = await this.getCompetitorByName(name);
    if (competitor && competitor.mentionCount !== null) {
      competitor.mentionCount += increment;
      competitor.lastMentioned = new Date();
      this.competitors.set(competitor.id, competitor);
    }
  }

  async getSources(): Promise<Source[]> {
    return Array.from(this.sources.values());
  }

  async createSource(source: InsertSource): Promise<Source> {
    const newSource: Source = {
      id: this.currentSourceId++,
      domain: source.domain,
      url: source.url,
      title: source.title || null,
      citationCount: source.citationCount || null,
      lastCited: new Date(),
    };
    this.sources.set(newSource.id, newSource);
    return newSource;
  }

  async getSourceByDomain(domain: string): Promise<Source | undefined> {
    return Array.from(this.sources.values()).find(s => s.domain === domain);
  }

  async updateSourceCitationCount(domain: string, increment: number): Promise<void> {
    const source = await this.getSourceByDomain(domain);
    if (source && source.citationCount !== null) {
      source.citationCount += increment;
      source.lastCited = new Date();
      this.sources.set(source.id, source);
    }
  }

  async getLatestAnalytics(): Promise<Analytics | undefined> {
    const analytics = Array.from(this.analytics.values());
    return analytics.sort((a, b) => 
      new Date(b.date!).getTime() - new Date(a.date!).getTime()
    )[0];
  }

  async createAnalytics(analytics: InsertAnalytics): Promise<Analytics> {
    const newAnalytics: Analytics = {
      id: this.currentAnalyticsId++,
      date: new Date(),
      totalPrompts: analytics.totalPrompts || null,
              brandMentionRate: analytics.brandMentionRate || null,
      topCompetitor: analytics.topCompetitor || null,
      totalSources: analytics.totalSources || null,
      totalDomains: analytics.totalDomains || null,
    };
    this.analytics.set(newAnalytics.id, newAnalytics);
    return newAnalytics;
  }

  async getTopicAnalysis(): Promise<TopicAnalysis[]> {
    const topics = await this.getTopics();
    const responses = await this.getResponsesWithPrompts();
    
    return topics.map(topic => {
      const topicResponses = responses.filter(r => r.prompt.topicId === topic.id);
              const brandMentions = topicResponses.filter(r => r.brandMentioned).length;
      const mentionRate = topicResponses.length > 0 ? (brandMentions / topicResponses.length) * 100 : 0;
      
      return {
        topicId: topic.id,
        topicName: topic.name,
        mentionRate,
        totalPrompts: topicResponses.length,
        brandMentions
      };
    });
  }

  async getCompetitorAnalysis(): Promise<CompetitorAnalysis[]> {
    const competitors = await this.getCompetitors();
    const responses = await this.getResponses();
    const totalResponses = responses.length;
    
    return competitors.map(competitor => {
      const mentions = responses.filter(r => 
        r.competitorsMentioned?.includes(competitor.name)
      ).length;
      
      const mentionRate = totalResponses > 0 ? (mentions / totalResponses) * 100 : 0;
      
      return {
        competitorId: competitor.id,
        name: competitor.name,
        category: competitor.category,
        mentionCount: mentions,
        mentionRate,
        changeRate: 0 // Calculate based on historical data if needed
      };
    });
  }

  async getSourceAnalysis(): Promise<SourceAnalysis[]> {
    const sources = await this.getSources();
    const sourceAnalysis = new Map<string, { sourceId: number; domain: string; citationCount: number; urls: string[] }>();
    
    sources.forEach(source => {
      const key = source.domain;
      if (sourceAnalysis.has(key)) {
        const existing = sourceAnalysis.get(key)!;
        existing.citationCount += source.citationCount || 0;
        existing.urls.push(source.url);
      } else {
        sourceAnalysis.set(key, {
          sourceId: source.id,
          domain: source.domain,
          citationCount: source.citationCount || 0,
          urls: [source.url]
        });
      }
    });
    
    return Array.from(sourceAnalysis.values())
      .sort((a, b) => b.citationCount - a.citationCount);
  }

  async clearAllPrompts(): Promise<void> {
    this.prompts.clear();
    this.currentPromptId = 1;
  }

  async clearAllResponses(): Promise<void> {
    this.responses.clear();
    this.currentResponseId = 1;
  }

  async clearAllCompetitors(): Promise<void> {
    console.log(`[${new Date().toISOString()}] MemStorage: Clearing all competitors...`);
    this.competitors.clear();
    this.currentCompetitorId = 1;
    console.log(`[${new Date().toISOString()}] MemStorage: All competitors cleared successfully`);
  }

  async getLatestResponses(): Promise<ResponseWithPrompt[]> {
    const allResponses = Array.from(this.responses.values());
    if (allResponses.length === 0) return [];
    
    const sortedResponses = allResponses.sort((a, b) => b.id - a.id);
    
    return sortedResponses.map(response => {
      const prompt = this.prompts.get(response.promptId);
      const topic = prompt ? this.topics.get(prompt.topicId || 0) : null;
      return {
        ...response,
        prompt: {
          ...prompt!,
          topic: topic || null
        }
      };
    });
  }

  async getLatestPrompts(): Promise<Prompt[]> {
    const allPrompts = Array.from(this.prompts.values());
    return allPrompts.sort((a, b) => a.id - b.id);
  }
}

import { DatabaseStorage } from './database-storage';

export const storage = new DatabaseStorage();