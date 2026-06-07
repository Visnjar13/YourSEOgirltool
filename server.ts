import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Persistent Storage Directory
const STORAGE_DIR = path.join(process.cwd(), "data", "workspaces");

// Ensure storage directory exists
async function ensureStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (err) {
    console.error("Storage directory already exists or error compiling path:", err);
  }
}
ensureStorage();

// Lazy Gemini Initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in the AI Studio Settings secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function formatClientProfileContext(clientProfile: any): string {
  if (!clientProfile || typeof clientProfile !== 'object') return "";
  
  const getValue = (val: any) => {
    if (!val) return "Not specified";
    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "Not specified";
    return String(val);
  };

  return `
=== CLIENT BRAND & SEO STRATEGY CONTEXT ===
- Business Name: ${getValue(clientProfile.businessName)}
- Website URL: ${getValue(clientProfile.websiteUrl)}
- Business Description: ${getValue(clientProfile.description)}
- Industry / Niche: ${getValue(clientProfile.industry)}
- Target Country: ${getValue(clientProfile.targetCountry)}
- Target Audience: ${getValue(clientProfile.targetAudience)}
- Primary SEO Goals: ${getValue(clientProfile.goals)}
- Main Products & Services: ${getValue(clientProfile.productsServices)}
- Priority Services & Products to promote: ${getValue(clientProfile.priorityServices)}
- Key Competitors to beat: ${getValue(clientProfile.competitors)}
- Existing Important Pages URLs: ${getValue(clientProfile.existingPages)}
- Sitemap XML URL: ${getValue(clientProfile.sitemapUrl)}
- Preferred Page Types to create: ${getValue(clientProfile.preferredPageTypes)}
- Monthly Publishing Capacity: ${getValue(clientProfile.publishingCapacity)}
- Existing SEO Data or Rankings: ${getValue(clientProfile.existingSeoData)}
- Additional Strategic Notes: ${getValue(clientProfile.notes)}
==========================================
Please fully align your strategy, page blueprints, and categorizations to optimize for this specific client profile's business niche, audience, and goals.
`;
}

// ============================================
// WORKSPACE STORE ENDPOINTS
// ============================================

// List all workspaces (short summary format)
app.get("/api/workspaces", async (req, res) => {
  try {
    await ensureStorage();
    const files = await fs.readdir(STORAGE_DIR);
    const workspaces = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(STORAGE_DIR, file), "utf8");
          const ws = JSON.parse(content);
          workspaces.push({
            id: ws.id,
            name: ws.name,
            description: ws.description || "",
            createdAt: ws.createdAt,
            updatedAt: ws.updatedAt,
            keywordCount: ws.keywords ? ws.keywords.length : 0,
            clusterCount: ws.contentClusters ? ws.contentClusters.length : 0,
            templateCount: ws.templates ? ws.templates.length : 0,
          });
        } catch (e) {
          // Skip corrupt file
        }
      }
    }

    // Sort by recent updatedAt
    workspaces.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(workspaces);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific workspace
app.get("/api/workspaces/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf8");
    res.json(JSON.parse(content));
  } catch (errorSnapshot: any) {
    if (errorSnapshot.code === "ENOENT") {
      res.status(404).json({ error: "WS_NOT_FOUND", message: "Workspace not found." });
    } else {
      res.status(500).json({ error: errorSnapshot.message });
    }
  }
});

