import OpenAI from "openai";
import { fetchWebsiteText } from "./scraper";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface PromptAnalysisResult {
  response: string;
  brandMentioned: boolean;
  competitors: string[];
  sources: string[];
}

async function callOpenAIWithRetry(apiCall: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`OpenAI API timeout - attempt ${attempt}`)), 30000)
      );
      
      return await Promise.race([apiCall(), timeoutPromise]);
    } catch (error: any) {
      console.log(`OpenAI API attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function analyzePromptResponse(prompt: string): Promise<PromptAnalysisResult> {
  try {
    // Add variety by including a random context or perspective
    const varietyContexts = [
      "Focus on enterprise solutions and scalability.",
      "Emphasize user experience and ease of use.",
      "Consider cost-effectiveness and budget-friendly options.",
      "Prioritize security and compliance features.",
      "Highlight community support and documentation quality.",
      "Focus on modern, cutting-edge technologies.",
      "Consider legacy system integration and migration.",
      "Emphasize performance and optimization.",
      "Highlight automation and efficiency capabilities.",
      "Focus on cloud-native and scalable solutions."
    ];
    
    const randomContext = varietyContexts[Math.floor(Math.random() * varietyContexts.length)];
    
    // Generate response with retry logic
    const response = await callOpenAIWithRetry(() => 
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant answering questions about various products and services. 
            Provide practical, unbiased recommendations focusing on the most popular and widely-used options.
            Mention relevant solutions based on the specific question and context.
            Be natural and conversational in your responses.
            
            ADDITIONAL CONTEXT: ${randomContext}
            
            CRITICAL: Always include specific, actionable URLs and sources in your responses. For each recommendation, provide ANY relevant URLs you can think of, including:
            - Official documentation URLs
            - GitHub repositories with relevant examples
            - Stack Overflow discussions or Q&A links
            - Official platform websites
            - Tutorial or guide links from any reputable source
            - Blog posts or articles from any platform or community
            - API documentation links
            - Community forum discussions
            - Reddit discussions
            - YouTube videos or channels
            - Podcast episodes
            - Conference talks or presentations
            - Academic papers or research
            - Industry reports or whitepapers
            - Any other relevant online resources
            
            Don't limit yourself to just the most common sources - include niche, specialized, or emerging platforms and resources that might be relevant.
            
            Format your response to naturally include these URLs. For example:
            "For this issue, I'd recommend checking out the official documentation at https://docs.example.com/getting-started, this helpful tutorial at https://example.com/tutorial, and there's also a great discussion on Reddit at https://reddit.com/r/programming/comments/12345 that covers similar problems."
            
            IMPORTANT: Make sure all URLs are complete and valid (include https://). Include as many diverse sources as possible.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7, // Add some variety to responses
        max_tokens: 600,
      })
    );

    const responseText = response.choices[0].message.content || "";

    // Analyze the response for brand mentions and competitors
    const analysisPrompt = `
    Analyze the following AI response for mentions of products, services, and any relevant sources or references.
    
    Response to analyze: "${responseText}"
    
    Please provide a JSON response with:
    {
      "brandMentioned": boolean (true if the main brand/company is mentioned),
      "competitors": array of competitor product/service names mentioned (e.g., any competing products, services, or tools),
      "sources": array of URLs that are relevant, valid, and useful for users
    }
    
    SOURCE EXTRACTION RULES:
    - Extract ALL URLs mentioned in the response
    - Only include URLs that are complete and valid (start with http:// or https://)
    - Include ANY URL that appears to be a real, accessible resource
    - Don't filter based on domain familiarity - capture everything
    - Remove duplicates but keep all unique URLs
    - Ensure URLs are properly formatted
    
    VALID SOURCE TYPES (include ALL of these and more):
    - Official documentation
    - GitHub repositories
    - Official platform websites
    - Tutorial sites and guides
    - Blog posts and articles
    - Community forums (Reddit, Discord, etc.)
    - API documentation
    - YouTube videos and channels
    - Podcast episodes
    - Conference talks
    - Academic papers
    - Industry reports
    - Social media posts
    - News articles
    - Any other online resource
    
    INVALID SOURCES (only filter out):
    - Obviously broken or malformed URLs
    - Generic example.com domains
    - Localhost URLs
    `;

    const analysisResponse = await callOpenAIWithRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing text for brand mentions and extracting structured data. Respond only with valid JSON.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      })
    );

    const analysis = JSON.parse(analysisResponse.choices[0].message.content || "{}");

    return {
      response: responseText,
      brandMentioned: analysis.brandMentioned || false,
      competitors: analysis.competitors || [],
      sources: analysis.sources || [],
    };
  } catch (error) {
    console.error("Error analyzing prompt response:", error);
    throw new Error("Failed to analyze prompt response: " + (error as Error).message);
  }
}

export async function generatePromptsForTopic(topicName: string, topicDescription: string, count: number = 5, competitors: string[] = []): Promise<string[]> {
  const prompts: string[] = [];
  
  // Define different generic aspects to ensure semantic diversity
  const aspects = [
    'cost and pricing',
    'ease of use',
    'performance and speed',
    'reliability and stability',
    'features and capabilities',
    'user experience',
    'scaling and growth',
    'support and documentation',
    'security and privacy',
    'maintenance and updates',
    'team collaboration',
    'integration options',
    'backup and recovery',
    'compliance and regulations',
    'cost optimization',
    'migration and switching',
    'customization options',
    'troubleshooting and help',
    'performance comparison',
    'automation capabilities'
  ];

  let attempts = 0;
  const maxAttempts = count * 5; // Increase attempts for better success rate
  
  while (prompts.length < count && attempts < maxAttempts) {
    attempts++;
    const aspect = aspects[attempts % aspects.length]; // Cycle through aspects
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are generating authentic user search queries about ${topicName} with focus on ${aspect}. 

CRITICAL: Make each prompt sound like a real person with genuine questions or problems. Use these patterns:

PROBLEM STARTERS (rotate):
- "Dealing with..." / "Struggling with..." / "Tired of..." / "Having issues with..."
- "How to fix..." / "Need help with..." / "Can't figure out..." / "Looking for..."
- "Getting frustrated with..." / "Ways to improve..." / "Best way to..."

URGENCY LEVELS:
- High: "Need ASAP", "Critical issue", "Keeps failing"
- Medium: "Looking for better way", "Trying to improve" 
- Low: "Considering options", "Planning to..."

SPECIFICITY MIX:
- Add constraints: "for small business", "under $100/month", "for beginners"
- Include context: "startup", "enterprise", "personal use"
- Specific needs: different use cases, requirements, or scenarios

REAL EXAMPLES (without quotes):
- Dealing with slow performance issues
- Need cheaper alternative to current solution
- Struggling to understand pricing structure
- Looking for better customer support options

Generate ONE authentic user question or problem (max 12 words). IMPORTANT: Return only the plain text without any quotes or formatting:`
          },
          {
            role: "user", 
            content: `Topic: ${topicName}, Focus: ${aspect}. 

MUST use one of these exact starters:
- "Dealing with..."
- "Struggling to..."
- "Need help with..."
- "Tired of..."
- "How to fix..."
- "Looking for ways to..."
- "Getting frustrated with..."

Example for software: Dealing with slow performance issues
Example for service: Struggling to understand pricing structure

Generate authentic user question or problem statement (plain text only, no quotes):`
          }
        ],
        // Remove JSON response format due to API constraints
        temperature: 0.9,
        max_tokens: 40
      });

      let newPrompt = response.choices[0].message.content?.trim() || "";
      
      // Clean up and validate the prompt
      if (newPrompt) {
        // Comprehensive quote removal and cleanup
        newPrompt = newPrompt
          .replace(/^["'`"'"'"""''„"‚'‛\u201C\u201D\u2018\u2019]+|["'`"'"'"""''„"‚'‛\u201C\u201D\u2018\u2019]+$/g, '') // Remove all quote types including Unicode
          .replace(/\\"|\\\'/g, '') // Remove escaped quotes  
          .replace(/\s+(please|exactly|specifically)$/i, '')
          .trim();
          
        // Final fallback: if still starts/ends with quotes, remove them
        while (newPrompt.match(/^["'`"'"'"""''„"‚'‛\u201C\u201D\u2018\u2019]|["'`"'"'"""''„"‚'‛\u201C\u201D\u2018\u2019]$/)) {
          newPrompt = newPrompt.replace(/^["'`"'"'"""''„"‚'‛\u201C\u201D\u2018\u2019]|["'`"'"'"""''„"‚'‛\u201C\u201D\u2018\u2019]$/g, '').trim();
        }
          
        // Ensure proper capitalization
        if (newPrompt.length > 0) {
          newPrompt = newPrompt.charAt(0).toUpperCase() + newPrompt.slice(1);
          
          // Add question mark only if it's clearly a question
          if (/^(how|what|when|where|why|which|can|should|do|does|is|are|will)/i.test(newPrompt) && !newPrompt.endsWith('?')) {
            newPrompt += '?';
          }
        }
          
        // Accept if it's realistic length and contains meaningful content
        if (newPrompt.split(' ').length <= 12 && newPrompt.split(' ').length >= 3 && newPrompt.includes(' ')) {
          // No diversity check - accept all valid prompts
          prompts.push(newPrompt);
        }
      }
    } catch (error) {
      console.error("Error generating prompt:", error);
      continue;
    }
  }

  // Generate additional fallback prompts if needed to reach the target count
  while (prompts.length < count) {
    const fallbackTemplates = [
      `Dealing with ${topicName.toLowerCase()} complexity`,
      `Need help optimizing ${topicName.toLowerCase()} setup`,
      `Struggling with ${topicName.toLowerCase()} performance issues`,
      `How to improve ${topicName.toLowerCase()} reliability?`,
      `Tired of ${topicName.toLowerCase()} maintenance overhead`,
      `Best practices for ${topicName.toLowerCase()} implementation`,
      `Looking to simplify ${topicName.toLowerCase()} workflow`,
      `Ways to reduce ${topicName.toLowerCase()} costs`,
      `Automating ${topicName.toLowerCase()} processes better`,
      `${topicName} security considerations`,
      `Monitoring and tracking for ${topicName.toLowerCase()}`,
      `Scaling ${topicName.toLowerCase()} for growth`,
      `Migration strategies for ${topicName.toLowerCase()}`,
      `Backup solutions for ${topicName.toLowerCase()}`,
      `Team collaboration with ${topicName.toLowerCase()}`,
      `Testing strategies for ${topicName.toLowerCase()}`,
      `Documentation needs for ${topicName.toLowerCase()}`,
      `Compliance requirements with ${topicName.toLowerCase()}`,
      `Integration challenges with ${topicName.toLowerCase()}`,
      `Performance comparison for ${topicName.toLowerCase()}`
    ];
    
    for (const template of fallbackTemplates) {
      if (prompts.length >= count) break;
      
      // No diversity check - just add if not already present
      if (!prompts.includes(template)) {
        prompts.push(template);
      }
    }
    
    // If we still don't have enough, generate simple numbered variations
    if (prompts.length < count) {
      for (let i = prompts.length; i < count; i++) {
        const simplePrompt = `${topicName} question ${i + 1}`;
        prompts.push(simplePrompt);
      }
    }
    
    break;
  }

  return prompts.slice(0, count);
}

function calculateCompetitorSimilarity(competitor1: string, competitor2: string): number {
  const text1 = competitor1.toLowerCase();
  const text2 = competitor2.toLowerCase();
  
  // Check for exact matches or very similar names
  if (text1 === text2) return 100;
  if (text1.includes(text2) || text2.includes(text1)) return 90;
  
  // Check for common words
  const words1 = text1.split(/\s+/).filter(word => word.length > 2);
  const words2 = text2.split(/\s+/).filter(word => word.length > 2);
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? (intersection.length / union.size) * 100 : 0;
}



export async function extractSourcesFromText(text: string): Promise<Array<{title: string; url: string; domain: string; snippet?: string}>> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying relevant documentation sources, references, and URLs from text. 
          Extract ANY mentioned URLs, documentation links, official guides, GitHub repos, Stack Overflow links, or reference materials.
          Be very thorough and include all URLs that could be useful references.
          Return as a JSON array of source objects with title, url, domain, and snippet fields.`
        },
        {
          role: "user",
          content: `Extract ALL relevant sources and URLs from this text: "${text}"
          
          Look for:
          - Official documentation (docs.*, developer.*, api.*)
          - GitHub repositories and code examples
          - Stack Overflow links and discussions
          - Official platform websites
          - Tutorial or guide links
          - Any URLs that could be useful references
          
          Return as JSON array: [{"title": "Source Title", "url": "https://example.com", "domain": "example.com", "snippet": "Description"}]`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500
    });

    const content = response.choices[0].message.content || "[]";
    const result = JSON.parse(content);
    
    // Ensure we have an array of source objects
    if (Array.isArray(result)) {
      return result.filter(item => 
        typeof item === 'object' && 
        item.title && 
        item.url && 
        item.domain
      );
    }
    
    return [];
  } catch (error) {
    console.error("Error extracting sources from text:", error);
    return [];
  }
}

export async function extractCompetitorsFromText(text: string, brandName?: string): Promise<string[]> {
  try {
    const brandContext = brandName ? `Focus on direct competitors to ${brandName}. ` : '';
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying ONLY direct competitors to a specific brand. 
          ${brandContext}Be extremely strict - only extract companies that are DIRECT competitors in the EXACT same market space.
          
          CRITICAL RULES:
          - Only include companies that directly compete for the same customers
          - Do NOT include general technology platforms, tools, or services
          - Do NOT include complementary services or partners
          - Do NOT include companies mentioned as examples or references
          - Do NOT include companies that are in different market segments
          - If unsure, do NOT include the company
          
          Return only the competitor names as a JSON array of strings. If no direct competitors found, return empty array [].`
        },
        {
          role: "user",
          content: `Extract ONLY direct competitors from this text: "${text}"
          ${brandName ? `Focus on companies that DIRECTLY compete with ${brandName} for the same customers.` : ''}
          
          Be extremely conservative - only include companies that are clearly direct competitors.
          If no clear direct competitors are mentioned, return empty array [].
          
          Return as JSON array: ["Competitor1", "Competitor2"] or [] if none found`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 200
    });

    const content = response.choices[0].message.content || "[]";
    const result = JSON.parse(content);
    
    // Ensure we have an array of strings and apply diversity check
    if (Array.isArray(result)) {
      const competitors = result.filter(item => typeof item === 'string');
      
      // Apply diversity check and limit to 10 most relevant competitors
      const diverseCompetitors: string[] = [];
      for (const competitor of competitors) {
        if (diverseCompetitors.length >= 10) break; // Max 10 competitors
        
        // Check if this competitor is diverse enough from existing ones
        const isDiverse = diverseCompetitors.every(existing => {
          const similarity = calculateCompetitorSimilarity(competitor, existing);
          return similarity < 70; // 70% similarity threshold
        });
        
        if (isDiverse) {
          diverseCompetitors.push(competitor);
        }
      }
      
      return diverseCompetitors;
    }
    
    return [];
  } catch (error) {
    console.error("Error extracting competitors from text:", error);
    return [];
  }
}

