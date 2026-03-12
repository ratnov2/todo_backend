// auth-exception.filter.ts
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    UnauthorizedException,
    HttpException,
    Logger,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  
  const COOKIE_OPTS = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: false, // true на prod over https
    path: '/',
  };
  
  @Catch(UnauthorizedException)
  export class AuthExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AuthExceptionFilter.name);
  
    catch(exception: UnauthorizedException | HttpException, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const req = ctx.getRequest<Request>();
      const res = ctx.getResponse<Response>();
  
      // Попытаемся прочитать authType из exception.response
      let authType: 'access' | 'refresh' | 'both' | undefined;
  
      try {
        const response = exception.getResponse();
        if (typeof response === 'object' && response !== null && (response as any).authType) {
          authType = (response as any).authType;
        }
      } catch (e) {
        // игнорируем
      }
  
      // Фолбэк: если мета нет — определим по присутствию cookie / заголовков
      if (!authType) {
        const hasRefreshCookie = !!req.cookies?.refresh;
        const hasAccessCookie = !!req.cookies?.access;
        const hasAuthHeader = !!req.headers?.authorization;
  
        if (hasRefreshCookie && !hasAuthHeader) authType = 'refresh';
        else if (hasAccessCookie || hasAuthHeader) authType = 'access';
        else if (hasRefreshCookie && hasAccessCookie) authType = 'both';
      }
  
      // Выполняем очистку безопасно
      if (authType === 'refresh' || authType === 'both') {
        try {
          res.clearCookie('refresh', COOKIE_OPTS);
        } catch (e) {
          this.logger.warn('Failed to clear refresh cookie', e);
        }
      }
  
      if (authType === 'access' || authType === 'both') {
        try {
          res.clearCookie('access', COOKIE_OPTS);
        } catch (e) {
          this.logger.warn('Failed to clear access cookie', e);
        }
      }
  
      // Логирование для диагностики
      this.logger.debug({
        path: req.path,
        authType,
        message: typeof exception.getResponse() === 'string' ? exception.getResponse() : (exception.getResponse() as any)?.message,
      });
  
      // Обычный ответ 401
      const status = exception.getStatus?.() ?? 401;
      const message = (exception.getResponse && typeof exception.getResponse() === 'object')
        ? ((exception.getResponse() as any).message || 'Unauthorized')
        : (exception.message || 'Unauthorized');
  
      res.status(status).json({
        statusCode: status,
        message,
      });
    }
  }
  