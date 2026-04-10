"use client";

import React from "react";
import { 
  Play, 
  Terminal, 
  Layers, 
  Trash2, 
  Settings2, 
  CheckCircle2, 
  Zap, 
  Cpu, 
  FileSearch,
  Maximize2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function ProcessingTab() {
  const [logs, setLogs] = React.useState<string[]>([
    "[SYSTEM] Environment ready. Python 3.11 detector active.",
    "[PDAL] Pipeline loaded from project_config.json",
    "[STATUS] Waiting for user trigger..."
  ]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const runPipeline = () => {
    setIsProcessing(true);
    setLogs(prev => [...prev, "[JOB] Starting Pre-processing pipeline...", "[CSF] Initializing Cloth Simulation Filter..."]);
    
    // Simulate real-time logs
    const mockLogs = [
      "[CSF] Ground extraction: 4,502,120 points identified.",
      "[SOR] Noise removal complete. 0.05% outliers removed.",
      "[FE] Feature engineering: Z-elevation feature map generated.",
      "[IO] Writing processed LAS to projects/1/processed/scan_ground.las",
      "[SYSTEM] Pipeline finished successfully in 45.2s"
    ];

    let i = 0;
    const interval = setInterval(() => {
       if (i < mockLogs.length) {
          setLogs(prev => [...prev, mockLogs[i]]);
          i++;
       } else {
          clearInterval(interval);
          setIsProcessing(false);
       }
    }, 1500);
  };

  React.useEffect(() => {
    if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-1 p-8 bg-zinc-900 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Processing Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="border-zinc-800 bg-zinc-950 text-white shadow-xl group hover:border-blue-500/50 transition">
              <CardHeader className="pb-3">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                       <Layers size={18} />
                    </div>
                    <div>
                       <CardTitle className="text-base">Ground Extraction</CardTitle>
                       <CardDescription className="text-zinc-500 text-xs tracking-tighter">CSF (Cloth Simulation Filter)</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pb-2">
                 <p className="text-xs text-zinc-400">Separates terrain from building structures automatically. High accuracy for flat areas.</p>
              </CardContent>
              <CardFooter className="pt-2">
                 <Badge variant="outline" className="text-[10px] border-zinc-800 px-1.5 py-0">ACCURACY: 98%</Badge>
              </CardFooter>
           </Card>

           <Card className="border-zinc-800 bg-zinc-950 text-white shadow-xl group hover:border-orange-500/50 transition">
              <CardHeader className="pb-3">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-orange-500/10 text-orange-500">
                       <Trash2 size={18} />
                    </div>
                    <div>
                       <CardTitle className="text-base">Noise Removal</CardTitle>
                       <CardDescription className="text-zinc-500 text-xs tracking-tighter">Statistical Outlier Removal (SOR)</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pb-2">
                 <p className="text-xs text-zinc-400">Removes ghost points and capture artifacts. Essential for architectural accuracy.</p>
              </CardContent>
              <CardFooter className="pt-2">
                 <Badge variant="outline" className="text-[10px] border-zinc-800 px-1.5 py-0">SENSITIVITY: 2.0σ</Badge>
              </CardFooter>
           </Card>

           <Card className="border-zinc-800 bg-zinc-950 text-white shadow-xl group hover:border-green-500/50 transition">
              <CardHeader className="pb-3">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-green-500/10 text-green-500">
                       <FileSearch size={18} />
                    </div>
                    <div>
                       <CardTitle className="text-base">Feature Engineering</CardTitle>
                       <CardDescription className="text-zinc-500 text-xs tracking-tighter">Height, Reflectivity, Intensity</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pb-2">
                 <p className="text-xs text-zinc-400">Generates synthetic channels to aid manual segmentation and AI classification.</p>
              </CardContent>
              <CardFooter className="pt-2">
                 <Badge variant="outline" className="text-[10px] border-zinc-800 px-1.5 py-0">+3 CHANNELS</Badge>
              </CardFooter>
           </Card>
        </div>

        {/* Console / Terminal */}
        <Card className="border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
           <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                 <Terminal size={14} className="text-zinc-400" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Python Worker Logs</span>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{isProcessing ? 'Processing' : 'Connected'}</span>
                 </div>
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
                    <Maximize2 size={12} />
                 </Button>
              </div>
           </div>
           
           <CardContent className="p-0">
              <div 
                ref={scrollRef}
                className="h-80 bg-black p-6 font-mono text-xs overflow-auto leading-relaxed scrollbar-hide"
              >
                 {logs.map((log, i) => (
                    <div key={i} className="flex gap-4 group">
                       <span className="text-zinc-700 min-w-[2rem] SELECT-NONE">{i + 1}</span>
                       <span className={log.includes('[SYSTEM]') ? 'text-blue-400' : log.includes('[JOB]') ? 'text-orange-400' : log.includes('[STATUS]') ? 'text-zinc-500 italic' : 'text-zinc-300'}>
                          {log}
                       </span>
                    </div>
                 ))}
                 {isProcessing && (
                   <div className="flex gap-4 mt-2">
                      <span className="text-zinc-700 min-w-[2rem]">_</span>
                      <span className="text-zinc-300 animate-pulse">Running PDAL Pipeline...</span>
                   </div>
                 )}
              </div>
           </CardContent>

           <CardFooter className="bg-zinc-900 border-t border-zinc-800 flex items-center justify-between p-4 px-6">
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-zinc-500" />
                    <span className="text-[10px] text-zinc-400">GPU: NVIDIA RTX 4070 Ti (Active)</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Zap size={14} className="text-zinc-500" />
                    <span className="text-[10px] text-zinc-400">RAM: 4.2GB / 32GB</span>
                 </div>
              </div>
              <div className="flex gap-3">
                 <Button variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white h-9 px-6 text-xs" disabled={isProcessing}>
                    Configure CLI
                 </Button>
                 <Button 
                   className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-8 text-xs font-bold shadow-lg shadow-orange-950/50 flex items-center gap-2"
                   onClick={runPipeline}
                   disabled={isProcessing}
                 >
                    <Play size={14} fill="currentColor" />
                    RUN PIPELINE
                 </Button>
              </div>
           </CardFooter>
        </Card>

      </div>
    </div>
  );
}
