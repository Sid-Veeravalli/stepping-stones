"""
Main FastAPI application with all routes
"""
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
from datetime import timedelta
import pandas as pd
import io
import uuid

from database import get_db, init_db
from models import Facilitator, Quiz, Question, GameSession, Team, DifficultyLevel, QuestionType
import schemas
import crud
import auth
from game_logic import GameEngine, check_mcq_answer, validate_quiz_completion, DIFFICULTY_POINTS
from websocket import manager

# Create FastAPI app
app = FastAPI(
    title="Quiz Game API",
    description="Backend API for team quiz game with forest theme",
    version="1.0.0"
)

# CORS middleware - Dynamic origins for local dev and production
import os

# Get allowed origins from environment variable or use defaults
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []

# Default origins for local development
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://192.168.0.118:5173",
    "http://192.168.0.118:3000",
]

# Combine environment origins with defaults
all_origins = [origin.strip() for origin in CORS_ORIGINS if origin.strip()] + DEFAULT_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active game engines in memory
active_games: Dict[int, GameEngine] = {}
# Store pending questions waiting for dice roll
pending_questions: Dict[int, dict] = {}
# Store active questions being answered (after dice roll)
active_questions: Dict[int, dict] = {}
# Store submitted answers awaiting grading (session_id -> list of answer details)
pending_answers: Dict[int, list] = {}


@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
    await init_db()
    print("Database initialized successfully")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Quiz Game API",
        "version": "1.0.0",
        "status": "running"
    }


# ==================== Facilitator Authentication Routes ====================

@app.post("/api/facilitator/register", response_model=schemas.FacilitatorResponse, status_code=status.HTTP_201_CREATED)
async def register_facilitator(
    facilitator: schemas.FacilitatorCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new facilitator

    - **username**: Unique username (3-50 characters)
    - **password**: Password (min 8 chars, must contain uppercase and number)
    """
    # Check if username already exists
    existing = await crud.get_facilitator_by_username(db, facilitator.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    db_facilitator = await crud.create_facilitator(db, facilitator)
    return db_facilitator


@app.post("/api/facilitator/login", response_model=schemas.Token)
async def login_facilitator(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Login facilitator and get access token

    - **username**: Facilitator username
    - **password**: Facilitator password
    """
    facilitator = await auth.authenticate_facilitator(db, form_data.username, form_data.password)
    if not facilitator:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": facilitator.username}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/facilitator/me", response_model=schemas.FacilitatorResponse)
async def get_current_facilitator_info(
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator)
):
    """Get current logged-in facilitator information"""
    return current_facilitator


# ==================== Quiz Management Routes ====================

