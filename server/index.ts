import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import cors from "cors";

const app = express();

// Debug request logging
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  log('Auth status:', req.isAuthenticated ? req.isAuthenticated() : false);
  next();
});

// Development-friendly CORS setup
const corsOptions = {
  origin: true, // Reflects request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

log(`Starting server on ${HOST}:${PORT}`);

(async () => {
  setupAuth(app);
  const server = registerRoutes(app);

  // Response logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      log('Response status:', res.statusCode);
      log('Response headers:', {
        'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
        'access-control-allow-credentials': res.getHeader('access-control-allow-credentials'),
      });
    });
    next();
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    log(`Error: ${err.status || 500} - ${err.message}`);
    res.status(err.status || 500).json({ message: err.message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(PORT, HOST, () => {
    log(`Server running at http://${HOST}:${PORT}`);
    log(`Environment: ${app.get("env")}`);
  });
})();