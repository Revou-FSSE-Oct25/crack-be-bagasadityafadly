import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Usage: @GetUser() user  →  gives you the full user object
// Usage: @GetUser('id') id  →  gives you just the user's id
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);