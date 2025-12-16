const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const repair = require("stl-repair");

const { ModelConverter } = require("@polar3d/model-converter");
const { v4: uuidv4 } = require("uuid");

const EXPIRATION_TIME_MS = 3600000; // 1 hour

const PORT = process.env.PORT || 3000;

const app = express();

// Simple in-memory storage for tokens
const downloads = {};

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

// Generate a link to download the file
app.post("/api/generate-link", upload.single("file"), async (req, res) => {
	// 1. Generate a unique token
	const token = uuidv4();

	// 2. Define expiration
	const expiresAt = Date.now() + EXPIRATION_TIME_MS;

	try {
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const objPath = path.resolve(req.file.path);
		const stlPath = objPath.replace(/\.obj$/i, ".stl");

		// Convert OBJ to STL
		const buffer = fs.readFileSync(objPath).buffer;
		const result = await ModelConverter.convert(buffer, "obj", "stl");
		const arrayBuffer = await result.blob.arrayBuffer();
		fs.writeFileSync(stlPath, Buffer.from(arrayBuffer));

		// Repair STL and send
		const repairedPath = await repair(stlPath);
		const repairedFilename =
			req.file.originalname.replace(/\.[^/.]+$/, "") + "_repaired.obj";
		res.download(path.resolve(repairedPath), repairedFilename);

		// 3. Store the token, mapping it to the file and expiration
		downloads[token] = {
			filePath: repairedPath,
			fileName: repairedFilename,
			expires: expiresAt,
		};

		// 4. Construct the full download URL
		const downloadUrl = `${req.protocol}://${req.get(
			"host"
		)}/download/${token}`;

		// 5. Return the URL to the client
		res.json({
			success: true,
			downloadUrl: downloadUrl,
			expiresIn: EXPIRATION_TIME_MS / 1000 + " seconds",
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Web page to download the file
app.get("/download/:token", (req, res) => {
	const token = req.params.token;
	const downloadInfo = downloads[token];

	// 1. Check if token exists
	if (!downloadInfo) {
		return res.status(404).send("Invalid or expired download link.");
	}

	// 2. Check for expiration
	if (Date.now() > downloadInfo.expires) {
		delete downloads[token]; // Clean up expired token
		return res.status(410).send("Download link has expired.");
	}

	const { filePath, fileName } = downloadInfo;

	// Check if file exists on server disk
	if (!fs.existsSync(filePath)) {
		return res.status(500).send("File not found on the server.");
	}

	// 3. Serve the file and enforce the filename via headers
	res.download(filePath, fileName, (err) => {
		if (err) {
			console.error("Download streaming error:", err);
			// Don't send status if headers were already partially sent
		} else {
			// 4. Optional: Clean up the token after successful download
			delete downloads[token];
			console.log(`Token ${token} used and deleted.`);
		}
	});
});

// Convert OBJ to STL and repair
app.post("/api/repair", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const objPath = path.resolve(req.file.path);
		const stlPath = objPath.replace(/\.obj$/i, ".stl");

		// Convert OBJ to STL
		const buffer = fs.readFileSync(objPath).buffer;
		const result = await ModelConverter.convert(buffer, "obj", "stl");
		const arrayBuffer = await result.blob.arrayBuffer();
		fs.writeFileSync(stlPath, Buffer.from(arrayBuffer));

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
