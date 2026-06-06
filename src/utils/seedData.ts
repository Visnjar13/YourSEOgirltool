import { Workspace, KeywordItem, KeywordCluster, PageMappingItem, ActionPlanTask, ContentInventoryPage } from "../types";

export function generateSeedWorkspace(): Workspace {
  // 1. GENERATE KEYWORDS (Target: 551 terms)
  // Quotas: 431 Informational, 52 Commercial, 8 Transactional, 31 Local, 29 Comparison
  const keywords: KeywordItem[] = [];

  // Top core keywords shown in the screenshot
  const coreKeywords: KeywordItem[] = [
    { keyword: "content marketing", intent: "Informational", volume: 2240000, difficulty: 89, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "content & marketing", intent: "Informational", volume: 74000, difficulty: 75, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "local seo services", intent: "Local", volume: 22200, difficulty: 45, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "marketing and content", intent: "Informational", volume: 18100, difficulty: 65, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "content marketing services", intent: "Commercial", volume: 12100, difficulty: 47, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "content strategy", intent: "Informational", volume: 12100, difficulty: 0, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "on page seo", intent: "Informational", volume: 12100, difficulty: 66, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "content marketing agency", intent: "Commercial", volume: 12100, difficulty: 34, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "seo keyword research", intent: "Informational", volume: 9900, difficulty: 92, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "content marketing strategy", intent: "Informational", volume: 9900, difficulty: 64, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "content marketing strategies", intent: "Informational", volume: 9900, difficulty: 60, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "eeat", intent: "Informational", volume: 8900, difficulty: 67, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "content content marketing", intent: "Informational", volume: 8100, difficulty: 63, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "moz vs semrush vs ahrefs", intent: "Comparison", volume: 8100, difficulty: 24, cpc: 0, rankingUrl: "—", pos: "—" },
    { keyword: "ahrefs vs semrush vs moz", intent: "Comparison", volume: 8100, difficulty: 21, cpc: 0, rankingUrl: "—", pos: "—" },
  ];

  keywords.push(...coreKeywords);

  // Helper lists to make realistic-looking keywords
  const seedWords = ["seo", "optimization", "ranking", "search engine", "marketing", "website", "blog", "content", "link building", "indexing", "metadata", "traffic", "organic", "serp"];
  const comparisonBrands = ["ahrefs", "semrush", "moz", "screaming frog", "spyfu", "serpstat", "uber-suggest"];
  const localCities = ["chicago", "new york", "san francisco", "houston", "austin", "dallas", "miami", "seattle", "boston", "london"];

  // Work out current counts
  let cntInfo = keywords.filter(k => k.intent === "Informational").length;
  let cntComm = keywords.filter(k => k.intent === "Commercial").length;
  let cntTrans = keywords.filter(k => k.intent === "Transactional").length;
  let cntLocal = keywords.filter(k => k.intent === "Local").length;
  let cntComp = keywords.filter(k => k.intent === "Comparison").length;

  let randomIdx = 0;

  // Add remaining Transactional keywords (8 total)
  const transTopics = ["buy seo audit report", "premium backlink builder pkg", "hire seo copywriting specialist", "purchase local citation package", "best content silo builder price", "ecommerce link outreach buy"];
  while (cntTrans < 8) {
    const topic = transTopics[cntTrans % transTopics.length] + ` (${cntTrans + 1})`;
    keywords.push({
      keyword: topic,
      intent: "Transactional",
      volume: [150, 250, 480, 500, 1200][Math.floor(Math.random() * 5)],
      difficulty: [12, 28, 45, 52, 60][Math.floor(Math.random() * 5)],
      cpc: Number((Math.random() * 15 + 2).toFixed(2)),
      rankingUrl: "—",
      pos: "—"
    });
    cntTrans++;
  }

  // Add remaining Commercial (52 total)
  while (cntComm < 52) {
    const term = `best ${seedWords[cntComm % seedWords.length]} tools for small brand #${cntComm}`;
    keywords.push({
      keyword: term,
      intent: "Commercial",
      volume: [320, 480, 720, 1400, 2900][Math.floor(Math.random() * 5)],
      difficulty: [24, 38, 55, 62, 70][Math.floor(Math.random() * 5)],
      cpc: Number((Math.random() * 8 + 1).toFixed(2)),
      rankingUrl: "—",
      pos: "—"
    });
    cntComm++;
  }

  // Add remaining Comparison (29 total)
  while (cntComp < 29) {
    const brandA = comparisonBrands[cntComp % comparisonBrands.length];
    const brandB = comparisonBrands[(cntComp + 1) % comparisonBrands.length];
    const term = `${brandA} vs ${brandB} pricing comparison #${cntComp}`;
    keywords.push({
      keyword: term,
      intent: "Comparison",
      volume: [180, 390, 880, 1200][Math.floor(Math.random() * 4)],
      difficulty: [11, 25, 42, 59][Math.floor(Math.random() * 4)],
      cpc: Number((Math.random() * 5).toFixed(2)),
      rankingUrl: "—",
      pos: "—"
    });
    cntComp++;
  }

  // Add remaining Local (31 total)
  while (cntLocal < 31) {
    const city = localCities[cntLocal % localCities.length];
    const word = seedWords[cntLocal % seedWords.length];
    const term = `local ${word} services in ${city} #${cntLocal}`;
    keywords.push({
      keyword: term,
      intent: "Local",
      volume: [140, 260, 450, 880, 1600][Math.floor(Math.random() * 5)],
      difficulty: [8, 19, 33, 48, 58][Math.floor(Math.random() * 5)],
      cpc: Number((Math.random() * 9).toFixed(2)),
      rankingUrl: "—",
      pos: "—"
    });
    cntLocal++;
  }

  // Add remaining Informational (431 total)
  while (cntInfo < 431) {
    const w1 = seedWords[cntInfo % seedWords.length];
    const w2 = seedWords[(cntInfo + 2) % seedWords.length];
    const term = `how to structure ${w1} to increase global ${w2} #${cntInfo}`;
    keywords.push({
      keyword: term,
      intent: "Informational",
      volume: [90, 170, 320, 590, 1100, 3400, 8800][Math.floor(Math.random() * 7)],
      difficulty: [5, 18, 30, 49, 63, 78, 85][Math.floor(Math.random() * 7)],
      cpc: Number((Math.random() * 3).toFixed(2)),
      rankingUrl: "—",
      pos: "—"
    });
    cntInfo++;
  }

  // Double check and shuffle just to have variety
  // Total will be exactly 551!


  // 2. GENERATE KEYWORD CLUSTERS (Target: 404 clusters)
  // Quotas: Service Pages: 52, Blog & Guides: 304, Comparison Pages: 26, Location Pages: 22
  const keywordClusters: KeywordCluster[] = [];

  // Core clusters from screenshot
  const coreClusters: KeywordCluster[] = [
    { 
      clusterName: "content marketing agency", 
      coreTopic: "content marketing agency", 
      intent: "Commercial", 
      recommendedPagePath: "/services/content-marketing-agency",
      type: "Service Pages",
      difficulty: "Medium",
      score: 64,
      reviewStatus: "Review (68%)",
      keywords: [
        { keyword: "content marketing agency", intent: "Commercial", volume: 12100, difficulty: 34 }
      ]
    },
    { 
      clusterName: "top 20 ai", 
      coreTopic: "top 20 ai researchers 2026 ranking citations", 
      intent: "Informational", 
      recommendedPagePath: "/blog/top-20-ai-researchers",
      type: "Service Pages",
      difficulty: "Medium",
      score: 63,
      reviewStatus: "80%",
      keywords: [
        { keyword: "top 20 ai researchers 2026 ranking citations", intent: "Informational", volume: 1200, difficulty: 45 },
        { keyword: "famous ai research in 2026", intent: "Informational", volume: 450, difficulty: 24 }
      ]
    },
    { 
      clusterName: "content marketing services", 
      coreTopic: "content marketing services", 
      intent: "Commercial", 
      recommendedPagePath: "/services/content-marketing",
      type: "Service Pages",
      difficulty: "Medium",
      score: 62,
      reviewStatus: "Review (68%)",
      keywords: [
        { keyword: "content marketing services", intent: "Commercial", volume: 12100, difficulty: 47 }
      ]
    },
    { 
      clusterName: "buy organic traffic", 
      coreTopic: "buy organic traffic", 
      intent: "Transactional", 
      recommendedPagePath: "/blog/buy-organic-traffic",
      type: "Blog & Guides",
      difficulty: "Medium",
      score: 61,
      reviewStatus: "Review (68%)",
      keywords: [
        { keyword: "buy organic traffic", intent: "Transactional", volume: 880, difficulty: 51 }
      ]
    },
    { 
      clusterName: "search intent content", 
      coreTopic: "search intent content strategy examples", 
      intent: "Informational", 
      recommendedPagePath: "/blog/search-intent-examples",
      type: "Service Pages",
      difficulty: "Medium",
      score: 61,
      reviewStatus: "Review (68%)",
      keywords: [
        { keyword: "search intent content strategy examples", intent: "Informational", volume: 380, difficulty: 40 }
      ]
    },
    { 
      clusterName: "top 5 ai", 
      coreTopic: "top 5 ai writing assistants", 
      intent: "Commercial", 
      recommendedPagePath: "/blog/top-5-ai-writers",
      type: "Service Pages",
      difficulty: "Medium",
      score: 61,
      reviewStatus: "Review (68%)",
      keywords: [
        { keyword: "top 5 ai", intent: "Commercial", volume: 1800, difficulty: 55 }
      ]
    }
  ];

  keywordClusters.push(...coreClusters);

  // Fill Service Pages (total 52)
  let cntSvc = keywordClusters.filter(c => c.type === "Service Pages").length;
  while (cntSvc < 52) {
    const name = `service marketing cluster node #${cntSvc}`;
    keywordClusters.push({
      clusterName: name,
      coreTopic: name,
      intent: "Commercial",
      recommendedPagePath: `/services/seo-node-${cntSvc}`,
      type: "Service Pages",
      difficulty: "Medium",
      score: Math.floor(Math.random() * 20) + 45,
      reviewStatus: "Review (68%)",
      keywords: [{ keyword: name, intent: "Commercial", volume: 200, difficulty: 35 }]
    });
    cntSvc++;
  }

  // Fill Blog & Guides (total 304)
  let cntBlog = keywordClusters.filter(c => c.type === "Blog & Guides").length;
  while (cntBlog < 304) {
    const name = `seo tutorial guide #${cntBlog}`;
    keywordClusters.push({
      clusterName: name,
      coreTopic: name,
      intent: "Informational",
      recommendedPagePath: `/blog/seo-guide-tutorial-${cntBlog}`,
      type: "Blog & Guides",
      difficulty: Math.random() > 0.4 ? "Medium" : "Easy",
      score: Math.floor(Math.random() * 30) + 30,
      reviewStatus: Math.random() > 0.5 ? "80%" : "Review (68%)",
      keywords: [{ keyword: name, intent: "Informational", volume: 450, difficulty: 25 }]
    });
    cntBlog++;
  }

  // Fill Comparison Pages (total 26)
  let cntCompCl = keywordClusters.filter(c => c.type === "Comparison Pages").length;
  while (cntCompCl < 26) {
    const name = `competitor battle versus #${cntCompCl}`;
    keywordClusters.push({
      clusterName: name,
      coreTopic: name,
      intent: "Comparison",
      recommendedPagePath: `/versus/compare-brands-${cntCompCl}`,
      type: "Comparison Pages",
      difficulty: "Medium",
      score: Math.floor(Math.random() * 20) + 35,
      reviewStatus: "Review (68%)",
      keywords: [{ keyword: name, intent: "Comparison", volume: 150, difficulty: 41 }]
    });
    cntCompCl++;
  }

  // Fill Location Pages (total 22)
  let cntLocCl = keywordClusters.filter(c => c.type === "Location Pages").length;
  while (cntLocCl < 22) {
    const name = `organic strategy for local city area #${cntLocCl}`;
    keywordClusters.push({
      clusterName: name,
      coreTopic: name,
      intent: "Local",
      recommendedPagePath: `/local/city-listing-${cntLocCl}`,
      type: "Location Pages",
      difficulty: "Easy",
      score: Math.floor(Math.random() * 20) + 20,
      reviewStatus: "80%",
      keywords: [{ keyword: name, intent: "Local", volume: 120, difficulty: 15 }]
    });
    cntLocCl++;
  }


  // 3. GENERATE PAGE MAPPINGS (Target: 407 mappings)
  // Quotas: Easy: 293, Medium: 80, Hard: 26, Very Hard: 5, Unscored: 3
  const pageMappings: PageMappingItem[] = [
    { id: "map-1", title: "ai content repurposing", clusterName: "ai content repurposing", action: "Create", pageType: "Blog Post", difficulty: 20, priority: "Medium", status: "Planned", reason: "Cluster \"ai content repurposing\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-2", title: "semrush vs ahrefs", clusterName: "semrush vs ahrefs", action: "Create", pageType: "Comparison Page", difficulty: 19, priority: "Medium", status: "Planned", reason: "Cluster \"semrush vs ahrefs\" has no existing page. Recommend creating a new Comparison Page." },
    { id: "map-3", title: "boost organic traffic", clusterName: "boost organic traffic", action: "Create", pageType: "Blog Post", difficulty: 0, priority: "Medium", status: "Planned", reason: "Cluster \"boost organic traffic\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-4", title: "what is a - Guide", clusterName: "what is a - Guide", action: "Create", pageType: "Blog Post", difficulty: 0, priority: "Medium", status: "Planned", reason: "Cluster \"what is a - Guide\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-5", title: "what is an - Guide", clusterName: "what is an - Guide", action: "Create", pageType: "Blog Post", difficulty: 23, priority: "Medium", status: "Planned", reason: "Cluster \"what is an - Guide\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-6", title: "how to choose - Guide", clusterName: "how to choose - Guide", action: "Create", pageType: "Blog Post", difficulty: 17, priority: "Medium", status: "Planned", reason: "Cluster \"how to choose - Guide\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-7", title: "what is local - Guide", clusterName: "what is local - Guide", action: "Create", pageType: "Blog Post", difficulty: 50, priority: "Medium", status: "Planned", reason: "Cluster \"what is local - Guide\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-8", title: "general contractor seo", clusterName: "general contractor seo", action: "Create", pageType: "Blog Post", difficulty: 17, priority: "Medium", status: "Planned", reason: "Cluster \"general contractor seo\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-9", title: "what is a - Services", clusterName: "what is a - Services", action: "Create", pageType: "Blog Post", difficulty: 22, priority: "Medium", status: "Planned", reason: "Cluster \"what is a - Services\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-10", title: "local seo for", clusterName: "local seo for", action: "Create", pageType: "Location Page", difficulty: 21, priority: "Medium", status: "Planned", reason: "Cluster \"local seo for\" has no existing page. Recommend creating a new Location Page." },
    { id: "map-11", title: "white label local", clusterName: "white label local", action: "Create", pageType: "Location Page", difficulty: 14, priority: "Medium", status: "Planned", reason: "Cluster \"white label local\" has no existing page. Recommend creating a new Location Page." },
    { id: "map-12", title: "how to increase", clusterName: "how to increase", action: "Create", pageType: "Blog Post", difficulty: 35, priority: "Low", status: "Planned", reason: "Cluster \"how to increase\" has no existing page. Recommend creating a new Blog Post." },
    { id: "map-13", title: "how to research - Guide", clusterName: "how to research - Guide", action: "Create", pageType: "Blog Post", difficulty: 52, priority: "Low", status: "Planned", reason: "Cluster \"how to research - Guide\" has no existing page. Recommend creating a new Blog Post." },
  ];

  let cntEasy = pageMappings.filter(m => m.difficulty <= 30).length;
  let cntMed = pageMappings.filter(m => m.difficulty > 30 && m.difficulty <= 60).length;
  let cntHard = pageMappings.filter(m => m.difficulty > 60 && m.difficulty <= 80).length;
  let cntVHard = pageMappings.filter(m => m.difficulty > 80).length;
  let cntUnscored = 0; // we will add 3 unscored separately with negative or NaN

  // Add 3 Unscored
  while (cntUnscored < 3) {
    pageMappings.push({
      id: `map-un-${cntUnscored}`,
      title: `unscored tracking query #${cntUnscored}`,
      clusterName: `unscored cluster node #${cntUnscored}`,
      action: "Optimise",
      pageType: "Blog Post",
      difficulty: -1, // -1 means unscored
      priority: "Low",
      status: "Planned",
      reason: "Metrics pending API connection scan. Requires manual search target placement."
    });
    cntUnscored++;
  }

  // Fill Very Hard (5 total)
  while (cntVHard < 5) {
    const diffVal = 82 + cntVHard;
    pageMappings.push({
      id: `map-vh-${cntVHard}`,
      title: `high authority keyword core #${cntVHard}`,
      clusterName: `super authority group node #${cntVHard}`,
      action: "Create",
      pageType: "Blog Post",
      difficulty: diffVal,
      priority: "High",
      status: "Planned",
      reason: "High difficulty. Requires comprehensive topical depth and 4 domain backlink boosts."
    });
    cntVHard++;
  }

  // Fill Hard (26 total)
  while (cntHard < 26) {
    const diffVal = 62 + (cntHard % 18);
    pageMappings.push({
      id: `map-hd-${cntHard}`,
      title: `difficult keyword profile #${cntHard}`,
      clusterName: `authority build node #${cntHard}`,
      action: "Create",
      pageType: "Blog Post",
      difficulty: diffVal,
      priority: "High",
      status: "Planned",
      reason: "Hard category ranking overlap. Link mapping from existing site assets recommended."
    });
    cntHard++;
  }

  // Fill Medium (80 total)
  while (cntMed < 80) {
    const diffVal = 32 + (cntMed % 28);
    pageMappings.push({
      id: `map-md-${cntMed}`,
      title: `medium difficulty cluster node #${cntMed}`,
      clusterName: `medium seo cluster Group #${cntMed}`,
      action: "Create",
      pageType: "Blog Post",
      difficulty: diffVal,
      priority: "Medium",
      status: "Planned",
      reason: "Balanced opportunities profile. Standard support page will capture search velocity."
    });
    cntMed++;
  }

  // Fill Easy (293 total)
  while (cntEasy < 293) {
    const diffVal = Math.floor(Math.random() * 30);
    pageMappings.push({
      id: `map-ez-${cntEasy}`,
      title: `easy organic low hanging fruit #${cntEasy}`,
      clusterName: `low hanging keyword group #${cntEasy}`,
      action: "Create",
      pageType: "Blog Post",
      difficulty: diffVal,
      priority: "Low",
      status: "Planned",
      reason: "Low difficulty level. Direct match article will rank on index within 10-15 days."
    });
    cntEasy++;
  }


  // 4. GENERATE CONTENT INVENTORY (Target: 6 pages exactly from screenshot 7)
  const contentInventoryPages: ContentInventoryPage[] = [
    { id: "page-1", url: "https://yourseogirl.com/what-is-a-content-audit/", title: "—", pageType: "Blog Post", status: "Active", lastUpdated: "2026-05-04" },
    { id: "page-2", url: "https://yourseogirl.com/can-seo-and-geo-strategies-work-together-for-better-res...", title: "—", pageType: "Blog Post", status: "Active", lastUpdated: "2026-04-27" },
    { id: "page-3", url: "https://yourseogirl.com/how-long-does-seo-take-to-see-results/", title: "—", pageType: "Blog Post", status: "Active", lastUpdated: "2026-04-27" },
    { id: "page-4", url: "https://yourseogirl.com/how-can-an-ai-search-monitoring-platform-improve-seo-st...", title: "—", pageType: "Blog Post", status: "Active", lastUpdated: "2026-04-27" },
    { id: "page-5", url: "https://yourseogirl.com/unlock-hidden-success-off-page-seo-tips-you-need/", title: "—", pageType: "Blog Post", status: "Active", lastUpdated: "2026-04-23" },
    { id: "page-6", url: "https://yourseogirl.com/how-many-seo-keywords-should-i-use/", title: "—", pageType: "Blog Post", status: "Active", lastUpdated: "2026-04-20" },
  ];


  // 5. GENERATE CALENDAR TASKS
  const actionPlanTasks: ActionPlanTask[] = [
    { id: "task-1", title: "enterprise seo pricing", date: "2026-06-07", status: "Planned" },
    { id: "task-2", title: "seo vs seo", date: "2026-06-09", status: "Planned" },
    { id: "task-3", title: "content marketing jobs", date: "2026-06-11", status: "Planned" },
    { id: "task-4", title: "best content marketing", date: "2026-06-13", status: "Planned" },
    { id: "task-5", title: "content marketing lead", date: "2026-06-15", status: "Planned" },
    { id: "task-6", title: "content marketing specialist", date: "2026-06-17", status: "Planned" },
    { id: "task-7", title: "seo proposal template", date: "2026-06-19", status: "Planned" },
    { id: "task-8", title: "benefits of content", date: "2026-06-21", status: "Planned" },
    { id: "task-9", title: "does google reviews", date: "2026-06-23", status: "Planned" },
    { id: "task-10", title: "do rich snippets", date: "2026-06-25", status: "Planned" },
    { id: "task-11", title: "seo monthly report", date: "2026-06-27", status: "Planned" },
    { id: "task-12", title: "content marketing hub", date: "2026-06-29", status: "Planned" },
  ];

  return {
    id: "global-default-seo",
    name: "Test 1",
    description: "yourseogirl.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    keywords,
    keywordClusters,
    contentClusters: [], // content silos
    templates: [],
    pageMappings,
    actionPlanTasks,
    contentInventoryPages
  };
}
