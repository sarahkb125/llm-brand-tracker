import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  topicId: integer("topic_id").references(() => topics.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  promptId: integer("prompt_id").references(() => prompts.id).notNull(),
  text: text("text").notNull(),
  brandMentioned: boolean("brand_mentioned").default(false),
  competitorsMentioned: text("competitors_mentioned").array(),
  sources: text("sources").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitors = pgTable("competitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category"),
  mentionCount: integer("mention_count").default(0),
  lastMentioned: timestamp("last_mentioned"),
});

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  citationCount: integer("citation_count").default(0),
  lastCited: timestamp("last_cited"),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow(),
  totalPrompts: integer("total_prompts").default(0),
  brandMentionRate: real("brand_mention_rate").default(0),
  topCompetitor: text("top_competitor"),
  totalSources: integer("total_sources").default(0),
  totalDomains: integer("total_domains").default(0),
});

// Insert schemas
export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
  createdAt: true,
});

export const insertCompetitorSchema = createInsertSchema(competitors).omit({
  id: true,
  lastMentioned: true,
});

export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
  lastCited: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  date: true,
});

// Types
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;

export type Response = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;

export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;

export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;

// Extended types for API responses
export type PromptWithTopic = Prompt & { topic: Topic | null };
export type ResponseWithPrompt = Response & { prompt: PromptWithTopic };

export type TopicAnalysis = {
  topicId: number;
  topicName: string;
  mentionRate: number;
  totalPrompts: number;
  brandMentions: number;
};

export type CompetitorAnalysis = {
  competitorId: number;
  name: string;
  category: string | null;
  mentionCount: number;
  mentionRate: number;
  changeRate: number;
};

export type SourceAnalysis = {
  sourceId: number;
  domain: string;
  citationCount: number;
  urls: string[];
};
