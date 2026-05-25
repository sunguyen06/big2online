import { RoomLobbyPage } from "@/components/lobby/RoomLobbyPage";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;

  return <RoomLobbyPage roomCode={roomCode} />;
}
