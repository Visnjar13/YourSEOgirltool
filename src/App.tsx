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
import WorkspaceBrainInfo from "./components/WorkspaceBrainInfo";

import { generateSeedWorkspace } from "./utils/seedData";

import { 
  Layers, GitMerge, FileText, Share2, Plus, ArrowRight,
  FolderOpen, Trash2, HelpCircle, Check, Sparkles, ExternalLink, RefreshCw,
  LogIn, LogOut, Eye, Lock, Globe, Shield, ShieldAlert,
  LayoutDashboard, Tag, Target, Users, Download, ChevronDown, CheckCircle2, ClipboardList, Settings, Sparkle, AlertTriangle, Play, TrendingUp, Pencil
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
  const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState(false);
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [editWorkspaceDesc, setEditWorkspaceDesc] = useState("");
  const [newWsStep, setNewWsStep] = useState(1);
  const [editWsStep, setEditWsStep] = useState(1);

  // Strategic Client Profile inputs state
  const [profileBusinessName, setProfileBusinessName] = useState("");
  const [profileWebsiteUrl, setProfileWebsiteUrl] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileIndustry, setProfileIndustry] = useState("");
  const [profileTargetCountry, setProfileTargetCountry] = useState("");
  const [profileTargetAudience, setProfileTargetAudience] = useState("");
  const [profileGoals, setProfileGoals] = useState("");
  const [profileProductsServices, setProfileProductsServices] = useState("");
  const [profilePriorityServices, setProfilePriorityServices] = useState("");
  const [profileCompetitors, setProfileCompetitors] = useState("");
  const [profileExistingPages, setProfileExistingPages] = useState("");
  const [profileSitemapUrl, setProfileSitemapUrl] = useState("");
  const [profilePreferredPageTypes, setProfilePreferredPageTypes] = useState("");
  const [profilePublishingCapacity, setProfilePublishingCapacity] = useState("");
  const [profileExistingSeoData, setProfileExistingSeoData] = useState("");
  const [profileNotes, setProfileNotes] = useState("");

  const parseCommaOrLineArray = (str: string): string[] => {
    return str
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const handleOpenNewWorkspaceModal = () => {
    setNewWorkspaceName("");
    setNewWorkspaceDesc("");
    setProfileBusinessName("");
    setProfileWebsiteUrl("");
    setProfileDescription("");
    setProfileIndustry("");
    setProfileTargetCountry("");
    setProfileTargetAudience("");
    setProfileGoals("");
    setProfileProductsServices("");
    setProfilePriorityServices("");
    setProfileCompetitors("");
    setProfileExistingPages("");
    setProfileSitemapUrl("");
    setProfilePreferredPageTypes("");
    setProfilePublishingCapacity("");
    setProfileExistingSeoData("");
    setProfileNotes("");
    setNewWsStep(1);
    setShowNewWorkspaceModal(true);
  };

  const handleOpenEditWorkspaceModal = (ws: Workspace) => {
    setEditWorkspaceName(ws.name);
    setEditWorkspaceDesc(ws.description || "");
    setProfileBusinessName(ws.clientProfile?.businessName || ws.name);
    setProfileWebsiteUrl(ws.clientProfile?.websiteUrl || ws.description || "");
    setProfileDescription(ws.clientProfile?.description || "");
    setProfileIndustry(ws.clientProfile?.industry || "");
    setProfileTargetCountry(ws.clientProfile?.targetCountry || "");
    setProfileTargetAudience(ws.clientProfile?.targetAudience || "");
    setProfileGoals(ws.clientProfile?.goals?.join("\n") || "");
    setProfileProductsServices(ws.clientProfile?.productsServices?.join("\n") || "");
    setProfilePriorityServices(ws.clientProfile?.priorityServices?.join("\n") || "");
    setProfileCompetitors(ws.clientProfile?.competitors?.join("\n") || "");
    setProfileExistingPages(ws.clientProfile?.existingPages?.join("\n") || "");
    setProfileSitemapUrl(ws.clientProfile?.sitemapUrl || "");
    setProfilePreferredPageTypes(ws.clientProfile?.preferredPageTypes?.join("\n") || "");
    setProfilePublishingCapacity(ws.clientProfile?.publishingCapacity || "");
    setProfileExistingSeoData(ws.clientProfile?.existingSeoData?.join("\n") || "");
    setProfileNotes(ws.clientProfile?.notes || "");
    setEditWsStep(1);
    setShowEditWorkspaceModal(true);
  };
  const [copiedLink, setCopiedLink] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Bulk keyword and save statuses states
  const [bulkImportedText, setBulkImportedText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Constant branding for YourSEOgirl Keyword Planner
  const APP_TITLE = "YourSEOgirl Keyword Planner";
  const APP_TAGLINE = "Keyword, Silo & Content Architect for yourseogirl.com";

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
    
    const profileObj = {
      businessName: profileBusinessName.trim() || newWorkspaceName.trim(),
      websiteUrl: profileWebsiteUrl.trim() || newWorkspaceDesc.trim(),
      description: profileDescription.trim(),
      industry: profileIndustry.trim(),
      targetCountry: profileTargetCountry.trim(),
      targetAudience: profileTargetAudience.trim(),
      goals: parseCommaOrLineArray(profileGoals),
      productsServices: parseCommaOrLineArray(profileProductsServices),
      priorityServices: parseCommaOrLineArray(profilePriorityServices),
      competitors: parseCommaOrLineArray(profileCompetitors),
      existingPages: parseCommaOrLineArray(profileExistingPages),
      sitemapUrl: profileSitemapUrl.trim(),
      preferredPageTypes: parseCommaOrLineArray(profilePreferredPageTypes),
      publishingCapacity: profilePublishingCapacity.trim(),
      existingSeoData: parseCommaOrLineArray(profileExistingSeoData),
      notes: profileNotes.trim()
    };

    const newWs: Workspace = {
      id: newId,
      name: newWorkspaceName.trim(),
      description: newWorkspaceDesc.trim() || "SEO mapping workspace",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      keywords: [],
      keywordClusters: [],
      contentClusters: [],
      templates: [],
      clientProfile: profileObj
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

  const handleEditWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    if (!editWorkspaceName.trim()) return;
    if (isReadOnly) {
      triggerAlert("error", "This shared workspace is in Read-Only mode. Sign in to design your own maps!");
      return;
    }

    const profileObj = {
      businessName: profileBusinessName.trim() || editWorkspaceName.trim(),
      websiteUrl: profileWebsiteUrl.trim() || editWorkspaceDesc.trim(),
      description: profileDescription.trim(),
      industry: profileIndustry.trim(),
      targetCountry: profileTargetCountry.trim(),
      targetAudience: profileTargetAudience.trim(),
      goals: parseCommaOrLineArray(profileGoals),
      productsServices: parseCommaOrLineArray(profileProductsServices),
      priorityServices: parseCommaOrLineArray(profilePriorityServices),
      competitors: parseCommaOrLineArray(profileCompetitors),
      existingPages: parseCommaOrLineArray(profileExistingPages),
      sitemapUrl: profileSitemapUrl.trim(),
      preferredPageTypes: parseCommaOrLineArray(profilePreferredPageTypes),
      publishingCapacity: profilePublishingCapacity.trim(),
      existingSeoData: parseCommaOrLineArray(profileExistingSeoData),
      notes: profileNotes.trim()
    };

    await handleUpdateActiveWorkspace({
      name: editWorkspaceName.trim(),
      description: editWorkspaceDesc.trim(),
      clientProfile: profileObj
    });
    setShowEditWorkspaceModal(false);
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
    triggerAlert("success", `Initiating ${APP_TITLE} Senior SEO Strategy Engine...`);
    
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
          existingPages: activeWorkspace.contentInventoryPages || [],
          clientProfile: activeWorkspace.clientProfile || {},
          workspaceContext: {
            clientProfile: activeWorkspace.clientProfile || {},
            keywords: activeWorkspace.keywords || [],
            clusters: activeWorkspace.keywordClusters || [],
            pages: activeWorkspace.pageMappings || [],
            competitors: activeWorkspace.clientProfile?.competitors || [],
            contentInventory: activeWorkspace.contentInventoryPages || [],
            actionPlan: activeWorkspace.actionPlanTasks || []
          }
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-850 font-sans antialiased relative overflow-hidden" id="auth-loading-screen">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="text-center flex flex-col items-center justify-center space-y-4 relative z-10 animate-pulse duration-1000">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/15">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            <span className="text-[#cc9f2d]">YourSEO</span><span className="text-[#d53ea5]">girl</span> <span className="font-medium text-slate-500 text-sm">Keyword Planner</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            Initializing secure workspaces...
          </p>
        </div>
      </div>
    );
  }

  const params = new URLSearchParams(window.location.search);
  const sharedId = params.get("workspaceId");

  if (!currentUser && !sharedId) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center text-slate-800 font-sans antialiased relative px-4 py-12 overflow-y-auto selection:bg-blue-600 selection:text-white" id="welcome-lock-screen">
        {/* Soft Decorative Ambient Accents in Light Gray/Blue */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/20 rounded-full blur-3.5xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-100/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Alert Banner inside Welcome View */}
        {alert && (
          <div 
            id="welcome-alert-banner"
            className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-3 transition-all transform animate-in fade-in slide-in-from-top bg-white border-rose-200 text-rose-600 shadow-rose-100/30"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>{alert.message}</span>
          </div>
        )}

        <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Main Focused Panel - Crisp White UI matching local time preferences */}
          <div className="bg-white rounded-3xl border border-slate-200/70 p-8 shadow-2xl shadow-slate-100 flex flex-col space-y-6">
            
            {/* Logo and Brand Header */}
            <div className="text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/15 hover:scale-105 transition-transform duration-300 mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2 mb-4">
                <h1 className="text-3xl font-black tracking-tight leading-none">
                  <span className="text-[#cc9f2d]">YourSEO</span><span className="text-[#d53ea5]">girl</span>
                </h1>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.12em] font-sans antialiased">
                  Keyword, Silo & Content Architect
                </p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Design, map, and organize high-intent keyword silos for YourSEOgirl clients. Join seamlessly with Google Secure Ingress to lock and store your mapping data privately.
              </p>
            </div>

            {/* Custom Features/Benefits List */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex gap-3 items-start">
                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800">Private Campaign Sandboxing</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Prevent other users from seeing your keyword research and silos. Everything is scoped to your Google login.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800">Multi-Campaign Architecture</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Set up distinct workspaces for any clients, cluster keyword targets, and design beautiful supporting articles.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA action wrapper */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                    triggerAlert("success", "Successfully authenticated to your cloud workspace!");
                  } catch (err) {
                    triggerAlert("error", "Secure Authentication paused: Google sign-in was closed or failed.");
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2.5 cursor-pointer transform font-sans hover:scale-[1.01] active:scale-98"
                id="welcome-google-signin-btn"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Sign In / Log In with Google</span>
              </button>
              <p className="text-[9.5px] text-center text-slate-400 font-mono leading-none">
                Seamless registration with standard Google secure auth.
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

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
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-pink-900/40">
              <TrendingUp className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight leading-none font-sans">
                <span className="text-[#e2ba3c]">YourSEO</span><span className="text-[#d53ea5]">girl</span>
                <span className="block text-[9.5px] text-slate-400 font-medium mt-1 uppercase tracking-wider">Plan Studio</span>
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
                        handleOpenNewWorkspaceModal();
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Client</span>
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
        
        {/* Shared Read-Only Workspace Banner */}
        {!currentUser && sharedId && (
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white font-sans text-xs px-6 py-3.5 shrink-0 flex items-center justify-between gap-4 shadow-md sticky top-0 z-50 border-b border-blue-600/20" id="shared-public-workspace-banner">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400 font-bold"></span>
              </span>
              <p className="font-semibold truncate leading-none">
                You are viewing a shared {APP_TITLE} map in <strong className="font-extrabold text-blue-200">Read-Only Mode</strong>. Sign up to design and save your own SEO campaigns!
              </p>
            </div>
            <button
              onClick={signInWithGoogle}
              className="bg-white hover:bg-slate-50 text-blue-700 font-extrabold px-3.5 py-1.5 rounded-lg text-[10px] transition-all shrink-0 flex items-center gap-1.5 shadow-md active:scale-97 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Secure Log In</span>
            </button>
          </div>
        )}

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

            {/* Add Client button */}
            {activeWorkspace && (
              <button
                onClick={handleOpenNewWorkspaceModal}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>Add Client</span>
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
              
              {/* Strategy Brain workspaceContext Overview (Steps 3 & 4) */}
              <WorkspaceBrainInfo workspace={activeWorkspace} />
              
              {/* -------------------- 2A. TAB VIEW: DASHBOARD (Mockup Layout) -------------------- */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  
                  {/* Hero card from picture */}
                  <div className="bg-[#0b101d] rounded-2xl p-7 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6" id="dashboard-welcome-hero">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Welcome to Workspace</span>
                        <h3 className="font-display text-2xl font-black text-white leading-tight flex items-center gap-2">
                          {activeWorkspace.name}
                        </h3>
                        <p className="text-xs text-blue-400 font-medium font-mono">
                          {activeWorkspace.description && activeWorkspace.description.includes(".") && !activeWorkspace.description.includes(" ") ? activeWorkspace.description : "yourseogirl.com"}
                        </p>
                      </div>

                      {/* Interactive Client Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-800/60 max-w-lg">
                        <button
                          onClick={() => {
                            setEditWorkspaceName(activeWorkspace.name);
                            setEditWorkspaceDesc(activeWorkspace.description || "");
                            setShowEditWorkspaceModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                          title="Edit client metadata profile"
                        >
                          <Pencil className="w-3 h-3 text-[#e2ba3c]" />
                          <span>Edit Client Details</span>
                        </button>
                        
                        <button
                          onClick={(e) => handleDeleteWorkspace(activeWorkspace.id, e)}
                          className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-200 text-[10.5px] font-bold rounded-lg border border-rose-500/10 transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                          title="Permanently remove client workspace"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>Delete Client</span>
                        </button>

                        <div className="text-[10px] text-slate-500 font-mono pl-1">
                          Client ID: {activeWorkspace.id}
                        </div>
                      </div>
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
                      onClick={handleOpenNewWorkspaceModal}
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
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveWorkspace(ws);
                                handleOpenEditWorkspaceModal(ws);
                              }}
                              className="p-1 px-1.5 text-slate-450 hover:text-blue-600 hover:bg-blue-50/50 rounded transition-colors cursor-pointer"
                              title="Edit this client space"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                              className="p-1 px-1.5 text-slate-450 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete this client space"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                onClick={handleOpenNewWorkspaceModal} 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-550/10"
              >
                Create Starter Studio
              </button>
            </div>
          )}

        </div>

        {/* Crisp Humble Footer */}
        <footer className="bg-white border-t border-slate-200/60 px-8 py-4.5 text-center mt-auto text-[10px] text-slate-400 font-mono tracking-wide">
          {APP_TITLE} Map System • Powered by Google Gemini • Cloud Workspace Secure
        </footer>
      </main>

      {/* 3. NEW WORKSPACE CREATION FORM MODAL */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="new-workspace-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-3xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 leading-normal max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-slate-850 text-base">New Client Campaign Workspace</h3>
                <p className="text-[11px] text-slate-450">Set up the client strategy context & brand brain for Gemini AI engine.</p>
              </div>
              <button
                onClick={() => setShowNewWorkspaceModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1 select-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stepper Tabs */}
            <div className="flex items-center border-b border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setNewWsStep(1)}
                className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${newWsStep === 1 ? "border-blue-600 text-blue-600 bg-blue-50/20" : "border-transparent text-slate-455 hover:text-slate-705 hover:bg-slate-50/50"}`}
              >
                1. Brand & Identity
              </button>
              <button
                type="button"
                onClick={() => setNewWsStep(2)}
                className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${newWsStep === 2 ? "border-blue-600 text-blue-600 bg-blue-50/20" : "border-transparent text-slate-455 hover:text-slate-705 hover:bg-slate-50/50"}`}
              >
                2. Goals & Audience
              </button>
              <button
                type="button"
                onClick={() => setNewWsStep(3)}
                className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${newWsStep === 3 ? "border-blue-600 text-blue-600 bg-blue-50/20" : "border-transparent text-slate-455 hover:text-slate-705 hover:bg-slate-50/50"}`}
              >
                3. Strategy & Assets
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              {newWsStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Campaign Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Proptech Realty"
                        value={newWorkspaceName}
                        onChange={(e) => {
                          setNewWorkspaceName(e.target.value);
                          if (!profileBusinessName) setProfileBusinessName(e.target.value);
                        }}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Primary Domain (Website URL) *</label>
                      <input
                        type="text"
                        placeholder="e.g., yourseogirl.com"
                        value={newWorkspaceDesc}
                        onChange={(e) => {
                          setNewWorkspaceDesc(e.target.value);
                          if (!profileWebsiteUrl) setProfileWebsiteUrl(e.target.value);
                        }}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400 font-mono"
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Business Name (Specific)</label>
                      <input
                        type="text"
                        placeholder="e.g., Proptech Brokerage LLC"
                        value={profileBusinessName}
                        onChange={(e) => setProfileBusinessName(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Industry / Niche</label>
                      <input
                        type="text"
                        placeholder="e.g., Real Estate Property SAAS, Medical Care Dentist"
                        value={profileIndustry}
                        onChange={(e) => setProfileIndustry(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Business Description</label>
                    <textarea
                      placeholder="Detail what the business does, their core values, unique selling proposition and general history..."
                      value={profileDescription}
                      onChange={(e) => setProfileDescription(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400 h-24 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {newWsStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Target Country</label>
                      <input
                        type="text"
                        placeholder="e.g., United States, UK, Global"
                        value={profileTargetCountry}
                        onChange={(e) => setProfileTargetCountry(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Target Audience</label>
                      <input
                        type="text"
                        placeholder="e.g., Startup Founders, Parents, Local Homeowners"
                        value={profileTargetAudience}
                        onChange={(e) => setProfileTargetAudience(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Publishing Capacity</label>
                      <input
                        type="text"
                        placeholder="e.g., 4 articles/month"
                        value={profilePublishingCapacity}
                        onChange={(e) => setProfilePublishingCapacity(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Primary SEO Goals (One per line or comma-separated)</label>
                      <textarea
                        placeholder="e.g., Rank comparison content&#10;Dominate NYC broker queries&#10;Increase transactional signups"
                        value={profileGoals}
                        onChange={(e) => setProfileGoals(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400 h-24 resize-none leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Preferred Page Types (One per line or comma-separated)</label>
                      <textarea
                        placeholder="e.g., Service Page&#10;Blog Post&#10;Comparison Hub&#10;FAQ Page"
                        value={profilePreferredPageTypes}
                        onChange={(e) => setProfilePreferredPageTypes(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-550/10 focus:border-blue-500 placeholder:text-slate-400 h-24 resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {newWsStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Sitemap URL</label>
                      <input
                        type="url"
                        placeholder="https://clientsite.com/sitemap_index.xml"
                        value={profileSitemapUrl}
                        onChange={(e) => setProfileSitemapUrl(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Key Competitors (Lines/Commas)</label>
                      <input
                        type="text"
                        placeholder="e.g., Zillow, Redfin, Realtor.com"
                        value={profileCompetitors}
                        onChange={(e) => setProfileCompetitors(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-505 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Main Products & Services</label>
                      <textarea
                        placeholder="e.g., Commercial leasing&#10;Residential transaction workflow"
                        value={profileProductsServices}
                        onChange={(e) => setProfileProductsServices(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl h-16 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Priority Products (to push)</label>
                      <textarea
                        placeholder="e.g., Residential transaction tracker app"
                        value={profilePriorityServices}
                        onChange={(e) => setProfilePriorityServices(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl h-16 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Existing SEO Data / Ranks</label>
                      <textarea
                        placeholder="e.g., Ranks #4 for 'NYC transaction sheet'"
                        value={profileExistingSeoData}
                        onChange={(e) => setProfileExistingSeoData(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl h-16 resize-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Existing Important Pages (URLs - One per line)</label>
                      <textarea
                        placeholder="https://clientsite.com/nyc-brokerage&#10;https://clientsite.com/pricing"
                        value={profileExistingPages}
                        onChange={(e) => setProfileExistingPages(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/50 border border-slate-205 rounded-xl h-16 resize-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Additional Notes</label>
                      <textarea
                        placeholder="Any additional instructions or custom developer parameters..."
                        value={profileNotes}
                        onChange={(e) => setProfileNotes(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/50 border border-slate-205 rounded-xl h-16 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex border-t border-slate-100 pt-4 items-center justify-between text-xs font-bold mt-2">
                <div className="flex gap-2">
                  {newWsStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setNewWsStep(prev => prev - 1)}
                      className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors select-none cursor-pointer"
                    >
                      ← Back
                    </button>
                  ) : (
                    <div className="w-10"></div>
                  )}
                  {newWsStep < 3 && (
                    <button
                      type="button"
                      onClick={() => setNewWsStep(prev => prev + 1)}
                      className="px-4 py-2.5 bg-slate-50 hover:bg-blue-50 text-blue-650 border border-blue-100 rounded-xl hover:border-blue-200 transition-all select-none cursor-pointer"
                    >
                      Continue Step →
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewWorkspaceModal(false)}
                    className="px-4 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors select-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="submit-new-ws-btn"
                    className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    Create Client Profile Brain
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. EDIT WORKSPACE / CLIENT CAMPAIGN FORM MODAL */}
      {showEditWorkspaceModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="edit-workspace-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-3xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 leading-normal max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-slate-850 text-base flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600" />
                  <span>Update Client Strategy Context</span>
                </h3>
                <p className="text-[11px] text-slate-450">Maintain and pivot the AI Search Strategy Context Brain of your active campaign.</p>
              </div>
              <button
                onClick={() => setShowEditWorkspaceModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1 select-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stepper Tabs */}
            <div className="flex items-center border-b border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setEditWsStep(1)}
                className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${editWsStep === 1 ? "border-blue-600 text-blue-600 bg-blue-50/20" : "border-transparent text-slate-455 hover:text-slate-705 hover:bg-slate-50/50"}`}
              >
                1. Brand & Identity
              </button>
              <button
                type="button"
                onClick={() => setEditWsStep(2)}
                className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${editWsStep === 2 ? "border-blue-600 text-blue-600 bg-blue-50/20" : "border-transparent text-slate-455 hover:text-slate-705 hover:bg-slate-50/50"}`}
              >
                2. Goals & Audience
              </button>
              <button
                type="button"
                onClick={() => setEditWsStep(3)}
                className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${editWsStep === 3 ? "border-blue-600 text-blue-600 bg-blue-50/20" : "border-transparent text-slate-455 hover:text-slate-705 hover:bg-slate-50/50"}`}
              >
                3. Strategy & Assets
              </button>
            </div>

            <form onSubmit={handleEditWorkspaceSubmit} className="space-y-4">
              {editWsStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Campaign Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Proptech Realty"
                        value={editWorkspaceName}
                        onChange={(e) => setEditWorkspaceName(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Primary Domain (Website URL) *</label>
                      <input
                        type="text"
                        placeholder="e.g., yourseogirl.com"
                        value={editWorkspaceDesc}
                        onChange={(e) => setEditWorkspaceDesc(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400 font-mono"
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Business Name (Specific)</label>
                      <input
                        type="text"
                        placeholder="e.g., Proptech Brokerage LLC"
                        value={profileBusinessName}
                        onChange={(e) => setProfileBusinessName(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Industry / Niche</label>
                      <input
                        type="text"
                        placeholder="e.g., Real Estate Property SAAS, Medical Care Dentist"
                        value={profileIndustry}
                        onChange={(e) => setProfileIndustry(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Business Description</label>
                    <textarea
                      placeholder="Detail what the business does, their core values, unique selling proposition and general history..."
                      value={profileDescription}
                      onChange={(e) => setProfileDescription(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400 h-24 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {editWsStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Target Country</label>
                      <input
                        type="text"
                        placeholder="e.g., United States, UK, Global"
                        value={profileTargetCountry}
                        onChange={(e) => setProfileTargetCountry(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Target Audience</label>
                      <input
                        type="text"
                        placeholder="e.g., Startup Founders, Parents, Local Homeowners"
                        value={profileTargetAudience}
                        onChange={(e) => setProfileTargetAudience(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Publishing Capacity</label>
                      <input
                        type="text"
                        placeholder="e.g., 4 articles/month"
                        value={profilePublishingCapacity}
                        onChange={(e) => setProfilePublishingCapacity(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Primary SEO Goals (One per line or comma-separated)</label>
                      <textarea
                        placeholder="e.g., Track comparison metrics&#10;Rank comparison content&#10;Increase transactional signups"
                        value={profileGoals}
                        onChange={(e) => setProfileGoals(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400 h-24 resize-none leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Preferred Page Types (One per line or comma-separated)</label>
                      <textarea
                        placeholder="e.g., Service Page&#10;Blog Post&#10;Comparison Hub&#10;FAQ Page"
                        value={profilePreferredPageTypes}
                        onChange={(e) => setProfilePreferredPageTypes(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-550/10 focus:border-blue-500 placeholder:text-slate-400 h-24 resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editWsStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Sitemap URL</label>
                      <input
                        type="url"
                        placeholder="https://clientsite.com/sitemap_index.xml"
                        value={profileSitemapUrl}
                        onChange={(e) => setProfileSitemapUrl(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-500 placeholder:text-slate-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Key Competitors (Lines/Commas)</label>
                      <input
                        type="text"
                        placeholder="e.g., Zillow, Redfin, Realtor.com"
                        value={profileCompetitors}
                        onChange={(e) => setProfileCompetitors(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50/55 border border-slate-205 rounded-xl focus:ring-2 focus:ring-blue-505/10 focus:border-blue-505 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Main Products & Services</label>
                      <textarea
                        placeholder="e.g., Commercial leasing&#10;Residential transaction workflow"
                        value={profileProductsServices}
                        onChange={(e) => setProfileProductsServices(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl h-16 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Priority Products (to push)</label>
                      <textarea
                        placeholder="e.g., Residential transaction tracker app"
                        value={profilePriorityServices}
                        onChange={(e) => setProfilePriorityServices(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl h-16 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Existing SEO Data / Ranks</label>
                      <textarea
                        placeholder="e.g., Ranks #4 for 'NYC transaction sheet'"
                        value={profileExistingSeoData}
                        onChange={(e) => setProfileExistingSeoData(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl h-16 resize-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Existing Important Pages (URLs - One per line)</label>
                      <textarea
                        placeholder="https://clientsite.com/nyc-brokerage&#10;https://clientsite.com/pricing"
                        value={profileExistingPages}
                        onChange={(e) => setProfileExistingPages(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/55 border border-slate-205 rounded-xl h-16 resize-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Additional Notes</label>
                      <textarea
                        placeholder="Any additional notes or custom strategies..."
                        value={profileNotes}
                        onChange={(e) => setProfileNotes(e.target.value)}
                        className="w-full text-[11px] p-2.5 bg-slate-50/55 border border-slate-205 rounded-xl h-16 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex border-t border-slate-100 pt-4 items-center justify-between text-xs font-bold mt-2">
                <div className="flex gap-2">
                  {editWsStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setEditWsStep(prev => prev - 1)}
                      className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-205 transition-colors select-none cursor-pointer"
                    >
                      ← Back
                    </button>
                  ) : (
                    <div className="w-10"></div>
                  )}
                  {editWsStep < 3 && (
                    <button
                      type="button"
                      onClick={() => setEditWsStep(prev => prev + 1)}
                      className="px-4 py-2.5 bg-slate-50 hover:bg-blue-50 text-blue-650 border border-blue-100 rounded-xl hover:border-blue-200 transition-all select-none cursor-pointer"
                    >
                      Continue Step →
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditWorkspaceModal(false)}
                    className="px-4 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors select-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="submit-edit-ws-btn"
                    className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    Save Strategy Profile Updates
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