// Create/Update workspace
app.post("/api/workspaces", async (req, res) => {
  const wsData = req.body;
  if (!wsData.id || !wsData.name) {
    return res.status(400).json({ error: "Workspace 'id' and 'name' are required." });
  }

  try {
    await ensureStorage();
    const filePath = path.join(STORAGE_DIR, `${wsData.id}.json`);
    const now = new Date().toISOString();

    let existingData: any = {};
    try {
      const existingContent = await fs.readFile(filePath, "utf8");
      existingData = JSON.parse(existingContent);
    } catch (e) {
      // New file
    }

    const payload = {
      ...existingData,
      ...wsData,
      createdAt: existingData.createdAt || now,
      updatedAt: now,
      keywords: wsData.keywords || existingData.keywords || [],
      contentClusters: wsData.contentClusters || existingData.contentClusters || [],
      templates: wsData.templates || existingData.templates || [],
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a workspace
app.delete("/api/workspaces/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GEMINI PROCESSING ENDPOINTS
// ============================================

// 1. Keyword Mapping + Clustering
app.post("/api/gemini/cluster", async (req, res) => {
  const { text, keywordsList, existingPages, clientProfile } = req.body;
  if (!text && (!keywordsList || keywordsList.length === 0)) {
    return res.status(400).json({ error: "Please provide a raw keyword list or multi-line text block." });
  }

  try {
    const ai = getGeminiClient();
    const existingPagesList = existingPages && existingPages.length > 0
      ? `Existing URLs available in content inventory:\n${existingPages.map((p: any) => `- URL: ${p.url || p.slug || p} (Title: ${p.title || "Existing Page"})`).join("\n")}`
      : "No existing URLs in content inventory. Recommending new page creations.";

    const clientContext = formatClientProfileContext(clientProfile);

    const prompt = `You are an elite, Enterprise-Grade AI SEO Strategist. Your goal is NOT to build simple keyword groups, but to design a precise, high-conversion Page Plan ("Upload keywords -> Get a page plan") matching senior-level enterprise standards.

${clientContext}

KEYWORDS INPUTS:
${text || JSON.stringify(keywordsList)}

${existingPagesList}

---------------------------------------------------------
CORE PRINCIPLES & DECISION SIGNAL HIERARCHY
You must cluster keywords strictly at the PAGE LEVEL, not the general TOPIC LEVEL. No massive groupings (e.g. "Content Marketing" with 400 keywords). Split them logical-page-by-logical-page (e.g., "Content Marketing Services", "Content Marketing Pricing", "Content Marketing Audit").

Use this decision signal hierarchy (from strongest/highest priority to weakest/lowest):
1. Search Intent (Commercial, Transactional, Informational, Comparison, Local, Navigational)
2. User Needs Test (Are they looking for the same visual layout or different outcomes?)
3. Page Type Consistency (A single URL has exactly ONE Page Type, e.g. Service Page, Blog Post)
4. SERP Similarity (Do Google results overlap enough to rank with a single page? Support signal)
5. Query Specificity Modifiers (Specific terms like "pricing", "NYC", "for Realtors", "custom" indicate distinct stages/needs requiring separate page URLs)
6. Existing Content Mapping (Avoid duplicate plans. Re-use or optimise an existing page if a match is found)
7. Business Value (Relevance to bottom-line conversions)
8. Search Volume & Keyword Difficulty
9. Keyword Similarity (Lexical similarity is the absolute WEAKEST signal. NEVER group queries together just because they share spelling!).

---------------------------------------------------------
RULES TO IMPLEMENT STRICTLY:
Rule 1 (Page Satisfaction): Ask yourself: "Can ONE single page realistically satisfy all search queries in this cluster simultaneously?" If NO, split them.
Rule 2 (Search Intent Mismatch): Do NOT mix different visual target search classes. If a user queries "Real Estate CRM software" (Commercial) and another queries "how does real estate CRM work" (Informational), they MUST be mapped to separate pages (e.g., a Service Page and a Blog Guide).
Rule 3 (User Needs Outcome): Separate pages if users expect differing actions (e.g., high-intent comparison table vs. reading a quick tutorial).
Rule 4 (Page Type Consistency): Ensure absolute page consistency. Define the cluster's "type" attribute strictly as one of:
  - "Service Pages" (for commercial/transactional offering solutions)
  - "Blog & Guides" (for informational articles, resources, guides)
  - "Comparison Pages" (for versus, alternatives, comparative lists)
  - "Location Pages" (for local physical or service areas)
Rule 5 (SERP Similarity): Standardize page clusters based on SERP consensus.
Rule 6 (Query Specificity Overrides): Modifiers (e.g. pricing, cheap, template, agency, realtor) override broad clusters. CRM for Agencies vs CRM for Realtors cannot be on the same page.
Rule 7 (No Broad Topic Containers): Groups of keywords of more than 30 terms or containing multiple intent phases must be auto-split into logical pages. High-volume parent keywords become their own Primary page clusters; lower-difficulty variations support them.
Rule 8 (Cluster size control): Strict limit of maximum 30 active keywords in one page cluster. Suspicious volumes of keywords (e.g. 50+) must be fragmented into clean, focused child clusters.
Rule 9 (No Prefix Groupings): Avoid grouping informational items merely because they share prefixes like "What is" or "How to" if they target different topics.
Rule 10 & 11 (Primary & Secondary Keywords): Every page cluster must declare a single "primaryKeyword" (representing the most descriptive, conversion-aligned, intent-matching target keyword with high commercial relevance, not just raw volume). All other included keywords in that cluster are "secondaryKeywords".
Rule 12 (Existing Page Mapping): If a cluster's core theme or primary keyword matches an existing page URL in the list provided above, select decision: "Update Existing Page". Otherwise, select "Create New Page".
Rule 13 (Cannibalization Detection): Identify if any keyword is targeted across multiple clusters. Flag potential target cannibalizations in "cannibalizationThreats".
Rule 14 & 15 (Opportunity Prioritization): Rank the overall business value and search potential of each page as "High", "Medium", or "Low" priority and write an explicit strategy explanation in "priorityReason" based on conversion closeness, difficulty and current metrics.
Rule 16 (Cluster Quality Score): Calculate a logical quality score from 0 to 100 based on search-intent cohesion and user need focus of the keywords inside.
Rule 17 (Confidence score): Select "High", "Medium", or "Low" based on search outcome consistency.
Rule 18 (Needs Review State): If intents are mixed or SERP analysis signals conflicting signals, flag the decision as "Needs Review".
Rule 19 (Explain every decision): Provide an explanation covering: "reason" (why they belong together or were split), "evidence" (specific modifier phrases, intent, or SERP indicators), and "recommendedAction" (precise outline or meta planning actions for execution).

Provide your response in raw JSON adhering strictly to the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clusters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  clusterName: { type: Type.STRING, description: "A highly descriptive, specific page name (e.g., 'Real Estate CRM Pricing & Plans' rather than just 'Pricing')" },
                  coreTopic: { type: Type.STRING, description: "Main topical framework theme, e.g., CRM Software" },
                  intent: { type: Type.STRING, description: "Core search intent: Commercial, Transactional, Informational, Comparison, Local, or Navigational" },
                  recommendedPagePath: { type: Type.STRING, description: "Optimized SEO slug starting with a slash, e.g., /crm/realtor-pricing" },
                  parentTopic: { type: Type.STRING, description: "Broad parent category or content silo category" },
                  type: { type: Type.STRING, description: "Must be exactly one of: 'Service Pages', 'Blog & Guides', 'Comparison Pages', 'Location Pages'" },
                  primaryKeyword: { type: Type.STRING, description: "The single best target keyword for the page" },
                  confidenceScore: { type: Type.STRING, description: "Must be High, Medium, or Low" },
                  opportunityPriority: { type: Type.STRING, description: "Must be High, Medium, or Low" },
                  priorityReason: { type: Type.STRING, description: "Sentence explaining why this is prioritized (e.g., high intent, low difficulty)" },
                  qualityScore: { type: Type.NUMBER, description: "Score from 0 to 100 for cluster intent alignment" },
                  decision: { type: Type.STRING, description: "Must be exactly one of: 'Create New Page', 'Update Existing Page', 'Needs Review'" },
                  explanationReason: { type: Type.STRING, description: "Why these keywords fit this specific URL/page satisfaction" },
                  explanationEvidence: { type: Type.STRING, description: "Specific search intent modifiers or SERP similarity flags justifying the design" },
                  explanationRecommendedAction: { type: Type.STRING, description: "The precise action for content teams to fulfill this page plan" },
                  cannibalizationThreats: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Any secondary keywords in this list that might conflict with other existing pages"
                  },
                  keywords: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        keyword: { type: Type.STRING },
                        intent: { type: Type.STRING },
                        volume: { type: Type.NUMBER },
                        difficulty: { type: Type.NUMBER },
                        cpc: { type: Type.NUMBER }
                      },
                      required: ["keyword", "intent", "volume", "difficulty"]
                    }
                  }
                },
                required: [
                  "clusterName", "coreTopic", "intent", "recommendedPagePath", 
                  "parentTopic", "type", "primaryKeyword", "confidenceScore", 
                  "opportunityPriority", "priorityReason", "qualityScore", "decision", 
                  "explanationReason", "explanationEvidence", "explanationRecommendedAction", 
                  "keywords"
                ]
              }
            }
          },
          required: ["clusters"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Received empty generated content response from Gemini API.");
    }
    res.json(JSON.parse(textResult.trim()));
  } catch (e: any) {
    console.error("Error clustering keywords: ", e);
    res.status(500).json({ error: e.message || "Keyword clustering process failed." });
  }
});

// 2. Content Clustering / Hub Mapping
app.post("/api/gemini/content-cluster", async (req, res) => {
  const { contentDescription, existingClusters, clientProfile } = req.body;
  if (!contentDescription && (!existingClusters || existingClusters.length === 0)) {
    return res.status(400).json({ error: "Missing content inputs or existing keyword clusters." });
  }

  try {
    const ai = getGeminiClient();
    const clientContext = formatClientProfileContext(clientProfile);

    const prompt = `Design a topical silo / Content Cluster Architecture based on the user's description and clusters. Create 1 large comprehensive Pillar Page and 2-4 supporting Subtopic Cluster Pages. Explain how the architecture links together internally.

${clientContext}

User focus & keywords targets:
${contentDescription || JSON.stringify(existingClusters)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contentHubs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hubTitle: { type: Type.STRING, description: "Topical hub or silo name" },
                  description: { type: Type.STRING, description: "Topical context of this cluster" },
                  pillarPage: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      targetKeyword: { type: Type.STRING },
                      recommendedUrl: { type: Type.STRING },
                      outlineSummary: { type: Type.STRING }
                    },
                    required: ["title", "targetKeyword", "recommendedUrl"]
                  },
                  supportingArticles: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        targetKeyword: { type: Type.STRING },
                        roleInSilo: { type: Type.STRING, description: "How this interlinks/backs the pillar page" },
                        recommendedUrl: { type: Type.STRING }
                      },
                      required: ["title", "targetKeyword", "recommendedUrl"]
                    }
                  }
                },
                required: ["hubTitle", "description", "pillarPage", "supportingArticles"]
              }
            }
          },
          required: ["contentHubs"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Received empty content clustering response from Gemini API.");
    }
    res.json(JSON.parse(textResult.trim()));
  } catch (e: any) {
    console.error("Content cluster generation error:", e);
    res.status(500).json({ error: e.message || "Content Hub design process failed." });
  }
});

