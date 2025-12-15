const express = require("express");
const multer = require("multer");
const path = require("path");
const repair = require("stl-repair");

const { ModelConverter } = require("@polar3d/model-converter");
const { readFileSync, writeFileSync } = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, "uploads");
const storage = multer.diskStorage({
	destination: uploadsDir,
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});
const upload = multer({ storage });

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Convert OBJ to STL and repair
app.post("/api/repair", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const objPath = path.resolve(req.file.path);
		const stlPath = objPath.replace(/\.obj$/i, ".stl");

		// Convert OBJ to STL
		const buffer = readFileSync(objPath).buffer;
		const result = await ModelConverter.convert(buffer, "obj", "stl");
		const arrayBuffer = await result.blob.arrayBuffer();
		writeFileSync(stlPath, Buffer.from(arrayBuffer));

		// Repair STL and send
		const repairedPath = await repair(stlPath);
		const repairedFilename =
			req.file.originalname.replace(/\.[^/.]+$/, "") + "_repaired.obj";
		res.download(path.resolve(repairedPath), repairedFilename);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
