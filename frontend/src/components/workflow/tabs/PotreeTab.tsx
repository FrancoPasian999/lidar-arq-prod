"use client";

import React from "react";
import { 
  Box, 
  Maximize2, 
  Settings2, 
  MousePointer2, 
  Target, 
  Layers, 
  Palette, 
  Eye, 
  Ruler, 
  Info,
  Trash2,
  Scissors,
  ArrowUpDown,
  Triangle,
  Square,
  Compass,
  Monitor,
  Image as ImageIcon,
  Sun,
  Moon,
  Cloud,
  ChevronRight,
  ChevronLeft,
  PanelRightClose,
  PanelRightOpen,
  Download,
  Upload,
  Play,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { useProject } from "@/context/ProjectContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function PotreeTab() {
  const [pointBudget, setPointBudget] = React.useState(0.5);
  const [fov, setFov] = React.useState(60);
  const [pointSize, setPointSize] = React.useState(1.0);
  const [edlEnabled, setEdlEnabled] = React.useState(true);
  const [edlRadius, setEdlRadius] = React.useState(1.2);
  const [edlStrength, setEdlStrength] = React.useState(0.5);
  const [viewerReady, setViewerReady] = React.useState(false);
  const [isEnsuringPotree, setIsEnsuringPotree] = React.useState(false);
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const [compassEnabled, setCompassEnabled] = React.useState(false);
  const toolboxRef = React.useRef<HTMLDivElement>(null);
  
  // Click outside to close toolbox menus
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolboxRef.current && !toolboxRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenu]);
  const [clipMode, setClipMode] = React.useState("disabled");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  
  const [classifications, setClassifications] = React.useState([
    { id: 1, label: "Suelo", color: "#eab308", active: true },
    { id: 2, label: "Vegetación", color: "#22c55e", active: true },
    { id: 4, label: "Edificación", color: "#ef4444", active: true }
  ]);

  // Scene settings
  const [navMode, setNavMode] = React.useState("orbit");
  const [projection, setProjection] = React.useState("perspective");
  const [colorMode, setColorMode] = React.useState("rgba");
  const [background, setBackground] = React.useState("gradient");
  const [splatQuality, setSplatQuality] = React.useState("hq");

  const { selectedFile, activeProjectId } = useProject();
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const sendMessage = (type: string, value: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type, value }, "*");
    }
  };

  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "VIEWER_READY") {
        console.log("Potree confirms: Ready");
        setViewerReady(true);
        
        if (selectedFile && activeProjectId) {
          try {
            const response = await fetch(`http://localhost:8000/projects/${activeProjectId}/config/${selectedFile}`);
            const config = await response.json();
            if (config && config.status !== "none") {
              sendMessage("APPLY_CONFIG", config);
            }
          } catch (e) {
            console.error("Error loading config:", e);
          }
        }
      }

      if (event.data?.type === "IFRAME_CLICK") {
        setActiveMenu(null);
      }
      
      if (event.data?.type === "SAVE_RECIPE") {
        const recipe = event.data.value;
        if (activeProjectId && selectedFile) {
          try {
            await fetch(`http://localhost:8000/projects/${activeProjectId}/config/${selectedFile}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(recipe)
            });
            toast.success("Configuración guardada en el servidor.");
          } catch (e) {
            toast.error("Error al guardar la configuración en el servidor.");
          }
        }
      }

      if (event.data?.type === "SAVE_PLANES") {
        const planes = event.data.value;
        if (activeProjectId && selectedFile) {
          try {
            await fetch(`http://localhost:8000/projects/${activeProjectId}/planes/${selectedFile}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(planes)
            });
            toast.success("Listado de planos guardado en el servidor.");
          } catch (e) {
            toast.error("Error al guardar los planos en el servidor.");
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectedFile, activeProjectId]);

  const handleLoadSelected = async () => {
    if (!selectedFile || !activeProjectId) {
      toast.error(!selectedFile ? "No hay archivo seleccionado." : "No hay proyecto activo.");
      return;
    }

    setIsEnsuringPotree(true);
    toast.info(`Preparando datos Potree para ${selectedFile}...`);

    try {
      const response = await fetch(`http://localhost:8000/projects/${activeProjectId}/ensure-potree/${selectedFile}`);
      const data = await response.json();

      if (data.status === "ready") {
        sendMessage("LOAD_CLOUD", data.url);
        toast.success("Nube de puntos cargada correctamente.");
      } else if (data.status === "processing") {
        toast.info("Conversión en curso. Reintentando en 5 segundos...");
        setTimeout(handleLoadSelected, 5000);
      }
    } catch (error) {
      console.error("Error loading point cloud:", error);
      setIsEnsuringPotree(false);
    } finally {
      if (!isEnsuringPotree) setIsEnsuringPotree(false);
    }
  };

  // Auto-load point cloud when everything is ready
  React.useEffect(() => {
    if (viewerReady && selectedFile && activeProjectId && !isEnsuringPotree) {
      console.log("Auto-loading selected file:", selectedFile);
      handleLoadSelected();
    }
  }, [viewerReady, selectedFile, activeProjectId]);


  const toggleClassification = (id: number) => {
    setClassifications(prev => prev.map(c => {
      if (c.id === id) {
        const next = !c.active;
        sendMessage("SET_CLASSIFICATION_VISIBILITY", { id, visible: next });
        return { ...c, active: next };
      }
      return c;
    }));
  };

  const tools: Record<string, { id: string, label: string, icon: any, action: () => void, variant?: string }[]> = {
    selection: [
      { id: 'pointer', label: 'Puntero', icon: MousePointer2, action: () => sendMessage("RESET_TOOLS", null) },
      { id: 'reset', label: 'Limpiar Todo', icon: Trash2, action: () => sendMessage("RESET_TOOLS", null), variant: 'danger' },
    ],
    measurements: [
      { id: 'dist', label: 'Distancia', icon: Ruler, action: () => sendMessage("MEASURE_DISTANCE", null) },
      { id: 'height', label: 'Altura', icon: ArrowUpDown, action: () => sendMessage("MEASURE_HEIGHT", null) },
      { id: 'angle', label: 'Ángulo', icon: Triangle, action: () => sendMessage("MEASURE_ANGLE", null) },
      { id: 'area', label: 'Área', icon: Square, action: () => sendMessage("MEASURE_AREA", null) },
      { id: 'vol', label: 'Volumen', icon: Box, action: () => sendMessage("MEASURE_VOLUME", null) },
    ],
    clipping: [
      { id: 'volume', label: 'Volume Clip', icon: Box, action: () => sendMessage("CLIP_VOLUME", null) },
      { id: 'polygon', label: 'Polígono Clip', icon: Triangle, action: () => sendMessage("CLIP_POLYGON", null) },
      { id: 'none', label: 'Ver Todo', icon: Eye, action: () => { setClipMode('none'); sendMessage("SET_CLIP_MODE", "none"); }, variant: clipMode === 'none' ? 'active' : 'default' },
      { id: 'inside', label: 'Modo Interior', icon: Target, action: () => { setClipMode('inside'); sendMessage("SET_CLIP_MODE", "inside"); }, variant: clipMode === 'inside' ? 'active' : 'default' },
      { id: 'outside', label: 'Modo Exterior', icon: Scissors, action: () => { setClipMode('outside'); sendMessage("SET_CLIP_MODE", "outside"); }, variant: clipMode === 'outside' ? 'active' : 'default' },
      { id: 'reset_clip', label: 'Eliminar Recortes', icon: Trash2, action: () => { setClipMode('none'); sendMessage("RESET_TOOLS", null); } },
    ],
    segmentation: [
      { id: 'segment', label: 'Segmentar', icon: Target, action: () => sendMessage("START_SEGMENTATION", null) },
      { id: 'planos', label: 'Planos', icon: Layers, action: () => sendMessage("START_PLANES", null) },
      { id: 'screenshot', label: 'Screenshot', icon: ImageIcon, action: () => sendMessage("TAKE_SCREENSHOT", null) },
    ]
  };

  const MemoIframe = React.useMemo(() => (
    <iframe 
      ref={iframeRef}
      src="/potree/dist/index.html" 
      className="w-full h-full border-none"
      title="Potree Viewer"
    />
  ), []);

  return (
    <div className="flex-1 h-full flex flex-col bg-black overflow-hidden relative font-sans text-white">
      
      {/* 3D Viewer Container */}
      <div className="flex-1 relative group bg-zinc-950">
         {MemoIframe}

         {/* Left Side: Modern Toolbox Sidebar */}
         <div 
            ref={toolboxRef}
            className="absolute top-6 left-6 z-30 flex flex-row gap-2 h-auto"
          >
            {/* Main Icon Column */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex flex-col gap-1.5 shadow-2xl">
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveMenu(activeMenu === 'selection' ? null : 'selection')}
                className={`h-11 w-11 rounded-xl transition-all ${activeMenu === 'selection' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
               >
                  <MousePointer2 size={20} />
               </Button>
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveMenu(activeMenu === 'measurements' ? null : 'measurements')}
                className={`h-11 w-11 rounded-xl transition-all ${activeMenu === 'measurements' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
               >
                  <Ruler size={20} />
               </Button>
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveMenu(activeMenu === 'clipping' ? null : 'clipping')}
                className={`h-11 w-11 rounded-xl transition-all ${activeMenu === 'clipping' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
               >
                  <Scissors size={20} />
               </Button>
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveMenu(activeMenu === 'segmentation' ? null : 'segmentation')}
                className={`h-11 w-11 rounded-xl transition-all ${activeMenu === 'segmentation' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
               >
                  <Layers size={20} />
               </Button>
            </div>

            {/* Expanded Menu Detail */}
            <AnimatePresence>
               {activeMenu && (
                 <motion.div 
                   initial={{ opacity: 0, x: -20, scale: 0.95 }}
                   animate={{ opacity: 1, x: 0, scale: 1 }}
                   exit={{ opacity: 0, x: -20, scale: 0.95 }}
                   className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-1 min-w-[180px]"
                 >
                    <div className="px-2 pb-2 flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {activeMenu === 'selection' ? 'Selección' : activeMenu === 'measurements' ? 'Mediciones' : activeMenu === 'clipping' ? 'Recortes' : 'Segmentación'}
                       </span>
                    </div>
                    {tools[activeMenu as keyof typeof tools].map((tool) => (
                       <Button 
                        key={tool.id}
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          tool.action();
                          setActiveMenu(null);
                        }}
                        className={`justify-start gap-3 h-10 px-3 rounded-lg text-xs font-bold transition-all 
                          ${tool.variant === 'danger' ? 'text-orange-500 hover:bg-orange-500/10 hover:text-orange-400' : 
                            tool.variant === 'active' ? 'bg-blue-600 text-white shadow-lg' : 
                            'text-zinc-300 hover:bg-white/10 hover:text-white'}`}
                       >
                          <tool.icon size={16} />
                          {tool.label}
                       </Button>
                    ))}
                 </motion.div>
               )}
            </AnimatePresence>
         </div>

         {/* Right Side: Enhanced Properties Sidebar */}
         <div className="absolute top-6 right-6 bottom-6 z-20 flex pointer-events-none items-start">
            {/* Toggle Button */}
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mt-6 -mr-4 h-11 w-11 rounded-xl bg-zinc-900 shadow-2xl border border-white/10 text-white z-30 pointer-events-auto hover:bg-zinc-800 transition-all border-r-0 rounded-r-none flex items-center justify-center p-0"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSidebarOpen ? 'open' : 'closed'}
                  initial={{ opacity: 0, rotate: isSidebarOpen ? 0 : 180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: isSidebarOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  {isSidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </motion.div>
              </AnimatePresence>
            </Button>

            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="h-full flex flex-col pointer-events-auto w-[320px]"
                >
                  <ScrollArea className="flex-1 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-3xl rounded-l-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="p-6 flex flex-col gap-8 pb-20">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Scene Explorer</span>
                            </div>
                            <Settings2 size={14} className="text-white/20" />
                        </div>

                        {/* 1 & 2. Budget & Point Size */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                              <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                                  <Layers size={12} className="text-blue-500" /> Presupuesto de Puntos
                              </Label>
                              <div className="space-y-3">
                                  <div className="flex justify-between text-[10px] items-end">
                                    <span className="text-white/30">Límite de Resolución</span>
                                    <span className="text-blue-400 font-bold font-mono">{pointBudget}M Pts</span>
                                  </div>
                                  <Slider 
                                    value={[pointBudget]} 
                                    min={0}
                                    max={10} 
                                    step={0.5} 
                                    onValueChange={(val: any) => {
                                      const v = Array.isArray(val) ? val[0] : val;
                                      setPointBudget(v);
                                      sendMessage("SET_POINT_BUDGET", v);
                                    }}
                                  />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                                  Tamaño de Punto
                              </Label>
                              <div className="space-y-3">
                                  <div className="flex justify-between text-[10px] items-end">
                                    <span className="text-white/30">Grosor de Vóxel</span>
                                    <span className="text-blue-400 font-bold font-mono">{pointSize.toFixed(1)}px</span>
                                  </div>
                                  <Slider 
                                    value={[pointSize]} 
                                    min={0.1}
                                    max={5} 
                                    step={0.1} 
                                    onValueChange={(val: any) => {
                                      const v = Array.isArray(val) ? val[0] : val;
                                      setPointSize(v);
                                      sendMessage("SET_POINT_SIZE", v);
                                    }}
                                  />
                              </div>
                            </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* 3. Visualización */}
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                              <Palette size={12} className="text-blue-500" /> Visualización
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'rgba', label: 'RGB Real' },
                                { id: 'elevation', label: 'Elevación' },
                                { id: 'intensity_gradient', label: 'Intensidad' },
                                { id: 'classification', label: 'Clasificación' }
                              ].map((c) => (
                                <Button 
                                  key={c.id}
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => { setColorMode(c.id); sendMessage("SET_COLOR_MODE", c.id); }}
                                  className={`h-9 justify-start px-3 rounded-xl border border-transparent text-[9px] font-bold ${colorMode === c.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                                >
                                  {c.label}
                                </Button>
                              ))}
                          </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* 4. Splat Quality */}
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                              <Layers size={12} className="text-blue-500" /> Splat Quality
                          </Label>
                          <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSplatQuality('standard'); sendMessage("SET_SPLAT_QUALITY", 'standard'); }}
                                className={`flex-1 h-9 rounded-xl border border-transparent text-[9px] font-black ${splatQuality === 'standard' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                              >
                                ESTÁNDAR
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSplatQuality('hq'); sendMessage("SET_SPLAT_QUALITY", 'hq'); }}
                                className={`flex-1 h-9 rounded-xl border border-transparent text-[9px] font-black ${splatQuality === 'hq' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                              >
                                HIGH QUALITY
                              </Button>
                          </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* 5. Proyección */}
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                              <Monitor size={12} className="text-blue-500" /> Proyección
                          </Label>
                          <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setProjection('perspective'); sendMessage("SET_PROJECTION", 'perspective'); }}
                                className={`flex-1 h-9 rounded-xl border border-transparent text-[9px] font-black ${projection === 'perspective' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500'}`}
                              >
                                PERSPECTIVA
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { 
                                  setSplatQuality('standard'); 
                                  sendMessage("SET_SPLAT_QUALITY", 'standard');
                                  setProjection('orthographic'); 
                                  sendMessage("SET_PROJECTION", 'orthographic'); 
                                }}
                                className={`flex-1 h-9 rounded-xl border border-transparent text-[9px] font-black ${projection === 'orthographic' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500'}`}
                              >
                                ORTOGRÁFICA
                              </Button>
                          </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* 6. Fondo */}
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                              <ImageIcon size={12} className="text-blue-500" /> Fondo
                          </Label>
                          <div className="grid grid-cols-4 gap-2">
                              {[
                                { id: 'skybox', icon: Cloud },
                                { id: 'gradient', icon: Sun },
                                { id: 'black', icon: Moon },
                                { id: 'white', icon: Sun }
                              ].map((b) => (
                                <Button 
                                  key={b.id}
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => { setBackground(b.id); sendMessage("SET_BACKGROUND", b.id); }}
                                  className={`h-10 w-full rounded-xl border border-transparent ${background === b.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                                >
                                  <b.icon size={16} />
                                </Button>
                              ))}
                          </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* 7. Renderizado (EDL) */}
                        <div className="space-y-6">
                            <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                              <Eye size={12} className="text-blue-500" /> Renderizado (EDL)
                            </Label>
                            
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/[0.08] transition-all cursor-pointer" onClick={() => {
                              const next = !edlEnabled;
                              setEdlEnabled(next);
                              sendMessage("SET_EDL_ENABLED", next);
                            }}>
                              <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white">Eye Dome Lighting</span>
                                  <span className="text-[9px] text-white/30">Mejora el contraste visual</span>
                              </div>
                              <div className={`w-8 h-4 rounded-full p-1 transition-all ${edlEnabled ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                                  <div className={`h-full aspect-square bg-white rounded-full transition-all ${edlEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                            </div>

                            {edlEnabled && (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="space-y-3">
                                    <span className="text-[9px] font-bold text-white/30 uppercase text-xs">Radio EDL</span>
                                    <Slider 
                                      value={[edlRadius]} 
                                      min={0}
                                      max={4} 
                                      step={0.1} 
                                      onValueChange={(val: any) => {
                                          const v = Array.isArray(val) ? val[0] : val;
                                          setEdlRadius(v);
                                          sendMessage("SET_EDL_RADIUS", v);
                                      }}
                                    />
                                  </div>
                              </div>
                            )}
                        </div>

                        <Separator className="bg-white/5" />

                        {/* 8. Navegación */}
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                              <Compass size={12} className="text-blue-500" /> Navegación
                          </Label>
                          <div className="grid grid-cols-5 gap-1.5">
                              {[
                                { id: 'left', label: 'Left', icon: ChevronRight },
                                { id: 'right', label: 'Right', icon: ChevronRight },
                                { id: 'front', label: 'Front', icon: Target },
                                { id: 'top', label: 'Top', icon: Download },
                                { id: 'back', label: 'Back', icon: ChevronRight }
                              ].map((m) => (
                                <Button 
                                  key={m.id}
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => sendMessage("SET_VIEW", m.id)}
                                  className="flex-col h-14 gap-1 rounded-xl border border-transparent bg-white/5 text-zinc-400 hover:bg-blue-600 hover:text-white transition-all"
                                >
                                  <m.icon size={14} className={m.id === 'left' ? 'rotate-180' : m.id === 'top' ? 'rotate-180' : ''} />
                                  <span className="text-[8px] font-black uppercase tracking-tighter">{m.label}</span>
                                </Button>
                              ))}
                          </div>

                          {/* Toggle Brújula */}
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/[0.08] transition-all cursor-pointer mt-4" onClick={() => {
                              const next = !compassEnabled;
                              setCompassEnabled(next);
                              sendMessage("SET_COMPASS_ENABLED", next);
                            }}>
                              <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white">Mostrar Brújula</span>
                                  <span className="text-[9px] text-white/30">Widget de orientación cardinal</span>
                              </div>
                              <div className={`w-8 h-4 rounded-full p-1 transition-all ${compassEnabled ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                                  <div className={`h-full aspect-square bg-white rounded-full transition-all ${compassEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                          </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* 9. Clasificaciones */}
                        <div className="space-y-5">
                            <Label className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                              <Palette size={12} className="text-blue-500" /> Clasificaciones
                            </Label>
                            
                            <div className="grid grid-cols-1 gap-2">
                              {classifications.map((cls) => (
                                  <div 
                                    key={cls.id} 
                                    onClick={() => toggleClassification(cls.id)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all border border-transparent hover:border-white/5 group cursor-pointer ${cls.active ? 'bg-white/5 hover:bg-white/10' : 'bg-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: cls.color }} />
                                        <span className={`text-[11px] font-bold ${cls.active ? 'text-white/80' : 'text-white/40 line-through'}`}>{cls.label}</span>
                                    </div>
                                    <div className={`text-[9px] font-black px-2 py-0.5 rounded-md transition-all ${cls.active ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-600 bg-zinc-800'}`}>
                                        {cls.active ? 'VISIBLE' : 'OCULTO'}
                                    </div>
                                  </div>
                              ))}
                            </div>
                        </div>
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
         </div>

         {/* Bottom Action Bar (Left - Primary Actions) */}
         <div className="absolute bottom-6 left-6 z-40 flex items-center gap-3">
            <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/10 p-2.5 rounded-[2rem] flex items-center gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
               <Button 
                 onClick={() => sendMessage("EXPORT_VOLUME", null)}
                 className="bg-green-600 hover:bg-green-500 text-white font-black text-[11px] h-12 px-6 rounded-3xl gap-2 shadow-xl shadow-green-900/40 transition-all active:scale-95"
               >
                 <Download size={18} />
                 EXPORTAR VOLUMEN
               </Button>
               
               <Separator orientation="vertical" className="h-6 bg-white/10 mx-1" />
               
               <div className="px-4 flex items-center gap-3">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Archivo Activo</span>
                     <span className="text-[10px] font-bold text-white/70 max-w-[120px] truncate">
                        {selectedFile || "Ningún archivo"}
                     </span>
                  </div>
                  {selectedFile && (
                    <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  )}
               </div>
            </div>
         </div>

         {/* Loading / Empty State Overlay */}
         {!viewerReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-md pointer-events-none z-50 animate-in fade-in duration-700">
               <div className="w-12 h-12 rounded-full border-2 border-t-blue-500 border-white/5 animate-spin mb-4" />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Sincronizando Visor...</span>
            </div>
         )}

      </div>
    </div>
  );
}