@app.post("/api/quizzes", response_model=schemas.QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz: schemas.QuizCreate,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new quiz

    - **name**: Quiz name
    - **num_teams**: Number of teams (3-5)
    - **num_rounds**: Number of rounds (4-10)
    - **easy/medium/hard/insane_questions_count**: Required questions per difficulty
    """
    # Validate that total questions requirement is met
    total_required = quiz.num_teams * quiz.num_rounds
    total_configured = (quiz.easy_questions_count + quiz.medium_questions_count +
                       quiz.hard_questions_count + quiz.insane_questions_count)

    if total_configured < total_required:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total questions ({total_configured}) must be at least {total_required} (teams × rounds)"
        )

    db_quiz = await crud.create_quiz(db, quiz, current_facilitator.id)
    return db_quiz


@app.get("/api/quizzes", response_model=List[schemas.QuizResponse])
async def get_my_quizzes(
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Get all quizzes created by current facilitator"""
    quizzes = await crud.get_quizzes_by_facilitator(db, current_facilitator.id)
    return quizzes


@app.get("/api/quizzes/{quiz_id}", response_model=schemas.QuizWithQuestions)
async def get_quiz(
    quiz_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Get quiz by ID with all questions"""
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    # Check ownership
    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this quiz"
        )

    return quiz


@app.put("/api/quizzes/{quiz_id}", response_model=schemas.QuizResponse)
async def update_quiz(
    quiz_id: int,
    quiz_update: schemas.QuizUpdate,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Update quiz configuration"""
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this quiz"
        )

    updated_quiz = await crud.update_quiz(db, quiz_id, quiz_update)
    return updated_quiz


@app.delete("/api/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Delete quiz"""
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this quiz"
        )

    await crud.delete_quiz(db, quiz_id)


# ==================== Question Management Routes ====================

@app.post("/api/quizzes/{quiz_id}/questions", response_model=schemas.QuestionResponse, status_code=status.HTTP_201_CREATED)
async def add_question(
    quiz_id: int,
    question: schemas.QuestionCreate,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Add a question to a quiz"""
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add questions to this quiz"
        )

    db_question = await crud.create_question(db, question, quiz_id)
    return db_question


@app.get("/api/quizzes/{quiz_id}/questions", response_model=List[schemas.QuestionResponse])
async def get_quiz_questions(
    quiz_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Get all questions for a quiz"""
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this quiz"
        )

    questions = await crud.get_questions_by_quiz(db, quiz_id)
    return questions


@app.put("/api/questions/{question_id}", response_model=schemas.QuestionResponse)
async def update_question(
    question_id: int,
    question_update: schemas.QuestionUpdate,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Update a question"""
    question = await crud.get_question(db, question_id)

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    # Check quiz ownership
    quiz = await crud.get_quiz(db, question.quiz_id)
    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this question"
        )

    updated_question = await crud.update_question(db, question_id, question_update)
    return updated_question


@app.delete("/api/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Delete a question"""
    question = await crud.get_question(db, question_id)

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    # Check quiz ownership
    quiz = await crud.get_quiz(db, question.quiz_id)
    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this question"
        )

    await crud.delete_question(db, question_id)


@app.get("/api/quizzes/{quiz_id}/questions/count")
async def get_question_counts(
    quiz_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Get count of questions by difficulty level"""
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this quiz"
        )

    counts = await crud.get_questions_count_by_difficulty(db, quiz_id)
    return counts


@app.post("/api/quizzes/{quiz_id}/questions/import")
async def import_questions_from_excel(
    quiz_id: int,
    file: UploadFile = File(...),
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """
    Import questions from Excel file

    Expected columns: Question, Type, Difficulty, Time, Answer, Option A, Option B, Option C, Option D
    """
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to import questions to this quiz"
        )

    # Read file contents
    contents = await file.read()
    df = None

    # Try reading as Excel first, then CSV with different encodings
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        # Try CSV with different encodings
        encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
        for encoding in encodings:
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding=encoding)
                break
            except Exception:
                continue

    if df is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error reading file. Please ensure it's a valid Excel (.xlsx) or CSV file."
        )

    # Clean column names (strip whitespace)
    df.columns = df.columns.str.strip()

    # Validate required columns (case-insensitive)
    required_columns = ['Question', 'Type', 'Difficulty', 'Time']
    optional_columns = ['Answer', 'Option A', 'Option B', 'Option C', 'Option D']

    # Create a mapping for case-insensitive column matching
    col_mapping = {}
    for col in df.columns:
        col_lower = col.lower().strip()
        for req_col in required_columns + optional_columns:
            if col_lower == req_col.lower():
                col_mapping[req_col] = col
                break

    # Check required columns
    for col in required_columns:
        if col not in col_mapping:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required column: {col}"
            )

    # Type mapping for flexible matching (case-insensitive, with common variations)
    # Note: "What Would You Do?" must have the question mark to match the QuestionType enum
    type_mapping = {
        'mcq': 'MCQ',
        'multiple choice': 'MCQ',
        'multiple-choice': 'MCQ',
        'fill in the blanks': 'Fill in the Blanks',
        'fill in the blank': 'Fill in the Blanks',
        'fill-in-the-blanks': 'Fill in the Blanks',
        'fill blanks': 'Fill in the Blanks',
        'fitb': 'Fill in the Blanks',
        'what would you do': 'What Would You Do?',
        'what would you do?': 'What Would You Do?',
        'wwyd': 'What Would You Do?',
        'scenario': 'What Would You Do?',
    }

    # Difficulty mapping
    difficulty_mapping = {
        'easy': 'Easy',
        'medium': 'Medium',
        'hard': 'Hard',
        'insane': 'Insane',
        'extreme': 'Insane',
        'difficult': 'Hard',
    }

    # Process rows and create questions
    imported_count = 0
    errors = []

    for index, row in df.iterrows():
        try:
            # Get question text
            question_text = row[col_mapping['Question']]
            if pd.isna(question_text):
                continue
            question_text = str(question_text).strip()
            if question_text == '':
                continue

            # Get and normalize question type
            raw_type = row[col_mapping['Type']]
            if pd.isna(raw_type):
                errors.append(f"Row {index + 2}: Missing question type")
                continue
            raw_type = str(raw_type).strip().lower()
            question_type = type_mapping.get(raw_type)
            if not question_type:
                errors.append(f"Row {index + 2}: Invalid question type '{row[col_mapping['Type']]}'")
                continue

            # Get and normalize difficulty
            raw_difficulty = row[col_mapping['Difficulty']]
            if pd.isna(raw_difficulty):
                errors.append(f"Row {index + 2}: Missing difficulty")
                continue
            raw_difficulty = str(raw_difficulty).strip().lower()
            difficulty = difficulty_mapping.get(raw_difficulty)
            if not difficulty:
                errors.append(f"Row {index + 2}: Invalid difficulty '{row[col_mapping['Difficulty']]}'")
                continue

            # Get time limit
            time_val = row[col_mapping['Time']]
            if pd.isna(time_val):
                time_limit = 30  # Default
            else:
                time_limit = int(float(time_val))

            # Helper to get optional field
            def get_optional(field_name):
                if field_name not in col_mapping:
                    return None
                val = row[col_mapping[field_name]]
                if pd.isna(val):
                    return None
                return str(val).strip() if str(val).strip() else None

            # Get answer from CSV
            answer_value = get_optional('Answer')

            # For MCQ: answer is A/B/C/D (goes to correct_answer)
            # For Fill in the Blanks and What Would You Do: answer is text (goes to model_answer)
            if question_type == 'MCQ':
                correct_ans = answer_value
                model_ans = None
            else:
                correct_ans = None
                model_ans = answer_value

            # Create question
            question_data = schemas.QuestionCreate(
                question_text=question_text,
                question_type=question_type,
                difficulty=difficulty,
                time_limit=time_limit,
                option_a=get_optional('Option A'),
                option_b=get_optional('Option B'),
                option_c=get_optional('Option C'),
                option_d=get_optional('Option D'),
                correct_answer=correct_ans,
                model_answer=model_ans
            )

            await crud.create_question(db, question_data, quiz_id)
            imported_count += 1

        except Exception as e:
            errors.append(f"Row {index + 2}: {str(e)}")

    return {
        "imported_count": imported_count,
        "errors": errors if errors else None,
        "message": f"Successfully imported {imported_count} questions"
    }


@app.post("/api/quizzes/{quiz_id}/validate")
async def validate_quiz(
    quiz_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """
    Validate if quiz has enough questions to be launched

    Checks:
    - Total question count >= teams × rounds
    - Each difficulty level has minimum required questions
    """
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to validate this quiz"
        )

    # Get actual question counts
    counts = await crud.get_questions_count_by_difficulty(db, quiz_id)

    # Validate
    is_valid, message = validate_quiz_completion(
        quiz.easy_questions_count,
        quiz.medium_questions_count,
        quiz.hard_questions_count,
        quiz.insane_questions_count,
        counts["Easy"],
        counts["Medium"],
        counts["Hard"],
        counts["Insane"],
        quiz.num_teams,
        quiz.num_rounds
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    return {
        "is_valid": True,
        "message": "Quiz is ready to launch"
    }


# ==================== Game Session Routes ====================

@app.post("/api/quizzes/{quiz_id}/launch", response_model=schemas.GameSessionResponse, status_code=status.HTTP_201_CREATED)
async def launch_game_session(
    quiz_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """
    Launch a new game session for a quiz

    Creates a room code and returns game session information
    """
    quiz = await crud.get_quiz(db, quiz_id)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to launch this quiz"
        )

    # Validate quiz has enough questions
    counts = await crud.get_questions_count_by_difficulty(db, quiz_id)
    is_valid, message = validate_quiz_completion(
        quiz.easy_questions_count, quiz.medium_questions_count,
        quiz.hard_questions_count, quiz.insane_questions_count,
        counts["Easy"], counts["Medium"], counts["Hard"], counts["Insane"],
        quiz.num_teams, quiz.num_rounds
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quiz validation failed: {message}"
        )

    # Create game session
    game_session = await crud.create_game_session(db, quiz_id)

    return game_session


@app.post("/api/game/join", response_model=schemas.TeamResponse)
async def join_game(
    team_join: schemas.TeamJoin,
    db: AsyncSession = Depends(get_db)
):
    """
    Join a game session as a team

    - **room_code**: 6-digit room code
    - **team_name**: Team name (2-50 characters)
    """
    game_session = await crud.get_game_session_by_room_code(db, team_join.room_code)

    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found. Please check the room code."
        )

    if game_session.status != "waiting":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game has already started. Cannot join now."
        )

    # Check if team name is unique
    teams = await crud.get_teams_by_session(db, game_session.id)

    if len(teams) >= game_session.quiz.num_teams:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Game is full. Maximum {game_session.quiz.num_teams} teams allowed."
        )

    for team in teams:
        if team.team_name.lower() == team_join.team_name.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team name already taken. Please choose a different name."
            )

    # Create team
    team = await crud.create_team(db, game_session.id, team_join.team_name)

    # Broadcast team joined via WebSocket
    await manager.broadcast_team_joined(game_session.id, {
        "id": team.id,
        "name": team.team_name,
        "position": team.position,
        "score": team.score,
        "join_order": team.join_order
    })

    return team


@app.get("/api/game/{session_id}", response_model=schemas.GameSessionResponse)
async def get_game_session_info(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get game session information"""
    game_session = await crud.get_game_session(db, session_id)

    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )

    return game_session


@app.get("/api/game/room/{room_code}")
async def get_game_by_room_code(
    room_code: str,
    db: AsyncSession = Depends(get_db)
):
    """Get game session by room code"""
    game_session = await crud.get_game_session_by_room_code(db, room_code)

    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )

    teams = await crud.get_teams_by_session(db, game_session.id)

    return {
        "session": game_session,
        "teams": teams,
        "quiz": game_session.quiz
    }


