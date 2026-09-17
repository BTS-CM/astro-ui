/**
 * Deterministic lottery algorithms for the airdrop calculator.
 *
 * Each algorithm takes a numeric seed string derived from a block's
 * `witness_signature` (via {@link filterSignature}) and deterministically
 * produces a set of "winning ticket numbers." Those ticket numbers are then
 * matched against a weighted {@link https://en.wikipedia.org/wiki/Line_interpolation|leaderboard}
 * where each account owns a contiguous numeric range proportional to its
 * weight (balance, ticket lock, collateral, etc.).
 *
 * The algorithms fall into two categories:
 *   **Lottery algorithms** — generate tickets from the seed signature alone.
 *   **Filter algorithms** — operate on the already-built candidate pool.
 *
 * The geometric (3-D vector) lottery algorithms sample every line at a
 * **constant density** of {@link TICKET_DENSITY} tickets per unit of
 * Euclidean length.  Because the density is constant, the number of tickets
 * a line contributes is proportional to its length — so every unit of
 * geometric length is treated equally and short lines still contribute.
 * Samples are de-duplicated (per line, and again across the whole algorithm
 * run) so that no single integer coordinate is ever rewarded more than
 * once.
 *
 * The main entry point is {@link executeCalculation}, which orchestrates a
 * full run across one or more algorithms and maps the results back to
 * leaderboard accounts.
 */

// ---------------------------------------------------------------------------
// Minimal vector math (replaces the reference app's three.js dependency)
// ---------------------------------------------------------------------------

/**
 * Minimal 3D vector used by the geometric lottery algorithms.
 * Carries only the subset of three.js `Vector3` functionality needed for
 * line parameterisation and distance calculations.
 */
class Vector3 {
  /**
   * @param {number} [x=0] X component
   * @param {number} [y=0] Y component
   * @param {number} [z=0] Z component
   */
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Return the vector as a plain `[x, y, z]` array.
   * @returns {[number, number, number]}
   */
  toArray() {
    return [this.x, this.y, this.z];
  }

  /**
   * Squared distance from the origin (0,0,0).
   * Used as a normalisation bound for distance-based ticket extraction.
   * @returns {number}
   */
  distanceSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Squared Euclidean distance to another vector.
   * @param {Vector3} o
   * @returns {number}
   */
  distanceToSquared(o) {
    const dx = this.x - o.x;
    const dy = this.y - o.y;
    const dz = this.z - o.z;
    return dx * dx + dy * dy + dz * dz;
  }
}

/**
 * A line segment between two {@link Vector3} points.
 * Supports linear interpolation (`at`) and squared-length measurement.
 */
class Line3 {
  /**
   * @param {Vector3} a Start point
   * @param {Vector3} b End point
   */
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  /**
   * Squared length of the segment (distance from `a` to `b`).
   * @returns {number}
   */
  distanceSq() {
    return this.a.distanceToSquared(this.b);
  }

  /**
   * Linearly interpolate along the segment at parameter `t`.
   *   t = 0 → point `a`,  t = 1 → point `b`.
   * The result is written into `target` (mutated in place for performance).
   *
   * @param {number} t  Interpolation parameter in [0, 1].
   * @param {Vector3} target  Pre-allocated vector to write the result into.
   * @returns {Vector3} The same `target` reference, now filled with the
   *   interpolated position.
   */
  at(t, target) {
    target.x = this.a.x + (this.b.x - this.a.x) * t;
    target.y = this.a.y + (this.b.y - this.a.y) * t;
    target.z = this.a.z + (this.b.z - this.a.z) * t;
    return target;
  }
}

// ---------------------------------------------------------------------------
// Seed-shaping helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when `c` is a character in the range `'0'`–`'9'`.
 * Used by {@link filterSignature} to decide whether a character can be
 * kept as-is or must be replaced by its char code.
 *
 * @param {string} c  Single character to test.
 * @returns {boolean}
 */
function isCharNumber(c) {
  return c >= "0" && c <= "9";
}

/**
 * Strip leading non-numeric characters from `parseTarget` and return the
 * remaining integer value.
 *
 * Scans left-to-right for the first digit > 0, takes the substring from
 * that position to the end, and parses it with `parseInt(base 10)`.
 * Returns `0` if no valid integer is found.
 *
 * @param {string} parseTarget  String that may be prefixed with
 *   non-numeric characters (e.g. a chunk of a signature).
 * @returns {number}  Parsed integer, or `0`.
 */
function filterParseInt(parseTarget) {
  const vals = parseTarget.split("");
  let finalValue;
  for (let i = 0; i < vals.length; i++) {
    if (parseInt(vals[i], 10) > 0) {
      finalValue = parseTarget.substring(i, vals.length);
      break;
    }
  }
  return !finalValue ? 0 : parseInt(finalValue, 10);
}

// ---------------------------------------------------------------------------
// Cube coordinate <-> ticket packing via a 3-D Morton (Z-order) curve.
//
// The cube is 1024³ (COORD_MAX = 1023, 10 bits per axis).  Morton interleaves
// the x/y/z bits, so neighbouring cube coordinates map to neighbouring ticket
// numbers: a holder's contiguous ticket range corresponds to a spatially
// contiguous (locality-preserving) region of the cube.  That is what makes
// "a drawn shape wins the holders it passes through" actually true — unlike
// the old `z·1e6 + y·1e3 + x` raster, which wrapped discontinuously at every
// x = 999 boundary.
//
// Morton is an exact bijection onto `[0, 2³⁰ − 1]` for a power-of-two cube, so
// the holder ranges tile the space with no gaps, no overlaps, and no "dead"
// ranges, and every drawn point maps back to a valid cube coordinate.
// ---------------------------------------------------------------------------
const COORD_MAX = 1023; // 2^10 - 1

// Must match CUBE_TICKETS in airdrop.js (2³⁰ − 1).
const CUBE_TICKETS = 1073741823;

function mortonEncode(x, y, z) {
  let code = 0;
  for (let i = 0; i < 10; i++) {
    code |= ((x >> i) & 1) << (3 * i);
    code |= ((y >> i) & 1) << (3 * i + 1);
    code |= ((z >> i) & 1) << (3 * i + 2);
  }
  return code;
}

function mortonDecode(t) {
  const ti = Math.trunc(Number(t)) || 0;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < 10; i++) {
    x |= ((ti >> (3 * i)) & 1) << i;
    y |= ((ti >> (3 * i + 1)) & 1) << i;
    z |= ((ti >> (3 * i + 2)) & 1) << i;
  }
  return [x, y, z];
}

// Map a 0..999 signature digit-group into a full-range cube coordinate so the
// whole 1024³ volume is exercised.  Without this a 3-digit group only ever
// reaches coordinate 999, leaving the top ~7% of Morton codes unused and the
// holders assigned to them permanently unwinnable.
function sigCoord(v) {
  const n = Math.min(999, Math.max(0, Number(v) || 0));
  return Math.round((n / 999) * COORD_MAX);
}

/**
 * Split an array (or string) into equal-length chunks.
 *
 * The input is first converted to a full-width string representation via
 * `toLocaleString("fullwide", { useGrouping: false })` so that the
 * character expansion is deterministic across locales.  Only *complete*
 * chunks (length === `chunkSize`) are returned — any trailing partial
 * chunk is silently dropped.
 *
 * @param {string|Array} arr         Input to chunk.
 * @param {number}       chunkSize   Desired length of each chunk.
 *   Must be > 0 and ≤ `arr.length`.
 * @returns {string[]}  Array of string chunks.
 * @throws {Error} If `chunkSize` is invalid (≤ 0 or > input length).
 */
