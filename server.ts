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

function formatWorkspaceContext(workspaceContext: any): string {
  if (!workspaceContext || typeof workspaceContext !== 'object') return "";
  
  const clientProfileStr = formatClientProfileContext(workspaceContext.clientProfile || workspaceContext.clientProfileData);
  const keywordsList = workspaceContext.keywords || [];
  const clustersList = workspaceContext.clusters || [];
  const pagesList = workspaceContext.pages || [];
  const contentInventoryList = workspaceContext.contentInventory || [];
  const actionPlanList = workspaceContext.actionPlan || [];
  const competitorsList = workspaceContext.competitors || (workspaceContext.clientProfile?.competitors || []);

  const getKeywordsSummary = (kws: any[]) => {
    if (kws.length === 0) return "No keywords currently loaded.";
    return kws.slice(0, 100).map((k: any) => 
      `- ${k.keyword} [Intent: ${k.intent || "Unknown"}, Vol: ${k.volume || 0}, KD: ${k.difficulty || 0}, CPC: $${k.cpc || 0}${k.businessRelevance ? `, Relevance: ${k.businessRelevance}` : ""}]`
    ).join("\n");
  };

  const getClustersSummary = (cls: any[]) => {
    if (cls.length === 0) return "No keyword clusters designed yet.";
    return cls.slice(0, 40).map((c: any) => 
      `- Cluster Page: "${c.clusterName}" [Primary Keyword: ${c.primaryKeyword || "None"}, Core Topic: ${c.coreTopic || "General"}, Recommended Path: ${c.recommendedPagePath || "None"}, Page Type: ${c.type || "Blog & Guides"}, Decision: ${c.decision || "Create New Page"}, Opportunity Priority: ${c.opportunityPriority || "High"}]`
    ).join("\n");
  };

  const getPagesSummary = (pgs: any[]) => {
    if (pgs.length === 0) return "No URL page mappings defined yet.";
    return pgs.slice(0, 40).map((p: any) => 
      `- Page Node: "${p.title}" [Action: ${p.action || "Create"}, Type: ${p.pageType || "Blog Post"}, Difficulty: ${p.difficulty || 0}, Priority: ${p.priority || "Medium"}, Status: ${p.status || "Planned"}]`
    ).join("\n");
  };

  const getInventorySummary = (inv: any[]) => {
    if (inv.length === 0) return "No URLs currently crawled in content inventory.";
    return inv.slice(0, 40).map((p: any) => 
      `- Existing URL: ${p.url || p.slug || p} (H1/Title: ${p.title || "Existing Page"}, Type: ${p.pageType || "General"})`
    ).join("\n");
  };

  const getActionPlanSummary = (plan: any[]) => {
    if (plan.length === 0) return "No action plan items scheduled.";
    return plan.slice(0, 40).map((t: any) => 
      `- Tasks: "${t.title}" (Date: ${t.date || "2026-06-06"}, Status: ${t.status || "Planned"})`
    ).join("\n");
  };

  const getCompetitorsSummary = (comp: any) => {
    if (!comp) return "None specified";
    if (Array.isArray(comp)) return comp.length > 0 ? comp.join(", ") : "None specified";
    return String(comp);
  };

  return `
=== CURRENT WORKSPACE CONTEXT ===
${clientProfileStr}

=== KEYWORDS DATA NODE VALUES===
Number of Keywords: ${keywordsList.length}
${getKeywordsSummary(keywordsList)}

=== COMPILATION CLUSTERS (PAGE BLUEPRINTS) ===
Number of Clusters: ${clustersList.length}
${getClustersSummary(clustersList)}

=== PAGE URL MAPPINGS & TARGETS ===
Number of Page Mappings: ${pagesList.length}
${getPagesSummary(pagesList)}

=== LIVE COMPETITOR MATRIX ===
Key Competitors: ${getCompetitorsSummary(competitorsList)}

=== EXISTING WEBSITE CONTENT INVENTORY PAGES ===
Size of crawled live index: ${contentInventoryList.length}
${getInventorySummary(contentInventoryList)}

=== ACTIONABLE PRIORITIZED ACTION PLAN TASKS ===
Active tasks scheduled: ${actionPlanList.length}
${getActionPlanSummary(actionPlanList)}
===================================================
`;
}

