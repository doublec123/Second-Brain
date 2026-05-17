import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

import { authMiddleware } from "./middlewares/auth";

const app: Express = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET || "kb-weaver-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
  })
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:20447',
  'http://localhost:5000',
  'https://second-brain-api-server.vercel.app',
  process.env.FRONTEND_URL || ''
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin via proxy), explicit whitelist, or localhost origins
    if (!origin || allowedOrigins.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(authMiddleware);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

export default app;
