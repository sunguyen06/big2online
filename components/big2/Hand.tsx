"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const compactMode = cards.length >= 16;
  const cardWidth = compactMode ? 96 : 112;
  const baseSpacing = compactMode ? 50 : cards.length > 12 ? 62 : 76;
  const playableSet = new Set(playableIds);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const element = containerRef.current;
    const updateWidth = () => setContainerWidth(element.clientWidth);

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const spacing = useMemo(() => {
    if (cards.length <= 1 || containerWidth === 0) {
      return baseSpacing;
    }

    const availableWidth = Math.max(cardWidth, containerWidth - 12);
    const fittedSpacing = Math.floor((availableWidth - cardWidth) / (cards.length - 1));

    return Math.max(28, Math.min(baseSpacing, fittedSpacing));
  }, [baseSpacing, cardWidth, cards.length, containerWidth]);

  const positions = useMemo(
    () => cards.map((_, index) => index * spacing),
    [cards, spacing],
  );
  const width = Math.max(cardWidth, (positions.at(-1) ?? 0) + cardWidth);
  const shouldScroll = containerWidth > 0 && width > containerWidth;
  const handHeightClass = compactMode ? "h-48" : "h-56";

  return (
    <div
      ref={containerRef}
      className={[
        "mx-auto w-full overflow-y-visible px-1 pb-3 pt-5 sm:px-2",
        shouldScroll ? "overflow-x-auto" : "overflow-x-hidden",
      ].join(" ")}
    >
      <div className={`relative mx-auto min-w-max ${handHeightClass}`} style={{ width }}>
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
                size={compactMode ? "compact" : "md"}
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
