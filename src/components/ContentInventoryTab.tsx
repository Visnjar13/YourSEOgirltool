import React, { useState, useMemo } from "react";
import { ContentInventoryPage, Workspace } from "../types";
import { Search, Plus, Upload, Trash2, Globe, ExternalLink, Calendar, HelpCircle, X, ChevronLeft, ChevronRight } from "lucide-react";

interface ContentInventoryTabProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
  triggerAlert: (type: "success" | "error", message: string) => void;
}

export default function ContentInventoryTab({ workspace, onUpdateWorkspace, triggerAlert }: ContentInventoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add custom URL modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Blog Post");
  const [newStatus, setNewStatus] = useState("Active");

  const rawPages = workspace.contentInventoryPages || [];

  // Update URL fields
  const handleUpdatePageField = async (id: string, updatedFields: Partial<ContentInventoryPage>) => {
    const updated = rawPages.map(p => {
      if (p.id === id) {
        return { ...p, ...updatedFields };
      }
      return p;
    });
    await onUpdateWorkspace({ contentInventoryPages: updated });
    triggerAlert("success", "Inventory record updated successfully.");
  };

  // Delete matching inventory URL page
  const handleDeletePage = async (id: string) => {
    const updated = rawPages.filter(p => p.id !== id);
    await onUpdateWorkspace({ contentInventoryPages: updated });
    triggerAlert("success", "Removed from content inventory index.");
  };

  // Add individual page
  const handleAddPageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      triggerAlert("error", "URL path target cannot be empty.");
      return;
    }

    // Standardize URL protocol
    let finalUrl = newUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    const newRecord: ContentInventoryPage = {
      id: `page-cust-${Date.now()}`,
      url: finalUrl,
      title: newTitle.trim() || "—",
      pageType: newType,
      status: newStatus,
      lastUpdated: new Date().toISOString().split("T")[0]
    };

    const updated = [newRecord, ...rawPages];
    await onUpdateWorkspace({ contentInventoryPages: updated });
    setIsAddOpen(false);
    setNewUrl("");
    setNewTitle("");
    triggerAlert("success", "Added new page to active content inventory!");
  };

  // Bulk import simulator
  const handleBulkImportSimulation = async () => {
    triggerAlert("success", "Scanning sitemap.xml for crawl index...");
    setTimeout(async () => {
      const mockBulk: ContentInventoryPage[] = [
        { id: `page-bulk-1-${Date.now()}`, url: "https://yourseogirl.com/category/seo-tips/", title: "SEO Tips Archive Hub", pageType: "Blog Post", status: "Active", lastUpdated: "2026-06-01" },
        { id: `page-bulk-2-${Date.now()}`, url: "https://yourseogirl.com/about/", title: "About Your SEO Girl", pageType: "Service Page", status: "Active", lastUpdated: "2026-05-15" },
        { id: `page-bulk-3-${Date.now()}`, url: "https://yourseogirl.com/contact-services/", title: "Contact Campaign Consulting", pageType: "Service Page", status: "Active", lastUpdated: "2026-05-24" },
      ];
      await onUpdateWorkspace({ contentInventoryPages: [...mockBulk, ...rawPages] });
      triggerAlert("success", "Discovered 3 new active URLs inside sitemap crawler!");
    }, 1200);
  };

  // Filter lists based on search
  const filteredPages = useMemo(() => {
    let list = [...rawPages];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.url.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
    }
    return list;
  }, [rawPages, searchQuery]);

  const paginatedPages = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPages.slice(start, start + itemsPerPage);
  }, [filteredPages, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredPages.length / itemsPerPage));

  return (
    <div className="space-y-6" id="content-inventory-tab-module">
      
      {/* Table Filters header region exactly matching Image 7 */}
      <div className="bg-white border border-slate-200/70 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Toggle / Tabs Badge */}
        <div className="flex items-center gap-2.5">
          <span className="bg-blue-600 border border-blue-600 text-white font-extrabold text-xs px-4 py-2 rounded-full cursor-pointer shadow-xs">
            Active ({filteredPages.length})
          </span>
        </div>

        {/* Search & Actions block right */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Search box inline */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search pages..."
              className="pl-8.5 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          <button
            onClick={handleBulkImportSimulation}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Bulk Import</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-blue-500/10 active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Page</span>
          </button>

        </div>

      </div>

      {/* Structured grid list layout */}
      <div className="bg-white border border-slate-200/70 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                <th className="p-4 pl-6">URL Location Map</th>
                <th className="p-4">Title / H1</th>
                <th className="p-4">Page Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Updated</th>
                <th className="p-4 pr-6 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPages.length > 0 ? (
                paginatedPages.map((item, idx) => (
                  <tr key={item.id + idx} className="hover:bg-slate-50/50 transition-colors group">
                    
                    {/* URL location path */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-2 min-w-[280px]">
                        <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                        <a 
                          href={item.url} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="text-blue-600 hover:text-blue-800 font-medium font-sans truncate block max-w-sm flex items-center gap-1 hover:underline"
                        >
                          <span className="truncate">{item.url}</span>
                          <ExternalLink className="w-3 h-3 inline text-blue-450 shrink-0" />
                        </a>
                      </div>
                    </td>

                    {/* Title / H1 */}
                    <td className="p-4">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdatePageField(item.id, { title: e.target.value })}
                        placeholder="Click to input H1 title tag"
                        className="p-1 px-1.5 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded text-xs font-bold font-sans text-slate-700 w-full max-w-xs focus:bg-white bg-transparent outline-none"
                      />
                    </td>

                    {/* Page Type */}
                    <td className="p-4">
                      <select
                        value={item.pageType}
                        onChange={(e) => handleUpdatePageField(item.id, { pageType: e.target.value })}
                        className="px-2.5 py-1.5 border border-slate-200 text-xs font-semibold rounded-lg bg-white"
                      >
                        <option value="Blog Post">Blog Post</option>
                        <option value="Comparison Page">Comparison Page</option>
                        <option value="Location Page">Location Page</option>
                        <option value="Service Page">Service Page</option>
                      </select>
                    </td>

                    {/* Status dropdown */}
                    <td className="p-4">
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdatePageField(item.id, { status: e.target.value })}
                        className="px-2.5 py-1.5 border border-slate-250 text-xs font-semibold rounded-lg bg-white cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Draft">Draft</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </td>

                    {/* Last Updated Date */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px] font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.lastUpdated}</span>
                      </div>
                    </td>

                    {/* Delete column cross mimicking screenshot */}
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handleDeletePage(item.id)}
                        className="p-1 px-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-lg transition-all cursor-pointer border border-transparent"
                        title="Delete record"
                      >
                        <X className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold font-sans">
                    No active URLs mapped in content inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredPages.length)}</span> of{" "}
            <span className="text-slate-800">{filteredPages.length}</span> active pages
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

      {/* Add Page Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between animate-in fade-in zoom-in-95 duration-150">
              <h3 className="font-display font-bold text-slate-800 text-sm">Add Page to Inventory</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPageSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-450 block mb-1">Crawlable URL</label>
                <input
                  type="text"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://yourseogirl.com/about/"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-450 block mb-1">H1 / SEO Title (optional)</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Leave empty for auto-crawl"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-450 block mb-1">Content Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none cursor-pointer font-semibold"
                  >
                    <option value="Blog Post">Blog Post</option>
                    <option value="Comparison Page">Comparison Page</option>
                    <option value="Location Page">Location Page</option>
                    <option value="Service Page">Service Page</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-450 block mb-1">Index Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none cursor-pointer font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md cursor-pointer"
              >
                Insert crawl link
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
