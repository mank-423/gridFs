const express = require("express");
const cors = require('cors')
const app = express();
const bodyParser = require("body-parser");
const logger = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./database/config");
const { default: mongoose } = require("mongoose");
const { upload } = require("./utils/upload");
const archiver = require("archiver");
const { Transform } = require("stream");

app.use(cors())
dotenv.config();

const port = process.env.PORT || 3000;

// Connect to database
connectDB();

// Connect to MongoDB GridFS bucket using mongoose
let bucket;
(() => {
    mongoose.connection.on("connected", () => {
        bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "filesBucket",
        });
        if (bucket) {
            console.log("Bucket is ready to use");
        }
    });
})();

// Middleware for parsing request body and logging requests
app.use(bodyParser.json());
app.use(logger("dev"));

// Routes for API endpoints

// Upload a single file
app.post("/upload/file", upload().single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Process the uploaded file

        res.status(201).json({ text: "File uploaded successfully !" });
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(400).json({ error: `Unable to upload file: ${error.message}` });
    }
});

// Upload multiple files
app.post("/upload/files", upload().array("files"), async (req, res) => {
    try {
        res.status(201).json({ text: "Files uploaded successfully !" });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            error: { text: `Unable to upload files`, error },
        });
    }
});

// Download a file by id
app.get("/download/files/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;

        // Check if file exists
        const file = await bucket
            .find({ _id: new mongoose.Types.ObjectId(fileId) })
            .toArray();
        console.log(file.length);
        if (file.length === 0) {
            return res.status(404).json({ error: { text: "File not found" } });
        }

        // set the headers
        res.set("Content-Type", file[0].contentType);
        res.set("Content-Disposition", `attachment; filename=${file[0].filename}`);

        // create a stream to read from the bucket
        const downloadStream = bucket.openDownloadStream(
            new mongoose.Types.ObjectId(fileId)
        );

        // pipe the stream to the response
        downloadStream.pipe(res);
    } catch (error) {
        console.log(error);
        res.status(400).json({
            error: { text: `Unable to download file`, error },
        });
    }
});

// Download all files
app.get("/download/files", async (req, res) => {
    try {
        const files = await bucket.find().toArray();
        console.log(files.length);
        if (files.length === 0) {
            return res.status(404).json({ error: { text: "No files found" } });
        }
        res.set("Content-Type", "application/zip");
        res.set("Content-Disposition", `attachment; filename=files.zip`);
        res.set("Access-Control-Allow-Origin", "*");
        const archive = archiver("zip", {
            zlib: { level: 9 },
        });

        archive.pipe(res);

        files.forEach((file) => {
            const downloadStream = bucket.openDownloadStream(
                new mongoose.Types.ObjectId(file._id)
            );
            archive.append(downloadStream, { name: file.filename });
        });

        archive.finalize();
    } catch (error) {
        console.log(error);
        res.status(400).json({
            error: { text: `Unable to download files`, error },
        });
    }
});

// Download all files
app.get("/download/files2", async (_req, res) => {
    try {
        const cursor = bucket.find();
        const files = await cursor.toArray();

        const filesData = await Promise.all(
            files.map((file) => {
                return new Promise((resolve, _reject) => {
                    bucket.openDownloadStream(file._id).pipe(
                        (() => {
                            const chunks = [];
                            return new Transform({
                                // transform method will
                                transform(chunk, encoding, done) {
                                    chunks.push(chunk);
                                    done();
                                },
                                flush(done) {
                                    const fbuf = Buffer.concat(chunks);
                                    const fileBase64String = fbuf.toString("base64");
                                    resolve(fileBase64String);
                                    done();

                                    // use the following instead if you want to return also the file metadata (like its name and other information)
                                    /*const fileData = {
                                      ...file, // file metadata
                                      fileBase64String: fbuf.toString("base64"),
                                    };
                                    resolve(fileData);
                                    done();*/
                                },
                            });
                        })()
                    );
                });
            })
        );
        res.status(200).json(filesData);
    } catch (error) {
        console.log(error);
        res.status(400).json({
            error: { text: `Unable to retrieve files`, error },
        });
    }
});

// Rename a file
app.put("/rename/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        const { filename } = req.body;
        await bucket.rename(new mongoose.Types.ObjectId(fileId), filename);
        res.status(200).json({ text: "File renamed successfully !" });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            error: { text: `Unable to rename file`, error },
        });
    }
});

// Delete a file
app.delete("/delete/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        await bucket.delete(new mongoose.Types.ObjectId(fileId));
        res.status(200).json({ text: "File deleted successfully !" });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            error: { text: `Unable to delete file`, error },
        });
    }
});

// Get all files
app.get("/files", (req, res) => {
    // Create an array to store file information
    const filesInfo = [];

    // Fetch all files from GridFS
    const cursor = bucket.find();

    cursor.forEach(
        (file) => {
            filesInfo.push({
                filename: file.filename,
                contentType: file.contentType,
                uploadDate: file.uploadDate,
                length: file.length,
                fileId: file._id,
            });
        },
        () => {
            // When the cursor is exhausted, send the array of file information as a JSON response
            res.json(filesInfo);
        }
    );
});

// Get files information from the GridFS files collection
app.get("/info/files", async (req, res) => {
    try {
        const filesInfo = await bucket.find().toArray();
        res.status(200).json(filesInfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching file information', details: error.message });
    }
});


// Get a specific file by its fileId
app.get("/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;

        // Validate fileId
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: 'Invalid fileId' });
        }

        // Check if the file exists
        const file = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
        if (file.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Set headers for file download
        res.set('Content-Type', file[0].contentType);
        res.set('Content-Disposition', 'inline');

        // Create a stream to read from GridFS
        const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

        // Pipe the stream to the response
        downloadStream.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error downloading file' });
    }
});





// Server listening on port 3000 for incoming requests

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});