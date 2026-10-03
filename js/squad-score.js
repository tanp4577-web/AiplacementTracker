/* ============ Squad scoring ============
   Points come only from the verdict of real test runs (how many tests passed), never from anything the player
   claims. The rules are deliberately simple so a player can predict their score:

     base points         Easy 10, Medium 20, Hard 40
     solved (all tests)  base + a time bonus of up to 50% of base (shrinks to 0 over the question's time limit)
                         minus 2 points per earlier wrong submission (never below half of base)
     not solved yet      30% of base times the share of tests passed (best attempt), so partial work counts a little
     squad bonus         +5 for every member when the whole squad solved the question

   Time limits per question: Easy 10 min, Medium 20 min, Hard 30 min (the leader can scale them). */
const SquadScore = (() => {
  const BASE = { Easy: 10, Medium: 20, Hard: 40 };
  const LIMIT_SEC = { Easy: 600, Medium: 1200, Hard: 1800 };
  const WRONG_PENALTY = 2;
  const SQUAD_BONUS = 5;

  const base = (difficulty) => BASE[difficulty] || BASE.Medium;
  const limit = (difficulty, scale = 1) => Math.round((LIMIT_SEC[difficulty] || LIMIT_SEC.Medium) * scale);

  /** Points for one player on one question.
      attempts: [{ passed, total, atSec }] in order; atSec is seconds since the question opened. */
  function questionPoints({ difficulty, attempts, limitScale = 1 }) {
    const b = base(difficulty);
    const list = Array.isArray(attempts) ? attempts : [];
    const solvedIdx = list.findIndex((a) => a.total > 0 && a.passed === a.total);
    if (solvedIdx >= 0) {
      const at = Math.max(0, list[solvedIdx].atSec || 0);
      const bonus = Math.round(b * 0.5 * Math.max(0, 1 - at / limit(difficulty, limitScale)));
      const wrongBefore = solvedIdx; // every attempt before the solving one failed
      const penalty = Math.min(WRONG_PENALTY * wrongBefore, Math.round(b * 0.4));
      return { solved: true, points: Math.max(Math.round(b / 2), b + bonus - penalty), parts: { base: b, bonus, penalty } };
    }
    const best = list.reduce((m, a) => (a.total > 0 ? Math.max(m, a.passed / a.total) : m), 0);
    return { solved: false, points: Math.round(b * 0.3 * best), parts: { base: 0, bonus: 0, penalty: 0, partial: Math.round(b * 0.3 * best) } };
  }

  /** Scoreboard for a finished (or running) round.
      questions: [{ id, difficulty }]; players: [id]; attemptsBy: { playerId: { questionId: [attempt] } } */
  function scoreboard({ questions, players, attemptsBy, limitScale = 1, squad = true }) {
    const rows = players.map((p) => ({ player: p, solved: 0, points: 0, perQuestion: {} }));
    for (const q of questions) {
      const results = rows.map((r) => questionPoints({ difficulty: q.difficulty, attempts: ((attemptsBy[r.player] || {})[q.id]) || [], limitScale }));
      const everyoneSolved = squad && players.length > 1 && results.every((x) => x.solved);
      rows.forEach((r, i) => {
        const pts = results[i].points + (everyoneSolved ? SQUAD_BONUS : 0);
        r.points += pts;
        if (results[i].solved) r.solved++;
        r.perQuestion[q.id] = { ...results[i], points: pts, squadBonus: everyoneSolved ? SQUAD_BONUS : 0 };
      });
    }
    const ranked = rows.slice().sort((a, b) => b.points - a.points || b.solved - a.solved);
    ranked.forEach((r, i) => { r.rank = i > 0 && ranked[i - 1].points === r.points && ranked[i - 1].solved === r.solved ? ranked[i - 1].rank : i + 1; });
    return { rows: ranked, squadTotal: ranked.reduce((t, r) => t + r.points, 0) };
  }

  return { BASE, LIMIT_SEC, SQUAD_BONUS, WRONG_PENALTY, questionPoints, scoreboard, limit };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SquadScore;
