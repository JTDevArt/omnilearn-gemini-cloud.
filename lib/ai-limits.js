import rateLimit from 'express-rate-limit';
import { createHash } from 'node:crypto';

export function positiveEnvInteger(env, name, fallback) {
  if (env[name] === undefined || env[name] === '') return fallback;
  const value = Number(env[name]);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}
export function createAiDailyLimiter(env = process.env) {
  const windowMs = 24 * 60 * 60 * 1000;
  const handler = (_req, res) => res.status(429).json({
    error:'Batas permintaan AI harian tercapai. Coba lagi setelah periode batas berakhir.',
    code:'AI_DAILY_LIMIT', stage:'ai-admission',
  });
  const ip = rateLimit({windowMs, limit:positiveEnvInteger(env, 'AI_DAILY_LIMIT_PER_IP', 200),
    standardHeaders:'draft-7', legacyHeaders:false, handler});
  const session = rateLimit({windowMs, limit:positiveEnvInteger(env, 'AI_DAILY_LIMIT_PER_SESSION', 100),
    standardHeaders:'draft-7', legacyHeaders:false, handler,
    keyGenerator:req => createHash('sha256').update(String(req.body?.sessionId || req.headers['x-session-id'] || req.ip).slice(0, 128)).digest('hex')});
  return (req, res, next) => {
    if (req.method !== 'POST' || !/^\/api\/(?:chat|study|source\/analyze|exam\/grade|speech|research(?:\/.*)?)(?:\/)?$/.test(req.path)) return next();
    ip(req, res, () => session(req, res, next));
  };
}
