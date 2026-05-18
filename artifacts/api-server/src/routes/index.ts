import { Router } from "express";
import healthRouter from "./health.js";
import itemsRouter from "./items.js";
import tagsRouter from "./tags.js";
import categoriesRouter from "./categories.js";
import groupsRouter from "./groups.js";
import authRouter from "./auth.js";
import adminRouter from "./admin.js";
import notesRouter from "./notes.js";
import graphRouter from "./graph.js";

const router = Router();

router.use(healthRouter);
router.use(itemsRouter);
router.use(tagsRouter);
router.use(categoriesRouter);
router.use(groupsRouter);
router.use(notesRouter);
router.use(graphRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);

export default router;
