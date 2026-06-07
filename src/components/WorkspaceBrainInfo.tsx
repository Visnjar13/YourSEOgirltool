import React, { useState } from "react";
import { Workspace, ClientProfile } from "../types";
import { Brain, CheckCircle2, AlertCircle, FileCode, Check, TrendingUp, Sparkles, Building2, Target, Globe, Users2 } from "lucide-react";

interface WorkspaceBrainInfoProps {
  workspace: Workspace;
}

export default function WorkspaceBrainInfo({ workspace }: WorkspaceBrainInfoProps) {
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  const clientProfile: Partial<ClientProfile> = workspace.clientProfile || {};
  const keywords = workspace.keywords || [];
  const clusters = workspace.keywordClusters || [];
  const pages = workspace.pageMappings || [];
  const contentInventory = workspace.contentInventoryPages || [];
  const actionPlan = workspace.actionPlanTasks || [];

  // Calculate readiness score
  const readinessChecks = {
    profile: !!clientProfile.businessName && !!clientProfile.description,
    keywords: keywords.length > 0,
    clusters: clusters.length > 0,
    pages: pages.length > 0,
    inventory: contentInventory.length > 0,
    tasks: actionPlan.length > 0,
  };

  const scorePct = Math.round(
    (Object.values(readinessChecks).filter(Boolean).length / Object.keys(readinessChecks).length) * 100
  );

  const mockContextObj = {
    clientProfile,
    keywordsCount: keywords.length,
    clustersCount: clusters.length,
    pagesCount: pages.length,
    competitors: clientProfile.competitors || [],
    contentInventoryCount: contentInventory.length,
    actionPlanCount: actionPlan.length
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm mb-6" id="workspace-strategy-brain-widget">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left column: Strategic Identity info */}
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-400/20 rounded-2xl text-indigo-400 animate-pulse">
            <Brain className="w-6.5 h-6.5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-wider uppercase font-black text-indigo-350 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                ACTIVE STRATEGY BRAIN
              </span>
              {scorePct === 100 && (
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Fully Tailored
                </span>
              )}
            </div>

            <h3 className="text-base font-black text-white font-display">
              {clientProfile.businessName || "Draft Client Strategy Workspace"}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              {clientProfile.description 
                ? `${clientProfile.description.slice(0, 140)}...` 
                : "Enter your Brand Profile inside the 'Clients' tab to align Gemini mapping results, search intent clustering, and outline creation to your specific business niche."}
            </p>
          </div>
        </div>

        {/* Right column: Dynamic Alignment Score */}
        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 self-stretch md:self-auto justify-between md:justify-center border-t md:border-t-0 border-slate-800/65 pt-4 md:pt-0">
          <div className="text-left md:text-right space-y-0.5">
            <span className="text-[10px] text-slate-450 uppercase tracking-wider font-extrabold block">
              Strategy Score
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono text-cyan-400">
                {scorePct}%
              </span>
              <span className="text-xs text-slate-400">Readiness</span>
            </div>
          </div>

          {/* Core progress layout */}
          <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-400 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${scorePct}%` }}
            ></div>
          </div>
        </div>

      </div>

      {/* Grid of indicators showing context elements */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 mt-5 border-t border-slate-800/60 pt-4.5">
        
        <div className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${readinessChecks.profile ? "bg-slate-900/40 border-slate-800/80 text-white" : "bg-transparent border-slate-950/20 text-slate-500"}`}>
          <div className={`p-1 rounded-lg ${readinessChecks.profile ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}>
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] block opacity-60 font-medium">Profile</span>
            <span className="text-xs font-bold block truncate font-mono">
              {readinessChecks.profile ? "Active" : "Pending"}
            </span>
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${readinessChecks.keywords ? "bg-slate-900/40 border-slate-800/80 text-white" : "bg-transparent border-slate-950/20 text-slate-500"}`}>
          <div className={`p-1 rounded-lg ${readinessChecks.keywords ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] block opacity-60 font-medium">Keywords</span>
            <span className="text-xs font-bold block truncate font-mono">
              {keywords.length} items
            </span>
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${readinessChecks.clusters ? "bg-slate-900/40 border-slate-800/80 text-white" : "bg-transparent border-slate-950/20 text-slate-500"}`}>
          <div className={`p-1 rounded-lg ${readinessChecks.clusters ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] block opacity-60 font-medium">Clusters</span>
            <span className="text-xs font-bold block truncate font-mono">
              {clusters.length} page silos
            </span>
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${readinessChecks.pages ? "bg-slate-900/40 border-slate-800/80 text-white" : "bg-transparent border-slate-950/20 text-slate-500"}`}>
          <div className={`p-1 rounded-lg ${readinessChecks.pages ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}>
            <Target className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] block opacity-60 font-medium">Page Plans</span>
            <span className="text-xs font-bold block truncate font-mono">
              {pages.length} URLs mapped
            </span>
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${readinessChecks.inventory ? "bg-slate-900/40 border-slate-800/80 text-white" : "bg-transparent border-slate-950/20 text-slate-500"}`}>
          <div className={`p-1 rounded-lg ${readinessChecks.inventory ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}>
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] block opacity-60 font-medium">Inventory</span>
            <span className="text-xs font-bold block truncate font-mono">
              {contentInventory.length} live pages
            </span>
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${readinessChecks.tasks ? "bg-slate-900/40 border-slate-800/80 text-white" : "bg-transparent border-slate-950/20 text-slate-500"}`}>
          <div className={`p-1 rounded-lg ${readinessChecks.tasks ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}>
            <Users2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] block opacity-60 font-medium">Action Schedule</span>
            <span className="text-xs font-bold block truncate font-mono">
              {actionPlan.length} active tasks
            </span>
          </div>
        </div>

      </div>

      {/* Trigger for inspecting the complete workspaceContext JSON */}
      <div className="flex items-center justify-between border-t border-slate-800/60 mt-4.5 pt-3.5">
        <span className="text-[10.5px] text-slate-450 italic font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          All AI calls in other tabs prioritize this client strategy brain automatically to prevent generic recommendations.
        </span>

        <button 
          onClick={() => setShowJsonInspector(!showJsonInspector)}
          className="text-xs text-indigo-400 hover:text-indigo-350 hover:bg-white/5 border border-slate-800 hover:border-indigo-500/30 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-colors"
        >
          <FileCode className="w-3.5 h-3.5" />
          {showJsonInspector ? "Close Strategy inspect" : "Inspect workspaceContext"}
        </button>
      </div>

      {/* JSON Inspector Panel */}
      {showJsonInspector && (
        <div className="mt-4 p-4.5 bg-[#0f1115] border border-slate-800 rounded-xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800/85 pb-2 mb-2">
            <span className="text-[10px] font-mono tracking-widest text-[#a855f7] uppercase font-bold">
              UNIFIED STRATEGY BRAIN OBJECT SCHEMA (workspaceContext)
            </span>
            <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
              JSON
            </span>
          </div>
          <pre className="text-[11px] font-mono text-cyan-300 w-full overflow-x-auto max-h-[220px] leading-relaxed select-all">
            {JSON.stringify(mockContextObj, null, 2)}
          </pre>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            💡 Tip: When generating content briefs, silo pathways, and landing copy, the engine passes this exact live payload to calibrate context accuracy.
          </p>
        </div>
      )}

    </div>
  );
}
