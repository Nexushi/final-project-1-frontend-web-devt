export const COURT = { left: 100, right: 540, top: 60, bottom: 500, net: 280, kitchenTop: 210, kitchenBottom: 350 }
export const WIDTH = 640
export const HEIGHT = 560
export const PLAYER_SPEED = 235
export const PADDLE_RANGE = 58
export const WINNING_SCORE = 5
// Player rally shots, chosen by the vertical key held while swinging.
// y: landing range on the AI half (court top is 60, kitchen is 210-280). speed scales ball speed.
// arc: peak ball height in pixels. Drive is the original shot, so existing play is unchanged.
// A lob must not land much deeper than y 100: after the bounce the ball rolls toward the baseline
// at 65 px/s, and a landing near y 70 would leave the AI under 0.2s to return before it goes out.
export const SHOTS = {
  drive: { label: 'Drive', y: [125, 175], speed: 1, arc: 36 },
  dink: { label: 'Dink', y: [225, 255], speed: 0.8, arc: 20 },
  lob: { label: 'Lob', y: [100, 120], speed: 1, arc: 60 },
}
// Speed: pixels/second. Reaction: seconds. Miss: probability per incoming shot.
export const DIFFICULTIES = {
  easy: { label: 'Easy', description: 'A slower opponent. Room to learn.', speed: 125, reaction: 0.42, postBounceDelay: 0.30, miss: 0.28, error: 60, ballSpeed: 225, smartness: 0.10 },
  medium: { label: 'Medium', description: 'Steady movement. A fair challenge.', speed: 175, reaction: 0.24, postBounceDelay: 0.22, miss: 0.15, error: 35, ballSpeed: 255, smartness: 0.40 },
  hard: { label: 'Hard', description: 'Quick feet. Sharper returns.', speed: 220, reaction: 0.12, postBounceDelay: 0.14, miss: 0.07, error: 18, ballSpeed: 285, smartness: 0.70 },
}