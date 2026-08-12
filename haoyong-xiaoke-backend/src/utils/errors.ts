export class AppError extends Error {
  public code: number;
  public statusCode: number;

  constructor(message: string, code: number = 500, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = '参数错误') {
    super(message, 400, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未认证') {
    super(message, 401, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409, 409);
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string = '业务逻辑错误') {
    super(message, 422, 422);
  }
}

export class BusinessError extends AppError {
  constructor(message: string = '业务逻辑错误', code: number = 422) {
    super(message, code, code);
  }
}
