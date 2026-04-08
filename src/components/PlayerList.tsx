"use client";

import { Users } from "lucide-react";
import { Player, Language } from "@/hooks/useGame";
import { t } from "@/lib/i18n";

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  gameLanguage: Language;
}

export default function PlayerList({
  players,
  currentPlayerId,
  gameLanguage,
}: PlayerListProps) {
  return (
    <div className="rounded-xl border border-purple-700/40 bg-[#0f0a1e]/70 p-4 backdrop-blur">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-300">
        <Users size={16} className="text-fuchsia-400" />
        {t(gameLanguage, "players")}&nbsp;
        <span className="ml-auto rounded-full bg-purple-800/60 px-2 py-0.5 text-xs text-purple-200">
          {players.length}
        </span>
      </h3>

      {players.length === 0 ? (
        <p className="text-center text-sm text-purple-500/70 italic">
          {t(gameLanguage, "waitingPlayers")}
        </p>
      ) : (
        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-lg bg-purple-900/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    player.id === currentPlayerId
                      ? "bg-fuchsia-400"
                      : "bg-purple-500"
                  }`}
                />
                <span className="text-sm font-medium text-white">
                  {player.name}
                  {player.id === currentPlayerId && (
                    <span className="ml-1 text-xs text-fuchsia-400"> {t(gameLanguage, "you")}</span>
                  )}
                </span>
                {player.isHost && (
                  <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-300">
                    {t(gameLanguage, "host")}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-fuchsia-300">
                {player.score} {t(gameLanguage, "pts")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
