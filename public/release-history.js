// Public, immutable changelog data. Never treat an unreleased milestone as production-shipped.
export const CHANGE_CATEGORIES = Object.freeze([
  'Added', 'Improved', 'Fixed', 'Security', 'Performance',
  'Accessibility', 'UI/UX', 'AI & OCR', 'Infrastructure', 'Migration'
]);
export const CHANGE_STATUSES = Object.freeze(['implemented-local', 'shipped', 'partial', 'blocked']);
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const COMMIT = /^[a-f0-9]{40}$/;
const own = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function validateReleaseManifest(input) {
  if (!own(input) || input.schemaVersion !== 1 || !Array.isArray(input.releases))
    throw new Error('Format riwayat versi tidak valid.');
  const seen = new Set();
  for (const release of input.releases) {
    if (!own(release) || !SEMVER.test(release.version || '') || seen.has(release.version))
      throw new Error('Nomor versi tidak valid atau berulang.');
    seen.add(release.version);
    if (typeof release.title !== 'string' || !release.title.trim() ||
        typeof release.summary !== 'string' ||
        !['in-development', 'released'].includes(release.status) ||
        (release.releasedAt !== null && !/^\d{4}-\d{2}-\d{2}$/.test(release.releasedAt)) ||
        !Array.isArray(release.changes) || !Array.isArray(release.knownLimitations))
      throw new Error('Metadata rilis tidak lengkap.');
    if (release.status === 'released' && release.releasedAt === null)
      throw new Error('Rilis selesai wajib memiliki tanggal.');
    if (release.knownLimitations.some(x => typeof x !== 'string'))
      throw new Error('Daftar keterbatasan tidak valid.');
    for (const change of release.changes) {
      if (!own(change) || typeof change.title !== 'string' || !change.title.trim() ||
          !CHANGE_CATEGORIES.includes(change.category) ||
          !CHANGE_STATUSES.includes(change.status) ||
          !Array.isArray(change.files) ||
          change.files.some(file => typeof file !== 'string' || !file ||
            file.includes('..') || file.startsWith('/') || file.includes('\\')) ||
          (change.commit !== null && !COMMIT.test(change.commit || '')))
        throw new Error('Catatan perubahan tidak valid.');
      if (release.status !== 'released' && change.status === 'shipped')
        throw new Error('Perubahan belum rilis tidak boleh ditandai shipped.');
    }
  }
  return input;
}

export function filterReleaseChanges(changes, { query = '', category = 'all' } = {}) {
  const normalized = String(query).trim().toLocaleLowerCase('id');
  return changes.filter(change =>
    (category === 'all' || change.category === category) &&
    (normalized === '' || [change.title, change.category, ...change.files]
      .join(' ').toLocaleLowerCase('id').includes(normalized))
  );
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = String(value);
  return node;
}

export function mountReleaseHistory(host, input) {
  const manifest = validateReleaseManifest(input);
  host.replaceChildren();
  const filterRow = element('div', 'release-filters');
  const search = element('input');
  search.type = 'search';
  search.placeholder = 'Cari perubahan atau nama berkas…';
  search.setAttribute('aria-label', 'Cari riwayat perubahan');
  const category = element('select');
  category.setAttribute('aria-label', 'Filter kategori perubahan');
  const allOption = element('option', null, 'Semua kategori');
  allOption.value = 'all';
  category.append(allOption);
  for (const name of CHANGE_CATEGORIES) {
    const option = element('option', null, name);
    option.value = name;
    category.append(option);
  }
  filterRow.append(search, category);
  const results = element('div', 'release-results');
  host.append(filterRow, results);
  function draw() {
    results.replaceChildren();
    let total = 0;
    for (const release of manifest.releases) {
      const filtered = filterReleaseChanges(release.changes, {
        query: search.value, category: category.value
      });
      if (!filtered.length && (search.value.trim() || category.value !== 'all')) continue;
      total += filtered.length;
      const card = element('article', 'release-card');
      const heading = element('h3', null, 'v' + release.version + ' — ' + release.title);
      const status = element('p', 'release-status',
        release.status === 'released' ? 'Dirilis: ' + release.releasedAt :
        'Dalam pengembangan · belum dirilis');
      const summary = element('p', null, release.summary);
      card.append(heading, status, summary);
      const details = element('details');
      if (search.value.trim() || category.value !== 'all') details.open = true;
      const detailsTitle = element('summary', null, 'Lihat perubahan (' + filtered.length + ')');
      const list = element('ul', 'release-changes');
      details.append(detailsTitle, list);
      for (const change of filtered) {
        const li = element('li');
        const label = element('strong', null, change.category + ' · ' + change.title);
        li.append(label, element('span', 'release-change-state', ' · ' +
          ({'implemented-local':'Terimplementasi lokal',shipped:'Dirilis',
            partial:'Sebagian',blocked:'Terhalang'}[change.status])));
        if (change.files.length) li.append(element('p', 'release-files', change.files.join(' · ')));
        if (change.commit) {
          const a = element('a', null, 'Lihat commit');
          a.href = 'https://github.com/JTDevArt/omnilearn-gemini-cloud./commit/' + change.commit;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          li.append(a);
        }
        list.append(li);
      }
      card.append(details);
      if (release.knownLimitations.length) {
        const limitations = element('details', 'release-limitations');
        limitations.append(element('summary', null, 'Keterbatasan yang diketahui'));
        const ul = element('ul');
        for (const issue of release.knownLimitations) ul.append(element('li', null, issue));
        limitations.append(ul);
        card.append(limitations);
      }
      results.append(card);
    }
    if (!results.children.length)
      results.append(element('p', 'master-empty', 'Tidak ada perubahan yang cocok.'));
  }
  search.addEventListener('input', draw);
  category.addEventListener('change', draw);
  draw();
  return { refresh: draw };
}
