import { PublicShareView } from '@/components/public/public-share-view';

export const metadata = { title: 'Shared item · Data Room' };

export default async function PublicShareFolderPage({
  params,
}: {
  params: Promise<{ token: string; folderId: string }>;
}) {
  const { token, folderId } = await params;

  return <PublicShareView token={token} folderId={folderId} />;
}
