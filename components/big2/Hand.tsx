"use client";

import { Card as PlayingCard } from "@/components/big2/Card";
import { Card } from "@/lib/big2/types";

interface HandProps {
  cards: Card[];
  selectedIds: string[];
  playableIds?: string[];
  onCardClick?: (card: Card) => void;
  interactive?: boolean;
  dealt?: boolean;
}

export function Hand({
  cards,
  selectedIds,
  playableIds = [],
  onCardClick,
  interactive = false,
  dealt = true,
}: HandProps) {
  const overlap = cards.length > 10 ? 78 : 86;
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
    <div className="mx-auto w-full overflow-x-auto overflow-y-visible px-3 pb-4 pt-8">
      <div className="relative mx-auto h-52 min-w-max" style={{ width }}>
        {cards.map((card, index) => {
          const selected = selectedIds.includes(card.id);
          const offset = positions[index] ?? 0;

          return (
            <div
              key={card.id}
              className="absolute bottom-0"
              style={{ left: offset, zIndex: selected ? 100 + index : index + 1 }}
            >
              <PlayingCard
                card={card}
                selected={selected}
                playable={interactive && playableSet.has(card.id)}
                interactive={interactive}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
                delay={dealt ? index * 0.045 : 0}
                initialOffset={{ y: 140, rotate: -4 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
