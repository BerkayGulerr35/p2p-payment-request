import { redirect } from 'next/navigation';

// Middleware redirects authenticated users to /dashboard before they reach this page.
// Unauthenticated visitors land here and bounce to /login.
export default function Home() {
  redirect('/login');
}
