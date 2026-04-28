"use client";

import React, { useState, useEffect } from "react";
import { GameContextState } from "@/hooks/useGame";
import { ArrowRight, Trophy, Vote, Clock, Eye, Info } from "lucide-react";
import questionsData from "../../questions.json";
import { t } from "@/lib/i18n";

// Types pour le détail des points
type PointSource = "detective" | "bluffer";

interface PointBreakdown {
  playerId: string;
  amount: number;
  reason: PointSource;
  answerText: string;
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
      setTimeLeft(180);
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
      // CORRECTION : Accès à l'index pour éviter l'erreur TypeScript
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
      setTimeLeft(180);
    } else {
      const roundScores = game.calculateScores(answers, authorId, newVotes);
      const newScores = new Map<string, number>(scores);
      const roundHistory: PointBreakdown[] = [];

      const currentAnsText = answers.find(a => a.playerId === authorId)?.answer || "";

      for (const [pId, pScore] of roundScores.entries()) {
        const currentTotal = newScores.get(pId) || 0;
        newScores.set(pId, currentTotal + pScore);
        
        if (pScore > 0) {
          roundHistory.push({
            playerId: pId,
            amount: pScore,
            reason: pId === authorId ? "bluffer" : "detective",
            answerText: currentAnsText
          });
        }
      }

      setScores(newScores);
      setPointsHistory(prev => [...prev, ...roundHistory]);

      if (currentDebateIndex + 1 < answers.length) {
        const nextIdx = currentDebateIndex + 1;
        setCurrentDebateIndex(nextIdx);
        setAuthorId(answers[nextIdx].playerId);
        setVotes([]);
        setCurrentVoteIndex(0);
        setStep("Debate");
      } else {
        setStep("Debrief");
      }
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (step === "InitPrompt") return null;

  // --- RENDER PHASES ---
  if (step === "PassPhoneInputPrompt" || step === "InputPrompt") {
     const currentPlayer = game.players[currentPromptActionIndex];
     if (step === "PassPhoneInputPrompt") {
        return (
          <div className="w-full max-w-md space-y-6 text-center">
            <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
            <button onClick={() => setStep("InputPrompt")} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
              {t(game.language, "submitPass")}
            </button>
          </div>
        );
     }
     return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{currentPlayer?.name}, write a question</h2>
        <textarea
          className="w-full rounded-xl bg-purple-950/50 p-4 text-white border border-purple-800/50"
          rows={4}
          value={tempPromptInput}
          onChange={(e) => setTempPromptInput(e.target.value)}
        />
        <button onClick={handleNextPromptInput} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
          {t(game.language, "submitPass")} <ArrowRight className="inline ml-2" size={18} />
        </button>
      </div>
    );
  }

  if (step === "PassPhoneVotePrompt" || step === "VotePrompt") {
    const currentPlayer = game.players[currentPromptActionIndex];
    if (step === "PassPhoneVotePrompt") {
      return (
        <div className="w-full max-w-md space-y-6 text-center">
          <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
          <button onClick={() => { setStep("VotePrompt"); setTimeLeft(180); }} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
            {t(game.language, "startVoting")}
          </button>
        </div>
      );
    }
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-fuchsia-400 mb-4">
          <Clock size={24} /> <span className="text-2xl font-bold font-mono">{formatTime(timeLeft)}</span>
        </div>
        <h2 className="text-2xl font-bold text-white">{currentPlayer?.name}, pick a question</h2>
        <div className="space-y-3 pt-2">
          {promptOptions.map((opt, idx) => (
            <button key={idx} onClick={() => handleNextPromptVote(idx)} className="w-full rounded-xl bg-purple-900/50 p-4 text-left border border-purple-700/50">
              &quot;{opt}&quot;
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "Answers") {
    const currentPlayer = game.players[currentAnswerIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
        <div className="text-fuchsia-300 font-bold bg-fuchsia-900/30 p-3 rounded-lg border border-fuchsia-500/20">
          {prompt}
        </div>
        <textarea
          className="w-full rounded-xl bg-purple-950/50 p-4 text-white border border-purple-800/50"
          rows={4}
          value={currentAnswerText}
          onChange={(e) => setCurrentAnswerText(e.target.value)}
        />
        <button onClick={handleNextAnswer} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
          {t(game.language, "submitPass")} <ArrowRight className="inline ml-2" size={18} />
        </button>
      </div>
    );
  }

  if (step === "Debate") {
    const authorAnswer = answers.find(a => a.playerId === authorId)?.answer;
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-fuchsia-400">{t(game.language, "timeToDebate")} ({currentDebateIndex + 1}/{answers.length})</h2>
        <p className="text-white text-lg bg-purple-900/40 p-4 rounded-xl italic">&quot;{authorAnswer}&quot;</p>
        <button onClick={() => { setStep("PassPhoneVote"); setTimeLeft(180); }} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
          {t(game.language, "startVoting")} <Vote className="inline ml-2" size={18} />
        </button>
      </div>
    );
  }

  if (step === "PassPhoneVote" || step === "Vote") {
    const currentPlayer = game.players[currentVoteIndex];
    if (step === "PassPhoneVote") {
      return (
        <div className="w-full max-w-md space-y-6 text-center">
          <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
          <button onClick={() => { setStep("Vote"); setTimeLeft(180); }} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold">
            {t(game.language, "startVoting")}
          </button>
        </div>
      );
    }
    const isAuthor = currentPlayer.id === authorId;
    const authorAnswer = answers.find(a => a.playerId === authorId)?.answer;
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-fuchsia-400 mb-4">
          <Clock size={24} /> <span className="text-2xl font-bold font-mono">{formatTime(timeLeft)}</span>
        </div>
        <h2 className="text-2xl font-bold text-white">{currentPlayer?.name}{t(game.language, "yourTurn")}</h2>
        <p className="text-white text-lg bg-purple-900/40 p-4 rounded-xl italic">&quot;{authorAnswer}&quot;</p>
        {isAuthor ? (
          <div className="space-y-4 pt-4">
            <p className="text-white font-bold bg-purple-900/50 p-4 rounded-xl border border-fuchsia-500/30">C&apos;est votre réponse ! Chut...</p>
            <button onClick={() => handleVote(currentPlayer.id)} className="w-full rounded-xl bg-purple-600 px-6 py-3 font-bold">Faire semblant</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pt-2">
            {game.players.map(p => (
              <button key={p.id} onClick={() => handleVote(p.id)} className="w-full rounded-xl bg-purple-900/50 p-4 text-left border border-purple-700/50">
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "Debrief") {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-fuchsia-400">
          <Eye size={32} /> <h2 className="text-3xl font-bold text-white">Le Débrief</h2>
        </div>
        
        <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/30 text-left text-xs text-blue-200 flex gap-2">
          <Info size={16} className="shrink-0" />
          <p><strong>Détective :</strong> +1 pt si vous trouvez le bon auteur.<br/><strong>Bluff :</strong> +3 pts si personne ne vous démasque.</p>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {answers.map((ans, idx) => {
            const player = game.players.find(p => p.id === ans.playerId);
            const playerHistory = pointsHistory.filter(h => h.answerText === ans.answer && h.playerId === ans.playerId);
            const isBlufferSucceed = playerHistory.some(h => h.reason === "bluffer");
            
            return (
              <div key={idx} className="bg-purple-900/30 p-4 rounded-xl border border-purple-700/50 text-left">
                <p className="text-fuchsia-300 italic mb-2 text-sm">&quot;{ans.answer}&quot;</p>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-sm">Auteur : {player?.name}</span>
                  <div className="flex gap-2">
                    {isBlufferSucceed && <span className="bg-orange-600 text-[10px] px-2 py-1 rounded text-white font-bold">BLUFF +3</span>}
                    {pointsHistory.filter(h => h.answerText === ans.answer && h.reason === "detective").length > 0 && (
                       <span className="bg-blue-600 text-[10px] px-2 py-1 rounded text-white font-bold">DÉTECTION +1</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setStep("Results")} className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold flex items-center justify-center gap-2">
          Voir le classement <Trophy size={18} />
        </button>
      </div>
    );
  }

  if (step === "Results") {
    const sortedPlayers = [...game.players].sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <Trophy className="mx-auto text-yellow-400" size={48} />
        <h2 className="text-3xl font-bold text-white">{t(game.language, "results")}</h2>
        <div className="space-y-3 bg-purple-950/40 p-4 rounded-xl">
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className="flex justify-between items-center border-b border-purple-800/30 py-2 last:border-0">
              <span className="text-white">#{idx + 1} {p.name}</span>
              <span className="text-fuchsia-300 font-bold">+{scores.get(p.id) || 0} {t(game.language, "pts")}</span>
            </div>
          ))}
        </div>
        <button onClick={onRestart} className="w-full rounded-xl mt-4 bg-fuchsia-600 px-6 py-3 font-bold">
          {t(game.language, "returnLobby")}
        </button>
      </div>
    );
  }

  return null;
}