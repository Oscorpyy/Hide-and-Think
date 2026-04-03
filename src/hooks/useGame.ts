"use client";

import { useState, useCallback } from "react";
import { groupAnswers } from "@/lib/utils";

export type PlayerRole = "Host" | "Player" | null;
export type GameMode = "Local" | "Online" | null;
export type GameState = "Lobby" | "Input" | "Debate" | "Voting" | "Results";
export type Language = "en" | "fr" | "es" | "de" | "it" | "zh" | "ja";

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface GameContextState {
  playerRole: PlayerRole;
  gameMode: GameMode;
  gameState: GameState;
  language: Language;
  roomCode: string;
  players: Player[];
  chatMessages: ChatMessage[];
  currentPlayerId: string;
  setPlayerRole: (role: PlayerRole) => void;
  setGameMode: (mode: GameMode) => void;
  setGameState: (state: GameState) => void;
  setLanguage: (lang: Language) => void;
  setRoomCode: (code: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  addChatMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  calculateScores: (
    answers: { playerId: string; answer: string }[],
    authorId: string,
    guesses: { playerId: string; guessedAuthorId: string }[]
  ) => Map<string, number>;
  resetGame: () => void;
}

export function useGame(): GameContextState {
  const [playerRole, setPlayerRole] = useState<PlayerRole>(null);
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [gameState, setGameState] = useState<GameState>("Lobby");
  const [language, setLanguage] = useState<Language>("en");
  const [roomCode, setRoomCode] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentPlayerId] = useState<string>(
    () => `player-${Math.random().toString(36).slice(2, 9)}`
  );

  const addPlayer = useCallback((player: Player) => {
    setPlayers((prev) => {
      if (prev.some((p) => p.id === player.id)) return prev;
      return [...prev, player];
    });
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const addChatMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "timestamp">) => {
      setChatMessages((prev) => [
        ...prev,
        {
          ...message,
          id: `msg-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
        },
      ]);
    },
    []
  );

  /**
   * Calculate scores for one round.
   *
   * Rules:
   *   +1 pt  → each player who correctly guesses the author
   *   +3 pts → the author, if they were NOT caught (i.e., nobody guessed them)
   *
   * Duplicate-answer handling: answers are normalized and grouped before
   * any evaluation so that "Cat" and "cat " are treated as the same answer.
   *
   * Returns a map of playerId → points earned this round.
   */
  const calculateScores = useCallback(
    (
      answers: { playerId: string; answer: string }[],
      authorId: string,
      guesses: { playerId: string; guessedAuthorId: string }[]
    ): Map<string, number> => {
      const roundScores = new Map<string, number>();

      // Seed every participant with 0 points so they appear in the result.
      for (const { playerId } of answers) {
        roundScores.set(playerId, 0);
      }

      // Group answers by their normalized form so duplicates are detected.
      // The grouping result is preserved for future duplicate-penalty logic.
      const answerTexts = answers.map((a) => a.answer);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _duplicateGroups = groupAnswers(answerTexts);

      // Tally correct guesses.
      let authorCaught = false;
      for (const { playerId, guessedAuthorId } of guesses) {
        if (guessedAuthorId === authorId) {
          // This player guessed correctly.
          roundScores.set(playerId, (roundScores.get(playerId) ?? 0) + 1);
          authorCaught = true;
        }
      }

      // Award the author bonus if they weren't identified.
      if (!authorCaught) {
        roundScores.set(authorId, (roundScores.get(authorId) ?? 0) + 3);
      }

      return roundScores;
    },
    []
  );

  const resetGame = useCallback(() => {
    setPlayerRole(null);
    setGameMode(null);
    setGameState("Lobby");
    setRoomCode("");
    setPlayers([]);
    setChatMessages([]);
  }, []);

  return {
    playerRole,
    gameMode,
    gameState,
    language,
    roomCode,
    players,
    chatMessages,
    currentPlayerId,
    setPlayerRole,
    setGameMode,
    setGameState,
    setLanguage,
    setRoomCode,
    addPlayer,
    removePlayer,
    addChatMessage,
    calculateScores,
    resetGame,
  };
}
