import React, { useState } from "react";
import { ContentHub, Workspace } from "../types";
import { 
  Plus, Sparkles, Filter, RefreshCw, Layers, ArrowDown, 
  CornerDownRight, ArrowRight, Save, Layout, GitMerge, FileText
} from "lucide-react";

interface ContentClusteringProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
}

export default function ContentClustering({ workspace, onUpdateWorkspace }: ContentClusteringProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateContentSilo = async () => {
    // If no custom description, try to compile from the existing cluster metrics
    let finalInput = description.trim();
    if (!finalInput) {
      if (workspace.keywordClusters && workspace.keywordClusters.length > 0) {
        finalInput = `Create a matching content silo structure based on these keyword clusters: ${workspace.keywordClusters.map(c => `${c.clusterName} (Topic: ${c.coreTopic})`).join(", ")}`;
      } else {
        setError("Please describe your website focus or generate keyword clusters first to use as topic targets.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gemini/content-cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentDescription: finalInput,
          existingClusters: workspace.keywordClusters || [],
          clientProfile: workspace.clientProfile || null,
          workspaceContext: {
            clientProfile: workspace.clientProfile || {},
            keywords: workspace.keywords || [],
            clusters: workspace.keywordClusters || [],
            pages: workspace.pageMappings || [],
            competitors: workspace.clientProfile?.competitors || [],
            contentInventory: workspace.contentInventoryPages || [],
            actionPlan: workspace.actionPlanTasks || []
          }
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to generate Content Silo with Gemini API");
      }

      const result = await response.json();
      if (result && result.contentHubs) {
        await onUpdateWorkspace({
          contentClusters: result.contentHubs,
        });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while generating Content Silos.");
    } finally {
      setLoading(false);
    }
  };

  const autofillFromClusters = () => {
    if (workspace.keywordClusters && workspace.keywordClusters.length > 0) {
      const kwSummary = workspace.keywordClusters.map(c => `${c.clusterName} (${c.intent}) targeting ${c.coreTopic}`).join(", ");
      setDescription(`Topical website targeting: ${kwSummary}. Please design an SEO silo hub architecture with logical interlinking.`);
    } else {
      setError("No keyword clusters found in this workspace yet. Try creating keyword clusters first or type a website description above!");
    }
  };

  return (
    <div className="space-y-8" id="content-clustering-section">
      {/* Top Controller */}
      <div className="bg-[#16191f] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-cyan-400" />
            Topical Silo & Content Hub Planner
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Design a structured SEO Silo containing one primary core Pillar page interlinked with focused semantic supporting articles.
          </p>
        </div>

        <div className="mt-4 relative">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-450 block mb-2">
            Describe your Content Theme or Target Keywords
          </label>
          <textarea
            id="content-theme-input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g., An enterprise automation blog for fractional CFOs looking to link accounting software to real estate pipelines..."
            className="w-full text-sm p-4 bg-[#0f1115] border border-slate-800 text-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/10 focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-700"
          ></textarea>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-950/20 border border-rose-500/30 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row justify-between gap-3">
          <button
            id="autofill-btn"
            onClick={autofillFromClusters}
            className="px-4 py-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 hover:bg-cyan-950/40 rounded-xl border border-cyan-900/30 transition-all cursor-pointer"
          >
            ⚡ Auto-compile from Keyword Clusters
          </button>

          <button
            id="generate-silo-btn"
            disabled={loading}
            onClick={generateContentSilo}
            className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-650 rounded-xl shadow-sm hover:shadow flex items-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Planning Pillar & Clusters structures...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Topical Silo Map
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Workspace Silo Chart Display */}
      {workspace.contentClusters && workspace.contentClusters.length > 0 ? (
        <div className="space-y-8" id="silos-display-pane">
          {workspace.contentClusters.map((hub, hubIdx) => (
            <div key={hub.hubTitle + hubIdx} className="bg-[#16191f] border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Hub Title */}
              <div className="border-b border-slate-850 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] tracking-wider font-mono text-cyan-400 uppercase font-bold bg-cyan-950/30 px-2.5 py-0.5 rounded border border-cyan-800/20">
                    Silo Pillar Site
                  </span>
                  <h4 className="font-display text-lg font-bold text-white mt-2">
                    {hub.hubTitle}
                  </h4>
                  <p className="text-xs text-slate-450 mt-1">{hub.description}</p>
                </div>
              </div>

              {/* Graphical Linking Tree Structure */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch relative">
                
                {/* 1. Core Pillar Card (Silo Target) */}
                <div className="xl:col-span-1 border-2 border-cyan-500/80 bg-cyan-950/10 rounded-2xl p-5 flex flex-col justify-between relative shadow-sm overflow-hidden">
                  <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-mono font-bold uppercase py-1 px-3 rounded-bl-lg">
                    1. Main Pillar
                  </div>
                  <div>
                    <span className="text-[10px] tracking-wide text-cyan-400 font-mono font-bold uppercase block">
                      Core Cornerstone Page
                    </span>
                    <h5 className="font-display text-base font-bold text-slate-105 mt-2 line-clamp-2">
                      {hub.pillarPage.title}
                    </h5>
                    
                    <div className="mt-4 bg-[#0f1115] border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500">Target Keyword:</span>
                        <span className="font-semibold text-cyan-300 block mt-0.5">{hub.pillarPage.targetKeyword}</span>
                      </div>
                      <div>
                        <span className="text-slate-550">Pillar Path slug:</span>
                        <span className="font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-900/30 px-1 rounded block mt-0.5 truncate select-all">
                          {hub.pillarPage.recommendedUrl}
                        </span>
                      </div>
                    </div>
                  </div>

                  {hub.pillarPage.outlineSummary && (
                    <div className="mt-4 text-xs font-serif text-slate-300 bg-[#0f1115] p-3 rounded-lg border border-slate-805">
                      <strong>Goal:</strong> {hub.pillarPage.outlineSummary}
                    </div>
                  )}
                </div>

                {/* 2. Visual Interlinking Connections Indicator Column */}
                <div className="hidden xl:flex flex-col items-center justify-around text-cyan-500 px-4">
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-slate-500 uppercase block">
                      Link Flow directions
                    </span>
                    <div className="flex items-center gap-1.5 justify-center py-1">
                      <ArrowRight className="w-5 h-5 mx-auto animate-pulse text-cyan-405" />
                    </div>
                    <span className="text-[10px] italic text-cyan-400 bg-cyan-950/15 border border-cyan-900/25 px-2.5 py-1 rounded block">
                      Internal anchors build contextual relevance
                    </span>
                  </div>
                </div>

                {/* 3. Supporting Cluster Pages (Detailed List) */}
                <div className="xl:col-span-1 space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Subtopic Cluster Nodes ({hub.supportingArticles.length})
                  </div>
                  {hub.supportingArticles.map((sub, sIdx) => (
                    <div
                      key={sub.title + sIdx}
                      className="bg-[#16191f] border border-slate-800 rounded-xl p-4 hover:border-cyan-500/35 transition-all flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            Node 1.{sIdx + 1}
                          </span>
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-905/30 px-2 py-0.5 rounded-full uppercase font-semibold">
                            Supporting Page
                          </span>
                        </div>
                        <h6 className="font-semibold text-xs text-slate-200 mt-1.5 line-clamp-1" title={sub.title}>
                          {sub.title}
                        </h6>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-[#0f1115] p-2.5 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-slate-500 block">Target Keyword:</span>
                            <span className="font-semibold text-slate-300 block truncate">{sub.targetKeyword}</span>
                          </div>
                          <div>
                            <span className="text-slate-550 block">Relative URL:</span>
                            <span className="font-mono text-cyan-400 truncate block mt-0.5">{sub.recommendedUrl}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-start gap-1.5 text-[10px] text-slate-450">
                        <CornerDownRight className="w-3.5 h-3.5 text-cyan-454 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-400 block">Internal Linking Context:</strong>
                          <span>{sub.roleInSilo}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-slate-800 bg-[#16191f]/40 rounded-2xl flex flex-col items-center justify-center p-6">
          <GitMerge className="w-12 h-12 text-cyan-500/25 animate-pulse mb-3" />
          <h4 className="font-display font-bold text-slate-300 text-base">No content silos planned yet</h4>
          <p className="text-sm text-slate-450 max-w-sm mt-1">
            Provide a business description or select <strong className="font-semibold text-cyan-400">⚡ Auto-compile from clusters</strong>, and generate structured topical hub hierarchies.
          </p>
        </div>
      )}
    </div>
  );
}