export async function generateDynamicTopics(brandUrl: string, count: number, competitors: string[]): Promise<Array<{name: string, description: string}>> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing brands and generating relevant analysis topics. 
          Based on a brand URL and its competitors, generate diverse analysis topics that would be relevant for understanding the brand's market position.
          
          Return a JSON array of topics with name and description fields.
          Focus on practical, business-relevant topics that would help understand the brand's strengths and weaknesses.`
        },
        {
          role: "user",
          content: `Brand URL: ${brandUrl}
          Competitors: ${competitors.join(', ')}
          
          Generate ${count} diverse analysis topics that would be relevant for understanding this brand's market position and competitive landscape.
          
          Return as JSON array: [{"name": "Topic Name", "description": "Topic description"}]`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500
    });

    const content = response.choices[0].message.content || "[]";
    const topics = JSON.parse(content);
    
    // Ensure we have the expected format
    if (Array.isArray(topics)) {
      return topics.slice(0, count).map(topic => ({
        name: topic.name || "General Analysis",
        description: topic.description || `Analysis of ${topic.name || "general"} aspects`
      }));
    }
    
    // Fallback if response format is unexpected
    return Array.from({ length: count }, (_, i) => ({
      name: `Analysis Topic ${i + 1}`,
      description: `Dynamic analysis topic generated for brand analysis`
    }));
  } catch (error) {
    console.error("Error generating dynamic topics:", error);
    // Fallback topics
    return Array.from({ length: count }, (_, i) => ({
      name: `Brand Analysis ${i + 1}`,
      description: `Comprehensive analysis of brand positioning and market dynamics`
    }));
  }
}