@app.post("/api/game/{session_id}/start")
async def start_game(
    session_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Start the game"""
    game_session = await crud.get_game_session(db, session_id)

    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )

    # Check ownership
    quiz = await crud.get_quiz(db, game_session.quiz_id)
    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to start this game"
        )

    if game_session.status != "waiting":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game has already started"
        )

    # Check minimum teams
    teams = await crud.get_teams_by_session(db, session_id)
    if len(teams) < quiz.num_teams:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Need at least {quiz.num_teams} teams to start. Currently have {len(teams)} teams."
        )

    # Update game status
    await crud.update_game_session_status(db, session_id, "in_progress")

    # Initialize game engine
    questions = await crud.get_questions_by_quiz(db, game_session.quiz_id)
    game_engine = GameEngine(quiz.id, quiz.num_teams, quiz.num_rounds, questions)
    active_games[session_id] = game_engine

    # Broadcast game started
    await manager.broadcast_game_started(session_id)

    return {"message": "Game started successfully"}


@app.get("/api/game/{session_id}/teams", response_model=List[schemas.TeamResponse])
async def get_game_teams(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all teams in a game session"""
    teams = await crud.get_teams_by_session(db, session_id)
    return teams


@app.post("/api/game/{session_id}/question/serve")
async def serve_question(
    session_id: int,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """
    Serve the next question to the appropriate team
    """
    # Check if game exists and is active
    game_session = await crud.get_game_session(db, session_id)
    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )

    if game_session.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is not in progress"
        )

    # Get or reinitialize game engine
    if session_id not in active_games:
        # Game engine was lost (server restart) - reinitialize it
        quiz = await crud.get_quiz(db, game_session.quiz_id)
        questions = await crud.get_questions_by_quiz(db, game_session.quiz_id)

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No questions found for this quiz"
            )

        game_engine = GameEngine(quiz.id, quiz.num_teams, quiz.num_rounds, questions)
        active_games[session_id] = game_engine
    else:
        game_engine = active_games[session_id]

    # Get teams
    teams = await crud.get_teams_by_session(db, session_id)
    if not teams:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No teams found in game"
        )

    # Determine which team is next (round-robin based on allocation)
    current_index = game_engine.current_allocation_index
    if current_index >= len(game_engine.question_allocation):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No more questions available - game complete"
        )

    team_index, question = game_engine.question_allocation[current_index]
    current_team = teams[team_index]

    # Increment for next time
    game_engine.current_allocation_index += 1

    # Calculate round number
    round_number = (current_index // len(teams)) + 1

    # Prepare question data (include model_answer for facilitator grading)
    question_data = {
        "id": question.id,
        "question_text": question.question_text,
        "question_type": question.question_type.value,
        "difficulty": question.difficulty.value,
        "time_limit": question.time_limit,
        "option_a": question.option_a,
        "option_b": question.option_b,
        "option_c": question.option_c,
        "option_d": question.option_d,
        "points": game_engine.get_question_points(question.difficulty),
        "model_answer": question.model_answer
    }

    # Prepare team data
    team_data = {
        "id": current_team.id,
        "name": current_team.team_name
    }

    # Store pending question for after dice roll
    pending_questions[session_id] = {
        "question_data": question_data,
        "team_data": team_data,
        "round_number": round_number
    }

    # Broadcast question_ready_for_dice event (team needs to roll dice)
    await manager.broadcast_question_ready_for_dice(session_id, team_data["name"])

    return {
        "question": question_data,
        "current_team": team_data,
        "round": round_number
    }


@app.post("/api/game/{session_id}/answer")
async def submit_answer(
    session_id: int,
    answer: schemas.AnswerSubmit,
    db: AsyncSession = Depends(get_db)
):
    """Submit an answer"""
    game_session = await crud.get_game_session(db, session_id)

    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )

    if game_session.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is not in progress"
        )

    # Create answer record
    db_answer = await crud.create_answer(db, answer)

    # Get question
    question = await crud.get_question(db, answer.question_id)

    # Get team info for broadcasting
    teams = await crud.get_teams_by_session(db, session_id)
    team = next((t for t in teams if t.id == answer.team_id), None)

    # Broadcast answer_submitted for all question types (so timer stops for everyone)
    await manager.broadcast_answer_submitted(
        session_id,
        answer.team_id,
        team.team_name if team else "Unknown"
    )

    # Send answer details to facilitator for grading (all question types)
    # Get the correct answer text for MCQs
    correct_answer_text = None
    auto_graded = False
    auto_is_correct = False
    auto_points = 0

    if question.question_type == QuestionType.MCQ:
        auto_is_correct = check_mcq_answer(question, answer.submitted_answer)
        auto_points = DIFFICULTY_POINTS[question.difficulty] if auto_is_correct else 0
        auto_graded = True
        if question.correct_answer:
            options = {
                'A': question.option_a,
                'B': question.option_b,
                'C': question.option_c,
                'D': question.option_d
            }
            correct_answer_text = f"{question.correct_answer}: {options.get(question.correct_answer, '')}"

    # Build answer details
    answer_details = {
        "answer_id": db_answer.id,
        "team_id": answer.team_id,
        "team_name": team.team_name if team else "Unknown",
        "submitted_answer": answer.submitted_answer,
        "question_id": answer.question_id,
        "question_type": question.question_type.value,
        "auto_graded": auto_graded,
        "auto_is_correct": auto_is_correct,
        "auto_points": auto_points,
        "correct_answer": correct_answer_text
    }

    # Store in pending answers for state restoration
    if session_id not in pending_answers:
        pending_answers[session_id] = []
    # Avoid duplicates
    if not any(a["answer_id"] == db_answer.id for a in pending_answers[session_id]):
        pending_answers[session_id].append(answer_details)

    # Send detailed answer to facilitator for grading
    message = {
        "type": "answer_submitted_details",
        "data": answer_details
    }
    await manager.send_to_facilitator(message, session_id)

    return {"message": "Answer submitted successfully", "answer_id": db_answer.id}


