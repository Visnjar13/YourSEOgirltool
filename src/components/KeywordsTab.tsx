import React, { useState, useMemo } from "react";
import { KeywordItem, KeywordIntent, Workspace } from "../types";
import { Search, Plus, Upload, Trash2, ArrowUpDown, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface KeywordsTabProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
  triggerAlert: (type: "success" | "error", message: string) => void;
}

export default function KeywordsTab({ workspace, onUpdateWorkspace, triggerAlert }: KeywordsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<string>("all");
  const [activeIntentTab, setActiveIntentTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modal State for Add Keyword
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newIntent, setNewIntent] = useState<KeywordIntent>("Informational");
  const [newVolume, setNewVolume] = useState<number>(100);
  const [newKD, setNewKD] = useState<number>(20);
  const [newCPC, setNewCPC] = useState<number>(0);

  // Intent Group Counts of actual keywords in the workspace
  const counts = useMemo(() => {
    const list = workspace.keywords || [];
    return {
      all: list.length,
      Informational: list.filter(k => k.intent === "Informational").length,
      Commercial: list.filter(k => k.intent === "Commercial").length,
      Transactional: list.filter(k => k.intent === "Transactional").length,
      Local: list.filter(k => k.intent === "Local").length,
      Comparison: list.filter(k => k.intent === "Comparison").length,
    };
  }, [workspace.keywords]);

  // Sorting
  const [sortField, setSortField] = useState<keyof KeywordItem>("volume");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: keyof KeywordItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Filtered and sorted keywords
  const filteredKeywords = useMemo(() => {
    let list = [...(workspace.keywords || [])];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(k => k.keyword.toLowerCase().includes(query));
    }

    // Filter by Dropdown intent select
    if (selectedIntentFilter !== "all") {
      list = list.filter(k => k.intent === selectedIntentFilter);
    }

    // Filter by Active top intent button/pill
    if (activeIntentTab !== "all") {
      list = list.filter(k => k.intent === activeIntentTab);
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });

    return list;
  }, [workspace.keywords, searchQuery, selectedIntentFilter, activeIntentTab, sortField, sortAsc]);

  // Paginated Keywords
  const paginatedKeywords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredKeywords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredKeywords, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredKeywords.length / itemsPerPage));

  // CSV Bulk Ingest support
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const imported: KeywordItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV splitter (handle possible quotes)
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, "").trim());
        if (parts.length > 0 && parts[0]) {
          const kw = parts[0];
          const intentVal = (parts[1] as KeywordIntent) || "Informational";
          const vol = parts[2] ? parseInt(parts[2], 10) : 100;
          const kd = parts[3] ? parseInt(parts[3], 10) : 25;
          const cpcVal = parts[4] ? parseFloat(parts[4]) : 0;

          imported.push({
            keyword: kw,
            intent: ["Informational", "Transactional", "Commercial", "Navigational", "Local", "Comparison"].includes(intentVal) ? intentVal : "Informational",
            volume: isNaN(vol) ? 100 : vol,
            difficulty: isNaN(kd) ? 25 : kd,
            cpc: isNaN(cpcVal) ? 0 : cpcVal,
            rankingUrl: "—",
            pos: "—"
          });
        }
      }

      if (imported.length > 0) {
        const updatedKeywords = [...(workspace.keywords || []), ...imported];
        await onUpdateWorkspace({ keywords: updatedKeywords });
        triggerAlert("success", `Successfully imported ${imported.length} keywords from CSV!`);
      } else {
        triggerAlert("error", "Could not parse any valid keywords from the CSV file.");
      }
    };
    reader.readAsText(file);
  };

  // Add individual keyword
  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) {
      triggerAlert("error", "Keyword title string cannot be empty.");
      return;
    }

    const item: KeywordItem = {
      keyword: newKeyword.trim(),
      intent: newIntent,
      volume: newVolume,
      difficulty: newKD,
      cpc: newCPC,
      rankingUrl: "—",
      pos: "—"
    };

    const updatedKeywords = [item, ...(workspace.keywords || [])];
    await onUpdateWorkspace({ keywords: updatedKeywords });
    setIsAddOpen(false);
    setNewKeyword("");
    triggerAlert("success", `Added keyword "${item.keyword}" successfully!`);
  };

  // Delete individual keyword
  const handleDeleteKeyword = async (keywordToDelete: string) => {
    const updatedKeywords = (workspace.keywords || []).filter(k => k.keyword !== keywordToDelete);
    await onUpdateWorkspace({ keywords: updatedKeywords });
    triggerAlert("success", `Deleted keyword target successfully`);
  };

  // Safe KD tag builder
  const renderKD = (kd: number | undefined) => {
    const val = kd !== undefined ? kd : 0;
    let bgColor = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
    let scoreColor = "text-emerald-700 font-bold";

    if (val > 65) {
      bgColor = "bg-rose-50 text-rose-700 border-rose-200/50";
      scoreColor = "text-rose-700 font-bold";
    } else if (val > 35) {
      bgColor = "bg-amber-50 text-amber-700 border-amber-200/50";
      scoreColor = "text-amber-700 font-bold";
    }

    return (
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-mono font-bold ${bgColor}`}>
        <span className={scoreColor}>{val}</span>
      </div>
    );
  };

  // Clean volume renderer
  const formatVolume = (vol: number | undefined) => {
    if (vol === undefined) return "—";
    return vol.toLocaleString();
  };

  return (
    <div className="space-y-6" id="keywords-tab-module">
      {/* Search and Filters Strip */}
      <div className="bg-white border border-slate-200/70 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 o h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search keywords..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
          />
        </div>

        {/* Dropdown intent and action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dropdown selection */}
          <select
            value={selectedIntentFilter}
            onChange={(e) => { setSelectedIntentFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white cursor-pointer"
          >
            <option value="all">All Intents</option>
            <option value="Informational">Informational</option>
            <option value="Commercial">Commercial</option>
            <option value="Transactional">Transactional</option>
            <option value="Local">Local</option>
            <option value="Comparison">Comparison</option>
          </select>

          {/* Import CSV */}
          <label className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="hidden"
            />
          </label>

          {/* Add Keyword */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/10 flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Keyword</span>
          </button>
        </div>
      </div>

      {/* Visual filter pill indicators with direct row counts */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setActiveIntentTab("all"); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeIntentTab === "all"
              ? "bg-slate-900 border-slate-900 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All ({counts.all})
        </button>

        <button
          onClick={() => { setActiveIntentTab("Informational"); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeIntentTab === "Informational"
              ? "bg-[#2563eb] border-[#2563eb] text-white"
              : "bg-white border-slate-200 text-[#2563eb] hover:bg-blue-50/20"
          }`}
        >
          Informational ({counts.Informational})
        </button>

        <button
          onClick={() => { setActiveIntentTab("Commercial"); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeIntentTab === "Commercial"
              ? "bg-[#d97706] border-[#d97706] text-white"
              : "bg-white border-slate-200 text-[#d97706] hover:bg-amber-50/20"
          }`}
        >
          Commercial ({counts.Commercial})
        </button>

        <button
          onClick={() => { setActiveIntentTab("Transactional"); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeIntentTab === "Transactional"
              ? "bg-[#059669] border-[#059669] text-white"
              : "bg-white border-slate-200 text-[#059669] hover:bg-emerald-50/20"
          }`}
        >
          Transactional ({counts.Transactional})
        </button>

        <button
          onClick={() => { setActiveIntentTab("Local"); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeIntentTab === "Local"
              ? "bg-[#ea580c] border-[#ea580c] text-white"
              : "bg-white border-slate-200 text-[#ea580c] hover:bg-orange-50/20"
          }`}
        >
          Local ({counts.Local})
        </button>

        <button
          onClick={() => { setActiveIntentTab("Comparison"); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            activeIntentTab === "Comparison"
              ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
              : "bg-white border-slate-200 text-[#8b5cf6] hover:bg-violet-50/20"
          }`}
        >
          Comparison ({counts.Comparison})
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200/70 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                <th className="p-4 pl-6 w-10">
                  <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort("keyword")}>
                  <div className="flex items-center gap-1.5">
                    <span>Keyword</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort("intent")}>
                  <div className="flex items-center gap-1.5">
                    <span>Intent</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort("volume")}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Volume</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort("difficulty")}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>KD</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-right cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort("cpc")}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>CPC</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4">Ranking URL</th>
                <th className="p-4 text-center">Pos.</th>
                <th className="p-4 pr-6 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedKeywords.length > 0 ? (
                paginatedKeywords.map((kw, idx) => (
                  <tr key={kw.keyword + idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 pl-6">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                    </td>
                    <td className="p-4 font-bold text-slate-800 font-sans">{kw.keyword}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        kw.intent === "Informational" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                        kw.intent === "Commercial" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        kw.intent === "Transactional" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        kw.intent === "Local" ? "bg-orange-50 text-orange-600 border border-orange-100" :
                        "bg-violet-50 text-violet-600 border border-violet-100"
                      }`}>
                        {kw.intent}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-650 font-semibold">{formatVolume(kw.volume)}</td>
                    <td className="p-4 text-center">{renderKD(kw.difficulty)}</td>
                    <td className="p-4 text-right font-mono text-slate-500">
                      {kw.cpc && kw.cpc > 0 ? `$${kw.cpc.toFixed(2)}` : "—"}
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px] truncate max-w-xs">{kw.rankingUrl || "—"}</td>
                    <td className="p-4 text-center text-slate-400 font-mono">{kw.pos || "—"}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handleDeleteKeyword(kw.keyword)}
                        className="p-1 px-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-semibold">
                    No keywords found matching the query and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Elegant Pagination bar */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredKeywords.length)}</span> of{" "}
            <span className="text-slate-800">{filteredKeywords.length}</span> keywords
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-xl bg-white text-slate-650 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-450 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 font-bold px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-xl bg-white text-slate-650 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-450 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Keyword Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6.5 max-w-md w-full shadow-xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-850 text-base">Add New Search Keyword</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddKeyword} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Keyword Phrase</label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="E.g., enterprise branding workflow"
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Intent</label>
                  <select
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value as KeywordIntent)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Informational">Informational</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Transactional">Transactional</option>
                    <option value="Local">Local</option>
                    <option value="Comparison">Comparison</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Search Volume</label>
                  <input
                    type="number"
                    value={newVolume}
                    onChange={(e) => setNewVolume(parseInt(e.target.value) || 0)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Difficulty (KD 0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newKD}
                    onChange={(e) => setNewKD(parseInt(e.target.value) || 0)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">CPC ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCPC}
                    onChange={(e) => setNewCPC(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Insert Keyword Target
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
