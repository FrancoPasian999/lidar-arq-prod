"use client";

import React, { useRef, useEffect, useState } from "react";
import { 
  Scissors, 
  Download, 
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RefreshCcw,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useProject } from "@/context/ProjectContext";
import { toast } from "sonner";

export function CadTab() {
  const { activeProjectId, selectedFile } = useProject();
  const [planes, setPlanes] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thickness, setThickness] = useState(0.05);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load planes configuration for this project/file
  const loadPlanes = async () => {
    if (!activeProjectId || !selectedFile) return;
    try {
      const response = await fetch(`http://localhost:8000/projects/${activeProjectId}/planes/${selectedFile}`);
      const data = await response.json();
      setPlanes(data);
      if (data.length > 0) {
        setCurrentIndex(0);
        setThickness(data[0].thickness || 0.05);
      }
    } catch (e) {
      console.error("Error loading planes:", e);
    }
  };

  useEffect(() => {
    loadPlanes();
  }, [activeProjectId, selectedFile]);

  const generateSections = async () => {
    if (!activeProjectId || !selectedFile || planes.length === 0) {
      toast.error("No hay planos cargados para procesar.");
      return;
    }

    setIsGenerating(true);
    const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${apiurl}/projects/${activeProjectId}/generate-sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile,
          planes: planes,
          thickness_override: thickness
        })
      });
      
      const data = await response.json();
      if (data.status === "success") {
        setSections(data.sections);
        toast.success(`Se generaron ${data.sections.length} secciones correctamente.`);
      } else {
        toast.error("Error al generar secciones.");
      }
    } catch (e) {
      console.error("Section generation error:", e);
      toast.error("Error de conexión con el servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Render Section on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sections.length === 0 || !sections[currentIndex]) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = sections[currentIndex].points;
    const width = canvas.width;
    const height = canvas.height;

    // Clear background (White)
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    if (points.length === 0) return;

    // Find bounds for normalization
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(([x, y]: number[]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const padding = 40;
    
    // Maintain aspect ratio
    const scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY);
    const offsetX = (width - rangeX * scale) / 2 - minX * scale;
    const offsetY = (height - rangeY * scale) / 2 - minY * scale;

    // Draw points (Black)
    ctx.fillStyle = "#000000";
    points.forEach(([x, y]: number[]) => {
      const px = x * scale + offsetX;
      const py = y * scale + offsetY;
      ctx.fillRect(px, py, 1, 1);
    });

    // Draw plane name
    ctx.font = "bold 12px Inter";
    ctx.fillStyle = "#3b82f6";
    ctx.fillText(`${sections[currentIndex].name} - ${points.length} pts`, 20, 30);

  }, [sections, currentIndex]);

  return (
    <div className="flex-1 p-8 bg-zinc-900 overflow-auto h-full flex flex-col">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 w-full">
        
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-6">
           <Card className="border-zinc-800 bg-zinc-950 text-white shadow-xl">
              <CardHeader className="pb-4 border-b border-white/5">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                       <Scissors size={20} />
                    </div>
                    <div>
                       <CardTitle className="text-lg">Generación de Planos</CardTitle>
                       <CardDescription className="text-zinc-500 text-xs">Cortes ortográficos del .LAS original.</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                 {/* Load / Generate Button */}
                 <div className="space-y-4">
                    <Button 
                      onClick={generateSections} 
                      disabled={isGenerating || planes.length === 0}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                       {isGenerating ? <Loader2 className="animate-spin" /> : <RefreshCcw size={18} />}
                       {isGenerating ? "GENERANDO..." : "GENERAR PLANOS TÉCNICOS"}
                    </Button>
                    <p className="text-[10px] text-zinc-500 text-center font-bold uppercase tracking-widest">
                       {planes.length} planos detectados en Potree
                    </p>
                 </div>

                 <div className="space-y-6">
                    {/* Plane Selection Slider */}
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Seleccionar Plano</Label>
                          <span className="text-blue-500 font-black text-sm">{planes[currentIndex]?.name || "-"}</span>
                       </div>
                       <Slider 
                         value={[currentIndex]} 
                         min={0} 
                         max={Math.max(0, planes.length - 1)} 
                         onValueChange={(val) => {
                           const v = Array.isArray(val) ? val[0] : val;
                           setCurrentIndex(v);
                         }}
                       />
                    </div>

                    {/* Thickness Override Slider */}
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Grosor de Corte (Thickness)</Label>
                          <span className="text-blue-500 font-black text-sm">{thickness.toFixed(2)}m</span>
                       </div>
                       <Slider 
                         value={[thickness]} 
                         min={0.01} 
                         max={1.0} 
                         step={0.01}
                         onValueChange={(val) => {
                           const v = Array.isArray(val) ? val[0] : val;
                           setThickness(v);
                         }}
                       />
                       <p className="text-[9px] text-zinc-600 font-medium">Re-generar después de cambiar para ver el efecto.</p>
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="bg-zinc-900/40 border-t border-white/5 py-4">
                 <Button variant="ghost" className="w-full text-zinc-500 hover:text-white gap-2 h-10 text-xs font-bold" onClick={loadPlanes}>
                    <RefreshCcw size={14} /> Recargar Planos del Proyecto
                 </Button>
              </CardFooter>
           </Card>

           <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex gap-4">
              <Layers className="text-blue-500 h-5 w-5 flex-shrink-0" />
              <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                 Esta herramienta utiliza el archivo LAS original con toda su densidad. Los planos generados representan cortes ortográficos precisos del terreno.
              </p>
           </div>
        </div>

        {/* Visualizer Area */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
           <Card className="flex-1 border-white/10 bg-white overflow-hidden shadow-2xl relative flex items-center justify-center p-0">
              {/* Canvas 2D */}
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={600} 
                className="w-full h-full cursor-crosshair"
              />
              
              {!sections[currentIndex] && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/20 backdrop-blur-sm z-10 pointer-events-none">
                    <Maximize2 className="text-zinc-400 w-12 h-12 mb-4 opacity-20" />
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">No se ha generado ninguna sección</span>
                    <p className="text-[10px] text-zinc-600 mt-2">Usa el botón azul para procesar los planos</p>
                 </div>
              )}

              {/* Toolbar Overlays */}
              {sections.length > 0 && (
                <div className="absolute bottom-6 right-6 flex gap-2">
                   <Button variant="secondary" className="bg-white/90 text-zinc-950 hover:bg-white shadow-xl h-10 px-4 rounded-xl border border-zinc-200 font-bold text-xs gap-2">
                      <Download size={16} /> Exportar DXF (Próximamente)
                   </Button>
                </div>
              )}
           </Card>
        </div>

      </div>
    </div>
  );
}
