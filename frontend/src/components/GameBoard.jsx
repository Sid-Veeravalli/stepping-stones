import './GameBoard.css';

function GameBoard({ teams, currentTurnTeamId }) {
  // Animal emojis for team tokens
  const animalTokens = ['🐻', '🦊', '🐰', '🦌', '🦉', '🐿️', '🦔', '🐸'];

  // Calculate max score to determine path length
  const maxScore = Math.max(...teams.map((t) => t.score || 0), 0);
  const numTiles = Math.max(maxScore + 5, 20);

  const getTeamToken = (teamIndex) => {
    return animalTokens[teamIndex % animalTokens.length];
  };

  // Get tile position for a team (use score as position on the path)
  const getTeamTilePosition = (team) => {
    return team.score || 0;
  };

  // Generate horizontal curvy path positions using a serpentine curve
  const generateCurvyPath = (count) => {
    const path = [];
    const startX = 50;
    const centerY = 100; // Center of the container vertically
    const tileSpacing = 70; // Horizontal spacing between tiles
    const curveAmplitude = 35; // How much the path curves up/down

    for (let i = 0; i < count; i++) {
      // Create a horizontal winding S-curve pattern
      const xPos = startX + (i * tileSpacing);

      // Use sine wave for vertical positioning to create curves
      const sineOffset = Math.sin(i * 0.5) * curveAmplitude;
      const yPos = centerY + sineOffset;

      // Add slight rotation for more natural look
      const rotation = Math.cos(i * 0.5) * 6;

      path.push({
        index: i,
        x: xPos,
        y: yPos,
        rotation,
        isStart: i === 0,
        isFinish: i === count - 1,
        isMilestone: i > 0 && i % 5 === 0,
      });
    }
    return path;
  };

  const pathTiles = generateCurvyPath(numTiles);
  const pathWidth = (numTiles * 70) + 100;
  const pathHeight = 200;

  return (
    <div className="game-board-3d">
      {/* Forest Background with CSS Trees and Grass */}
      <div className="forest-scene">
        {/* CSS Trees */}
        <div className="css-tree tree-1">
          <div className="tree-top"></div>
          <div className="tree-trunk"></div>
        </div>
        <div className="css-tree tree-2">
          <div className="tree-top"></div>
          <div className="tree-trunk"></div>
        </div>
        <div className="css-tree tree-3">
          <div className="tree-top"></div>
          <div className="tree-trunk"></div>
        </div>
        <div className="css-tree tree-4">
          <div className="tree-top"></div>
          <div className="tree-trunk"></div>
        </div>

        {/* CSS Grass Patches */}
        <div className="grass-patch grass-1">
          <div className="grass-blade"></div>
          <div className="grass-blade"></div>
          <div className="grass-blade"></div>
        </div>
        <div className="grass-patch grass-2">
          <div className="grass-blade"></div>
          <div className="grass-blade"></div>
          <div className="grass-blade"></div>
        </div>
        <div className="grass-patch grass-3">
          <div className="grass-blade"></div>
          <div className="grass-blade"></div>
          <div className="grass-blade"></div>
        </div>
        <div className="grass-patch grass-4">
          <div className="grass-blade"></div>
          <div className="grass-blade"></div>
          <div className="grass-blade"></div>
        </div>

        {/* CSS Bushes */}
        <div className="css-bush bush-1"></div>
        <div className="css-bush bush-2"></div>
      </div>

      <div className="board-title">
        <h3>🏔️ Stepping Stones 🏔️</h3>
        <span className="subtitle">Journey through the stone path!</span>
      </div>

      <div className="path-container" style={{ width: `${pathWidth}px`, height: `${pathHeight}px` }}>
        {/* Path shadow/trail effect */}
        <svg className="path-trail" viewBox={`0 0 ${pathWidth} ${pathHeight}`}>
          <defs>
            <linearGradient id="trailGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 119, 101, 0.3)" />
              <stop offset="100%" stopColor="rgba(101, 85, 72, 0.5)" />
            </linearGradient>
          </defs>
          <path
            d={`M ${pathTiles.map((t, i) => `${i === 0 ? 'M' : 'L'} ${t.x + 35} ${t.y + 25}`).join(' ')}`}
            fill="none"
            stroke="url(#trailGradient)"
            strokeWidth="60"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Rock Tiles */}
        {pathTiles.map((tile) => {
          const teamsAtPosition = teams.filter((team) => getTeamTilePosition(team) === tile.index);

          return (
            <div
              key={tile.index}
              className={`rock-tile ${tile.isStart ? 'start-rock' : ''} ${tile.isFinish ? 'finish-rock' : ''} ${tile.isMilestone ? 'milestone-rock' : ''}`}
              style={{
                left: `${tile.x}px`,
                top: `${tile.y}px`,
                transform: `rotateZ(${tile.rotation}deg)`,
              }}
            >
              {/* 3D Rock Structure */}
              <div className="rock-3d">
                <div className="rock-top">
                  <span className="rock-number">{tile.index}</span>
                  {tile.isStart && <span className="start-marker">START</span>}
                  {tile.isFinish && <span className="finish-marker">🏁</span>}
                </div>
                <div className="rock-front"></div>
                <div className="rock-left"></div>
              </div>

              {/* Team Tokens */}
              {teamsAtPosition.length > 0 && (
                <div className="tokens-container">
                  {teamsAtPosition.map((team) => {
                    const teamIndex = teams.findIndex((t) => t.id === team.id);
                    const isCurrentTurn = team.id === currentTurnTeamId;
                    return (
                      <div
                        key={team.id}
                        className={`player-token ${isCurrentTurn ? 'current-turn' : ''}`}
                        title={`${team.team_name || team.name} - ${team.score || 0} pts`}
                      >
                        <span className="token-emoji">{getTeamToken(teamIndex)}</span>
                        {isCurrentTurn && <span className="turn-indicator"></span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Team Legend */}
      <div className="teams-legend">
        {teams.map((team, index) => {
          const isCurrentTurn = team.id === currentTurnTeamId;
          return (
            <div key={team.id} className={`legend-item ${isCurrentTurn ? 'active-turn' : ''}`}>
              <span className="legend-emoji">{getTeamToken(index)}</span>
              <span className="legend-name">{team.team_name || team.name}</span>
              <span className="legend-score">{team.score || 0} pts</span>
              {isCurrentTurn && <span className="turn-dot"></span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GameBoard;
