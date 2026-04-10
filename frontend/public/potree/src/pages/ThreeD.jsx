// FIXME: boton annotations - Indica que hay un problema o funcionalidad incompleta con el botón de anotaciones de Potree que necesita ser resuelto.

import React, { useEffect, useRef, useState } from 'react'; // Importa React y los hooks necesarios para manejar estado, efectos y referencias.
import { Upload, Download, Box } from "lucide-react"; // Importa iconos de lucide-react

// Componente principal para visualización 3D con Potree
const ThreeD = ({ setCurrentPage }) => {
  // Referencias para elementos del DOM y el visor de Potree
  const viewerRef = useRef(null); // Referencia al objeto Potree.Viewer para controlar el visor
  const renderAreaRef = useRef(null); // Referencia al contenedor DOM donde se renderiza la nube de puntos
  const sidebarRef = useRef(null); // Referencia al contenedor del sidebar de Potree

  // Estados para gestionar la interfaz y el proceso de carga
  const [uploading, setUploading] = useState(false); // Indica si se está subiendo un archivo
  const [message, setMessage] = useState(''); // Almacena mensajes temporales para mostrar al usuario
  const [isLoading, setIsLoading] = useState(false); // Controla la visibilidad de la pantalla de carga
  const [uploadProgress, setUploadProgress] = useState(0); // Seguimiento del progreso de la subida
  const [localPath, setLocalPath] = useState(''); // Ruta local del archivo original

  // Muestra un mensaje temporal al usuario y lo elimina después de un tiempo
  const showMessage = (msg, duration = 3000) => {
    setMessage(msg); // Establece el mensaje en el estado
    setTimeout(() => setMessage(''), duration); // Lo borra después de 'duration' milisegundos (por defecto 3 segundos)
  };

  // Limpia las nubes de puntos antiguas del árbol de la interfaz (jstree)
  const cleanupPointClouds = (callback) => {
    const viewer = viewerRef.current; // Obtiene el visor actual
    if (!viewer) { // Si no hay visor, ejecuta el callback y termina
      callback?.();
      return;
    }

    // Cuenta las nubes de puntos en el árbol de la interfaz
    const totalPointClouds = document.querySelector('#pointclouds .jstree-children')?.children.length || 0;
    console.log('Total point clouds found:', totalPointClouds); // Log para depuración

    if (totalPointClouds > 0) { // Si hay nubes de puntos
      const pointCloudList = document.querySelector('#pointclouds .jstree-children');
      if (pointCloudList && pointCloudList.children.length > 0) { // Verifica que la lista exista y tenga elementos
        const lastPointCloud = pointCloudList.lastElementChild; // Obtiene el último elemento
        console.log('Removing last point cloud item from #pointclouds'); // Log para depuración
        lastPointCloud.remove(); // Elimina el último elemento del DOM
      }
      showMessage('Old point clouds removed.'); // Notifica al usuario
    } else {
      showMessage('No point clouds to remove.'); // Notifica si no hay nada que limpiar
    }
    callback?.(); // Ejecuta el callback opcional
  };

  // Carga una nube de puntos en el visor y maneja la limpieza de la escena
  const loadPointCloudOnViewer = async (url, name = 'pointcloud', isInitialLoad = false) => {
    const viewer = viewerRef.current;
    if (!viewer) {
      showMessage("Viewer not initialized", 5000);
      return;
    }

    try {
      setIsLoading(true);
      
      // Limpiar nubes existentes si no es la carga inicial
      if (!isInitialLoad) {
        viewer.scene.pointclouds.forEach((pc) => viewer.scene.scenePointCloud.remove(pc));
        viewer.scene.pointclouds = [];
        // También limpiar el árbol de la interfaz si existe
        const pointCloudList = document.querySelector('#pointclouds .jstree-children');
        if (pointCloudList) {
          while (pointCloudList.children.length > 0) {
            pointCloudList.children[0].remove();
          }
        }
      }

      console.log(`[POTREE] Loading cloud: ${name} from ${url}`);
      const e = await Potree.loadPointCloud(url, name);
      const pointcloud = e.pointcloud;
      const material = pointcloud.material;
      
      material.size = 1;
      material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
      material.shape = Potree.PointShape.SQUARE;
      material.activeAttributeName = "rgba";
      
      // Ensure classification color mapping is ready
      if (typeof material.recomputeClassification === "function") {
          material.recomputeClassification();
      }

      viewer.scene.addPointCloud(pointcloud);
      
      // Ajustar cámara
      if (isInitialLoad) {
        viewer.fitToScreen();
      } else {
        // Si ya hay una escena, quizás no queremos mover la cámara bruscamente
        // pero para nubes nuevas suele ser mejor re-centrar
        viewer.fitToScreen();
      }

      showMessage(`Nube '${name}' cargada correctamente.`);
      setIsLoading(false);
    } catch (error) {
      console.error('[POTREE] Error loading point cloud:', error);
      showMessage(`Error al cargar la nube: ${error.message}`, 5000);
      setIsLoading(false);
    }
  };

  // Maneja la subida de un nuevo archivo al servidor
  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0]; // Obtiene el archivo seleccionado
    if (!selectedFile) return; // Termina si no hay archivo

    setMessage('Uploading file...'); // Notifica que la subida ha comenzado
    setUploading(true); // Activa el estado de subida
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('originalPath', localPath); // Enviar la ruta local capturada

      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('POST', 'http://localhost:5173/upload');
        xhr.send(formData);
      });

      await uploadPromise;

      showMessage('File uploaded successfully. Cleaning up...');
      if (viewerRef.current) {
        await new Promise((resolve) => cleanupPointClouds(resolve));
        loadPointCloudOnViewer('/pointcloud/metadata.json');
      }
    } catch (error) {
      showMessage(`Error during upload: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Inicializa el visor de Potree con configuraciones básicas
  const initializeViewer = (renderArea) => {
    const viewer = new Potree.Viewer(renderArea); // Crea una nueva instancia del visor
    viewer.setEDLEnabled(true); // Activa el Eye-Dome Lighting para mejor contraste
    viewer.setFOV(60); // Establece el campo de visión en 60 grados
    viewer.useHQ = true; // Usa alta calidad en el renderizado
    viewer.setPointBudget(1_000_000); // Limita el número de puntos renderizados para optimizar rendimiento
    viewer.setMinNodeSize(30); // Tamaño mínimo de los nodos del octree
    viewer.useDEMCollisions = true; // Activa colisiones con el modelo de elevación digital
    viewer.useEDL = true; // Activa EDL (redundante con setEDLEnabled, revisar)
    viewer.getControls().enabled = true; // Habilita los controles de navegación
    viewer.setDescription(""); // Establece una descripción vacía
    return viewer; // Devuelve el visor configurado
  };

  // Configura la interfaz gráfica de usuario (GUI) de Potree
  const setupGUI = (viewer) => {
    if (sidebarRef.current) sidebarRef.current.innerHTML = ""; // Limpia el contenedor del sidebar
    viewer.loadGUI(() => { // Carga la GUI de Potree
      viewer.setLanguage('en'); // Establece el idioma en inglés
      // Muestra los menús de apariencia, herramientas y recorte en el sidebar
      const menuAppearance = sidebarRef.current.querySelector("#menu_appearance");
      const menuTools = sidebarRef.current.querySelector("#menu_tools");
      const menuClipping = sidebarRef.current.querySelector("#menu_clipping");
      if (menuAppearance) menuAppearance.nextElementSibling.style.display = "block";
      if (menuTools) menuTools.nextElementSibling.style.display = "block";
      if (menuClipping) menuClipping.nextElementSibling.style.display = "block";
    });
  };

  // Configura un observador para redimensionar el visor automáticamente
  const setupResizeObserver = (viewer, setIsLoading) => {
    const resizeObserver = new ResizeObserver(() => { // Crea un observador de tamaño
      setIsLoading(true); // Muestra la pantalla de carga durante el redimensionamiento
      clearTimeout(window.resizeTimeout); // Limpia cualquier timeout anterior
      window.resizeTimeout = setTimeout(() => { // Debounce manual para evitar renders excesivos
        setIsLoading(false); // Oculta la pantalla de carga
        viewer.fitToScreen(); // Ajusta la cámara al nuevo tamaño
      }, 100); // Espera 100ms antes de ajustar
    });
    resizeObserver.observe(renderAreaRef.current); // Observa el contenedor de renderizado
  };

  // Efecto para configurar el visor y cargar la nube inicial
  useEffect(() => {
    if (!renderAreaRef.current || viewerRef.current) return; // Evita ejecutar si el área no está lista o el visor ya existe

    const viewer = initializeViewer(renderAreaRef.current); // Inicializa el visor
    viewerRef.current = viewer; // Almacena el visor en la referencia
    window.viewer = viewer; // Hace el visor accesible globalmente (necesario para algunas herramientas de Potree)

    setupGUI(viewer); // Configura la GUI

    // loadPointCloudOnViewer('./pointcloud/metadata.json', 'Initial Cloud', true); // Removed hardcoded load to prevent 404

    viewer.renderer.render(viewer.scene.scene, viewer.scene.getActiveCamera()); // Forzar renderizado inicial

    setupResizeObserver(viewer, setIsLoading); // Configura el observador de redimensionamiento

    // Communication Bridge: Listen for messages from parent
    const handleMessage = (event) => {
      const { value } = event.data;
      const type = (event.data.type || "").trim();
      if (!viewerRef.current) return;

      console.log("[POTREE BRIDGE] Received:", type, value);
      
      switch(type) {
        case "SET_POINT_BUDGET":
          viewerRef.current.setPointBudget(value * 1_000_000);
          break;
        case "SET_FOV":
          viewerRef.current.setFOV(value);
          break;
        case "SET_POINT_SIZE":
          if (viewerRef.current.scene.pointclouds.length > 0) {
            viewerRef.current.scene.pointclouds.forEach(pc => {
              pc.material.size = value;
            });
          }
          break;
        case "SET_EDL_ENABLED":
          viewerRef.current.setEDLEnabled(value);
          break;
        case "SET_EDL_RADIUS":
          viewerRef.current.setEDLRadius(value);
          break;
        case "SET_EDL_STRENGTH":
          viewerRef.current.setEDLStrength(value);
          break;
        case "SET_COLOR_MODE":
          if (viewerRef.current.scene.pointclouds.length > 0) {
            viewerRef.current.scene.pointclouds.forEach(pc => {
              pc.material.activeAttributeName = value;
              if (value === "classification" && typeof pc.material.recomputeClassification === "function") {
                pc.material.recomputeClassification();
              }
            });
          }
          break;
        case "SET_BACKGROUND":
          viewerRef.current.setBackground(value); // Values: 'skybox', 'gradient', 'black', 'white'
          break;
        case "SET_NAVIGATION_MODE":
          switch(value) {
            case "orbit": viewerRef.current.setNavigationMode(Potree.OrbitControls); break;
            case "fly": viewerRef.current.setNavigationMode(Potree.FirstPersonControls); break;
            case "earth": viewerRef.current.setNavigationMode(Potree.EarthControls); break;
          }
          break;
        case "SET_PROJECTION":
          viewerRef.current.setCameraMode(value === "orthographic" ? Potree.CameraMode.ORTHOGRAPHIC : Potree.CameraMode.PERSPECTIVE);
          break;
        case "MEASURE_DISTANCE":
          viewerRef.current.measuringTool.startInsertion({
            showDistances: true,
            showArea: false,
            closed: false
          });
          break;
        case "MEASURE_AREA":
          viewerRef.current.measuringTool.startInsertion({
            showDistances: true,
            showArea: true,
            closed: true
          });
          break;
        case "MEASURE_VOLUME":
          viewerRef.current.volumeTool.startInsertion();
          break;
        case "MEASURE_ANGLE":
          viewerRef.current.measuringTool.startInsertion({
            showAngles: true,
            showDistances: false,
            closed: false,
            maxPoints: 3
          });
          break;
        case "MEASURE_HEIGHT":
          viewerRef.current.measuringTool.startInsertion({
            showDistances: true,
            showHeight: true,
            closed: false,
            maxPoints: 2
          });
          break;
        case "CLIP_BOX":
          console.log("[POTREE NEW] Starting Box Clipping tool (volumeTool)");
          if (viewerRef.current) {
            viewerRef.current.volumeTool.startInsertion({ clip: true, name: "BoxRecorte" });
          }
          break;
        case "CLIP_POLYGON":
          console.log("[POTREE NEW] Starting Polygon Clipping tool (clippingTool)");
          if (viewerRef.current) {
            viewerRef.current.clippingTool.startInsertion({ type: "polygon" });
          }
          break;
        case "SET_CLIP_MODE":
          console.log("[POTREE NEW] Setting Clip Task:", value);
          if (viewerRef.current) {
            if (value === 'inside') viewerRef.current.setClipTask(Potree.ClipTask.SHOW_INSIDE);
            else if (value === 'outside') viewerRef.current.setClipTask(Potree.ClipTask.SHOW_OUTSIDE);
            else viewerRef.current.setClipTask(Potree.ClipTask.NONE);
          }
          break;
        case "SET_CLASSIFICATION_VISIBILITY":
          console.log("[POTREE NEW] Setting Classification Visibility:", value.id, value.visible);
          viewerRef.current.setClassificationVisibility(value.id, value.visible);
          // Force recompute for all pointclouds to update the LUT visibility (alpha channel)
          if (viewerRef.current.scene.pointclouds.length > 0) {
              viewerRef.current.scene.pointclouds.forEach(pc => {
                  if (typeof pc.material.recomputeClassification === "function") {
                      pc.material.recomputeClassification();
                  }
              });
          }
          break;
        case "RESET_TOOLS":
          console.log("[POTREE NEW] Resetting tools");
          viewerRef.current.scene.removeAllMeasurements();
          viewerRef.current.scene.removeAllClipVolumes();
          break;
        case "SET_VIEW":
          if (viewerRef.current) {
            switch(value) {
              case "top": viewerRef.current.setTopView(); break;
              case "bottom": viewerRef.current.setBottomView(); break;
              case "left": viewerRef.current.setLeftView(); break;
              case "right": viewerRef.current.setRightView(); break;
              case "front": viewerRef.current.setFrontView(); break;
              case "back": viewerRef.current.setBackView(); break;
            }
          }
          break;
        case "CLIP_VOLUME":
          console.log("[POTREE NEW] Starting Volume Selection tool (volumeTool)");
          if (viewerRef.current) {
            viewerRef.current.volumeTool.startInsertion({ clip: true, name: "VolumeSelection" });
          }
          break;
        case "START_SEGMENTATION":
          console.log("[POTREE] Opening Segmentation Window");
          if (viewerRef.current && viewerRef.current.segmentationWindow) {
            viewerRef.current.segmentationWindow.show();
          } else {
            console.warn("Segmentation Window not found on viewer");
          }
          break;
        case "START_PLANES":
          console.log("[POTREE] Opening Planes Window");
          if (viewerRef.current) {
            console.log("[POTREE] Viewer found, checking planesWindow:", !!viewerRef.current.planesWindow);
            if (viewerRef.current.planesWindow) {
              viewerRef.current.planesWindow.show();
            } else {
              console.error("[POTREE] ERROR: Planes Window NOT found on viewer. Make sure the library was built and synced correctly.");
              // Fallback: try to see if it's anywhere else
              if (window.viewer && window.viewer.planesWindow) {
                console.log("[POTREE] Found planesWindow on window.viewer, using it.");
                window.viewer.planesWindow.show();
              }
            }
          } else {
            console.error("[POTREE] ERROR: viewerRef.current is null");
          }
          break;
        default:
          console.log("[POTREE BRIDGE] Unhandled message type:", type);
          break;
        case "TAKE_SCREENSHOT":
          console.log("[POTREE] Opening Screenshots & Data Export Window");
          if (viewerRef.current && viewerRef.current.screenshotWindow) {
            viewerRef.current.screenshotWindow.show();
          } else {
            console.warn("Screenshot Window not found on viewer");
            // Fallback to direct download if window fails
            const canvas = viewerRef.current.renderer.domElement;
            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = url;
            link.download = `lidarch_screenshot_${new Date().getTime()}.png`;
            link.click();
          }
          break;
        case "SET_SPLAT_QUALITY":
          console.log("[POTREE] Setting Splat Quality:", value);
          viewerRef.current.useHQ = (value === "hq");
          break;
        case "LOAD_CLOUD":
          if (value) {
             loadPointCloudOnViewer(value, "Nueva Nube", false);
          }
          break;
        case "EXPORT_VOLUME":
          if (viewerRef.current) {
            try {
              // Instead of downloading, we'll let the parent handle it
              // but we can call the original function if we want to keep both
              viewerRef.current.exportVisiblePointsMetadata().then(recipe => {
                window.parent.postMessage({ type: "SAVE_RECIPE", value: recipe }, "*");
                showMessage("Configuración guardada en el proyecto.");
              });
            } catch (e) {
              showMessage("Error al exportar: " + e.message);
            }
          }
          break;
        case "APPLY_CONFIG":
          if (viewerRef.current && value) {
            console.log("[POTREE] Applying saved configuration:", value);
            const viewer = viewerRef.current;
            
            // 1. Clipping Volumes
            if (value.clipVolumes && Array.isArray(value.clipVolumes)) {
              viewer.scene.removeAllClipVolumes();
              value.clipVolumes.forEach(cv => {
                let volume;
                if (cv.type === "Box") {
                  volume = new Potree.BoxVolume();
                } else if (cv.type === "Sphere") {
                  volume = new Potree.SphereVolume();
                }
                
                if (volume) {
                  volume.name = cv.name;
                  volume.clip = true;
                  viewer.scene.addVolume(volume);
                  
                  // Apply matrix
                  const matrix = new THREE.Matrix4().fromArray(cv.matrixWorld);
                  volume.matrixWorld.copy(matrix);
                  volume.matrix.copy(matrix);
                  // Update position/rotation/scale from matrix
                  matrix.decompose(volume.position, volume.quaternion, volume.scale);
                }
              });
              
              if (value.clipVolumes.length > 0) {
                const first = value.clipVolumes[0];
                if (first.clipTask) {
                  if (first.clipTask === 1) viewer.setClipTask(Potree.ClipTask.SHOW_INSIDE);
                  else if (first.clipTask === 2) viewer.setClipTask(Potree.ClipTask.SHOW_OUTSIDE);
                  else viewer.setClipTask(Potree.ClipTask.NONE);
                }
              }
            }

            // 2. Classifications
            if (value.pointclouds && value.pointclouds[0] && value.pointclouds[0].classification) {
                const classes = value.pointclouds[0].classification;
                Object.entries(classes).forEach(([id, visible]) => {
                    viewer.setClassificationVisibility(parseInt(id), visible);
                });
            }
            
            showMessage("Configuración previa aplicada.");
          }
          break;
        case "SET_COMPASS_ENABLED":
          if (viewerRef.current && viewerRef.current.compass) {
            viewerRef.current.compass.setVisible(value);
            if (value) {
                viewerRef.current.compass.dom.css({
                    "top": "auto",
                    "right": "auto",
                    "bottom": "100px",
                    "left": "35px",
                    "width": "50px"
                });
            }
          }
          break;
      }
    };
    const handleIframeClick = () => {
      window.parent.postMessage({ type: "IFRAME_CLICK" }, "*");
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("mousedown", handleIframeClick);
    
    // Notify parent that viewer is ready
    window.parent.postMessage({ type: "VIEWER_READY" }, "*");

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("mousedown", handleIframeClick);
    };
  }, []); // Dependencias vacías: solo se ejecuta al montar el componente

  // Renderizado del componente
  return (
    <>
      {/* <div className="absolute top-1 flex flex-col" style={{ zIndex: 150 }}> 
        <div
          className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg mt-4"
        >
          <Box size={20} /> 3D View
        </div>
      </div> */}
      <div className="relative w-full h-full"> {/* Contenedor principal con posicionamiento relativo */}
        {/* Contenedor de Potree */}
        <div
          className="potree_container"
          style={{ position: "absolute", width: '100%', height: '100%', left: '0px', top: '0px' }} // Ocupa todo el espacio disponible
        >
          <div id="potree_render_area" ref={renderAreaRef}></div> {/* Área donde se renderiza la nube de puntos */}
          <div id="potree_sidebar_container" ref={sidebarRef}></div> {/* Contenedor del sidebar de Potree */}



          {/* Botones de interacción */}
          <div className="absolute bottom-4 right-4 flex flex-col space-y-2 opacity-0 pointer-events-none" style={{ zIndex: 1 }}> {/* Hidden old controls */}
            <input
              id="file-upload"
              type="file"
              style={{ display: 'none' }} 
            />
          </div>

          {/* Mensaje de estado */}
          {message && ( // Muestra el mensaje si existe
            <div
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg"
              style={{ zIndex: 150 }} // Centrado en la parte inferior
            >
              {message}
            </div>
          )}

          {/* Pantalla de carga */}
          {isLoading && ( // Muestra la pantalla de carga si está activa
            <div
              className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75"
              style={{ zIndex: 200 }} // Cubre toda la pantalla
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-300 rounded-full animate-spin" /> {/* Spinner */}
                <p className="mt-4 text-white">Cargando...</p> {/* Texto de carga */}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ThreeD; // Exporta el componente para su uso en otras partes de la aplicación