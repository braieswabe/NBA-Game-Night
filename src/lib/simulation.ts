import { leagueInputSchema, simulationSchema } from "@/lib/schemas";
import type {
  Game,
  GameType,
  League,
  FaceReference,
  Simulation,
  Standing,
  Team,
  TeamInput,
  TeamRatings,
  TopPerformer,
} from "@/lib/types";

type PlayerTraits = {
  star: number;
  spacing: number;
  defense: number;
  rim: number;
  rebounding: number;
  playmaking: number;
  clutch: number;
  pace: number;
};

const PLAYER_TRAITS: Record<string, PlayerTraits> = {
  "steve nash": traits(91, 96, 67, 35, 45, 99, 84, 91),
  "kobe bryant": traits(98, 88, 89, 55, 63, 82, 99, 86),
  "larry bird": traits(97, 96, 78, 45, 82, 91, 97, 72),
  "giannis antetokounmpo": traits(97, 70, 92, 91, 93, 84, 86, 96),
  "patrick ewing": traits(91, 65, 87, 91, 88, 55, 80, 68),
  "michael jordan": traits(99, 82, 96, 66, 69, 83, 100, 93),
  "lebron james": traits(99, 84, 88, 78, 83, 97, 94, 91),
  "shaquille o'neal": traits(98, 35, 86, 93, 96, 62, 88, 72),
  "shaquille oneal": traits(98, 35, 86, 93, 96, 62, 88, 72),
  "tim duncan": traits(96, 72, 96, 95, 94, 77, 93, 66),
  "victor wembanyama": traits(94, 82, 92, 99, 88, 74, 84, 78),
  "dirk nowitzki": traits(95, 98, 67, 58, 82, 70, 94, 65),
  "joel embiid": traits(96, 84, 88, 92, 92, 72, 89, 66),
  "shai gilgeous-alexander": traits(96, 85, 83, 55, 61, 88, 94, 84),
  "magic johnson": traits(98, 78, 74, 50, 79, 100, 91, 88),
  "stephen curry": traits(98, 100, 72, 37, 52, 93, 98, 91),
  "kevin durant": traits(98, 96, 82, 78, 78, 79, 97, 83),
  "hakeem olajuwon": traits(96, 70, 97, 98, 93, 70, 91, 77),
  "kawhi leonard": traits(95, 89, 99, 65, 72, 76, 95, 76),
  "nikola jokic": traits(97, 89, 73, 74, 93, 99, 91, 65),
  "luka doncic": traits(96, 90, 69, 45, 82, 97, 95, 72),
  "anthony davis": traits(94, 76, 93, 96, 91, 66, 84, 75),
  "kevin garnett": traits(95, 78, 97, 92, 93, 82, 90, 82),
  "dwyane wade": traits(94, 75, 88, 66, 62, 84, 96, 93),
  "chris paul": traits(92, 89, 87, 38, 48, 98, 91, 82),
  "jayson tatum": traits(93, 89, 82, 66, 76, 74, 88, 80),
  "damian lillard": traits(92, 95, 66, 35, 46, 88, 98, 84),
};

function traits(
  star: number,
  spacing: number,
  defense: number,
  rim: number,
  rebounding: number,
  playmaking: number,
  clutch: number,
  pace: number,
): PlayerTraits {
  return { star, spacing, defense, rim, rebounding, playmaking, clutch, pace };
}

