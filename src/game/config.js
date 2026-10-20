export const COURT = { left: 100, right: 540, top: 60, bottom: 500, net: 280, kitchenTop: 210, kitchenBottom: 350 }
export const WIDTH = 640
export const HEIGHT = 560
export const PLAYER_SPEED = 235
export const PADDLE_RANGE = 58
export const WINNING_SCORE = 5
// Speed: pixels/second. Reaction: seconds. Miss: probability per incoming shot.
export const DIFFICULTIES = {
  easy: { label: 'Easy', description: 'A slower opponent. Room to learn.', speed: 125, reaction: 0.42, postBounceDelay: 0.30, miss: 0.28, error: 60, ballSpeed: 225 },
  medium: { label: 'Medium', description: 'Steady movement. A fair challenge.', speed: 175, reaction: 0.24, postBounceDelay: 0.22, miss: 0.15, error: 35, ballSpeed: 255 },
  hard: { label: 'Hard', description: 'Quick feet. Sharper returns.', speed: 220, reaction: 0.12, postBounceDelay: 0.14, miss: 0.07, error: 18, ballSpeed: 285 },
}
