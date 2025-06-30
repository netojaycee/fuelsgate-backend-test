import { Response } from 'express';

export const errorResponse = (
  errors: string | [],
  message: string,
  statusCode: number,
  res: Response,
) => {
  return res.status(statusCode).json({
    errors,
    message,
    statusCode,
  });
};
