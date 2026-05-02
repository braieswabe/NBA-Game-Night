export type Position = "pg" | "sg" | "sf" | "pf" | "c";

export type TeamInput = {
  name: string;
  color: string;
  pg: string;
  sg: string;
  sf: string;
  pf: string;
  c: string;
};

export type FaceReference = {
  id: string;
  /** Display name for this league member (leaderboard / labels). */
  name: string;
  /** Roster player on this face's team whose likeness the photo represents (PG–C names from the team builder). */
  linkedPlayerName?: string;
  imageDataUrl: string;
  avatarImageUrl?: string;
};

export type TeamRatings = {
  starPower: number;
  spacing: number;
  defense: number;
  rimProtection: number;
  rebounding: number;
  playmaking: number;
  clutch: number;
  pace: number;
  chemistry: number;
  offense: number;
  defenseOverall: number;
};

export type Team = TeamInput & {
  id: string;
  ownerName?: string;
  identity: string;
  ratings: TeamRatings;
};

export type GameType = "round_robin" | "finals";
export type GameStatus = "pending" | "simulated";

export type TopPerformer = {
  team: string;
  player: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
};

export type Simulation = {
  gameTitle: string;
  gameType: GameType;
  preGameStory: string;
  matchupFocus: string[];
  quarters: {
    quarter: number;
    story: string;
    momentumTeam: string;
  }[];
  halftimeReport: string;
  fourthQuarter: string;
  finalTwoMinutes: string;
  finalPossession: string;
  highlightMoments: {
    title: string;
    quarter: number;
    player: string;
    team: string;
    description: string;
    imagePrompt: string;
    imageUrl?: string;
  }[];
  topPerformers: TopPerformer[];
  finalResult: {
    winner: string;
    loser: string;
    winnerScore: number;
    loserScore: number;
    revealText: string;
  };
  mvp: {
    player: string;
    team: string;
    reason: string;
  };
  imagePrompts: {
    gamePoster: string;
    clutchMoment: string;
    championshipCelebration: string;
  };
};

export type Game = {
  id: string;
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  gameType: GameType;
  status: GameStatus;
  winnerTeamId?: string;
  finalScoreHome?: number;
  finalScoreAway?: number;
  simulation?: Simulation;
  celebrationImageUrl?: string;
};

export type Standing = {
  teamId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
};

export type League = {
  id: string;
  name: string;
  teams: Team[];
  games: Game[];
  standings: Standing[];
  faceReferences?: FaceReference[];
  createdAt: string;
  updatedAt: string;
};

/** League directory row from the database (no nested teams/games/images). */
export type LeagueSummary = {
  id: string;
  name: string;
  updatedAt: string;
};
