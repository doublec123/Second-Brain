import { Router, type IRouter } from "express";
import healthRouter from "./health";
import itemsRouter from "./items";
import tagsRouter from "./tags";
import categoriesRouter from "./categories";
import groupsRouter from "./groups";
import authRouter from "./auth";
import adminRouter from "./admin";
import notesRouter from "./notes";
import graphRouter from "./graph";

const router: IRouter = Router();

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
