import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (
    data: keyof any | undefined,
    ctx: ExecutionContext,
  ) => {
    const request = ctx
      .switchToHttp()
      .getRequest();

    const user = request.user;

    if (!data) {
      return user;
    }

    return user?.[data];
  },
);