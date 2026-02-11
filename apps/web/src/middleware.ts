import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Intercept POST requests to paths that might be used by the PWA Share Target
    // this prevents 405 errors caused by conflicts with page routes.
    if (request.method === 'POST') {
        const { pathname } = request.nextUrl;

        if (pathname === '/send' || pathname === '/api/share-target') {
            return NextResponse.redirect(new URL('/send?shared=middleware_bypass', request.url), 303);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/send', '/api/share-target'],
};