function getIntegratedAiPrompt(customFeaturePrompt: string, clientProfile: any, workspaceContext: any): string {
  const profileStr = formatClientProfileContext(clientProfile || (workspaceContext && workspaceContext.clientProfile));
  const workspaceStr = formatWorkspaceContext(workspaceContext);

  return `
================================================================================
GLOBAL AI SEO STRATEGIST DIRECTIVE
================================================================================
You are an advanced AI SEO Strategist. You behave like an elite enterprise SEO
consultant, NOT just a passive keyword clustering script.

The CLIENT PROFILE is the absolute primary source of truth for all strategy execution,
keyword prioritization, silo taxonomy design, and content brief outlining. Every
recommendation, silo, link guidance, or item content briefs must consider:
- Industry & Niche Context
- Business Description & Value Proposition
- Target Country & Localized Search Behaviors
- Target Audience Personas & Pain Points
- Strategic SEO Campaign Goals
- Priority Services & Products (prioritize these high-margin items)
- Competitors (identify gaps and opportunities)
- Existing Website Pages (avoid duplicates/cannibalization; lookup fit)
- Sitemap URLs
- Active Content Publishing Capacity
- Existing SEO Data & Active Search Standings

--------------------------------------------------------------------------------
CRITICAL RANKING & PRIORITIZATION LOGIC
--------------------------------------------------------------------------------
**NEVER prioritize search keyword volume alone.** Brand alignment and revenue
potential are far more valuable than raw traffic numbers. When selecting,
ranking, grouping, or recommending keyword targets, pages, clusters, or briefs,
statically enforce this exact prioritization sequence:
1. BUSINESS RELEVANCE: Immediate connection to client's core services and niche.
2. REVENUE POTENTIAL: Target transactional/commercial intent terms over informational terms where viable.
3. SEARCH INTENT: Align precisely with real, high-value buyer search motivations.
4. EXISTING PAGE FIT: Determine if we should optimize a current page or create a new URL.
5. COMPETITION & DIFFICULTY: Prioritize high-opportunity, low-to-medium difficulty terms.
6. SEARCH VOLUME: Use search volume as secondary validation, never as the primary guide.

================================================================================
CLIENT PROFILE & RUNTIME METADATA
================================================================================
${profileStr || "No client profile loaded. Maintain strategy alignment with available metadata."}

================================================================================
UNIFIED STRATEGY BRAIN SNAPSHOT (workspaceContext)
================================================================================
${workspaceStr || "No other active workspace context loaded."}

--------------------------------------------------------------------------------
ACTIVE ACTIONABLE TASK DETAILS (Fulfill this with precision):
--------------------------------------------------------------------------------
${customFeaturePrompt}
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
  const { text, keywordsList, existingPages, clientProfile, workspaceContext } = req.body;
  if (!text && (!keywordsList || keywordsList.length === 0)) {
    return res.status(400).json({ error: "Please provide a raw keyword list or multi-line text block." });
  }

  try {
    const ai = getGeminiClient();
    const existingPagesList = existingPages && existingPages.length > 0
      ? `Existing URLs available in content inventory:\n${existingPages.map((p: any) => `- URL: ${p.url || p.slug || p} (Title: ${p.title || "Existing Page"})`).join("\n")}`
      : "No existing URLs in content inventory. Recommending new page creations.";

    const baseTaskPrompt = `You are an elite, Enterprise-Grade AI SEO Strategist. Your goal is NOT to build simple keyword groups, but to design a precise, high-conversion Page Plan ("Upload keywords -> Get a page plan") matching senior-level enterprise standards.

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

    const prompt = getIntegratedAiPrompt(baseTaskPrompt, clientProfile, workspaceContext);

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
                  supportedServiceOrProduct: { type: Type.STRING, description: "The specific client priority service or core product that this cluster supports. If none directly, state 'General Theme' or 'Brand Awareness'." },
                  isIrrelevantToBrand: { type: Type.BOOLEAN, description: "True if the keywords inside are completely out of scope, irrelevant, or not structurally aligned with the client brand goals." },
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

// 1.5. Keyword Strategic Classification & Funnel Audit
app.post("/api/gemini/classify-keywords", async (req, res) => {
  const { keywords, clientProfile, workspaceContext } = req.body;
  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ error: "No keywords selected or loaded to classify." });
  }

  try {
    const ai = getGeminiClient();
    const keywordsStr = keywords.map((k: any) => k.keyword).join(", ");
    
    const baseTaskPrompt = `Perform a Strategic Business Relevance Audit and Funnel Classification for the following search queries:
${keywordsStr}

Rule on strategic classification for EACH search query:
1. Detect real Search Intent (Informational, Transactional, Commercial, Navigational, Local, Comparison).
2. Classify Funnel Stage:
   - "TOFU" (Top of Funnel - Informational, general queries, low immediate conversion)
   - "MOFU" (Middle of Funnel - Comparison, research, tools, checklists)
   - "BOFU" (Bottom of Funnel - Transactional, commercial, pricing, direct solution finding)
3. Rate Business Relevance ("High", "Medium", "Low") and calculate a Priority Score from 0 to 100.
   - Example priority: If the query relates directly to the client's documented priority services or core products, give it "High" business relevance and a priority score of 80+.
4. Provide a precise "strategicMatchReason" indicating why this query is valuable or less valuable to the client based on their brand goals and audience.

Return raw JSON strictly formatted as:
{
  "classifications": [
    {
      "keyword": "Exact string of the query",
      "intent": "Intent label (Informational, Transactional, Commercial, Navigational, Local, or Comparison)",
      "funnelStage": "TOFU/MOFU/BOFU",
      "businessRelevance": "High/Medium/Low",
      "priorityScore": 85,
      "strategicMatchReason": "Matches target CMO buyers searching for local bookkeeping solutions."
    }
  ]
}`;

    const finalPrompt = getIntegratedAiPrompt(baseTaskPrompt, clientProfile, workspaceContext);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  intent: { type: Type.STRING },
                  funnelStage: { type: Type.STRING },
                  businessRelevance: { type: Type.STRING },
                  priorityScore: { type: Type.INTEGER },
                  strategicMatchReason: { type: Type.STRING }
                },
                required: ["keyword", "intent", "funnelStage", "businessRelevance", "priorityScore", "strategicMatchReason"]
              }
            }
          },
          required: ["classifications"]
        }
      }
    });

    const textResult = response.text || "";
    if (!textResult) {
      throw new Error("Received empty generated response from Gemini for classification.");
    }
    res.json(JSON.parse(textResult.trim()));
  } catch (e: any) {
    console.error("Keyword classification error:", e);
    res.status(500).json({ error: e.message || "Keyword classification failed." });
  }
});