function chunk(arr, chunkSize) {
  if (chunkSize <= 0 || chunkSize > arr.length) {
    throw new Error("Invalid chunk size");
  }
  const refArr = arr.toLocaleString("fullwide", { useGrouping: false });
  const producedChunks = [];
  for (let i = 0; i < refArr.length; i += chunkSize) {
    producedChunks.push(refArr.slice(i, i + chunkSize));
  }
  return producedChunks.filter((x) => x.length === chunkSize);
}

/**
 * Constant ticket density for line-based sampling, expressed as tickets per
  * unit of Euclidean length in the `[0,1023]³` cube.
 *
 * A spacing of `1 / TICKET_DENSITY` units between samples guarantees that
 * every integer coordinate point within half a unit of the line is captured
 * at least once (rounding then collapses the dense samples onto the nearest
 * lattice point).  Combined with the per-line de-duplication below this
 * yields the maximally dense, duplicate-free set of points a line can
 * produce, independent of the line's orientation.
 *
 * @type {number}
 */
const TICKET_DENSITY = 2;

/**
 * Sample ticket numbers along a {@link Line3} at a constant density.
 *
 * The line is sampled at `t = i / (quantity + 1)` for `i = 1 … quantity`,
 * which spreads the samples evenly across the **entire** line (the previous
 * fixed `0.001` increment only covered the first `quantity / 1000` fraction
 * of the line, clustering every sample at the start for short lines and
 * producing thousands of duplicate tickets).  At each sample point the 3-D
 * coordinates are collapsed into a single integer ticket via the Morton
 * (Z-order) {@link mortonEncode} packing, which preserves spatial locality.
 *
 * Samples are de-duplicated per line so that no single integer coordinate
 * is rewarded more than once along the same line.
 *
 * @param {number} quantity   Number of samples to draw (gross; the returned
 *   array is de-duplicated so its length is `<= quantity`).
 * @param {Line3}  targetLine The line segment to sample.
 * @returns {number[]}  Array of unique integer ticket numbers.
 */
function extractTickets(quantity, targetLine) {
  const chosenTickets = [];
  const seen = new Set();
  for (let i = 1; i <= quantity; i++) {
    const resultPlaceholder = new Vector3(0, 0, 0);
    const calculated = targetLine.at(i / (quantity + 1), resultPlaceholder);
    const x = Math.round(Math.max(0, Math.min(COORD_MAX, calculated.x)));
    const y = Math.round(Math.max(0, Math.min(COORD_MAX, calculated.y)));
    const z = Math.round(Math.max(0, Math.min(COORD_MAX, calculated.z)));
    const ticket = mortonEncode(x, y, z);
    if (!seen.has(ticket)) {
      seen.add(ticket);
      chosenTickets.push(ticket);
    }
  }
  return chosenTickets;
}

/**
 * Draw tickets along a line at the global {@link TICKET_DENSITY}, returning
 * the de-duplicated set of unique integer coordinates the line passes near.
 *
 * @param {Line3} line The line segment to sample.
 * @returns {number[]} Unique integer ticket numbers along the line.
 */
function lineTickets(line) {
  const len = Math.sqrt(line.distanceSq());
  const qty = Math.max(1, Math.round(TICKET_DENSITY * len));
  return extractTickets(qty, line);
}

// ---------------------------------------------------------------------------
// Signature-derived (lottery) algorithms
//
// Each takes an array of 9-digit string chunks (produced by `chunk(seed, 9)`
// in `getTickets`) and returns an array of integer ticket numbers.
// ---------------------------------------------------------------------------

/**
 * Forward lottery — the simplest algorithm.
 *
 * Each 9-digit chunk is parsed directly as an integer.  The raw signature
 * digits become the ticket numbers with no transformation.
 *
 * @param {string[]} chunks  Array of 9-digit numeric strings.
 * @returns {number[]}  Parsed integer tickets.
 */
function forward(chunks) {
  return chunks.map((x) => filterParseInt(x));
}

/**
 * Reverse lottery — digit-mirrors each chunk before parsing.
 *
 * Each 9-digit chunk is reversed (`"123456789"` → `"987654321"`) and then
 * parsed.  Ensures the lottery outcome changes even for small signature
 * differences that only affect one end of the string.
 *
 * @param {string[]} chunks  Array of 9-digit numeric strings.
 * @returns {number[]}  Parsed integer tickets from reversed chunks.
 */
function reverse(chunks) {
  return chunks.map((x) => filterParseInt(x.split("").reverse().join("")));
}

/**
 * Reverse-π lottery — reversed chunks with π-based non-linear mixing.
 *
 * Steps:
 *   1. Reverse and parse every chunk.
 *   2. For each chunk `i`, combine it (via a π product) with every later
 *      chunk `y` in the range `i ≤ y < length/2`:
 *        `floor(√reversed[i]  ×  √reversed[y]  ×  π)`
 *   3. Collect all pair-products as tickets.
 *
 * The multiplication by π spreads the values across a much wider numeric
 * range than the raw digits.
 *
 * NOTE: the inner loop bound (`y < length - y`, i.e. `y < length/2`) means
 * only the lower half of the upper-triangle of pairs is generated — the
 * pair set is intentionally truncated relative to a full `y ≥ i` sweep, and
 * is asymmetric with {@link forward_pi}.  This matches the original
 * reference behaviour; change the bound to `y < reversedChunks.length` to
 * enumerate every `y ≥ i` pair.
 *
 * @param {string[]} chunks  Array of 9-digit numeric strings.
 * @returns {number[]}  π-mixed integer tickets.
 */
function reverse_pi(chunks) {
  const piChunks = [];
  const reversedChunks = chunks.map((x) =>
    filterParseInt(x.split("").reverse().join("")),
  );
  for (let i = 0; i < reversedChunks.length; i++) {
    const current = parseInt(Math.sqrt(reversedChunks[i]), 10);
    for (let y = i; y < reversedChunks.length - y; y++) {
      const nextValue = parseInt(Math.sqrt(reversedChunks[y]), 10);
      piChunks.push(parseInt(current * nextValue * Math.PI, 10));
    }
  }
  return piChunks;
}

/**
 * Forward-π lottery — like {@link reverse_pi} but without the initial
 * digit reversal.
 *
 * Each chunk is parsed forward, then for each chunk `i` it is combined
 * (via a π product) with every later chunk `y` in the range
 * `i ≤ y < length - i`:
 *     `floor(√parsed[i]  ×  √parsed[y]  ×  π)`
 *
 * The pair-wise structure ensures dense ticket coverage; the forward
 * (non-reversed) parsing means the signature's natural digit order
 * directly influences the outcome.
 *
 * NOTE: the inner loop bound (`y < length - i`) truncates the upper
 * triangle — only pairs with `y < length - i` are generated, so the pair
 * set shrinks as `i` grows.  This matches the original reference
 * behaviour; change the bound to `y < chunks.length` to enumerate every
 * `y ≥ i` pair.
 *
 * @param {string[]} chunks  Array of 9-digit numeric strings.
 * @returns {number[]}  π-mixed integer tickets (forward order).
 */
function forward_pi(chunks) {
  const piChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    const current = parseInt(Math.sqrt(filterParseInt(chunks[i])), 10);
    for (let y = i; y < chunks.length - i; y++) {
      const nextValue = parseInt(Math.sqrt(filterParseInt(chunks[y])), 10);
      piChunks.push(parseInt(current * nextValue * Math.PI, 10));
    }
  }
  return piChunks;
}

/**
 * Cubed lottery — amplifies small signature differences via cubic scaling.
 *
 * The signature is split into 3-digit groups, each parsed as an integer
 * and then cubed (`x³`).  Because cubing is a fast-growing function,
 * even a single-digit change in the input produces a vastly different
 * ticket number, spreading draws across the full numeric range.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Cubed integer tickets.
 */
