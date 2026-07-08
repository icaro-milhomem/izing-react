import "reflect-metadata";
import "express-async-errors";
import { Application, json, urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { logger } from "../utils/logger";
import path from "path";
import expressStatic from "express";

export default async function express(app: Application): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || "https://app.izing.io";
  const isDev = process.env.NODE_ENV === "dev";
  const extraOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

  const corsOrigin: cors.CorsOptions["origin"] = isDev
    ? (requestOrigin, callback) => {
        // Em dev, reflete a origem da requisição (localhost, IP WSL/LAN, qualquer porta Vite)
        if (!requestOrigin) {
          callback(null, true);
          return;
        }
        const allowedStatic = [
          frontendUrl,
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:8080",
          ...extraOrigins
        ];
        if (allowedStatic.includes(requestOrigin)) {
          callback(null, true);
          return;
        }
        if (
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin) ||
          /^https?:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(requestOrigin)
        ) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked origin: ${requestOrigin}`));
      }
    : [frontendUrl, ...extraOrigins];
  
  // Middleware GLOBAL para remover CSP e adicionar Permissions-Policy ANTES de qualquer coisa
  // DEVE ser o primeiro middleware para interceptar TODOS os headers
  app.use((req, res, next) => {
    // Interceptar ANTES de qualquer outro middleware poder adicionar headers
    const originalSetHeader = res.setHeader.bind(res);
    const originalWriteHead = res.writeHead.bind(res);
    const originalEnd = res.end.bind(res);
    const originalSend = res.send.bind(res);
    const originalGetHeader = res.getHeader.bind(res);
    const originalRemoveHeader = res.removeHeader.bind(res);
    
    // Função auxiliar para modificar CSP
    const modifyCSP = (cspValue: string): string => {
      if (!cspValue || typeof cspValue !== 'string') return cspValue;
      
      // Remover todas as variações de frame-ancestors 'self'
      let modified = cspValue
        .replace(/frame-ancestors\s+['"]self['"]/gi, '')
        .replace(/frame-ancestors\s+self/gi, '')
        .replace(/frame-ancestors:\s*['"]self['"]/gi, '')
        .replace(/frame-ancestors:\s*self/gi, '');
      
      // Limpar espaços duplos e pontos e vírgulas duplicados
      modified = modified.replace(/\s{2,}/g, ' ').replace(/;\s*;/g, ';').trim();
      
      // Se não tem frame-ancestors, adicionar
      if (!modified.includes('frame-ancestors')) {
        modified = modified + (modified.endsWith(';') ? ' ' : '; ') + 'frame-ancestors *';
      } else {
        // Garantir que frame-ancestors seja *
        modified = modified.replace(/frame-ancestors\s+[^;]*/gi, 'frame-ancestors *');
      }
      
      return modified;
    };
    
    // Interceptar setHeader para modificar CSP e X-Frame-Options
    res.setHeader = function(name: string, value: any): typeof res {
      const lowerName = name.toLowerCase();
      
      // Bloquear completamente headers que restringem iframes
      if (lowerName === 'x-frame-options' && (value === 'SAMEORIGIN' || value === 'DENY')) {
        return res; // Não definir
      }
      
      // Modificar CSP para permitir frames
      if (lowerName === 'content-security-policy' || lowerName === 'x-content-security-policy') {
        if (typeof value === 'string') {
          const modifiedCSP = modifyCSP(value);
          return originalSetHeader(name, modifiedCSP);
        }
        return res; // Não definir CSP inválido
      }
      
      // Interceptar frame-ancestors diretamente
      if (lowerName === 'frame-ancestors') {
        if (value === "'self'" || value === '"self"' || value === 'self') {
          return originalSetHeader(name, '*');
        }
      }
      
      // Sempre adicionar Permissions-Policy quando definir outros headers
      if (lowerName !== 'permissions-policy') {
        try {
          const existingPolicy = originalGetHeader('Permissions-Policy');
          if (!existingPolicy || (typeof existingPolicy === 'string' && !existingPolicy.includes('fullscreen'))) {
            originalSetHeader('Permissions-Policy', 'fullscreen=*');
          }
        } catch (e) {
          // Ignora erros
        }
      }
      
      return originalSetHeader(name, value);
    };
    
    // Interceptar writeHead
    res.writeHead = function(statusCode?: number, statusMessage?: any, headers?: any) {
      if (headers) {
        const cleanHeaders: any = {};
        for (const key in headers) {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'content-security-policy' || lowerKey === 'x-content-security-policy') {
            const modifiedCSP = modifyCSP(headers[key]);
            cleanHeaders[key] = modifiedCSP;
          } else if (lowerKey === 'x-frame-options' && (headers[key] === 'SAMEORIGIN' || headers[key] === 'DENY')) {
            // Não adicionar X-Frame-Options restritivo - pular este header (não adicionar ao cleanHeaders)
            // continue não funciona em for...in, então apenas não adicionamos ao cleanHeaders
          } else if (lowerKey === 'frame-ancestors') {
            if (headers[key] === "'self'" || headers[key] === '"self"' || headers[key] === 'self') {
              cleanHeaders[key] = '*';
            } else {
              cleanHeaders[key] = headers[key];
            }
          } else {
            cleanHeaders[key] = headers[key];
          }
        }
        // Sempre adicionar Permissions-Policy
        cleanHeaders['Permissions-Policy'] = 'fullscreen=*';
        if (statusCode !== undefined) {
          return originalWriteHead(statusCode, statusMessage, cleanHeaders);
        }
        return res;
      }
      // Sempre adicionar Permissions-Policy mesmo sem headers
      if (statusCode !== undefined) {
        const headersWithPolicy: any = { 'Permissions-Policy': 'fullscreen=*' };
        return originalWriteHead(statusCode, statusMessage, headersWithPolicy);
      }
      return res;
    };
    
    // Função auxiliar para garantir headers corretos antes de enviar
    const ensureHeaders = () => {
      if (!res.headersSent) {
        try {
          // Verificar e modificar TODOS os headers CSP possíveis
          const headerNames = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
          for (const headerName of headerNames) {
            const cspHeader = originalGetHeader(headerName);
            if (cspHeader && typeof cspHeader === 'string') {
              const modifiedCSP = modifyCSP(cspHeader);
              originalRemoveHeader(headerName);
              originalSetHeader('Content-Security-Policy', modifiedCSP);
            }
          }
          // Remover X-Frame-Options restritivos
          const xFrameOptions = originalGetHeader('X-Frame-Options') || originalGetHeader('x-frame-options');
          if (xFrameOptions === 'SAMEORIGIN' || xFrameOptions === 'DENY') {
            originalRemoveHeader('X-Frame-Options');
            originalRemoveHeader('x-frame-options');
          }
          // Garantir Permissions-Policy
          originalSetHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {
          // Ignora erros
        }
      }
    };
    
    // Interceptar send para garantir headers corretos ANTES de enviar
    res.send = function(body?: any) {
      ensureHeaders();
      return originalSend(body);
    };
    
    // Interceptar end para garantir headers corretos ANTES de finalizar
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      ensureHeaders();
      return originalEnd(chunk, encoding, cb);
    };
    
    // Garantir headers corretos em múltiplos eventos
    res.on('finish', ensureHeaders);
    res.on('close', ensureHeaders);
    
    next();
  });
  
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposedHeaders: ["Content-Range", "X-Content-Range"]
    })
  );

  // Middleware para remover headers de segurança de arquivos estáticos e rota raiz ANTES de qualquer outro middleware
  // Isso garante que nenhum header de segurança seja adicionado, incluindo pelo helmet
  app.use((req, res, next) => {
    const isStaticRoute = req.path.startsWith('/public') || 
                          req.path.startsWith('/uploads') || 
                          req.path.startsWith('/arquivos');
    const isRootRoute = req.path === '/';
    
    if (isStaticRoute || isRootRoute) {
      // Interceptar setHeader para bloquear headers de segurança e adicionar Permissions-Policy
      const originalSetHeader = res.setHeader.bind(res);
      const originalWriteHead = res.writeHead.bind(res);
      const originalOn = res.on.bind(res);
      
      // Interceptar eventos para remover headers antes de enviar
      res.on = function(event: string, listener: any) {
        if (event === 'finish' || event === 'close') {
          const wrappedListener = () => {
            // Tenta remover headers antes de finalizar (pode falhar silenciosamente)
            try {
              if (!res.headersSent) {
                res.removeHeader('X-Frame-Options');
                res.removeHeader('Content-Security-Policy');
                // Adicionar Permissions-Policy para permitir fullscreen
                res.setHeader('Permissions-Policy', 'fullscreen=*');
              }
            } catch (e) {
              // Ignora erros
            }
            listener();
          };
          return originalOn(event, wrappedListener);
        }
        return originalOn(event, listener);
      };
      
      res.setHeader = function(name: string, value: any): typeof res {
        const lowerName = name.toLowerCase();
        if (lowerName === 'content-security-policy' || 
            lowerName === 'x-content-security-policy' ||
            lowerName === 'x-frame-options' ||
            lowerName === 'frame-ancestors') {
          return res; // Não definir headers que bloqueiam iframes
        }
        // Adicionar Permissions-Policy para permitir fullscreen quando necessário
        if (lowerName === 'permissions-policy' && !value.includes('fullscreen')) {
          return originalSetHeader(name, value + ', fullscreen=*');
        }
        return originalSetHeader(name, value);
      };

      // Interceptar writeHead para remover headers e adicionar Permissions-Policy
      res.writeHead = function(statusCode?: number, statusMessage?: any, headers?: any) {
        if (headers) {
          const cleanHeaders: any = {};
          for (const key in headers) {
            const lowerKey = key.toLowerCase();
            if (lowerKey !== 'content-security-policy' && 
                lowerKey !== 'x-content-security-policy' &&
                lowerKey !== 'x-frame-options' &&
                lowerKey !== 'frame-ancestors') {
              cleanHeaders[key] = headers[key];
            }
          }
          // Adicionar Permissions-Policy para permitir fullscreen
          cleanHeaders['Permissions-Policy'] = 'fullscreen=*';
          if (statusCode !== undefined) {
            return originalWriteHead(statusCode, statusMessage, cleanHeaders);
          }
          return res;
        }
        if (statusCode !== undefined) {
          // Adicionar Permissions-Policy mesmo sem headers
          const headersWithPolicy: any = { 'Permissions-Policy': 'fullscreen=*' };
          return originalWriteHead(statusCode, statusMessage, headersWithPolicy);
        }
        return res;
      };
    } else {
      // Para outras rotas, garantir que CSP não bloqueie iframes e adicionar Permissions-Policy
      const originalSetHeader = res.setHeader.bind(res);
      res.setHeader = function(name: string, value: any): typeof res {
        const lowerName = name.toLowerCase();
        // Bloquear headers que restringem iframes
        if (lowerName === 'content-security-policy') {
          // Se o CSP contém frame-ancestors 'self', substituir por frame-ancestors *
          if (typeof value === 'string' && value.includes("frame-ancestors")) {
            const cspValue = value.replace(/frame-ancestors\s+['"]self['"]/gi, "frame-ancestors *");
            return originalSetHeader(name, cspValue);
          }
          // Se não tem frame-ancestors, adicionar
          if (typeof value === 'string' && !value.includes("frame-ancestors")) {
            return originalSetHeader(name, value + "; frame-ancestors *");
          }
        }
        if (lowerName === 'x-frame-options' && (value === 'SAMEORIGIN' || value === 'DENY')) {
          return res; // Não definir X-Frame-Options restritivo
        }
        if (lowerName === 'frame-ancestors' && value === "'self'") {
          return originalSetHeader(name, '*'); // Permitir todos os frames
        }
        return originalSetHeader(name, value);
      };
      res.setHeader('Permissions-Policy', 'fullscreen=*');
    }
    next();
  });

  // DESABILITAR HELMET COMPLETAMENTE para evitar problemas com CSP em iframes
  // O helmet estava causando problemas mesmo quando NODE_ENV=dev
  // Comentado temporariamente até resolver o problema de CSP
  /*
  if (process.env.NODE_ENV !== "dev") {
    // Aplicar helmet apenas para rotas que não são /public, /uploads, /arquivos ou raiz
    app.use((req, res, next) => {
      // Se for rota raiz ou arquivos estáticos, não aplicar helmet
      if (req.path === '/' ||
          req.path.startsWith('/public') || 
          req.path.startsWith('/uploads') || 
          req.path.startsWith('/arquivos')) {
        return next(); // Pula o helmet completamente
      }
      
      // Aplicar helmet com CSP customizado para outras rotas
      helmet({
        contentSecurityPolicy: {
          directives: {
            "default-src": ["'self'"],
            "base-uri": ["'self'"],
            "block-all-mixed-content": [],
            "font-src": ["'self'", "https:", "data:"],
            "img-src": ["'self'", "data:", "http://localhost:3100", "http://localhost:3000", process.env.BACKEND_URL || "http://localhost:3100"],
            "media-src": ["'self'", "http://localhost:3100", "http://localhost:3000", process.env.BACKEND_URL || "http://localhost:3100"],
            "frame-src": ["'self'", "http://localhost:3100", "http://localhost:3000", process.env.BACKEND_URL || "http://localhost:3100"],
            "frame-ancestors": ["'self'", "http://localhost:3101", "http://localhost:3001", process.env.FRONTEND_URL || "http://localhost:3101", "*"],
            "object-src": ["'self'", "http://localhost:3100", "http://localhost:3000", process.env.BACKEND_URL || "http://localhost:3100"],
            "script-src-attr": ["'none'"],
            "style-src": ["'self'", "https:", "'unsafe-inline'"],
            "upgrade-insecure-requests": []
          }
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false
      })(req, res, next);
    });
  }
  */

  console.info("cors domain ======>>>>", process.env.FRONTEND_URL);

  app.use(cookieParser());
  app.use(json({ limit: "50MB" }));
  app.use(
    urlencoded({ extended: true, limit: "50MB", parameterLimit: 200000 })
  );

  // Função auxiliar para modificar CSP (reutilizável)
  const modifyCSPForStatic = (cspValue: string): string => {
    if (!cspValue || typeof cspValue !== 'string') return cspValue;
    let modified = cspValue
      .replace(/frame-ancestors\s+['"]self['"]/gi, '')
      .replace(/frame-ancestors\s+self/gi, '')
      .replace(/frame-ancestors:\s*['"]self['"]/gi, '')
      .replace(/frame-ancestors:\s*self/gi, '');
    modified = modified.replace(/\s{2,}/g, ' ').replace(/;\s*;/g, ';').trim();
    if (!modified.includes('frame-ancestors')) {
      modified = modified + (modified.endsWith(';') ? ' ' : '; ') + 'frame-ancestors *';
    } else {
      modified = modified.replace(/frame-ancestors\s+[^;]*/gi, 'frame-ancestors *');
    }
    return modified;
  };

  // Servir arquivos estáticos da pasta uploads sem headers de segurança
  app.use("/uploads", (req, res, next) => {
    // Interceptar setHeader para modificar CSP
    const originalSetHeader = res.setHeader.bind(res);
    const originalGetHeader = res.getHeader.bind(res);
    const originalRemoveHeader = res.removeHeader.bind(res);
    
    res.setHeader = function(name: string, value: any): typeof res {
      const lowerName = name.toLowerCase();
      if (lowerName === 'content-security-policy' || lowerName === 'x-content-security-policy') {
        if (typeof value === 'string') {
          return originalSetHeader(name, modifyCSPForStatic(value));
        }
        return res;
      }
      if (lowerName === 'x-frame-options' && (value === 'SAMEORIGIN' || value === 'DENY')) {
        return res;
      }
      if (lowerName === 'frame-ancestors' && (value === "'self'" || value === '"self"' || value === 'self')) {
        return originalSetHeader(name, '*');
      }
      if (lowerName !== 'permissions-policy') {
        try {
          const existingPolicy = originalGetHeader('Permissions-Policy');
          if (!existingPolicy || (typeof existingPolicy === 'string' && !existingPolicy.includes('fullscreen'))) {
            originalSetHeader('Permissions-Policy', 'fullscreen=*');
          }
        } catch (e) {}
      }
      return originalSetHeader(name, value);
    };
    
    if (!res.headersSent) {
      try {
        const cspHeaders = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
        for (const headerName of cspHeaders) {
          const headerValue = originalGetHeader(headerName);
          if (headerValue && typeof headerValue === 'string') {
            const modifiedCSP = modifyCSPForStatic(headerValue);
            originalRemoveHeader(headerName);
            originalSetHeader('Content-Security-Policy', modifiedCSP);
          }
        }
        originalRemoveHeader('X-Frame-Options');
        originalRemoveHeader('x-frame-options');
        originalSetHeader('Permissions-Policy', 'fullscreen=*');
      } catch (e) {
        // Ignora erros
      }
    }
    next();
  }, expressStatic.static(path.resolve(__dirname, "../../uploads"), {
    setHeaders: (res, filePath) => {
      // Interceptar setHeader para garantir que CSP seja modificado
      const originalSetHeader = res.setHeader.bind(res);
      const originalGetHeader = res.getHeader.bind(res);
      const originalRemoveHeader = res.removeHeader.bind(res);
      
      res.setHeader = function(name: string, value: any): typeof res {
        const lowerName = name.toLowerCase();
        if (lowerName === 'content-security-policy' || lowerName === 'x-content-security-policy') {
          if (typeof value === 'string') {
            return originalSetHeader(name, modifyCSPForStatic(value));
          }
          return res;
        }
        if (lowerName === 'x-frame-options' && (value === 'SAMEORIGIN' || value === 'DENY')) {
          return res;
        }
        if (lowerName === 'frame-ancestors' && (value === "'self'" || value === '"self"' || value === 'self')) {
          return originalSetHeader(name, '*');
        }
        return originalSetHeader(name, value);
      };
      
      if (!res.headersSent) {
        try {
          const cspHeaders = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
          for (const headerName of cspHeaders) {
            const headerValue = originalGetHeader(headerName);
            if (headerValue && typeof headerValue === 'string') {
              const modifiedCSP = modifyCSPForStatic(headerValue);
              originalRemoveHeader(headerName);
              originalSetHeader('Content-Security-Policy', modifiedCSP);
            }
          }
          originalRemoveHeader('X-Frame-Options');
          originalRemoveHeader('x-frame-options');
          originalSetHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {
          // Ignora erros
        }
      }
    }
  }));
  
  // Alias para compatibilidade com mensagens antigas
  app.use("/arquivos", (req, res, next) => {
    // Interceptar setHeader para modificar CSP
    const originalSetHeader = res.setHeader.bind(res);
    const originalGetHeader = res.getHeader.bind(res);
    const originalRemoveHeader = res.removeHeader.bind(res);
    
    res.setHeader = function(name: string, value: any): typeof res {
      const lowerName = name.toLowerCase();
      if (lowerName === 'content-security-policy' || lowerName === 'x-content-security-policy') {
        if (typeof value === 'string') {
          return originalSetHeader(name, modifyCSPForStatic(value));
        }
        return res;
      }
      if (lowerName === 'x-frame-options' && (value === 'SAMEORIGIN' || value === 'DENY')) {
        return res;
      }
      if (lowerName === 'frame-ancestors' && (value === "'self'" || value === '"self"' || value === 'self')) {
        return originalSetHeader(name, '*');
      }
      if (lowerName !== 'permissions-policy') {
        try {
          const existingPolicy = originalGetHeader('Permissions-Policy');
          if (!existingPolicy || (typeof existingPolicy === 'string' && !existingPolicy.includes('fullscreen'))) {
            originalSetHeader('Permissions-Policy', 'fullscreen=*');
          }
        } catch (e) {}
      }
      return originalSetHeader(name, value);
    };
    
    if (!res.headersSent) {
      try {
        const cspHeaders = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
        for (const headerName of cspHeaders) {
          const headerValue = originalGetHeader(headerName);
          if (headerValue && typeof headerValue === 'string') {
            const modifiedCSP = modifyCSPForStatic(headerValue);
            originalRemoveHeader(headerName);
            originalSetHeader('Content-Security-Policy', modifiedCSP);
          }
        }
        originalRemoveHeader('X-Frame-Options');
        originalRemoveHeader('x-frame-options');
        originalSetHeader('Permissions-Policy', 'fullscreen=*');
      } catch (e) {
        // Ignora erros
      }
    }
    next();
  }, expressStatic.static(path.resolve(__dirname, "../../uploads"), {
    setHeaders: (res, filePath) => {
      // Interceptar setHeader para garantir que CSP seja modificado
      const originalSetHeader = res.setHeader.bind(res);
      const originalGetHeader = res.getHeader.bind(res);
      const originalRemoveHeader = res.removeHeader.bind(res);
      
      res.setHeader = function(name: string, value: any): typeof res {
        const lowerName = name.toLowerCase();
        if (lowerName === 'content-security-policy' || lowerName === 'x-content-security-policy') {
          if (typeof value === 'string') {
            return originalSetHeader(name, modifyCSPForStatic(value));
          }
          return res;
        }
        if (lowerName === 'x-frame-options' && (value === 'SAMEORIGIN' || value === 'DENY')) {
          return res;
        }
        if (lowerName === 'frame-ancestors' && (value === "'self'" || value === '"self"' || value === 'self')) {
          return originalSetHeader(name, '*');
        }
        return originalSetHeader(name, value);
      };
      
      if (!res.headersSent) {
        try {
          const cspHeaders = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
          for (const headerName of cspHeaders) {
            const headerValue = originalGetHeader(headerName);
            if (headerValue && typeof headerValue === 'string') {
              const modifiedCSP = modifyCSPForStatic(headerValue);
              originalRemoveHeader(headerName);
              originalSetHeader('Content-Security-Policy', modifiedCSP);
            }
          }
          originalRemoveHeader('X-Frame-Options');
          originalRemoveHeader('x-frame-options');
          originalSetHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {
          // Ignora erros
        }
      }
    }
  }));

  logger.info("express already in server!");
}