// 1.8. SERP Analysis & Brand Feasibility Audit
app.post("/api/gemini/analyze-serp", async (req, res) => {
  const { keywords, clientProfile, workspaceContext } = req.body;
  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ error: "No keywords loaded to audit." });
  }

  try {
    const ai = getGeminiClient();
    const keywordsStr = keywords.map((k: any) => k.keyword).join(", ");
    
    const baseTaskPrompt = `Perform a custom SERP Relevance & Feasibility Audit for the following search queries:
${keywordsStr}

You are an expert SEO Strategist. Audit each query specifically against this client profile:
${JSON.stringify(clientProfile || workspaceContext?.clientProfile || {})}

YOUR STRATEGIC HIERARCHICAL EVALUATION RULES:
1. SERP Relevance: Is the underlying intent of this query relevant to the client's industry, business description and target audience?
2. Target Country Fit: Does the target language or location fit the targetCountry listed? (e.g. if targetCountry is United States, is the query relevant to US search landscape?)
3. Targeted Feasibility: Is this keyword realistic to target based on their publishing capacity or difficulty? (e.g. rate whether they can compete effectively).
4. Strategy Play: Mark "Quick Win" (high relevance, low difficulty, realistic) or "Long-term Play" (high authority required, key strategic asset).
5. Action Planner Advice: Provide short action advice.

Return raw JSON formatted strictly as:
{
  "serpAnalysis": [
    {
      "keyword": "Exact string of the query",
      "isRelevant": true,
      "relevanceExplanation": "Highly aligned with SaaS accountants target audience",
      "isRealistic": true,
      "feasibilityAnalysis": "Moderate competition, client has publishing capacity",
      "countryMatch": "Perfect Match",
      "playType": "Quick Win",
      "strategicAdvice": "Set up a comparison matrix page type."
    }
  ]
}`;

    const integratedPrompt = getIntegratedAiPrompt(baseTaskPrompt, clientProfile || workspaceContext?.clientProfile, workspaceContext || { clientProfile });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: integratedPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            serpAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  isRelevant: { type: Type.BOOLEAN },
                  relevanceExplanation: { type: Type.STRING },
                  isRealistic: { type: Type.BOOLEAN },
                  feasibilityAnalysis: { type: Type.STRING },
                  countryMatch: { type: Type.STRING },
                  playType: { type: Type.STRING },
                  strategicAdvice: { type: Type.STRING }
                },
                required: ["keyword", "isRelevant", "relevanceExplanation", "isRealistic", "feasibilityAnalysis", "countryMatch", "playType", "strategicAdvice"]
              }
            }
          },
          required: ["serpAnalysis"]
        }
      }
    });

    const textResult = response.text || "";
    if (!textResult) {
      throw new Error("Received empty generated response from Gemini for SERP audit.");
    }
    res.json(JSON.parse(textResult.trim()));
  } catch (e: any) {
    console.error("SERP Analysis error:", e);
    res.status(500).json({ error: e.message || "SERP Analysis failed." });
  }
});

