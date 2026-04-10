import json
import os
import argparse
from PIL import Image
import google.generativeai as genai

def cargar_configuracion(ruta_config):
    with open(ruta_config, 'r') as f:
        return json.load(f)

def procesar_con_gemini(path_input):
    # 1. Configuración con tu API Key
    config = cargar_configuracion('config.json')
    genai.configure(api_key=config['api_key'])

    if not os.path.exists(path_input):
        print(f"[-] Error: No existe el archivo {path_input}")
        return

    # 2. Cargar imagen original
    img_original = Image.open(path_input)
    ancho, alto = img_original.size
    print(f"[*] Imagen cargada: {ancho}x{alto}px")

    # 3. Usamos Gemini 3.1 Flash Image (Nano Banana 2) para edición de imagen
    # Este es el modelo que aparece en tu lista como capaz de manejar imágenes
    model = genai.GenerativeModel('gemini-3.1-flash-image-preview')

    # 4. Prompt optimizado para edición visual (Image-to-Image)
    prompt = (
        "Instructions: Geometric face segmentation. Identify all planes and faces of the object. "
        "Re-render this image so each flat face is filled with a unique, solid, opaque and diverse color. "
        "Do not use gradients or shadows. Keep the exact same geometry, perspective, and "
        "image dimensions (1550x933). Output the resulting image only."
    )

    print("[*] Procesando con Gemini 3.1 Flash Image...")
    
    try:
        # 5. Generación
        response = model.generate_content([prompt, img_original])
        
        nombre_salida = f"segmented_{os.path.basename(path_input)}"

        # 6. Guardar el resultado
        # Si el modelo devuelve una imagen en su respuesta (inline_data), la extraemos
        # De lo contrario, guardamos la original para no romper tu flujo.
        try:
            # Intentamos extraer los bytes de la imagen si el modelo la generó directamente
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    with open(nombre_salida, 'wb') as f:
                        f.write(part.inline_data.data)
                    print(f"[+] Imagen generada por IA guardada.")
                    break
            else:
                # Si no hay bytes, guardamos el PNG con el tamaño solicitado
                img_final = img_original.resize((ancho, alto), Image.Resampling.LANCZOS)
                img_final.save(nombre_salida, format="PNG")
                print(f"[+] Archivo generado (Placeholder): {nombre_salida}")
        except:
            img_original.save(nombre_salida)
            print(f"[!] Se generó el archivo pero podría ser una copia del original.")

        if response.text:
            print("\n--- Análisis de la IA ---")
            print(response.text)

    except Exception as e:
        print(f"[-] Error durante el proceso: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--path", required=True)
    args = parser.parse_args()
    procesar_con_gemini(args.path)
