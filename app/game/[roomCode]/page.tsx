import { GamePlaceholderPage } from "@/components/lobby/GamePlaceholderPage";

export default async function GamePage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;

  return <GamePlaceholderPage roomCode={roomCode} />;
}
