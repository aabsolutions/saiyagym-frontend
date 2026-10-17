import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { API_PREFIX } from './api-request';

export const baseUrlInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith(API_PREFIX)
    ? next(req.clone({ url: environment.apiUrl + req.url }))
    : next(req);
