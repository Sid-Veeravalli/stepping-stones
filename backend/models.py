"""
SQLAlchemy Database Models for Quiz Game
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class QuestionType(enum.Enum):
    MCQ = "MCQ"
    FILL_IN_THE_BLANKS = "Fill in the Blanks"
    WHAT_WOULD_YOU_DO = "What Would You Do?"


class DifficultyLevel(enum.Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"
    INSANE = "Insane"


class Facilitator(Base):
    __tablename__ = "facilitators"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    quizzes = relationship("Quiz", back_populates="facilitator", cascade="all, delete-orphan")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    facilitator_id = Column(Integer, ForeignKey("facilitators.id"), nullable=False)
    num_teams = Column(Integer, nullable=False)  # 3-5
    num_rounds = Column(Integer, nullable=False)  # 4-10

    # Question distribution per difficulty level
    easy_questions_count = Column(Integer, nullable=False, default=1)
    medium_questions_count = Column(Integer, nullable=False, default=1)
    hard_questions_count = Column(Integer, nullable=False, default=1)
    insane_questions_count = Column(Integer, nullable=False, default=1)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    facilitator = relationship("Facilitator", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    game_sessions = relationship("GameSession", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    difficulty = Column(Enum(DifficultyLevel), nullable=False)
    time_limit = Column(Integer, nullable=False)  # in seconds

    # For MCQs
    option_a = Column(String, nullable=True)
    option_b = Column(String, nullable=True)
    option_c = Column(String, nullable=True)
    option_d = Column(String, nullable=True)
    correct_answer = Column(String, nullable=True)  # For MCQs: 'A', 'B', 'C', or 'D'

    # For Fill in the Blanks and What Would You Do (optional)
    model_answer = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    room_code = Column(String(6), unique=True, index=True, nullable=False)
    status = Column(String, default="waiting")  # waiting, in_progress, completed
    current_round = Column(Integer, default=0)
    current_team_index = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    quiz = relationship("Quiz", back_populates="game_sessions")
    teams = relationship("Team", back_populates="game_session", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="game_session", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    game_session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    team_name = Column(String, nullable=False)
    position = Column(Integer, default=0)  # Number of tiles moved
    score = Column(Integer, default=0)  # Total points earned
    join_order = Column(Integer, nullable=False)  # Order in which team joined

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    game_session = relationship("GameSession", back_populates="teams")
    answers = relationship("Answer", back_populates="team", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    game_session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)

    submitted_answer = Column(Text, nullable=True)  # Team's answer
    is_correct = Column(Boolean, nullable=True)  # For MCQs: auto-graded, For others: facilitator graded
    points_awarded = Column(Integer, default=0)  # Points awarded (can include bonus)

    round_number = Column(Integer, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    graded_at = Column(DateTime, nullable=True)

    # Relationships
    game_session = relationship("GameSession", back_populates="answers")
    team = relationship("Team", back_populates="answers")
    question = relationship("Question", back_populates="answers")
