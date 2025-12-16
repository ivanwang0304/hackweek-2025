# Hackweek 2025 - 3D Printer Server

### Setup

1. Run `npm install`
2. Run `npm start`
3. Go to `http://localhost:3000`

### API

-   `/` - GET request proof of concept
    -   Returns an HTML page where you can upload .obj files and download them
-   `/api/generate-link` - POST request to get download link
    -   Add .obj file to form-data with key set to `file`
    -   Returns a `/api/download/:token` url
-   `/api/download/:token` - GET request to download the repaired .obj file
    -   Downloads the repaired .obj file
    -   TODO: Return a HTML page where user can select which format to download

<img width="1694" height="901" alt="image" src="https://github.com/user-attachments/assets/76439ee0-3a70-4671-ada2-5c07bbf3b8cd" />
