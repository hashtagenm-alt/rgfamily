// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable Session Replay in production
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Environment (auto-detect from Vercel)
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

  // Filtering options
  ignoreErrors: [
    // Ignore benign browser errors
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Ignore network errors that users can't control
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // Ignore hydration warnings in development
    /Hydration failed/,
    /There was an error while hydrating/,
  ],

  // Don't send events in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',

  // Before sending event, check for PII
  beforeSend(event) {
    // Don't send events without DSN
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null
    }

    // Scrub potential PII from error messages
    if (event.message) {
      // Remove email patterns
      event.message = event.message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      // Remove potential user IDs (UUIDs)
      event.message = event.message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]')
    }

    return event
  },
})
