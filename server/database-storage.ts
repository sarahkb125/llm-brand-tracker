import { 
  Topic, InsertTopic, 
  Prompt, InsertPrompt, PromptWithTopic,
  Response, InsertResponse, ResponseWithPrompt,
  Competitor, InsertCompetitor,
  Source, InsertSource,
  Analytics, InsertAnalytics,
  TopicAnalysis, CompetitorAnalysis, SourceAnalysis,
  topics, prompts, responses, competitors, sources, analytics
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeBasicData();
  }

  private async initializeBasicData() {
    // Check if topics exist, if not initialize them
    const existingTopics = await this.getTopics();
    if (existingTopics.length === 0) {
      await this.initializeTopics();
      await this.initializeCompetitors();
      await this.initializeSources();
    }
  }

  private async initializeTopics() {
    // Don't pre-populate topics - they will be created dynamically during analysis
    // This makes the system flexible and based on actual analysis needs
  }

  private async initializeCompetitors() {
    // Don't pre-populate competitors - they will be discovered during analysis
    // This makes the system dynamic and based on actual analysis results
  }

  private async initializeSources() {
    // Initialize with empty sources - they'll be populated during analysis
  }

  // Topics
  async getTopics(): Promise<Topic[]> {
    return await db.select().from(topics);
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [created] = await db.insert(topics).values(topic).returning();
    return created;
  }

  async getTopicById(id: number): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    return topic || undefined;
  }

  // Prompts
  async getPrompts(): Promise<Prompt[]> {
    return await db.select().from(prompts);
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const [created] = await db.insert(prompts).values(prompt).returning();
    return created;
  }

  async getPromptById(id: number): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt || undefined;
  }

  async getPromptsWithTopics(): Promise<PromptWithTopic[]> {
    const results = await db
      .select()
      .from(prompts)
      .leftJoin(topics, eq(prompts.topicId, topics.id));
    
    return results.map(result => ({
      ...result.prompts,
      topic: result.topics
    }));
  }

  async getPromptsByTopic(topicId: number): Promise<Prompt[]> {
    return await db.select().from(prompts).where(eq(prompts.topicId, topicId));
  }

  // Responses
  async getResponses(): Promise<Response[]> {
    return await db.select().from(responses);
  }

  async createResponse(response: InsertResponse): Promise<Response> {
    const [created] = await db.insert(responses).values(response).returning();
    return created;
  }

  async getResponseById(id: number): Promise<Response | undefined> {
    const [response] = await db.select().from(responses).where(eq(responses.id, id));
    return response || undefined;
  }

  async getResponsesWithPrompts(): Promise<ResponseWithPrompt[]> {
    const results = await db
      .select()
      .from(responses)
      .leftJoin(prompts, eq(responses.promptId, prompts.id))
      .leftJoin(topics, eq(prompts.topicId, topics.id));
    
    return results.map(result => ({
      ...result.responses,
      prompt: {
        ...result.prompts!,
        topic: result.topics
      }
    }));
  }

  async getRecentResponses(limit = 10): Promise<ResponseWithPrompt[]> {
    // For large limits, don't apply database limit to avoid performance issues
    const query = db
      .select()
      .from(responses)
      .leftJoin(prompts, eq(responses.promptId, prompts.id))
      .leftJoin(topics, eq(prompts.topicId, topics.id))
      .orderBy(desc(responses.createdAt));
    
    const results = limit > 1000 ? await query : await query.limit(limit);
    
    return results.map(result => ({
      ...result.responses,
      prompt: {
        ...result.prompts!,
        topic: result.topics
      }
    }));
  }

  // Competitors
  async getCompetitors(): Promise<Competitor[]> {
    return await db.select().from(competitors);
  }

  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const [created] = await db.insert(competitors).values(competitor).returning();
    return created;
  }

  async getCompetitorByName(name: string): Promise<Competitor | undefined> {
    const [competitor] = await db.select().from(competitors).where(eq(competitors.name, name));
    return competitor || undefined;
  }

  async updateCompetitorMentionCount(name: string, increment: number): Promise<void> {
    await db
      .update(competitors)
      .set({ mentionCount: sql`${competitors.mentionCount} + ${increment}` })
      .where(eq(competitors.name, name));
  }

  // Sources
  async getSources(): Promise<Source[]> {
    return await db.select().from(sources);
  }

  async createSource(source: InsertSource): Promise<Source> {
    const [created] = await db.insert(sources).values(source).returning();
    return created;
  }

  async getSourceByDomain(domain: string): Promise<Source | undefined> {
    const [source] = await db.select().from(sources).where(eq(sources.domain, domain));
    return source || undefined;
  }

  async updateSourceCitationCount(domain: string, increment: number): Promise<void> {
    await db
      .update(sources)
      .set({ citationCount: sql`${sources.citationCount} + ${increment}` })
      .where(eq(sources.domain, domain));
  }

  // Analytics
  async getLatestAnalytics(): Promise<Analytics | undefined> {
    const [latestAnalytics] = await db
      .select()
      .from(analytics)
      .orderBy(desc(analytics.date))
      .limit(1);
    return latestAnalytics || undefined;
  }

  async createAnalytics(analyticsData: InsertAnalytics): Promise<Analytics> {
    const [created] = await db.insert(analytics).values(analyticsData).returning();
    return created;
  }

  // Analysis methods
  async getTopicAnalysis(): Promise<TopicAnalysis[]> {
    const results = await db
      .select({
        topicId: topics.id,
        topicName: topics.name,
        totalPrompts: count(prompts.id),
        brandMentions: sql<number>`count(case when ${responses.brandMentioned} = true then 1 end)`,
      })
      .from(topics)
      .leftJoin(prompts, eq(topics.id, prompts.topicId))
      .leftJoin(responses, eq(prompts.id, responses.promptId))
      .groupBy(topics.id, topics.name);

    return results.map(result => ({
      topicId: result.topicId,
      topicName: result.topicName,
      totalPrompts: result.totalPrompts,
      brandMentions: result.brandMentions,
      mentionRate: result.totalPrompts > 0 ? (result.brandMentions / result.totalPrompts) * 100 : 0
    }));
  }

  async getCompetitorAnalysis(): Promise<CompetitorAnalysis[]> {
    const competitorList = await this.getCompetitors();
    const totalResponses = (await this.getResponses()).length;

    return competitorList.map(competitor => ({
      competitorId: competitor.id,
      name: competitor.name,
      category: competitor.category,
      mentionCount: competitor.mentionCount || 0,
      mentionRate: totalResponses > 0 ? ((competitor.mentionCount || 0) / totalResponses) * 100 : 0,
      changeRate: 0 // This would need historical data to calculate
    }));
  }

  async getSourceAnalysis(): Promise<SourceAnalysis[]> {
    const sourceList = await this.getSources();
    return sourceList.map(source => ({
      sourceId: source.id,
      domain: source.domain,
      citationCount: source.citationCount || 0,
      urls: [source.url]
    }));
  }

  // Latest analysis results only
  async getLatestResponses(): Promise<ResponseWithPrompt[]> {
    return await this.getRecentResponses(1000); // Increased from 50 to 1000
  }

  async getLatestPrompts(): Promise<Prompt[]> {
    return await db.select().from(prompts).orderBy(desc(prompts.createdAt));
  }

  // Data clearing methods
  async clearAllPrompts(): Promise<void> {
    await db.delete(responses); // Delete responses first due to foreign key
    await db.delete(prompts);
  }

  async clearAllResponses(): Promise<void> {
    await db.delete(responses);
  }

  async clearAllCompetitors(): Promise<void> {
    console.log(`[${new Date().toISOString()}] DatabaseStorage: Clearing all competitors...`);
    await db.delete(competitors);
    console.log(`[${new Date().toISOString()}] DatabaseStorage: All competitors cleared successfully`);
  }
}