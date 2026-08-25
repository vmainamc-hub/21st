import { describe, it, expect } from "vitest";
import { computeDossierScore, emptyEvidenceInput } from "@/lib/sentinel/observation";

describe("Apex Ranking Engine — Psychology, Danger, Momentum, & Manipulation Priorities", () => {
  it("ranks candidates with full psychology support higher than conflicting psychology", () => {
    const scoreGoodPsy = computeDossierScore(
      { marketId: "R_100", proposition: "OVER_1", state: "OBSERVING" },
      {
        ...emptyEvidenceInput("R_100", "OVER_1"),
        psychology: {
          raw: {
            digitPsychology: {
              score: 90,
              verdict: "SUPPORT",
              gained: 9.0,
              weightTotal: 10,
            },
          },
        } as any,
      },
    );

    const scoreWeakPsy = computeDossierScore(
      { marketId: "R_50", proposition: "OVER_1", state: "OBSERVING" },
      {
        ...emptyEvidenceInput("R_50", "OVER_1"),
        psychology: {
          raw: {
            digitPsychology: {
              score: 45,
              verdict: "CONTESTED",
              gained: 3.0,
              weightTotal: 10,
            },
          },
        } as any,
      },
    );

    expect(scoreGoodPsy.score).toBeGreaterThan(scoreWeakPsy.score);
  });

  it("prioritizes candidates with minimal danger over hazardous candidates when scores are close", () => {
    const scoreSafe = computeDossierScore(
      { marketId: "R_100", proposition: "OVER_1", state: "OBSERVING" },
      {
        ...emptyEvidenceInput("R_100", "OVER_1"),
        danger: {
          total: 12,
          level: "CALM",
          isHardBlocked: false,
        } as any,
      },
    );

    const scoreDangerous = computeDossierScore(
      { marketId: "R_75", proposition: "OVER_1", state: "OBSERVING" },
      {
        ...emptyEvidenceInput("R_75", "OVER_1"),
        danger: {
          total: 75,
          level: "CRITICAL",
          isHardBlocked: false,
        } as any,
      },
    );

    expect(scoreSafe.score).toBeGreaterThan(scoreDangerous.score);
  });

  it("prioritizes candidates with winning digits increasing rapidly (high momentum)", () => {
    const scoreSurging = computeDossierScore(
      { marketId: "R_100", proposition: "OVER_1", state: "OBSERVING" },
      {
        ...emptyEvidenceInput("R_100", "OVER_1"),
        winningSideMomentum: {
          index: 85,
          state: "SURGING",
          bonusPoints: 4.5,
        } as any,
      },
    );

    const scoreFlat = computeDossierScore(
      { marketId: "R_25", proposition: "OVER_1", state: "OBSERVING" },
      {
        ...emptyEvidenceInput("R_25", "OVER_1"),
        winningSideMomentum: {
          index: 10,
          state: "FLAT",
          bonusPoints: 0,
        } as any,
      },
    );

    expect(scoreSurging.score).toBeGreaterThan(scoreFlat.score);
  });

  it("prioritizes low fluctuation and clean distribution (low manipulation)", () => {
    const scoreCalmClean = computeDossierScore(
      { marketId: "R_100", proposition: "OVER_1", state: "OBSERVING" },
      {
        ...emptyEvidenceInput("R_100", "OVER_1"),
        fluctuation: {
          score: 10,
          state: "CALM",
        } as any,
        manipulationScore: {
          value: 10,
        } as any,
      },
    );

    const scoreChaoticManip = computeDossierScore(
      { marketId: "R_50", proposition: "OVER_1", state: "OBSERVING" },
      {
        ...emptyEvidenceInput("R_50", "OVER_1"),
        fluctuation: {
          score: 75,
          state: "CHAOTIC",
        } as any,
        manipulationScore: {
          value: 50,
        } as any,
      },
    );

    expect(scoreCalmClean.score).toBeGreaterThan(scoreChaoticManip.score);
  });
});