// 2. Content Clustering / Hub Mapping
app.post("/api/gemini/content-cluster", async (req, res) => {
  const { contentDescription, existingClusters, clientProfile, workspaceContext } = req.body;
  if (!contentDescription && (!existingClusters || existingClusters.length === 0)) {
    return res.status(400).json({ error: "Missing content inputs or existing keyword clusters." });
  }

  try {
    const ai = getGeminiClient();

    const baseTaskPrompt = `Design a topical silo / Content Cluster Architecture based on the user's description and clusters. Create 1 large comprehensive Pillar Page and 2-4 supporting Subtopic Cluster Pages. Explain how the architecture links together internally.

User focus & keywords targets:
${contentDescription || JSON.stringify(existingClusters)}`;

    const prompt = getIntegratedAiPrompt(baseTaskPrompt, clientProfile, workspaceContext);

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

// AI Page Mapper (Step 6 / Prevent Cannibalization / URL Alignment)
app.post("/api/gemini/generate-page-mappings", async (req, res) => {
  const { clientProfile, workspaceContext } = req.body;
  const clusters = workspaceContext?.clusters || [];
  if (clusters.length === 0) {
    return res.status(400).json({ error: "No clusters found in active workspace to align with your page mappings." });
  }

  try {
    const ai = getGeminiClient();

    const baseTaskPrompt = `You are an elite AI SEO Strategist. Walk through each keyword cluster in this workspace as listed in your context.
Evaluate each cluster to optimize for our client profile. Decide if we can map it directly to an existing page from our content inventory to prevent search cannibalization, or if we must recommend a new page type.

YOUR CLUSTERING ALIGNMENT LOGIC:
1. Prevent Search Cannibalization: Look closely at the list of existing pages in our crawled content inventory. If any existing URL/page already addresses the cluster's intent, recommend ACTION: "Optimise" or "Merge" of that existing page, instead of recommending a duplicate page!
2. Create New URL Nodes: Only recommend ACTION: "Create" if there is no existing URL in the database/inventory that serves this search intent.
3. Determine Page Template: Match to standard page templates: "Service Page", "Blog Post", "Comparison Page", "Location Page".
4. Strategic Difficulty Estimate: Based on competitor strength and priority services.
5. Revenue Priority Indexing: Align priority ("Low", "Medium", "High") with whether the cluster relates to a primary service/product.

Here are the clusters to map:
${JSON.stringify(clusters)}

Return raw JSON formatted strictly as:
{
  "pageMappings": [
    {
      "id": "map-gen-slugified-cluster-name",
      "title": "Clean, descriptive recommended title of the page or existing URL title to update",
      "clusterName": "Exact name of the cluster representing this page mapping",
      "action": "Create or Optimise or Merge",
      "pageType": "Service Page or Blog Post or Comparison Page or Location Page",
      "difficulty": 45,
      "priority": "High",
      "status": "Planned",
      "reason": "Topical overlap explanation. References existing URLs if optimizing, explains bottom-line utility directly linked to client's priority services and prevents cannibalization."
    }
  ]
}`;

    const prompt = getIntegratedAiPrompt(baseTaskPrompt, clientProfile, workspaceContext);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pageMappings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  clusterName: { type: Type.STRING },
                  action: { type: Type.STRING },
                  pageType: { type: Type.STRING },
                  difficulty: { type: Type.INTEGER },
                  priority: { type: Type.STRING },
                  status: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["id", "title", "clusterName", "action", "pageType", "difficulty", "priority", "status", "reason"]
              }
            }
          },
          required: ["pageMappings"]
        }
      }
    });

    const textResult = response.text || "";
    if (!textResult) {
      throw new Error("Received empty page mappings response from Gemini.");
    }
    res.json(JSON.parse(textResult.trim()));
  } catch (e: any) {
    console.error("Page mapping generation error:", e);
    res.status(500).json({ error: e.message || "Failed to generate optimized page mappings." });
  }
});

