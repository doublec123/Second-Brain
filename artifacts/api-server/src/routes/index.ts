import { Router, type IRouter } from "express";
import healthRouter from "./health";
import itemsRouter from "./items";
import tagsRouter from "./tags";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(itemsRouter);
router.use(tagsRouter);
router.use(uploadRouter);

export default router;
