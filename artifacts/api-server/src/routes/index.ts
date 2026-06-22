import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dicteeRouter from "./dictee";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dicteeRouter);

export default router;