// 3. Template Operations (Brief with specific SEO rules, Outline, Meta Tags, Word intent)
app.post("/api/gemini/template", async (req, res) => {
  const { type, params, clientProfile } = req.body;
  if (!type || !params) {
    return res.status(400).json({ error: "Template type and parameters are required." });
  }

  try {
    const ai = getGeminiClient();
    const clientContext = formatClientProfileContext(clientProfile);
    let prompt = "";

    if (type === "brief") {
      prompt = `Generate a comprehensive SEO Content Brief based on the following:
Target Keyword: ${params.keyword || "SEO Strategies"}
Target Audience: ${params.audience || "General Readers"}
Core Topic: ${params.topic || "E-commerce or Industry Growth"}
Primary Competitors (optional): ${params.competitors || "Not specified"}

Format the response containing:
1. Meta Guidance (Length, Tone, Suggested Headline)
2. Primary & Secondary Keywords to Target
3. User Questions to Answer
4. Suggested Word Count & Writing recommendations
The response should be structured as clean JSON so that it can be parsed.`;
    } else if (type === "outline") {
      prompt = `Generate a fully structured SEO Outline with precise headings (H1, H2, H3), including instructions on content, semantic keywords, and search criteria for each section.
Target Theme / Topic: ${params.theme || "Modern UI Engineering with Tailwind"}
Target Page Title: ${params.title || "The Definitive Guide"}
Length Focus: ${params.length || "Medium (1000-1500 words)"}

Format the output to contain nested headings and instructions for each heading.`;
    } else if (type === "meta_tags") {
      prompt = `Generate exactly 3 Title Tag options and 3 Meta Description options optimized for Google Search standards.
Topic Description / Summary: ${params.summary || "A software workspace designed for rapid SEO keyword clustering."}
Brand Name: ${params.brand || "SEO Hub"}
Primary Keyword: ${params.keyword || "SEO Keyword mapping"}

Include character counts for each generated option.`;
    } else if (type === "intent_finder") {
      prompt = `Perform a Search Intent Audit for the following terms:
Terms to inspect: ${params.terms || "Best SEO strategies, SEO pricing, what is keyword map"}

Break down search intent into Informational, Commercial, Transactional, and Navigational categories with detailed rationales, competitor target profiles, and custom formatting recommendations.`;
    } else if (type === "competitor_clash") {
      prompt = `Perform a Competitor Content Gap and Search Authority clash analysis.
Our Brand/Offer: ${params.brandOffer || "Local SaaS platform for keyword mapping"}
Target competitors to analyze: ${params.competitorNames || "Ahrefs, Semrush, Moz"}
Focus Search Terms & Queries: ${params.targetQuery || "automated content hub builder"}

Identify high-authority gaps where competitor sites are ranking but our offer can leapfrog them. Generate sections detailing:
1. Competitor Search Footprint Analysis
2. High-Yield Content Gaps (Low Difficulty / High Relevance angles)
3. Actionable Feature/Messaging Counter-Strikes
4. Content strategy blueprint to claim search engine share.`;
    } else if (type === "landing_copy") {
      prompt = `Generate extremely high-converting SEO Copywriting layout for a target product landing page.
Product/Feature Name: ${params.productName || "Studio Automator"}
Key Benefits/Aspirations: ${params.targetBenefits || "Saves 20 hours a week on cluster creation and generates briefs in one click"}
Primary Hook or Pain Point: ${params.primaryHook || "Frustrated by tedious manual Excel filtering and slow writers"}

Provide clear copywriting items, structured in sections:
1. Hero Title & Subheading Hooks with Primary Keywords
2. Feature Benefit Sections with secondary SEO keyword targets
3. Emotional objections overcome and social Proof anchors
4. High-converting CTA Copy options optimized for search intent.`;
    } else if (type === "faq_schema") {
      prompt = `Generate an SEO-optimized FAQ section and simulated schema block.
Target Topic Theme: ${params.coreTopic || "Fractional CFO bookkeeping software"}
Target Questions to solve: ${params.audienceQuestions || "What does setup cost? Does it integrate with QuickBooks? Is there custom support?"}

Generate detailed, highly readable answers that Google would love to display in rich snippet snippets. Provide sections detailing:
1. Core SEO FAQ Questions and Comprehensive Expert Answers (fully expanded)
2. Semantic LSI keywords and search modifiers to embed in answers
3. A complete, beautifully structured, copy-pasteable visual simulated JSON-LD Schema of type 'FAQPage' that matches the questions.`;
    }

    const finalPrompt = clientContext ? `${clientContext}\n\n${prompt}` : prompt;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Main title of Gen output" },
            data: {
              type: Type.OBJECT,
              description: "Structured section values representing the template generation details",
              properties: {
                summary: { type: Type.STRING, description: "Brief background or summary overview" },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      contentPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                      details: { type: Type.STRING }
                    },
                    required: ["title", "contentPoints"]
                  }
                }
              },
              required: ["summary", "sections"]
            }
          },
          required: ["title", "data"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Received empty generation template response from Gemini API.");
    }
    res.json(JSON.parse(textResult.trim()));
  } catch (e: any) {
    console.error("Template generation error:", e);
    res.status(500).json({ error: e.message || "SEO template generation failed." });
  }
});