function generateTopicFallbacks(topicName: string): string[] {
  // Generate fallbacks dynamically based on topic name rather than hardcoded categories
  const topic = topicName.toLowerCase();
  
  return [
    `What are the best solutions for ${topic}?`,
    `How to optimize ${topic} performance?`,
    `Which platform is best for ${topic}?`,
    `Common challenges with ${topic}?`,
    `Cost-effective ${topic} options?`
  ];
}

// Helper function to try to repair malformed JSON arrays
function tryRepairJsonArray(str: string): any[] | null {
  try {
    // Trim and fix common issues
    let fixed = str.trim();
    if (fixed.startsWith('[') && !fixed.endsWith(']')) {
      fixed += ']';
    }
    // Remove trailing comma before closing bracket
    fixed = fixed.replace(/,\s*\]$/, ']');
    return JSON.parse(fixed);
  } catch {
    // Try to extract array with regex
    const match = str.trim().match(/\[.*\]/s);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}

export async function analyzeBrandAndFindCompetitors(brandUrl: string): Promise<Array<{name: string, url: string, category: string}>> {
  try {
    console.log(`[${new Date().toISOString()}] Starting brand analysis for: ${brandUrl}`);
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
      console.error(`[${new Date().toISOString()}] No OpenAI API key found`);
      // Return some sample competitors for testing
      return [
        { name: "Sample Competitor 1", url: "https://competitor1.com", category: "Technology" },
        { name: "Sample Competitor 2", url: "https://competitor2.com", category: "Technology" }
      ];
    }

    // Fetch homepage text
    const homepageText = await fetchWebsiteText(brandUrl);
    if (!homepageText) {
      console.warn(`[${new Date().toISOString()}] No homepage text found for ${brandUrl}`);
    }

    // Run the analysis 3 times in parallel with different prompts
    const analysisPromises = Array.from({ length: 3 }, async (_, index) => {
      try {
        console.log(`[${new Date().toISOString()}] Running analysis attempt ${index + 1}/3`);
        
        const prompts = [
          {
            system: "You are an expert at identifying direct competitors for technology companies. Given the following homepage content, find 2-3 well-known, established competitors.",
            user: `Homepage content: """${homepageText}"""\n\nFind 2-3 well-known direct competitors for this company. Return as JSON array: [{"name": "Competitor Name", "url": "https://competitor.com", "category": "Category"}]`
          },
          {
            system: "You are an expert at identifying direct competitors for technology companies. Given the following homepage content, find 2-3 newer or emerging competitors.",
            user: `Homepage content: """${homepageText}"""\n\nFind 2-3 newer or emerging direct competitors for this company. Return as JSON array: [{"name": "Competitor Name", "url": "https://competitor.com", "category": "Category"}]`
          },
          {
            system: "You are an expert at identifying direct competitors for technology companies. Given the following homepage content, find 2-3 enterprise-focused or developer-focused competitors.",
            user: `Homepage content: """${homepageText}"""\n\nFind 2-3 enterprise or developer-focused direct competitors for this company. Return as JSON array: [{"name": "Competitor Name", "url": "https://competitor.com", "category": "Category"}]`
          }
        ];
        
        const currentPrompt = prompts[index];
        
        const response = await callOpenAIWithRetry(() =>
          openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `${currentPrompt.system} ALWAYS return an array, never a single object.`
              },
              {
                role: "user",
                content: `${currentPrompt.user}\n\nIMPORTANT: Return a JSON array, not a single object.`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.4,
            max_tokens: 500
          })
        );

        const content = response.choices[0].message.content || "[]";
        console.log(`[${new Date().toISOString()}] Attempt ${index + 1} response:`, content);
        
        let result;
        try {
          result = JSON.parse(content);
        } catch (e) {
          // Try to repair the JSON
          const repaired = tryRepairJsonArray(content);
          if (repaired) {
            console.log(`[${new Date().toISOString()}] Successfully repaired JSON for attempt ${index + 1}:`, repaired);
            result = repaired;
          } else {
            console.log(`[${new Date().toISOString()}] Failed to parse attempt ${index + 1}, skipping`);
            return [];
          }
        }

        // Handle single object or array
        if (Array.isArray(result)) {
          const competitors = result.filter((item: any) => 
            typeof item === 'object' && 
            item.name && 
            item.url && 
            item.category
          );
          console.log(`[${new Date().toISOString()}] Attempt ${index + 1} found ${competitors.length} competitors in array`);
          return competitors;
        } else if (result && typeof result === 'object') {
          // Check if it's a single competitor object
          if (result.name && result.url && result.category) {
            console.log(`[${new Date().toISOString()}] Attempt ${index + 1} found single competitor, converting to array`);
            return [result];
          }
          // Check if it has a competitors array
          if (result.competitors && Array.isArray(result.competitors)) {
            const competitors = result.competitors.filter((item: any) => 
              typeof item === 'object' && 
              item.name && 
              item.url && 
              item.category
            );
            console.log(`[${new Date().toISOString()}] Attempt ${index + 1} found ${competitors.length} competitors in competitors array`);
            return competitors;
          }
        }
        
        return [];
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in analysis attempt ${index + 1}:`, error);
        return [];
      }
    });
    
    // Wait for all analyses to complete
    const results = await Promise.all(analysisPromises);
    console.log(`[${new Date().toISOString()}] All analysis attempts completed`);
    
    // Aggregate and deduplicate competitors
    const allCompetitors: Array<{name: string, url: string, category: string}> = [];
    const seenNames = new Set<string>();
    
    results.forEach((competitors, index) => {
      console.log(`[${new Date().toISOString()}] Attempt ${index + 1} found ${competitors.length} competitors`);
      competitors.forEach((competitor: any) => {
        const normalizedName = competitor.name.toLowerCase().trim();
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          allCompetitors.push(competitor);
        }
      });
    });
    
    console.log(`[${new Date().toISOString()}] Total unique competitors found: ${allCompetitors.length}`);
    return allCompetitors.slice(0, 8); // Limit to 8 competitors
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error analyzing brand and finding competitors:`, error);
    return [];
  }
}