import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateDiversePrompts(
  topicName: string, 
  competitors: string[], 
  promptsPerTopic: number, 
  diversityThreshold: number
): Promise<string[]> {
  const prompts: string[] = [];
  const maxAttempts = promptsPerTopic * 3; // Allow multiple attempts to hit diversity target
  let attempts = 0;

  while (prompts.length < promptsPerTopic && attempts < maxAttempts) {
    attempts++;
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert at generating diverse, realistic prompts for brand analysis. 
            Generate prompts that someone might ask an AI assistant about ${topicName}.
            
            Requirements:
            - Each prompt should be naturally worded as if a real person is asking
            - Prompts should vary significantly in structure, approach, and specific focus
            - Include different question types: comparison, recommendation, explanation, troubleshooting
            - Mention different contexts: beginner vs advanced, different use cases, different constraints
            - Vary the complexity and specificity
            - Do NOT use repetitive templates like "What is the best way to..." repeatedly
            
            Competitors to potentially reference: ${competitors.join(', ')}
            
            Generate exactly 1 unique prompt. Make it distinct from these patterns:
            - "What is the best/most efficient way to..."
            - "How do I deploy/host..."
            - "Which platform should I use for..."
            
            Be creative with question structures and contexts.`
          },
          {
            role: "user",
            content: `Generate 1 diverse prompt about ${topicName}.`
          }
        ],
        temperature: 0.9, // High creativity
        max_tokens: 100
      });

      const newPrompt = response.choices[0].message.content?.trim();
      if (!newPrompt) continue;

      // Check diversity against existing prompts
      if (prompts.length === 0 || isDiverse(newPrompt, prompts, diversityThreshold)) {
        prompts.push(newPrompt);
      }
    } catch (error) {
      console.error("Error generating prompt:", error);
      continue;
    }
  }

  // If we couldn't generate enough diverse prompts, fill with fallbacks
  while (prompts.length < promptsPerTopic) {
    const fallbackPrompts = generateFallbackPrompts(topicName, competitors);
    for (const fallback of fallbackPrompts) {
      if (prompts.length >= promptsPerTopic) break;
      if (isDiverse(fallback, prompts, diversityThreshold)) {
        prompts.push(fallback);
      }
    }
    
    // Prevent infinite loop
    if (prompts.length === 0) {
      prompts.push(`Tell me about ${topicName} options available today.`);
    }
    break;
  }

  return prompts.slice(0, promptsPerTopic);
}

function isDiverse(newPrompt: string, existingPrompts: string[], threshold: number): boolean {
  if (existingPrompts.length === 0) return true;

  const newWords = new Set(newPrompt.toLowerCase().split(/\s+/).filter(word => word.length > 2));
  
  for (const existingPrompt of existingPrompts) {
    const existingWords = new Set(existingPrompt.toLowerCase().split(/\s+/).filter(word => word.length > 2));
    
    // Calculate word overlap percentage
    const intersection = new Set(Array.from(newWords).filter(word => existingWords.has(word)));
    const union = new Set([...Array.from(newWords), ...Array.from(existingWords)]);
    const similarity = (intersection.size / union.size) * 100;
    
    // If similarity is too high, reject the prompt
    if (similarity > (100 - threshold)) {
      return false;
    }
  }
  
  return true;
}

function generateFallbackPrompts(topicName: string, competitors: string[]): string[] {
  const contexts = [
    "startup with limited budget",
    "enterprise application",
    "personal project", 
    "high-traffic application",
    "development team",
    "solo developer"
  ];

  const questionTypes = [
    "I'm struggling with",
    "What are the pros and cons of",
    "Can you compare",
    "I need help choosing between",
    "What would you recommend for",
    "How do I troubleshoot",
    "What's the difference between",
    "Is there a better alternative to"
  ];

  const fallbacks: string[] = [];
  
  for (let i = 0; i < 5; i++) {
    const context = contexts[i % contexts.length];
    const questionType = questionTypes[i % questionTypes.length];
    const competitor = competitors[i % competitors.length];
    
    fallbacks.push(
      `${questionType} ${topicName} solutions for a ${context}? I've heard about ${competitor} but want to explore options.`
    );
  }

  return fallbacks;
}