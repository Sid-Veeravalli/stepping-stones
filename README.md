# Stepping Stones

A gamified corporate training platform that transforms team learning into an engaging adventure.

## Overview

Stepping Stones is a real-time multiplayer quiz game designed for corporate training sessions. Teams compete by rolling dice, answering questions of varying difficulty, and racing across a virtual game board to reach the finish line.

## Features

- **Adaptive Learning Paths**: Easy to Insane difficulty levels ensure progressive skill building
- **Team Collaboration**: Support for 3-5 teams competing and learning together
- **Real-time Gameplay**: Live leaderboards and instant feedback via WebSocket
- **Facilitator Dashboard**: Create and manage training modules, control game flow
- **Gamified Experience**: Dice rolling, animated game board, and celebration effects

## Tech Stack

- **Frontend**: React 18, Vite, React Router, WebSocket
- **Backend**: FastAPI, SQLAlchemy (async), WebSocket
- **Database**: PostgreSQL (production) / SQLite (development)

## Installation & Setup

### Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- npm or yarn
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/Sid-Veeravalli/stepping-stones.git
cd stepping-stones
```

### Step 2: Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

   The backend API will be running at `http://localhost:8000`

### Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be running at `http://localhost:5173`

### Step 4: Access the Application

- Open your browser and go to `http://localhost:5173`
- Create a facilitator account to start creating training modules
- Share the room code with players to join the game

## Project Structure

```
stepping-stones/
├── backend/
│   ├── main.py           # FastAPI application entry point
│   ├── database.py       # Database configuration
│   ├── models.py         # SQLAlchemy database models
│   ├── routers/          # API route handlers
│   │   ├── auth.py       # Authentication routes
│   │   ├── quiz.py       # Quiz management routes
│   │   └── game.py       # Game session routes
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context providers
│   │   ├── hooks/        # Custom hooks (WebSocket)
│   │   └── utils/        # API utilities
│   ├── package.json      # Node.js dependencies
│   └── vite.config.js    # Vite configuration
└── README.md
```

## Environment Variables (Optional)

For production deployment, configure these environment variables:

### Backend
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT secret key for authentication |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_WS_URL` | WebSocket URL |

## How to Play

1. **Facilitator** creates a training module with questions at different difficulty levels
2. **Facilitator** starts a game session and shares the 6-digit room code
3. **Players** join using the room code and their team name
4. Teams take turns rolling the dice and answering questions
5. Correct answers move the team forward on the game board
6. First team to reach the finish line wins!

## License

MIT
