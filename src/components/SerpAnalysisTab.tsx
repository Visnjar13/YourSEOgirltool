import React, { useState } from "react";
import { Workspace } from "../types";
import { Sparkles, CheckCircle, AlertTriangle, Play, RefreshCw, Layers, Check, X, ShieldAlert, BadgeCheck, HelpCircle } from "lucide-react";

interface SerpAnalysisTabProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
  triggerAlert: (type: "success" | "error", message: string) => void;
}

export default function SerpAnalysisTab({ workspace, onUpdateWorkspace, triggerAlert }: SerpAnalysisTabProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const keywordsList = workspace.keywords || [];

  const runAnalysis = async () => {
    if (keywordsList.length === 0) {
      triggerAlert("error", "Please inject or upload keywords first to trigger algorithmic SERP analysis.");
      return;
    }

    setAnalyzing(true);
    triggerAlert("success", "Connecting via Gemini to perform custom SERP Relevance & Feasibility Audit...");

    try {
      const response = await fetch("/api/gemini/analyze-serp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywordsList,
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
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to analyze SERPs");
      }

      const data = await response.json();
      if (data && data.serpAnalysis) {
        // Map back to the keywords
        const updatedKeywords = keywordsList.map(kw => {
          const audited = data.serpAnalysis.find((item: any) => item.keyword.toLowerCase() === kw.keyword.toLowerCase());
          if (audited) {
            return {
              ...kw,
              isRelevant: audited.isRelevant,
              relevanceExplanation: audited.relevanceExplanation,
              isRealistic: audited.isRealistic,
              feasibilityAnalysis: audited.feasibilityAnalysis,
              countryMatch: audited.countryMatch,
              playType: audited.playType,
              strategicAdvice: audited.strategicAdvice
            };
          }
          return kw;
        });

        await onUpdateWorkspace({
          keywords: updatedKeywords
        });
        
        triggerAlert("success", "SERP Relevance & Feasibility Analysis fully completed!");
      }
    } catch (err: any) {
      triggerAlert("error", err.message || "An unexpected error occurred during SERP analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Check how many have been analyzed
  const analyzedCount = keywordsList.filter(k => k.relevanceExplanation !== undefined).length;

  return (
    <div className="space-y-6" id="serp-analysis-tab-module">
      {/* Big Blue Header/Card at the top mimicking Image 4 */}
      <div className="bg-gradient-to-br from-[#1e40af] to-[#1d4ed8] text-white p-7.5 rounded-2xl shadow-md border border-blue-700/50 space-y-5.5 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl"></div>

        <div className="space-y-2 max-w-xl">
          <h3 className="font-display font-extrabold text-white text-lg tracking-tight">
            SERP Analysis & Brand Feasibility Engine
          </h3>
          <p className="text-xs text-blue-100 leading-relaxed font-sans font-medium">
            Analyze Google search results and verify them live against the client's strategic profile. Enforces country fit, publishing capacities, and warns against targeting conflicts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4.5 pt-1.55">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-5 py-3 bg-[#ffffff] hover:bg-slate-100 text-[#1d4ed8] hover:text-[#1e40af] disabled:bg-blue-300 disabled:text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 shrink-0"
          >
            {analyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-500 fill-blue-500" />
            )}
            <span>Analyze SERPs & Check Competitors</span>
          </button>
          
          <span className="text-xs text-blue-100 font-bold font-mono">
            {analyzedCount} / {keywordsList.length} keywords audited against Brand Profile
          </span>
        </div>
      </div>

      {/* Strategy Engine Guidelines Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4.5 text-xs text-slate-650">
        <div className="space-y-1">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            🌍 Target Country Fit
          </span>
          <p className="text-slate-500 text-[11px]">
            Verifies search intent and spellings against the client's target country: <strong className="text-slate-700">{workspace.clientProfile?.targetCountry || "Any US/Global"}</strong>.
          </p>
        </div>
        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-4.5">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            📈 Feasibility & Authority
          </span>
          <p className="text-slate-500 text-[11px]">
            Ensures keyword difficulty correlates correctly with client's publishing capacity: <strong className="text-slate-700">{workspace.clientProfile?.publishingCapacity || "Medium"} (Monthly)</strong>.
          </p>
        </div>
        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-4.5">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            🎯 Relevance Protection
          </span>
          <p className="text-slate-500 text-[11px]">
            Flags and demotes queries that are outside priority product scope or irrelevant to bottom-line goals.
          </p>
        </div>
      </div>

      {/* Warning / Success Summary Card */}
      {analyzedCount > 0 && (
        <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-indigo-500" />
              <h4 className="font-display font-bold text-slate-850 text-sm">
                Live Brand Safety & Relevance Audit
              </h4>
            </div>
            <span className="text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
              Audit Complete ✓
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-slate-500 text-[11px] block uppercase tracking-wider font-mono font-bold">FEASIBILITY SPREAD</span>
              <div className="flex flex-wrap gap-4 mt-1">
                <div>
                  <span className="text-xs text-slate-400">Quick Wins:</span>
                  <span className="font-bold text-slate-800 ml-1.5">{keywordsList.filter(k => k.playType === "Quick Win").length}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Long-Term plays:</span>
                  <span className="font-bold text-slate-800 ml-1.5">{keywordsList.filter(k => k.playType === "Long-term Play").length}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Irrelevant Targets:</span>
                  <span className="font-bold text-rose-600 ml-1.5">{keywordsList.filter(k => k.isRelevant === false).length} flagged</span>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-850 text-xs font-semibold">
              ✨ Guided by Workspace Strategy Rules
            </div>
          </div>
        </div>
      )}

      {/* Main Results Table of Analyzed Keywords */}
      <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
            Analyzed Keyword Nodes & Strategy Recommendations
          </span>
          <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-150">
            Real-time Profile Matching
          </span>
        </div>

        {keywordsList.length > 0 ? (
          <div>
            {analyzedCount === 0 ? (
              <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <ShieldAlert className="w-8 h-8 text-slate-350" />
                <div>
                  <p className="font-semibold text-xs text-slate-600">Pending Brand Evaluation</p>
                  <p className="text-[11px] text-slate-450 mt-1 max-w-sm">
                    Click the "Analyze SERPs & Check Competitors" button above to evaluate these terms against your active client profile and sitemap.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                      <th className="p-4 pl-6">Keyword Node</th>
                      <th className="p-4">Brand Relevance & Intent Fit</th>
                      <th className="p-4">Feasibility Analysis</th>
                      <th className="p-4 pr-6">Strategic Action Advice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {keywordsList.map((kw, idx) => (
                      <tr key={kw.keyword + idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 space-y-1.5 max-w-xs">
                          <span className="font-bold text-slate-800 block truncate" title={kw.keyword}>
                            {kw.keyword}
                          </span>
                          
                          <div className="flex flex-wrap gap-1">
                            {kw.playType && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                kw.playType === "Quick Win" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}>
                                {kw.playType}
                              </span>
                            )}
                            
                            {kw.countryMatch && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                                📍 {kw.countryMatch}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td className="p-4 space-y-2 max-w-md">
                          <div className="flex items-center gap-1.5">
                            {kw.isRelevant ? (
                              <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <BadgeCheck className="w-3.5 h-3.5" /> High Relevance
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <X className="w-3.5 h-3.5" /> Out of Scope
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {kw.relevanceExplanation || "No description provided."}
                          </p>
                        </td>

                        <td className="p-4 space-y-1.5 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            {kw.isRealistic ? (
                              <span className="text-[10px] uppercase font-bold bg-green-50 text-green-700 font-sans">
                                ✅ Realistic Play
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold bg-amber-50 text-amber-700 font-sans">
                                ⚠️ High Authority Req.
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            {kw.feasibilityAnalysis || "Requires more authority links."}
                          </p>
                        </td>

                        <td className="p-4 pr-6 font-medium text-indigo-800 max-w-xs">
                          <div className="bg-indigo-50/55 p-2.5 rounded-lg border border-indigo-100/50">
                            {kw.strategicAdvice || "No specific recommendation rendered."}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 font-semibold text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No keywords loaded inside the workspace to analyze.
          </div>
        )}
      </div>
    </div>
  );
}
