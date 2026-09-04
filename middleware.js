import { NextResponse } from 'next/server';

// The iOS app only ever calls /api/app/*. These older route families predate the
// current design and are not used by any client, but they were still deployed and
// publicly reachable with missing authorization checks. This blocks them at the
// edge so they cannot be called at all. The route files can be deleted later; this
// makes them unreachable now.
export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/auth/:path*',
    '/api/groups/:path*',
    '/api/licenses/:path*',
    '/api/subscriptions/:path*'
  ]
};

export function middleware() {
  return new NextResponse(
    JSON.stringify({ success: false, error: 'Not found.' }),
    { status: 404, headers: { 'content-type': 'application/json' } }
  );
}
