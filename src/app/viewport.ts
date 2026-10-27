import type { Viewport } from 'next';

/**
 * Browser chrome color: the canvas of each theme. It follows the system
 * preference only; the manual theme class cannot be reflected without script.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};