function cubed(filtered_signature) {
  const smallerChunks = chunk(filtered_signature, 3).map((x) =>
    filterParseInt(x),
  );
  return smallerChunks.map((x) => parseInt(x * x * x, 10));
}

/**
 * Average-point-lines lottery — distance-weighted ticket extraction from
 * lines connecting each vector to the centroid.
 *
 * Algorithm:
 *   1. Split the signature into 9-digit chunks, then each chunk into three
 *      3-digit (x, y, z) groups → one vector per chunk.
 *   2. Compute the centroid (arithmetic mean) of all vectors.
 *   3. For each vector, draw a line to the centroid.
 *   4. Each line is sampled at the global {@link TICKET_DENSITY} (tickets
 *      per unit of Euclidean length), so every integer coordinate point
 *      within half a unit of the line is captured exactly once.  Because the
 *      density is constant, a longer line (a vector farther from the
 *      centroid) yields proportionally more tickets — this is the correct
 *      geometric consequence of treating every unit of length equally,
 *      rather than over- or under-sampling any region.
 *
 * @param {string[]} chunks      Array of 9-digit numeric strings.
 * @returns {number[]}  Extracted integer tickets.
 */
function avg_point_lines(chunks) {
  const vectorChunks = chunks.map((initialChunk) => chunk(initialChunk, 3));
  let xTally = 0;
  let yTally = 0;
  let zTally = 0;
  for (let i = 0; i < vectorChunks.length; i++) {
    const current = vectorChunks[i];
    xTally += sigCoord(filterParseInt(current[0]));
    yTally += sigCoord(filterParseInt(current[1]));
    zTally += sigCoord(filterParseInt(current[2]));
  }
  const avgVector = new Vector3(
    parseInt(xTally / vectorChunks.length, 10),
    parseInt(yTally / vectorChunks.length, 10),
    parseInt(zTally / vectorChunks.length, 10),
  );
  const avg_lines = vectorChunks.map((vector) => {
    const current = new Vector3(
      sigCoord(filterParseInt(vector[0])),
      sigCoord(filterParseInt(vector[1])),
      sigCoord(filterParseInt(vector[2])),
    );
    return new Line3(current, avgVector);
  });
  let chosenTickets = [];
  for (let i = 0; i < avg_lines.length; i++) {
    const currentLine = avg_lines[i];
    const currentChosenTickets = lineTickets(currentLine);
    chosenTickets.push(...currentChosenTickets);
  }
  return {
    tickets: chosenTickets,
    geometry: {
      type: "lines",
      segments: avg_lines.map((l) => ({
        a: l.a.toArray(),
        b: l.b.toArray(),
        group: "main",
      })),
      meta: { centroid: avgVector.toArray() },
    },
  };
}

/**
 * "Alien blood" lottery — vertical-line ticket extraction.
 *
 * The signature is split into 6-digit groups; each group is further split
 * into two 3-digit halves forming an (x, z) coordinate.  A vertical line
 * is constructed from `(x, 0, z)` to `(x, 1023, z)` (length 1023) and sampled
 * at the global {@link TICKET_DENSITY}, so every chunk's "drip" covers the
 * same number of integer coordinates but at different numeric positions.
 *
 * The name comes from the vertical "dripping" visual pattern the tickets
 * create when plotted in 3-D space.  The distribution therefore depends on
 * the x/z values in the signature, not on any distance weighting.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Extracted integer tickets.
 */
function alien_blood(filtered_signature) {
  const initHullChunks = chunk(filtered_signature, 6);
  const corrasionLines = [];
  let corrasionTickets = [];
  for (let i = 0; i < initHullChunks.length; i++) {
    const currentHullChunk = initHullChunks[i];
    const hullFragments = chunk(currentHullChunk, 3);
    const splatX = sigCoord(filterParseInt(hullFragments[0]));
    const splatY = sigCoord(filterParseInt(hullFragments[1]));
    const splatterPoint = new Vector3(splatX, 0, splatY);
    const coolingZone = new Vector3(splatX, COORD_MAX, splatY);
    const corrasion = new Line3(splatterPoint, coolingZone);
    corrasionLines.push(corrasion);
    const currentChosenTickets = lineTickets(corrasion);
    corrasionTickets = [...corrasionTickets, ...currentChosenTickets];
  }
  return {
    tickets: corrasionTickets,
    geometry: {
      type: "lines",
      segments: corrasionLines.map((l) => ({
        a: l.a.toArray(),
        b: l.b.toArray(),
        group: "main",
      })),
    },
  };
}

/**
 * "Bouncing ball" lottery — simulates a ball path between signature vectors.
 *
 * Algorithm:
 *   1. Convert each 9-digit chunk into a 3-D vector (3-digit x/y/z groups).
 *   2. Walk the vectors in order, tracing a path.  When the next vector's
 *      z-component is ≤ the current one (the ball "hits a surface"), insert
 *      a bounce point at the average x/y with z = 0 before continuing.
 *   3. Build line segments between consecutive (bounce) points.
 *   4. Each segment is sampled at the global {@link TICKET_DENSITY} (tickets
 *      per unit of Euclidean length), so every integer coordinate point
 *      within half a unit of the segment is captured exactly once.  Longer
 *      flights therefore yield proportionally more tickets — the correct
 *      geometric consequence of a constant density.
 *
 * The bouncing behaviour creates clusters of tickets near "impact" zones
 * while spreading thinner draws along longer flights.
 *
 * @param {string[]} chunks      Array of 9-digit numeric strings.
 * @returns {number[]}  Extracted integer tickets.
 */
function bouncing_ball(initialChunks) {
  // A path needs at least two signature vectors.  A single chunk cannot form
  // one, and leaving `bouncingVectors` empty would crash when the final
  // vector is resolved below.
  if (!initialChunks || initialChunks.length < 2) return [];

  const vectors = initialChunks.map((nineDigits) => {
    const vectorChunks = chunk(nineDigits, 3);
    return new Vector3(
      sigCoord(filterParseInt(vectorChunks[0])),
      sigCoord(filterParseInt(vectorChunks[1])),
      sigCoord(filterParseInt(vectorChunks[2])),
    );
  });
  const bouncingVectors = [];
  for (let i = 0; i < vectors.length; i++) {
    const currentVector = vectors[i];
    const cvArray = currentVector.toArray();
    const nextVector = vectors[i + 1];
    if (!nextVector) continue;
    const nvArray = nextVector.toArray();
    if (nvArray[2] <= cvArray[2]) {
      const xAxis = (parseInt(nvArray[0], 10) + parseInt(cvArray[0], 10)) / 2;
      const yAxis = (parseInt(nvArray[1], 10) + parseInt(cvArray[1], 10)) / 2;
      bouncingVectors.push(new Vector3(xAxis, yAxis, 0));
    }
    bouncingVectors.push(nextVector);
  }
  const lastVector = bouncingVectors.slice(-1)[0].toArray();
  lastVector[2] = 0;
  const finalVector = new Vector3(lastVector[0], lastVector[1], lastVector[2]);
  bouncingVectors.push(finalVector);
  const pathOfBall = [];
  for (let i = 0; i < bouncingVectors.length - 1; i++) {
    const currentVector = bouncingVectors[i];
    const nextVector = bouncingVectors[i + 1];
    pathOfBall.push(new Line3(currentVector, nextVector));
  }
  let chosenTickets = [];
  for (let i = 0; i < pathOfBall.length; i++) {
    const currentLine = pathOfBall[i];
    const currentChosenTickets = lineTickets(currentLine);
    chosenTickets.push(...currentChosenTickets);
  }
  return {
    tickets: chosenTickets,
    geometry: {
      type: "lines",
      segments: pathOfBall.map((p) => ({
        a: p.a.toArray(),
        b: p.b.toArray(),
        group: "main",
      })),
    },
  };
}

