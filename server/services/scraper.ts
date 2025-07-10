import { URL } from 'url';
import axios from "axios";
import * as cheerio from "cheerio";

export interface ScrapedContent {
  title: string;
  description: string;
  features: string[];
  services: string[];
}

export async function scrapeBrandWebsite(brandUrl: string): Promise<ScrapedContent> {
  try {
    // Extract brand name from URL
    const domain = extractDomainFromUrl(brandUrl);
    const brandName = domain.split('.')[0].replace(/[^a-zA-Z]/g, '');
    
    // In a real implementation, you would scrape the actual website
    // For now, generate generic content based on the brand name
    return {
      title: `${brandName} - Brand Analysis`,
      description: `${brandName} is a technology platform providing various services and solutions.`,
      features: [
        "Modern Technology Stack",
        "Scalable Infrastructure", 
        "Developer-Friendly Tools",
        "Cloud-Based Solutions",
        "API Integration",
        "Custom Configuration",
        "Performance Optimization",
        "Security Features"
      ],
      services: [
        "Web Application Services",
        "Cloud Infrastructure",
        "API Development",
        "Database Solutions",
        "Deployment Services",
        "Monitoring Tools",
        "Development Tools"
      ]
    };
  } catch (error) {
    console.error("Error analyzing brand website:", error);
    throw new Error("Failed to analyze brand website: " + (error as Error).message);
  }
}

export async function generateTopicsFromContent(content: ScrapedContent): Promise<Array<{ name: string; description: string }>> {
  // Generate generic topics that would be relevant for any brand
  const topics = [
    {
      name: "Technology Stack",
      description: "Analysis of the technology stack and development tools used"
    },
    {
      name: "Market Position", 
      description: "Understanding the brand's position in the market and competitive landscape"
    },
    {
      name: "Service Offerings",
      description: "Analysis of the services and products offered by the brand"
    },
    {
      name: "Developer Experience",
      description: "Evaluation of developer tools, documentation, and ease of use"
    },
    {
      name: "Infrastructure & Scalability",
      description: "Assessment of infrastructure capabilities and scaling solutions"
    },
    {
      name: "Integration Capabilities",
      description: "Analysis of API offerings and integration possibilities"
    },
    {
      name: "Performance & Reliability",
      description: "Evaluation of performance metrics and reliability features"
    }
  ];

  return topics;
}

export async function fetchWebsiteText(url: string): Promise<string> {
  try {
    // Ensure the URL starts with http:// or https://
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    const { data: html } = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(html);
    // Try to get the main content, fallback to body text
    let mainText = $("main").text() || $("body").text();
    // Clean up whitespace
    mainText = mainText.replace(/\s+/g, " ").trim();
    // Limit to first 2000 characters to avoid token overload
    return mainText.slice(0, 2000);
  } catch (error) {
    console.error("Error fetching website:", error);
    return "";
  }
}

export function extractDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    // If URL parsing fails, try to extract domain from text
    const domainMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
    return domainMatch ? domainMatch[1] : url;
  }
}

export function extractUrlsFromText(text: string): string[] {
  // Comprehensive URL regex patterns to capture ALL URLs
  const urlPatterns = [
    // Full URLs with protocols (most comprehensive)
    /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
    // URLs without protocol but with www
    /www\.[^\s<>"{}|\\^`[\]]+/g,
    // Any domain with path (very broad pattern)
    /(?:^|\s)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
    // IP addresses with paths
    /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/[^\s]*)?/g,
    // Localhost patterns
    /localhost(?::[0-9]+)?(?:\/[^\s]*)?/g
  ];
  
  const allUrls: string[] = [];
  
  urlPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    allUrls.push(...matches);
  });
  
  // Clean and normalize URLs
  const cleanedUrls = allUrls
    .map(url => {
      let cleanUrl = url.trim();
      // Add protocol if missing
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      // Remove trailing punctuation and whitespace
      cleanUrl = cleanUrl.replace(/[.,;!?]+$/, '').trim();
      return cleanUrl;
    })
    .filter(url => {
      // Only filter out obviously invalid URLs, keep everything else
      try {
        const urlObj = new URL(url);
        // Only skip if it's clearly a placeholder or invalid
        if (urlObj.hostname === 'example.com' || 
            urlObj.hostname === 'localhost' ||
            urlObj.hostname.length < 3) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });
  
  return Array.from(new Set(cleanedUrls)); // Remove duplicates
}
