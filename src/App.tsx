import React, { useState, useEffect } from "react";
import { Workspace } from "./types";
import KeywordClustering from "./components/KeywordClustering";
import ContentClustering from "./components/ContentClustering";
import SEOTemplateGenerator from "./components/SEOTemplateGenerator";
import SmartUploadHub from "./components/SmartUploadHub";

// Fully styled mockup components to replace raw placeholders
import KeywordsTab from "./components/KeywordsTab";
import ClustersTab from "./components/ClustersTab";
import SerpAnalysisTab from "./components/SerpAnalysisTab";
import PageMappingTab from "./components/PageMappingTab";
import ActionPlanTab from "./components/ActionPlanTab";
import ContentInventoryTab from "./components/ContentInventoryTab";

import { generateSeedWorkspace } from "./utils/seedData";

import { 
  Layers, GitMerge, FileText, Share2, Plus, ArrowRight,
  FolderOpen, Trash2, HelpCircle, Check, Sparkles, ExternalLink, RefreshCw,
  LogIn, LogOut, Eye, Lock, Globe, Shield, ShieldAlert,
  LayoutDashboard, Tag, Target, Users, Download, ChevronDown, CheckCircle2, ClipboardList, Settings, Sparkle, AlertTriangle, Play, TrendingUp
} from "lucide-react";
import { 
  db, 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  handleFirestoreError, 
  OperationType 
} from "./services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc 
} from "firebase/firestore";

const DEFAULT_WORKSPACE: Workspace = generateSeedWorkspace();


