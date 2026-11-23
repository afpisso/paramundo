/**
 * Parity oracle: the combat logic of referencias/prototipo-hex-triad.html with the DOM, the
 * animations and the recut effects removed. Function bodies are kept as close to the prototype as
 * possible (same names, same order) so they can be diffed against it by eye. Do not "improve" this
 * file: it exists to check src/core against the prototype.
 *
 * Fixed prototype settings: rules 'ez' (elements + zones), fxOn, no free spin, no rotating zones,
 * no chameleon. Effects kept: R G E S X C F K O M.
 *
 * Approved deviations from the prototype (see CLAUDE.md), each behind an option so the verbatim
 * behaviour is still available:
 *  - guardianOwnOnly: Guardián only protects cards of its owner, never neutral totems.
 *  - fxCounts: cells created by Siembra and Sello per tier. Prototype: [1, 1, 2, 3, 3].
 */
export const PROTOTYPE_FX_COUNTS = [1, 1, 2, 3, 3];

export function createOracle(opt = {}) {
  const fxCounts = opt.fxCounts || PROTOTYPE_FX_COUNTS;
  const guardianOwnOnly = !!opt.guardianOwnOnly;

  const DIRS = [
    [0, -1],
    [1, -1],
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ];
  const CELLS = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) CELLS.push({ q, r });
  const IDX = {};
  CELLS.forEach((c, i) => (IDX[c.q + ',' + c.r] = i));
  const NEIGH = CELLS.map((c) =>
    DIRS.map(([dq, dr]) => {
      const k = c.q + dq + ',' + (c.r + dr);
      return k in IDX ? IDX[k] : -1;
    }),
  );
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const clamp = (v) => Math.max(1, Math.min(10, v));
  const rot1 = (s) => [s[5], s[0], s[1], s[2], s[3], s[4]];

  /* elements: 0 fire, 1 water, 2 leaf, -1 neutral. BEAT[a] is the element a defeats */
  const BEAT = [2, 0, 1];
  const COST = (v) => (v <= 6 ? v : [8, 10, 12, 15][v - 7]);
  const TIERS = [
    { lo: 0, hi: 26 },
    { lo: 27, hi: 32 },
    { lo: 33, hi: 38 },
    { lo: 39, hi: 45 },
    { lo: 46, hi: 56 },
  ];
  const FX = {
    R: { c: 4 },
    G: { c: 4 },
    E: { c: 3 },
    S: { c: 5 },
    X: { c: 4 },
    C: { c: 7 },
    F: { c: 2 },
    K: { c: 3 },
    O: { c: 3 },
    M: { c: 4 },
  };
  const fxN = (t) => fxCounts[t];
  const power = (c) => sum(c.s.map(COST)) + (c.fx ? FX[c.fx].c : 0);
  const tierOf = (c) => {
    const p = power(c);
    let t = 0;
    TIERS.forEach((T, i) => {
      if (p >= T.lo) t = i;
    });
    return t;
  };

  const st = {};
  const on = (k, card) => card.fx === k;
  const canRotate = (card) => on('O', card);
  const effEl = (card, z) => card.el;
  const mu = (a, b) => (a >= 0 && b >= 0 ? (BEAT[a] === b ? 1 : BEAT[b] === a ? -1 : 0) : 0);
  function zoneMod(card, z) {
    if (z < 0) return 0;
    const e = effEl(card, z);
    if (e < 0) return 0;
    return e === z ? 1 : BEAT[z] === e ? -1 : 0;
  }
  function packAt(i) {
    const b = st.board[i];
    if (b.owner === 2 || !on('M', b.card)) return 0;
    return Math.min(2, NEIGH[i].filter((n) => n >= 0 && st.board[n] && st.board[n].owner === b.owner).length);
  }
  const modAt = (i) => zoneMod(st.board[i].card, st.zones[i]) + packAt(i);
  const sideAt = (i, d) => clamp(st.board[i].card.s[d] + modAt(i));
  const legal = (i, p) => !st.board[i] && !st.rocks[i] && !st.seals.some((s) => s.i === i && s.owner !== p);
  const free = (i) => !st.board[i] && !st.rocks[i];

  /* level: {rocks:[[q,r]],zones:[[q,r,el]],totems:[{c:[q,r],s,el}]}; hands: two arrays of {s,el,fx} */
  function newGame(L, hands, starter) {
    st.board = Array(CELLS.length).fill(null);
    st.zones = Array(CELLS.length).fill(-1);
    st.rocks = Array(CELLS.length).fill(false);
    st.seals = [];
    if (L) {
      L.rocks.forEach(([q, r]) => (st.rocks[IDX[q + ',' + r]] = true));
      L.zones.forEach(([q, r, e]) => (st.zones[IDX[q + ',' + r]] = e));
      L.totems.forEach((T) => {
        const card = { name: 'Tótem', s: T.s.slice(), el: T.el, fx: null };
        card.t = tierOf(card);
        st.board[IDX[T.c[0] + ',' + T.c[1]]] = { card, owner: 2, was: 0 };
      });
    }
    st.hands = hands.map((h) =>
      h.map((c) => {
        const card = { s: c.s.slice(), el: c.el, fx: c.fx };
        card.t = tierOf(card);
        return card;
      }),
    );
    st.turn = starter;
    st.starter = starter;
    st.over = false;
    st.placed = 0;
  }
  function score(p) {
    return st.board.filter((b) => b && b.owner === p).length + st.hands[p].length;
  }

  /* combat: card at ci is already on the board */
  function clashes(ci, opt = {}) {
    const a = st.board[ci],
      me = a.owner,
      ea = effEl(a.card, st.zones[ci]),
      res = [];
    for (let d = 0; d < 6; d++) {
      const n = NEIGH[ci][d];
      if (n < 0) continue;
      const b = st.board[n];
      if (!b || b.owner === me) continue;
      const eb = effEl(b.card, st.zones[n]),
        base = sideAt(ci, d),
        el = mu(ea, eb);
      const emb = !opt.chain && on('E', a.card) ? 1 : 0,
        rec = !opt.chain && on('R', a.card) && b.was & (1 << me) ? 2 : 0;
      const def = sideAt(n, (d + 3) % 6),
        firm = !!b.shield,
        win = !firm && base + el + emb + rec > def;
      res.push({ n, base, el, emb, rec, def, ea, eb, firm, win, byEl: win && base + emb + rec <= def });
    }
    return res;
  }
  function resolve(ci, opt = {}) {
    const a = st.board[ci],
      list = clashes(ci, opt);
    let caps = list.filter((c) => c.win).map((c) => c.n),
      saved = [];
    if (guardianOwnOnly) {
      /* approved deviation: totems neither count nor are saved */
      const own = caps.filter((n) => st.board[n].owner !== 2);
      if (own.length > 1) {
        const g = own.filter((n) => st.board[n].card.fx === 'G');
        if (g.length) {
          saved = own.filter((n) => !g.includes(n));
          caps = caps.filter((n) => !saved.includes(n));
        }
      }
    } else if (caps.length > 1) {
      const g = caps.filter((n) => st.board[n].owner !== 2 && st.board[n].card.fx === 'G');
      if (g.length) {
        saved = caps.filter((n) => !g.includes(n));
        caps = g;
      }
    }
    return { list, caps, saved };
  }
  /* free neighbours ordered by the side facing them: high first for Siembra, low first for Sello */
  function facing(ci, card, high) {
    const out = [];
    for (let d = 0; d < 6; d++) {
      const n = NEIGH[ci][d];
      if (n >= 0 && free(n)) out.push({ n, v: card.s[d] });
    }
    return out.sort((a, b) => (high ? b.v - a.v : a.v - b.v)).map((o) => o.n);
  }

  /* Espinas, after a set of captures */
  function afterCaptures(caps, prev, attackerOf) {
    caps.forEach((n, k) => {
      const b = st.board[n];
      if (on('K', b.card)) {
        const ai = attackerOf(n),
          A = st.board[ai];
        if (A) {
          A.card.s = A.card.s.map((v) => Math.max(1, v - 1));
        }
      }
    });
  }
  function flipCells(caps, me, attackerOf) {
    const prev = caps.map((n) => st.board[n].owner);
    caps.forEach((i) => {
      st.board[i].owner = me;
      st.board[i].was |= 1 << me;
      st.board[i].shield = false;
    });
    afterCaptures(caps, prev, attackerOf);
  }

  /* rot: sixths of a turn applied to the hand card first, as selectCard/aiMove do */
  function play(hi, ci, rot = 0) {
    if (st.over || !legal(ci, st.turn)) return false;
    const me = st.turn;
    if (rot) {
      if (!canRotate(st.hands[me][hi])) return false;
      for (let r = 0; r < rot; r++) st.hands[me][hi].s = rot1(st.hands[me][hi].s);
    }
    const card = st.hands[me].splice(hi, 1)[0];
    st.board[ci] = { card, owner: me, was: 1 << me };
    st.placed++;
    if (on('F', card)) st.board[ci].shield = true;
    const z = st.zones[ci],
      e = effEl(card, z);
    /* clashes */
    const { list, caps, saved } = resolve(ci);
    let total = 0;
    if (list.length) {
      if (caps.length) {
        total += caps.length;
        flipCells(caps, me, () => ci);
      }
      /* Cadena: captured cards attack once more */
      if (on('C', card) && caps.length) {
        const wave = [],
          src = {};
        caps.forEach((s) => {
          const r = resolve(s, { chain: true });
          r.caps.forEach((n) => {
            if (!wave.includes(n)) {
              wave.push(n);
              src[n] = s;
            }
          });
        });
        if (wave.length) {
          total += wave.length;
          flipCells(wave, me, (n) => src[n]);
        }
      }
    }
    /* placement powers */
    if (on('S', card) && e >= 0) {
      const tg = facing(ci, card, true).slice(0, fxN(card.t));
      if (tg.length) {
        tg.forEach((n) => {
          st.zones[n] = e;
        });
      }
    }
    if (on('X', card)) {
      const tg = facing(ci, card, false).slice(0, fxN(card.t));
      if (tg.length) {
        tg.forEach((n) => {
          st.seals = st.seals.filter((s) => s.i !== n);
          st.seals.push({ i: n, owner: me });
        });
      }
    }
    finishTurn(me);
    return true;
  }

  function finishTurn(me) {
    const done = (!st.hands[0].length && !st.hands[1].length) || !CELLS.some((_, i) => free(i));
    if (done) {
      st.over = true;
      st.seals = [];
      st.board.forEach((b) => {
        if (b) b.shield = false;
      });
      return;
    }
    let next = 1 - me;
    if (!st.hands[next].length) next = me;
    st.turn = next;
    st.seals = st.seals.filter((s) => s.owner !== next);
    st.board.forEach((b) => {
      if (b && b.shield && b.owner === next) b.shield = false;
    });
    if (!CELLS.some((_, i) => legal(i, next)) && st.seals.length) {
      st.seals = [];
    }
  }

  return { st, CELLS, newGame, play, legal, score, power, tierOf, canRotate };
}
