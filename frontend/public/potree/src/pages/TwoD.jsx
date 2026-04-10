import { X, SquareDashedBottom, Layers, Ruler, PencilRuler, FileUp, Trash, Eraser, Undo, Redo, Hand, Pen } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { saveAs } from 'file-saver';

const SNAP_DISTANCE = 5;
const TOOLS = [
  { id: 'measure', icon: <Ruler />, name: 'Medir' },
  { id: 'line', icon: <PencilRuler />, name: 'Línea Recta' },
  { id: 'layer', icon: null, name: 'Alternar Capa' },
  { id: 'export', icon: <FileUp />, name: 'Exportar CAD' },
  { id: 'eraser', icon: <Eraser />, name: 'Seleccionar Líneas' },
  { id: 'delete', icon: <Trash />, name: 'Borrar Selección' },
  { id: 'undo', icon: <Undo />, name: 'Deshacer' },
  { id: 'redo', icon: <Redo />, name: 'Rehacer' },
  { id: 'pan', icon: <Hand />, name: 'Mover' },
];
const LAYERS = [
  { id: 'both', name: 'Ambos' },
  { id: 'drawing', name: 'Dibujo Base' },
  { id: 'lines', name: 'Líneas' },
];

const Toolbar = ({ tools, selectedTool, activeLayer, onToolClick }) => {
  const getLayerIcon = (layer) => {
    switch (layer) {
      case 'both':
        return <Layers size={20} />;
      case 'drawing':
        return <SquareDashedBottom size={20} />;
      case 'lines':
        return <Pen size={20} />;
      default:
        return <Layers size={20} />;
    }
  };

  return (
    <div className="w-20 bg-gray-800 text-white flex flex-col items-center p-2 space-y-4 shrink-0">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`p-2 rounded ${selectedTool === tool.id ? 'bg-blue-500' : 'hover:bg-gray-700'}`}
          onClick={() => onToolClick(tool.id)}
          aria-label={
            tool.id === 'layer'
              ? `Cambiar a ${LAYERS.find((l) => l.id === activeLayer)?.name || 'Ambos'}`
              : tool.name
          }
          title={
            tool.id === 'layer'
              ? `Capa actual: ${LAYERS.find((l) => l.id === activeLayer)?.name || 'Ambos'}`
              : tool.name
          }
        >
          {tool.id === 'layer' ? getLayerIcon(activeLayer) : tool.icon}
        </button>
      ))}
    </div>
  );
};

