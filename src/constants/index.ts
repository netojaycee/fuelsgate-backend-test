import 'dotenv/config';
export const DATABASE_CONNECTION_URL = process.env.DB_URL;
export const TOKEN_SECRET = process.env.JWT_SECRET;
export const EMAIL_HOST = process.env.EMAIL_HOST;
export const EMAIL_USERNAME = process.env.EMAIL_USERNAME;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
export const PORT = process.env.PORT;
export const EMAIL_PORT = parseInt(process.env.EMAIL_PORT);
export const FRONTEND_URL = process.env.FRONTEND_URL;