function id(prefix: string, seed: string) {
  return `${prefix}_${hash(seed).toString(36)}_${Date.now().toString(36)}`;
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let state = hash(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function freshSeed(...parts: string[]) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${parts.join("-")}-${crypto.randomUUID()}`;
  }
  return `${parts.join("-")}-${Date.now()}-${Math.random()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function cleanName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function playerTraits(player: string): PlayerTraits {
  const key = player.toLowerCase().replace(/[.]/g, "").trim();
  if (PLAYER_TRAITS[key]) return PLAYER_TRAITS[key];

  const playerHash = hash(key);
  const swing = (shift: number) => ((playerHash >> shift) & 15) - 7;
  return traits(
    clamp(78 + swing(0), 68, 91),
    clamp(76 + swing(4), 62, 91),
    clamp(75 + swing(8), 60, 90),
    clamp(69 + swing(12), 45, 88),
    clamp(72 + swing(16), 50, 90),
    clamp(74 + swing(20), 55, 91),
    clamp(76 + swing(24), 60, 92),
    clamp(75 + swing(28), 62, 91),
  );
}

function createRatings(input: TeamInput): TeamRatings {
  const pg = playerTraits(input.pg);
  const sg = playerTraits(input.sg);
  const sf = playerTraits(input.sf);
  const pf = playerTraits(input.pf);
  const c = playerTraits(input.c);
  const all = [pg, sg, sf, pf, c];

  const starPower = average(all.map((p) => p.star));
  const spacing = average([pg.spacing, sg.spacing, sf.spacing, pf.spacing * 0.9, c.spacing * 0.75]);
  const defense = average(all.map((p) => p.defense));
  const rimProtection = average([pf.rim, c.rim, sf.rim * 0.65]);
  const rebounding = average([sf.rebounding * 0.75, pf.rebounding, c.rebounding]);
  const playmaking = average([pg.playmaking * 1.25, sg.playmaking, sf.playmaking, pf.playmaking * 0.75]);
  const clutch = average([pg.clutch, sg.clutch * 1.2, sf.clutch, pf.clutch, c.clutch * 0.85]);
  const pace = average(all.map((p) => p.pace));
  const spacingVariance = Math.abs(pg.spacing - c.spacing) * 0.06;
  const chemistry = clamp(88 - spacingVariance + (playmaking - 75) * 0.14, 68, 98);
  const offense = average([starPower, spacing, playmaking, clutch, chemistry]);
  const defenseOverall = average([defense, rimProtection, rebounding, chemistry * 0.55]);

  return normalizeRatings({
    starPower,
    spacing,
    defense,
    rimProtection,
    rebounding,
    playmaking,
    clutch,
    pace,
    chemistry,
    offense,
    defenseOverall,
  });
}

function normalizeRatings(ratings: TeamRatings): TeamRatings {
  return Object.fromEntries(
    Object.entries(ratings).map(([key, value]) => [key, Math.round(clamp(value, 1, 99))]),
  ) as TeamRatings;
}

function identityFor(ratings: TeamRatings) {
  const traits = [
    ["elite shot creation", ratings.starPower],
    ["floor spacing", ratings.spacing],
    ["switchable defense", ratings.defense],
    ["rim protection", ratings.rimProtection],
    ["glass control", ratings.rebounding],
    ["advantage passing", ratings.playmaking],
    ["late-game shot making", ratings.clutch],
    ["transition pressure", ratings.pace],
  ].sort((a, b) => Number(b[1]) - Number(a[1]));

  return `Built around ${traits[0][0]}, ${traits[1][0]}, and ${traits[2][0]}.`;
}

export function createTeam(input: TeamInput, index: number, ownerName?: string): Team {
  const cleaned: TeamInput = {
    name: cleanName(input.name),
    color: input.color,
    pg: cleanName(input.pg),
    sg: cleanName(input.sg),
    sf: cleanName(input.sf),
    pf: cleanName(input.pf),
    c: cleanName(input.c),
  };
  const ratings = createRatings(cleaned);

  return {
    id: id("team", `${cleaned.name}-${index}`),
    ...cleaned,
    ownerName,
    ratings,
    identity: identityFor(ratings),
  };
}

export function createLeague(name: string, teams: TeamInput[], faceReferences: FaceReference[] = []): League {
  const parsed = leagueInputSchema.parse({ name, teams });
  const now = new Date().toISOString();
  const leagueId = id("league", parsed.name);
  const createdTeams = parsed.teams.map((team, index) => createTeam(team, index, faceReferences[index]?.name));
  const pairings = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];
  const games: Game[] = pairings.map(([home, away], index) => ({
    id: id("game", `${leagueId}-${index}`),
    leagueId,
    homeTeamId: createdTeams[home].id,
    awayTeamId: createdTeams[away].id,
    gameType: "round_robin",
    status: "pending",
  }));

  return {
    id: leagueId,
    name: cleanName(parsed.name),
    teams: createdTeams,
    games,
    standings: calculateStandings(createdTeams, games),
    faceReferences,
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateStandings(teams: Team[], games: Game[]): Standing[] {
  const standings = new Map<string, Standing>();
  teams.forEach((team) => {
    standings.set(team.id, {
      teamId: team.id,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
    });
  });

  games
    .filter((game) => game.status === "simulated" && game.finalScoreHome != null && game.finalScoreAway != null)
    .forEach((game) => {
      const home = standings.get(game.homeTeamId);
      const away = standings.get(game.awayTeamId);
      if (!home || !away) return;
      const homeScore = game.finalScoreHome ?? 0;
      const awayScore = game.finalScoreAway ?? 0;
      home.pointsFor += homeScore;
      home.pointsAgainst += awayScore;
      away.pointsFor += awayScore;
      away.pointsAgainst += homeScore;
      if (homeScore > awayScore) {
        home.wins += 1;
        away.losses += 1;
      } else {
        away.wins += 1;
        home.losses += 1;
      }
    });

  return [...standings.values()]
    .map((standing) => ({
      ...standing,
      pointDifferential: standing.pointsFor - standing.pointsAgainst,
    }))
    .sort((a, b) => b.wins - a.wins || b.pointDifferential - a.pointDifferential || b.pointsFor - a.pointsFor);
}

export function ensureFinalsGame(league: League): League {
  const roundRobinDone = league.games
    .filter((game) => game.gameType === "round_robin")
    .every((game) => game.status === "simulated");
  const hasFinals = league.games.some((game) => game.gameType === "finals");
  if (!roundRobinDone || hasFinals) return league;

  const standings = calculateStandings(league.teams, league.games);
  const [first, second] = standings;
  if (!first || !second) return league;

  return {
    ...league,
    games: [
      ...league.games,
      {
        id: id("finals", `${league.id}-${first.teamId}-${second.teamId}`),
        leagueId: league.id,
        homeTeamId: first.teamId,
        awayTeamId: second.teamId,
        gameType: "finals",
        status: "pending",
      },
    ],
    standings,
    updatedAt: new Date().toISOString(),
  };
}

export function simulateGame(league: League, game: Game): Game {
  const home = teamById(league, game.homeTeamId);
  const away = teamById(league, game.awayTeamId);
  const random = rng(freshSeed(league.id, game.id, home.name, away.name));
  const homePower = teamPower(home, away);
  const awayPower = teamPower(away, home);
  const finalsLift = game.gameType === "finals" ? 2 : 0;
  const upset = (random() - 0.5) * 12;
  const margin = clamp((homePower - awayPower) * 0.5 + 1.5 + upset, -18, 18);
  const baseTotal = clamp(
    202 + (home.ratings.pace + away.ratings.pace - 150) * 0.28 + (home.ratings.offense + away.ratings.offense - 160) * 0.22,
    184,
    238,
  );
  let homeScore = Math.round(baseTotal / 2 + margin / 2 + finalsLift + random() * 4);
  let awayScore = Math.round(baseTotal / 2 - margin / 2 + random() * 4);

  homeScore = clamp(homeScore, 92, 125);
  awayScore = clamp(awayScore, 92, 125);
  if (homeScore === awayScore) {
    if (homePower + random() * 3 >= awayPower) homeScore += 2;
    else awayScore += 2;
  }

  const winner = homeScore > awayScore ? home : away;
  const loser = winner.id === home.id ? away : home;
  const simulation = buildSimulation({
    home,
    away,
    gameType: game.gameType,
    homeScore,
    awayScore,
    winner,
    loser,
    random,
  });

  return {
    ...game,
    status: "simulated",
    winnerTeamId: winner.id,
    finalScoreHome: homeScore,
    finalScoreAway: awayScore,
    simulation,
  };
}

function teamPower(team: Team, opponent: Team) {
  const matchup =
    (team.ratings.spacing - opponent.ratings.rimProtection) * 0.11 +
    (team.ratings.rebounding - opponent.ratings.rebounding) * 0.12 +
    (team.ratings.playmaking - opponent.ratings.defense) * 0.1 +
    (team.ratings.clutch - opponent.ratings.clutch) * 0.08;

  return average([
    team.ratings.offense * 1.2,
    team.ratings.defenseOverall,
    team.ratings.starPower,
    team.ratings.clutch,
    team.ratings.chemistry,
  ]) + matchup;
}

function teamById(league: League, teamId: string) {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Missing team ${teamId}`);
  return team;
}

function buildSimulation(args: {
  home: Team;
  away: Team;
  gameType: GameType;
  homeScore: number;
  awayScore: number;
  winner: Team;
  loser: Team;
  random: () => number;
}): Simulation {
  const { home, away, gameType, homeScore, awayScore, winner, loser, random } = args;
  const winnerScore = Math.max(homeScore, awayScore);
  const loserScore = Math.min(homeScore, awayScore);
  const margin = winnerScore - loserScore;
  const tight = margin <= 5;
  const blowout = margin >= 15;
  const comeback = !blowout && random() < 0.32;
  const comebackDeficit = pick([13, 15, 17, 19, 21], random);
  const winnerPlayers = roster(winner);
  const loserPlayers = roster(loser);
  const mvpPlayer = pickMvp(winner, random);
  const performers = makePerformers(winner, loser, winnerScore, loserScore, mvpPlayer, random);
  const closer = winnerPlayers[1] === mvpPlayer ? winnerPlayers[2] : winnerPlayers[1];
  const defensiveAnchor = winnerPlayers[4];
  const injuryMoment = random() < 0.24;
  const injuryTeam = random() < 0.55 ? loser : winner;
  const injuryPlayer = pick(roster(injuryTeam), random);
  const injuryStory = `${injuryPlayer} comes up slow after contact near the lane, and the broadcast stays with the bench as trainers check on him. It is framed as an availability question, not a diagnosis, but it changes the rotation and the arena immediately feels it.`;
  const turningPoint = pick(
    [
      "a quiet substitution that changes the rebounding math",
      "a timeout where the broadcast catches the assistant coach drawing the same action three times",
      "a foul trouble scare that forces both teams into smaller lineups",
      "a cold stretch that turns every clean look into a pressure test",
      "a defensive cross-match that steals two possessions before anyone names it on the broadcast",
      injuryMoment ? `an injury scare for ${injuryPlayer} that forces ${injuryTeam.name} to improvise` : "a sudden zone look that breaks the rhythm for three straight trips",
    ],
    random,
  );
  const momentum = [
    home.ratings.pace >= away.ratings.pace ? home.name : away.name,
    home.ratings.spacing >= away.ratings.spacing ? home.name : away.name,
    home.ratings.defenseOverall >= away.ratings.defenseOverall ? home.name : away.name,
    winner.name,
  ];
  const firstQuarterStory = pick(
    [
      `${momentum[0]} starts fastest. The first run feels like a statement package on the broadcast: hard outlets, two early paint touches, and a timeout camera catching the other bench already rewriting matchups on the board.`,
      `${momentum[0]} wins the opening tone with cleaner force. The arena reacts less to the makes than to the speed of decisions, because every catch already has the next pass attached to it.`,
      `${momentum[0]} lands the first punch, not with chaos, but with tempo control. The first quarter becomes a test of who can get back on defense before the crowd fully stands up.`,
      blowout
        ? `${winner.name} does not wait for the game to settle. The first quarter turns into a pressure wave, and by the first timeout the broadcast is already asking how ${loser.name} can stop the bleeding without abandoning the plan.`
        : `${momentum[0]} controls the first quarter, but the tape shows enough counters that nobody on the broadcast is ready to call it stable.`,
    ],
    random,
  );
  const secondQuarterStory = comeback
    ? `${loser.name} looks like it is about to take control, stretching the pressure toward a ${comebackDeficit}-point gap and forcing ${winner.name} into a long, uncomfortable timeout. The broadcast tone changes from analysis to survival.`
    : pick(
        [
          `${momentum[1]} changes the texture of the game with cleaner spacing and a sharper second-side attack. A cold shooting pocket turns into a test of patience, and the team that keeps moving the defense starts stacking quality possessions.`,
          `${momentum[1]} steadies the second quarter by attacking the help before it is set. The broadcast keeps replaying one simple read because it opens three different scoring windows.`,
          `${momentum[1]} survives the bench minutes by turning the game into a half-court puzzle. Nothing looks easy, but the shots start coming from better places.`,
          injuryMoment
            ? injuryStory
            : `${momentum[1]} wins the middle of the quarter with small things: two box-outs, one extra pass, and a transition stop that gets replayed like a bucket.`,
        ],
        random,
      );
  const thirdQuarterStory = comeback
    ? `${winner.name} starts the climb after halftime. The deficit does not vanish all at once; it gets cut through stops, cross-matches, and one loud run that makes the arena sound nervous before it sounds excited.`
    : pick(
        [
          `${momentum[2]} owns the first long swing after halftime. The adjustment is visible: earlier help at the elbows, more physical catches on the wings, and selective pace instead of the reckless track meet the first half threatened to become.`,
          `${momentum[2]} comes out of halftime like the coaches found the pressure point. The third quarter is full of delayed cuts, late tags, and possessions that feel won before the shot goes up.`,
          `${momentum[2]} turns the third into a film-room quarter. The defense shrinks the floor, the offense keeps searching for the second option, and the game starts to feel heavier.`,
          blowout
            ? `${winner.name} turns the third quarter into the segment that breaks the broadcast open. The lead grows because the defense travels with the offense, and every ${loser.name} miss becomes another early-clock problem.`
            : `${momentum[2]} wins the adjustment battle just enough to make every possession feel like it has a consequence attached.`,
        ],
        random,
      );
  const fourthQuarterStory = blowout
    ? `${winner.name} closes like a team refusing to give away film or rhythm. The fourth quarter is about professionalism: no lazy turnovers, no bailout fouls, and no emotional window for ${loser.name}.`
    : comeback
      ? `${winner.name} completes the emotional flip in the fourth. What started as damage control becomes belief, and every defensive rebound feels like another piece of the comeback becoming real.`
      : pick(
          [
            `${winner.name} plays the final quarter with better shot discipline. Every possession starts to feel heavier, and when the arena gets loud, the ball keeps finding ${mvpPlayer} in the action that has bothered the defense all night.`,
            `${winner.name} enters the fourth with a clearer closing plan. ${mvpPlayer} becomes the pressure release, and the supporting actions around him keep the defense from loading up completely.`,
            `${winner.name} wins the emotional part of the fourth. The possessions are slower, the huddles are shorter, and ${mvpPlayer} starts dictating which defender has to make the hardest choice.`,
          ],
          random,
        );

  const simulation: Simulation = {
    gameTitle: `${away.name} at ${home.name}`,
    gameType,
    preGameStory:
      gameType === "finals"
        ? pick(
            [
              `The camera starts in the tunnel before the title game: taped wrists, silent handshakes, and the low roar of the arena bleeding through the concrete. ${home.name} and ${away.name} walk into a championship atmosphere with every matchup magnified by the lights.`,
              `The finals broadcast opens with slow-motion warmups and the trophy sitting alone at center court. ${home.name} and ${away.name} know this is less about talent now and more about who can keep decision-making clean under championship noise.`,
              `A title-game hush hangs over the first possession. ${home.name} brings the home-court edge, ${away.name} brings the counterpunch, and the broadcast frames it as a night where every mismatch will be hunted until it breaks.`,
            ],
            random,
          )
        : pick(
            [
              `The broadcast opens from a darkened arena bowl as the starters step through smoke and warmup jumpers flash under the scoreboard. ${home.name} and ${away.name} open with contrasting identities: ${home.identity} ${away.name} counters with ${away.identity.toLowerCase()}`,
              `Tip-off feels like a scouting report coming alive. ${home.name} wants to impose ${home.identity.toLowerCase()} ${away.name} walks in trying to bend the game toward ${away.identity.toLowerCase()}`,
              `The pre-game package keeps cutting between the two huddles. ${home.name} looks built for control, while ${away.name} carries the kind of volatility that can flip a round-robin table in one quarter.`,
            ],
            random,
          ),
    matchupFocus: [
      pick(
        [
          `${home.pg}'s organization against ${away.pg}'s pressure at the point of attack, especially when the first action gets denied.`,
          `${away.pg}'s ability to disrupt the first pass before ${home.pg} can organize the spacing.`,
          `The guard matchup, where every late-clock possession starts with who wins the first angle.`,
        ],
        random,
      ),
      pick(
        [
          `${home.c} and ${away.c} deciding whether the paint becomes a runway, a wall, or a foul-line negotiation.`,
          `The center battle, because one clean roll or one vertical contest can change the entire shot diet.`,
          `${home.pf} and ${away.pf} fighting for the possession after the possession: tips, seals, and second-chance leverage.`,
        ],
        random,
      ),
      pick(
        [
          `${winner.name}'s late-game creation against ${loser.name}'s best defensive adjustment once the easy counters disappear.`,
          `${turningPoint}, which becomes the small tactical detail that the broadcast keeps circling back to.`,
          `How quickly ${loser.name} can change coverages before ${winner.name} finds the matchup it trusts most.`,
        ],
        random,
      ),
    ],
    quarters: [
      {
        quarter: 1,
        story: firstQuarterStory,
        momentumTeam: momentum[0],
      },
      {
        quarter: 2,
        story: secondQuarterStory,
        momentumTeam: comeback ? loser.name : momentum[1],
      },
      {
        quarter: 3,
        story: thirdQuarterStory,
        momentumTeam: comeback ? winner.name : momentum[2],
      },
      {
        quarter: 4,
        story: fourthQuarterStory,
        momentumTeam: momentum[3],
      },
    ],
    halftimeReport: pick(
      [
        `At the desk, the story is less about the score and more about control. ${home.name} leans on ${home.ratings.playmaking >= away.ratings.playmaking ? "passing angles" : "shot quality"}, while ${away.name} searches for the cleanest way to protect the paint without giving up corner rhythm. The second half is set up as a tactical argument.`,
        comeback
          ? `The halftime panel frames the game as a character test. ${winner.name} is staring at a large deficit, and the question is whether the next six minutes become a comeback or a collapse.`
          : `The halftime panel circles ${turningPoint} as the detail that could swing the night. ${home.name} has the cleaner first-half structure, but ${away.name} has enough counters to keep the broadcast from calling anything stable.`,
        blowout
          ? `${winner.name} has turned the game into a scoreboard problem and a pride problem. The desk talks less about one magic adjustment and more about whether ${loser.name} can string together enough stops to make the fourth quarter matter.`
          : `Halftime feels like a reset, not a break. The desk talks pace, foul pressure, and whether ${home.name} can keep its stars comfortable once ${away.name} starts switching the weak-side actions.`,
      ],
      random,
    ),
    fourthQuarter: pick(
      [
        comeback
          ? `${winner.name} has dragged the game out of the danger zone, and now ${loser.name} is the team searching for answers. The comeback does not feel lucky; it feels built from stops and patience.`
          : `${loser.name} has a real push left, and the body language says they know exactly where the comeback lives. But ${winner.name} keeps forcing the possession into its preferred matchup, slowing the game into a series of half-court decisions.`,
        `${loser.name} does not fold; the fourth-quarter push is organized and uncomfortable. ${winner.name} answers by trimming the playbook down to the actions it can trust under noise.`,
        blowout
          ? `The fourth quarter becomes a broadcast study in closing habits. ${winner.name} keeps playing through the right reads even with the game stretched, while ${loser.name} tries to find something useful before the final horn.`
          : `The fourth quarter becomes a test of nerve. ${loser.name} keeps arriving with counters, but ${winner.name} finds just enough calm to make the game happen on its terms.`,
      ],
      random,
    ),
    finalTwoMinutes: tight
      ? pick(
          [
            `The last two minutes feel like a possession-by-possession broadcast cut: timeouts, switches, shoe squeaks, and every miss echoing through the building. Nobody on the floor looks comfortable, which is exactly why it feels real.`,
            `The final two minutes slow down until every dribble sounds like a decision. ${loser.name} keeps applying pressure, but ${winner.name} keeps finding the one pass that avoids panic.`,
            `The broadcast goes quiet between whistles because the tension is carrying itself. Every timeout feels like a chess clock, every defensive switch like a bet.`,
          ],
          random,
        )
      : blowout
        ? pick(
            [
              `${winner.name} is not protecting a fragile lead anymore; it is managing a blowout with discipline. The final two minutes are about clean possessions, emptying the emotional tank, and letting the broadcast shift into legacy talk.`,
              `The final two minutes arrive with the outcome mostly settled, but ${winner.name} still treats every possession like a standard. That is what makes the blowout feel earned instead of random.`,
            ],
            random,
          )
        : pick(
          [
            `${winner.name} creates separation late by stacking stops and avoiding the rushed shots that usually reopen the door. The broadcast keeps cutting to the opposing huddle, where the urgency has turned into math.`,
            `${winner.name} does not blow the doors open, but it controls the late math. The lead grows through defensive rebounds, smart fouls avoided, and possessions that use the full clock without getting passive.`,
            `The final two minutes are less frantic than decisive. ${winner.name} keeps the ball out of danger areas, and ${loser.name} starts running out of clean chances to make the game weird.`,
          ],
            random,
          ),
    finalPossession: tight
      ? pick(
          [
            `${closer} draws the first trap, ${mvpPlayer} relocates into space, and the closing touch arrives just before the defense can recover. The camera tracks the ball, then the bench, then the crowd realizing the moment has already happened.`,
            `${mvpPlayer} rejects the first screen, waits out the switch, and turns the last possession into a one-on-one broadcast close-up. The release comes with a defender on his hip and the arena holding its breath.`,
            `${winner.name} uses the decoy action first, then lets ${mvpPlayer} attack the late rotation. It is not a clean possession, but it is the kind of ugly-good possession that wins tight games.`,
          ],
          random,
        )
      : blowout
        ? pick(
            [
              `${winner.name} dribbles out the final seconds after a complete performance. The broadcast does not sell it as drama; it sells it as dominance.`,
              `${loser.name} gets one last look, but the possession feels symbolic more than dangerous. ${winner.name} has already done the work.`,
            ],
            random,
          )
        : pick(
          [
            `${loserPlayers[0]} tries to extend the night, but ${winner.name}'s shell defense finishes the possession without panic. The final rebound is not flashy; it is just strong hands, bodies on bodies, and the sound of a season ending.`,
            `${loserPlayers[1]} hunts a quick three, but ${defensiveAnchor} shows high enough to erase the rhythm. The miss drops into traffic, and ${winner.name} finally exhales.`,
            `${loser.name} needs a miracle sequence, but ${winner.name} refuses the first domino. One switch, one contest, one rebound, and the game tilts into the closing graphic.`,
          ],
            random,
          ),
    highlightMoments: [
      {
        title: tight ? "The Dagger Sequence" : comeback ? "The Comeback Breaks Through" : blowout ? "The Run That Broke It Open" : "The Separation Run",
        quarter: 4,
        player: mvpPlayer,
        team: winner.name,
        description: tight
          ? `${mvpPlayer} becomes the center of the final action, forcing the defense to choose between the first trap and the late recovery.`
          : comeback
            ? `${mvpPlayer} gives ${winner.name} the possession where the comeback stops feeling theoretical and starts feeling inevitable.`
            : blowout
              ? `${mvpPlayer} fuels the run that turns the game from competitive to controlled, forcing the broadcast to talk about dominance instead of drama.`
              : `${mvpPlayer} anchors the late run that turns tension into control, giving ${winner.name} the breath it needed.`,
        imagePrompt: `A cinematic basketball highlight image of ${mvpPlayer} from ${winner.name} ${tight ? "taking a decisive fourth-quarter shot" : comeback ? "celebrating after a comeback three-pointer" : blowout ? "finishing a fast-break run during a blowout" : "taking a decisive fourth-quarter shot"} in a packed arena, custom ${winner.color} jersey, defenders contesting, clock glowing, intense playoff atmosphere, realistic sports photography, no real league logos.`,
      },
      {
        title: "The Defensive Stand",
        quarter: 4,
        player: winnerPlayers[4],
        team: winner.name,
        description: `${winnerPlayers[4]} closes the paint on the possession that changes the emotional temperature of the game.`,
        imagePrompt: `A cinematic basketball highlight image of ${winnerPlayers[4]} from ${winner.name} making a dramatic defensive stop at the rim, custom ${winner.color} jersey, arena spotlights, crowd rising, realistic sports photography, no real league logos.`,
      },
      ...(injuryMoment
        ? [
            {
              title: "The Injury Scare",
              quarter: 2,
              player: injuryPlayer,
              team: injuryTeam.name,
              description: injuryStory,
              imagePrompt: `A realistic sports broadcast still of ${injuryPlayer} from ${injuryTeam.name} being helped near the sideline after contact, teammates and trainers nearby, concerned arena atmosphere, custom ${injuryTeam.color} jersey, no graphic injury, no blood, no diagnosis, no real league logos.`,
            },
          ]
        : []),
      ...(comeback
        ? [
            {
              title: `${comebackDeficit}-Point Comeback Watch`,
              quarter: 3,
              player: closer,
              team: winner.name,
              description: `${winner.name} turns a ${comebackDeficit}-point hole into a live game, and ${closer} delivers the possession that makes the arena believe again.`,
              imagePrompt: `A cinematic basketball broadcast image of ${closer} from ${winner.name} igniting a comeback from a ${comebackDeficit}-point deficit, custom ${winner.color} jersey, bench erupting, scoreboard glow, realistic sports photography, no real league logos.`,
            },
          ]
        : []),
    ],
    topPerformers: performers,
    finalResult: {
      winner: winner.name,
      loser: loser.name,
      winnerScore,
      loserScore,
      revealText:
        gameType === "finals"
          ? `${winner.name} wins the championship, ${winnerScore}-${loserScore}.`
          : `${winner.name} survives the round-robin stage with a ${winnerScore}-${loserScore} win over ${loser.name}.`,
    },
    mvp: {
      player: mvpPlayer,
      team: winner.name,
      reason:
        gameType === "finals"
          ? `Controlled the championship possessions and delivered the defining late-game sequence.`
          : `Set the terms of the matchup with efficient scoring and timely decisions.`,
    },
    imagePrompts: {
      gamePoster: `A cinematic basketball game poster for two fictional teams, ${home.name} in ${home.color} and ${away.name} in ${away.color}, dramatic arena spotlights, no real logos, no real player likenesses.`,
      clutchMoment:
        "A cinematic basketball scene of a fictional athlete taking a game-winning jump shot in a packed arena, defenders contesting, clock glowing in the background, realistic sports photography, no real logos, no real player likenesses.",
      championshipCelebration: `A cinematic basketball championship scene: ONLY the finals MVP on the winner's podium in custom ${winner.color} jerseys for fictional team ${winner.name} (no real logos), holding a gold basketball trophy, confetti, hero lighting. Far background out of focus: defeated fictional team ${loser.name} in ${loser.color} jerseys looking emotionally crushed, tears, slumped shoulders, broadcast depth-of-field so the loser group reads as distant bench or tunnel area—not on the podium. Widescreen, realistic sports photography.`,
    },
  };

  return simulationSchema.parse(simulation);
}

