import jwt from 'jsonwebtoken';
import { config } from '../config.js';
export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpires });
export const readToken = (token) => jwt.verify(token, config.jwtSecret);
