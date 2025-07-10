import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzer, BrandAnalyzer, stopCurrentAnalysis, getCurrentProgress } from "./services/analyzer";
import { generatePromptsForTopic } from "./services/openai";
import { insertPromptSchema, insertResponseSchema } from "@shared/schema";

// Store active analysis sessions
const analysisProgress = new Map<string, any>();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Test analysis endpoint - process just one prompt
  app.post("/api/test-analysis", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      console.log(`[${new Date().toISOString()}] Testing analysis with prompt: ${prompt}`);
      
      const { analyzePromptResponse } = await import('./services/openai');
      const result = await analyzePromptResponse(prompt);
      
      console.log(`[${new Date().toISOString()}] Test analysis completed successfully`);
      
      res.json({ 
        success: true, 
        result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Test analysis failed:`, error);
      res.status(500).json({ 
        error: "Test analysis failed", 
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test endpoint for debugging
  app.get("/api/test", async (req, res) => {
    try {
      res.json({ 
        success: true, 
        message: "Server is running",
        timestamp: new Date().toISOString(),
        env: {
          hasOpenAIKey: !!(process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR),
          nodeEnv: process.env.NODE_ENV
        }
      });
    } catch (error) {
      console.error("Error in test endpoint:", error);
      res.status(500).json({ error: "Test endpoint failed" });
    }
  });

  // Overview metrics endpoint
  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await analyzer.getOverviewMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // Total counts endpoint for accurate statistics
  app.get("/api/counts", async (req, res) => {
    try {
      const allResponses = await storage.getResponsesWithPrompts();
      const allPrompts = await storage.getPrompts();
      const allTopics = await storage.getTopics();
      const allCompetitors = await storage.getCompetitors();
      const allSources = await storage.getSources();
      
      res.json({
        totalResponses: allResponses.length,
        totalPrompts: allPrompts.length,
        totalTopics: allTopics.length,
        totalCompetitors: allCompetitors.length,
        totalSources: allSources.length,
        brandMentions: allResponses.filter(r => r.brandMentioned).length,
        brandMentionRate: allResponses.length > 0 ? (allResponses.filter(r => r.brandMentioned).length / allResponses.length) * 100 : 0
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
      res.status(500).json({ error: "Failed to fetch counts" });
    }
  });

  // Topic analysis endpoint
  app.get("/api/topics", async (req, res) => {
    try {
      const topics = await storage.getTopics();
      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ error: "Failed to fetch topics" });
    }
  });

  app.get("/api/topics/analysis", async (req, res) => {
    try {
      const analysis = await analyzer.getTopicAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching topic analysis:", error);
      res.status(500).json({ error: "Failed to fetch topic analysis" });
    }
  });

  // Competitor analysis endpoint
  app.get("/api/competitors", async (req, res) => {
    try {
      const competitors = await storage.getCompetitors();
      res.json(competitors);
    } catch (error) {
      console.error("Error fetching competitors:", error);
      res.status(500).json({ error: "Failed to fetch competitors" });
    }
  });

  app.get("/api/competitors/analysis", async (req, res) => {
    try {
      const analysis = await analyzer.getCompetitorAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching competitor analysis:", error);
      res.status(500).json({ error: "Failed to fetch competitor analysis" });
    }
  });

  // Sources endpoints
  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getSources();
      res.json(sources);
    } catch (error) {
      console.error("Error fetching sources:", error);
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.get("/api/sources/analysis", async (req, res) => {
    try {
      const analysis = await analyzer.getSourceAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching source analysis:", error);
      res.status(500).json({ error: "Failed to fetch source analysis" });
    }
  });

  // Prompts endpoint - shows only latest analysis prompts
  app.get("/api/prompts", async (req, res) => {
    try {
      const latestPrompts = await storage.getLatestPrompts();
      // Add topic information to each prompt
      const promptsWithTopics = await Promise.all(
        latestPrompts.map(async (prompt) => {
          const topic = prompt.topicId ? await storage.getTopicById(prompt.topicId) : null;
          return { ...prompt, topic };
        })
      );
      res.json(promptsWithTopics);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({ error: "Failed to fetch prompts" });
    }
  });

  // Prompt results endpoints - supports full dataset access
  app.get("/api/responses", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const useFullDataset = req.query.full === 'true' || limit > 100;
      
      let responses;
      if (useFullDataset) {
        // Get full dataset for large requests or when explicitly requested
        responses = await storage.getResponsesWithPrompts();
      } else {
        // Get limited dataset for smaller requests
        responses = await storage.getLatestResponses();
      }
      
      res.json(responses.slice(0, limit));
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  app.get("/api/responses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const response = await storage.getResponseById(id);
      if (!response) {
        return res.status(404).json({ error: "Response not found" });
      }
      res.json(response);
    } catch (error) {
      console.error("Error fetching response:", error);
      res.status(500).json({ error: "Failed to fetch response" });
    }
  });

  // Manual prompt testing
  app.post("/api/prompts/test", async (req, res) => {
    try {
      const { text, topicId } = insertPromptSchema.parse(req.body);
      
      // Create prompt
      const prompt = await storage.createPrompt({ text, topicId });
      
      // Test with analyzer (this will create the response automatically)
      const testAnalyzer = new BrandAnalyzer();
      // Note: In a real implementation, you'd want to test just this single prompt
      // For now, we'll return the created prompt
      
      res.json({ 
        success: true, 
        prompt,
        message: "Prompt queued for testing" 
      });
    } catch (error) {
      console.error("Error testing prompt:", error);
      res.status(500).json({ error: "Failed to test prompt" });
    }
  });

  // Data management endpoints
  app.post("/api/data/clear", async (req, res) => {
    try {
      const { type } = req.body;
      
      if (type === 'all') {
        await storage.clearAllPrompts();
        await storage.clearAllResponses();
        await storage.clearAllCompetitors();
        res.json({ success: true, message: "All data cleared successfully" });
      } else if (type === 'prompts') {
        await storage.clearAllPrompts();
        res.json({ success: true, message: "All prompts cleared successfully" });
      } else if (type === 'responses') {
        await storage.clearAllResponses();
        res.json({ success: true, message: "All responses cleared successfully" });
      } else {
        res.status(400).json({ error: "Invalid type. Use 'all', 'prompts', or 'responses'" });
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Test endpoint to verify server is working
  app.get("/api/test", (req, res) => {
    console.log(`[${new Date().toISOString()}] /api/test endpoint called`);
    res.json({ message: "Server is working", timestamp: new Date().toISOString() });
  });

  // New prompt generator endpoints
  app.post("/api/analyze-brand", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log(`[${new Date().toISOString()}] Analyzing brand URL: ${url}`);

      // Use OpenAI to analyze the brand and find competitors
      const { analyzeBrandAndFindCompetitors } = await import("./services/openai");
      const competitors = await analyzeBrandAndFindCompetitors(url);
      
      console.log(`[${new Date().toISOString()}] Found ${competitors.length} competitors for ${url}`);

      res.json({ competitors });
    } catch (error) {
      console.error("Error analyzing brand:", error);
      res.status(500).json({ error: "Failed to analyze brand" });
    }
  });

  app.post("/api/generate-prompts", async (req, res) => {
    try {
      const { brandUrl, competitors, settings } = req.body;
      
      if (!brandUrl || !competitors || !settings) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Generate diverse topics and prompts using OpenAI
      const { generatePromptsForTopic } = await import("./services/openai");

      // Get existing topics from database or generate new ones dynamically
      const existingTopics = await storage.getTopics();
      
      let topics;
      if (existingTopics.length >= settings.numberOfTopics) {
        // Use existing topics
        topics = existingTopics.slice(0, settings.numberOfTopics).map(topic => ({
          name: topic.name,
          description: topic.description || `Questions about ${topic.name.toLowerCase()}`
        }));
      } else {
        // Generate new topics dynamically based on brand analysis
        const { generateDynamicTopics } = await import("./services/openai");
        const newTopics = await generateDynamicTopics(
          brandUrl, 
          settings.numberOfTopics - existingTopics.length,
          competitors.map((c: any) => c.name)
        );
        
        topics = [
          ...existingTopics.map(topic => ({
            name: topic.name,
            description: topic.description || `Questions about ${topic.name.toLowerCase()}`
          })),
          ...newTopics
        ];
      }

      // Generate prompts for each topic
      const topicsWithPrompts = [];
      
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        console.log(`[${new Date().toISOString()}] Generating prompts for topic ${i + 1}/${topics.length}: ${topic.name}`);
        
        try {
          const prompts = await generatePromptsForTopic(
            topic.name, 
            topic.description, 
            settings.promptsPerTopic,
            competitors.map((c: any) => c.name)
          );
          
          console.log(`[${new Date().toISOString()}] Generated ${prompts.length} prompts for topic: ${topic.name}`);
          
          topicsWithPrompts.push({
            name: topic.name,
            description: topic.description,
            prompts
          });
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error generating prompts for topic ${topic.name}:`, error);
          // Add empty prompts array to continue with other topics
          topicsWithPrompts.push({
            name: topic.name,
            description: topic.description,
            prompts: []
          });
        }
      }

      res.json({ topics: topicsWithPrompts });
    } catch (error) {
      console.error("Error generating prompts:", error);
      res.status(500).json({ error: "Failed to generate prompts" });
    }
  });

  app.post("/api/save-and-analyze", async (req, res) => {
    try {
      const { topics } = req.body;
      
      if (!topics || !Array.isArray(topics)) {
        return res.status(400).json({ error: "Topics array is required" });
      }

      // Clear existing prompts and create new ones
      const allPrompts = [];
      
      for (const topic of topics) {
        // Create or find topic
        let topicRecord = await storage.getTopics().then(topics => 
          topics.find(t => t.name === topic.name)
        );
        
        if (!topicRecord) {
          topicRecord = await storage.createTopic({
            name: topic.name,
            description: topic.description
          });
        }

        // Create prompts for this topic
        for (const promptText of topic.prompts) {
          const prompt = await storage.createPrompt({
            text: promptText,
            topicId: topicRecord.id
          });
          allPrompts.push(prompt);
        }
      }

      // Start new analysis with the saved prompts
      const sessionId = `analysis_${Date.now()}`;
      const analysisWorker = new BrandAnalyzer((progress) => {
        analysisProgress.set(sessionId, progress);
      });
      
      // Clear existing responses to ensure fresh analysis with new prompts
      await storage.clearAllResponses();
      
      analysisWorker.runFullAnalysis(false, allPrompts).catch(error => {
        console.error("Analysis failed:", error);
        analysisProgress.set(sessionId, {
          status: 'error',
          message: `Analysis failed: ${error.message}`,
          progress: 0
        });
      });

      res.json({ 
        success: true, 
        message: "Prompts saved and analysis started",
        promptCount: allPrompts.length 
      });
    } catch (error) {
      console.error("Error saving prompts and starting analysis:", error);
      res.status(500).json({ error: "Failed to save prompts and start analysis" });
    }
  });

  // Start full analysis
  app.post("/api/analysis/start", async (req, res) => {
    try {
      const { settings } = req.body;
      const sessionId = `analysis_${Date.now()}`;
      
      // Check if we have recent prompts to use
      const existingPrompts = await storage.getPrompts();
      const useExistingPrompts = existingPrompts.length > 0;
      
      // Start analysis in background
      const analysisWorker = new BrandAnalyzer((progress) => {
        analysisProgress.set(sessionId, progress);
      });
      
      // Don't await - run in background
      analysisWorker.runFullAnalysis(useExistingPrompts, undefined, settings).catch(error => {
        console.error("Analysis failed:", error);
        analysisProgress.set(sessionId, {
          status: 'error',
          message: error.message,
          progress: 0
        });
      });
      
      const totalPrompts = settings ? settings.promptsPerTopic * settings.numberOfTopics : 100;
      res.json({ 
        success: true, 
        sessionId,
        message: useExistingPrompts ? "Analysis started with saved prompts" : `Analysis started with ${totalPrompts} new prompts` 
      });
    } catch (error) {
      console.error("Error starting analysis:", error);
      res.status(500).json({ error: "Failed to start analysis" });
    }
  });

  // Get analysis progress
  app.get("/api/analysis/:sessionId/progress", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const progress = analysisProgress.get(sessionId);
      
      if (!progress) {
        return res.status(404).json({ error: "Analysis session not found" });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching analysis progress:", error);
      res.status(500).json({ error: "Failed to fetch analysis progress" });
    }
  });

  // Settings - Save OpenAI API Key
  app.post("/api/settings/openai-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) {
        return res.status(400).json({ error: "Invalid API key format" });
      }

      // Test the API key by making a simple request
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!testResponse.ok) {
        return res.status(400).json({ error: "Invalid API key or OpenAI service unavailable" });
      }

      // Store the API key in environment (in production, use secure storage)
      process.env.OPENAI_API_KEY = apiKey;
      
      res.json({ success: true, message: "API key saved and validated" });
    } catch (error) {
      console.error("Error saving API key:", error);
      res.status(500).json({ error: "Failed to save API key" });
    }
  });

  // Settings - Save Analysis Configuration
  app.post("/api/settings/analysis-config", async (req, res) => {
    try {
      const { promptsPerTopic, analysisFrequency } = req.body;
      
      if (!promptsPerTopic || typeof promptsPerTopic !== 'number' || promptsPerTopic < 1 || promptsPerTopic > 20) {
        return res.status(400).json({ error: "Invalid prompts per topic value" });
      }

      if (!analysisFrequency || !['manual', 'daily', 'weekly', 'monthly'].includes(analysisFrequency)) {
        return res.status(400).json({ error: "Invalid analysis frequency value" });
      }

      // Store configuration in environment variables (in production, use secure storage)
      process.env.PROMPTS_PER_TOPIC = promptsPerTopic.toString();
      process.env.ANALYSIS_FREQUENCY = analysisFrequency;
      
      res.json({ success: true, message: "Analysis configuration saved successfully" });
    } catch (error) {
      console.error("Error saving analysis config:", error);
      res.status(500).json({ error: "Failed to save analysis configuration" });
    }
  });

  // Analysis Progress - Get current progress
  app.get("/api/analysis/progress", async (req, res) => {
    try {
      const { getCurrentProgress } = await import('./services/analyzer');
      const progress = await getCurrentProgress();
      res.json(progress);
    } catch (error) {
      console.error("Error fetching analysis progress:", error);
      res.status(500).json({ error: "Failed to fetch analysis progress" });
    }
  });

  // Cancel analysis
  app.post("/api/analysis/cancel", async (req, res) => {
    try {
      const { stopCurrentAnalysis } = await import('./services/analyzer');
      stopCurrentAnalysis();
      res.json({ 
        success: true, 
        message: "Analysis cancelled successfully" 
      });
    } catch (error) {
      console.error("Error cancelling analysis:", error);
      res.status(500).json({ error: "Failed to cancel analysis" });
    }
  });

  // Analysis Progress - Start new analysis
  app.post("/api/analysis/start", async (req, res) => {
    try {
      const { brandName, brandUrl } = req.body;
      
      if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
        return res.status(400).json({ error: "Brand name is required" });
      }

      // Initialize new analysis with the brand analyzer
      const progressCallback = (progress: any) => {
        // In a real implementation, this would broadcast progress via WebSocket
        console.log('Analysis progress:', progress);
      };

      // Start analysis in background
      setTimeout(async () => {
        try {
          const { analyzer } = await import('./services/analyzer');
          analyzer.progressCallback = progressCallback;
          analyzer.setBrandName(brandName.trim());
          if (brandUrl) {
            analyzer.setBrandUrl(brandUrl.trim());
          }
          await analyzer.runFullAnalysis();
        } catch (error) {
          console.error('Analysis failed:', error);
        }
      }, 100);

      res.json({ 
        success: true, 
        message: "Analysis started successfully",
        status: 'initializing'
      });
    } catch (error) {
      console.error("Error starting analysis:", error);
      res.status(500).json({ error: "Failed to start analysis" });
    }
  });

  // Export data
  app.get("/api/export", async (req, res) => {
    try {
      const topics = await storage.getTopics();
      const prompts = await storage.getPrompts();
      const responses = await storage.getResponses();
      const competitors = await storage.getCompetitors();
      const sources = await storage.getSources();
      const analytics = await storage.getLatestAnalytics();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        analytics,
        topics,
        prompts,
        responses,
        competitors,
        sources
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="my-brand-analysis-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Generate prompts for a single custom topic
  app.post('/api/generate-topic-prompts', async (req, res) => {
    try {
      const { topicName, topicDescription, competitors, promptCount } = req.body;
      
      if (!topicName || !topicDescription) {
        return res.status(400).json({ error: 'Topic name and description are required' });
      }

      const competitorNames = competitors?.map((c: any) => c.name) || [];
      const prompts = await generatePromptsForTopic(
        topicName,
        topicDescription,
        promptCount || 5,
        competitorNames
      );

      res.json({ prompts });
    } catch (error) {
      console.error('Error generating topic prompts:', error);
      res.status(500).json({ error: 'Failed to generate topic prompts' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
