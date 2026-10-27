# Geist fonts: provenance

Geist Sans and Geist Mono, upright variable web fonts (WOFF2, weight axis 100 to 900, no italics), committed unmodified and served from the application's own origin.

- Release: v1.8.2 (published 2026-10-21)
- Source: https://github.com/vercel/geist-font/releases/download/v1.8.2/geist-font-v1.8.2.zip
- Archive SHA-256: `43ffb66912b1c49e40c371d96e86b3b3dab42db83eb2d0c8a17321210394c4c7`
- The archive digest equals the one GitHub publishes for the release asset (checked on 2026-10-27, before extracting anything).
- License: SIL Open Font License 1.1, in `OFL.txt` next to the fonts. Redistribution requires keeping it with the files.

Only the three files below were extracted from the archive. Nothing from it was executed. The two font files were renamed on copy (the archive names contain square brackets); their bytes are unchanged.

| File                       | SHA-256                                                            | Path in the archive                                   |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| `Geist-Variable.woff2`     | `206f01ed08e05c98a51daa7472331c3c71bbb8c1f9d55ea8c70074f3c528a706` | `geist-font/Geist/webfonts/Geist[wght].woff2`         |
| `GeistMono-Variable.woff2` | `55419aa06f58adcd7f145c6c920e56936416f17e528f60efc6032ffa4269972b` | `geist-font/GeistMono/webfonts/GeistMono[wght].woff2` |
| `OFL.txt`                  | `c683bfbcc7e087f5d37a54ef628f10387c451a83ddc459b151403a164ac46c90` | `geist-font/OFL.txt`                                  |

`tests/config/fonts.test.ts` recomputes each digest and compares it with this table. To update the fonts, repeat the download and verification against the new release and update the whole note.
