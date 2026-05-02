import { z } from "zod";

export const gameTypeSchema = z.enum(["round_robin", "finals"]);

export const topPerformerSchema = z.object({
  team: z.string().min(1),
  player: z.string().min(1),
  points: z.number().int().min(0).max(80),
  rebounds: z.number().int().min(0).max(35),
  assists: z.number().int().min(0).max(30),
  steals: z.number().int().min(0).max(12),
  blocks: z.number().int().min(0).max(12),
});

export const simulationSchema = z.object({
  gameTitle: z.string().min(1),
  gameType: gameTypeSchema,
  preGameStory: z.string().min(1),
  matchupFocus: z.array(z.string().min(1)).min(2).max(6),
  quarters: z
    .array(
      z.object({
        quarter: z.number().int().min(1).max(4),
        story: z.string().min(1),
        momentumTeam: z.string().min(1),
      }),
    )
    .length(4),
  halftimeReport: z.string().min(1),
  fourthQuarter: z.string().min(1),
  finalTwoMinutes: z.string().min(1),
  finalPossession: z.string().min(1),
  highlightMoments: z
    .array(
      z.object({
        title: z.string().min(1),
        quarter: z.number().int().min(1).max(4),
        player: z.string().min(1),
        team: z.string().min(1),
        description: z.string().min(1),
        imagePrompt: z.string().min(1),
        imageUrl: z.string().optional(),
      }),
    )
    .min(1)
    .max(4),
  topPerformers: z.array(topPerformerSchema).min(4).max(8),
  finalResult: z.object({
    winner: z.string().min(1),
    loser: z.string().min(1),
    winnerScore: z.number().int().min(80).max(140),
    loserScore: z.number().int().min(80).max(140),
    revealText: z.string().min(1),
  }),
  mvp: z.object({
    player: z.string().min(1),
    team: z.string().min(1),
    reason: z.string().min(1),
  }),
  imagePrompts: z.object({
    gamePoster: z.string().min(1),
    clutchMoment: z.string().min(1),
    championshipCelebration: z.string().min(1),
  }),
});

export type SimulationSchema = z.infer<typeof simulationSchema>;

export const teamInputSchema = z.object({
  name: z.string().trim().min(2).max(28),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  pg: z.string().trim().min(2).max(40),
  sg: z.string().trim().min(2).max(40),
  sf: z.string().trim().min(2).max(40),
  pf: z.string().trim().min(2).max(40),
  c: z.string().trim().min(2).max(40),
});

export const leagueInputSchema = z.object({
  name: z.string().trim().min(2).max(40),
  teams: z.array(teamInputSchema).length(3),
});
