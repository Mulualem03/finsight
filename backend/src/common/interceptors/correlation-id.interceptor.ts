import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ulid } from 'ulid';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const incoming = req.headers['x-correlation-id'];
    const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : ulid();

    req.headers['x-correlation-id'] = id;
    res.setHeader('x-correlation-id', id);

    return next.handle();
  }
}