/**
 * "Barrel of fish" lottery — origin-to-endpoint line sampling.
 *
 * The most configurable algorithm.  The first chunk is treated as the
 * "point of impact" (origin); subsequent chunks define endpoint vectors.
 * Lines are drawn from the origin to each endpoint and tickets are
 * sampled along them.
 *
 * Parameters:
 *   - `projectile`: `"beam"` → the shot travels the **full** distance to the
 *     endpoint (the line is drawn origin → endpoint).  Anything else →
 *     `"slow"`: the projectile loses energy and the line is truncated to
 *     one third of that distance, stopping short like a real ballistic
 *     shell would.
 *   - `splinter`: `"yes"` → use *all* remaining chunks as separate
 *     endpoints (multiple lines from the same origin); anything else →
 *     use only the *first* remaining chunk (single line).
 *
 * The metaphor is firing at a barrel of fish from a fixed point: the
 * origin stays constant while the endpoints determine where the "shots"
 * land.  Every line — full or truncated — is sampled at the global
 * {@link TICKET_DENSITY}, so each unit of (effective) length contributes
 * the same number of tickets and no coordinate is rewarded twice along a
 * line.
 *
 * @param {string[]} initialChunks  Array of 9-digit numeric strings.
 *   `initialChunks[0]` is the origin; the rest are endpoints.
 * @param {string}   projectile     `"beam"` for the full line, anything else
 *   for a line truncated to one third of the distance.
 * @param {string}   splinter       `"yes"` to use all endpoint chunks,
 *   other to use only the first.
 * @returns {number[]}  Extracted integer tickets.
 */
function barrel_of_fish(initialChunks, projectile, splinter) {
  const pointOfImpact = chunk(initialChunks[0], 3);
  const poiVector = new Vector3(
    sigCoord(filterParseInt(pointOfImpact[0])),
    sigCoord(filterParseInt(pointOfImpact[1])),
    sigCoord(filterParseInt(pointOfImpact[2])),
  );
  const nextChunks = initialChunks.slice(1);
  const endVectors =
    splinter === "yes" ? nextChunks : nextChunks.length ? [nextChunks[0]] : [];
  const truncation = projectile === "beam" ? 1 : 1 / 3;
  const fishLines = [];
  let obliteratedFish = [];
  for (let y = 0; y < endVectors.length; y++) {
    const end = chunk(endVectors[y], 3);
    const rawEnd = new Vector3(
      sigCoord(filterParseInt(end[0])),
      sigCoord(filterParseInt(end[1])),
      sigCoord(filterParseInt(end[2])),
    );
    const endPoint = new Vector3(
      poiVector.x + (rawEnd.x - poiVector.x) * truncation,
      poiVector.y + (rawEnd.y - poiVector.y) * truncation,
      poiVector.z + (rawEnd.z - poiVector.z) * truncation,
    );
    const path = new Line3(poiVector, endPoint);
    fishLines.push(path);
    const currentChosenTickets = lineTickets(path);
    obliteratedFish = [...obliteratedFish, ...currentChosenTickets];
  }
  return {
    tickets: obliteratedFish,
    geometry: {
      type: "lines",
      segments: fishLines.map((l, y) => ({
        a: l.a.toArray(),
        b: l.b.toArray(),
        group: y === 0 ? "main" : "splinter",
      })),
      meta: { origin: poiVector.toArray() },
    },
  };
}

// ---------------------------------------------------------------------------
// Additional geometric / numeric lottery algorithms
// ---------------------------------------------------------------------------

/**
 * Fibonacci-lattice ("golden") lottery — uniform point distribution.
 *
 * Generates `N` points using a 3-D Kronecker (flat-torus) lattice, which has
 * provably **low discrepancy** (near-uniform density in every sub-region of
 * the `[0,1023]³` cube).  Each point is collapsed to a ticket via the Morton
 * (Z-order) {@link mortonEncode} packing.
 *
 *   x = (i·φ)    mod 1
 *   y = (i·√2)   mod 1
 *   z = (i·√3)   mod 1
 *
 * where φ = (1 + √5) / 2.  The three generators φ, √2, √3 are linearly
 * independent over the rationals, so by Weyl's equidistribution theorem the
 * points fill the cube evenly — no clustering, no gaps, and crucially **no
 * coordinate collapse**.  (An earlier version used φ, φ², φ³, but the Fibonacci
 * identity φ² = φ + 1 makes y ≡ x and z ≡ 2x, collapsing every point onto the
 * single line (x, x, 2x mod 1) in the x = y plane — a measure-zero subset that
 * let only holders intersecting that plane ever win.)
 *
 * This makes it the fairest purely-geometric option: every account range is
 * approximately equally likely to be hit, independent of where it sits in the
 * cube.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Array of integer tickets (one per lattice point).
 */
function golden(filtered_signature) {
  const chunks = chunk(filtered_signature, 9);
  // Number of lattice points — scales with the signature length but is
  // capped so very long signatures don't explode the ticket count.
  const n = Math.min(chunks.length * 100, 5000);
  const phi = (1 + Math.sqrt(5)) / 2;
  const root2 = Math.sqrt(2);
  const root3 = Math.sqrt(3);
  const tickets = [];
  const points = [];
  for (let i = 1; i <= n; i++) {
    const x = (i * phi) % 1;
    const y = (i * root2) % 1;
    const z = (i * root3) % 1;
    const xi = Math.floor(x * 1024);
    const yi = Math.floor(y * 1024);
    const zi = Math.floor(z * 1024);
    tickets.push(mortonEncode(xi, yi, zi));
    points.push([xi, yi, zi]);
  }
  return {
    tickets,
    geometry: { type: "points", points, meta: { lattice: "fibonacci" } },
  };
}

/**
 * Deterministic "walk" lottery — a meandering path through the cube.
 *
 * Starting from a point derived from the first signature chunk, the walk
 * takes one step per remaining chunk.  Each step's **direction** comes from
 * the chunk's three 3-digit groups (a 3-D vector) and its **length** varies
 * with those same digits, so the path is fully determined by the signature.
 * Points are clamped to the `[0,1023]³` cube (reflecting off the walls), and
 * tickets are sampled along every segment at the global {@link TICKET_DENSITY}
 * (tickets per unit of Euclidean length), so ticket density per unit of path
 * length stays uniform and no coordinate is rewarded twice along a step.
 *
 * Unlike {@link bouncing_ball} (which jumps between full vectors and only
 * inserts points on descent), the walk makes many small, locally-varying
 * steps, so it wanders through the volume and covers regions the straight
 * line-based algos leave empty.
 *
 * @param {string[]} initialChunks  Array of 9-digit numeric strings.
 * @returns {number[]}  Extracted integer tickets.
 */
