import { readFileSync } from "fs";
import moment from "moment";
import expressInstance, { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import routes from "../routes";
import uploadConfig from "../config/upload";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

export default async function modules(app): Promise<void> {
  const { version } = JSON.parse(readFileSync("./package.json").toString());
  const started = new Date();
  const { env } = process;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    serverName: env.BACKEND_URL,
    release: version
  });

  app.get("/health", async (req, res) => {
    let checkConnection;
    try {
      checkConnection = "Servidor disponível!";
    } catch (e) {
      checkConnection = `Servidor indisponível! ${e}`;
    }
    res.json({
      started: moment(started).format("DD/MM/YYYY HH:mm:ss"),
      currentVersion: version,
      uptime: (Date.now() - Number(started)) / 1000,
      statusService: checkConnection
    });
  });
  
  app.get('/', (req, res) => {
      // Interceptar setHeader ANTES de enviar para garantir remoção de headers
      const originalSetHeader = res.setHeader.bind(res);
      const originalSend = res.send.bind(res);
      const originalEnd = res.end.bind(res);
      
      res.setHeader = function(name: string, value: any) {
        const lowerName = name.toLowerCase();
        if (lowerName === 'content-security-policy' || 
            lowerName === 'x-content-security-policy' ||
            lowerName === 'x-frame-options' ||
            lowerName === 'frame-ancestors') {
          return res; // Não definir headers que bloqueiam iframes
        }
        // Adicionar Permissions-Policy para permitir fullscreen
        if (lowerName !== 'permissions-policy') {
          originalSetHeader('Permissions-Policy', 'fullscreen=*');
        }
        return originalSetHeader(name, value);
      };
      
      res.send = function(body?: any) {
        // Remover headers antes de enviar e adicionar Permissions-Policy
        if (!res.headersSent) {
          try {
            res.removeHeader('X-Frame-Options');
            res.removeHeader('Content-Security-Policy');
            res.setHeader('Permissions-Policy', 'fullscreen=*');
          } catch (e) {
            // Ignora se headers já foram enviados
          }
        }
        return originalSend(body);
      };
      
      res.end = function(chunk?: any, encoding?: any, cb?: any) {
        // Remover headers antes de finalizar e adicionar Permissions-Policy
        if (!res.headersSent) {
          try {
            res.removeHeader('X-Frame-Options');
            res.removeHeader('Content-Security-Policy');
            res.setHeader('Permissions-Policy', 'fullscreen=*');
          } catch (e) {
            // Ignora se headers já foram enviados
          }
        }
        return originalEnd(chunk, encoding, cb);
      };
      
      res.send(`Backend está funcionando corretamente. Acesse o frontend: <a href="${env.FRONTEND_URL}">${env.FRONTEND_URL}</a>`);
  });

  
  // Middleware para interceptar headers CSP adicionados pelo Sentry ou outros middlewares
  app.use((req, res, next) => {
    const originalSetHeader = res.setHeader.bind(res);
    const originalWriteHead = res.writeHead.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);
    const originalGetHeader = res.getHeader.bind(res);
    const originalRemoveHeader = res.removeHeader.bind(res);
    
    // Função para modificar CSP
    const modifyCSP = (cspValue: string): string => {
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
    
    // Interceptar setHeader
    res.setHeader = function(name: string, value: any) {
      const lowerName = name.toLowerCase();
      if (lowerName === 'x-frame-options' && (value === 'SAMEORIGIN' || value === 'DENY')) {
        return res;
      }
      if (lowerName === 'content-security-policy' || lowerName === 'x-content-security-policy') {
        if (typeof value === 'string') {
          return originalSetHeader(name, modifyCSP(value));
        }
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
    
    // Função para garantir headers corretos
    const ensureHeaders = () => {
      if (!res.headersSent) {
        try {
          const headerNames = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
          for (const headerName of headerNames) {
            const cspHeader = originalGetHeader(headerName);
            if (cspHeader && typeof cspHeader === 'string') {
              const modifiedCSP = modifyCSP(cspHeader);
              originalRemoveHeader(headerName);
              originalSetHeader('Content-Security-Policy', modifiedCSP);
            }
          }
          const xFrameOptions = originalGetHeader('X-Frame-Options') || originalGetHeader('x-frame-options');
          if (xFrameOptions === 'SAMEORIGIN' || xFrameOptions === 'DENY') {
            originalRemoveHeader('X-Frame-Options');
            originalRemoveHeader('x-frame-options');
          }
          originalSetHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {}
      }
    };
    
    res.send = function(body?: any) {
      ensureHeaders();
      return originalSend(body);
    };
    
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      ensureHeaders();
      return originalEnd(chunk, encoding, cb);
    };
    
    res.on('finish', ensureHeaders);
    res.on('close', ensureHeaders);
    
    next();
  });
  
  app.use(Sentry.Handlers.requestHandler());

  // Servir arquivos estáticos sem restrições de CSP e X-Frame-Options
  app.use("/public", (req, res, next) => {
    // Interceptar resposta para remover headers de segurança que bloqueiam iframes
    const originalSetHeader = res.setHeader.bind(res);
    const originalEnd = res.end.bind(res);
    const originalWriteHead = res.writeHead.bind(res);
    const originalSend = res.send.bind(res);
    const originalStatus = res.status.bind(res);
    
    res.setHeader = function(name: string, value: any) {
      const lowerName = name.toLowerCase();
      if (lowerName === 'content-security-policy' || 
          lowerName === 'x-content-security-policy' ||
          lowerName === 'x-frame-options' ||
          lowerName === 'frame-ancestors') {
        return res; // Não definir headers que bloqueiam iframes
      }
      // Adicionar Permissions-Policy para permitir fullscreen
      if (lowerName !== 'permissions-policy') {
        originalSetHeader('Permissions-Policy', 'fullscreen=*');
      }
      return originalSetHeader(name, value);
    };

    // Interceptar writeHead para remover headers e adicionar Permissions-Policy
    res.writeHead = function(statusCode?: number, statusMessage?: any, headers?: any) {
      if (headers) {
        const lowerHeaders: any = {};
        for (const key in headers) {
          const lowerKey = key.toLowerCase();
          if (lowerKey !== 'content-security-policy' && 
              lowerKey !== 'x-content-security-policy' &&
              lowerKey !== 'x-frame-options' &&
              lowerKey !== 'frame-ancestors') {
            lowerHeaders[key] = headers[key];
          }
        }
        // Adicionar Permissions-Policy para permitir fullscreen
        lowerHeaders['Permissions-Policy'] = 'fullscreen=*';
        return originalWriteHead(statusCode, statusMessage, lowerHeaders);
      }
      // Adicionar Permissions-Policy mesmo sem headers
      const headersWithPolicy: any = { 'Permissions-Policy': 'fullscreen=*' };
      return originalWriteHead(statusCode, statusMessage, headersWithPolicy);
    };

    // Interceptar status() para garantir que 404 também não tenha CSP e tenha Permissions-Policy
    res.status = function(code: number) {
      if (!res.headersSent) {
        try {
          res.removeHeader('X-Frame-Options');
          res.removeHeader('Content-Security-Policy');
          res.setHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {
          // Ignora se headers já foram enviados
        }
      }
      return originalStatus(code);
    };

    // Interceptar send() para remover headers e adicionar Permissions-Policy
    res.send = function(body?: any) {
      if (!res.headersSent) {
        try {
          res.removeHeader('X-Frame-Options');
          res.removeHeader('Content-Security-Policy');
          res.setHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {
          // Ignora se headers já foram enviados
        }
      }
      return originalSend(body);
    };

    // Interceptar end() para remover headers antes de enviar e adicionar Permissions-Policy
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      if (!res.headersSent) {
        try {
          res.removeHeader('X-Frame-Options');
          res.removeHeader('Content-Security-Policy');
          res.setHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {
          // Ignora se headers já foram enviados
        }
      }
      return originalEnd(chunk, encoding, cb);
    };

    next();
  }, expressInstance.static(uploadConfig.directory, {
    setHeaders: (res, path) => {
      // Interceptar setHeader para garantir que CSP seja modificado
      const originalSetHeader = res.setHeader.bind(res);
      const originalGetHeader = res.getHeader.bind(res);
      const originalRemoveHeader = res.removeHeader.bind(res);
      
      // Função para modificar CSP
      const modifyCSP = (cspValue: string): string => {
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
      
      // Interceptar setHeader temporariamente para esta resposta
      res.setHeader = function(name: string, value: any) {
        const lowerName = name.toLowerCase();
        if (lowerName === 'content-security-policy' || lowerName === 'x-content-security-policy') {
          if (typeof value === 'string') {
            return originalSetHeader(name, modifyCSP(value));
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
      
      // Garantir que PDFs tenham o Content-Type correto
      if (path.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
      }
      
      // Remover headers de segurança explicitamente e adicionar Permissions-Policy
      if (!res.headersSent) {
        try {
          // Verificar e modificar CSP existente
          const cspHeaders = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
          for (const headerName of cspHeaders) {
            const headerValue = originalGetHeader(headerName);
            if (headerValue && typeof headerValue === 'string') {
              const modifiedCSP = modifyCSP(headerValue);
              originalRemoveHeader(headerName);
              originalSetHeader('Content-Security-Policy', modifiedCSP);
            }
          }
          originalRemoveHeader('X-Frame-Options');
          originalRemoveHeader('x-frame-options');
          originalSetHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {
          // Ignora se headers já foram enviados
        }
      }
    }
  }), (req, res) => {
    // Middleware para tratar 404 em /public sem CSP mas com Permissions-Policy
    if (!res.headersSent) {
      try {
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.setHeader('Permissions-Policy', 'fullscreen=*');
      } catch (e) {
        // Ignora se headers já foram enviados
      }
      res.status(404).send('Arquivo não encontrado');
    }
  });

  app.use(routes);
  
  // Middleware FINAL para garantir headers corretos ANTES de enviar resposta
  // Este middleware é executado DEPOIS de todas as rotas e middlewares
  app.use((req, res, next) => {
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);
    const originalGetHeader = res.getHeader.bind(res);
    const originalSetHeader = res.setHeader.bind(res);
    const originalRemoveHeader = res.removeHeader.bind(res);
    
    // Função para modificar CSP
    const modifyCSP = (cspValue: string): string => {
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
    
    // Função para garantir headers corretos
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
    
    res.send = function(body?: any) {
      ensureHeaders();
      return originalSend(body);
    };
    
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      ensureHeaders();
      return originalEnd(chunk, encoding, cb);
    };
    
    res.on('finish', ensureHeaders);
    res.on('close', ensureHeaders);
    
    next();
  });
  
  app.use(Sentry.Handlers.errorHandler());
  
  // Middleware ULTRA FINAL - executado DEPOIS de TUDO, incluindo error handlers
  // Remove completamente CSP com frame-ancestors 'self' e garante Permissions-Policy
  app.use((req, res, next) => {
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);
    const originalJson = res.json.bind(res);
    const originalGetHeader = res.getHeader.bind(res);
    const originalSetHeader = res.setHeader.bind(res);
    const originalRemoveHeader = res.removeHeader.bind(res);
    
    const fixHeaders = () => {
      if (!res.headersSent) {
        try {
          // Remover TODOS os headers CSP que contenham frame-ancestors 'self'
          const cspHeaders = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
          for (const headerName of cspHeaders) {
            const headerValue = originalGetHeader(headerName);
            if (headerValue && typeof headerValue === 'string' && headerValue.includes('frame-ancestors')) {
              // Se contém frame-ancestors 'self', remover completamente ou substituir
              if (headerValue.includes("frame-ancestors") && (headerValue.includes("'self'") || headerValue.includes('"self"') || headerValue.match(/frame-ancestors\s+self/))) {
                // Substituir por frame-ancestors *
                const fixed = headerValue.replace(/frame-ancestors\s+['"]self['"]/gi, 'frame-ancestors *')
                                         .replace(/frame-ancestors\s+self/gi, 'frame-ancestors *')
                                         .replace(/frame-ancestors:\s*['"]self['"]/gi, 'frame-ancestors *')
                                         .replace(/frame-ancestors:\s*self/gi, 'frame-ancestors *');
                originalRemoveHeader(headerName);
                if (fixed.includes('frame-ancestors *')) {
                  originalSetHeader('Content-Security-Policy', fixed);
                } else {
                  originalSetHeader('Content-Security-Policy', fixed + (fixed.endsWith(';') ? ' ' : '; ') + 'frame-ancestors *');
                }
              }
            }
          }
          // Remover X-Frame-Options restritivos
          const xfo = originalGetHeader('X-Frame-Options') || originalGetHeader('x-frame-options');
          if (xfo === 'SAMEORIGIN' || xfo === 'DENY') {
            originalRemoveHeader('X-Frame-Options');
            originalRemoveHeader('x-frame-options');
          }
          // Sempre adicionar Permissions-Policy
          originalSetHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {
          // Ignora erros
        }
      }
    };
    
    res.send = function(body?: any) {
      fixHeaders();
      return originalSend(body);
    };
    
    res.json = function(body?: any) {
      fixHeaders();
      return originalJson(body);
    };
    
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      fixHeaders();
      return originalEnd(chunk, encoding, cb);
    };
    
    res.on('finish', fixHeaders);
    res.on('close', fixHeaders);
    
    next();
  });

  // error handle
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {
    // Interceptar resposta de erro para garantir headers corretos
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalStatus = res.status.bind(res);
    const originalGetHeader = res.getHeader.bind(res);
    const originalSetHeader = res.setHeader.bind(res);
    const originalRemoveHeader = res.removeHeader.bind(res);
    
    // Função para modificar CSP
    const modifyCSP = (cspValue: string): string => {
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
    
    const fixHeaders = () => {
      if (!res.headersSent) {
        try {
          const cspHeaders = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'x-content-security-policy'];
          for (const headerName of cspHeaders) {
            const headerValue = originalGetHeader(headerName);
            if (headerValue && typeof headerValue === 'string') {
              const modifiedCSP = modifyCSP(headerValue);
              originalRemoveHeader(headerName);
              originalSetHeader('Content-Security-Policy', modifiedCSP);
            }
          }
          const xfo = originalGetHeader('X-Frame-Options') || originalGetHeader('x-frame-options');
          if (xfo === 'SAMEORIGIN' || xfo === 'DENY') {
            originalRemoveHeader('X-Frame-Options');
            originalRemoveHeader('x-frame-options');
          }
          originalSetHeader('Permissions-Policy', 'fullscreen=*');
        } catch (e) {}
      }
    };
    
    res.json = function(body?: any) {
      fixHeaders();
      return originalJson(body);
    };
    
    res.send = function(body?: any) {
      fixHeaders();
      return originalSend(body);
    };
    
    res.status = function(code: number) {
      fixHeaders();
      return originalStatus(code);
    };
    
    if (err instanceof AppError) {
      if (err.statusCode === 403) {
        logger.warn(err);
      } else {
        logger.error(err);
      }
      fixHeaders();
      return res.status(err.statusCode).json({ error: err.message });
    }

    logger.error(err);
    fixHeaders();
    return res.status(500).json({ error: `Internal server error: ${err}` });
  });

  logger.info("modules routes already in server!");
}
