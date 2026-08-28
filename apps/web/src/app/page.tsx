import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { REFRESH_COOKIE_NAME } from '@dataroom/shared';

export default async function HomePage() {
  const store = await cookies();

  redirect(store.has(REFRESH_COOKIE_NAME) ? '/rooms' : '/login');
}
