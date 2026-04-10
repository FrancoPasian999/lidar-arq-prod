"use client";

import React from "react";
import { 
  FileUp, 
  File, 
  Trash2, 
  FolderPlus, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Clock,
  HardDrive
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useProject } from "@/context/ProjectContext";
import { toast } from "sonner";

export function IngestionTab() {
  const [files, setFiles] = React.useState<any[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [activeUploadName, setActiveUploadName] = React.useState("");
  const { selectedFile, setSelectedFile, activeProjectId } = useProject();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch initial files from backend
  React.useEffect(() => {
    if (activeProjectId) {
      fetchFiles();
    }
  }, [activeProjectId]);

  const fetchFiles = async () => {
    if (!activeProjectId) return;
    try {
      const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiurl}/projects/${activeProjectId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeProjectId) return;

    setIsUploading(true);
    setActiveUploadName(file.name);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress(30);
      const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiurl}/projects/${activeProjectId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          fetchFiles(); // Refresh list from server
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
    }
  };

  const handleRunProcess = async (fileName: string) => {
    if (!activeProjectId) return;
    setFiles(prev => prev.map(f => f.name === fileName ? { ...f, status: "waiting" } : f));
    
    try {
      const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiurl}/projects/${activeProjectId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: fileName }),
      });

      if (response.ok) {
        const { task_id } = await response.json();
        pollTaskStatus(task_id, fileName);
      }
    } catch (error) {
       console.error("Processing failed:", error);
       toast.error("Error al iniciar el procesamiento.");
       setFiles(prev => prev.map(f => f.name === fileName ? { ...f, status: "ready" } : f));
    }
  };

  const pollTaskStatus = async (taskId: string, fileName: string) => {
    try {
      const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiurl}/tasks/${taskId}`);
      const data = await response.json();
      if (data.status === "SUCCESS") {
        setFiles(prev => prev.map(f => f.name === fileName ? { ...f, status: "processed" } : f));
        toast.success(`Archivo ${fileName} procesado con éxito.`);
      } else if (data.status === "FAILURE") {
        setFiles(prev => prev.map(f => f.name === fileName ? { ...f, status: "ready" } : f));
        toast.error(`Error procesando ${fileName}`);
      } else {
        // Still processing or pending
        setTimeout(() => pollTaskStatus(taskId, fileName), 2000);
      }
    } catch (error) {
      console.error("Polling error:", error);
      // Wait and try again
      setTimeout(() => pollTaskStatus(taskId, fileName), 5000);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!activeProjectId) return;
    try {
      const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiurl}/projects/${activeProjectId}/files/${fileName}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        // Clear selection if the deleted file was the one currently selected
        if (selectedFile === fileName) {
          setSelectedFile(null);
        }
        toast.success(`Archivo ${fileName} y sus datos asociados han sido eliminados.`);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Error al eliminar el archivo.");
    }
  };


  return (
    <div className="flex-1 p-8 bg-zinc-900 overflow-auto">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleUpload}
        accept=".las,.laz"
      />
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Upload Zone */}
        <div className="md:col-span-2 space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 rounded-xl p-12 bg-zinc-950 flex flex-col items-center justify-center text-center hover:border-blue-500 transition-all cursor-pointer group shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform bg-opacity-50">
               <FileUp className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ingest LiDAR Data</h3>
            <p className="text-zinc-500 max-w-sm mb-6">
              Drag and drop your .las or .laz files here. Direct integration with cloud storage available.
            </p>
            <div className="flex gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold">SELECT FILES</Button>
              <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white font-bold">CLOUD IMPORT</Button>
            </div>
          </div>

          <Card className="border-zinc-800 bg-zinc-950 text-white shadow-xl">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                   <CardTitle className="text-lg">File Inventory</CardTitle>
                   <CardDescription className="text-zinc-500">Managing project-level assets.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
                   <FolderPlus size={18} />
                </Button>
             </CardHeader>
             <CardContent className="p-0">
                <ScrollArea className="h-64 px-6 pb-6">
                   <div className="space-y-3">
                      {files.length === 0 && (
                        <div className="p-12 text-center text-zinc-600 text-sm italic">
                          No files found in project repository.
                        </div>
                      )}
                      {files.map((file, i) => (
                        <div 
                           key={i} 
                           onClick={() => {
                             setSelectedFile(file.name);
                             toast.success(`Selected file: ${file.name}`);
                           }}
                           className={`flex items-center justify-between p-3 rounded-lg border transition cursor-pointer group ${
                             selectedFile === file.name 
                               ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_-5px_rgba(59,130,246,0.5)]' 
                               : 'border-zinc-800 bg-zinc-900 bg-opacity-30 hover:border-zinc-700'
                           }`}
                        >
                           <div className="flex items-center gap-4 min-w-0">
                              <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                 <File className="w-5 h-5 text-blue-400" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                 <span className="text-sm font-bold text-zinc-200 truncate pr-2">{file.name}</span>
                                 <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold tracking-tighter uppercase">
                                    <HardDrive size={10} />
                                    <span>{file.size}</span>
                                    <Separator orientation="vertical" className="h-2 bg-zinc-800" />
                                    <Clock size={10} />
                                    <span>{file.date}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              {file.status === "processed" && (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0 font-black shadow-[0_0_10px_-2px_rgba(34,197,94,0.3)]">PROCESSED</Badge>
                                  <Button 
                                    size="sm" 
                                    className="h-7 px-3 text-[10px] bg-green-600 hover:bg-green-700 text-white font-bold tracking-tighter flex items-center gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRunProcess(file.name);
                                    }}
                                  >
                                    <CheckCircle2 size={12} />
                                    RE-RUN
                                  </Button>
                                </div>
                              )}
                              {file.status === "ready" && (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 py-0 font-black">READY</Badge>
                                  <Button 
                                    size="sm" 
                                    className="h-7 px-3 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-tighter"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRunProcess(file.name);
                                    }}
                                  >
                                    RUN PROCESSOR
                                  </Button>
                                </div>
                              )}
                              {file.status === "waiting" && <Badge className="bg-zinc-800 text-zinc-500 px-2 py-0 border border-zinc-700 animate-pulse font-bold">PROCESSING</Badge>}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDelete(file.name)}
                                className="h-8 w-8 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                 <Trash2 size={14} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white">
                                 <MoreVertical size={14} />
                              </Button>
                           </div>
                        </div>
                      ))}
                   </div>
                </ScrollArea>
             </CardContent>
          </Card>
        </div>

        {/* Upload Status Card */}
        <div className="space-y-6">
           {isUploading ? (
             <Card className="border-orange-500/20 bg-zinc-950 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                <CardHeader className="pb-3 px-6 pt-6">
                   <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-500">Active Upload</CardTitle>
                      <Badge variant="outline" className="border-orange-500/50 text-orange-500 bg-orange-500/10 tracking-widest">In Progress</Badge>
                   </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                   <h4 className="text-base font-semibold mb-1 truncate">{activeUploadName}</h4>
                   <div className="flex justify-between text-xs text-zinc-500 mb-2">
                      <span>{uploadProgress}% Completed</span>
                      <span>1.2 MB/s</span>
                   </div>
                   <Progress value={uploadProgress} className="h-2 bg-zinc-800" indicatorClassName="bg-orange-500" />
                   <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-400 italic">
                      <AlertCircle size={10} className="text-orange-500" />
                      Do not close the session during large uploads.
                   </div>
                </CardContent>
             </Card>
           ) : (
             <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl flex flex-col items-center justify-center text-center opacity-50 grayscale">
                <HardDrive size={32} className="text-zinc-800 mb-4" />
                <span className="text-sm font-bold text-zinc-600 uppercase tracking-widest">No active uploads</span>
             </div>
           )}

           <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
              <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Storage Insights</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-300">Total Las files</span>
                    <Badge className="bg-blue-600 text-white px-1.5 py-0 font-bold">{files.filter(f => f.name.endsWith('.las')).length} Files</Badge>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-300">Total Laz files</span>
                    <Badge className="bg-blue-600 text-white px-1.5 py-0 font-bold">{files.filter(f => f.name.endsWith('.laz')).length} Files</Badge>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-300">Status</span>
                    <span className="text-xs font-bold text-green-500">SYNCED</span>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