@app.post("/api/game/{session_id}/grade")
async def grade_answer_manually(
    session_id: int,
    grade_data: schemas.AnswerGrade,
    current_facilitator: Facilitator = Depends(auth.get_current_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Manually grade an answer (for Fill in the Blanks and What Would You Do)"""
    game_session = await crud.get_game_session(db, session_id)

    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )

    # Check ownership
    quiz = await crud.get_quiz(db, game_session.quiz_id)
    if quiz.facilitator_id != current_facilitator.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to grade this game"
        )

    # Grade answer
    db_answer = await crud.grade_answer(db, grade_data)

    if not db_answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found"
        )

    # Update team score if correct
    if grade_data.is_correct:
        await crud.update_team_score(db, db_answer.team_id, grade_data.points_awarded)

    # Get question for model answer
    question = await crud.get_question(db, db_answer.question_id)

    # Get team info
    teams = await crud.get_teams_by_session(db, session_id)
    team = next((t for t in teams if t.id == db_answer.team_id), None)

    # Broadcast answer graded
    await manager.broadcast_answer_graded(
        session_id,
        db_answer.team_id,
        grade_data.is_correct,
        grade_data.points_awarded,
        question.model_answer if question else None,
        team.team_name if team else "Unknown"
    )

    # Update leaderboard
    teams = await crud.get_teams_by_session(db, session_id)
    if session_id in active_games:
        leaderboard = active_games[session_id].get_leaderboard(teams)
        await manager.broadcast_leaderboard_update(session_id, leaderboard)

    # Clear the graded answer from pending_answers
    if session_id in pending_answers:
        pending_answers[session_id] = [
            a for a in pending_answers[session_id] if a["answer_id"] != grade_data.answer_id
        ]
        # If no more pending answers, clear the active question
        if len(pending_answers[session_id]) == 0:
            if session_id in active_questions:
                del active_questions[session_id]

    return {"message": "Answer graded successfully"}


@app.get("/api/game/{session_id}/state")
async def get_game_state(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get current game state including any active question.
    Used for players reconnecting to the game.
    """
    game_session = await crud.get_game_session(db, session_id)

    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )

    # Get teams and leaderboard
    teams = await crud.get_teams_by_session(db, session_id)
    leaderboard = []

    if session_id in active_games:
        leaderboard = active_games[session_id].get_leaderboard(teams)

    # Get pending or active question if any
    current_question = None
    current_team = None
    round_number = 1
    waiting_for_dice = False

    if session_id in pending_questions:
        # There's a question waiting for dice roll
        pending_q = pending_questions[session_id]
        current_question = pending_q["question_data"]
        current_team = pending_q["team_data"]
        round_number = pending_q["round_number"]
        waiting_for_dice = True
    elif session_id in active_questions:
        # There's an active question being answered
        active_q = active_questions[session_id]
        current_question = active_q["question_data"]
        current_team = active_q["team_data"]
        round_number = active_q["round_number"]
        waiting_for_dice = False

    # Get pending answers awaiting grading
    answers_pending = pending_answers.get(session_id, [])

    return {
        "session": {
            "id": game_session.id,
            "status": game_session.status,
            "room_code": game_session.room_code
        },
        "teams": [{"id": t.id, "team_name": t.team_name, "score": t.score, "position": t.position} for t in teams],
        "leaderboard": leaderboard,
        "current_question": current_question,
        "current_team": current_team,
        "round_number": round_number,
        "waiting_for_dice": waiting_for_dice,
        "pending_answers": answers_pending
    }


# ==================== WebSocket Endpoint ====================

@app.websocket("/ws/{session_id}/{role}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: int,
    role: str,
    team_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket endpoint for real-time game updates

    - **session_id**: Game session ID
    - **role**: 'facilitator' or 'player'
    - **team_id**: Team ID (required for players)
    """
    connection_id = str(uuid.uuid4())

    try:
        await manager.connect(websocket, session_id, connection_id, role, team_id)

        while True:
            # Receive messages from client
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif message_type == "dice_rolled":
                # Team rolled the dice, broadcast to everyone
                dice_data = data.get("data", {})
                await manager.broadcast_dice_rolled(session_id, dice_data)

                # Wait for clients to process dice_rolled before sending question
                # This prevents the question from flashing before dice result is shown
                # Need at least 3 second for frontend to set up dice animation state
                import asyncio
                await asyncio.sleep(3.0)

                # Now actually serve the question after dice roll
                if session_id in pending_questions:
                    pending_q = pending_questions[session_id]
                    await manager.broadcast_question_served(
                        session_id,
                        pending_q["question_data"],
                        pending_q["team_data"],
                        pending_q["round_number"]
                    )
                    # Move to active questions (so reconnecting players can get it)
                    active_questions[session_id] = {
                        "question_data": pending_q["question_data"],
                        "team_data": pending_q["team_data"],
                        "round_number": pending_q["round_number"]
                    }
                    # Clear pending question
                    del pending_questions[session_id]

            elif message_type == "request_leaderboard":
                teams = await crud.get_teams_by_session(db, session_id)
                if session_id in active_games:
                    leaderboard = active_games[session_id].get_leaderboard(teams)
                    await websocket.send_json({
                        "type": "leaderboard_update",
                        "data": {"leaderboard": leaderboard}
                    })

            elif message_type == "game_ended":
                # Facilitator ended the game, broadcast to all players
                game_data = data.get("data", {})
                await manager.broadcast_to_session({
                    "type": "game_ended",
                    "data": game_data
                }, session_id)

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(connection_id)
