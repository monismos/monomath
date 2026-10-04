# Matrices: bounded contract and fixtures

The lab accepts square 2×2 and 3×3 integer matrices, entries −6…6. Rows use semicolons; columns use commas. Closed operations are transform, add, transpose, multiply, determinant, inverse (2×2), and solve with a matching column vector. No expression execution is involved.

- `transform([1,1;0,1])`: columns (1,0), (1,1); determinant 1; a shear preserves area.
- `multiply([1,2;3,4],[2,0;1,2])`: [4,4;10,8]; the first cell contains 1×2 + 2×1.
- `determinant([0,1;1,0])`: −1; the unit square changes orientation while preserving area.
- `inverse([2,1;1,1])`: [1,−1;−1,2]; composition returns the unit square.
- `solve([2,1;1,-1],[5;1])`: x=(2,1); the two lines meet there.
- `solve([1,2;2,4],[3;6])`: infinitely many solutions, one free direction.
- `solve([1,2;2,4],[3;5])`: no solution, parallel distinct lines.
- `transform([1,1,0;0,2,0;0,0,-1])`: determinant −2; the deformed cube has twice the volume and reversed orientation.

The independent unit-test oracle is mathjs. Geometry must use actual transformed vertices and segments rather than rounded boxes that suggest a shear. Real eigenvalues and eigenspaces are approximate visual annotations; algebraic results and rational Gaussian elimination are exact. A matrix with no real eigenvectors must say so.

Proofs validate entered output cells or basis endpoints, determinant sign/scale, inverse composition and system classification. A numerical claim alone cannot complete a construction. Boss phases connect determinant, basis images and the row-by-column loop. Shared scene ids, dial layers, tethers, prediction gates, context restoration, touch controls and offline reload remain acceptance requirements.

The local gate includes exact mathjs oracles, seeded construction validators, repeated/complex eigenspaces, equation-plane vertices, signed-area orientation, all dial layers, maximum 3×3 WebGL scenes, keyboard/touch, Boss and offline notelet Jump. Production e2e records only Chromium's headless ReadPixels GPU performance notices separately; application errors and warnings fail. Physical-device FPS and Lighthouse remain M6 checks.
