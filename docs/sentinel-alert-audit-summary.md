# Sentinel Alert System Audit Summary

This document summarizes the changes, verification improvements, and architectural cleanups across the Sentinel proactive alert layer and Continuous Observation pipeline.

---

## 1. Files Changed in the Original Pass

* **`src/lib/sentinel/observation/selectivity.ts`**
  * Added `selectivityCalibrationCheck(totalObservations, ripeCount)` to compute selectivity ratio and categorize into `TOO_STRICT`, `TOO_LOOSE`, or `BALANCED`.
* **`src/lib/sentinel/observation/observationEngine.ts`**
  * Connected `selectivityCalibrationCheck` to `getHealthStatus()` so calibration health is reported live with other engine diagnostics.
* **`src/lib/sentinel/observation/types.ts`**
  * Extended `ObservationEngineHealthReport` with `calibrationCheck` and added `qualityBand` & `qualityAssessment` fields to `ObservationDossier`.
* **`src/lib/apex/types.ts`**
  * Added `qualityBand` (`QualityBand`) and `reliabilityState` to `RankedOpportunity` and `AlertSnapshot`.
* **`src/lib/sentinel/opportunity-alert.ts`**
  * Implemented re-alert hysteresis: candidate changes require two consecutive superior samples to switch active targets, score improvements require two consecutive ticks exceeding `materialScoreDelta`, and dip-and-recover within `EPISODE_GRACE_MS` preserves `openedAt`.
  * Included `qualityBand` and `reliabilityState` in the `AlertSnapshot` record for operator visibility without turning them into hard blockers.
* **`src/lib/apex/scan.ts`**
  * Attached `qualityBand` and `reliabilityState` when constructing `RankedOpportunity` from each ranked `ObservationDossier`.

---

## 2. Test Verification Additions & Fixes

### Test 49: Real Equivalence Across All 4 Quality Bands (`observation.test.ts`)
* **Why the original was insufficient**: The previous test only verified that an existing top dossier's quality band belonged to the set of valid string names, without exercising all 4 bands or testing the actual `RankedOpportunity.qualityBand` populated via `rankOpportunities()`.
* **The fix**: Created calibrated inputs for all four distinct quality bands (`EXCEPTIONAL`, `STRONG`, `MODERATE`, `WEAK`), ingested them into `observationEngine`, executed `rankOpportunities()`, and asserted that `rankedOpportunity.qualityBand` strictly equals `assessQuality(dossier, momentumRelation).band` for each corresponding band.

### `qualify()` Stability & Boundary Matrix (`opportunity-alert.test.ts`)
* **Why the original was insufficient**: Existing tests only tested a small subset of passing/failing paths without locking down exact threshold boundaries or asserting hardcoded failure strings for regression prevention.
* **The fix**: Added a comprehensive, table-driven test covering boundary conditions for score (`minScore - 1` vs `minScore`), confidence (`minConfidence - 1` vs `minConfidence`), persistence (`minPersistence - 1` vs `minPersistence`), stability (`minStability - 1` vs `minStability`), missing entry digits, safety blocks (`blocked` & `signal.state`), all `hardConflict` types, fragile execution survival, and independent evidence package fallback under non-`SUPPORT` agreement. Each case asserts hardcoded `expectedOk` and exact `expectedFailures`.

---

## 3. Duplicate `assessQuality()` Refactor (`scan.ts`)

* **Issue**: `scan.ts` previously called `assessQuality()` independently when mapping `allRankedDossiers` to `RankedOpportunity[]`, duplicating the quality assessment already computed during dossier scoring.
* **Solution**: `buildDossier()` in `observationCell.ts` and `isQualificationCleared()` in `scoring.ts` now store the computed `qualityBand` (and `qualityAssessment`) directly on the `ObservationDossier`. `scan.ts` reads `dossier.qualityBand` directly (with a safe fallback to `assessQuality` if undefined), removing redundant computation while ensuring complete behavioral consistency.
