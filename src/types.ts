export type KeywordIntent = "Informational" | "Transactional" | "Commercial" | "Navigational" | "Local" | "Comparison";

export interface KeywordItem {
  keyword: string;
  intent: KeywordIntent;
  volume?: number;
  difficulty?: number;
  cpc?: number;
  rankingUrl?: string;
  pos?: string | number;
  clusterName?: string;
}

export interface KeywordCluster {
  clusterName: string;
  coreTopic: string;
  intent: KeywordIntent;
  recommendedPagePath: string;
  keywords: KeywordItem[];
  difficulty?: string; // e.g. "Medium"
  score?: number; // e.g. 64
  reviewStatus?: string; // e.g. "Review (68%)"
  type?: "Service Pages" | "Blog & Guides" | "Comparison Pages" | "Location Pages";
  parentTopic?: string;
  primaryKeyword?: string;
  confidenceScore?: "High" | "Medium" | "Low";
  opportunityPriority?: "High" | "Medium" | "Low";
  priorityReason?: string;
  qualityScore?: number;
  decision?: "Create New Page" | "Update Existing Page" | "Needs Review";
  explanationReason?: string;
  explanationEvidence?: string;
  explanationRecommendedAction?: string;
  cannibalizationThreats?: string[];
}

export interface PageMappingItem {
  id: string;
  title: string;
  clusterName: string;
  action: "Create" | "Optimise" | string;
  pageType: "Blog Post" | "Comparison Page" | "Location Page" | "Service Page" | string;
  difficulty: number;
  priority: "Low" | "Medium" | "High";
  status: "Planned" | "In Progress" | "Completed";
  reason: string;
}

export interface ActionPlanTask {
  id: string;
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  status: "Planned" | "In Progress" | "Completed";
}

export interface ContentInventoryPage {
  id: string;
  url: string;
  title: string;
  pageType: "Blog Post" | "Comparison Page" | "Location Page" | "Service Page" | string;
  status: "Active" | "Draft" | string;
  lastUpdated: string;
}

export interface PillarPage {
  title: string;
  targetKeyword: string;
  recommendedUrl: string;
  outlineSummary?: string;
}

export interface SupportingArticle {
  title: string;
  targetKeyword: string;
  roleInSilo: string;
  recommendedUrl: string;
}

export interface ContentHub {
  hubTitle: string;
  description: string;
  pillarPage: PillarPage;
  supportingArticles: SupportingArticle[];
}

export interface SEOTemplateOutput {
  title: string;
  data: {
    summary: string;
    sections: Array<{
      title: string;
      contentPoints: string[];
      details?: string;
    }>;
  };
}

export interface SavedTemplate {
  id: string;
  title: string;
  type: "brief" | "outline" | "meta_tags" | "intent_finder" | "competitor_clash" | "landing_copy" | "faq_schema";
  inputParams: Record<string, string>;
  outputResult: SEOTemplateOutput;
  createdAt: string;
}

export interface ClientProfile {
  businessName: string;
  websiteUrl: string;
  description: string;
  industry: string;
  targetCountry: string;
  targetAudience: string;
  goals: string[];
  productsServices: string[];
  priorityServices: string[];
  competitors: string[];
  existingPages: string[];
  sitemapUrl: string;
  preferredPageTypes: string[];
  publishingCapacity: string;
  existingSeoData: string[];
  notes: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  creatorEmail?: string;
  isPublic?: boolean;
  keywords: KeywordItem[];
  keywordClusters: KeywordCluster[];
  contentClusters: ContentHub[];
  templates: SavedTemplate[];
  pageMappings?: PageMappingItem[];
  actionPlanTasks?: ActionPlanTask[];
  contentInventoryPages?: ContentInventoryPage[];
  clientProfile?: ClientProfile;
}

