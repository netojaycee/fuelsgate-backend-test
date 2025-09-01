import { Response } from 'express';

export const errorResponse = (
  errors: string | [],
  message: string,
  statusCode: number,
  res: Response,
) => {
  const formattedStatusCode = (statusCode ?? 500);
  return res.status(formattedStatusCode).json({
    errors,
    message,
    statusCode: formattedStatusCode,
  });
};
