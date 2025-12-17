# Hackweek 2025 - 3D Printer Server

### Setup

1. Run `npm install`
2. Run `npm start`
3. Go to `http://localhost:3000`

### Demo

<img width="100%" height="100%" alt="image" src="demo/Hackweek 2025 - 3D Model Exporter Demo.gif" />

### API

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
