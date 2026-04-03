"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Gamepad2,
  Globe,
  Users,
  Hash,
  LogIn,
  PlusCircle,
  Zap,
} from "lucide-react";
import { useGame, Language } from "@/hooks/useGame";
import { generateRoomCode } from "@/lib/utils";
import PlayerList from "@/components/PlayerList";
import ChatBox from "@/components/ChatBox";
import GameEngine from "@/components/GameEngine";
import { t } from "@/lib/i18n";

// Top-level view within the landing flow
type View = "home" | "online-setup" | "lobby" | "game";

export default function Home() {
  const game = useGame();
  const [view, setView] = useState<View>("home");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [roomError, setRoomError] = useState("");

  // ── Helpers ──────────────────────────────────────────────────────────────

  const validateName = (): boolean => {
    if (!playerNameInput.trim()) {
      setNameError("Please enter your name.");
      return false;
    }
    setNameError("");
    return true;
  };

  const enterLobby = (role: "Host" | "Player", code: string) => {
    game.setPlayerRole(role);
    game.setGameMode("Online");
    game.setRoomCode(code);
    game.addPlayer({
      id: game.currentPlayerId,
      name: playerNameInput.trim(),
      score: 0,
      isHost: role === "Host",
    });
    setView("lobby");
  };

  const handleCreateRoom = () => {
    if (!validateName()) return;
    const code = generateRoomCode();
    enterLobby("Host", code);
  };

  const handleJoinRoom = () => {
    if (!validateName()) return;
    if (!/^\d{4}$/.test(roomCodeInput)) {
      setRoomError("Room code must be exactly 4 digits.");
      return;
    }
    setRoomError("");
    enterLobby("Player", roomCodeInput);
  };

  const handleLocalPlay = () => {
    game.setPlayerRole("Host");
    game.setGameMode("Local");
    setView("lobby");
  };

  const handleAddLocalPlayer = () => {
    if (!playerNameInput.trim()) return;
    const isFirst = game.players.length === 0;
    game.addPlayer({
      id: isFirst ? game.currentPlayerId : "local-" + Date.now().toString() + Math.random().toString(36).slice(2, 7),
      name: playerNameInput.trim(),
      score: 0,
      isHost: isFirst,
    });
    setPlayerNameInput("");
  };

  const handleBack = () => {
    game.resetGame();
    setRoomCodeInput("");
    setPlayerNameInput("");
    setNameError("");
    setRoomError("");
    setView("home");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07030f] text-white">
      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-fuchsia-800/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-indigo-700/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* ── HOME ─────────────────────────────────────────────────────── */}
        {view === "home" && (
          <section className="w-full max-w-md space-y-8 text-center">
            {/* Logo / Title */}
            <div className="space-y-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg shadow-fuchsia-900/40">
                <Zap size={32} className="text-white" />
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
                  Hide
                </span>
                <span className="text-white">&nbsp;&amp;&nbsp;</span>
                <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-300 to-purple-400 bg-clip-text text-transparent">
                  Think
                </span>
              </h1>
              <p className="text-sm text-purple-300/80">
                {t(game.language, "tagline")}
              </p>
            </div>

            {/* Play buttons */}
            <div className="flex flex-col gap-4">
              <button
                onClick={handleLocalPlay}
                className="group flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-purple-700 to-fuchsia-700 px-6 py-4 text-lg font-bold shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 active:scale-95"
              >
                <Gamepad2 size={22} />
                {t(game.language, "localPlay")}
                <span className="ml-auto text-xs font-normal text-purple-200 opacity-70 group-hover:opacity-100">
                  {t(game.language, "sameDevice")}
                </span>
              </button>

              <button
                onClick={() => setView("online-setup")}
                className="group flex items-center justify-center gap-3 rounded-xl border border-fuchsia-600/50 bg-fuchsia-600/10 px-6 py-4 text-lg font-bold shadow-lg shadow-fuchsia-900/20 transition hover:border-fuchsia-500 hover:bg-fuchsia-600/20 active:scale-95"
              >
                <Globe size={22} className="text-fuchsia-400" />
                {t(game.language, "onlinePlay")}
                <span className="ml-auto text-xs font-normal text-purple-200 opacity-70 group-hover:opacity-100">
                  {t(game.language, "createOrJoin")}
                </span>
              </button>
            </div>

            {/* Tagline & Settings */}
            <div className="flex flex-col items-center gap-4 text-xs text-purple-600/70">
              <p>{t(game.language, "motto")}</p>
              
              <div className="flex items-center gap-2 mt-4 bg-purple-950/30 px-3 py-1.5 rounded-full border border-purple-800/30">
                <span>{t(game.language, "language")}</span>
                <select 
                  value={game.language}
                  onChange={(e) => game.setLanguage(e.target.value as Language)}
                  className="bg-transparent text-purple-300 outline-none cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* ── ONLINE SETUP (Join / Create) ─────────────────────────────── */}
        {view === "online-setup" && (
          <section className="w-full max-w-md space-y-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-purple-400 transition hover:text-fuchsia-300"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="space-y-1 text-center">
              <h2 className="text-3xl font-bold text-white">Online Play</h2>
              <p className="text-sm text-purple-400">
                Enter your name, then create or join a room.
              </p>
            </div>

            {/* Name input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-widest text-purple-400">
                Your Name
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-purple-700/50 bg-purple-900/20 px-3 py-2 ring-0 transition focus-within:ring-1 focus-within:ring-fuchsia-500/60">
                <Users size={16} className="shrink-0 text-purple-500" />
                <input
                  type="text"
                  maxLength={24}
                  value={playerNameInput}
                  onChange={(e) => {
                    setPlayerNameInput(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  placeholder="e.g. Alex"
                  className="flex-1 bg-transparent text-sm text-white placeholder-purple-600 outline-none"
                />
              </div>
              {nameError && (
                <p className="text-xs text-red-400">{nameError}</p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <span className="flex-1 border-t border-purple-800/60" />
              <span className="text-xs text-purple-600">ROOM OPTIONS</span>
              <span className="flex-1 border-t border-purple-800/60" />
            </div>

            {/* Create room */}
            <button
              onClick={handleCreateRoom}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-purple-700 to-fuchsia-700 px-6 py-4 text-base font-bold shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 active:scale-95"
            >
              <PlusCircle size={20} />
              Create Room
            </button>

            {/* Join room */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-purple-700/50 bg-purple-900/20 px-3 py-2 ring-0 transition focus-within:ring-1 focus-within:ring-fuchsia-500/60">
                <Hash size={16} className="shrink-0 text-purple-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={roomCodeInput}
                  onChange={(e) => {
                    setRoomCodeInput(e.target.value.replace(/\D/g, ""));
                    if (roomError) setRoomError("");
                  }}
                  placeholder="4-digit Room Code"
                  className="flex-1 bg-transparent tracking-widest text-sm text-white placeholder-purple-600 outline-none"
                />
              </div>
              {roomError && (
                <p className="text-xs text-red-400">{roomError}</p>
              )}
              <button
                onClick={handleJoinRoom}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-fuchsia-600/50 bg-fuchsia-600/10 px-6 py-4 text-base font-bold transition hover:border-fuchsia-500 hover:bg-fuchsia-600/20 active:scale-95"
              >
                <LogIn size={20} className="text-fuchsia-400" />
                Join Room
              </button>
            </div>
          </section>
        )}

        {/* ── LOBBY ────────────────────────────────────────────────────── */}
        {view === "lobby" && (
          <section className="w-full max-w-lg space-y-4">
            {/* Header row */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-purple-400 transition hover:text-fuchsia-300"
              >
                <ArrowLeft size={16} /> {t(game.language, "leave")}
              </button>
              <div className="ml-auto flex items-center gap-2">
                {game.gameMode === "Online" && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-purple-900/50 px-3 py-1 font-mono text-sm">
                    <Hash size={13} className="text-fuchsia-400" />
                    <span className="font-bold tracking-widest text-fuchsia-300">
                      {game.roomCode}
                    </span>
                  </div>
                )}
                <span className="rounded-lg bg-purple-800/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-purple-300">
                  {game.gameMode === "Local" ? "Local" : game.playerRole}
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">{t(game.language, "lobby")}</h2>
              <p className="text-sm text-purple-400">
                {game.gameMode === "Local"
                  ? t(game.language, "passDevice")
                  : t(game.language, "shareCode")}
              </p>
            </div>

            {/* Player list */}
            {game.gameMode === "Local" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t(game.language, "enterPlayerName")}
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLocalPlayer();
                  }}
                  className="w-full rounded-xl bg-purple-950/50 px-4 py-3 text-sm placeholder-purple-400 text-white outline-none border border-purple-800/50 focus:border-fuchsia-500 transition-colors"
                />
                <button
                  onClick={handleAddLocalPlayer}
                  disabled={!playerNameInput.trim()}
                  className="rounded-xl bg-fuchsia-600 px-6 font-bold hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t(game.language, "add")}
                </button>
              </div>
            )}
            <PlayerList
              players={game.players}
              currentPlayerId={game.currentPlayerId}
            />

            {/* Start button (host only) */}
            {game.playerRole === "Host" && (
              <button
                onClick={() => setView("game")}
                disabled={game.players.length < 2}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 to-fuchsia-700 px-6 py-4 text-base font-bold shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Zap size={18} />
                {game.players.length < 2
                  ? `${t(game.language, "waitingPlayers")} (${game.players.length}/2+)`
                  : t(game.language, "startGame")}
              </button>
            )}

            {/* Chat box — only in Online mode */}
            {game.gameMode === "Online" && (
              <ChatBox
                messages={game.chatMessages}
                currentPlayerId={game.currentPlayerId}
                currentPlayerName={
                  game.players.find((p) => p.id === game.currentPlayerId)
                    ?.name ?? "You"
                }
                onSendMessage={(text) =>
                  game.addChatMessage({
                    playerId: game.currentPlayerId,
                    playerName:
                      game.players.find((p) => p.id === game.currentPlayerId)
                        ?.name ?? "You",
                    text,
                  })
                }
              />
            )}
          </section>
        )}

        {/* ── GAME ─────────────────────────────────────────────────────── */}
        {view === "game" && <GameEngine onRestart={() => {
          game.resetGame();
          setView("home"); // Return to home or lobby as desired
        }} game={game} />}
      </div>
    </main>
  );
}
