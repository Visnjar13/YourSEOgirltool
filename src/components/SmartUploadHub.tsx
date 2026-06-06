import React, { useState, useRef } from "react";
import { Upload, FileText, Sparkles, RefreshCw, Check, AlertCircle, Image as ImageIcon, ThumbsUp } from "lucide-react";

interface SmartUploadHubProps {
  onKeywordsExtracted: (keywords: string[]) => void;
  activeWorkspaceName?: string;
}

export default function SmartUploadHub({ onKeywordsExtracted, activeWorkspaceName }: SmartUploadHubProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [tempKeywords, setTempKeywords] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccessCount(null);
    setTempKeywords([]);

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
      // 1. Image Check - Call OCR API
      if (fileType.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const result = reader.result as string;
          // Extract base64 payload without data url prefix
          const base64Data = result.split(",")[1];
          if (!base64Data) {
            setError("Could not parse image data stream.");
            setLoading(false);
            return;
          }

          try {
            const apiRes = await fetch("/api/gemini/parse-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                base64Data,
                mimeType: fileType || "image/png"
              })
            });

            if (!apiRes.ok) {
              const errBody = await apiRes.json();
              throw new Error(errBody.error || "Gemini multimodal parser endpoint returned an error.");
            }

            const data = await apiRes.json();
            const extracted = data.extractedText || "";
            const terms = extracted
              .split(/[\n,]+/)
              .map((str: string) => str.trim().replace(/^['"-]+|['"-]+$/g, ""))
              .filter((str: string) => str.length > 2);

            if (terms.length === 0) {
              setError("Gemini couldn't find any core SEO keywords in this screenshot/image. Try another image.");
            } else {
              setTempKeywords(terms);
              setSuccessCount(terms.length);
            }
          } catch (apiErr: any) {
            setError(apiErr.message || "Failed to process photo with Gemini Flash.");
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(file);
      } 
      // 2. Document/Text/CSV Parsing
      else {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const text = e.target?.result as string;
            let terms: string[] = [];

            if (fileName.endsWith(".csv") || fileName.endsWith(".tsv") || fileType === "text/csv") {
              // Simple CSV row parser
              terms = text
                .split(/[\n\r]+/)
                .map(row => {
                  // split by comma or tab
                  const cols = row.split(/,|\t/);
                  // take the first or second column as keyword
                  return cols[0]?.trim();
                })
                .map(str => str.replace(/^['"&]+|['"&]+$/g, "").trim())
                .filter(str => str.length > 2 && !str.includes(" ") && isNaN(Number(str)) || str.length > 4);
            } else {
              // Plain text parser - split by commas, semicolons, or lines
              terms = text
                .split(/[\n\r,;:]+/)
                .map(str => str.trim().replace(/^['"-]+|['"-]+$/g, ""))
                .filter(str => str.length > 2);
            }

            // Exclude common file header lines if relevant
            terms = terms.filter(t => !/^(keyword|volume|difficulty|cpc|search terms|clicks)$/i.test(t));

            if (terms.length === 0) {
              setError("No valid keyword strings detected in text/CSV file.");
            } else {
              setTempKeywords(terms);
              setSuccessCount(terms.length);
            }
          } catch (parseErr: any) {
            setError("Error parsing file structure: " + parseErr.message);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      setError("Failed to digest uploaded file: " + err.message);
      setLoading(false);
    }
  };

  const handleAppendKeywords = () => {
    if (tempKeywords.length > 0) {
      onKeywordsExtracted(tempKeywords);
      setSuccessCount(null);
      setTempKeywords([]);
    }
  };

  return (
    <div className="bg-[#16191f] border border-slate-800 rounded-xl p-4.5 space-y-4 shadow-sm" id="smart-upload-hub">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-500 font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Smart Keyword Ingest
        </h4>
        <span className="text-[9px] font-mono text-slate-500">Multimodal Tool</span>
      </div>

      <p className="text-[11px] text-slate-400 leading-normal">
        Upload <strong>CSV, Excel sheets, text briefs,</strong> or <strong>screenshots/photos</strong> of competitor keywords. Gemini automatically extracts search queries!
      </p>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          dragActive 
            ? "border-cyan-500 bg-cyan-950/15" 
            : "border-slate-800 hover:border-slate-700 bg-[#0f1115]/30 hover:bg-[#0f1115]/60"
        }`}
        id="file-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          id="seo-file-picker"
          onChange={handleFileInput}
          accept="image/*,.txt,.csv,.tsv"
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-2.5">
            <RefreshCw className="w-6 h-6 text-cyan-405 animate-spin mb-2" />
            <span className="text-[10px] font-mono text-slate-400">Gemini OCR & Parsing Active...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <Upload className="w-5 h-5 text-slate-500" />
              <ImageIcon className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-300 font-medium">Drag file here or click to browse</p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">Supports CSV, Text, PNG, JPG, WebP</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="bg-rose-950/15 border border-rose-500/20 text-rose-400 p-2.5 rounded-lg text-[10px] flex items-start gap-1.5" id="upload-hub-error">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successCount !== null && successCount > 0 && (
        <div className="bg-cyan-950/20 border border-cyan-800/40 p-3 rounded-lg text-xs space-y-2.5 animate-in fade-in" id="upload-success-panel">
          <div className="flex items-start gap-1.5 text-cyan-400">
            <Check className="w-4 h-4 shrink-0" />
            <span className="font-semibold block leading-tight">
              Identified {successCount} keywords/queries!
            </span>
          </div>

          <div className="max-h-24 overflow-y-auto bg-[#0f1115] border border-slate-800 rounded p-1.5 text-[10px] text-slate-350 font-mono space-y-0.5 divide-y divide-slate-900">
            {tempKeywords.slice(0, 15).map((term, i) => (
              <div key={i} className="py-0.5 truncate">{term}</div>
            ))}
            {tempKeywords.length > 15 && (
              <div className="text-[9px] text-slate-500 text-center pt-1 font-sans">
                + {tempKeywords.length - 15} more terms...
              </div>
            )}
          </div>

          <button
            onClick={handleAppendKeywords}
            className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
            id="inject-keywords-btn"
          >
            <ThumbsUp className="w-3 h-3" />
            Apply to Active Workspace
          </button>
        </div>
      )}
    </div>
  );
}
