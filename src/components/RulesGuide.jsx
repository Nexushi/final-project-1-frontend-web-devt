export default function RulesGuide() {
  return <details className="rules-guide">
    <summary>Rules &amp; Guidelines</summary>
    <h3>Arcade Singles Rules</h3>
    <ol>
      <li>Score 5 points before the AI. No win-by-two is required.</li>
      <li>Either side can score by winning a rally in our arcade version.</li>
      <li>The rally winner serves next in our arcade version.</li>
      <li>An even server score (0, 2, 4) means serving from the RIGHT court.</li>
      <li>An odd server score (1, 3) means serving from the LEFT court. Right/left is from the server’s perspective: the AI faces down, so its right is the screen’s left.</li>
      <li>Serves go diagonally into the opposite service court, beyond the kitchen line. The server is positioned automatically; press Space to serve.</li>
      <li>The receiver must let the ball bounce before returning it in this simplified game.</li>
      <li>A missed return or an out shot gives the opponent a point.</li>
      <li>WASD / Arrow Keys: move. Space: serve or swing. P / Esc: pause or resume.</li>
    </ol>
    <p>On resume, your saved scores and difficulty return, but a fresh rally starts with you serving. The previous service turn was not saved.</p>
    <p className="small">These are arcade rules, not every official pickleball rule. Traditional side-out scoring, the full two-bounce rule, volleys and kitchen faults are not fully implemented.</p>
  </details>
}