// AI Content Gap Analyzer (Step 6 / Compare clusters against inventory to flag missing content targets)
app.post("/api/gemini/run-gap-analysis", async (req, res) => {
  const { clientProfile, workspaceContext } = req.body;
  const clusters = workspaceContext?.clusters || [];
  const contentInventory = workspaceContext?.contentInventory || [];

  if (clusters.length === 0) {
    return res.status(400).json({ error: "No keyword clusters found in workspace. Create clusters before conducting a content gap analysis." });
  }

  try {
    const ai = getGeminiClient();

    const baseTaskPrompt = `You are an elite SEO Strategist doing a deep Content Gap Audit.
We need to compare our desired Keyword Clusters against our existing URLs in our Content Inventory, identifying missing content targets, ranking opportunities, or duplicate threats.

YOUR STRATEGIC AUDIT LOGIC:
1. Identify high-priority Keyword Clusters that have NO similar or matching page URL in our content inventory. These are direct "Content Gaps".
2. Assess search intent, target audience, and business relevance score.
3. For each gap found, explain why it represents a high-priority miss for the client brand (based on their industry, priority products/services, and competitors).
4. Outline a specific recommendation on how to address this gap, specifying the suggested Page Type (Service Page, Blog Post, Comparison Page, Location Page) and target country play.

Here are the active Keyword Clusters:
${JSON.stringify(clusters)}

Here are our existing crawled Content Inventory Pages:
${JSON.stringify(contentInventory)}

Return raw JSON formatted strictly as:
{
  "gapAnalysis": [
    {
      "gapTheme": "Name / Theme of the discovered content gap",
      "keywordGroup": "The target keyword cluster name or priority search queries missing",
      "relevance": "High or Medium or Low",
      "priorityScore": 85,
      "pageType": "Service Page or Blog Post or Comparison Page or Location Page",
      "strategicMissRationale": "Strategic rationale linking this to the client's business, specific service specialty, and primary competitors.",
      "actionPlanAdvice": "Clear actionable instruction on how to draft, format, or launch this page to capture rankings."
    }
  ]
}`;

    const prompt = getIntegratedAiPrompt(baseTaskPrompt, clientProfile, workspaceContext);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gapAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  gapTheme: { type: Type.STRING },
                  keywordGroup: { type: Type.STRING },
                  relevance: { type: Type.STRING },
                  priorityScore: { type: Type.INTEGER },
                  pageType: { type: Type.STRING },
                  strategicMissRationale: { type: Type.STRING },
                  actionPlanAdvice: { type: Type.STRING }
                },
                required: ["gapTheme", "keywordGroup", "relevance", "priorityScore", "pageType", "strategicMissRationale", "actionPlanAdvice"]
              }
            }
          },
          required: ["gapAnalysis"]
        }
      }
    });

    const textResult = response.text || "";
    if (!textResult) {
      throw new Error("Received empty content gap analyzer response from Gemini.");
    }
    res.json(JSON.parse(textResult.trim()));
  } catch (e: any) {
    console.error("Gap analysis route error:", e);
    res.status(500).json({ error: e.message || "Failed to conduct content gap mapping audit." });
  }
});

// 3. Template Operations (Brief with specific SEO rules, Outline, Meta Tags, Word intent)
app.post("/api/gemini/template", async (req, res) => {
  const { type, params, clientProfile, workspaceContext } = req.body;
  if (!type || !params) {
    return res.status(400).json({ error: "Template type and parameters are required." });
  }

  try {
    const ai = getGeminiClient();
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
    } else if (type === "suggest_keywords") {
      prompt = `Generate exactly 15 highly targeted, commercial search queries or keywords specifically aligned for this client brand.
You must return a JSON response object matching schema layout:
{
  "title": "Automated SEO Keyword Enrichment",
  "data": {
    "list": [
      { "keyword": "E.g. fractional cfo real estate broker software", "intent": "Commercial", "volume": 320, "difficulty": 18, "cpc": 3.40, "rationale": "High conversion alignment for target clients" }
    ]
  }
}
Please replace dummy list content with actual strategic keywords. Provide 15 distinct high-value list items.`;
    }

    const finalPrompt = getIntegratedAiPrompt(prompt, clientProfile, workspaceContext);

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
