# Hackweek 2025 - 3D Model Exporter

Roblox Studio models require a lot of clean up before they can be used for 3D printing. 

**The current process to go from Roblox Studio to a 3D print is:**
1. ⬆️ From Roblox Studio, select model and export as OBJ
2. 🧑‍🏭 Use a third-party website to convert OBJ to STL
3. 🧑‍🔧 Use another third-party website to repair the STL model
4. ⬇️ Import the repaired STL model to your 3D printing software
5. 🧑‍💻 Rotate the model since Roblox Studio uses Y-up, while 3D printers use Z-up coordinates
6. ⭐️ Print model

**This API helps streamline the process:**
1. ⬆️ From Roblox Studio, select model and click Print button
    - 🌐 Server automatically handles repairing and rotating model and sends back a URL to the download page
3. 🧑‍💻 Redirects you to the download page where you can select which format (OBJ, STL, 3MF) to download the model
4. ⬇️ Import the model to your 3D printing software
5. ⭐️ Print!

<img width="100%" height="100%" alt="image" src="demo/Hackweek 2025 - 3D Model Exporter Demo.gif" />

## Setup

1. Run `npm install`
2. Run `npm start`
3. Go to `http://localhost:3000`

## API

-   `[GET] /` - Proof of concept
    -   Returns an HTML page where you can upload OBJ files and download them

<img width="600" height="901" alt="image" src="https://github.com/user-attachments/assets/76439ee0-3a70-4671-ada2-5c07bbf3b8cd" />

---

-   `[POST] /api/generate-link` - Upload OBJ and get download link
    -   Add OBJ file to form-data with key set to `file`
    -   Returns a `/api/download/:token` url
 
<img width="600" height="471" alt="Screenshot 2025-12-16 at 9 37 32 AM" src="https://github.com/user-attachments/assets/8c11a4b3-fe81-4211-aaaa-0a541f5b6328" />

---

-   `[GET] /api/download/:token?format=[obj|stl|3mf]` - Download the repaired OBJ file
    -   Downloads the repaired OBJ file
    -   Return a HTML page where user can select which format to download
 
<img width="600" height="1452" alt="image" src="https://github.com/user-attachments/assets/cd162775-6c8d-4c1e-b667-9768101404d3" />
