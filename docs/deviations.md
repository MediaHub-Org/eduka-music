# Deviations from the original artifact

Intentional differences from `docs/reference/mapa-acordes-artifact.html`. Chords without a slash bass must match the artifact (goldens in `tests/golden/artifact.json`).

## Task 2 (positions)

- None in scoring or ordering. The artifact's UI-side `ensure()` mutation of the `topList` array is not ported.
- Position cache key uses the root spelling plus quality id (`inst|capo|root|quality`), same discriminating power as the artifact's `inst+capo+root+q`.
- Performance: worst case (G9, guitar, no cache) measured at about 10 ms (G9 guitar, capo 0; cold JIT), well under the 150 ms bound; no Web Worker needed on this evidence.