// 4. Multimodal file and OCR parser
app.post("/api/gemini/parse-image", async (req, res) => {
  const { base64Data, mimeType } = req.body;
  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: "Base64 data and mimeType are required." });
  }
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        "Analyze this file or image and extract all relevant SEO keywords, queries, search terms, topics, or row data. Return ONLY the plain comma-separated or line-separated list of terms with no markdown format, outer tags, headers, or conversational text."
      ]
    });
    const textResult = response.text || "";
    res.json({ extractedText: textResult.trim() });
  } catch (error: any) {
    console.error("Multimodal parsing error:", error);
    res.status(500).json({ error: error.message || "File parsing failed." });
  }
});


// ============================================
// VITE MIDDLEWARE HANDLING & ROUTING
// ============================================

// Serve sitemap.xml explicitly to bypass any SPA html-fallback
app.get("/sitemap.xml", (req, res) => {
  res.header("Content-Type", "application/xml");
  res.sendFile(path.join(process.cwd(), "public", "sitemap.xml"));
});

// Serve robots.txt explicitly
app.get("/robots.txt", (req, res) => {
  res.header("Content-Type", "text/plain");
  res.send("User-agent: *\nAllow: /\nSitemap: https://app.yourseogirl.com/sitemap.xml\n");
});

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap SEO app server:", err);
});