function walk(initialChunks) {
  // A path needs at least two signature vectors (a start point + one step).
  if (!initialChunks || initialChunks.length < 2) return [];

  const parts = initialChunks.map((c) => chunk(c, 3));

  // Start point from the first chunk's three 3-digit groups.
  const start = parts[0];
  let current = new Vector3(
    sigCoord(filterParseInt(start[0])),
    sigCoord(filterParseInt(start[1])),
    sigCoord(filterParseInt(start[2])),
  );

  const maxStep = 60; // cap on a single step's length (≈ 6% of the cube)
  const chosenTickets = [];
  const walkLines = [];

  for (let i = 1; i < parts.length; i++) {
    const dx = sigCoord(filterParseInt(parts[i][0]));
    const dy = sigCoord(filterParseInt(parts[i][1]));
    const dz = sigCoord(filterParseInt(parts[i][2]));

    // Vary the step length (5..65 units) from the same digits so steps differ.
    const magRaw = (dx + dy + dz) % 1024;
    const mag = 5 + (magRaw / COORD_MAX) * maxStep;

    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const step = new Vector3(
      (dx / len) * mag,
      (dy / len) * mag,
      (dz / len) * mag,
    );

    const next = new Vector3(
      current.x + step.x,
      current.y + step.y,
      current.z + step.z,
    );
    // Reflect off the cube walls so the walk stays inside [0,1023]³.
    next.x = Math.max(0, Math.min(COORD_MAX, next.x));
    next.y = Math.max(0, Math.min(COORD_MAX, next.y));
    next.z = Math.max(0, Math.min(COORD_MAX, next.z));

    const line = new Line3(current, next);
    walkLines.push(line);
    chosenTickets.push(...lineTickets(line));
    current = next;
  }

  return {
    tickets: chosenTickets,
    geometry: {
      type: "lines",
      segments: walkLines.map((l) => ({
        a: l.a.toArray(),
        b: l.b.toArray(),
        group: "main",
      })),
    },
  };
}

/**
 * "Helix" lottery — tickets sampled along a 3-D spiral through the cube.
 *
 * A helix is parameterised by a centre `(cx, cy)`, a radius `R`, a number of
 * turns, and a phase — all derived from the signature.  The curve climbs
 * the z-axis from 0 to 1023 while rotating around the centre, so it sweeps a
 * cylindrical "tube" through the cube.  Points are sampled at evenly spaced
 * parameters and collapsed to tickets via the Morton (Z-order) packing.
 *
 * The radius is clamped so the whole helix stays inside the cube (no
 * clipping at the walls), and the number of samples scales with the
 * signature length.  Coverage is a tube rather than the whole volume, so
 * the helix gives a distinct spatial pattern from the point-based and
 * line-based algos.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Array of integer tickets sampled along the helix.
 */
function helix(filtered_signature) {
  const chunks = chunk(filtered_signature, 9);
  if (!chunks.length) return [];

  const p1 = chunk(chunks[0], 3);
  const p2 = chunks[1] ? chunk(chunks[1], 3) : p1;
  const p3 = chunks[2] ? chunk(chunks[2], 3) : p1;

  // Centre near the middle of the cube; radius/phase/turns from more chunks.
  const cx = (filterParseInt(p1[0]) % 500) + 250;
  const cy = (filterParseInt(p1[1]) % 500) + 250;
  const maxR = Math.max(1, Math.min(cx, COORD_MAX - cx, cy, COORD_MAX - cy));
  const turns = (filterParseInt(p1[2]) % 4) + 2; // 2..5 turns
  const R = Math.min((filterParseInt(p2[0]) % 400) + 50, maxR);
  const phase = (filterParseInt(p2[1]) / COORD_MAX) * Math.PI * 2;
  const zBias = (filterParseInt(p3[2]) % 100) / 100; // small vertical offset

  const n = Math.min(chunks.length * 100, 2000);
  const tickets = [];
  const points = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0; // 0..1
    const theta = phase + turns * 2 * Math.PI * t;
    const x = cx + R * Math.cos(theta);
    const y = cy + R * Math.sin(theta);
    const z = Math.max(0, Math.min(COORD_MAX, zBias * COORD_MAX + t * COORD_MAX * (1 - zBias)));
    const xi = Math.max(0, Math.min(COORD_MAX, Math.floor(x)));
    const yi = Math.max(0, Math.min(COORD_MAX, Math.floor(y)));
    const zi = Math.max(0, Math.min(COORD_MAX, Math.floor(z)));
    tickets.push(mortonEncode(xi, yi, zi));
    points.push([xi, yi, zi]);
  }
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    segments.push({ a: points[i - 1], b: points[i] });
  }
  return {
    tickets,
    geometry: {
      type: "spiral",
      segments,
      points,
      meta: { center: [cx, cy], radius: R, turns },
    },
  };
}


/**
 * "Hash" lottery — uniformly distributed tickets from a signature-seeded PRNG.
 *
 * The signature is reduced to a 32-bit seed with the FNV-1a hash, then a
 * **xorshift32** pseudo-random generator (period 2³²−1) emits `N` tickets in
 * the full `[0, 1073741823]` range.  Because xorshift32 has excellent
 * equidistribution, the tickets are spread uniformly across the range — far
 * better than the naive digit parsing of `forward`/`reverse` (which leaves a
 * leading-zero bias and only spans the digits literally present).
 *
 * This is a purely **numeric** algorithm (no 3-D geometry), so it fills the
 * niche of a fair, seed-derived lottery that doesn't depend on the vector
 * encoding.  The same signature always yields the same tickets, so results
 * stay verifiable.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Array of uniformly distributed integer tickets.
 */
