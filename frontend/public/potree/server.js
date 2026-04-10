import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import cors from 'cors';

// ---------------------------
// Configuración del servidor
// ---------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// Obtén el directorio actual de la forma adecuada para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verifica si estamos en un sistema operativo Windows
const isWindows = os.platform() === 'win32';

// Configura la ruta del ejecutable de PotreeConverter
// (ajusta si tu binario Windows está en otra carpeta)
const potreePath = isWindows
  ? 'PotreeConverter.exe'
  : path.join(__dirname, 'bin/linux/PotreeConverter');

console.log(`Using PotreeConverter path: ${potreePath}`);

// Configura CORS
app.use(cors());

// Configura multer para manejar las subidas de archivos (almacenamiento en memoria)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configura la carpeta 'public' para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de subida de archivos
app.post('/upload', upload.single('file'), handleFileUpload);

// ---------------------------
// Handler principal
// ---------------------------
function handleFileUpload(req, res) {
  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }

  const fileBuffer = req.file.buffer;
  const originalPath = req.body.originalPath || ""; 
  const outputDir = path.join(__dirname, 'public', 'pointcloud');

  // Asegurar que exista el directorio de salida
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    
    // 1. Guardar el archivo original de forma permanente para reconstrucción posterior
    const sourceLasPath = path.join(outputDir, 'source.las');
    fs.writeFileSync(sourceLasPath, fileBuffer);
    console.log(`Original LAS saved to: ${sourceLasPath}`);

    // 2. Guardar la ruta original en un archivo separado (opcional, para referencia)
    if (originalPath) {
      fs.writeFileSync(path.join(outputDir, 'source_path.txt'), originalPath);
      console.log(`Original path link saved: ${originalPath}`);
    }
    
    // Realizamos la conversión usando el archivo guardado
    const args = [sourceLasPath, '-o', outputDir];

    console.log(`Running PotreeConverter: ${potreePath} ${args.join(' ')}`);

    execFile(potreePath, args, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      if (stdout) console.log(`PotreeConverter stdout:\n${stdout}`);
      if (stderr) console.error(`PotreeConverter stderr:\n${stderr}`);

      if (error) {
        console.error(`Exec error: ${error.message}`);
        return res.status(500).send(`Error converting file: ${stderr || error.message}`);
      }

      return res.send('File processed successfully with PotreeConverter');
    });

  } catch (err) {
    console.error(`Error handling file storage: ${err.message}`);
    return res.status(500).send(`Error handling file storage: ${err.message}`);
  }
}

// ---------------------------
// Helpers
// ---------------------------
// Temporarily keeping as placeholders or removing if unused


// ---------------------------
// Start server
// ---------------------------
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Listening for file uploads at http://localhost:${PORT}/upload`);
});

