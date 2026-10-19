# Pickle Ball Pixel Game

Group 1 · Section C3B · Stage 2 frontend prototype

A single-player React + Vite JavaScript game with original, simple Canvas graphics. No backend, database, account, or network service is needed to play. Nothing is stored between page reloads.

## Run in VS Code

Open this frontend folder in VS Code, open Terminal > New Terminal, and run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). Use a current desktop browser and a keyboard. Stop Vite with Ctrl+C. If dependencies are already installed, just run `npm run dev`.

```sh
npm run build   # creates the production dist folder
npm run lint    # ESLint
npm test        # engine regression tests using Node's built-in test runner
npm run preview # preview a completed production build
```

## Screens and controls

Start Game opens a separate Easy / Medium / Hard selection screen. Choosing a level starts a match. The interface shows scores, difficulty, point feedback, controls, pause/resume, restart, and main menu. The result overlay announces the winner and offers Play Again.

- WASD or arrow keys: move the blue character on the bottom half.
- Space: serve or swing. Release between swings; holding Space does not auto-hit.
- Follow the ball's ground shadow. After it bounces on your side, move within 58 canvas pixels and tap Space. The yellow ground outline and status message indicate the bounce.
- Left/right while swinging aims 180 pixels to that side of your character. Avoid aiming out near sidelines. Without an aiming direction, the shot targets a random safe position.
- P or Escape: pause/resume. The Pause and Resume buttons also work.
- Clicking the court returns keyboard focus. Gameplay keys prevent scrolling while playing; focused menu buttons retain normal keyboard activation.
- Losing browser focus or hiding the tab automatically pauses. Resume explicitly when ready.

## Simplified rules and physics

This is a pickleball-inspired arcade prototype, not a complete implementation of official rules. The provisional rule is rally scoring, first to 5, without win-by-two. Either side can win a point regardless of server. The point winner serves next; the human serves first. The AI serves automatically after its preparation delay.

The court uses fixed logical coordinates (640 × 560) scaled with CSS. Movement is normalized so diagonal movement is not faster. Each character is clamped to its own half. The kitchen and service lines are marked, but kitchen restrictions, diagonal serves, service rotation, net-height faults, spin, and official two-bounce serving rules are not enforced.

A shot's ground position travels toward a landing target at the difficulty's ball speed. A sine arc draws the ball above its shadow, allowing it to cross the net. After one legal bounce, it moves toward the receiving baseline at 65 pixels/second. The receiver has up to 0.9 seconds to hit it within paddle range, before the second bounce or baseline fault. Only the receiving side can return, and only after the bounce. There are no automatic sidewall rebounds. A landing outside the white boundaries awards the receiver a point; a missed return awards the last hitter a point.

Scoring immediately moves a rally into `point` or `over`. Further collision/fault calls cannot award another point. A 1.5-second point message precedes resetting both players and preparing the next serve. At five points, simulation stops and the winner is shown.

## AI and tuning

`src/game/config.js` holds all three beginner-readable difficulty presets. AI speed rises from 125 to 175 to 220 pixels/second; reaction delay drops from 0.42 to 0.24 to 0.12 seconds. Per-shot intentional miss chance drops from 28% to 15% to 7%, and landing-prediction error drops from 60 to 35 to 18 pixels. Ball speed increases from 225 to 255 to 285 pixels/second.

The AI waits its reaction delay, moves toward a slightly imperfect prediction of the incoming landing position, and attempts a return when in range after a bounce. It may intentionally miss, arrive too late, or be too far away. Its returns target safe random locations. Difficulty is fixed for each match; return to the menu to choose another.

## File guide

- `src/App.jsx`: menus, difficulty choice, shared instructions, and fresh-match navigation.
- `src/components/GameCanvas.jsx`: Canvas lifecycle, keyboard input, pause, React scoreboard and overlays. Event listeners and animation frames are cleaned up on unmount, including React Strict Mode remounts.
- `src/game/config.js`: court dimensions, movement/range constants, difficulty presets, and winning score.
- `src/game/engine.js`: plain game state, normalized movement, AI, serve/return logic, and ball motion/collisions.
- `src/game/scoring.js`: point awards, rally lock, and match completion.
- `src/game/render.js`: original rectangle-based court, net, characters, paddles, walking/swing animations, and ball/shadow.
- `src/App.css`, `src/index.css`: limited retro palette, layout, readable controls, focus styles, and responsive sizing.
- `tests/game.test.js`: rules and simulation regression tests.
- `index.html`, `public/favicon.svg`: page metadata and original pixel-ball icon.
- `package.json`: adds `npm test`, with no additional dependencies.

The engine is independent of React and advances with requestAnimationFrame delta time. Large frame gaps are capped at 33 milliseconds. React receives only changed scores/messages/status, rather than ball positions every frame. `getMatchSummary` exposes scores, difficulty, status, phase, paused state, server, and winner as plain data for a future API adapter. It does not save progress. A future exact mid-rally restore would also need the full ball/player state and timers.

## Stage 2 verification — October 19, 2026

- `npm run build`: passed.
- `npm run lint`: passed.
- `npm test`: seven passing tests, including 100 seeded simulated matches across the three difficulties.
- Engine tests cover normalized movement and boundaries, serves crossing the net, AI movement/returns and misses, player contact after a bounce, out faults, missed returns, next-serve reset, pause during rallies and point delays, both winners at five, match freeze, finite coordinates, and duplicate-point prevention.
- Browser testing was attempted through the available in-app browser, but connections to localhost and 127.0.0.1 timed out. The connected browser inventory exposed no desktop browser. No successful visual or interactive browser gameplay test is claimed.

### Manual checks still required before presentation

1. Open Start Game, choose each difficulty, and check court/UI readability at the presentation laptop's resolution.
2. Move using both WASD and arrows, including all edges and diagonals; verify no browser scrolling while the court is focused.
3. Serve, watch net crossing and bounce feedback, return with Space, and aim left/right. Confirm walking and paddle animations are understandable.
4. Observe AI returns and occasional misses; intentionally miss and aim out. Check one point per fault and the next serve.
5. Pause during flight and between points; wait, resume, and confirm no movement or scoring occurred. Switch tabs and verify automatic pause.
6. Restart mid-match, return to menu, and complete a match to five. Check the winner, Play Again, and clean 0–0 restart.
7. Watch browser developer tools for runtime errors. Engine tests do not verify React event handling, focus, rendering, or human difficulty balance.

## Reference and stage decisions

Both supplied original documents were read from Downloads; neither PDF is copied into this repository. The original game specification is the technical/concept reference, and the proposal supplies scope and acceptance criteria, especially playable-game deliverable D2 and controls/status requirement R6. The current Stage 2 request authorizes provisional rally scoring to five and session-only pause. Accounts, profiles, saved matches, history, CRUD, persistent settings, and Admin functionality remain future integration work. This frontend does not claim completion of the full proposal's integrated MVP or instructor acceptance.

No external artwork, fonts, sprite sheets, or gameplay libraries are used. Existing unused Vite starter assets are not used by the game. No commit, push, or deployment is part of this stage.