function hash(filtered_signature) {
  // FNV-1a 32-bit hash of the signature → deterministic, well-mixed seed.
  let h = 0x811c9dc5;
  for (let i = 0; i < filtered_signature.length; i++) {
    h ^= filtered_signature.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // xorshift32 PRNG (non-zero seed guaranteed).
  let state = h >>> 0 || 0x9e3779b9;
  const n = Math.min(filtered_signature.length * 100, 5000);
  const tickets = [];
  for (let i = 0; i < n; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0;
    tickets.push(state % (CUBE_TICKETS + 1));
  }
  return tickets;
}

// ---------------------------------------------------------------------------
// Filter algorithms (operate on the loaded candidate pool)
// ---------------------------------------------------------------------------

/**
 * "Freebie" filter — every leaderboard participant receives exactly one
 * ticket at the start of their range.
 *
 * Unlike the lottery algorithms above, this does **not** use the seed
 * signature at all.  It simply maps each account to its `range.from`
 * value, giving every participant a single guaranteed draw.
 *
 * @param {Array<{id:string, range:{from:number, to:number}}>} leaderboardJSON
 *   Weighted leaderboard entries.
 * @returns {number[]}  One ticket per account (the account's range start).
 */
function freebie(leaderboardJSON) {
  return leaderboardJSON.map((user) => user.range.from);
}

// ---------------------------------------------------------------------------
// Core dispatcher & orchestrator
// ---------------------------------------------------------------------------

/**
 * Dispatch to the correct lottery or filter algorithm.
 *
 * Lottery algorithms (forward, reverse, pi, reverse_pi, cubed,
 * avg_point_lines, alien_blood, bouncing_ball, barrel_of_fish, golden, hash,
 * walk, helix) require a `filtered_signature` of at least 9
 * characters.  The `freebie` filter ignores the signature entirely and
 * operates only on the leaderboard.
 *
 * @param {string} algoType           Algorithm key — one of `"forward"`,
 *   `"reverse"`, `"pi"`, `"reverse_pi"`, `"cubed"`, `"avg_point_lines"`,
 *   `"alien_blood"`, `"bouncing_ball"`, `"barrel_of_fish"`, `"golden"`,
 *   `"hash"`, `"walk"`, `"helix"`, `"freebie"`.
 * @param {string} filtered_signature Numeric seed string produced by
 *   {@link filterSignature}.  Ignored by `"freebie"`.
 * @param {Array}  leaderboardJSON    Weighted leaderboard (only used by
 *   `"freebie"`).
 * @param {object} [opts={}]          Extra options forwarded to
 *   `"barrel_of_fish"`:
 * @param {string} [opts.bof_projectile]  `"beam"` for full-depth, other
 *   for shallow (barrel_of_fish).
 * @param {string} [opts.bof_splinter]    `"yes"` for multi-endpoint mode
 *   (barrel_of_fish).
 * @returns {number[]}  Array of integer ticket numbers produced by the
 *   chosen algorithm, or `[]` if the algorithm is unknown or the
 *   signature is too short.
 */
function getTickets(algoType, filtered_signature, leaderboardJSON, opts = {}) {
  const LOTTERY = [
    "forward",
    "reverse",
    "pi",
    "reverse_pi",
    "cubed",
    "avg_point_lines",
    "alien_blood",
    "bouncing_ball",
    "barrel_of_fish",
    "golden",
    "hash",
    "walk",
    "helix",
  ];
  const isLottery = LOTTERY.includes(algoType);
  if (isLottery && (!filtered_signature || filtered_signature.length < 9)) {
    return [];
  }
  const initialChunks = isLottery ? chunk(filtered_signature, 9) : [];
  const raw = dispatchAlgo(
    algoType,
    filtered_signature,
    initialChunks,
    leaderboardJSON,
    opts,
  );
  // Geometric algos now return {tickets, geometry}; legacy/non-geometric
  // algos still return a bare array.  Normalise to a ticket array here.
  const tickets = Array.isArray(raw) ? raw : raw.tickets;
  // Bring every ticket into the cube ticket space `[0, CUBE_TICKETS]` so it is
  // guaranteed to fall inside some holder's range (the normalization tiles the
  // space with no gaps).  Geometric algos already emit valid Morton codes, so
  // this is a no-op for them; it only rescues the arithmetic algos (e.g.
  // forward_pi / reverse_pi multiply by π and overflow `CUBE_TICKETS`).
  const M = CUBE_TICKETS + 1;
  const inRange = tickets.map((t) => {
    const n = Math.trunc(Number(t)) || 0;
    return ((n % M) + M) % M;
  });
  // De-duplicate so the same integer coordinate is never rewarded more than
  // once across the (potentially many) lines of a single algorithm run —
  // whether the duplicate came from two samples landing on the same point
  // along one line or from two different lines crossing at that point.
  return [...new Set(inRange)];
}

/**
 * Internal dispatcher returning the *raw* algorithm result — either a bare
 * ticket array (non-geometric algos) or a `{tickets, geometry}` object
 * (geometric algos).  {@link getTickets} and {@link getGeometry} both unwrap
 * this so the algorithm logic is defined exactly once.
 *
 * @param {string} algoType
 * @param {string} filtered_signature
 * @param {string[]} initialChunks
 * @param {Array} leaderboardJSON
 * @param {object} opts
 * @returns {number[]|{tickets:number[], geometry:object}}
 */
function dispatchAlgo(
  algoType,
  filtered_signature,
  initialChunks,
  leaderboardJSON,
  opts,
) {
  switch (algoType) {
    case "forward":
      return forward(initialChunks);
    case "reverse":
      return reverse(initialChunks);
    case "pi":
      return forward_pi(initialChunks);
    case "reverse_pi":
      return reverse_pi(initialChunks);
    case "cubed":
      return cubed(filtered_signature);
    case "avg_point_lines":
      return avg_point_lines(initialChunks);
    case "alien_blood":
      return alien_blood(filtered_signature);
    case "bouncing_ball":
      return bouncing_ball(initialChunks);
    case "barrel_of_fish":
      return barrel_of_fish(
        initialChunks,
        opts.bof_projectile ?? opts.bofProjectile,
        opts.bof_splinter ?? opts.bofSplinter,
      );
    case "golden":
      return golden(filtered_signature);
    case "hash":
      return hash(filtered_signature);
    case "walk":
      return walk(initialChunks);
    case "helix":
      return helix(filtered_signature);

    case "freebie":
      return freebie(leaderboardJSON);
    default:
      return [];
  }
}

/**
 * Reconstruct the geometric primitives an algorithm used to draw its tickets,
 * so the 3-D result can be visualised.  Returns `null` for non-geometric
 * algorithms (forward, reverse, pi, reverse_pi, cubed, hash, freebie), which
 * have no spatial structure to render.
 *
 * The descriptor shape is:
 *   `{ type: "lines" | "points" | "spiral",
 *      segments?: Array<{a:[x,y,z], b:[x,y,z], group?: string}>,
 *      points?:   Array<[x,y,z]>,
 *      meta?:     object }`
 *
 * @param {string} algoType           Algorithm key (see {@link getTickets}).
 * @param {string} filtered_signature Numeric seed string.
 * @param {object} [opts={}]          Same options forwarded by {@link getTickets}.
 * @returns {object|null}  The geometry descriptor, or `null` if the algorithm
 *   is non-geometric / unknown.
 */
function getGeometry(algoType, filtered_signature, opts = {}) {
  if (!filtered_signature || filtered_signature.length < 9) return null;
  const initialChunks = chunk(filtered_signature, 9);
  const raw = dispatchAlgo(
    algoType,
    filtered_signature,
    initialChunks,
    [],
    opts,
  );
  return raw && raw.geometry ? raw.geometry : null;
}

/**
 * Decode a ticket number back into its 3-D cube coordinate.
 *
 * Tickets are packed with the 3-D Morton (Z-order) curve — see
 * {@link mortonEncode} — so `x, y, z ∈ [0, 1023]`.  This inverts that mapping
 * so a drawn ticket can be plotted inside the `[0, 1023]³` cube.
 *
 * @param {number} ticket  The integer ticket number.
 * @returns {[number, number, number]}  `[x, y, z]` coordinates in the cube.
 */
function ticketToCoords(ticket) {
  return mortonDecode(ticket);
}

/**
 * Produce a wordy, step-by-step breakdown of *how* a specific ticket was
 * produced by a **non-geometric** algorithm.  Geometric algorithms
 * (avg_point_lines, alien_blood, bouncing_ball, barrel_of_fish, golden, walk,
 * helix) have no such arithmetic — they are visualised instead, so
 * this returns `null` for them.
 *
 * The returned object is renderer-agnostic:
 *   `{ steps: Array<{label:string, math:string, value:number}>, note:string }`
 *
 * Each `step` shows one stage of the calculation (the input chunk, the
 * transformation, and the running result) so the user can follow the exact
 * math that yielded *their* ticket.
 *
 * @param {string} algoType           Algorithm key (non-geometric only).
 * @param {number} ticket             The specific ticket to explain.
 * @param {string} filtered_signature Numeric seed string.
 * @returns {object|null}  The explanation, or `null` for geometric algos.
 */
function explainHit(algoType, ticket, filtered_signature) {
  const t = Math.trunc(Number(ticket) || 0);
  switch (algoType) {
    case "forward": {
      const chunks = chunk(filtered_signature, 9);
      const idx = chunks.findIndex((c) => Math.trunc(filterParseInt(c)) === t);
      const steps = [];
      if (idx >= 0) {
        steps.push({
          label: `Signature chunk #${idx + 1}`,
          math: `"${chunks[idx]}"`,
          value: Math.trunc(filterParseInt(chunks[idx])),
        });
        steps.push({
          label: "Read digits directly (filterParseInt)",
          math: `→ ${Math.trunc(filterParseInt(chunks[idx]))}`,
          value: Math.trunc(filterParseInt(chunks[idx])),
        });
      }
      steps.push({ label: "Your ticket", math: `= ${t}`, value: t });
      return {
        steps,
        note: "Forward reads each 9-digit signature chunk straight as a ticket number — no transformation.",
      };
    }
    case "reverse": {
      const chunks = chunk(filtered_signature, 9);
      const idx = chunks.findIndex(
        (c) => Math.trunc(filterParseInt(c.split("").reverse().join(""))) === t,
      );
      const steps = [];
      if (idx >= 0) {
        const rev = chunks[idx].split("").reverse().join("");
        steps.push({
          label: `Signature chunk #${idx + 1} (reversed)`,
          math: `"${chunks[idx]}" → "${rev}"`,
          value: Math.trunc(filterParseInt(rev)),
        });
        steps.push({
          label: "Read reversed digits (filterParseInt)",
          math: `→ ${Math.trunc(filterParseInt(rev))}`,
          value: Math.trunc(filterParseInt(rev)),
        });
      }
      steps.push({ label: "Your ticket", math: `= ${t}`, value: t });
      return {
        steps,
        note: "Reverse mirrors each chunk before reading it, so a change at one end of the signature still shifts the draw.",
      };
    }
    case "cubed": {
      const groups = chunk(filtered_signature, 3).map((x) => filterParseInt(x));
      const idx = groups.findIndex((x) => Math.trunc(x * x * x) === t);
      const steps = [];
      if (idx >= 0) {
        const x = groups[idx];
        steps.push({
          label: `3-digit group #${idx + 1}`,
          math: `"${chunk(filtered_signature, 3)[idx]}" → x = ${x}`,
          value: x,
        });
        steps.push({ label: "Cube it", math: `${x}³ = ${Math.trunc(x * x * x)}`, value: Math.trunc(x * x * x) });
      }
      steps.push({ label: "Your ticket", math: `= ${t}`, value: t });
      return {
        steps,
        note: "Cubing amplifies tiny signature differences: a one-digit change in the input produces a vastly different ticket.",
      };
    }
    case "pi":
    case "reverse_pi": {
      const chunks = chunk(filtered_signature, 9);
      const reversed = algoType === "reverse_pi";
      // Re-derive every (i, j) product to locate which pair produced `t`.
      // Must mirror the algorithm exactly:
      //   • forward_pi: chunk → filterParseInt → integer √ ; inner bound y < L - i
      //   • reverse_pi: chunk → reverse → filterParseInt → integer √ ;
      //     inner bound y < L - y  (asymmetric truncation, NOT L - i)
      const baseVals = reversed
        ? chunks.map((x) => filterParseInt(x.split("").reverse().join("")))
        : chunks.map((x) => filterParseInt(x));
      const L = baseVals.length;
      const pairs = [];
      for (let i = 0; i < L; i++) {
        const current = parseInt(Math.sqrt(baseVals[i]), 10);
        for (let y = i; y < (reversed ? L - y : L - i); y++) {
          const nextValue = parseInt(Math.sqrt(baseVals[y]), 10);
          pairs.push({ i, j: y, value: parseInt(current * nextValue * Math.PI, 10) });
        }
      }
      const match = pairs.find((p) => p.value === t);
      const steps = [];
      if (match) {
        const rawI = chunks[match.i];
        const rawJ = chunks[match.j];
        const parsedI = baseVals[match.i];
        const parsedJ = baseVals[match.j];
        if (reversed) {
          steps.push({
            label: `Reversed chunk #${match.i + 1}`,
            math: `"${rawI}" → "${rawI.split("").reverse().join("")}" → parsed ${parsedI}`,
            value: parsedI,
          });
          steps.push({
            label: `Reversed chunk #${match.j + 1}`,
            math: `"${rawJ}" → "${rawJ.split("").reverse().join("")}" → parsed ${parsedJ}`,
            value: parsedJ,
          });
        } else {
          steps.push({
            label: `Chunk #${match.i + 1}`,
            math: `"${rawI}" → parsed ${parsedI}`,
            value: parsedI,
          });
          steps.push({
            label: `Chunk #${match.j + 1}`,
            math: `"${rawJ}" → parsed ${parsedJ}`,
            value: parsedJ,
          });
        }
        steps.push({
          label: "(integer) √ each, then × π",
          math: `${parseInt(Math.sqrt(parsedI), 10)} × ${parseInt(Math.sqrt(parsedJ), 10)} × π = ${match.value}`,
          value: match.value,
        });
      }
      steps.push({ label: "Your ticket", math: `= ${t}`, value: t });
      return {
        steps,
        note: reversed
          ? "Reverse-π reverses each chunk (then parses it) and uses an asymmetric inner bound before the π product."
          : "π mixes pairs of signature chunks via √a × √b × π to spread draws across the range.",
      };
    }
    case "hash": {
      let h = 0x811c9dc5;
      for (let i = 0; i < filtered_signature.length; i++) {
        h ^= filtered_signature.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      const seed = h >>> 0;
      return {
        steps: [
          {
            label: "FNV-1a seed of the signature",
            math: `= ${seed}`,
            value: seed,
          },
          {
            label: "xorshift32 PRNG (period 2³²−1)",
            math: "deterministic stream seeded above",
            value: seed,
          },
          {
            label: "Your ticket",
            math: `state mod 1 073 741 824 = ${t}`,
            value: t,
          },
        ],
        note: "Hash uses a signature-seeded PRNG, so a specific ticket can't be reversed to a single input step — but the whole sequence is fully reproducible from the signature.",
      };
    }
    case "freebie": {
      return {
        steps: [
          {
            label: "Every account gets one ticket at its range start",
            math: `range.from = ${t}`,
            value: t,
          },
        ],
        note: "Freebie is not seeded by the signature — each pool member simply receives a guaranteed ticket.",
      };
    }
    default:
      return null;
  }
}

/**
 * Convert a block's `witness_signature` string into a purely numeric seed
 * that drives all lottery algorithms.
 *
 * Digits (`0`–`9`) pass through unchanged.  Letters are replaced by their
 * character code (e.g. `'a'` → `'97'`, `'Z'` → `'90'`), producing a long
 * numeric string whose length and value depend on the original signature.
 *
 * The result is deterministic: the same `witnessSignature` always yields
 * the same seed, which is essential for verifiability.
 *
 * @param {string} witnessSignature  The hex/ASCII signature string from
 *   the block header.
 * @returns {string}  A string consisting only of digits.
 */
function filterSignature(witnessSignature) {
  return witnessSignature
    .split("")
    .map((char) => (isCharNumber(char) ? char : char.charCodeAt(0).toString()))
    .join("");
}

/**
 * Run a full lottery calculation across one or more algorithms and map
 * the drawn tickets back to leaderboard accounts.
 *
 * For each algorithm in `distributions`:
 *   1. Generate tickets via {@link getTickets}.
 *   2. If `deduplicate === "Yes"`, remove duplicate tickets **and** exclude
 *      any tickets that were already produced by earlier algorithms in this
 *      run.
 *   3. Map each ticket to the account whose leaderboard range contains it.
 *
 * Because the leaderboard is normalised so its total range fills the whole
 * cube ticket space (`[0, 1073741823]`, see {@link normalizeRangesToCube}),
 * every drawn ticket already falls inside some account's range — there is no
 * need to wrap or re-scale ticket numbers, and the cube coordinate shown for
 * a winning ticket is exactly where the algorithm drew it.
 *
 * @param {string} filtered_signature  Numeric seed from {@link filterSignature}.
 * @param {string[]} distributions     Array of algorithm keys (e.g.
 *   `["forward", "cubed"]`).
 * @param {string} deduplicate         `"Yes"` to remove duplicate / repeat
 *   tickets across algorithms.
 * @param {Array<{id:string, name:string, range:{from:number,to:number}}>}
 *   leaderboardJSON  Weighted leaderboard entries (already cube-normalised).
 * @param {object} [opts={}]  Extra options forwarded to individual
 *   algorithms (see {@link getTickets}).
 * @returns {{
 *   summary: Array<{
 *     id: string,
 *     name: string|undefined,
 *     tickets: Array<{ticket:number, algo:string, value:number}>,
 *     qty: number,
 *     ticketsValue: number,
 *     percent: string
 *   }>,
 *   generatedNumbers: Object<string, number[]>
 * }}
 *   `summary` — per-account aggregated results sorted by ticket count.
 *   `generatedNumbers` — raw ticket arrays keyed by algorithm name.
 */
// Pre-index holder ranges once for O(log N) ticket -> holder lookup.
function buildRangeIndex(leaderboardJSON) {
  return leaderboardJSON
    .map((u, i) => ({ from: u.range.from, to: u.range.to, idx: i }))
    .sort((a, b) => a.from - b.from);
}

// The unique holder whose contiguous, half-open range `[from, to)` contains
// `ticket` (each `to` is exclusive and equals the next holder's `from`, so a
// boundary ticket belongs to the later holder).  Ranges partition
// `[0, CUBE_TICKETS]` with no gaps, so the owner is the one with the greatest
// `from <= ticket` — which the binary search already selects directly (no
// tie-break is needed).  O(log N) via binary search — replaces the previous
// O(N) linear scan that ran for every winning ticket.
function findHolderIndex(rangeIndex, ticket) {
  let lo = 0;
  let hi = rangeIndex.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rangeIndex[mid].from <= ticket) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (ans < 0) return -1;
  // Ranges are half-open (`to_i === from_{i+1}`, so `to` is exclusive and
  // `from` inclusive). A ticket equal to a shared boundary therefore belongs to
  // the later holder whose inclusive `from` starts there — which is exactly the
  // `ans` the binary search already selected above, so no tie-break override is
  // needed. (The previous tie-break wrongly returned the earlier holder.)
  const r = rangeIndex[ans];
  return ticket <= r.to ? r.idx : -1;
}

function executeCalculation(
  filtered_signature,
  distributions,
  deduplicate,
  leaderboardJSON,
  opts = {},
) {
  const generatedNumbers = {};
  let winningTickets = [];
  const winners = {};

  // Index holder ranges once and build an id -> name map so we never re-scan
  // the (potentially huge) leaderboard per ticket or per winner.
  const rangeIndex = buildRangeIndex(leaderboardJSON);
  const nameById = new Map(leaderboardJSON.map((u) => [u.id, u.name]));

  // Freebie emits each holder's own `range.from`, so it maps 1:1 to that
  // holder without going through the cube ticket-space lookup (which only
  // exists to resolve arbitrary drawn coordinates back to a weighted range).
  const fromToIdx = new Map(
    leaderboardJSON.map((u, i) => [u.range.from, i]),
  );

  for (let i = 0; i < distributions.length; i++) {
    const algoType = distributions[i];
    let algoTickets = getTickets(
      algoType,
      filtered_signature,
      leaderboardJSON,
      opts,
    );

    if (deduplicate === "Yes") {
      // Drop tickets an earlier algorithm already drew (cross-algo dedupe).
      const seen = new Set(winningTickets);
      algoTickets = algoTickets.filter((item) => !seen.has(item));
    }

    winningTickets = winningTickets.concat(algoTickets);
    generatedNumbers[algoType] = algoTickets;
  }

  for (const [key, value] of Object.entries(generatedNumbers)) {
    const algo = key;
    const ticketNumbers = value;

    for (let i = 0; i < ticketNumbers.length; i++) {
      const currentNumber = ticketNumbers[i];
      const idx =
        algo === "freebie"
          ? fromToIdx.has(currentNumber)
            ? fromToIdx.get(currentNumber)
            : -1
          : findHolderIndex(rangeIndex, currentNumber);

      if (idx >= 0) {
        const foundUser = leaderboardJSON[idx];
        const winningTicket = { ticket: currentNumber, algo, value: 1 };
        winners[foundUser.id] = Object.prototype.hasOwnProperty.call(
          winners,
          foundUser.id,
        )
          ? [...winners[foundUser.id], winningTicket]
          : [winningTicket];
      }
    }
  }

  const summary = [];
  for (const [key, value] of Object.entries(winners)) {
    const currentPercent = (
      (value.length / winningTickets.length) *
      100
    ).toFixed(5);
    summary.push({
      id: key,
      name: nameById.get(key),
      tickets: value.sort((a, b) => a.ticket - b.ticket),
      qty: value.length,
      ticketsValue: value.reduce((a, b) => a + b.value, 0),
      percent: currentPercent,
    });
  }

  return { summary, generatedNumbers };
}

export {
  executeCalculation,
  filterSignature,
  getTickets,
  getGeometry,
  ticketToCoords,
  mortonEncode,
  mortonDecode,
  explainHit,
  runAllAccountsLottery,
  freebie,
  forward,
  reverse,
  forward_pi,
  reverse_pi,
  cubed,
  avg_point_lines,
  alien_blood,
  bouncing_ball,
  barrel_of_fish,
  golden,
  hash,
  walk,
  helix,
};

/**
 * Lottery over the entire account space (1.2.1 .. 1.2.maxAccountId).
 *
 * Used when the candidate pool is "all accounts" — we never enumerate
 * millions of on-chain entries.  Instead each drawn ticket number is
 * mapped directly to an account id via modulo arithmetic:
 *
 *     accountNum = ((ticket % maxAccountId) + maxAccountId) % maxAccountId
 *     accountId  = "1.2." + accountNum
 *
 * Multiple algorithms can be combined; each drawn ticket increments that
 * account's hit count.  The returned array is **not** a leaderboard
 * (no ranges), but a hit-count summary suitable for display or further
 * filtering.
 *
 * @param {string[]} algoTypes         Array of lottery algorithm keys
 *   (e.g. `["forward", "cubed"]`).
 * @param {string}   filtered_signature  Numeric seed string produced by
 *   {@link filterSignature}.
 * @param {number}   maxAccountId      Highest existing account id on the
 *   chain (e.g. `1.2.1234567` → use `1234567`).
 * @returns {Array<{
 *   id: string,
 *   name: undefined,
 *   qty: number,
 *   ticketsValue: number,
 *   percent: string
 * }>}
 *   Array of `{ id, name, qty, ticketsValue, percent }` objects for every
 *   account that received at least one hit.  `name` is always `undefined`
 *   (the caller may enrich it separately if needed).  `percent` is always
 *   `"0"` (no leaderboard weighting in this mode).
 */
function runAllAccountsLottery(
  algoTypes,
  filtered_signature,
  maxAccountId,
  opts = {},
) {
  const winners = {};
  const seenTickets = new Set();
  for (const algoType of algoTypes) {
    const nums = getTickets(algoType, filtered_signature, [], opts);
    for (const n of nums) {
      if (!Number.isFinite(n)) continue;
      // A ticket drawn by more than one algorithm still represents the same
      // single coordinate, so it must win at most once across the whole run.
      if (seenTickets.has(n)) continue;
      seenTickets.add(n);
      let accountNum = ((n % maxAccountId) + maxAccountId) % maxAccountId;
      if (accountNum === 0) accountNum = maxAccountId;
      const id = `1.2.${accountNum}`;
      if (!winners[id]) winners[id] = { hits: 0, tickets: [] };
      winners[id].hits += 1;
      winners[id].tickets.push({ ticket: n, algo: algoType, value: 1 });
    }
  }
  return Object.entries(winners).map(([id, w]) => ({
    id,
    name: undefined,
    qty: w.hits,
    ticketsValue: w.hits,
    tickets: w.tickets,
    percent: "0",
  }));
}
