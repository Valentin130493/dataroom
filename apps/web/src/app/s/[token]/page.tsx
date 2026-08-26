import { PublicShareView } from '@/components/public/public-share-view';

export const metadata = { title: 'Shared item · Data Room' };

export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <PublicShareView token={token} folderId={null} />;
}
