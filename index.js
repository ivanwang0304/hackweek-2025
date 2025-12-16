const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const repair = require("stl-repair");

const { ModelConverter } = require("@polar3d/model-converter");
const { exportTo3MF } = require("three-3mf-exporter");
const { v4: uuidv4 } = require("uuid");

const { OBJLoader } = require("three/addons/loaders/OBJLoader.js");

const EXPIRATION_TIME_MS = 3600000; // 1 hour

const PORT = process.env.PORT || 3000;

const app = express();

// Simple in-memory storage for tokens
const downloads = {};

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, "uploads");
const storage = multer.diskStorage({
	destination: uploadsDir,
	filename: (_req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});
const upload = multer({ storage });

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// === API Endpoints ===

// Repair the .obj file and generate a link to download the file
app.post("/api/generate-link", upload.single("file"), async (req, res) => {
	// Generate a unique token
	const token = uuidv4();

	// Define expiration
	const expiresAt = Date.now() + EXPIRATION_TIME_MS;

	try {
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const objPath = path.resolve(req.file.path);
		const stlPath = await convertObjToFormat(objPath, "stl");

		// Repair STL
		const repairedPath = await repair(stlPath);
		// const repairedFilename =
		// 	req.file.originalname.replace(/\.[^/.]+$/, "") + "_repaired.obj";
		// res.download(path.resolve(repairedPath), repairedFilename);

		// Store the token, mapping it to the file and expiration
		const baseName =
			req.file.originalname.replace(/\.[^/.]+$/, "") + "_repaired";
		downloads[token] = {
			filePath: repairedPath,
			baseName: baseName,
			expires: expiresAt,
		};

		// Construct the full download URL
		const downloadUrl = `${req.protocol}://${req.get(
			"host"
		)}/download/${token}`;

		// Return the URL to the client
		res.json({
			success: true,
			downloadUrl: downloadUrl,
			expiresIn: EXPIRATION_TIME_MS / 1000 + " seconds",
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Web page to select format and download the file
app.get("/download/:token", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "download.html"));
});

// API to get download info with format options
app.get("/api/download-info/:token", (req, res) => {
	const token = req.params.token;
	const format = req.query.format || "obj";
	const downloadInfo = downloads[token];

	if (!downloadInfo) {
		return res
			.status(404)
			.json({ error: "Invalid or expired download link." });
	}

	if (Date.now() > downloadInfo.expires) {
		delete downloads[token];
		return res.status(410).json({ error: "Download link has expired." });
	}

	// Generate filename with requested format
	const baseName = downloadInfo.baseName;
	const fileName = `${baseName}.${format}`;

	res.json({ fileName, availableFormats: ["obj", "stl", "3mf"] });
});

// Actual file download endpoint with format conversion
app.get("/api/download/:token", async (req, res) => {
	const token = req.params.token;
	const format = req.query.format || "obj";
	const validFormats = ["obj", "stl", "3mf"];

	if (!validFormats.includes(format)) {
		return res.status(400).send("Invalid format. Use obj, stl, or 3mf.");
	}

	const downloadInfo = downloads[token];

	if (!downloadInfo) {
		return res.status(404).send("Invalid or expired download link.");
	}

	if (Date.now() > downloadInfo.expires) {
		delete downloads[token];
		return res.status(410).send("Download link has expired.");
	}

	const { filePath, baseName } = downloadInfo;

	if (!fs.existsSync(filePath)) {
		return res.status(500).send("File not found on the server.");
	}

	try {
		const fileName = `${baseName}.${format}`;

		// If requesting OBJ, send the repaired .obj file directly
		if (format === "obj") {
			return res.download(filePath, fileName);
		}

		if (format === "3mf") {
			// Read the OBJ file content
			const objTextContent = await fs.readFileSync(filePath, "utf-8");

			// Parse the OBJ file content
			const objLoader = new OBJLoader();
			const loadedObject = objLoader.parse(objTextContent);

			// Convert the object to 3MF
			const blob = await exportTo3MF(loadedObject);

			const arrayBuffer = await blob.arrayBuffer();
			const convertedFilePath = filePath.replace(/\.obj$/i, ".3mf");
			fs.writeFileSync(convertedFilePath, Buffer.from(arrayBuffer));

			res.download(path.resolve(convertedFilePath), fileName, (err) => {
				if (err) {
					// Handle errors like file transmission interruption or permissions issues
					console.error("Error during download stream:", err);

					// Important: Only send a status/message if headers haven't already been sent
					if (!res.headersSent) {
						res.status(500).send("Failed to stream the file.");
					}
				} else {
					console.log(`Successfully downloaded file.`);
				}
			});
		} else {
			// Convert repaired .obj file to requested format
			const convertedFilePath = await convertObjToFormat(
				filePath,
				format
			);

			res.download(path.resolve(convertedFilePath), fileName, (err) => {
				if (err) {
					// Handle errors like file transmission interruption or permissions issues
					console.error("Error during download stream:", err);

					// Important: Only send a status/message if headers haven't already been sent
					if (!res.headersSent) {
						res.status(500).send("Failed to stream the file.");
					}
				} else {
					console.log(`Successfully downloaded file.`);
				}
			});
		}
	} catch (error) {
		console.error("Conversion error:", error);
		res.status(500).send("Error converting file format.");
	}
});

// DEPRECATED
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

// === Utility Functions ===

/**
 * Convert a file to a requested format and save it to the filesystem
 * @param {string} filePath - The path to the file to convert
 * @param {Format} targetFormat - The target format of the file
 * @returns {Promise<string>} The path to the converted file
 */
async function convertObjToFormat(objPath, targetFormat) {
	const buffer = fs.readFileSync(objPath).buffer;
	const result = await ModelConverter.convert(buffer, "obj", targetFormat);
	const arrayBuffer = await result.blob.arrayBuffer();

	const convertedFilePath = objPath.replace(/\.obj$/i, `.${targetFormat}`);
	fs.writeFileSync(convertedFilePath, Buffer.from(arrayBuffer));

	return convertedFilePath;
}