function roster(team: Team) {
  return [team.pg, team.sg, team.sf, team.pf, team.c];
}

function pickMvp(team: Team, random: () => number) {
  const weighted = [
    [team.pg, team.ratings.playmaking + team.ratings.clutch],
    [team.sg, team.ratings.starPower + team.ratings.clutch + 10],
    [team.sf, team.ratings.starPower + team.ratings.spacing],
    [team.pf, team.ratings.defense + team.ratings.rebounding],
    [team.c, team.ratings.rimProtection + team.ratings.rebounding],
  ] as const;
  const total = weighted.reduce((sum, [, value]) => sum + value, 0);
  let cursor = random() * total;
  for (const [player, value] of weighted) {
    cursor -= value;
    if (cursor <= 0) return player;
  }
  return team.sg;
}

function makePerformers(
  winner: Team,
  loser: Team,
  winnerScore: number,
  loserScore: number,
  mvp: string,
  random: () => number,
): TopPerformer[] {
  const winnerRoster = roster(winner);
  const loserRoster = roster(loser);
  const leadPoints = clamp(Math.round(winnerScore * 0.27 + random() * 7), 24, 42);
  const secondPoints = clamp(Math.round(winnerScore * 0.2 + random() * 6), 18, 31);
  const loserLead = clamp(Math.round(loserScore * 0.25 + random() * 7), 22, 39);
  const loserSecond = clamp(Math.round(loserScore * 0.19 + random() * 6), 16, 29);

  const performers: TopPerformer[] = [
    line(winner.name, mvp, leadPoints, winner.ratings, random, true),
    line(winner.name, winnerRoster.find((player) => player !== mvp) ?? winnerRoster[1], secondPoints, winner.ratings, random),
    line(loser.name, loserRoster[1], loserLead, loser.ratings, random),
    line(loser.name, loserRoster[3], loserSecond, loser.ratings, random),
  ];

  return performers;
}

