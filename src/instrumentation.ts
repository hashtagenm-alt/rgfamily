// Instrumentation file for Next.js 15+
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    await import('../sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    await import('../sentry.edge.config')
  }
}

export const onRequestError = async (
  err: Error,
  request: {
    path: string
    method: string
    headers: Record<string, string>
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
    revalidateReason: 'on-demand' | 'stale' | undefined
  }
) => {
  // Import Sentry dynamically to avoid bundling issues
  const Sentry = await import('@sentry/nextjs')

  // Capture the error with additional context
  Sentry.captureException(err, {
    tags: {
      'router.kind': context.routerKind,
      'router.path': context.routePath,
      'router.type': context.routeType,
      'request.method': request.method,
    },
    extra: {
      path: request.path,
      revalidateReason: context.revalidateReason,
    },
  })
}
