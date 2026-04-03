"use client";

import { useState } from "react";
import { GameContextState } from "@/hooks/useGame";
import { ArrowRight, Trophy, Vote } from "lucide-react";
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
  const [step, setStep] = useState<"Prompt" | "Answers" | "Debate" | "Vote" | "Results">("Answers");
  const [prompt] = useState(() => {
    const rawQ = questionsData[Math.floor(Math.random() * questionsData.length)];
    // Fallback safely if language is slightly mismatched
    return (rawQ as Record<string, string>)[game.language] || rawQ.en;
  });
  
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [answers, setAnswers] = useState<{playerId: string; answer: string}[]>([]);
  const [currentAnswerText, setCurrentAnswerText] = useState("");
  
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [votes, setVotes] = useState<{playerId: string; guessedAuthorId: string}[]>([]);
  
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [authorId, setAuthorId] = useState<string>("");

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
      // Pick random author to debate!
      const randomAuthor = newAnswers[Math.floor(Math.random() * newAnswers.length)];
      setAuthorId(randomAuthor.playerId);
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
    } else {
      // End of vote
      const finalScores = game.calculateScores(answers, authorId, newVotes);
      setScores(finalScores);
      setStep("Results");
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
          onChange={(e: any) => setCurrentAnswerText(e.target.value)}
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
    const authorAnswer = answers.find((a: any) => a.playerId === authorId)?.answer;
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-fuchsia-400">{t(game.language, "timeToDebate")}</h2>
        <p className="text-white text-lg bg-purple-900/40 p-4 rounded-xl italic">&quot;{authorAnswer}&quot;</p>
        <p className="text-purple-300 text-sm">{t(game.language, "whoWroteThis")}</p>
        <button
          onClick={() => setStep("Vote")}
          className="w-full rounded-xl bg-fuchsia-600 px-6 py-3 font-bold hover:bg-fuchsia-500 transition-colors"
        >
          {t(game.language, "startVoting")} <Vote className="inline ml-2" size={18} />
        </button>
      </div>
    );
  }

  if (step === "Vote") {
    const currentPlayer = game.players[currentVoteIndex];
    // Skip if current player is the author? Actually authors can vote too (to self-vote or bluff) or we let everyone vote.
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">{t(game.language, "passTo")} {currentPlayer?.name}</h2>
        <p className="text-purple-300">{t(game.language, "whoDoYouThink")}</p>
        <div className="space-y-3">
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
      </div>
    );
  }

  if (step === "Results") {
    const author = game.players.find(p => p.id === authorId);
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <Trophy className="mx-auto text-yellow-400" size={48} />
        <h2 className="text-3xl font-bold text-white">{t(game.language, "results")}</h2>
        <p className="text-purple-300">{t(game.language, "answerWrittenBy")} <span className="font-bold text-fuchsia-400">{author?.name}</span>!</p>
        <div className="space-y-3 bg-purple-950/40 p-4 rounded-xl">
          {game.players.map(p => (
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