const TwoD = ({ setCurrentPage }) => {
  const [selectedTool, setSelectedTool] = useState(null);
  const [activeLayer, setActiveLayer] = useState('both');
  const [buildingImage, setBuildingImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const initialState = {
    lines: [],
    drawingLine: null,
    scale: 1,
    offset: { x: 0, y: 0 },
    snapPoint: null,
    selectedLines: new Set(),
    history: [],
    redoStack: [],
    isPanning: false,
    panStart: null,
  };

  const reducer = (state, action) => {
    switch (action.type) {
      case 'ADD_LINE':
        return {
          ...state,
          lines: [...state.lines, action.payload],
          drawingLine: null,
          snapPoint: null,
          history: [...state.history, { lines: state.lines, scale: state.scale, offset: state.offset, selectedLines: state.selectedLines }],
        };
      case 'SET_LINES':
        return {
          ...state,
          lines: action.payload,
          history: [...state.history, { lines: state.lines, scale: state.scale, offset: state.offset, selectedLines: state.selectedLines }],
        };
      case 'SET_DRAWING_LINE':
        return { ...state, drawingLine: action.payload };
      case 'SET_SNAP_POINT':
        return { ...state, snapPoint: action.payload };
      case 'SET_SCALE':
        return { ...state, scale: action.payload };
      case 'SET_OFFSET':
        return { ...state, offset: action.payload };
      case 'SET_SELECTED_LINES':
        return {
          ...state,
          selectedLines: action.payload,
          history: [...state.history, { lines: state.lines, scale: state.scale, offset: state.offset, selectedLines: state.selectedLines }],
        };
      case 'UNDO':
        if (state.history.length === 0) return state;
        const prev = state.history[state.history.length - 1];
        return {
          ...state,
          lines: prev.lines,
          scale: prev.scale,
          offset: prev.offset,
          selectedLines: prev.selectedLines || new Set(),
          history: state.history.slice(0, -1),
          redoStack: [{ lines: state.lines, scale: state.scale, offset: state.offset, selectedLines: state.selectedLines }, ...state.redoStack],
        };
      case 'REDO':
        if (state.redoStack.length === 0) return state;
        const next = state.redoStack[0];
        return {
          ...state,
          lines: next.lines,
          scale: next.scale,
          offset: next.offset,
          selectedLines: next.selectedLines || new Set(),
          redoStack: state.redoStack.slice(1),
          history: [...state.history, { lines: state.lines, scale: state.scale, offset: state.offset, selectedLines: state.selectedLines }],
        };
      case 'SET_PANNING':
        return { ...state, isPanning: action.payload.isPanning, panStart: action.payload.panStart };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const img = new Image();
    img.src = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&bg=FFFFFF';
    img.onload = () => setBuildingImage(img);
    img.onerror = () => console.warn('Failed to load background image');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_DRAWING_LINE', payload: null });
        dispatch({ type: 'SET_SNAP_POINT', payload: null });
      } else if (e.ctrlKey && e.key === 'z') {
        dispatch({ type: 'UNDO' });
      } else if (e.ctrlKey && e.key === 'y') {
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let timeout;
    const resizeCanvas = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (canvas && container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      }, 100);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(state.scale, state.scale);
      ctx.translate(-canvas.width / 2 + state.offset.x, -canvas.height / 2 + state.offset.y);

      if ((activeLayer === 'drawing' || activeLayer === 'both') && buildingImage) {
        const aspectRatio = buildingImage.width / buildingImage.height;
        const targetHeight = canvas.height * 0.8;
        const targetWidth = targetHeight * aspectRatio;
        ctx.drawImage(buildingImage, canvas.width / 2 - targetWidth / 2, canvas.height / 2 - targetHeight / 2, targetWidth, targetHeight);
      }

      if (activeLayer === 'lines' || activeLayer === 'both') {
        ctx.lineWidth = 2 / state.scale;
        state.lines.forEach((line, index) => {
          ctx.strokeStyle = state.selectedLines.has(index) ? '#FF0000' : '#000000';
          ctx.beginPath();
          ctx.moveTo(line.start.x, line.start.y);
          ctx.lineTo(line.end.x, line.end.y);
          ctx.stroke();
        });
      }

      if (state.drawingLine) {
        ctx.strokeStyle = selectedTool === 'measure' ? '#FF0000' : '#000000';
        ctx.lineWidth = 2 / state.scale;
        ctx.beginPath();
        ctx.moveTo(state.drawingLine.start.x, state.drawingLine.start.y);
        ctx.lineTo(state.drawingLine.end.x, state.drawingLine.end.y);
        ctx.stroke();
      }

      if (state.snapPoint && selectedTool === 'line') {
        ctx.beginPath();
        ctx.arc(state.snapPoint.x, state.snapPoint.y, 5 / state.scale, 0, Math.PI * 2);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, activeLayer, buildingImage, selectedTool]);

  const calculateDistance = (point1, point2) => {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
  };

  const findNearestSnapPoint = useCallback(
    (x, y) => {
      if (selectedTool !== 'line') return null;
      let nearest = null;
      let minDistance = SNAP_DISTANCE / state.scale;

      state.lines.forEach((line) => {
        ['start', 'end'].forEach((point) => {
          const dist = calculateDistance({ x, y }, line[point]);
          if (dist < minDistance) {
            minDistance = dist;
            nearest = line[point];
          }
        });
      });
      return nearest;
    },
    [selectedTool, state.lines, state.scale]
  );

  const handleCanvasClick = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvas.width / 2) / state.scale + canvas.width / 2 - state.offset.x;
      const y = (e.clientY - rect.top - canvas.height / 2) / state.scale + canvas.height / 2 - state.offset.y;

      if (selectedTool === 'line') {
        if (!state.drawingLine) {
          const startSnapPoint = findNearestSnapPoint(x, y);
          dispatch({ type: 'SET_DRAWING_LINE', payload: { start: startSnapPoint || { x, y }, end: { x, y } } });
          dispatch({
            type: 'SET_HISTORY',
            payload: [...state.history, { lines: state.lines, scale: state.scale, offset: state.offset, selectedLines: state.selectedLines }],
          });
        } else {
          const endSnapPoint = state.snapPoint || { x, y };
          dispatch({ type: 'ADD_LINE', payload: { start: state.drawingLine.start, end: endSnapPoint } });
        }
      } else if (selectedTool === 'measure') {
        if (!state.drawingLine) {
          dispatch({ type: 'SET_DRAWING_LINE', payload: { start: { x, y }, end: { x, y } } });
        } else {
          const distance = calculateDistance(state.drawingLine.start, state.drawingLine.end);
          alert(`Distancia: ${distance.toFixed(2)} unidades`);
          dispatch({ type: 'SET_DRAWING_LINE', payload: null });
          dispatch({ type: 'SET_SNAP_POINT', payload: null });
          setSelectedTool(null); // Deselect tool after measurement
        }
      } else if (selectedTool === 'eraser' && (activeLayer === 'lines' || activeLayer === 'both')) {
        const clickedLineIndex = state.lines.findIndex((line) => {
          const distToStart = calculateDistance({ x, y }, line.start);
          const distToEnd = calculateDistance({ x, y }, line.end);
          return distToStart < 15 / state.scale || distToEnd < 15 / state.scale;
        });
        if (clickedLineIndex !== -1) {
          const newSelected = new Set(state.selectedLines);
          if (newSelected.has(clickedLineIndex)) {
            newSelected.delete(clickedLineIndex);
          } else {
            newSelected.add(clickedLineIndex);
          }
          dispatch({ type: 'SET_SELECTED_LINES', payload: newSelected });
        }
      }
    },
    [selectedTool, state, activeLayer, findNearestSnapPoint]
  );

  const handleToolClick = useCallback(
    (toolId) => {
      if (toolId === 'undo') {
        dispatch({ type: 'UNDO' });
      } else if (toolId === 'redo') {
        dispatch({ type: 'REDO' });
      } else if (toolId === 'export') {
        let dxfContent = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
        state.lines.forEach((line) => {
          dxfContent += `0\nLINE\n8\n0\n10\n${line.start.x}\n20\n${line.start.y}\n30\n0\n11\n${line.end.x}\n21\n${line.end.y}\n31\n0\n`;
        });
        dxfContent += `0\nENDSEC\n0\nEOF`;
        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        saveAs(blob, 'drawing.dxf');
      } else if (toolId === 'delete') {
        if (state.selectedLines.size > 0) {
          const newLines = state.lines.filter((_, index) => !state.selectedLines.has(index));
          dispatch({ type: 'SET_LINES', payload: newLines });
          dispatch({ type: 'SET_SELECTED_LINES', payload: new Set() });
          setSelectedTool(null); // Deselect tool after deletion
        }
      } else if (toolId === 'layer') {
        const layerOrder = ['both', 'drawing', 'lines'];
        const currentIndex = layerOrder.indexOf(activeLayer);
        const nextIndex = (currentIndex + 1) % layerOrder.length;
        setActiveLayer(layerOrder[nextIndex]);
        setSelectedTool('layer');
      } else {
        setSelectedTool(toolId === selectedTool ? null : toolId);
      }
    },
    [selectedTool, activeLayer, state]
  );

  return (
    <div className="h-full w-full relative">
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
        }
      `}</style>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col z-50">
        <div className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg">
          <SquareDashedBottom size={20} /> 2D View
        </div>
      </div>
      <div className="absolute top-4 right-4 flex flex-col z-50">
        <button
          className="flex items-center gap-2 bg-gray-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          onClick={() => setCurrentPage?.('3d')}
          title="Close 2D View"
        >
          <X size={20} />
        </button>
      </div>
      <div className="h-full w-full flex">
        <Toolbar
          tools={TOOLS}
          selectedTool={selectedTool}
          activeLayer={activeLayer}
          onToolClick={handleToolClick}
        />
        <div ref={containerRef} className="flex-1 flex min-h-0 bg-gray-100">
          <canvas
            ref={canvasRef}
            className="flex-1"
            onClick={handleCanvasClick}
            onMouseDown={(e) =>
              dispatch({
                type: 'SET_PANNING',
                payload: { isPanning: selectedTool === 'pan', panStart: { x: e.clientX, y: e.clientY } },
              })
            }
            onMouseMove={(e) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const x = (e.clientX - rect.left - canvas.width / 2) / state.scale + canvas.width / 2 - state.offset.x;
              const y = (e.clientY - rect.top - canvas.height / 2) / state.scale + canvas.height / 2 - state.offset.y;

              if (state.isPanning && state.panStart) {
                const dx = (e.clientX - state.panStart.x) / state.scale;
                const dy = (e.clientY - state.panStart.y) / state.scale;
                dispatch({ type: 'SET_OFFSET', payload: { x: state.offset.x + dx, y: state.offset.y + dy } });
                dispatch({
                  type: 'SET_PANNING',
                  payload: { isPanning: true, panStart: { x: e.clientX, y: e.clientY } },
                });
              }

              if (state.drawingLine) {
                const newSnapPoint = findNearestSnapPoint(x, y);
                dispatch({ type: 'SET_SNAP_POINT', payload: newSnapPoint });
                dispatch({
                  type: 'SET_DRAWING_LINE',
                  payload: { ...state.drawingLine, end: newSnapPoint || { x, y } },
                });
              }
            }}
            onMouseUp={() => dispatch({ type: 'SET_PANNING', payload: { isPanning: false, panStart: null } })}
            onMouseLeave={() => dispatch({ type: 'SET_PANNING', payload: { isPanning: false, panStart: null } })}
            onWheel={(e) => {
              e.preventDefault();
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;
              const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
              const newScale = Math.min(Math.max(state.scale * zoomFactor, 0.1), 10);
              const newOffset = {
                x: state.offset.x - (mouseX - canvas.width / 2) * (zoomFactor - 1) / newScale,
                y: state.offset.y - (mouseY - canvas.height / 2) * (zoomFactor - 1) / newScale,
              };
              dispatch({ type: 'SET_SCALE', payload: newScale });
              dispatch({ type: 'SET_OFFSET', payload: newOffset });
              dispatch({
                type: 'SET_HISTORY',
                payload: [...state.history, { lines: state.lines, scale: state.scale, offset: state.offset, selectedLines: state.selectedLines }],
              });
            }}
          />
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          Loading...
        </div>
      )}
    </div>
  );
};

export default TwoD;