export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeTab, setActiveTab ] = useState<
    "dashboard" | "keywords" | "clusters" | "serp-analysis" | "page-mapping" | "action-plan" | "content-inventory" | "export" | "clients"
  >("dashboard");
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Bulk keyword and save statuses states
  const [bulkImportedText, setBulkImportedText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Subscribe to Authentication state changes on startup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      await loadWorkspaces(user);
    });
    return () => unsubscribe();
  }, []);

  const loadWorkspaces = async (activeUser: User | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedId = params.get("workspaceId");

      let listData: Workspace[] = [];

      if (activeUser) {
        // Active User: Fetch cloud work records owned by Google UID from Firestore
        try {
          const q = query(
            collection(db, "workspaces"), 
            where("createdBy", "==", activeUser.uid)
          );
          const snap = await getDocs(q);
          listData = snap.docs.map(docSnap => docSnap.data() as Workspace);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, "workspaces");
        }
      } else {
        // Guest/Offline Mode: Query baseline workspace records from the node file system
        const response = await fetch("/api/workspaces");
        if (response.ok) {
          listData = await response.json();
        }
      }

      // Sort by recent update timestamp
      listData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setWorkspaces(listData);

      // Workspace Target resolution
      if (sharedId) {
        await loadSpecificWorkspace(sharedId, activeUser);
      } else if (listData.length > 0) {
        await loadSpecificWorkspace(listData[0].id, activeUser);
      } else {
        // Create an initial starter workspace in their workspace bucket
        const wsId = activeUser ? `cloud-${Math.random().toString(36).substring(2, 11)}` : DEFAULT_WORKSPACE.id;
        const seedWorkspace: Workspace = {
          ...DEFAULT_WORKSPACE,
          id: wsId,
          ...(activeUser ? {
            createdBy: activeUser.uid,
            creatorEmail: activeUser.email || "",
            isPublic: false
          } : {})
        };
        await handleSaveWorkspace(seedWorkspace, activeUser);
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert("error", "Error synchronizing workspaces dataset: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificWorkspace = async (id: string, activeUser: User | null = currentUser) => {
    try {
      // 1. Load from Cloud Firestore
      try {
        const docRef = doc(db, "workspaces", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const ws = docSnap.data() as Workspace;
          // Apply privacy permissions checks
          if (ws.isPublic || (activeUser && ws.createdBy === activeUser.uid)) {
            setActiveWorkspace(ws);
            return;
          } else {
            throw new Error("This workspace is configured as Private by its creator.");
          }
        }
      } catch (fbErr: any) {
        if (fbErr.message && fbErr.message.includes("configured as Private")) {
          throw fbErr;
        }
      }

      // 2. Fallback to Local Storage endpoint
      const res = await fetch(`/api/workspaces/${id}`);
      if (!res.ok) {
        throw new Error("Workspace not found inside database storage registry.");
      }
      const fullWorkspace = await res.json();
      setActiveWorkspace(fullWorkspace);
    } catch (e: any) {
      triggerAlert("error", `Could not load SEO workspace: ${e.message}`);
      // Return safe backup workspace
      if (id !== "global-default-seo") {
        await loadSpecificWorkspace("global-default-seo", activeUser);
      }
    }
  };

  const handleSaveWorkspace = async (ws: Workspace, activeUser: User | null = currentUser) => {
    try {
      const now = new Date().toISOString();
      const updatedWs: Workspace = {
        ...ws,
        updatedAt: now,
        keywords: ws.keywords || [],
        keywordClusters: ws.keywordClusters || [],
        contentClusters: ws.contentClusters || [],
        templates: ws.templates || [],
      };

      if (activeUser) {
        // Apply owner attributes if not set
        if (!updatedWs.createdBy) {
          updatedWs.createdBy = activeUser.uid;
          updatedWs.creatorEmail = activeUser.email || "";
          updatedWs.isPublic = updatedWs.isPublic || false;
        }

        try {
          const docRef = doc(db, "workspaces", updatedWs.id);
          await setDoc(docRef, updatedWs);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `workspaces/${updatedWs.id}`);
        }
      } else {
        // Fallback local express file system storage
        const response = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedWs),
        });
        if (!response.ok) throw new Error("Local fallback write operation returned error.");
      }

      setActiveWorkspace(updatedWs);

      // Refresh listings inventory
      setWorkspaces(prev => {
        const idx = prev.findIndex(item => item.id === updatedWs.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = updatedWs;
          return updated.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          return [updatedWs, ...prev];
        }
      });
    } catch (err: any) {
      triggerAlert("error", err.message || "Failed to persist workspace parameters.");
    }
  };

  const triggerAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const newId = (currentUser ? "cloud-" : "") + Math.random().toString(36).substring(2, 11);
    const newWs: Workspace = {
      id: newId,
      name: newWorkspaceName.trim(),
      description: newWorkspaceDesc.trim() || "SEO mapping workspace",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      keywords: [],
      keywordClusters: [],
      contentClusters: [],
      templates: []
    };

    if (currentUser) {
      newWs.createdBy = currentUser.uid;
      newWs.creatorEmail = currentUser.email || "";
      newWs.isPublic = false;
    }

    await handleSaveWorkspace(newWs);
    setShowNewWorkspaceModal(false);
    setNewWorkspaceName("");
    setNewWorkspaceDesc("");
    triggerAlert("success", `Created new workspace "${newWs.name}"!`);
  };

  const handleDeleteWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this workspace and all associated cluster maps?")) {
      try {
        if (currentUser) {
          // Ownership boundary checking
          if (activeWorkspace?.id === id && activeWorkspace.createdBy !== currentUser.uid) {
            triggerAlert("error", "Only the owner is authorized to delete this workspace.");
            return;
          }
          try {
            await deleteDoc(doc(db, "workspaces", id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `workspaces/${id}`);
          }
        } else {
          const response = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
          if (!response.ok) throw new Error("Clean action failed on server storage registry.");
        }

        triggerAlert("success", "Workspace removed.");

        // Remove from list
        setWorkspaces(prev => prev.filter(w => w.id !== id));

        const remaining = workspaces.filter(w => w.id !== id);
        if (activeWorkspace?.id === id) {
          if (remaining.length > 0) {
            await loadSpecificWorkspace(remaining[0].id);
          } else {
            const seedWorkspace: Workspace = {
              ...DEFAULT_WORKSPACE,
              id: currentUser ? `cloud-${Math.random().toString(36).substring(2, 11)}` : DEFAULT_WORKSPACE.id,
              ...(currentUser ? {
                createdBy: currentUser.uid,
                creatorEmail: currentUser.email || "",
                isPublic: false
              } : {})
            };
            await handleSaveWorkspace(seedWorkspace);
          }
        }
      } catch (err: any) {
        triggerAlert("error", err.message || "Error clearing workspace.");
      }
    }
  };

  const handleUpdateActiveWorkspace = async (updatedFields: Partial<Workspace>) => {
    if (!activeWorkspace) return;
    if (isReadOnly) {
      triggerAlert("error", "This shared workspace is in Read-Only mode. Sign in to design your own maps!");
      return;
    }
    const merged = {
      ...activeWorkspace,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };
    await handleSaveWorkspace(merged);
    triggerAlert("success", "Workspace adjustments persisted.");
  };

  const handleForceSave = async () => {
    if (!activeWorkspace) return;
    if (isReadOnly) {
      triggerAlert("error", "This shared workspace is in Read-Only mode. Sign in to design your own maps!");
      return;
    }
    setSaveStatus("saving");
    try {
      await handleSaveWorkspace(activeWorkspace);
      setSaveStatus("success");
      triggerAlert("success", "All workspace modifications have been successfully saved!");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (e: any) {
      setSaveStatus("error");
      triggerAlert("error", "Failed to compile manual save: " + e.message);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleShareWorkspace = () => {
    if (!activeWorkspace) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?workspaceId=${activeWorkspace.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    triggerAlert("success", "Share linkage copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 3000);
  }  // Helper states for sidebar workspace actions
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [aiEngineLoading, setAiEngineLoading] = useState(false);

  // Triggering visual auto-clustering when users click the AI Strategy Engine
  const handleTriggerAiEngine = async () => {
    if (!activeWorkspace) return;
    setAiEngineLoading(true);
    triggerAlert("success", "Initiating KeywordIQ Senior SEO Strategy Engine...");
    
    try {
      let keywordsToCluster = activeWorkspace.keywords || [];
      let rawText = "";

      // Seed preset keywords if empty
      if (keywordsToCluster.length === 0) {
        rawText = `best real estate CRM software
crm software for realtors
top property brokerage system
how to pick a crm for real estate
free broker CRM templates
best commercial real estate software alternative
real estate agent technology solutions
crm tools property listings tracker nyc
realtor transaction management application
residential property listing automation
real estate sales pipeline pipeline tracking
broker lead generation pricing packages`;
        triggerAlert("success", "Workspace empty. Seeding prime real estate CRM queries for page-level clustering blueprint...");
      }

      const response = await fetch("/api/gemini/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: rawText, 
          keywordsList: rawText ? undefined : keywordsToCluster,
          existingPages: activeWorkspace.contentInventoryPages || []
        }),
      });

      if (!response.ok) {
        throw new Error("SEO strategy compilation query returned an invalid system status.");
      }

      const result = await response.json();
      if (result && result.clusters) {
        // Collect all processed keywords with their intent parameters
        const allKeywords = result.clusters.flatMap((c: any) => 
          c.keywords.map((kw: any) => ({
            keyword: kw.keyword,
            intent: kw.intent || c.intent,
            volume: kw.volume || Math.floor(Math.random() * 800) + 50,
            difficulty: kw.difficulty || Math.floor(Math.random() * 60) + 10,
            cpc: kw.cpc || Number((Math.random() * 4).toFixed(2)),
            clusterName: c.clusterName
          }))
        );

        // Map clusters into PagePlanning/Mapping items for integrated workflow
        const generatedMappings: any[] = result.clusters.map((c: any, index: number) => {
          const avgDifficulty = c.keywords?.length
            ? Math.round(c.keywords.reduce((sum: number, k: any) => sum + (k.difficulty || 10), 0) / c.keywords.length)
            : 20;

          const action = c.decision === "Update Existing Page" ? "Optimise" : c.decision === "Needs Review" ? "Review" : "Create";
          const pageTypeMap: Record<string, string> = {
            "Service Pages": "Service Page",
            "Blog & Guides": "Blog Post",
            "Comparison Pages": "Comparison Page",
            "Location Pages": "Location Page"
          };
          const pageType = pageTypeMap[c.type || "Blog & Guides"] || "Blog Post";

          return {
            id: `page-map-${index}-${Math.random().toString(36).substring(2, 7)}`,
            title: c.clusterName,
            clusterName: c.clusterName,
            action: action,
            pageType: pageType,
            difficulty: avgDifficulty,
            priority: c.opportunityPriority || "Medium",
            status: "Planned",
            reason: `${c.explanationRecommendedAction || "Write targeting content."} (${c.priorityReason || "Primary strategic focus."})`
          };
        });

        // Retain existing mappings unless we overwrite
        const currentMappings = activeWorkspace.pageMappings || [];
        const combinedMappings = [...generatedMappings, ...currentMappings].filter((v, i, a) => a.findIndex(t => t.clusterName === v.clusterName) === i);

        await handleUpdateActiveWorkspace({
          keywords: allKeywords,
          keywordClusters: result.clusters,
          pageMappings: combinedMappings,
        });

        triggerAlert("success", `Strategic mapping finalized! ${result.clusters.length} page plans successfully mapped and synchronized.`);
      } else {
        throw new Error("Response body is missing standard cluster list indices.");
      }
    } catch (e: any) {
      console.error(e);
      triggerAlert("error", "AI Strategy compilation paused: " + e.message);
    } finally {
      setAiEngineLoading(false);
    }
  };

  // Check read-only state for active workspace
  const isReadOnly = activeWorkspace ? (activeWorkspace.createdBy != null && activeWorkspace.createdBy !== currentUser?.uid) : false;

  // Derive counts dynamically
  const kwsCount = activeWorkspace?.keywords?.length || 0;
  const clustersCount = activeWorkspace?.keywordClusters?.length || 0;
  // Calculate planned pages based on silo content hubs
  const plannedPagesCount = activeWorkspace?.contentClusters?.reduce((acc, hub) => acc + 1 + (hub.supportingArticles?.length || 0), 0) || 0;
  const templatesCount = activeWorkspace?.templates?.length || 0;

  return (
    <div className="min-h-screen bg-[#f4f6fc] flex text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white" id="seo-workspace-studio-root">
      
      {/* Alert Banner */}
      {alert && (
        <div 
          id="app-alert-banner"
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-3 transition-all transform animate-in fade-in slide-in-from-top ${
            alert.type === "success" 
              ? "bg-white border-emerald-200 text-emerald-600 shadow-emerald-100/30"
              : "bg-white border-rose-200 text-rose-600 shadow-rose-100/30"
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${alert.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* 1. LEFT PERSISTENT SIDEBAR - Dark Brand Style from screenshot */}
      <aside className="w-72 bg-[#090e1a] text-slate-300 flex flex-col justify-between shrink-0 border-r border-[#151c2d] select-none z-40" id="keywordiq-left-sidebar">
        <div>
          {/* Brand header / logo */}
          <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="w-9 h-9 bg-[#2563eb] rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-900/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none font-sans">
                KeywordIQ
              </h1>
            </div>
          </div>

          {/* Active Workspace Switcher layout */}
          {activeWorkspace && (
            <div className="px-4 mb-5 relative">
              <div 
                onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                className="w-full bg-[#11192a] border border-[#1d293d] hover:border-blue-500/40 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all"
                id="active-workspace-card-btn"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-xs shrink-0 uppercase">
                    {activeWorkspace.name.trim().charAt(0) || "W"}
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-white text-xs font-bold block truncate leading-tight">
                      {activeWorkspace.name}
                    </span>
                    <span className="text-slate-450 text-[10px] block truncate mt-0.5 font-mono">
                      {activeWorkspace.description && activeWorkspace.description.includes(".") && !activeWorkspace.description.includes(" ") ? activeWorkspace.description : "yourseogirl.com"}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showWorkspaceDropdown ? "rotate-180" : ""}`} />
              </div>

              {/* Dynamic Workspace Switcher overlay menu */}
              {showWorkspaceDropdown && (
                <div className="absolute top-full left-4 right-4 mt-2 bg-[#101726] border border-[#1d2a42] rounded-1.5xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] uppercase font-mono font-bold text-slate-500 px-2.5 py-1.5 border-b border-[#1d2a42]/60 flex items-center justify-between">
                    <span>Select Client Scope</span>
                    <span>{workspaces.length} spaces</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1 space-y-0.5">
                    {workspaces.map((ws) => (
                      <div
                        key={ws.id}
                        onClick={() => {
                          loadSpecificWorkspace(ws.id);
                          setShowWorkspaceDropdown(false);
                        }}
                        className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          activeWorkspace.id === ws.id
                            ? "bg-blue-600/25 text-white font-bold"
                            : "hover:bg-[#161f33] text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">📁 {ws.name}</span>
                        {activeWorkspace.id === ws.id && <span className="text-[9px] bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded uppercase">active</span>}
                      </div>
                    ))}
                  </div>
                  <div className="pt-1.5 border-t border-[#1d2a42]/60">
                    <button
                      onClick={() => {
                        setShowWorkspaceDropdown(false);
                        setShowNewWorkspaceModal(true);
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Client Studio</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Menu Links */}
          <nav className="px-3.5 space-y-6" id="sidebar-vertical-menu">
            
            {/* Main view category */}
            <div>
              <button
                onClick={() => { setActiveTab("dashboard"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
                  activeTab === "dashboard"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md shadow-blue-900/10"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </button>
            </div>

            {/* Workflow Category */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono px-3.5 block mb-2">
                Workflow
              </span>

              <button
                onClick={() => { setActiveTab("keywords"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  activeTab === "keywords"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md shadow-blue-950/10"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4 shrink-0" />
                  <span>Keywords</span>
                </div>
                {kwsCount > 0 && (
                  <span className="bg-[#11192a] text-blue-450 text-[10px] px-2 py-0.5 rounded-lg border border-[#1b263a] font-bold">
                    {kwsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("clusters"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  activeTab === "clusters"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md shadow-blue-950/10"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Clusters</span>
                </div>
                {clustersCount > 0 && (
                  <span className="bg-[#11192a] text-blue-450 text-[10px] px-2 py-0.5 rounded-lg border border-[#1b263a] font-bold">
                    {clustersCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("serp-analysis"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  activeTab === "serp-analysis"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>SERP Analysis</span>
                </div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-950/40 px-1.5 py-0.5 border border-blue-900/30 rounded">overlaps</span>
              </button>

              <button
                onClick={() => { setActiveTab("page-mapping"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  activeTab === "page-mapping"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GitMerge className="w-4 h-4 shrink-0" />
                  <span>Page Mapping</span>
                </div>
                {plannedPagesCount > 0 && (
                  <span className="bg-[#11192a] text-blue-450 text-[10px] px-2 py-0.5 rounded-lg border border-[#1b263a] font-bold">
                    {plannedPagesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("action-plan"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  activeTab === "action-plan"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 shrink-0" />
                  <span>Action Plan</span>
                </div>
              </button>
            </div>

            {/* Content Category */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono px-3.5 block mb-2">
                Content
              </span>

              <button
                onClick={() => { setActiveTab("content-inventory"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  activeTab === "content-inventory"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Content Inventory</span>
                </div>
                {templatesCount > 0 && (
                  <span className="bg-[#11192a] text-blue-450 text-[10px] px-2 py-0.5 rounded-lg border border-[#1b263a] font-bold">
                    {templatesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("export"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  activeTab === "export"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Export</span>
                </div>
              </button>
            </div>

            {/* Manage Category */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono px-3.5 block mb-2">
                Manage
              </span>

              <button
                onClick={() => { setActiveTab("clients"); setShowWorkspaceDropdown(false); }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  activeTab === "clients"
                    ? "bg-[#2563eb] border-[#2563eb] text-white font-extrabold shadow-md"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#111625]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Clients</span>
                </div>
                <span className="bg-[#11192a] text-blue-400 text-[10px] px-2 py-0.5 rounded-lg border border-[#1b263a] font-bold">
                  {workspaces.length}
                </span>
              </button>
            </div>

          </nav>
        </div>

        {/* BOTTOM USER PROFILE CARD - Dark exact representation from mockup */}
        <div className="p-4 border-t border-[#131b2c] bg-[#070b14]" id="sidebar-bottom-user-card">
          {authLoading ? (
            <div className="flex justify-center py-2.5">
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
          ) : currentUser ? (
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="" 
                    referrerPolicy="no-referrer" 
                    className="w-8.5 h-8.5 rounded-full border border-slate-750 shrink-0" 
                  />
                ) : (
                  <div className="w-8.5 h-8.5 uppercase font-bold text-xs bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 border border-blue-500">
                    {currentUser.email?.charAt(0) || "U"}
                  </div>
                )}
                <div className="text-left overflow-hidden min-w-0">
                  <span className="text-white text-xs font-bold block truncate leading-tight">
                    {currentUser.displayName || "SEO Strategist"}
                  </span>
                  <span className="text-slate-500 text-[10px] block truncate font-mono mt-0.5">
                    {currentUser.email}
                  </span>
                </div>
              </div>
              <button 
                id="sign-out-btn-sidebar"
                onClick={signOutUser}
                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-955/10 transition-colors"
                title="Sign out from cloud workspace"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans px-1">
                Save your SEO clusters automatically by backing up to cloud Google Auth.
              </p>
              <button
                id="google-sign-in-btn-sidebar"
                onClick={signInWithGoogle}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-blue-550/20 active:scale-98"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In via Google</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN DATA CANVAS - Fluid Crisp Light Layout matching the screenshot */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto" id="keywordiq-main-canvas">
        
        {/* Dynamic header path */}
        <header className="bg-white border-b border-slate-200/60 sticky top-0 z-10 px-8 py-4.5 flex items-center justify-between" id="canvas-header">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              <span>{activeTab === "dashboard" ? "Dashboard" : "Studio"}</span>
              <span>/</span>
              <span className="text-slate-600 lowercase">{activeWorkspace?.description && activeWorkspace.description.includes(".") && !activeWorkspace.description.includes(" ") ? activeWorkspace.description : "yourseogirl.com"}</span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-850 tracking-tight leading-none mt-1">
              {activeTab === "dashboard" && "Dashboard"}
              {activeTab === "keywords" && "Ingest & Target Keywords"}
              {activeTab === "clusters" && "Mapped Keyword Clusters"}
              {activeTab === "serp-analysis" && "SERP Content Cannibalization & Overlaps"}
              {activeTab === "page-mapping" && "Website Pillar & Silo Mapping"}
              {activeTab === "action-plan" && "SEO Campaign Action Plan"}
              {activeTab === "content-inventory" && "Content Inventory Briefs"}
              {activeTab === "export" && "Export SEO Campaign Specifications"}
              {activeTab === "clients" && "Client Campaign Workspaces"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync status button */}
            {activeWorkspace && (
              <button
                onClick={handleForceSave}
                disabled={saveStatus === "saving" || isReadOnly}
                className="p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Force sync workspace map"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${saveStatus === "saving" ? "animate-spin" : ""}`} />
                <span className="hidden md:inline">{saveStatus === "saving" ? "Saving..." : "Save State"}</span>
              </button>
            )}

            {/* Public Link Share button */}
            {activeWorkspace && (
              <button
                onClick={handleShareWorkspace}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? "Link Copied!" : "Share Map"}</span>
              </button>
            )}
          </div>
        </header>

        {/* Central scrollable container body */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in" id="canvas-scroll-container">
          
          {loading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 mt-3 font-mono">Synchronizing workspaces and SEO clustering datasets...</p>
            </div>
          ) : activeWorkspace ? (
            <div className="space-y-8">
              
              {/* -------------------- 2A. TAB VIEW: DASHBOARD (Mockup Layout) -------------------- */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  
                  {/* Hero card from picture */}
                  <div className="bg-[#0b101d] rounded-2xl p-7 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6" id="dashboard-welcome-hero">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Welcome to Workspace</span>
                      <h3 className="font-display text-2xl font-black text-white leading-tight">
                        {activeWorkspace.name}
                      </h3>
                      <p className="text-xs text-blue-400 font-medium font-mono">
                        {activeWorkspace.description && activeWorkspace.description.includes(".") && !activeWorkspace.description.includes(" ") ? activeWorkspace.description : "yourseogirl.com"}
                      </p>
                    </div>

                    <button
                      onClick={handleTriggerAiEngine}
                      disabled={aiEngineLoading}
                      className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-blue-500/20 shadow-lg shadow-blue-500/10 self-start md:self-center transition-transform hover:scale-102"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{aiEngineLoading ? "Analyzing Domain..." : "AI Strategy Engine"}</span>
                    </button>
                  </div>

                  {/* 4 Stats Cards from picture */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="dashboard-metric-deck">
                    
                    {/* Stat Item 1: Total Keywords */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex items-center justify-between hover:border-blue-200 transition-colors cursor-pointer" onClick={() => setActiveTab("keywords")}>
                      <div className="space-y-1">
                        <span className="text-3xl font-extrabold text-slate-900 block leading-none">
                          {kwsCount}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold block">Total Keywords</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Tag className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Stat Item 2: Clusters */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex items-center justify-between hover:border-cyan-200 transition-colors cursor-pointer" onClick={() => setActiveTab("clusters")}>
                      <div className="space-y-1">
                        <span className="text-3xl font-extrabold text-slate-900 block leading-none">
                          {clustersCount}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold block">Clusters</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                        <Layers className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Stat Item 3: Planned Pages */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex items-center justify-between hover:border-amber-200 transition-colors cursor-pointer" onClick={() => setActiveTab("page-mapping")}>
                      <div className="space-y-1">
                        <span className="text-3xl font-extrabold text-slate-900 block leading-none">
                          {plannedPagesCount === 0 && clustersCount > 0 ? clustersCount : plannedPagesCount}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold block">Planned Pages</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Target className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Stat Item 4: Pages Done */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex items-center justify-between hover:border-emerald-200 transition-colors cursor-pointer" onClick={() => setActiveTab("content-inventory")}>
                      <div className="space-y-1">
                        <span className="text-3xl font-extrabold text-slate-900 block leading-none">
                          {templatesCount}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold block">Pages Done</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>

                  </div>

                  {/* Deep Columns (Workflow Progress & Action Plan) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Checklist - Workflow Progress */}
                    <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6.5 shadow-xs space-y-5" id="workflow-progress-panel">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4.5 h-4.5 text-blue-600" />
                          Workflow Progress
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">Step tracker</span>
                      </div>

                      <div className="space-y-3.5">
                        {/* Step 1: Ingest Keywords */}
                        <div 
                          onClick={() => setActiveTab("keywords")}
                          className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-[#fafbfc]/40 hover:bg-[#fafbfc]/80 flex items-center justify-between gap-4 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold leading-none ${
                              kwsCount > 0 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                                : "bg-slate-50 text-slate-500 border border-slate-100"
                            }`}>
                              {kwsCount > 0 ? "✓" : "1"}
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-bold text-slate-800 block">Import Keywords</span>
                              <span className="text-[11px] text-slate-500 block.mt-0.5">Upload CSV or add manually</span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                        {/* Step 2: Analyze SERPs */}
                        <div 
                          onClick={() => setActiveTab("serp-analysis")}
                          className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-[#fafbfc]/40 hover:bg-[#fafbfc]/80 flex items-center justify-between gap-4 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold leading-none ${
                              clustersCount > 0 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                                : "bg-slate-50 text-slate-500 border border-slate-100"
                            }`}>
                              {clustersCount > 0 ? "✓" : "2"}
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-bold text-slate-800 block">Analyze SERPs</span>
                              <span className="text-[11px] text-slate-500 block.mt-0.5">Detect cannibalization & overlaps</span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                        {/* Step 3: Build Clusters */}
                        <div 
                          onClick={() => setActiveTab("clusters")}
                          className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-[#fafbfc]/40 hover:bg-[#fafbfc]/80 flex items-center justify-between gap-4 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold leading-none ${
                              clustersCount > 0 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                                : "bg-slate-50 text-slate-500 border border-slate-100"
                            }`}>
                              {clustersCount > 0 ? "✓" : "3"}
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-bold text-slate-800 block">Build Clusters</span>
                              <span className="text-[11px] text-slate-500 block.mt-0.5">Group keywords by intent & SERP</span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                      </div>
                    </div>

                    {/* Right Column - Dynamic Actions Plan / Suggestions */}
                    <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6.5 shadow-xs space-y-4" id="priority-actions-panel">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                          <Target className="w-4.5 h-4.5 text-blue-600" />
                          High Priority Actions
                        </h4>
                        <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Real-time AI</span>
                      </div>

                      <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                        {kwsCount === 0 ? (
                          <div className="text-center py-10 space-y-2.5">
                            <p className="text-xs text-slate-500 leading-normal">
                              No high-priority actions yet. Complete the workflow to generate your plan.
                            </p>
                            <button 
                              onClick={() => setActiveTab("keywords")} 
                              className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-105 hover:text-blue-700 transition-colors text-xs font-bold rounded-lg"
                            >
                              Add Raw Keywords Now
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            <div className="p-3.5 rounded-xl bg-orange-50/40 border border-orange-100 flex items-start gap-3">
                              <span className="text-orange-600 text-sm font-mono mt-0.5">⚠️</span>
                              <div className="text-left">
                                <span className="text-xs font-bold text-slate-850 block">Resolve duplication threats</span>
                                <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                                  Our checks detected overlapping search intent configurations in your campaign list. Run a SERP analysis.
                                </p>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 flex items-start gap-3">
                              <span className="text-blue-600 text-sm font-mono mt-0.5">💡</span>
                              <div className="text-left">
                                <span className="text-xs font-bold text-slate-850 block">Form transactional topical silos</span>
                                <p className="text-[11px] text-[#4b5563] leading-normal mt-0.5">
                                  You have {clustersCount} clusters mapped. Convert them into a structured interlinked Content Hub.
                                </p>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#fafbfc] border border-slate-100 flex items-start gap-3">
                              <span className="text-slate-600 text-sm font-mono mt-0.5">🎯</span>
                              <div className="text-left">
                                <span className="text-xs font-bold text-slate-850 block">Prepare high-difficulty outlines</span>
                                <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                                  Target keywords with difficulties above 40 with detailed copywriting header structures and rich-snipped FAQs.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* -------------------- 2b. TAB VIEW: KEYWORDS -------------------- */}
              {activeTab === "keywords" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <SmartUploadHub
                    activeWorkspaceName={activeWorkspace?.name || "Untitled"}
                    onKeywordsExtracted={(extractedTerms) => {
                      const combinedText = extractedTerms.join("\n");
                      setBulkImportedText(combinedText);
                      setActiveTab("keywords");
                      triggerAlert("success", `Injected ${extractedTerms.length} keywords from uploaded file! Run the Cluster tool below to categorize them.`);
                    }}
                  />
                  <KeywordsTab
                    workspace={activeWorkspace}
                    onUpdateWorkspace={handleUpdateActiveWorkspace}
                    triggerAlert={triggerAlert}
                  />
                </div>
              )}

              {/* -------------------- 2c. TAB VIEW: CLUSTERS -------------------- */}
              {activeTab === "clusters" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <ClustersTab
                    workspace={activeWorkspace}
                    onUpdateWorkspace={handleUpdateActiveWorkspace}
                    triggerAlert={triggerAlert}
                    onTriggerAiEngine={handleTriggerAiEngine}
                    aiEngineLoading={aiEngineLoading}
                  />
                </div>
              )}

              {/* -------------------- 2d. TAB VIEW: SERP ANALYSIS -------------------- */}
              {activeTab === "serp-analysis" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <SerpAnalysisTab
                    workspace={activeWorkspace}
                    onUpdateWorkspace={handleUpdateActiveWorkspace}
                    triggerAlert={triggerAlert}
                  />
                </div>
              )}

              {/* -------------------- 2e. TAB VIEW: PAGE MAPPING -------------------- */}
              {activeTab === "page-mapping" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <PageMappingTab
                    workspace={activeWorkspace}
                    onUpdateWorkspace={handleUpdateActiveWorkspace}
                    triggerAlert={triggerAlert}
                  />
                </div>
              )}

              {/* -------------------- 2f. TAB VIEW: ACTION PLAN -------------------- */}
              {activeTab === "action-plan" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <ActionPlanTab
                    workspace={activeWorkspace}
                    onUpdateWorkspace={handleUpdateActiveWorkspace}
                    triggerAlert={triggerAlert}
                  />
                </div>
              )}

              {/* -------------------- 2g. TAB VIEW: CONTENT INVENTORY -------------------- */}
              {activeTab === "content-inventory" && (
                <div className="space-y-6 animate-in fade-in duration-200">-
                  <ContentInventoryTab
                    workspace={activeWorkspace}
                    onUpdateWorkspace={handleUpdateActiveWorkspace}
                    triggerAlert={triggerAlert}
                  />
                  
                  {/* Copywriting briefs generator accordion block below listing */}
                  <div className="bg-white border border-slate-200/80 p-6.5 rounded-2xl shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="font-display font-black text-slate-800 text-sm">Design Brief, Outlines or Meta Tags for Inventory</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Generate SEO-optimized headlines, questions answered, suggested word count, or JSON FAQ schema markup.</p>
                    </div>
                    <SEOTemplateGenerator
                      workspace={activeWorkspace}
                      onUpdateWorkspace={handleUpdateActiveWorkspace}
                    />
                  </div>
                </div>
              )}

              {/* -------------------- 2h. TAB VIEW: EXPORT -------------------- */}
              {activeTab === "export" && (
                <div className="bg-white border border-slate-100 rounded-2xl p-7 shadow-xs space-y-6 max-w-2xl mx-auto text-center">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">📥</div>
                  <div className="space-y-1.5">
                    <h3 className="font-display font-bold text-slate-850 text-base">Download Campaign SEO Assets</h3>
                    <p className="text-xs text-slate-500 leading-normal max-w-sm mx-auto">Export all keyword clusters, interlinked topical silos, and template outlines in convenient files.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-left">
                    
                    <button 
                      onClick={() => {
                        if (clustersCount === 0) {
                          triggerAlert("error", "No mapped clusters to download yet.");
                          return;
                        }
                        // Simple CSV builder matching existing system
                        let csv = "Cluster,Core Topic,Target Intent,Recommended Slug,Keyword,Volume,Difficulty,CPC\n";
                        activeWorkspace.keywordClusters.forEach(c => {
                          c.keywords.forEach(kw => {
                            csv += `"${c.clusterName}","${c.coreTopic}","${c.intent}","${c.recommendedPagePath}","${kw.keyword}",${kw.volume || 100},${kw.difficulty || 10},${kw.cpc || 0}\n`;
                          });
                        });
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${activeWorkspace.name.trim().toLowerCase().replace(/\s+/g, "_")}_keywords.csv`;
                        a.click();
                        triggerAlert("success", "Exported CSV cluster mapping!");
                      }}
                      className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-slate-50 hover:shadow-2xs transition-all flex items-center gap-3.5 cursor-pointer text-left"
                    >
                      <span className="text-xl">📊</span>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Download CSV Clusters</span>
                        <span className="text-[10px] text-slate-450 block mt-0.5">Import directly inside Excel/Sheets</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        if (templatesCount === 0) {
                          triggerAlert("error", "No generated outlines to download yet.");
                          return;
                        }
                        // Markdown content compilation
                        let md = `# SEO Technical Outline & Briefs: ${activeWorkspace.name}\n\n`;
                        activeWorkspace.templates.forEach(t => {
                          md += `## ${t.title}\n\n`;
                          if (t.outputResult?.data?.summary) {
                            md += `> ${t.outputResult.data.summary}\n\n`;
                          }
                          t.outputResult?.data?.sections?.forEach(s => {
                            md += `### ${s.title}\n`;
                            s.contentPoints.forEach(pt => {
                              md += `- ${pt}\n`;
                            });
                            if (s.details) md += `\n*Recommendation:* ${s.details}\n`;
                            md += `\n`;
                          });
                          md += `\n---\n\n`;
                        });
                        const blob = new Blob([md], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${activeWorkspace.name.trim().toLowerCase().replace(/\s+/g, "_")}_seo_briefs.md`;
                        a.click();
                        triggerAlert("success", "Exported Markdown content outline documents!");
                      }}
                      className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-slate-50 hover:shadow-2xs transition-all flex items-center gap-3.5 cursor-pointer text-left"
                    >
                      <span className="text-xl">📄</span>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Download Markdown Outlines</span>
                        <span className="text-[10px] text-slate-450 block mt-0.5">Perfect for Notion or Google Docs</span>
                      </div>
                    </button>

                  </div>
                </div>
              )}

              {/* -------------------- 2I. TAB VIEW: CLIENTS -------------------- */}
              {activeTab === "clients" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="font-display font-bold text-slate-850 text-base">Client Campaign Manager</h3>
                      <p className="text-xs text-slate-500 mt-1">Centralized lists of active workspaces tracking separate keyword mapping profiles.</p>
                    </div>
                    <button
                      onClick={() => setShowNewWorkspaceModal(true)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Client Campaign</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {workspaces.map((ws) => (
                      <div 
                        key={ws.id}
                        onClick={() => loadSpecificWorkspace(ws.id)}
                        className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                          activeWorkspace.id === ws.id ? "border-blue-500 ring-2 ring-blue-500/5" : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-650 font-bold flex items-center justify-center text-xs uppercase border border-blue-100">
                              {ws.name.trim().charAt(0)}
                            </span>
                            {activeWorkspace.id === ws.id && (
                              <span className="text-[9px] uppercase font-mono tracking-wider bg-blue-500 text-white font-bold px-2 py-0.5 rounded">Active</span>
                            )}
                          </div>

                          <div className="text-left">
                            <h4 className="font-display font-bold text-slate-850 text-sm truncate">{ws.name}</h4>
                            <p className="text-[11px] text-slate-450 truncate block mt-0.5 font-mono">{ws.description}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400">Modified: {new Date(ws.updatedAt).toLocaleDateString()}</span>
                          <button
                            onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                            className="p-1 px-1.5 text-slate-450 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Delete this client space"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="py-24 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
              <Layers className="w-12 h-12 text-slate-300 animate-pulse" />
              <h4 className="font-display font-semibold text-slate-800 text-sm">Workspace Selection Issue</h4>
              <p className="text-xs text-slate-500 leading-normal">Please configure or choose an active SEO campaign workspace from our side-bar profile launcher.</p>
              <button 
                onClick={() => setShowNewWorkspaceModal(true)} 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-550/10"
              >
                Create Starter Studio
              </button>
            </div>
          )}

        </div>

        {/* Crisp Humble Footer */}
        <footer className="bg-white border-t border-slate-200/60 px-8 py-4.5 text-center mt-auto text-[10px] text-slate-400 font-mono tracking-wide">
          KeywordIQ Studio System • Powered by Google Gemini • Platform Port Ingress Secure
        </footer>
      </main>

      {/* 3. NEW WORKSPACE CREATION FORM MODAL */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="new-workspace-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-slate-850 text-base">New Campaign Workspace</h3>
              <button
                onClick={() => setShowNewWorkspaceModal(false)}
                className="text-slate-450 hover:text-slate-805 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-700 block mb-1">Workspace Theme Name</label>
                <input
                  type="text"
                  required
                  id="new-ws-name-input"
                  placeholder="e.g., E-commerce Footwear Launch"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full text-xs p-3.5 bg-slate-50/50 border border-slate-205 text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-550/10 focus:border-blue-500 placeholder:text-slate-400"
                  maxLength={50}
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Description / Domain name</label>
                <input
                  type="text"
                  id="new-ws-desc-input"
                  placeholder="e.g., yourseogirl.com"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  className="w-full text-xs p-3.5 bg-slate-50/50 border border-slate-205 text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-555/10 focus:border-blue-500 placeholder:text-slate-400 font-mono"
                  maxLength={200}
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="px-4.5 py-2.5 font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-new-ws-btn"
                  className="px-5 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                >
                  Create Studio Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
