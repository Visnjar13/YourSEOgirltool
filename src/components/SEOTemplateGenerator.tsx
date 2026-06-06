import React, { useState } from "react";
import { SavedTemplate, SEOTemplateOutput, Workspace } from "../types";
import { 
  Sparkles, RefreshCw, Copy, Check, Download, FileText, 
  Map, Lightbulb, Heading, AlertCircle, Trash2, Calendar,
  BookOpen, Code, Presentation, FileJson, ChevronLeft, ChevronRight
} from "lucide-react";

interface SEOTemplateGeneratorProps {
  workspace: Workspace;
}

interface SEOTemplateGeneratorWithCallbackProps extends SEOTemplateGeneratorProps {
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
}

type TemplateType = "brief" | "outline" | "meta_tags" | "intent_finder" | "competitor_clash" | "landing_copy" | "faq_schema";
type PreviewOption = "formatted" | "markdown" | "slides" | "schema_json";

const TEMPLATES = [
  {
    id: "brief" as TemplateType,
    title: "📝 SEO Content Brief",
    description: "Prepare an actionable content brief for writers with target word counts, keywords, and tone recommendations.",
    fields: [
      { name: "keyword", label: "Target Keyword", placeholder: "e.g., best accounting software" },
      { name: "audience", label: "Target Audience", placeholder: "e.g., startup managers, small businesses" },
      { name: "topic", label: "Core Topic Theme", placeholder: "e.g., e-commerce automation growth" },
    ]
  },
  {
    id: "outline" as TemplateType,
    title: "🧱 Detailed SEO Outline",
    description: "Generate a detailed header structure (H1, H2, H3) with semantic content recommendations for each section.",
    fields: [
      { name: "theme", label: "Target Topic theme", placeholder: "e.g., fractional CFO analytics dashboards" },
      { name: "title", label: "Page Target Title", placeholder: "e.g., The Definitive Guide to Fractional CFO Automations" },
      { name: "length", label: "Length target", placeholder: "e.g., Medium (1500 words) or Core Pillar (3000 words)" },
    ]
  },
  {
    id: "meta_tags" as TemplateType,
    title: "🏷️ Title & Meta Tags Writer",
    description: "Craft optimized Google search titles and meta descriptions with strict character boundaries.",
    fields: [
      { name: "summary", label: "Article / Site Summary", placeholder: "e.g., an automated lead generation plugin for real estate databases" },
      { name: "brand", label: "Brand / Site Name", placeholder: "e.g., PropTech CRM" },
      { name: "keyword", label: "Primary Keyphrase", placeholder: "e.g., real estate leads automatically" },
    ]
  },
  {
    id: "intent_finder" as TemplateType,
    title: "🔍 Search Intent Finder",
    description: "Inspect raw queries to map search intent classes and provide target page type suggestions.",
    fields: [
      { name: "terms", label: "Paste Search Terms", placeholder: "e.g., Proptech reviews, how to setup lead tools, proptech pricing" }
    ]
  },
  {
    id: "competitor_clash" as TemplateType,
    title: "⚔️ Competitor Gap Analyst",
    description: "Compare your offer against visible competitors' search footprints to identify and exploit authority gaps.",
    fields: [
      { name: "brandOffer", label: "Your Core Offer Highlight", placeholder: "e.g., visual keyword clustering app with real-time sync" },
      { name: "competitorNames", label: "Competitor Sites/Brands", placeholder: "e.g., Semrush, Ahrefs, Moz" },
      { name: "targetQuery", label: "Target High-Value Search Term", placeholder: "e.g., automated SEO content mapping tools" },
    ]
  },
  {
    id: "landing_copy" as TemplateType,
    title: "🎯 Product-to-SEO Landing Copy",
    description: "Convert key product features and benefit triggers into optimized landing page copy and hooks.",
    fields: [
      { name: "productName", label: "Your Product Name", placeholder: "e.g., SEO Workspace Studio Pro" },
      { name: "targetBenefits", label: "Core Key Benefits", placeholder: "e.g., automated brief builder, saves 15 hours every week" },
      { name: "primaryHook", label: "Primary Pain Point hook", placeholder: "e.g., tired of manually extracting keywords from screenshots" },
    ]
  },
  {
    id: "faq_schema" as TemplateType,
    title: "🏷️ Rich FAQ & Schema Builder",
    description: "Draft comprehensive answers for users' biggest questions and simulate valid FAQ JSON-LD schemas.",
    fields: [
      { name: "coreTopic", label: "Main Theme / Target Subject", placeholder: "e.g., Fractional CFO accounting software cost" },
      { name: "audienceQuestions", label: "Questions to Answer (comma separated)", placeholder: "e.g., Is setting up free? How are spreadsheets imported? Is QuickBooks synced?" }
    ]
  }
];

