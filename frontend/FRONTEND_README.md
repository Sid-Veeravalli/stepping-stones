# Quiz Game Frontend

This is the React + Vite frontend for the Quiz Game application with a forest theme.

## What's Been Built

### Pages

1. **Login/Register** (`/login`)
   - Facilitator authentication
   - Toggle between login and register modes
   - Link to player join page

2. **Dashboard** (`/dashboard`)
   - View all created quizzes
   - Create new quiz
   - Edit/Launch/Delete quizzes
   - Quiz cards showing teams, rounds, questions count

3. **Create/Edit Quiz** (`/quiz/create` or `/quiz/:quizId/edit`)
   - Configure quiz settings (name, teams, rounds)
   - Set difficulty distribution (easy, medium, hard, insane)
   - Progress bars showing question completion
   - Add/edit/delete questions manually
   - Import questions from Excel
   - Question validation before creating quiz

4. **Join Game** (`/play`)
   - Players enter room code
   - Enter team name
   - Animated forest animals in background

5. **Game Page** (`/game/:sessionId/facilitator` or `/game/:sessionId/player`)
   - Waiting room showing room code and joined teams
   - Real-time game board with forest path and animal tokens
   - Question display with timer
   - Answer submission (MCQ buttons or text input)
   - Leaderboard sidebar
   - Manual grading interface for facilitator (Fill/What Would You Do questions)

### Components

1. **QuestionModal** - Add/edit question form with MCQ options
2. **Leaderboard** - Team rankings with medals
3. **Timer** - Countdown timer with color-coded states (normal/warning/critical)
4. **GameBoard** - Forest path with stone tiles and team animal tokens
5. **QuestionDisplay** - Question rendering with type-specific inputs

### Context & Hooks

1. **AuthContext** - User authentication state
2. **GameContext** - Game session state
3. **useWebSocket** - WebSocket connection management

### Styling

- Forest theme with green, brown, and earth tones
- Animated backgrounds and transitions
- Responsive design
- Custom scrollbars
- Difficulty-based color coding (easy: green, medium: yellow, hard: orange, insane: red)

## Setup & Running

### Prerequisites

- Node.js v24.8.0 (or compatible version)
- Backend server running on http://localhost:8000

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will open at http://localhost:5173

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` folder.

## Project Structure

```
frontend/
├── src/
│   ├── components/         # Reusable components
│   │   ├── GameBoard.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── QuestionDisplay.jsx
│   │   ├── QuestionModal.jsx
│   │   └── Timer.jsx
│   ├── context/           # React Context providers
│   │   ├── AuthContext.jsx
│   │   └── GameContext.jsx
│   ├── hooks/             # Custom React hooks
│   │   └── useWebSocket.js
│   ├── pages/             # Page components
│   │   ├── CreateQuiz.jsx
│   │   ├── Dashboard.jsx
│   │   ├── GamePage.jsx
│   │   ├── JoinGame.jsx
│   │   └── Login.jsx
│   ├── utils/             # Utilities
│   │   └── api.js         # API client
│   ├── App.jsx            # Main app with routing
│   ├── App.css            # Global styles
│   ├── index.css          # Base styles
│   └── main.jsx           # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## API Integration

The frontend connects to the backend at `http://localhost:8000/api`. The API client is configured in `src/utils/api.js` with automatic token injection.

### WebSocket Connection

WebSocket URL: `ws://localhost:8000/ws/{sessionId}/{role}`

- Handles real-time updates during games
- Events: team_joined, game_started, question_served, answer_graded, leaderboard_update, time_up, game_ended

## Features

### Facilitator Flow
1. Login/Register
2. Create quiz with configuration
3. Add questions (manually or import Excel)
4. Launch game (generates room code)
5. Wait for teams to join
6. Start game
7. Serve questions
8. Grade answers (for Fill/What Would You Do)
9. View leaderboard in real-time

### Player Flow
1. Enter room code
2. Enter team name
3. Wait for game to start
4. Answer questions when your team's turn
5. View score and position on game board
6. See final results

## Customization

### Theme Colors

Edit CSS variables in `App.css`:

```css
:root {
  --forest-green: #2d5016;
  --earth-brown: #6b4423;
  --easy-color: #90ee90;
  --medium-color: #f0ad4e;
  --hard-color: #ff8c42;
  --insane-color: #d9534f;
}
```

### Animal Tokens

Team tokens use emoji animals: 🐻 🦊 🐰 🦌 🦉
Change in `GameBoard.jsx`:

```javascript
const animalTokens = ['🐻', '🦊', '🐰', '🦌', '🦉'];
```

## Technologies Used

- **React 19.2.0** - UI framework
- **React Router 7.13.0** - Routing
- **Vite 7.2.4** - Build tool
- **Axios 1.13.2** - HTTP client
- **Framer Motion 12.29.0** - Animations (ready to use)
- **React Hot Toast 2.6.0** - Notifications

## Notes

- Protected routes require authentication
- Tokens stored in localStorage
- WebSocket auto-reconnect on disconnect
- Form validation on all inputs
- Responsive design for mobile/tablet/desktop
