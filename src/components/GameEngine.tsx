"use client";

import React, { useState, useEffect } from "react";
import { GameContextState } from "@/hooks/useGame";
import { ArrowRight, Trophy, Vote, Clock } from "lucide-react";
import questionsData from "../../questions.json";
import { t } from "@/lib/i18n";

export default function GameEngine({
  onRestart,
  game
}: {
  onRestart: () => void;
  game: GameContextState;
}) {
  // Local states for game phases
  const [step, setStep] = useState<"Prompt" | "Answers" | "Debate" | "PassPhoneVote" | "Vote" | "Results">("Answers");
  const [prompt] = useState(() => {
    const rawQ = questionsData[Math.floor(Math.random() * questionsData.length)];
    // Fallback safely if language is slightly mismatched
    return (rawQ as Record<string, string>)[game.language] || rawQ.en;
  });
  
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [answers, setAnswers] = useState<{playerId: string; answer: string}[]>([]);
  const [currentAnswerText, setCurrentAnswerText] = useState("");
  
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [currentDebateIndex, setCurrentDebateIndex] = useState(0);
  const [votes, setVotes] = useState<{playerId: string; guessedAuthorId: string}[]>([]);
  
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [authorId, setAuthorId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(180);

  useEffect(() => {
    if (step === "Vote") {
      if (timeLeft <= 0) return;
      const timerId = setInterval(() => {
        setTimeLeft((prev: number) => prev - 1);
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [step, timeLeft]);

  // In a real local logic, one player writes the real answer and others write bluffs?
  // Hide and Think: 'Everyone submits their answer secretly. An answer is revealed anonymously. Everyone votes who wrote it.'
  // Wait, if an answer is revealed anonymously, is only ONE answer picked? Let's simplify: 
  // We just pick the first person's answer as the "Author" to debate about.

  const handleNextAnswer = () => {
    if (!currentAnswerText.trim()) return;
    
    const newAnswers = [...answers, { 
      playerId: game.players[currentAnswerIndex].id, 
      answer: currentAnswerText 
    }];
    setAnswers(newAnswers);
    setCurrentAnswerText("");

    if (currentAnswerIndex + 1 < game.players.length) {
      setCurrentAnswerIndex(currentAnswerIndex + 1);
    } else {
      // Shuffle answers for random debate order
      const shuffledAnswers = [...newAnswers].sort(() => Math.random() - 0.5);
      setAnswers(shuffledAnswers);
      setAuthorId(shuffledAnswers[0].playerId);
      setCurrentDebateIndex(0);
      setStep("Debate");
    }
  };

  const handleVote = (guessedId: string) => {
    const newVotes = [...votes, {
      playerId: game.players[currentVoteIndex].id,
      guessedAuthorId: guessedId
    }];
    setVotes(newVotes);
    
    if (currentVoteIndex + 1 < game.players.length) {
      setCurrentVoteIndex(currentVoteIndex + 1);
      setStep("PassPhoneVote");
      setTimeLeft(180);
    } else {
      // End of vote for this debate round
      const roundScores = game.calculateScores(answers, authorId, newVotes);
      
      const newScores = new Map<string, number>(scores);
      for (const [pId, pScore] of roundScores.entries()) {
        const currentScore = newScores.get(pId);
        newScores.set(pId, (typeof currentScore === "number" ? currentScore : 0) + pScore);
      }
      setScores(newScores);

      if (currentDebateIndex + 1 < answers.length) {
        // Next debate
        setCurrentDebateIndex(currentDebateIndex + 1);
        setAuthorId(answers[currentDebateIndex + 1].playerId);
        setVotes([]);
        setCurrentVoteIndex(0);
        setStep("Debate");
      } else {
        // End of all debates
        setStep("Results");
      }
    }
  };

  if (step === "Answers") {
    const currentPlayer = game.players[currentAnswerIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
        <p className="text-purple-300">{t(game.language, "prompt")} {prompt}</p>
        <textarea
          className="w-full rounded-xl bg-purple-950/50 p-4 text-white outline-none border border-purple-800/50 focus:border-fuchsia-500"
          rows={4}
          placeholder={t(game.language, "typeAnswer")}
          value={currentAnswerText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentAnswerText(e.target.value)}
        />
        <button
          onClick={handleNextAnswer}
          className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors"
        >
          {t(game.language, "submitPass")} <ArrowRight className="inline ml-2" size={18} />
        </button>
      </div>
    );
  }

  if (step === "Debate") {
    const authorAnswer = answers.find((a: {playerId: string; answer: string}) => a.playerId === authorId)?.answer;
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-fuchsia-400">{t(game.language, "timeToDebate")} ({currentDebateIndex + 1}/{answers.length})</h2>
        <p className="text-white text-lg bg-purple-900/40 p-4 rounded-xl italic">&quot;{authorAnswer}&quot;</p>
        <p className="text-purple-300 text-sm">{t(game.language, "whoWroteThis")}</p>
        <button
          onClick={() => {
            setStep("PassPhoneVote");
            setTimeLeft(180);
          }}
          className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors"
        >
          {t(game.language, "startVoting")} <Vote className="inline ml-2" size={18} />
        </button>
      </div>
    );
  }

  if (step === "PassPhoneVote") {
    const currentPlayer = game.players[currentVoteIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
        <p className="text-purple-300">{t(game.language, "timeToVotePass")}</p>
        <button
          onClick={() => {
            setStep("Vote");
            setTimeLeft(180);
          }}
          className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors mt-6"
        >
          {t(game.language, "startVoting")}
        </button>
      </div>
    );
  }

  if (step === "Vote") {
    const currentPlayer = game.players[currentVoteIndex];
    if (!currentPlayer) 
      return (
        <div className="w-full max-w-md space-y-6 text-center">
          <h2 className="text-2xl font-bold text-white">{t(game.language, "uShouldBait")}</h2>
        </div>
      );

    const isAuthor = currentPlayer.id === authorId;
    const authorAnswer = answers.find((a: {playerId: string; answer: string}) => a.playerId === authorId)?.answer;
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-fuchsia-400 mb-4">
          <Clock size={24} />
          <span className="text-2xl font-bold font-mono">{formatTime(timeLeft)}</span>
        </div>
        <h2 className="text-2xl font-bold text-white">{currentPlayer?.name}{t(game.language, "yourTurn")}</h2>
        <p className="text-white text-lg bg-purple-900/40 p-4 rounded-xl italic">&quot;{authorAnswer}&quot;</p>
        <p className="text-purple-300">{t(game.language, "whoDoYouThink")} ({currentDebateIndex + 1}/{answers.length})</p>
        
        {isAuthor ? (
          <div className="space-y-4 pt-4">
            <p className="text-white text-lg font-bold bg-purple-900/50 p-4 rounded-xl border border-fuchsia-500/30">
              {t(game.language, "shhYourAnswer")}
            </p>
            <button
              onClick={() => handleVote(currentPlayer.id)}
              className="w-full rounded-xl bg-purple-600 px-6 py-3 font-bold hover:bg-purple-500 transition-colors mt-4"
            >
              {t(game.language, "pretendVoted")}
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {game.players.map(p => (
              <button
                key={p.id}
                onClick={() => handleVote(p.id)}
                className="w-full rounded-xl bg-purple-900/50 p-4 text-left hover:bg-fuchsia-600/50 transition-colors border border-purple-700/50"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "Results") {
    // Sort players by score
    const sortedPlayers = [...game.players].sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <Trophy className="mx-auto text-yellow-400" size={48} />
        <h2 className="text-3xl font-bold text-white">{t(game.language, "results")}</h2>
        <div className="space-y-3 bg-purple-950/40 p-4 rounded-xl">
          {sortedPlayers.map(p => (
            <div key={p.id} className="flex justify-between items-center border-b border-purple-800/30 py-2 last:border-0">
              <span className="text-white">{p.name}</span>
              <span className="text-fuchsia-300 font-bold">+{scores.get(p.id) || 0} {t(game.language, "pts")}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onRestart}
          className="w-full rounded-xl mt-4 bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors"
        >
          {t(game.language, "returnLobby")}
        </button>
      </div>
    );
  }

  return null;
}
