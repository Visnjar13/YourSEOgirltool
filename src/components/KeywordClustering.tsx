import React, { useState, useEffect } from "react";
import { KeywordCluster, Workspace } from "../types";
import { 
  Plus, Sparkles, Filter, RefreshCw, Download, Layers, 
  HelpCircle, ChevronRight, Search, BarChart3, TrendingUp, AlertTriangle
} from "lucide-react";

interface KeywordClusteringProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
  bulkImportedText?: string;
  onClearBulkImport?: () => void;
}

const PRESET_LISTS = [
  {
    name: "👟 E-Commerce Footwear Store",
    keywords: `buy running shoes online\nbest athletic sneakers 2026\ncheap hiking boots discount\nsport brand shoe store\nrecommended outdoor running footwear\nwaterproof trail running shoes price`
  },
  {
    name: "💼 Real Estate SaaS platform",
    keywords: `crm software for realtors\nbest real estate broker app\nlead generation tools for property agents\ntransaction tracking software property\nfree realtor pipeline sheet\nhow to organize agent clients pipeline`
  },
  {
    name: "🦷 Local Clinic Dentist SEO",
    keywords: `emergency dental clinic near me\nbest pediatric dentist reviews\nhow often teeth cleaning\ntoothache treatment costs\naffordable dentures local clinic\nfamily dentistry services`
  }
];

