import { ExplorerView } from '@/components/explorer/explorer-view';

export default async function DataRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return <ExplorerView dataRoomId={roomId} folderId={null} />;
}
