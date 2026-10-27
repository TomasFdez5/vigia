import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { root } from './helpers';

const read = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');

const FONTS_DIR = 'src/app/fonts';
const SHA256 = /^[0-9a-f]{64}$/;

// Expected values are literals taken from the release page, not read from the
// files under test.
const RELEASE_TAG = 'v1.8.2';
const RELEASE_URL_PREFIX = `https://github.com/vercel/geist-font/releases/download/${RELEASE_TAG}/`;
const FAMILIES = [
  { file: 'Geist-Variable.woff2', variable: '--font-geist-sans' },
  { file: 'GeistMono-Variable.woff2', variable: '--font-geist-mono' },
];
const FONT_FILES = FAMILIES.map(({ file }) => file);
const LICENSE_FILE = 'OFL.txt';
const NOTE_FILE = 'PROVENANCE.md';
// Files whose digest the note records.
const HASHED_FILES = [...FONT_FILES, LICENSE_FILE];

// The archive digest is the one the release page publishes; the file digests
// were computed from that verified archive. They are kept here, apart from the
// note, so changing a font and the note together still fails until this list
// is updated on purpose.
const ARCHIVE_SHA256 =
  '43ffb66912b1c49e40c371d96e86b3b3dab42db83eb2d0c8a17321210394c4c7';
const RELEASE_FILE_SHA256: Record<string, string> = {
  'Geist-Variable.woff2':
    '206f01ed08e05c98a51daa7472331c3c71bbb8c1f9d55ea8c70074f3c528a706',
  'GeistMono-Variable.woff2':
    '55419aa06f58adcd7f145c6c920e56936416f17e528f60efc6032ffa4269972b',
  'OFL.txt': 'c683bfbcc7e087f5d37a54ef628f10387c451a83ddc459b151403a164ac46c90',
};

const sha256 = (path: string): string =>
  createHash('sha256')
    .update(readFileSync(resolve(root, path)))
    .digest('hex');

const note = read(`${FONTS_DIR}/${NOTE_FILE}`);

// Rows of the files table: | `file` | `sha256` | `path in the archive` |
const recordedDigests = new Map(
  [...note.matchAll(/^\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|/gm)].map(
    (match) => [match[1] ?? '', match[2] ?? ''],
  ),
);

describe('Geist provenance note', () => {
  it('records the release version and its source URL', () => {
    expect(note).toContain(RELEASE_TAG);
    const url = /Source:\s*(\S+)/.exec(note)?.[1] ?? '';
    expect(url.startsWith(RELEASE_URL_PREFIX)).toBe(true);
  });

  it('records the SHA-256 the release page publishes for the archive', () => {
    const digest = /Archive SHA-256:\s*`?([0-9a-f]{64})`?/.exec(note)?.[1];
    expect(digest).toMatch(SHA256);
    expect(digest).toBe(ARCHIVE_SHA256);
  });

  it.each(HASHED_FILES)('records the SHA-256 of %s', (file) => {
    expect(recordedDigests.get(file)).toBe(RELEASE_FILE_SHA256[file]);
  });
});

describe('committed font files', () => {
  it('are exactly the two upright variable fonts, the license and the note', () => {
    expect(readdirSync(resolve(root, FONTS_DIR)).sort()).toEqual(
      [...FONT_FILES, LICENSE_FILE, NOTE_FILE].sort(),
    );
  });

  it.each(HASHED_FILES)('match the SHA-256 recorded for %s', (file) => {
    expect(sha256(`${FONTS_DIR}/${file}`)).toBe(recordedDigests.get(file));
  });

  it.each(HASHED_FILES)('match the release SHA-256 of %s', (file) => {
    expect(sha256(`${FONTS_DIR}/${file}`)).toBe(RELEASE_FILE_SHA256[file]);
  });

  it('are WOFF2 files', () => {
    for (const file of FONT_FILES) {
      const magic = readFileSync(resolve(root, FONTS_DIR, file)).subarray(0, 4);
      expect(magic.toString('latin1')).toBe('wOF2');
    }
  });
});

describe('font license', () => {
  const license = read(`${FONTS_DIR}/${LICENSE_FILE}`);

  it.each([
    'SIL OPEN FONT LICENSE Version 1.1',
    'PREAMBLE',
    'PERMISSION & CONDITIONS',
    'Permission is hereby granted, free of charge, to any person obtaining a copy of the Font Software',
    'TERMINATION',
    'DISCLAIMER',
  ])('contains the OFL 1.1 text: %s', (fragment) => {
    expect(license.replace(/\s+/g, ' ')).toContain(fragment);
  });

  it('keeps the copyright notice of the Geist authors', () => {
    expect(license).toMatch(/^Copyright .* Geist Project Authors/m);
  });
});

describe('font loading', () => {
  const loader = read('src/app/geist.ts');
  const css = read('src/app/globals.css');

  it('goes through the Next.js local font loader', () => {
    expect(loader).toContain("from 'next/font/local'");
  });

  it.each(FAMILIES.map(({ file, variable }) => [file, variable]))(
    'declares %s as a variable font bound to %s',
    (file, variable) => {
      expect(loader).toContain(`./fonts/${file}`);
      expect(loader).toContain(`variable: '${variable}'`);
      expect(css).toContain(`var(${variable})`);
    },
  );

  it('declares a variable weight range for each family', () => {
    expect(loader.match(/weight: '100 900'/g)).toHaveLength(2);
  });

  it('adds both CSS variables to the root element without inline styles', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toContain('geistSans.variable');
    expect(layout).toContain('geistMono.variable');
    expect(layout).not.toMatch(/style=|<style/);
  });
});

describe('no external font host', () => {
  const sources = (dir: string): string[] =>
    readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? sources(`${dir}/${entry.name}`)
        : /\.(ts|tsx|css|mjs)$/.test(entry.name)
          ? [`${dir}/${entry.name}`]
          : [],
    );

  const contents = sources('src')
    .filter((file) => !file.endsWith('.test.ts'))
    .map((file) => [file, read(file)] as const);

  it.each([
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'use.typekit.net',
    'next/font/google',
    '@import url(',
  ])('no source file references %s', (needle) => {
    for (const [file, content] of contents) {
      expect(content, file).not.toContain(needle);
    }
  });

  it('adds no npm font package', () => {
    const manifest = read('package.json');
    expect(manifest).not.toMatch(/"(geist|@fontsource[^"]*)"/);
  });
});

describe('scaffold page', () => {
  const page = read('src/app/page.tsx');

  it('uses design tokens only, not default Tailwind type styles', () => {
    expect(page).not.toMatch(/\btext-(xs|sm|base|lg|[2-9]?xl)\b/);
    expect(page).not.toMatch(/\bfont-(thin|light|normal|medium|bold|black)\b/);
    expect(page).toContain('text-page-title');
  });
});