export default function KeywordClustering({ 
  workspace, 
  onUpdateWorkspace,
  bulkImportedText = "",
  onClearBulkImport
}: KeywordClusteringProps) {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bulkImportedText) {
      setRawText((prev) => {
        const added = bulkImportedText.trim();
        if (!prev) return added;
        // Make sure we have a line break
        return prev + "\n" + added;
      });
      if (onClearBulkImport) {
        onClearBulkImport();
      }
    }
  }, [bulkImportedText, onClearBulkImport]);
  
  // Filtering and Sorting state
  const [intentFilter, setIntentFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"none" | "volume" | "difficulty">("none");
  const [searchQuery, setSearchQuery] = useState("");

  const handlePresetSelect = (keywords: string) => {
    setRawText(keywords);
  };

  const runClustering = async () => {
    if (!rawText.trim()) {
      setError("Please paste a list of keywords or choose one of our preset lists.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gemini/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: rawText,
          clientProfile: workspace.clientProfile || null
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to cluster keywords with Gemini API");
      }

      const result = await response.json();
      if (result && result.clusters) {
        // Collect all distinct keywords compiled from cluster list to add to standard keyword tracker
        const allKeywords = result.clusters.flatMap((c: KeywordCluster) => 
          c.keywords.map(kw => ({
            keyword: kw.keyword,
            intent: kw.intent || c.intent,
            volume: kw.volume || Math.floor(Math.random() * 800) + 50,
            difficulty: kw.difficulty || Math.floor(Math.random() * 60) + 10,
            cpc: kw.cpc || Number((Math.random() * 4).toFixed(2)),
            clusterName: c.clusterName
          }))
        );

        await onUpdateWorkspace({
          keywords: allKeywords,
          keywordClusters: result.clusters,
        });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while clustering your keywords.");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!workspace.keywordClusters || workspace.keywordClusters.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Cluster,Core Topic,Target Intent,Recommended Slug,Keyword,Volume,Difficulty,CPC\n";

    workspace.keywordClusters.forEach((c) => {
      c.keywords.forEach((kw) => {
        csvContent += `"${c.clusterName}","${c.coreTopic}","${c.intent}","${c.recommendedPagePath}","${kw.keyword}",${kw.volume || 0},${kw.difficulty || 0},${kw.cpc || 0}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${workspace.name.toLowerCase().replace(/\s+/g, "_")}_keywords_clusters.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute summary stats
  const totalKeywords = workspace.keywords?.length || 0;
  const avgDifficulty = totalKeywords > 0
    ? Math.round(workspace.keywords.reduce((acc, kw) => acc + (kw.difficulty || 0), 0) / totalKeywords)
    : 0;
  const avgCPC = totalKeywords > 0
    ? (workspace.keywords.reduce((acc, kw) => acc + (kw.cpc || 0), 0) / totalKeywords).toFixed(2)
    : "0.00";

  // Filter and Sort local workspace cluster copies
  const filteredClusters = (workspace.keywordClusters || [])
    .map((cluster) => {
      const matchSearch = cluster.clusterName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        cluster.keywords.some(kw => kw.keyword.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const filteredKws = cluster.keywords.filter((kw) => {
        if (intentFilter !== "All" && kw.intent !== intentFilter) return false;
        return kw.keyword.toLowerCase().includes(searchQuery.toLowerCase());
      });

      return {
        ...cluster,
        keywords: filteredKws,
        matchesGeneral: matchSearch,
      };
    })
    .filter((cluster) => {
      if (intentFilter !== "All" && cluster.intent !== intentFilter && cluster.keywords.length === 0) {
        return false;
      }
      return cluster.matchesGeneral || cluster.keywords.length > 0;
    });

  if (sortBy === "volume") {
    filteredClusters.sort((a, b) => {
      const volA = a.keywords.reduce((sum, kw) => sum + (kw.volume || 0), 0);
      const volB = b.keywords.reduce((sum, kw) => sum + (kw.volume || 0), 0);
      return volB - volA;
    });
  } else if (sortBy === "difficulty") {
    filteredClusters.sort((a, b) => {
      const avgA = a.keywords.reduce((sum, kw) => sum + (kw.difficulty || 0), 0) / (a.keywords.length || 1);
      const avgB = b.keywords.reduce((sum, kw) => sum + (kw.difficulty || 0), 0) / (b.keywords.length || 1);
      return avgB - avgA;
    });
  }

  // Color mapping helpers
  const getIntentBadgeStyle = (intent: string) => {
    switch (intent) {
      case "Informational":
        return "bg-blue-950/20 text-blue-400 border-blue-900/30";
      case "Transactional":
        return "bg-emerald-950/20 text-emerald-400 border-emerald-900/30";
      case "Commercial":
        return "bg-amber-950/20 text-amber-400 border-amber-900/30";
      case "Navigational":
        return "bg-purple-950/20 text-purple-400 border-purple-900/30";
      default:
        return "bg-slate-900/50 text-slate-400 border-slate-800";
    }
  };

  const getDifficultyColor = (diff: number) => {
    if (diff > 60) return "text-rose-400 bg-rose-950/20 border-rose-500/20";
    if (diff > 35) return "text-amber-400 bg-amber-950/20 border-amber-500/20";
    return "text-emerald-400 bg-emerald-950/20 border-emerald-500/20";
  };

  return (
    <div className="space-y-8" id="kw-clustering-section">
      {/* Upper Control Console: Multi-line Input & Interactive Presets */}
      <div className="bg-[#16191f] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Keyword Cluster Engine
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Paste your raw target search terms below to map cluster nodes, search intent and URL paths.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400 font-medium py-1.5 self-center">Presets:</span>
            {PRESET_LISTS.map((preset) => (
              <button
                key={preset.name}
                id={`preset-${preset.name.replace(/\s+/g, '')}`}
                onClick={() => handlePresetSelect(preset.keywords)}
                className="px-3 py-1.5 text-slate-300 hover:text-cyan-400 bg-[#0f1115] hover:bg-slate-800 border border-slate-800/85 rounded-lg transition-all cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            id="raw-keywords-input"
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="buy organic dog food
best organic treats puppy
puppy food allergy friendly
healthy food breeds medium size
grain-free kibble reviews"
            className="w-full text-sm font-mono p-4 bg-[#0f1115] border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/10 focus:border-cyan-500/50 outline-none text-slate-200 transition-all placeholder:text-slate-700"
          ></textarea>
        </div>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-950/25 border border-rose-500/20 text-rose-455 text-xs rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            id="run-clustering-btn"
            disabled={loading}
            onClick={runClustering}
            className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-650 rounded-xl shadow-sm hover:shadow flex items-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Clustering and mapping via Gemini...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Cluster & Map Keywords
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Board (Only if keywords gathered) */}
      {totalKeywords > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="keyword-stats">
          <div className="bg-[#16191f] border border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Total Keyphrases</span>
              <span className="font-display text-2xl font-bold text-white mt-1 block">
                {totalKeywords}
              </span>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#16191f] border border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Average Difficulty</span>
              <span className="font-display text-2xl font-bold text-white mt-1 block flex items-baseline gap-1.5">
                {avgDifficulty}%
                <span className="text-xs text-slate-500 font-normal">KD</span>
              </span>
            </div>
            <div className="w-10 h-10 bg-rose-950/20 rounded-xl flex items-center justify-center text-rose-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#16191f] border border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Average Est. CPC</span>
              <span className="font-display text-2xl font-bold text-white mt-1 block">
                ${avgCPC}
              </span>
            </div>
            <div className="w-10 h-10 bg-emerald-950/20 rounded-xl flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#16191f] border border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Clusters Formed</span>
              <span className="font-display text-2xl font-bold text-white mt-1 block">
                {workspace.keywordClusters?.length || 0}
              </span>
            </div>
            <div className="w-10 h-10 bg-amber-950/20 rounded-xl flex items-center justify-center text-amber-400">
              <Filter className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Results Clusters List */}
      {(workspace.keywordClusters && workspace.keywordClusters.length > 0) ? (
        <div className="space-y-6" id="clusters-display-pane">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#16191f] border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-xs w-full md:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-400 font-medium shrink-0">Intent Filter:</span>
              <div className="flex flex-wrap gap-1">
                {["All", "Informational", "Transactional", "Commercial", "Navigational"].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => setIntentFilter(intent)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                      intentFilter === intent
                        ? "bg-cyan-650 text-white border-cyan-650 shadow-sm"
                        : "bg-[#0f1115] text-slate-350 border-slate-800 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {intent}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-550" />
                <input
                  type="text"
                  placeholder="Query cluster or phrase..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-800 bg-[#0f1115] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/10 focus:border-cyan-500/50 text-slate-200 placeholder:text-slate-700"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs px-3 py-2 bg-[#0f1115] border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="none" className="bg-[#0f1115]">Sort: Default</option>
                <option value="volume" className="bg-[#0f1115]">Sort: Vol Desc</option>
                <option value="difficulty" className="bg-[#0f1115]">Sort: KD Difficulty</option>
              </select>

              <button
                id="export-csv-btn"
                onClick={exportToCSV}
                className="p-2 text-slate-400 hover:text-cyan-400 bg-[#0f1115] hover:bg-slate-800 border border-slate-800 rounded-lg transition-all shadow-xs cursor-pointer"
                title="Export Workspace CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Clusters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredClusters.map((cluster, idx) => (
              <div
                key={cluster.clusterName + idx}
                className="bg-[#16191f] border border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col hover:shadow-sm hover:border-cyan-900/50 transition-all"
              >
                {/* Header Banner */}
                <div className="bg-[#1a1f26] px-5 py-4 border-b border-slate-850/80 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] tracking-wider font-mono text-slate-455 uppercase font-semibold block">
                      SEO Cluster Node
                    </span>
                    <h4 className="font-display text-base font-bold text-white mt-1">
                      {cluster.clusterName}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getIntentBadgeStyle(cluster.intent)}`}>
                    {cluster.intent}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Semantic targets */}
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wide">
                      Topical Core focus & slug mapping
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-450">Core Topic:</span>
                        <span className="font-semibold text-slate-200 block mt-0.5 truncate">{cluster.coreTopic}</span>
                      </div>
                      <div>
                        <span className="text-slate-455">Target URL Slug:</span>
                        <span className="font-mono bg-[#0f1115] px-1.5 py-0.5 rounded text-cyan-400 font-semibold block mt-0.5 truncate border border-slate-800" title={cluster.recommendedPagePath}>
                          {cluster.recommendedPagePath}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Keywords Table list */}
                  <div className="space-y-2 flex-1">
                    <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wide">
                      Target Queries Group ({cluster.keywords.length})
                    </span>
                    <div className="max-h-56 overflow-y-auto border border-slate-850 bg-[#0f1115] rounded-xl divide-y divide-slate-850">
                      {cluster.keywords.length === 0 ? (
                        <div className="p-4 text-xs text-slate-600 text-center">No keywords matched filters</div>
                      ) : (
                        cluster.keywords.map((kw, kwIdx) => (
                           <div key={kw.keyword + kwIdx} className="p-2.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-800/30 transition-all">
                            <span className="font-semibold text-slate-200 truncate" title={kw.keyword}>
                              {kw.keyword}
                            </span>
                            <div className="flex items-center gap-3 shrink-0 text-slate-400 font-mono">
                              <span className="text-[11px]" title="Monthly search volume">
                                {kw.volume !== undefined ? `${kw.volume} vol` : "150 vol"}
                              </span>
                              <span className="text-[11px]" title="Cost-per-click">
                                {kw.cpc !== undefined ? `$${kw.cpc.toFixed(2)}` : "$1.20"}
                              </span>
                              <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${getDifficultyColor(kw.difficulty || 45)}`}>
                                KD: {kw.difficulty}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredClusters.length === 0 && (
              <div className="col-span-2 py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 bg-[#16191f]/40">
                <HelpCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No clusters found matching your query or filter.</p>
                <p className="text-xs text-slate-500 mt-1">Try resetting the Search Intent filter to All.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-slate-800 bg-[#16191f]/40 rounded-2xl flex flex-col items-center justify-center p-6">
          <Layers className="w-12 h-12 text-cyan-500/25 animate-pulse mb-3" />
          <h4 className="font-display font-bold text-slate-300 text-base">Your Keyword map is empty</h4>
          <p className="text-sm text-slate-450 max-w-sm mt-1">
            Choose a preset or paste structural search phrases, and hit <strong className="font-semibold text-cyan-405">Cluster & Map Keywords</strong> to generate visual structures with search volume and intent.
          </p>
        </div>
      )}
    </div>
  );
}
