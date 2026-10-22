
/**
 * Utilitário padronizado para respostas de erro IPC.
 * Formato canônico: { success: false, error: { code, message, details?, stack? } }
 */

export const ErrorCodes = {
  // Database errors
  DB_NOT_FOUND: "ERR-DB-001",
  DB_CONSTRAINT: "ERR-DB-002",
  DB_CONNECTION: "ERR-DB-003",
  DB_QUERY_FAILED: "ERR-DB-004",
  DB_TRANSACTION_FAILED: "ERR-DB-005",
  
  // AI errors
  AI_MODEL_NOT_FOUND: "ERR-AI-001",
  AI_OUT_OF_MEMORY: "ERR-AI-002",
  AI_LOAD_MODEL_FAILED: "ERR-AI-003",
  AI_CONTEXT_SIZE: "ERR-AI-004",
  AI_RATE_LIMIT: "ERR-AI-429",
  AI_INTERNAL: "ERR-AI-500",
  
  // System errors
  SYS_PERMISSION_DENIED: "ERR-SYS-001",
  SYS_FILE_NOT_FOUND: "ERR-SYS-002",
  SYS_INVALID_INPUT: "ERR-SYS-003",
  SYS_INTERNAL: "ERR-SYS-500",
  
  // IPC errors
  IPC_INVALID_PAYLOAD: "ERR-IPC-001",
  IPC_HANDLER_NOT_FOUND: "ERR-IPC-002",
  IPC_INTERNAL: "ERR-IPC-500",
};

function mapErrorToCode(error) {
  const message = error?.message || String(error);
  
  if (message.includes("not found") || message.includes("não encontrado")) {
    return ErrorCodes.DB_NOT_FOUND;
  }
  if (message.includes("constraint") || message.includes("UNIQUE constraint")) {
    return ErrorCodes.DB_CONSTRAINT;
  }
  if (message.includes("VRAM") || message.includes("out of memory")) {
    return ErrorCodes.AI_OUT_OF_MEMORY;
  }
  if (message.includes("Failed to load model") || message.includes("loadModel")) {
    return ErrorCodes.AI_LOAD_MODEL_FAILED;
  }
  if (message.includes("context size") || message.includes("context length")) {
    return ErrorCodes.AI_CONTEXT_SIZE;
  }
  if (message.includes("permission denied") || message.includes("EPERM") || message.includes("EACCES")) {
    return ErrorCodes.SYS_PERMISSION_DENIED;
  }
  if (message.includes("Rate limit")) {
    return ErrorCodes.AI_RATE_LIMIT;
  }
  if (message.includes("Invalid") || message.includes("inválid")) {
    return ErrorCodes.SYS_INVALID_INPUT;
  }
  
  return ErrorCodes.SYS_INTERNAL;
}

export function createErrorResponse(error, customCode = null, details = null, includeStack = false) {
  const isDev = process.env.NODE_ENV === "development";
  const code = customCode || mapErrorToCode(error);
  const message = error?.message || String(error);
  
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  
  if (details) {
    response.error.details = details;
  }
  
  if (includeStack && isDev && error?.stack) {
    response.error.stack = error.stack;
  }
  
  return response;
}

export function createSuccessResponse(data) {
  if (Array.isArray(data)) {
    return {
      success: true,
      data,
    };
  }
  if (data === null || typeof data !== "object") {
    return {
      success: true,
      data,
    };
  }
  return {
    success: true,
    ...data,
  };
}

export function tryCatch(handler) {
  return async (...args) => {
    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      console.error(`[IPC ERROR] ${handler.name || "anonymous"}:`, error);
      return createErrorResponse(error);
    }
  };
}

