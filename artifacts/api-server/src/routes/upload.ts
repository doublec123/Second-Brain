import { Router, type IRouter } from "express";
import { UploadFileBody } from "@workspace/api-zod";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router: IRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

router.post("/upload", async (req, res): Promise<void> => {
  const parsed = UploadFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { filename, base64Data } = parsed.data;
  const ext = path.extname(filename) || ".bin";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, uniqueName);

  const buffer = Buffer.from(base64Data, "base64");
  fs.writeFileSync(filePath, buffer);

  res.status(201).json({
    url: `/api/uploads/${uniqueName}`,
    filename: uniqueName,
  });
});

router.get("/uploads/:filename", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.filename)
    ? req.params.filename[0]
    : req.params.filename;
  const safeFilename = path.basename(raw ?? "");
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(filePath);
});

export default router;
