import { z } from 'zod';
import { asyncHandler as handle } from '../utils/AppError.js';
import * as Auth from '../services/authService.js';

const email = z.string().email();
const registerSchema = z.object({
  name: z.string().min(2).max(100), email,
  phone: z.string().regex(/^\+?[0-9]{9,15}$/, 'phone'), password: z.string().min(8).max(100),
  language: z.enum(['en', 'am']).default('en'),
});
const verifySchema = z.object({ email, emailCode: z.string().length(6).optional(), phoneCode: z.string().length(6).optional() });
const loginSchema = z.object({ email, password: z.string().min(1) });
const profileSchema = z.object({ language: z.enum(['en', 'am']).optional(), name: z.string().min(2).max(100).optional() });

export const register = handle(async (req, res) => res.status(201).json(await Auth.register(registerSchema.parse(req.body))));
export const verify = handle((req, res) => res.json(Auth.verifyContacts(verifySchema.parse(req.body))));
export const resend = handle(async (req, res) => res.json(await Auth.resend(z.object({ email }).parse(req.body).email)));
export const login = handle(async (req, res) => {
  const d = loginSchema.parse(req.body);
  res.json(await Auth.login(d.email, d.password));
});
export const me = (req, res) => res.json({ user: req.user });
export const updateMe = handle((req, res) => res.json(Auth.updateMe(req.user, profileSchema.parse(req.body))));
