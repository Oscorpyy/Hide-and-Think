"use client";

import React, { useState, useEffect } from "react";
import { GameContextState } from "@/hooks/useGame";
import { ArrowRight, Trophy, Vote, Clock } from "lucide-react";
import questionsData from "../../questions.json";
import { t } from "@/lib/i18n";

type GamePhase = 
  | "InitPrompt" 
  | "PassPhoneInputPrompt" | "InputPrompt" 
  | "PassPhoneVotePrompt"  | "VotePrompt"
  | "Answers" | "Debate" | "PassPhoneVote" | "Vote" | "Results";

export default function GameEngine({
  onRestart,
  game
}: {
  onRestart: () => void;
  game: GameContextState;
}) {
  const [step, setStep] = useState<GamePhase>("InitPrompt");

  // Prompt selection states
  const [promptOptions, setPromptOptions] = useState<string[]>([]);
  const [customPrompts, setCustomPrompts] = useState<{playerId: string, text: string}[]>([]);
  const [promptVotes, setPromptVotes] = useState<number[]>([]); // count of votes per prompt option (index sync)
  const [currentPromptActionIndex, setCurrentPromptActionIndex] = useState(0); // whose turn to write or vote
  const [tempPromptInput, setTempPromptInput] = useState("");

  const [prompt, setPrompt] = useState<string>("");
  
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [answers, setAnswers] = useState<{playerId: string; answer: string}[]>([]);
  const [currentAnswerText, setCurrentAnswerText] = useState("");
  
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [currentDebateIndex, setCurrentDebateIndex] = useState(0);
  const [votes, setVotes] = useState<{playerId: string; guessedAuthorId: string}[]>([]);
  
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [authorId, setAuthorId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(180);

  // Initialize prompt mode logic
  useEffect(() => {
    if (step === "InitPrompt") {
      if (game.questionMode === "random") {
        const rawQ = questionsData[Math.floor(Math.random() * questionsData.length)];
        setPrompt((rawQ as Record<string, string>)[game.language] || rawQ.en);
        setStep("Answers");
      } 
      else if (game.questionMode === "vote_preset") {
        // pick 3 random preset questions
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

  // Timer logic for regular votes
  useEffect(() => {
    if (step === "Vote" || step === "VotePrompt") {
      if (timeLeft <= 0) return;
      const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timerId);
    }
  }, [step, timeLeft]);

  // --------------- PROMPT PHASE HANDLERS ---------------

  const handleNextPromptInput = () => {
    if (!tempPromptInput.trim()) return;
    const newCustoms = [...customPrompts, { playerId: game.players[currentPromptActionIndex].id, text: tempPromptInput }];
    setCustomPrompts(newCustoms);
    setTempPromptInput("");

    if (currentPromptActionIndex + 1 < game.players.length) {
      setCurrentPromptActionIndex(currentPromptActionIndex + 1);
      setStep("PassPhoneInputPrompt");
    } else {
      // Finished writing custom prompts
      const options = newCustoms.map(c => c.text);
      if (game.questionMode === "random_custom") {
        // pick one random
        const chosen = options[Math.floor(Math.random() * options.length)];
        setPrompt(chosen);
        setStep("Answers");
      } else {
        // vote_custom
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
      // Finished voting, find max votes
      let maxVote = -1;
      let bestIndices: number[] = [];
      newVotes.forEach((v, i) => {
        if (v > maxVote) { maxVote = v; bestIndices = [i]; }
        else if (v === maxVote) { bestIndices.push(i); }
      });
      // if tie, pick one randomly among the best
      const winnerIndex = bestIndices[Math.floor(Math.random() * bestIndices.length)];
      setPrompt(promptOptions[winnerIndex]);
      setStep("Answers");
    }
  };

  // --------------- GAME PHASE HANDLERS ---------------

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
      setAuthorId(shuffledAnswers[0].playerId);
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
      for (const [pId, pScore] of roundScores.entries()) {
        const currentScore = newScores.get(pId);
        newScores.set(pId, (typeof currentScore === "number" ? currentScore : 0) + pScore);
      }
      setScores(newScores);

      if (currentDebateIndex + 1 < answers.length) {
        setCurrentDebateIndex(currentDebateIndex + 1);
        setAuthorId(answers[currentDebateIndex + 1].playerId);
        setVotes([]);
        setCurrentVoteIndex(0);
        setStep("Debate");
      } else {
        setStep("Results");
      }
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // --------------- RENDER ---------------

  if (step === "InitPrompt") return null;

  if (step === "PassPhoneInputPrompt") {
    const currentPlayer = game.players[currentPromptActionIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
        <p className="text-purple-300">Submit your custom question!</p>
        <button
          onClick={() => setStep("InputPrompt")}
          className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors mt-6"
        >
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
          className="w-full rounded-xl bg-purple-950/50 p-4 text-white outline-none border border-purple-800/50 focus:border-fuchsia-500"
          rows={4}
          placeholder={"Type a question..."}
          value={tempPromptInput}
          onChange={(e) => setTempPromptInput(e.target.value)}
        />
        <button
          onClick={handleNextPromptInput}
          className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors"
        >
          {t(game.language, "submitPass")} <ArrowRight className="inline ml-2" size={18} />
        </button>
      </div>
    );
  }

  if (step === "PassPhoneVotePrompt") {
    const currentPlayer = game.players[currentPromptActionIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
        <p className="text-purple-300">Vote for the best question!</p>
        <button
          onClick={() => {
            setStep("VotePrompt");
            setTimeLeft(180);
          }}
          className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors mt-6"
        >
          {t(game.language, "startVoting")}
        </button>
      </div>
    );
  }

  if (step === "VotePrompt") {
    const currentPlayer = game.players[currentPromptActionIndex];
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-fuchsia-400 mb-4">
          <Clock size={24} />
          <span className="text-2xl font-bold font-mono">{formatTime(timeLeft)}</span>
        </div>
        <h2 className="text-2xl font-bold text-white">{currentPlayer?.name}, pick a question</h2>
        <div className="space-y-3 pt-2">
          {promptOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleNextPromptVote(idx)}
              className="w-full rounded-xl bg-purple-900/50 p-4 text-left hover:bg-fuchsia-600/50 transition-colors border border-purple-700/50"
            >
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
        <div className="text-fuchsia-300 font-bold bg-fuchsia-900/30 p-3 rounded-lg border border-fuchsia-500/20 shadow-inner">
          <span className="text-xs uppercase tracking-widest text-fuchsia-400/80 mb-1 block">Question</span>
          {prompt}
        </div>
        <textarea
          className="w-full rounded-xl bg-purple-950/50 p-4 text-white outline-none border border-purple-800/50 focus:border-fuchsia-500"
          rows={4}
          placeholder={t(game.language, "typeAnswer")}
          value={currentAnswerText}
          onChange={(e) => setCurrentAnswerText(e.target.value)}
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
    const authorAnswer = answers.find(a => a.playerId === authorId)?.answer;
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-fuchsia-400">{t(game.language, "timeToDebate")} ({currentDebateIndex + 1}/{answers.length})</h2>
        <div className="text-fuchsia-300 bg-fuchsia-900/30 px-3 py-2 rounded-lg border border-fuchsia-500/20 text-sm">
          {prompt}
        </div>
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
    if (!currentPlayer) return null;

    const isAuthor = currentPlayer.id === authorId;
    const authorAnswer = answers.find(a => a.playerId === authorId)?.answer;
    
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-fuchsia-400 mb-4">
          <Clock size={24} />
          <span className="text-2xl font-bold font-mono">{formatTime(timeLeft)}</span>
        </div>
        <h2 className="text-2xl font-bold text-white">{currentPlayer?.name}{t(game.language, "yourTurn")}</h2>
        <div className="text-fuchsia-300 bg-fuchsia-900/30 px-3 py-2 rounded-lg border border-fuchsia-500/20 text-sm">
          {prompt}
        </div>
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
