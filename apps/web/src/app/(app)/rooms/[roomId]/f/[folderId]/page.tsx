import { ExplorerView } from '@/components/explorer/explorer-view';

export default async function FolderPage({
  params,
}: {
  params: Promise<{ roomId: string; folderId: string }>;
}) {
  const { roomId, folderId } = await params;

  return <ExplorerView dataRoomId={roomId} folderId={folderId} />;
}
