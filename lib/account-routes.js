import rateLimit from 'express-rate-limit';
import { FirebaseAccounts } from './cloud-account.js';
import { integrationError } from './external-http.js';
export function installAccountRoutes(
  app,
  { accounts = new FirebaseAccounts() } = {}
) {
  const limiter = rateLimit({
    windowMs: 900000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: 'Terlalu banyak percobaan akun. Tunggu beberapa menit.',
      code: 'ACCOUNT_RATE_LIMIT',
    },
  });
  const wrap = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
  const cookies = (req) =>
    Object.fromEntries(
      String(req.headers.cookie || '')
        .split(';')
        .map((item) => {
          const index = item.indexOf('=');
          if (index < 0) return ['', ''];
          try {
            return [
              item.slice(0, index).trim(),
              decodeURIComponent(item.slice(index + 1)),
            ];
          } catch {
            return ['', ''];
          }
        })
    );
  const setTokens = (req, res, data) => {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || req.secure,
      sameSite: 'strict',
      path: '/api',
    };
    res.cookie('omni_id', data.idToken, { ...options, maxAge: 3600000 });
    res.cookie('omni_refresh', data.refreshToken, {
      ...options,
      maxAge: 2592000000,
    });
  };
  const session = async (req, res, forceRefresh = false) => {
    accounts.requireConfig();
    const current = cookies(req);
    let token = current.omni_id;
    if ((!token || forceRefresh) && current.omni_refresh) {
      const data = await accounts.refresh(current.omni_refresh, req.aiSignal);
      setTokens(req, res, data);
      token = data.idToken;
    }
    if (!token)
      throw integrationError(
        'Masuk untuk menggunakan cloud.',
        'AUTH_REQUIRED',
        401
      );
    try {
      return { user: await accounts.verify(token, req.aiSignal), token };
    } catch (error) {
      if (error.status === 401 && current.omni_refresh && !forceRefresh) {
        const data = await accounts.refresh(current.omni_refresh, req.aiSignal);
        setTokens(req, res, data);
        return {
          user: await accounts.verify(data.idToken, req.aiSignal),
          token: data.idToken,
        };
      }
      throw error;
    }
  };
  app.get('/api/account/status', (_req, res) => res.json(accounts.status()));
  for (const [route, register] of [
    ['login', false],
    ['register', true],
  ])
    app.post(
      `/api/account/${route}`,
      limiter,
      wrap(async (req, res) => {
        const data = await accounts.login(
          req.body?.email,
          req.body?.password,
          register,
          req.aiSignal
        );
        setTokens(req, res, data);
        const user = await accounts.verify(data.idToken, req.aiSignal);
        res.json({ user, verificationSent: data.verificationSent });
      })
    );
  app.get(
    '/api/account/me',
    wrap(async (req, res) => res.json({ user: (await session(req, res)).user }))
  );
  app.post(
    '/api/account/refresh',
    limiter,
    wrap(async (req, res) =>
      res.json({ user: (await session(req, res, true)).user })
    )
  );
  app.post('/api/account/logout', (req, res) => {
    for (const name of ['omni_id', 'omni_refresh'])
      res.clearCookie(name, {
        path: '/api',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production' || req.secure,
      });
    res.json({ loggedOut: true });
  });
  app.post(
    '/api/account/reset-password',
    limiter,
    wrap(async (req, res) => {
      accounts.requireConfig();
      const email = req.body?.email;
      if (
        typeof email !== 'string' ||
        email.length > 254 ||
        !/^\S+@\S+\.\S+$/.test(email)
      )
        throw integrationError(
          'Email tidak valid.',
          'INVALID_ACCOUNT_INPUT',
          400
        );
      try {
        await accounts.identity(
          'sendOobCode',
          { requestType: 'PASSWORD_RESET', email },
          req.aiSignal
        );
      } catch (error) {
        if (!['ACCOUNT_REQUEST_REJECTED'].includes(error.code)) throw error;
      }
      res.json({
        message:
          'Jika akun tersedia dan pengiriman email dikonfigurasi, tautan reset akan dikirim.',
      });
    })
  );
  app.post(
    '/api/account/verify-email',
    limiter,
    wrap(async (req, res) => {
      const { token } = await session(req, res);
      await accounts.identity(
        'sendOobCode',
        { requestType: 'VERIFY_EMAIL', idToken: token },
        req.aiSignal
      );
      res.json({ sent: true });
    })
  );
  app.post(
    '/api/account/profile',
    limiter,
    wrap(async (req, res) => {
      const { token } = await session(req, res);
      if (
        typeof req.body?.displayName !== 'string' ||
        req.body.displayName.trim().length > 80
      )
        throw integrationError(
          'Nama profil tidak valid.',
          'INVALID_ACCOUNT_INPUT',
          400
        );
      await accounts.identity(
        'update',
        { idToken: token, displayName: req.body.displayName.trim() },
        req.aiSignal
      );
      res.json({ user: await accounts.verify(token, req.aiSignal) });
    })
  );
  app.get(
    '/api/cloud/library',
    wrap(async (req, res) => {
      const { user, token } = await session(req, res);
      res.json({
        ...(await accounts.readLibrary(user, token, req.aiSignal)),
        ownerUid: user.uid,
      });
    })
  );
  app.post(
    '/api/cloud/library',
    wrap(async (req, res) => {
      const { user, token } = await session(req, res);
      if (req.body?.expectedOwnerUid && req.body.expectedOwnerUid !== user.uid)
        throw integrationError(
          'Akun berubah selama sinkronisasi. Muat ulang.',
          'CLOUD_OWNER_MISMATCH',
          403
        );
      res.json(
        await accounts.writeLibrary(
          user,
          token,
          req.body?.snapshot,
          req.body?.expectedRevision,
          req.aiSignal
        )
      );
    })
  );
  return accounts;
}
