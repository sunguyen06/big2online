import { MultiplayerGamePage } from "@/components/multiplayer/MultiplayerGamePage";

export default async function GamePage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;

  return <MultiplayerGamePage roomCode={roomCode} />;
}
