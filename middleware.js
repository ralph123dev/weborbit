import { NextResponse } from 'next/server';

const PRODUCTION_ORIGIN = 'https://weborbit-mu.vercel.app';
const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function getAllowedOrigin(origin) {
  if (!origin) {
    return PRODUCTION_ORIGIN;
  }
  return LOCAL_ORIGIN_REGEX.test(origin) ? origin : PRODUCTION_ORIGIN;
}

function applyCorsHeaders(response, origin) {
  const allowedOrigin = getAllowedOrigin(origin);

  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

export function middleware(request) {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  return applyCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: '/:path*',
};