function line(
  team: string,
  player: string,
  points: number,
  ratings: TeamRatings,
  random: () => number,
  featured = false,
): TopPerformer {
  return {
    team,
    player,
    points,
    rebounds: clamp(Math.round((ratings.rebounding - 55) * 0.18 + random() * 8 + (featured ? 2 : 0)), 2, 16),
    assists: clamp(Math.round((ratings.playmaking - 55) * 0.18 + random() * 8 + (featured ? 2 : 0)), 1, 15),
    steals: clamp(Math.round(random() * 3), 0, 4),
    blocks: clamp(Math.round((ratings.rimProtection - 60) * 0.05 + random() * 3), 0, 5),
  };
}

export function applySimulatedGame(league: League, simulatedGame: Game): League {
  const games = league.games.map((game) => (game.id === simulatedGame.id ? simulatedGame : game));
  const withStandings = {
    ...league,
    games,
    standings: calculateStandings(league.teams, games),
    updatedAt: new Date().toISOString(),
  };
  return ensureFinalsGame(withStandings);
}

export function lockSimulationResult(base: Simulation, candidate: unknown): Simulation {
  const parsed = simulationSchema.safeParse(candidate);
  if (!parsed.success) return base;

  return {
    ...parsed.data,
    gameType: base.gameType,
    finalResult: base.finalResult,
    imagePrompts: {
      ...parsed.data.imagePrompts,
      championshipCelebration: base.imagePrompts.championshipCelebration,
    },
    mvp: parsed.data.mvp.team === base.finalResult.winner ? parsed.data.mvp : base.mvp,
  };
}
