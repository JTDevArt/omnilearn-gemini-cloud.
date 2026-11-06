import { createHash } from 'node:crypto';
import { boundedFetch, integrationError } from './external-http.js';
import { validateLibrary } from '../public/backup-format.js';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const field = (value) => ({ stringValue: String(value) });
const value = (field) => field?.stringValue;
export class FirebaseAccounts {
  constructor({
    apiKey = process.env.FIREBASE_WEB_API_KEY,
    projectId = process.env.FIREBASE_PROJECT_ID,
    fetcher = fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.fetcher = fetcher;
    if (projectId && !/^[a-z][a-z0-9-]{4,62}$/.test(projectId))
      throw new Error('FIREBASE_PROJECT_ID tidak valid.');
  }
  get configured() {
    return Boolean(this.apiKey && this.projectId);
  }
  status() {
    return {
      configured: this.configured,
      provider: 'Firebase Authentication + Firestore',
      missing: ['FIREBASE_PROJECT_ID', 'FIREBASE_WEB_API_KEY'].filter(
        (name) =>
          !{
            FIREBASE_PROJECT_ID: this.projectId,
            FIREBASE_WEB_API_KEY: this.apiKey,
          }[name]
      ),
      cloudOriginalFiles: false,
    };
  }
  requireConfig() {
    if (!this.configured)
      throw integrationError(
        'Akun cloud belum dikonfigurasi. Data perangkat tetap dapat digunakan.',
        'CLOUD_NOT_CONFIGURED'
      );
  }
  async identity(action, body, signal) {
    this.requireConfig();
    const response = await boundedFetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(this.apiKey)}`,
      {
        fetcher: this.fetcher,
        signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!response.ok)
      throw integrationError(
        'Permintaan akun ditolak. Periksa email, sandi, verifikasi dan konfigurasi Firebase.',
        'ACCOUNT_REQUEST_REJECTED',
        response.status === 429 ? 429 : 400
      );
    return response.json();
  }
  async login(email, password, register = false, signal) {
    if (
      typeof email !== 'string' ||
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof password !== 'string' ||
      password.length < (register ? 8 : 1) ||
      password.length > 256
    )
      throw integrationError(
        'Email dan sandi tidak valid; akun baru memerlukan minimal 8 karakter.',
        'INVALID_ACCOUNT_INPUT',
        400
      );
    const data = await this.identity(
      register ? 'signUp' : 'signInWithPassword',
      { email, password, returnSecureToken: true },
      signal
    );
    if (!data.idToken || !data.refreshToken)
      throw integrationError(
        'Respons autentikasi belum lengkap.',
        'ACCOUNT_RESPONSE_INVALID'
      );
    let verificationSent = false;
    if (register) {
      try {
        await this.identity(
          'sendOobCode',
          { requestType: 'VERIFY_EMAIL', idToken: data.idToken },
          signal
        );
        verificationSent = true;
      } catch {}
    }
    return { ...data, verificationSent };
  }
  async refresh(refreshToken, signal) {
    this.requireConfig();
    const response = await boundedFetch(
      `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(this.apiKey)}`,
      {
        fetcher: this.fetcher,
        signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
      }
    );
    if (!response.ok)
      throw integrationError(
        'Sesi kedaluwarsa. Masuk kembali.',
        'ACCOUNT_SESSION_EXPIRED',
        401
      );
    const data = response.json();
    if (!data.id_token || !data.refresh_token)
      throw integrationError(
        'Respons sesi tidak valid.',
        'ACCOUNT_SESSION_EXPIRED',
        401
      );
    return { idToken: data.id_token, refreshToken: data.refresh_token };
  }
  async verify(idToken, signal) {
    if (typeof idToken !== 'string' || idToken.length > 10000)
      throw integrationError(
        'Masuk untuk mengakses data cloud.',
        'AUTH_REQUIRED',
        401
      );
    let result;
    try {
      result = await this.identity('lookup', { idToken }, signal);
    } catch (error) {
      if (error.code === 'ACCOUNT_REQUEST_REJECTED')
        throw integrationError(
          'Sesi tidak valid atau telah berakhir.',
          'AUTH_REQUIRED',
          401
        );
      throw error;
    }
    const user = result.users?.[0];
    if (!user?.localId || !/^[\w-]{1,128}$/.test(user.localId) || user.disabled)
      throw integrationError('Sesi akun tidak valid.', 'AUTH_REQUIRED', 401);
    return {
      uid: user.localId,
      email: user.email || '',
      emailVerified: user.emailVerified === true,
      displayName: user.displayName || '',
    };
  }
  base(uid) {
    if (!/^[\w-]{1,128}$/.test(uid))
      throw integrationError(
        'Identitas akun tidak valid.',
        'AUTH_REQUIRED',
        401
      );
    return `projects/${this.projectId}/databases/(default)/documents/users/${uid}`;
  }
  async firestore(path, token, { method = 'GET', body, signal } = {}) {
    this.requireConfig();
    const response = await boundedFetch(
      `https://firestore.googleapis.com/v1/${path}`,
      {
        fetcher: this.fetcher,
        signal,
        maxBytes: 16 * 1024 * 1024,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      const status =
        response.status === 409 ||
        response.status === 412 ||
        /FAILED_PRECONDITION|ABORTED/.test(response.text)
          ? 409
          : response.status === 403
            ? 403
            : 503;
      throw integrationError(
        status === 409
          ? 'Pustaka cloud berubah. Ambil versi cloud sebelum mengirim perubahan.'
          : 'Akses database ditolak atau database belum siap. Periksa rules, akun, dan konfigurasi.',
        status === 409 ? 'SYNC_CONFLICT' : 'CLOUD_DATABASE_UNAVAILABLE',
        status
      );
    }
    return response.json();
  }
  async readLibrary(user, token, signal) {
    const base = this.base(user.uid),
      head = await this.firestore(`${base}/sync/head`, token, { signal });
    if (!head) return { revision: null, snapshot: null };
    const ids = head.fields?.resourceIds?.arrayValue?.values?.map(value) || [];
    if (ids.length > 350 || ids.some((id) => !/^[a-f0-9]{64}$/.test(id)))
      throw integrationError('Indeks cloud tidak valid.', 'CLOUD_DATA_INVALID');
    const resources = [];
    let pageToken = '';
    const seenPages = new Set();
    let pageCount = 0;
    do {
      if (++pageCount > 25 || seenPages.has(pageToken))
        throw integrationError(
          'Paginasi cloud tidak valid atau terlalu besar.',
          'CLOUD_DATA_INVALID'
        );
      seenPages.add(pageToken);
      const page = await this.firestore(
        `${base}/resources?pageSize=20${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`,
        token,
        { signal }
      );
      if (!page) break;
      for (const doc of page.documents || []) {
        const id = doc.name.split('/').at(-1);
        if (!ids.includes(id)) continue;
        if (value(doc.fields.ownerUid) !== user.uid)
          throw integrationError(
            'Pemilik sumber cloud tidak cocok.',
            'CLOUD_OWNER_MISMATCH',
            403
          );
        const payload = value(doc.fields.payload);
        if (typeof payload !== 'string' || payload.length > 700000)
          throw integrationError(
            'Data cloud tidak valid.',
            'CLOUD_DATA_INVALID'
          );
        resources.push({
          kind: value(doc.fields.kind),
          sourceId: value(doc.fields.sourceId),
          version: Number(doc.fields.sourceVersion?.integerValue),
          payload: JSON.parse(payload),
        });
      }
      pageToken = page.nextPageToken || '';
      if (resources.length > 350)
        throw integrationError(
          'Data cloud melampaui batas.',
          'CLOUD_DATA_INVALID'
        );
    } while (pageToken);
    if (resources.length !== ids.length)
      throw integrationError(
        'Sumber cloud belum lengkap. Coba lagi.',
        'CLOUD_DATA_INCOMPLETE'
      );
    const metadata = resources.find((r) => r.kind === 'settings')?.payload || {
      schemaVersion: 1,
    };
    const sources = resources
      .filter((r) => r.kind === 'source')
      .map((r) => ({
        ...r.payload,
        versions: resources
          .filter((v) => v.kind === 'version' && v.sourceId === r.sourceId)
          .sort((a, b) => a.version - b.version)
          .map((v) => v.payload),
      }));
    const latest = await this.firestore(`${base}/sync/head`, token, { signal });
    if (latest?.updateTime !== head.updateTime)
      throw integrationError(
        'Data cloud berubah saat dimuat. Coba lagi.',
        'SYNC_CONFLICT',
        409
      );
    return {
      revision: head.updateTime,
      snapshot: validateLibrary({ ...metadata, sources }),
    };
  }
  async writeLibrary(user, token, snapshot, expectedRevision, signal) {
    if (!user.emailVerified)
      throw integrationError(
        'Verifikasi email sebelum mengirim data ke cloud.',
        'EMAIL_NOT_VERIFIED',
        403
      );
    validateLibrary(snapshot);
    const base = this.base(user.uid),
      head = await this.firestore(`${base}/sync/head`, token, { signal });
    if ((head?.updateTime || null) !== (expectedRevision || null))
      throw integrationError(
        'Pustaka cloud berubah. Ambil data cloud sebelum menyimpan.',
        'SYNC_CONFLICT',
        409
      );
    const resources = [],
      { sources, clearedAt, ...settings } = snapshot;
    resources.push({
      kind: 'settings',
      sourceId: '',
      version: 0,
      payload: settings,
    });
    for (const source of sources) {
      const { versions, ...data } = source;
      resources.push({
        kind: 'source',
        sourceId: source.id,
        version: source.version,
        payload: data,
      });
      for (const version of versions || [])
        resources.push({
          kind: 'version',
          sourceId: source.id,
          version: version.version,
          payload: version,
        });
    }
    if (resources.length > 350)
      throw integrationError(
        'Pustaka terlalu besar untuk satu sinkronisasi (maksimal 350 sumber/versi).',
        'SYNC_TOO_LARGE',
        413
      );
    const ids = [],
      writes = [],
      updatedAt = new Date().toISOString();
    for (const resource of resources) {
      const id = hash(
          JSON.stringify([resource.kind, resource.sourceId, resource.version])
        ),
        payload = JSON.stringify(resource.payload);
      if (new TextEncoder().encode(payload).length > 700000)
        throw integrationError(
          'Satu sumber terlalu besar untuk dokumen cloud. Ekspor arsip atau pisahkan sumber.',
          'SYNC_TOO_LARGE',
          413
        );
      ids.push(id);
      writes.push({
        update: {
          name: `${base}/resources/${id}`,
          fields: {
            ownerUid: field(user.uid),
            kind: field(resource.kind),
            sourceId: field(resource.sourceId),
            sourceVersion: { integerValue: String(resource.version) },
            payload: field(payload),
            updatedAt: { timestampValue: updatedAt },
          },
        },
      });
    }
    const previous =
      head?.fields?.resourceIds?.arrayValue?.values?.map(value) || [];
    for (const id of previous) {
      if (!/^[a-f0-9]{64}$/.test(id))
        throw integrationError(
          'Indeks cloud tidak valid.',
          'CLOUD_DATA_INVALID'
        );
      if (!ids.includes(id)) writes.push({ delete: `${base}/resources/${id}` });
    }
    if (writes.length >= 499)
      throw integrationError(
        'Terlalu banyak perubahan sekaligus. Ekspor cadangan dan sinkronkan pustaka lebih kecil.',
        'SYNC_TOO_LARGE',
        413
      );
    writes.push({
      update: {
        name: `${base}/sync/head`,
        fields: {
          ownerUid: field(user.uid),
          resourceIds: { arrayValue: { values: ids.map(field) } },
          updatedAt: { timestampValue: updatedAt },
        },
      },
      currentDocument: head
        ? { updateTime: head.updateTime }
        : { exists: false },
    });
    const response = await this.firestore(
      `projects/${this.projectId}/databases/(default)/documents:commit`,
      token,
      { method: 'POST', body: { writes }, signal }
    );
    return { revision: response.writeResults.at(-1).updateTime, updatedAt };
  }
}
