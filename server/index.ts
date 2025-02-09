import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import cors from "cors";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Log the incoming origin for debugging
    log(`Incoming request origin: ${origin}`);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      log('No origin in request, allowing');
      return callback(null, true);
    }

    // Allow all Replit domains and local development
    if (origin.match(/https?:\/\/.*\.repl(it|\.dev|\.co)/) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')) {
      log(`Origin ${origin} is allowed`);
      callback(null, true);
    } else {
      log(`Origin ${origin} is not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup auth first
  setupAuth(app);

  // Then register routes
  const server = registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`Error: ${status} - ${message}`);
    res.status(status).json({ message });
  });

  // Setup static file serving and Vite middleware
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use environment variables for port with fallback
  const PORT = Number(process.env.PORT) || 5000;
  const HOST = '0.0.0.0';

  server.listen(PORT, HOST, () => {
    log(`Server running on port ${PORT}`);
    log(`Access your application at: ${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  });
})();