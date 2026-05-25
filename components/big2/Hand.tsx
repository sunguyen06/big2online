"use client";

import { Card as PlayingCard } from "@/components/big2/Card";
import { Card } from "@/lib/big2/types";

interface HandProps {
  animationKey?: number | string;
  cards: Card[];
  selectedIds: string[];
  playableIds?: string[];
  onCardClick?: (card: Card) => void;
  interactive?: boolean;
  dealt?: boolean;
}

export function Hand({
  animationKey,
  cards,
  selectedIds,
  playableIds = [],
  onCardClick,
  interactive = false,
  dealt = true,
}: HandProps) {
  const overlap = cards.length > 10 ? 66 : 76;
  const selectedSpread = 14;
  const playableSet = new Set(playableIds);
  const slotWidths = cards.map((card, index) =>
    index === cards.length - 1 ? 112 : overlap + (selectedIds.includes(card.id) ? selectedSpread : 0),
  );
  const positions = slotWidths.reduce<number[]>((accumulator, width, index) => {
    if (index === 0) {
      accumulator.push(0);
      return accumulator;
    }

    accumulator.push(accumulator[index - 1] + slotWidths[index - 1]);
    return accumulator;
  }, []);
  const width = Math.max(180, (positions.at(-1) ?? 0) + 112);

  return (
    <div className="mx-auto w-full overflow-x-auto overflow-y-visible px-2 pb-4 pt-8 sm:px-3">
      <div className="relative mx-auto h-56 min-w-max" style={{ width }}>
        {cards.map((card, index) => {
          const selected = selectedIds.includes(card.id);
          const offset = positions[index] ?? 0;

          return (
            <div
              key={card.id}
              className="absolute bottom-0"
              style={{
                left: offset,
                zIndex: selected ? 100 + index : index + 1,
              }}
            >
              <PlayingCard
                animationKey={`${animationKey ?? "round"}-${card.id}`}
                card={card}
                selected={selected}
                playable={interactive && playableSet.has(card.id)}
                interactive={interactive}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
                delay={dealt ? index * 0.045 : 0}
                initialOffset={{ x: 0, y: 140, rotate: 0 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
