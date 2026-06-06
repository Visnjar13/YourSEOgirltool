import React, { useState, useMemo } from "react";
import { PageMappingItem, Workspace } from "../types";
import { Trash2, Plus, Sparkles, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";

interface PageMappingTabProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
  triggerAlert: (type: "success" | "error", message: string) => void;
}

export default function PageMappingTab({ workspace, onUpdateWorkspace, triggerAlert }: PageMappingTabProps) {
  const [activeDifficultyFilter, setActiveDifficultyFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Inputs state for adding mapping
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addCluster, setAddCluster] = useState("");
  const [addAction, setAddAction] = useState<"Create" | "Optimise">("Create");
  const [addType, setAddType] = useState("Blog Post");
  const [addDiff, setAddDiff] = useState(25);
  const [addPriority, setAddPriority] = useState<"Low" | "Medium" | "High">("Medium");

  const rawMappings = workspace.pageMappings || [];

  // Filter Categories counts
  const categoriesCounts = useMemo(() => {
    return {
      All: rawMappings.length,
      Easy: rawMappings.filter(m => m.difficulty >= 0 && m.difficulty <= 30).length,
      Medium: rawMappings.filter(m => m.difficulty > 30 && m.difficulty <= 60).length,
      Hard: rawMappings.filter(m => m.difficulty > 60 && m.difficulty <= 80).length,
      VeryHard: rawMappings.filter(m => m.difficulty > 80).length,
      Unscored: rawMappings.filter(m => m.difficulty < 0).length,
    };
  }, [rawMappings]);

  // Handle value change callbacks to save back to workspace
  const handleUpdateItem = async (id: string, updatedFields: Partial<PageMappingItem>) => {
    const updated = rawMappings.map(item => {
      if (item.id === id) {
        return { ...item, ...updatedFields };
      }
      return item;
    });
    await onUpdateWorkspace({ pageMappings: updated });
    triggerAlert("success", "Page mapping updated successfully.");
  };

  // Delete a mapping
  const handleDeleteItem = async (id: string) => {
    const updated = rawMappings.filter(item => item.id !== id);
    await onUpdateWorkspace({ pageMappings: updated });
    triggerAlert("success", "Removed page mapping.");
  };

  // Filter lists based on tab + search query
  const filteredMappings = useMemo(() => {
    let list = [...rawMappings];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.clusterName.toLowerCase().includes(q));
    }

    // Tab category filter
    if (activeDifficultyFilter === "Easy") {
      list = list.filter(m => m.difficulty >= 0 && m.difficulty <= 30);
    } else if (activeDifficultyFilter === "Medium") {
      list = list.filter(m => m.difficulty > 30 && m.difficulty <= 60);
    } else if (activeDifficultyFilter === "Hard") {
      list = list.filter(m => m.difficulty > 60 && m.difficulty <= 80);
    } else if (activeDifficultyFilter === "Very Hard") {
      list = list.filter(m => m.difficulty > 80);
    } else if (activeDifficultyFilter === "Unscored") {
      list = list.filter(m => m.difficulty < 0);
    }

    return list;
  }, [rawMappings, activeDifficultyFilter, searchQuery]);

  const paginatedMappings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMappings.slice(start, start + itemsPerPage);
  }, [filteredMappings, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredMappings.length / itemsPerPage));

  // Programmatic generation trigger faking
  const handleGenerateFromClusters = async () => {
    if ((workspace.keywordClusters || []).length === 0) {
      triggerAlert("error", "No clusters found in this workspace to map. Run the AI Strategy Engine or import CSV clusters first!");
      return;
    }

    triggerAlert("success", "Synthesizing SEO Page Mappings from keyword clusters...");

    const generated: PageMappingItem[] = (workspace.keywordClusters || []).map((cluster, index) => {
      const isEasy = (index % 3) === 0;
      const isMed = (index % 3) === 1;
      const scoreVal = cluster.score || 25;

      return {
        id: `map-gen-${cluster.clusterName}-${index}`,
        title: cluster.clusterName,
        clusterName: cluster.clusterName,
        action: cluster.intent === "Transactional" || cluster.intent === "Commercial" ? "Create" : "Optimise",
        pageType: cluster.type === "Service Pages" ? "Service Page" : cluster.type === "Comparison Pages" ? "Comparison Page" : cluster.type === "Location Pages" ? "Location Page" : "Blog Post",
        difficulty: scoreVal,
        priority: scoreVal > 60 ? "High" : scoreVal > 30 ? "Medium" : "Low",
        status: "Planned",
        reason: `Generated from keyword cluster '${cluster.clusterName}' representing intent ${cluster.intent || "Informational"}.`
      };
    });

    await onUpdateWorkspace({ pageMappings: [...rawMappings, ...generated] });
    triggerAlert("success", `Aligned ${generated.length} keyword clusters with your active URL page maps!`);
  };

  // Add mapping submit
  const handleAddMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim()) {
      triggerAlert("error", "Page Title cannot be empty.");
      return;
    }

    const newItem: PageMappingItem = {
      id: `map-custom-${Date.now()}`,
      title: addTitle.trim(),
      clusterName: addCluster.trim() || addTitle.trim(),
      action: addAction,
      pageType: addType,
      difficulty: addDiff,
      priority: addPriority,
      status: "Planned",
      reason: `User defined custom page mapping targeting '${addCluster.trim() || addTitle.trim()}'.`
    };

    await onUpdateWorkspace({ pageMappings: [newItem, ...rawMappings] });
    setIsAddOpen(false);
    setAddTitle("");
    setAddCluster("");
    triggerAlert("success", `Added page map "${newItem.title}" successfully!`);
  };

  return (
    <div className="space-y-6" id="page-mapping-tab-module">
      
      {/* Search and Action bar with specific buttons mimicking Image 5 */}
      <div className="bg-white border border-slate-200/70 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Count statement */}
        <div>
          <span className="text-xl font-extrabold text-slate-850 font-display block">
            {categoriesCounts.All} page mappings
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Synchronize, review difficulty levels, and manage crawl-paths prioritized by organic SERP values.
          </p>
        </div>

        {/* Buttons on right */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick filter input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search page mappings..."
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 bg-slate-50/50"
          />

          <button
            onClick={handleGenerateFromClusters}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Generate from Clusters</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-blue-500/10 active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Mapping</span>
          </button>
        </div>
      </div>

      {/* Categories Horizontal Tabs mimicking Image 5 */}
      <div className="flex flex-wrap gap-2">
        
        <button
          onClick={() => { setActiveDifficultyFilter("All"); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeDifficultyFilter === "All"
              ? "bg-slate-900 border-slate-900 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All {categoriesCounts.All}
        </button>

        <button
          onClick={() => { setActiveDifficultyFilter("Easy"); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeDifficultyFilter === "Easy"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold"
              : "bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50/20"
          }`}
        >
          Easy {categoriesCounts.Easy} (0-30)
        </button>

        <button
          onClick={() => { setActiveDifficultyFilter("Medium"); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeDifficultyFilter === "Medium"
              ? "bg-amber-50 border-amber-200 text-amber-700 font-bold"
              : "bg-white border-slate-200 text-amber-600 hover:bg-amber-50/20"
          }`}
        >
          Medium {categoriesCounts.Medium} (31-60)
        </button>

        <button
          onClick={() => { setActiveDifficultyFilter("Hard"); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeDifficultyFilter === "Hard"
              ? "bg-rose-50 border-rose-200 text-rose-700 font-bold"
              : "bg-white border-slate-200 text-rose-600 hover:bg-rose-50/20"
          }`}
        >
          Hard {categoriesCounts.Hard} (61-80)
        </button>

        <button
          onClick={() => { setActiveDifficultyFilter("Very Hard"); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeDifficultyFilter === "Very Hard"
              ? "bg-purple-50 border-purple-200 text-purple-700 font-bold"
              : "bg-white border-slate-200 text-purple-600 hover:bg-purple-50/20"
          }`}
        >
          Very Hard {categoriesCounts.VeryHard} (81-100)
        </button>

        <button
          onClick={() => { setActiveDifficultyFilter("Unscored"); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeDifficultyFilter === "Unscored"
              ? "bg-slate-100 border-slate-300 text-slate-700 font-bold"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          Unscored {categoriesCounts.Unscored} (-)
        </button>

      </div>

      {/* Mapping list table */}
      <div className="bg-white border border-slate-200/75 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                <th className="p-4 pl-6">Title / URL</th>
                <th className="p-4">Action</th>
                <th className="p-4">Page Type</th>
                <th className="p-4 text-center">Difficulty</th>
                <th className="p-4 text-center">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Reason / Recommendation</th>
                <th className="p-4 pr-6 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMappings.length > 0 ? (
                paginatedMappings.map((item, idx) => (
                  <tr key={item.id + idx} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Column 1: Title & Cluster */}
                    <td className="p-4 pl-6">
                      <div className="space-y-0.5 max-w-xs">
                        <span className="text-slate-850 font-bold font-sans block truncate text-xs" title={item.title}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-450 font-medium block truncate">
                          Cluster: {item.clusterName}
                        </span>
                      </div>
                    </td>

                    {/* Column 2: Action design mimicking Image 5 (checked tag) */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        item.action === "Create" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        <span>✓</span>
                        <span>{item.action}</span>
                      </span>
                    </td>

                    {/* Column 3: Page Type dropdown */}
                    <td className="p-4">
                      <select
                        value={item.pageType}
                        onChange={(e) => handleUpdateItem(item.id, { pageType: e.target.value })}
                        className="px-2.5 py-1.5 border border-slate-200 text-xs font-semibold rounded-lg bg-white"
                      >
                        <option value="Blog Post">Blog Post</option>
                        <option value="Comparison Page">Comparison Page</option>
                        <option value="Location Page">Location Page</option>
                        <option value="Service Page">Service Page</option>
                      </select>
                    </td>

                    {/* Column 4: Difficulty with graphics */}
                    <td className="p-4 text-center">
                      {item.difficulty < 0 ? (
                        <span className="font-semibold text-slate-400 font-mono text-center block">—</span>
                      ) : (
                        <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-150 rounded px-2 py-0.5 font-mono text-slate-650 font-bold text-[10.5px]">
                          <span>{item.difficulty}</span>
                          {item.difficulty <= 30 && <span className="text-emerald-500 text-[10px]">✓</span>}
                        </div>
                      )}
                    </td>

                    {/* Column 5: Priority selection */}
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        item.priority === "High" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                        item.priority === "Medium" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        "bg-slate-50 text-slate-655 border border-slate-150"
                      }`}>
                        {item.priority}
                      </span>
                    </td>

                    {/* Column 6: Status selector dropdown */}
                    <td className="p-4">
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateItem(item.id, { status: e.target.value as any })}
                        className="px-2 py-1.5 border border-slate-250 rounded-lg text-xs font-semibold bg-white cursor-pointer focus:border-blue-500"
                      >
                        <option value="Planned">Planned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>

                    {/* Column 7: Reason text block */}
                    <td className="p-4 text-slate-500 text-[11px] font-medium leading-relaxed max-w-xs truncate" title={item.reason}>
                      {item.reason}
                    </td>

                    {/* Column 8: Trash delete Column */}
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 px-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all border border-transparent cursor-pointer"
                        title="Delete page mapping"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-450 font-semibold font-sans">
                    No page mappings align with the active filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination navigation */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredMappings.length)}</span> of{" "}
            <span className="text-slate-800">{filteredMappings.length}</span> mapped URLs
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-650 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-450 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 font-bold px-1.5">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-650 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-450 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add New Map modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between animate-in fade-in zoom-in-95 duration-150">
              <h3 className="font-display font-bold text-slate-800 text-sm">Create New Page Mapping</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMappingSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-400 block mb-1">Target Page Title</label>
                <input
                  type="text"
                  required
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="E.g., enterprise accounting guide"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Primary Keyword Cluster Mapping</label>
                <input
                  type="text"
                  value={addCluster}
                  onChange={(e) => setAddCluster(e.target.value)}
                  placeholder="Empty defaults to target page title"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Crawl Action</label>
                  <select
                    value={addAction}
                    onChange={(e) => setAddAction(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Create">Create</option>
                    <option value="Optimise">Optimise</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Page Template</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Blog Post">Blog Post</option>
                    <option value="Comparison Page">Comparison Page</option>
                    <option value="Location Page">Location Page</option>
                    <option value="Service Page">Service Page</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Difficulty Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={addDiff}
                    onChange={(e) => setAddDiff(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Priority Metric</label>
                  <select
                    value={addPriority}
                    onChange={(e) => setAddPriority(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md cursor-pointer"
              >
                Insert Mapped Page Node
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
