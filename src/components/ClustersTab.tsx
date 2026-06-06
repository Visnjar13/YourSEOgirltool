import React, { useState, useMemo } from "react";
import { KeywordCluster, KeywordItem, Workspace, KeywordIntent } from "../types";
import { ChevronDown, ChevronUp, Layers, HelpCircle, Plus, Trash2, Globe, ExternalLink, Sparkles, X, PlusCircle } from "lucide-react";

interface ClustersTabProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
  triggerAlert: (type: "success" | "error", message: string) => void;
  onTriggerAiEngine?: () => Promise<void>;
  aiEngineLoading?: boolean;
}

type TabType = "Service Pages" | "Blog & Guides" | "Comparison Pages" | "Location Pages";

export default function ClustersTab({ 
  workspace, 
  onUpdateWorkspace, 
  triggerAlert,
  onTriggerAiEngine,
  aiEngineLoading = false
}: ClustersTabProps) {
  const [activeCategory, setActiveCategory] = useState<TabType>("Service Pages");
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  // Modal / Inputs state for adding keywords into a specific cluster
  const [addingToCluster, setAddingToCluster] = useState<string | null>(null);
  const [newKeywordToCluster, setNewKeywordToCluster] = useState("");

  // Manual Cluster Creation state
  const [showNewClusterModal, setShowNewClusterModal] = useState(false);
  const [newClusterName, setNewClusterName] = useState("");
  const [newClusterType, setNewClusterType] = useState<TabType>("Service Pages");
  const [newClusterTopic, setNewClusterTopic] = useState("");
  const [newClusterSlug, setNewClusterSlug] = useState("");
  const [newClusterPrimaryKeyword, setNewClusterPrimaryKeyword] = useState("");
  const [newClusterIntent, setNewClusterIntent] = useState<KeywordIntent>("Commercial");

  // Categories with count calculation
  const categories = useMemo(() => {
    const list = workspace.keywordClusters || [];
    return {
      "Service Pages": list.filter(c => c.type === "Service Pages").length,
      "Blog & Guides": list.filter(c => c.type === "Blog & Guides").length,
      "Comparison Pages": list.filter(c => c.type === "Comparison Pages").length,
      "Location Pages": list.filter(c => c.type === "Location Pages").length,
    };
  }, [workspace.keywordClusters]);

  // Derived filtered active list
  const activeClusters = useMemo(() => {
    return (workspace.keywordClusters || []).filter(c => {
      // Fallback: Default to "Blog & Guides" if cluster has no marked type
      const t = c.type || "Blog & Guides";
      return t === activeCategory;
    });
  }, [workspace.keywordClusters, activeCategory]);

  // Derived keywords list inside the active category clusters
  const kwsSumInActiveCategory = useMemo(() => {
    return activeClusters.reduce((sum, c) => sum + (c.keywords?.length || 0), 0);
  }, [activeClusters]);

  // Add individual keyword to a specific cluster
  const handleAddKeywordToCluster = async (clusterName: string) => {
    if (!newKeywordToCluster.trim()) {
      triggerAlert("error", "Keyword phrase cannot be empty.");
      return;
    }

    const keywordName = newKeywordToCluster.trim();

    // Map through and find target cluster
    const updatedClusters = (workspace.keywordClusters || []).map(cluster => {
      if (cluster.clusterName === clusterName) {
        // Prepare new KeywordItem
        const newKwItem: KeywordItem = {
          keyword: keywordName,
          intent: cluster.intent || "Informational",
          volume: 120,
          difficulty: 10,
          cpc: 0,
          clusterName: cluster.clusterName
        };

        return {
          ...cluster,
          keywords: [...(cluster.keywords || []), newKwItem]
        };
      }
      return cluster;
    });

    // Also inject keyword directly into global workspace keywords list if not present
    const hasGlobal = (workspace.keywords || []).some(k => k.keyword.toLowerCase() === keywordName.toLowerCase());
    let updatedKeywords = [...(workspace.keywords || [])];
    if (!hasGlobal) {
      updatedKeywords.push({
        keyword: keywordName,
        intent: activeCategory === "Service Pages" ? "Commercial" : activeCategory === "Comparison Pages" ? "Comparison" : activeCategory === "Location Pages" ? "Local" : "Informational",
        volume: 125,
        difficulty: 12,
        cpc: 0,
        rankingUrl: "—",
        pos: "—"
      });
    }

    await onUpdateWorkspace({
      keywordClusters: updatedClusters,
      keywords: updatedKeywords
    });

    setNewKeywordToCluster("");
    setAddingToCluster(null);
    triggerAlert("success", `Keyword "${keywordName}" successfully mapped in cluster model!`);
  };

  // Create new cluster manually
  const handleCreateManualCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClusterName.trim()) {
      triggerAlert("error", "Please provide a valid page / cluster name.");
      return;
    }

    let finalSlug = newClusterSlug.trim();
    if (finalSlug && !finalSlug.startsWith("/")) {
      finalSlug = "/" + finalSlug;
    }
    if (!finalSlug) {
      finalSlug = "/" + newClusterName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }

    const newClusterObj: KeywordCluster = {
      clusterName: newClusterName.trim(),
      coreTopic: newClusterTopic.trim() || newClusterName.trim(),
      intent: newClusterIntent,
      recommendedPagePath: finalSlug,
      type: newClusterType,
      primaryKeyword: newClusterPrimaryKeyword.trim() || undefined,
      parentTopic: newClusterTopic.trim() || "Digital Strategy",
      confidenceScore: "High",
      opportunityPriority: "High",
      qualityScore: 95,
      decision: "Create New Page",
      priorityReason: "Manually customized prioritised high value brand layout opportunity",
      explanationReason: "Unique business offering requiring specialized positioning elements.",
      explanationEvidence: "Manual entry corresponding to corporate campaign goal requirements.",
      explanationRecommendedAction: "Implement structural layout content maps directly aligned to targets.",
      keywords: newClusterPrimaryKeyword.trim() ? [{
        keyword: newClusterPrimaryKeyword.trim(),
        intent: newClusterIntent,
        volume: 240,
        difficulty: 20,
        cpc: 1.5,
        clusterName: newClusterName.trim()
      }] : []
    };

    const currentClusters = workspace.keywordClusters || [];
    // Prevent duplicate named clusters
    if (currentClusters.some(c => c.clusterName.toLowerCase() === newClusterName.trim().toLowerCase())) {
      triggerAlert("error", `A cluster named "${newClusterName.trim()}" already exists.`);
      return;
    }

    const updatedClusters = [newClusterObj, ...currentClusters];

    // Push primary keyword to global list if defined and not already there
    let updatedKeywords = [...(workspace.keywords || [])];
    if (newClusterPrimaryKeyword.trim()) {
      const exists = updatedKeywords.some(k => k.keyword.toLowerCase() === newClusterPrimaryKeyword.trim().toLowerCase());
      if (!exists) {
        updatedKeywords.push({
          keyword: newClusterPrimaryKeyword.trim(),
          intent: newClusterIntent,
          volume: 240,
          difficulty: 20,
          cpc: 1.5,
          rankingUrl: "—",
          pos: "—"
        });
      }
    }

    await onUpdateWorkspace({
      keywordClusters: updatedClusters,
      keywords: updatedKeywords
    });

    // Reset manual form fields
    setNewClusterName("");
    setNewClusterTopic("");
    setNewClusterSlug("");
    setNewClusterPrimaryKeyword("");
    setNewClusterIntent("Commercial");
    setShowNewClusterModal(false);
    triggerAlert("success", `Custom cluster "${newClusterObj.clusterName}" added successfully.`);
  };

  // Delete specific cluster
  const handleDeleteCluster = async (e: React.MouseEvent, clusterName: string) => {
    e.stopPropagation(); // don't toggle accordion
    if (!confirm(`Are you sure you want to delete the "${clusterName}" page plan cluster?`)) return;

    const remainingClusters = (workspace.keywordClusters || []).filter(c => c.clusterName !== clusterName);
    await onUpdateWorkspace({
      keywordClusters: remainingClusters
    });
    triggerAlert("success", `Pruned "${clusterName}" from active model mapping.`);
  };

  const toggleCluster = (name: string) => {
    setExpandedCluster(expandedCluster === name ? null : name);
  };

  const totalClustersCount = (workspace.keywordClusters || []).length;
  const totalKeywordsGlobal = (workspace.keywords || []).length;

  return (
    <div className="space-y-6" id="clusters-tab-module">
      
      {/* 1. Header Row styled to perfectly replicate the requested screen configuration */}
      <div className="bg-white p-6 border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
        <div>
          <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Clusters</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium font-mono mt-0.5">{workspace.name}</p>
        </div>

        {/* Sub counts block & Active commands */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="text-sm text-slate-600 font-medium">
            <span className="font-bold text-slate-900 font-mono text-base">{totalClustersCount}</span> clusters from <span className="font-bold text-slate-900 font-mono text-base">{totalKeywordsGlobal}</span> keywords
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onTriggerAiEngine && onTriggerAiEngine()}
              disabled={aiEngineLoading}
              className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 disabled:opacity-55 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-3xs"
            >
              <span className={`text-base ${aiEngineLoading ? "animate-spin block" : ""}`}>
                {aiEngineLoading ? "⏳" : "🧠"}
              </span>
              <span>{aiEngineLoading ? "Processing Core Logic..." : "Auto-Cluster Keywords"}</span>
            </button>

            <button
              onClick={() => setShowNewClusterModal(true)}
              className="px-4 py-2 bg-blue-605 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plus New Cluster</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Manual Cluster Addition Modal Frame */}
      {showNewClusterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6.5 max-w-lg w-full space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="text-blue-650 w-5 h-5" />
                <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider font-mono">
                  Design Page-Level Cluster Plan
                </h3>
              </div>
              <button 
                onClick={() => setShowNewClusterModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualCluster} className="space-y-4 text-xs text-left">
              <div>
                <label className="font-bold text-slate-750 block mb-1">Page Plan / Cluster Identifier *</label>
                <input
                  type="text"
                  required
                  value={newClusterName}
                  onChange={(e) => setNewClusterName(e.target.value)}
                  placeholder="e.g. Content Marketing Advisory & Consulting"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-750 block mb-1">Target Page Type *</label>
                  <select
                    value={newClusterType}
                    onChange={(e) => setNewClusterType(e.target.value as TabType)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  >
                    <option value="Service Pages">$ Service Page</option>
                    <option value="Blog & Guides">📖 Blog & Guide</option>
                    <option value="Comparison Pages">🔀 Comparison Page</option>
                    <option value="Location Pages">📍 Location Page</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-750 block mb-1">Search Intent class *</label>
                  <select
                    value={newClusterIntent}
                    onChange={(e) => setNewClusterIntent(e.target.value as KeywordIntent)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Transactional">Transactional</option>
                    <option value="Informational">Informational</option>
                    <option value="Comparison">Comparison</option>
                    <option value="Local">Local</option>
                    <option value="Navigational">Navigational</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-750 block mb-1">Parent Sourced Topic</label>
                  <input
                    type="text"
                    value={newClusterTopic}
                    onChange={(e) => setNewClusterTopic(e.target.value)}
                    placeholder="e.g. Content Marketing"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-750 block mb-1">Target SEO Slug Path</label>
                  <input
                    type="text"
                    value={newClusterSlug}
                    onChange={(e) => setNewClusterSlug(e.target.value)}
                    placeholder="e.g. /services/content-consultant"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-750 block mb-1">Core Primary Keyword Opportunity</label>
                <input
                  type="text"
                  value={newClusterPrimaryKeyword}
                  onChange={(e) => setNewClusterPrimaryKeyword(e.target.value)}
                  placeholder="e.g. content marketing pricing structures"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Will map as the initial primary query inside this layout container.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewClusterModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  Secure Map Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Horizontal categories submenu selector matching Screenshot from user */}
      <div className="bg-white border border-slate-200/70 p-1.5 rounded-2xl flex flex-wrap gap-1.5 shadow-3xs">
        
        <button
          onClick={() => { setActiveCategory("Service Pages"); setExpandedCluster(null); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
            activeCategory === "Service Pages"
              ? "bg-[#e2f1e9] border-[#abdcae]/50 text-emerald-800 font-extrabold shadow-sm"
              : "bg-transparent border-transparent text-slate-500 hover:text-slate-850 hover:bg-slate-50"
          }`}
        >
          <span className="text-xs">$</span>
          <span>Service Pages</span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${activeCategory === "Service Pages" ? "bg-emerald-250 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
            {categories["Service Pages"]}
          </span>
        </button>

        <button
          onClick={() => { setActiveCategory("Blog & Guides"); setExpandedCluster(null); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
            activeCategory === "Blog & Guides"
              ? "bg-[#e2f1e9] border-[#abdcae]/50 text-emerald-800 font-extrabold shadow-sm"
              : "bg-transparent border-transparent text-slate-500 hover:text-slate-850 hover:bg-slate-50"
          }`}
        >
          <span>📖</span>
          <span>Blog & Guides</span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${activeCategory === "Blog & Guides" ? "bg-emerald-250 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
            {categories["Blog & Guides"]}
          </span>
        </button>

        <button
          onClick={() => { setActiveCategory("Comparison Pages"); setExpandedCluster(null); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
            activeCategory === "Comparison Pages"
              ? "bg-[#e2f1e9] border-[#abdcae]/50 text-emerald-800 font-extrabold shadow-sm"
              : "bg-transparent border-transparent text-slate-500 hover:text-slate-850 hover:bg-slate-50"
          }`}
        >
          <span>🔀</span>
          <span>Comparison Pages</span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${activeCategory === "Comparison Pages" ? "bg-emerald-250 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
            {categories["Comparison Pages"]}
          </span>
        </button>

        <button
          onClick={() => { setActiveCategory("Location Pages"); setExpandedCluster(null); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
            activeCategory === "Location Pages"
              ? "bg-[#e2f1e9] border-[#abdcae]/50 text-emerald-800 font-extrabold shadow-sm"
              : "bg-transparent border-transparent text-slate-500 hover:text-slate-850 hover:bg-slate-50"
          }`}
        >
          <span>📍</span>
          <span>Location Pages</span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${activeCategory === "Location Pages" ? "bg-emerald-250 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
            {categories["Location Pages"]}
          </span>
        </button>

      </div>

      {/* 4. Active category count indicator line */}
      <div className="bg-slate-55 bg-[#fafbfc] border border-slate-205/60 px-5.5 py-3.5 rounded-2xl flex items-center justify-between text-xs text-slate-600 font-medium" id="categories-count-subbar">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Viewing {activeCategory} Page Plans</span>
        </span>
        <span className="font-mono bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-3xs font-bold text-slate-800">
          {activeClusters.length} mapped page targets | {kwsSumInActiveCategory} underlying queries
        </span>
      </div>

      {/* 5. Collapsible Cluster plans accordion container */}
      <div className="space-y-3" id="clusters-accordion-pane">
        {activeClusters.length > 0 ? (
          activeClusters.map((cluster, cIdx) => {
            const isExpanded = expandedCluster === cluster.clusterName;
            
            // Calculate cluster metric statistics
            const totVol = cluster.keywords?.reduce((sum, k) => sum + (k.volume || 0), 0) || 0;
            const avgKD = cluster.keywords?.length 
              ? Math.round(cluster.keywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / cluster.keywords.length)
              : 0;

            return (
              <div 
                key={cluster.clusterName + cIdx}
                className="bg-white border border-slate-200/70 rounded-2xl shadow-3xs overflow-hidden transition-all duration-200 hover:border-slate-300"
              >
                {/* Header Strip */}
                <div 
                  onClick={() => toggleCluster(cluster.clusterName)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/40"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Toggle Indicator */}
                    <div className="p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    {/* Topic details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-850 text-sm capitalize truncate font-display">
                        {cluster.clusterName}
                      </h3>
                      {/* URL Path */}
                      <span className="text-[10.5px] font-mono text-emerald-600 font-bold block mt-1 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{cluster.recommendedPagePath}</span>
                      </span>
                    </div>
                  </div>

                  {/* Badges / Metrics / Command Row */}
                  <div className="flex items-center gap-2.5 ml-11 md:ml-0 flex-wrap shrink-0">
                    
                    {/* Intent Tag */}
                    <span className="bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono tracking-wide uppercase">
                      {cluster.intent || "Informational"}
                    </span>

                    {/* KD level */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/50 rounded-lg text-[10px] font-bold text-amber-700">
                      <span>{cluster.difficulty || "Medium"}</span>
                      <span className="bg-white text-amber-850 font-mono px-1 rounded-sm">{cluster.score || avgKD}</span>
                    </div>

                    {/* Progress percentage bar */}
                    <span className="bg-emerald-50 border border-emerald-200/50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      {cluster.reviewStatus || "Planned"}
                    </span>

                    {/* Stats pill representation */}
                    <span className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg font-mono">
                      {cluster.keywords?.length || 0} KW
                    </span>

                    {/* Pruning trash control */}
                    <button
                      onClick={(e) => handleDeleteCluster(e, cluster.clusterName)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Prune cluster target"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>
                </div>

                {/* Expanded keyword listings */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-[#fafbfc]/70 p-6.5 space-y-6">
                    
                    {/* Two-Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left Column: AI SEO Strategist Insights (5 cols) */}
                      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-base text-blue-500 font-bold font-mono">🧠</span>
                            <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                              AI Page Plan Report
                            </h4>
                          </div>
                          
                          {/* Quality Score Badge */}
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-400 block">Cluster Quality</span>
                            <span className="text-xs font-mono font-extrabold text-blue-600">
                              {cluster.qualityScore || 85}%
                            </span>
                          </div>
                        </div>

                        {/* Top Highlights Deck */}
                        <div className="grid grid-cols-2 gap-3.5">
                          
                          {/* Decision */}
                          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Decision</span>
                            <span className={`text-xs font-bold block mt-1 ${
                              cluster.decision === "Update Existing Page" ? "text-emerald-600" :
                              cluster.decision === "Needs Review" ? "text-amber-600" :
                              "text-blue-600"
                            }`}>
                              {cluster.decision || "Create New Page"}
                            </span>
                          </div>

                          {/* Confidence */}
                          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Confidence</span>
                            <span className={`text-xs font-bold block mt-1 ${
                              cluster.confidenceScore === "High" ? "text-emerald-600" :
                              cluster.confidenceScore === "Low" ? "text-rose-600" :
                              "text-amber-600"
                            }`}>
                              {cluster.confidenceScore || "High"}
                            </span>
                          </div>

                          {/* Priority */}
                          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Priority</span>
                            <span className={`text-xs font-bold block mt-1 ${
                              cluster.opportunityPriority === "High" ? "text-rose-650" :
                              cluster.opportunityPriority === "Low" ? "text-slate-400" :
                              "text-amber-600"
                            }`}>
                              ⚡ {cluster.opportunityPriority || "High"}
                            </span>
                          </div>

                          {/* Primary Target Keyword */}
                          <div className="p-3 bg-blue-50/20 rounded-xl border border-blue-100/50 col-span-1">
                            <span className="text-[10px] text-blue-500 block font-mono font-bold uppercase">Primary Keyword Target</span>
                            <span className="text-[11px] font-extrabold text-slate-800 block truncate mt-1" title={cluster.primaryKeyword || cluster.keywords?.[0]?.keyword}>
                              🎯 {cluster.primaryKeyword || cluster.keywords?.[0]?.keyword || "Not Selected"}
                            </span>
                          </div>

                        </div>

                        {/* Strategist Reasoning values */}
                        <div className="space-y-3 pt-1 text-slate-700 text-[11px] leading-relaxed">
                          
                          <div>
                            <span className="font-extrabold text-slate-850 block font-sans">1. Executive Rationale:</span>
                            <p className="text-slate-550 mt-0.5">
                              {cluster.explanationReason || `Combining queries with transactional user intents for ${cluster.clusterName}. Page satisfies commercial interest, helping target groups capture keyword ranking positions.`}
                            </p>
                          </div>

                          <div>
                            <span className="font-extrabold text-slate-850 block font-sans">2. SERP Evidence & Overlaps:</span>
                            <p className="text-slate-555 mt-0.5 font-mono bg-slate-20 bg-slate-50 border border-slate-100 p-2 rounded-lg text-[10px]">
                              {cluster.explanationEvidence || "Overlap indicators suggest 1 primary hub satisfies searcher queries without multi-page cannibalization risks."}
                            </p>
                          </div>

                          <div>
                            <span className="font-extrabold text-slate-850 block font-sans">3. Content Action Plan:</span>
                            <p className="text-blue-700 font-semibold mt-0.5">
                              🚀 {cluster.explanationRecommendedAction || "Design dedicated pillar assets addressing these specific intent targets with helpful comparison statistics."}
                            </p>
                          </div>

                          {cluster.cannibalizationThreats && cluster.cannibalizationThreats.length > 0 && (
                            <div className="bg-rose-50 border border-rose-100/60 p-2.5 rounded-xl">
                              <span className="font-extrabold text-rose-800 block font-mono uppercase text-[9px] mb-1">⚠️ Cannibalization Safeguards</span>
                              <div className="flex flex-wrap gap-1">
                                {cluster.cannibalizationThreats.map((t, tIdx) => (
                                  <span key={tIdx} className="bg-white border border-rose-200 text-rose-700 font-mono text-[9px] px-1.5 py-0.5 rounded">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>

                      </div>

                      {/* Right Column: Secondary Supporting Keywords (7 cols) */}
                      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                          <div className="text-left">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                              Supporting Mapped Synonyms & LSI Variations
                            </span>
                            <p className="text-[10px] text-slate-450">These keywords reinforce the primary targeting goal smoothly on-page.</p>
                          </div>
                          
                          <button
                            onClick={() => setAddingToCluster(addingToCluster === cluster.clusterName ? null : cluster.clusterName)}
                            className="px-3 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3" />
                            <span>Add Keyword</span>
                          </button>
                        </div>

                        {/* Inline keyword addition input field */}
                        {addingToCluster === cluster.clusterName && (
                          <div className="bg-blue-50/30 border border-blue-100/50 p-3 rounded-xl flex gap-2 items-center animate-in slide-in-from-top-2 duration-150">
                            <input
                              type="text"
                              value={newKeywordToCluster}
                              onChange={(e) => setNewKeywordToCluster(e.target.value)}
                              placeholder="Type keyword, e.g., CRM pricing structure..."
                              className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleAddKeywordToCluster(cluster.clusterName)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                          </div>
                        )}

                        <div className="overflow-hidden border border-slate-200/65 rounded-xl bg-white shadow-3xs max-h-80 overflow-y-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 text-slate-500 font-mono text-[10px] uppercase font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-3 pl-4">Supporting Keyword</th>
                                <th className="p-3">Intent Profile</th>
                                <th className="p-3 text-right">Search Volume</th>
                                <th className="p-3 text-center">Difficulty</th>
                                <th className="p-3 text-right">Estimated CPC</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {cluster.keywords && cluster.keywords.length > 0 ? (
                                cluster.keywords.map((kw, kwIdx) => (
                                  <tr key={kw.keyword + kwIdx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 pl-4 font-bold text-slate-800">
                                      {kw.keyword}
                                      {kw.keyword.toLowerCase() === (cluster.primaryKeyword || cluster.keywords?.[0]?.keyword || "").toLowerCase() && (
                                        <span className="text-[8px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-sm ml-1.5 font-mono uppercase">PRIMARY</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <span className="bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9.5px] font-mono tracking-wide font-bold">
                                        {kw.intent}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-slate-600 font-semibold">
                                      {(kw.volume || 120).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-mono font-bold ${
                                        (kw.difficulty || 0) > 65 ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                        (kw.difficulty || 0) > 35 ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                        "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      }`}>
                                        {kw.difficulty || 15}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-slate-500">${(kw.cpc || 0).toFixed(2)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                                    No keywords mapped in this cluster container.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                      </div>

                    </div>

                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 font-semibold rounded-2xl">
            No clusters designed for this category yet. Click 'Auto-Cluster Keywords' or design custom page plans.
          </div>
        )}
      </div>

    </div>
  );
}
