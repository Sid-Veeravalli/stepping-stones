import './Leaderboard.css';

function Leaderboard({ teams, originalTeams = null }) {
  // Animal emojis for team tokens (matching GameBoard - must be identical!)
  const animalTokens = ['🐻', '🦊', '🐰', '🦌', '🦉', '🐿️', '🦔', '🐸'];

  // Use originalTeams for token lookup if provided, otherwise fall back to teams
  const teamsForTokenLookup = originalTeams || teams;

  // Sort teams by score descending
  const sortedTeams = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Calculate ranks with tie handling (teams with same score get same rank)
  const getTeamRank = (index) => {
    if (index === 0) return 1;
    const currentScore = sortedTeams[index]?.score || 0;
    const prevScore = sortedTeams[index - 1]?.score || 0;
    // If same score as previous team, they share the same rank
    if (currentScore === prevScore) {
      // Find the first team with this score to get the rank
      for (let i = 0; i < index; i++) {
        if ((sortedTeams[i]?.score || 0) === currentScore) {
          return i + 1;
        }
      }
    }
    return index + 1;
  };

  const getMedalEmoji = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getTeamToken = (team) => {
    // Find original index to get consistent animal token (use original join order)
    const originalIndex = teamsForTokenLookup.findIndex(t => t.id === team.id);
    return animalTokens[originalIndex >= 0 ? originalIndex % animalTokens.length : 0];
  };

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <div className="leaderboard-list">
        {sortedTeams.map((team, index) => {
          const rank = getTeamRank(index);
          return (
            <div key={team.id} className={`leaderboard-item rank-${rank}`}>
              <span className="rank">
                {getMedalEmoji(rank)}
              </span>
              <span className="team-token">
                {getTeamToken(team)}
              </span>
              <div className="team-info">
                <div className="team-name">{team.team_name || team.name}</div>
                <div className="team-stats">
                  Score: {team.score || 0} pts
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Leaderboard;
