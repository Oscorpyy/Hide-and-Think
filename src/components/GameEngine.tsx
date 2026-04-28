"use client";

import React, { useState, useEffect } from "react";
import { GameContextState } from "@/hooks/useGame";
import { ArrowRight, Trophy, Vote, Clock, Eye, Info } from "lucide-react";
import questionsData from "../../questions.json";
import { t } from "@/lib/i18n";

type PointSource = "detective" | "bluffer";

interface PointBreakdown {
  playerId: string;
  amount: number;
  reason: PointSource;
}

type GamePhase =
  | "InitPrompt"
  | "PassPhoneInputPrompt" | "InputPrompt"
  | "PassPhoneVotePrompt"  | "VotePrompt"
  | "Answers" | "Debate" | "PassPhoneVote" | "Vote" | "Debrief" | "Results";

export default function GameEngine({
  onRestart,
  game
}: {
  onRestart: () => void;
  game: GameContextState;
}) {
  const [step, setStep] = useState<GamePhase>("InitPrompt");
  const [promptOptions, setPromptOptions] = useState<string[]>([]);
  const [customPrompts, setCustomPrompts] = useState<{playerId: string, text: string}[]>([]);
  const [promptVotes, setPromptVotes] = useState<number[]>([]);
  const [currentPromptActionIndex, setCurrentPromptActionIndex] = useState(0);
  const [tempPromptInput, setTempPromptInput] = useState("");
  const [prompt, setPrompt] = useState<string>("");
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [answers, setAnswers] = useState<{playerId: string; answer: string}[]>([]);
  const [currentAnswerText, setCurrentAnswerText] = useState("");
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [currentDebateIndex, setCurrentDebateIndex] = useState(0);
  const [votes, setVotes] = useState<{playerId: string; guessedAuthorId: string}[]>([]);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [pointsHistory, setPointsHistory] = useState<PointBreakdown[]>([]);
  const [authorId, setAuthorId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(180);

  useEffect(() => {
    if (step === "InitPrompt") {
      if (game.questionMode === "random") {
        const rawQ = questionsData[Math.floor(Math.random() * questionsData.length)];
        setPrompt((rawQ as Record<string, string>)[game.language] || rawQ.en);
        setStep("Answers");
      }
      else if (game.questionMode === "vote_preset") {
        const opts: string[] = [];
        for(let i=0; i<3; i++) {
          const rawQ = questionsData[Math.floor(Math.random() * questionsData.length)];
          opts.push((rawQ as Record<string, string>)[game.language] || rawQ.en);
        }
        setPromptOptions(opts);
        setPromptVotes(new Array(opts.length).fill(0));
        setStep("PassPhoneVotePrompt");
      }
      else if (game.questionMode === "vote_custom" || game.questionMode === "random_custom") {
        setStep("PassPhoneInputPrompt");
      }
    }
  }, [step, game.questionMode, game.language]);

  useEffect(() => {
    if (step === "Vote" || step === "VotePrompt") {
      if (timeLeft <= 0) return;
      const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timerId);
    }
  }, [step, timeLeft]);

  const handleNextPromptInput = () => {
    if (!tempPromptInput.trim()) return;
    const newCustoms = [...customPrompts, { playerId: game.players[currentPromptActionIndex].id, text: tempPromptInput }];
    setCustomPrompts(newCustoms);
    setTempPromptInput("");
    if (currentPromptActionIndex + 1 < game.players.length) {
      setCurrentPromptActionIndex(currentPromptActionIndex + 1);
      setStep("PassPhoneInputPrompt");
    } else {
      const options = newCustoms.map(c => c.text);
      if (game.questionMode === "random_custom") {
        setPrompt(options[Math.floor(Math.random() * options.length)]);
        setStep("Answers");
      } else {
        setPromptOptions(options);
        setPromptVotes(new Array(options.length).fill(0));
        setCurrentPromptActionIndex(0);
        setStep("PassPhoneVotePrompt");
      }
    }
  };

  const handleNextPromptVote = (optIndex: number) => {
    const newVotes = [...promptVotes];
    newVotes[optIndex]++;
    setPromptVotes(newVotes);
    if (currentPromptActionIndex + 1 < game.players.length) {
      setCurrentPromptActionIndex(currentPromptActionIndex + 1);
      setStep("PassPhoneVotePrompt");
    } else {
      let maxVote = -1;
      let bestIndices: number[] = [];
      newVotes.forEach((v, i) => {
        if (v > maxVote) { maxVote = v; bestIndices = [i]; }
        else if (v === maxVote) { bestIndices.push(i); }
      });
      setPrompt(promptOptions[bestIndices[Math.floor(Math.random() * bestIndices.length)]]);
      setStep("Answers");
    }
  };

  const handleNextAnswer = () => {
    if (!currentAnswerText.trim()) return;
    const newAnswers = [...answers, { playerId: game.players[currentAnswerIndex].id, answer: currentAnswerText }];
    setAnswers(newAnswers);
    setCurrentAnswerText("");
    if (currentAnswerIndex + 1 < game.players.length) {
      setCurrentAnswerIndex(currentAnswerIndex + 1);
    } else {
      const shuffledAnswers = [...newAnswers].sort(() => Math.random() - 0.5);
      setAnswers(shuffledAnswers);
      setAuthorId(shuffledAnswers.playerId);
      setCurrentDebateIndex(0);
      setStep("Debate");
    }
  };

  const handleVote = (guessedId: string) => {
    const newVotes = [...votes, { playerId: game.players[currentVoteIndex].id, guessedAuthorId: guessedId }];
    setVotes(newVotes);
    if (currentVoteIndex + 1 < game.players.length) {
      setCurrentVoteIndex(currentVoteIndex + 1);
      setStep("PassPhoneVote");
    } else {
      const roundScores = game.calculateScores(answers, authorId, newVotes);
      const newScores = new Map<string, number>(scores);
      const roundHistory: PointBreakdown[] = [];

      for (const [pId, pScore] of roundScores.entries()) {
        const currentScore = newScores.get(pId) || 0;
        newScores.set(pId, currentScore + pScore);
        if (pId === authorId && pScore === 3) {
          roundHistory.push({ playerId: pId, amount: 3, reason: "bluffer" });
        } else if (pScore === 1) {
          roundHistory.push({ playerId: pId, amount: 1, reason: "detective" });
        }
      }

      setScores(newScores);
      setPointsHistory([...pointsHistory, ...roundHistory]);

      if (currentDebateIndex + 1 < answers.length) {
        setCurrentDebateIndex(currentDebateIndex + 1);
        setAuthorId(answers[currentDebateIndex + 1].playerId);
        setVotes([]);
        setCurrentVoteIndex(0);
        setStep("Debate");
      } else {
        setStep("Debrief");
      }
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (step === "PassPhoneInputPrompt") {
    const currentPlayer = game.players[currentPromptActionIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
        <button onClick={() => setStep("InputPrompt")} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors">
          {t(game.language, "submitPass")}
        </button>
      </div>
    );
  }

  if (step === "InputPrompt") {
    const currentPlayer = game.players[currentPromptActionIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{currentPlayer?.name}, write a question</h2>
        <textarea
          className="w-full rounded-xl bg-purple-950/50 p-4 text-white outline-none border border-purple-800/50"
          rows={4}
          value={tempPromptInput}
          onChange={(e) => setTempPromptInput(e.target.value)}
        />
        <button onClick={handleNextPromptInput} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors">
          {t(game.language, "submitPass")}
        </button>
      </div>
    );
  }

  if (step === "VotePrompt" || step === "PassPhoneVotePrompt") {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">Voting for Prompt...</h2>
        <button onClick={() => setStep("VotePrompt")} className="bg-fuchsia-600 p-4 rounded-xl">Start</button>
      </div>
    );
  }

  if (step === "Answers") {
    const currentPlayer = game.players[currentAnswerIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{currentPlayer?.name}&apos;s Turn</h2>
        <p className="bg-fuchsia-900/30 p-4 rounded-lg border border-fuchsia-500/20">{prompt}</p>
        <textarea
          className="w-full rounded-xl bg-purple-950/50 p-4 text-white border border-purple-800/50"
          value={currentAnswerText}
          onChange={(e) => setCurrentAnswerText(e.target.value)}
        />
        <button onClick={handleNextAnswer} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
          {t(game.language, "submitPass")}
        </button>
      </div>
    );
  }

  if (step === "Debate") {
    const answerObj = answers[currentDebateIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-fuchsia-400">Debate!</h2>
        <p className="text-white text-lg bg-purple-900/40 p-6 rounded-xl italic">&quot;{answerObj.answer}&quot;</p>
        <button onClick={() => setStep("PassPhoneVote")} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
          {t(game.language, "startVoting")}
        </button>
      </div>
    );
  }

  if (step === "PassPhoneVote" || step === "Vote") {
    const currentPlayer = game.players[currentVoteIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-white">{currentPlayer?.name}&apos;s turn to vote</h2>
        <button onClick={() => handleVote(game.players.id)} className="bg-purple-600 p-3 rounded-xl">Vote</button>
      </div>
    );
  }

  if (step === "Debrief") {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-fuchsia-400">
          <Eye size={32} />
          <h2 className="text-3xl font-bold text-white">The Big Reveal</h2>
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {answers.map((a, idx) => {
            const player = game.players.find(p => p.id === a.playerId);
            const playerPoints = pointsHistory.filter(h => h.playerId === a.playerId);
            const isBluffer = playerPoints.some(h => h.reason === "bluffer");

            return (
              <div key={idx} className="bg-purple-900/30 p-4 rounded-xl border border-purple-700/50 text-left">
                <p className="text-fuchsia-300 italic mb-2">&quot;{a.answer}&quot;</p>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Auteur: {player?.name}</span>
                  <div className="flex gap-2">
                    {isBluffer && <span className="bg-orange-600 text-xs px-2 py-1 rounded text-white font-bold">+3 Bluff</span>}
                    <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white font-bold">
                      +{playerPoints.filter(h => h.reason === "detective").length} Guess
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setStep("Results")}
          className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-all flex items-center justify-center gap-2"
        >
          See Final Leaderboard <Trophy size={18} />
        </button>
      </div>
    );
  }

  if (step === "Results") {
    const sortedPlayers = [...game.players].sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <Trophy className="mx-auto text-yellow-400" size={64} />
        <h2 className="text-4xl font-bold text-white">Ranking</h2>
        <div className="space-y-3 bg-purple-950/60 p-6 rounded-2xl border border-purple-500/20">
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className="flex justify-between items-center py-3 border-b border-purple-800/30 last:border-0">
              <span className="text-white text-lg">#{idx + 1} {p.name}</span>
              <span className="text-fuchsia-300 font-black text-xl">{scores.get(p.id) || 0} PTS</span>
            </div>
          ))}
        </div>
        <button onClick={onRestart} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
          {t(game.language, "returnLobby")}
        </button>
      </div>
    );
  }

  return null;
}
