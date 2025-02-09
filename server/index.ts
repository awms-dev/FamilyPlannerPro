import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import cors from "cors";

const app = express();

// Logging middleware for all requests
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// CORS configuration must come before any other middleware
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Log the incoming origin for debugging
    log(`Incoming request origin: ${origin}`);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      log('No origin in request, allowing');
      return callback(null, true);
    }

    // Echo back the origin for credentialed requests
    log(`Origin ${origin} is allowed`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Then apply other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Additional headers for security and CORS
app.use((req, res, next) => {
  // Log CORS-related headers
  log('Setting response headers');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // CORS headers - explicitly set for each request
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // If we have an origin, echo it back
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  next();
});

// Logging middleware for response status
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
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    if (capturedJsonResponse) {
      log('Response:', JSON.stringify(capturedJsonResponse));
    }
  });

  next();
});

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

log(`Starting server on ${HOST}:${PORT}`);

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

  server.listen(PORT, HOST, () => {
    log(`Server running at http://${HOST}:${PORT}`);
    log(`Environment: ${app.get("env")}`);
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      log(`Access your application at: ${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    }
  });
})();