export default function SEOTemplateGenerator({ workspace, onUpdateWorkspace }: SEOTemplateGeneratorWithCallbackProps) {
  const [activeTemp, setActiveTemp] = useState<TemplateType>("brief");
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOutput, setActiveOutput] = useState<SEOTemplateOutput | null>(null);
  const [copied, setCopied] = useState(false);

  // Preview Strategy Switcher States
  const [selectedPreview, setSelectedPreview] = useState<PreviewOption>("formatted");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Load a saved generation from history
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  const handleParamChange = (name: string, value: string) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const selectedTemplateDetails = TEMPLATES.find(t => t.id === activeTemp)!;

  const runTemplateGeneration = async () => {
    setLoading(true);
    setError(null);
    setActiveOutput(null);
    setSelectedSavedId(null);
    setCurrentSlideIndex(0);

    try {
      const response = await fetch("/api/gemini/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTemp, params }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to generate template via Gemini.");
      }

      const result = await response.json();
      if (result && result.title && result.data) {
        setActiveOutput(result);
      } else {
        throw new Error("Invalid output layout returned by Gemini.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during template creation.");
    } finally {
      setLoading(false);
    }
  };

  const saveToWorkspace = async () => {
    if (!activeOutput) return;

    const newSaved: SavedTemplate = {
      id: Math.random().toString(36).substring(2, 11),
      title: activeOutput.title || `${selectedTemplateDetails.title} Generation`,
      type: activeTemp,
      inputParams: { ...params },
      outputResult: activeOutput,
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = [...(workspace.templates || []), newSaved];
    await onUpdateWorkspace({ templates: updatedTemplates });
    setSelectedSavedId(newSaved.id);
  };

  const deleteSavedTemplate = async (templateId: string) => {
    const filtered = (workspace.templates || []).filter(t => t.id !== templateId);
    await onUpdateWorkspace({ templates: filtered });
    if (selectedSavedId === templateId) {
      setActiveOutput(null);
      setSelectedSavedId(null);
    }
  };

  const loadSavedTemplate = (saved: SavedTemplate) => {
    setActiveTemp(saved.type);
    setParams(saved.inputParams);
    setActiveOutput(saved.outputResult);
    setSelectedSavedId(saved.id);
    setCurrentSlideIndex(0);
  };

  // Compile full Markdown of the current specification
  const getCompiledMarkdown = () => {
    if (!activeOutput) return "";
    let text = `# ${activeOutput.title}\n\n`;
    if (activeOutput.data.summary) {
      text += `> **EXECUTIVE SUMMARY / SEO INTENT:**\n> ${activeOutput.data.summary}\n\n`;
    }
    
    if (activeOutput.data.sections && activeOutput.data.sections.length > 0) {
      activeOutput.data.sections.forEach(s => {
        text += `## 📌 ${s.title}\n`;
        s.contentPoints.forEach(p => {
          text += `- ${p}\n`;
        });
        if (s.details) {
          text += `\n*Recommendation:* ${s.details}\n`;
        }
        text += "\n";
      });
    }
    return text.trim();
  };

  const copyToClipboard = () => {
    if (!activeOutput) return;
    const text = getCompiledMarkdown();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build presentation slides representation array dynamically
  const getSlides = () => {
    if (!activeOutput) return [];
    const slidesList = [];
    
    // Slide 1: Welcome & Overview
    slidesList.push({
      title: "🎯 Strategy Focus & Background Overview",
      subtitle: activeOutput.title,
      points: [
        activeOutput.data.summary || "No executive summary provided."
      ],
      commentary: "Targeting high relevance and alignment based on keyword and competitor insights."
    });

    // Content section slides
    if (activeOutput.data.sections) {
      activeOutput.data.sections.forEach((sec, idx) => {
        slidesList.push({
          title: `Slide ${idx + 2}: ${sec.title}`,
          subtitle: "Operational Content & Optimization Directives",
          points: sec.contentPoints,
          commentary: sec.details || "Address this section fully in the copywriting process."
        });
      });
    }

    // Closing slide
    slidesList.push({
      title: "🏁 Launch and Measuring Metrics",
      subtitle: "Recommended SEO Next Steps",
      points: [
        "Deploy optimized page according to outline directives",
        "Submit URL via Google Search Console index request",
        "Monitor tracking targets and keyword ranking velocity"
      ],
      commentary: "Re-evaluate performance indexing in 30 days to check climb velocity."
    });

    return slidesList;
  };

  const slides = getSlides();

  return (
    <div className="space-y-8" id="template-generator-section">
      {/* Template Select Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {TEMPLATES.map((temp) => (
          <button
            key={temp.id}
            id={`temp-tab-${temp.id}`}
            onClick={() => {
              setActiveTemp(temp.id);
              setActiveOutput(null);
              setSelectedSavedId(null);
              setParams({});
              setError(null);
            }}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
              activeTemp === temp.id
                ? "bg-cyan-600 border-cyan-600 text-white shadow-md relative"
                : "bg-[#16191f] border-slate-855 hover:border-cyan-500/30 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="text-sm font-semibold block">{temp.title}</span>
            <span className={`text-[11px] block mt-1 line-clamp-2 ${activeTemp === temp.id ? "text-cyan-105" : "text-slate-500"}`}>
              {temp.description}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Parameter Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#16191f] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <h4 className="font-display font-semibold text-white text-sm border-b border-slate-850 pb-3 flex items-center justify-between">
              <span>Configure Parameters</span>
              <span className="text-[9px] uppercase font-mono bg-cyan-955 text-cyan-404 px-2 py-0.5 rounded border border-cyan-900/30">
                SEO Prompter
              </span>
            </h4>

            <div className="space-y-4.5 mt-4.5">
              {selectedTemplateDetails.fields.map((field) => (
                <div key={field.name}>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">{field.label}</label>
                  <input
                    type="text"
                    id={`input-${field.name}`}
                    value={params[field.name] || ""}
                    onChange={(e) => handleParamChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full text-xs p-3 border border-slate-800 bg-[#0f1115] text-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/15 placeholder:text-slate-700 font-sans"
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-950/25 border border-rose-500/20 text-rose-400 rounded-lg text-xs leading-relaxed">
                {error}
              </div>
            )}

            <button
              id="run-template-btn"
              disabled={loading}
              onClick={runTemplateGeneration}
              className="w-full mt-6 py-2.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating via Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Templates Output
                </>
              )}
            </button>
          </div>

          {/* Saved History */}
          <div className="bg-[#16191f] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <h4 className="font-display font-semibold text-white text-sm border-b border-slate-850 pb-3">
              Workspace Generation History
            </h4>

            <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(!workspace.templates || workspace.templates.length === 0) ? (
                <div className="text-xs text-center text-slate-500 py-6 border-2 border-dashed border-slate-855 rounded-xl bg-[#0f1115]/30">
                  No saved templates in this workspace yet.
                </div>
              ) : (
                workspace.templates.map((saved) => (
                  <div
                    key={saved.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedSavedId === saved.id
                        ? "bg-cyan-950/20 border-cyan-800/40"
                        : "bg-[#0f1115] border-slate-850 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex-1 min-w-0" onClick={() => loadSavedTemplate(saved)}>
                      <span className="font-semibold text-slate-200 block truncate leading-tight">
                        {saved.title}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        {new Date(saved.createdAt).toLocaleDateString()}
                        <span className="font-bold text-cyan-404 font-sans uppercase text-[9px] truncate">
                          • {saved.type.replace("_", " ")}
                        </span>
                      </span>
                    </div>

                    <button
                      onClick={() => deleteSavedTemplate(saved.id)}
                      className="p-1 px-2 text-slate-500 hover:text-rose-400 rounded transition-all ml-2 cursor-pointer"
                      title="Delete saved template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Output Area with PREVIEW STRATEGY SELECTOR Tabs */}
        <div className="lg:col-span-8 space-y-6" id="template-output-pane">
          {activeOutput ? (
            <div className="bg-[#16191f] border border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              
              {/* Output Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-855 pb-4.5 gap-4">
                <div>
                  <span className="text-[9px] uppercase font-mono bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded font-bold border border-cyan-900/30">
                    Engine Generation Response
                  </span>
                  <h4 className="font-display text-base font-bold text-white mt-1.5 leading-snug">
                    {activeOutput.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={copyToClipboard}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-300 border border-slate-800 hover:bg-[#0f1115] hover:text-cyan-450 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Copy full specification markdown structure"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied spec" : "Copy Spec"}</span>
                  </button>

                  {!selectedSavedId && (
                    <button
                      id="save-to-workspace-btn"
                      onClick={saveToWorkspace}
                      className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-750 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-cyan-550/20 shadow-cyan-950/20"
                    >
                      Save to History
                    </button>
                  )}
                </div>
              </div>

              {/* THREE PREVIEW STRATEGY SELECTOR OPTIONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f1115] p-1.5 rounded-xl border border-slate-850" id="preview-options-deck">
                <span className="text-[10px] font-bold font-mono text-slate-500 uppercase pl-2">
                  Preview options:
                </span>
                
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedPreview("formatted")}
                    className={`px-3 py-1 text-xs font-bold transition-all rounded-lg flex items-center gap-1.5 cursor-pointer border ${
                      selectedPreview === "formatted"
                        ? "bg-cyan-600/10 border-cyan-500/20 text-cyan-400 shadow-2xs"
                        : "border-transparent text-slate-450 hover:text-slate-205"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Formatted Doc</span>
                  </button>

                  <button
                    onClick={() => setSelectedPreview("markdown")}
                    className={`px-3 py-1 text-xs font-bold transition-all rounded-lg flex items-center gap-1.5 cursor-pointer border ${
                      selectedPreview === "markdown"
                        ? "bg-cyan-600/10 border-cyan-500/20 text-cyan-400 shadow-2xs"
                        : "border-transparent text-slate-450 hover:text-slate-205"
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Raw Markdown</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPreview("slides");
                      setCurrentSlideIndex(0);
                    }}
                    className={`px-3 py-1 text-xs font-bold transition-all rounded-lg flex items-center gap-1.5 cursor-pointer border ${
                      selectedPreview === "slides"
                        ? "bg-cyan-600/10 border-cyan-500/20 text-cyan-400 shadow-2xs"
                        : "border-transparent text-slate-450 hover:text-slate-205"
                    }`}
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span>Client Presentation Slides</span>
                  </button>

                  <button
                    onClick={() => setSelectedPreview("schema_json")}
                    className={`px-3 py-1 text-xs font-bold transition-all rounded-lg flex items-center gap-1.5 cursor-pointer border ${
                      selectedPreview === "schema_json"
                        ? "bg-cyan-600/10 border-cyan-500/20 text-cyan-400 shadow-2xs"
                        : "border-transparent text-slate-450 hover:text-slate-205"
                    }`}
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>Structured JSON</span>
                  </button>
                </div>
              </div>

              {/* RENDER ACTIVE PREVIEW OPTION */}
              <div className="space-y-6 pt-1 animate-in fade-in" id="preview-rendered-box">
                
                {/* 1. Standard Interactive Formatted Document View */}
                {selectedPreview === "formatted" && (
                  <div className="space-y-6 bg-[#16191f]">
                    {activeOutput.data.summary && (
                      <div className="p-4.5 bg-[#0f1115] border border-slate-850 rounded-xl relative overflow-hidden">
                        <div className="absolute right-0 top-0 bg-cyan-950/50 text-cyan-500 px-2.5 py-1 text-[8px] font-mono border-l border-b border-slate-800 rounded-bl font-bold uppercase tracking-widest">
                          Executive Summary
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wide block">
                          Target Search Intent & Core Focus Overview
                        </span>
                        <p className="text-xs text-slate-305 mt-2.5 leading-relaxed">
                          {activeOutput.data.summary}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {activeOutput.data.sections && activeOutput.data.sections.map((section, sIdx) => (
                        <div 
                          key={section.title + sIdx} 
                          className="border border-slate-850 bg-[#0f1115]/30 rounded-xl p-4.5 space-y-3.5 hover:border-slate-800 transition-colors"
                        >
                          <h5 className="font-display font-semibold text-[13px] text-slate-100 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                            {section.title}
                          </h5>

                          {section.contentPoints && section.contentPoints.length > 0 && (
                            <ul className="space-y-2 list-none pl-3 border-l-2 border-cyan-600/20">
                              {section.contentPoints.map((point, pIdx) => (
                                <li key={pIdx} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                                  <span className="text-cyan-400 text-xs font-mono leading-none mt-1 shrink-0">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {section.details && (
                            <div className="text-[11px] text-slate-450 italic bg-[#0f1115]/60 p-2.5 rounded-lg border border-slate-855/60 mt-2">
                              💡 Writer directive: {section.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Raw Markdown Preview */}
                {selectedPreview === "markdown" && (
                  <div className="bg-[#0f1115] border border-slate-850 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-850/80">
                      <span className="font-mono flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-cyan-500" />
                        seo-generation-spec.md
                      </span>
                      <span className="text-[10px] text-slate-500">Click anywhere inside codeblock to select all</span>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto bg-slate-950/20 p-4 rounded-lg border border-slate-900">
                      <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-all">
                        {getCompiledMarkdown()}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 3. Client Presentation Slides View */}
                {selectedPreview === "slides" && (
                  <div className="space-y-4">
                    {/* Slide card frame */}
                    <div className="min-h-[300px] bg-radial from-slate-900 to-[#0f1115] border border-cyan-800/25 rounded-2xl p-6.5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                      {/* Grid background effect */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0e12_1px,transparent_1px),linear-gradient(to_bottom,#0c0e12_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none"></div>

                      <div className="relative space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono tracking-widest text-cyan-500 font-bold uppercase bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900/30">
                            Slide Preview Mode
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold">
                            CARD {currentSlideIndex + 1} OF {slides.length}
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <h4 className="text-base font-display font-extrabold text-white leading-tight">
                            {slides[currentSlideIndex]?.title}
                          </h4>
                          <p className="text-[11px] text-cyan-405 font-mono">
                            {slides[currentSlideIndex]?.subtitle}
                          </p>
                        </div>

                        {/* Bullet points on slide */}
                        <div className="pt-3.5 space-y-2.5 max-h-[180px] overflow-y-auto">
                          {slides[currentSlideIndex]?.points.map((pt, pIdx) => (
                            <div key={pIdx} className="bg-[#0f1115]/30 border border-slate-850/50 p-2.5 rounded-xl text-xs text-slate-205 flex items-start gap-2.5 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                              <span>{pt}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom slide footer & presenter insights */}
                      <div className="pt-4 border-t border-slate-850 relative z-10 space-y-3">
                        <div className="text-[10px] text-slate-500 leading-normal bg-slate-900/40 rounded p-2 border border-slate-855/60 font-sans italic">
                          💡 Presenter Notes: {slides[currentSlideIndex]?.commentary}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] font-mono text-slate-600">SEO Workspace Pitch Deck Suite</span>
                          
                          <div className="flex items-center gap-2">
                            <button
                              disabled={currentSlideIndex === 0}
                              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                              className="p-1 px-2.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-400 hover:text-slate-100 transition-all font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-800"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
                            </button>
                            <button
                              disabled={currentSlideIndex === slides.length - 1}
                              onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                              className="p-1 px-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-30 rounded text-white transition-all font-bold text-xs flex items-center justify-center cursor-pointer"
                            >
                              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Structured JSON View */}
                {selectedPreview === "schema_json" && (
                  <div className="bg-[#0f1115] border border-slate-850 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-850/80">
                      <span className="font-mono flex items-center gap-1">
                        <FileJson className="w-3.5 h-3.5 text-cyan-500" />
                        google-schema-visualizer.json
                      </span>
                      <span className="text-[9px] uppercase font-mono bg-[#161a22] text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                        Simulated Schema Block
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                      This JSON representation shows the raw metadata layout optimized for indexing systems or Headless CMS injections.
                    </p>

                    <div className="max-h-[400px] overflow-y-auto bg-slate-950/30 p-4 rounded-lg border border-slate-900 font-mono text-[11px] text-emerald-400 whitespace-pre">
                      {JSON.stringify(
                        {
                          "@context": "https://schema.org",
                          "@type": activeTemp === "faq_schema" ? "FAQPage" : "Article",
                          "name": activeOutput.title,
                          "description": activeOutput.data.summary,
                          "templatesType": activeTemp,
                          "workspaceIdentifier": workspace.id,
                          "structuredSections": activeOutput.data.sections?.map((s, i) => ({
                            "@type": "SectionSpec",
                            "index": i + 1,
                            "heading": s.title,
                            "bulletDirectives": s.contentPoints,
                            "recommendations": s.details
                          })) || []
                        }, 
                        null, 
                        2
                      )}
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 bg-[#16191f]/40 rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              <FileText className="w-12 h-12 text-cyan-500/25 animate-pulse mb-3" />
              <h4 className="font-display font-semibold text-slate-450 text-sm">No output generated yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Fill in the configuring parameters and trigger <strong className="font-semibold text-cyan-400">Generate Templates Output</strong> to execute custom Gemini-driven outputs.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
