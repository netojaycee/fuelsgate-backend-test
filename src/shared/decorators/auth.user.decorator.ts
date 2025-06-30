import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const AuthenticatedUser = createParamDecorator(
  async (_data: unknown, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    return req.user;
  },
);
