"""
CRUD operations for database
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import random
import string

from models import (
    Facilitator, Quiz, Question, GameSession, Team, Answer,
    QuestionType, DifficultyLevel
)
from schemas import (
    FacilitatorCreate, QuizCreate, QuizUpdate,
    QuestionCreate, QuestionUpdate, AnswerSubmit, AnswerGrade
)
from auth import get_password_hash


# ==================== Facilitator CRUD ====================

async def create_facilitator(db: AsyncSession, facilitator: FacilitatorCreate) -> Facilitator:
    """Create a new facilitator"""
    db_facilitator = Facilitator(
        username=facilitator.username,
        hashed_password=get_password_hash(facilitator.password)
    )
    db.add(db_facilitator)
    await db.commit()
    await db.refresh(db_facilitator)
    return db_facilitator


async def get_facilitator_by_username(db: AsyncSession, username: str) -> Optional[Facilitator]:
    """Get facilitator by username"""
    result = await db.execute(
        select(Facilitator).where(Facilitator.username == username)
    )
    return result.scalar_one_or_none()


async def get_facilitator_by_id(db: AsyncSession, facilitator_id: int) -> Optional[Facilitator]:
    """Get facilitator by ID"""
    result = await db.execute(
        select(Facilitator).where(Facilitator.id == facilitator_id)
    )
    return result.scalar_one_or_none()


# ==================== Quiz CRUD ====================

async def create_quiz(db: AsyncSession, quiz: QuizCreate, facilitator_id: int) -> Quiz:
    """Create a new quiz"""
    db_quiz = Quiz(
        name=quiz.name,
        facilitator_id=facilitator_id,
        num_teams=quiz.num_teams,
        num_rounds=quiz.num_rounds,
        easy_questions_count=quiz.easy_questions_count,
        medium_questions_count=quiz.medium_questions_count,
        hard_questions_count=quiz.hard_questions_count,
        insane_questions_count=quiz.insane_questions_count
    )
    db.add(db_quiz)
    await db.commit()
    await db.refresh(db_quiz)
    return db_quiz


async def get_quiz(db: AsyncSession, quiz_id: int) -> Optional[Quiz]:
    """Get quiz by ID"""
    result = await db.execute(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions))
    )
    return result.scalar_one_or_none()


async def get_quizzes_by_facilitator(db: AsyncSession, facilitator_id: int) -> List[Quiz]:
    """Get all quizzes created by a facilitator"""
    result = await db.execute(
        select(Quiz)
        .where(Quiz.facilitator_id == facilitator_id)
        .order_by(Quiz.created_at.desc())
    )
    return result.scalars().all()


async def update_quiz(db: AsyncSession, quiz_id: int, quiz_update: QuizUpdate) -> Optional[Quiz]:
    """Update quiz"""
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id)
    )
    db_quiz = result.scalar_one_or_none()

    if not db_quiz:
        return None

    update_data = quiz_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_quiz, field, value)

    db_quiz.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(db_quiz)
    return db_quiz


async def delete_quiz(db: AsyncSession, quiz_id: int) -> bool:
    """Delete quiz (cascade deletes associated questions)"""
    # Fetch the quiz object to trigger ORM cascade delete
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id)
    )
    db_quiz = result.scalar_one_or_none()

    if not db_quiz:
        return False

    # Delete using ORM to trigger cascade
    await db.delete(db_quiz)
    await db.commit()
    return True


# ==================== Question CRUD ====================

async def create_question(db: AsyncSession, question: QuestionCreate, quiz_id: int) -> Question:
    """Create a new question"""
    db_question = Question(
        quiz_id=quiz_id,
        question_text=question.question_text,
        question_type=QuestionType(question.question_type.value),
        difficulty=DifficultyLevel(question.difficulty.value),
        time_limit=question.time_limit,
        option_a=question.option_a,
        option_b=question.option_b,
        option_c=question.option_c,
        option_d=question.option_d,
        correct_answer=question.correct_answer,
        model_answer=question.model_answer
    )
    db.add(db_question)
    await db.commit()
    await db.refresh(db_question)
    return db_question


async def get_question(db: AsyncSession, question_id: int) -> Optional[Question]:
    """Get question by ID"""
    result = await db.execute(
        select(Question).where(Question.id == question_id)
    )
    return result.scalar_one_or_none()


async def get_questions_by_quiz(db: AsyncSession, quiz_id: int) -> List[Question]:
    """Get all questions for a quiz"""
    result = await db.execute(
        select(Question)
        .where(Question.quiz_id == quiz_id)
        .order_by(Question.created_at)
    )
    return result.scalars().all()


async def get_questions_count_by_difficulty(
    db: AsyncSession, quiz_id: int
) -> dict:
    """Get count of questions by difficulty level"""
    result = await db.execute(
        select(Question.difficulty, func.count(Question.id))
        .where(Question.quiz_id == quiz_id)
        .group_by(Question.difficulty)
    )
    rows = result.all()

    counts = {
        "Easy": 0,
        "Medium": 0,
        "Hard": 0,
        "Insane": 0
    }
    for difficulty, count in rows:
        counts[difficulty.value] = count

    return counts


async def update_question(
    db: AsyncSession, question_id: int, question_update: QuestionUpdate
) -> Optional[Question]:
    """Update question"""
    result = await db.execute(
        select(Question).where(Question.id == question_id)
    )
    db_question = result.scalar_one_or_none()

    if not db_question:
        return None

    update_data = question_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ['question_type', 'difficulty'] and value:
            # Convert enum string to enum instance
            if field == 'question_type':
                value = QuestionType(value.value if hasattr(value, 'value') else value)
            elif field == 'difficulty':
                value = DifficultyLevel(value.value if hasattr(value, 'value') else value)
        setattr(db_question, field, value)

    await db.commit()
    await db.refresh(db_question)
    return db_question


async def delete_question(db: AsyncSession, question_id: int) -> bool:
    """Delete question"""
    result = await db.execute(
        delete(Question).where(Question.id == question_id)
    )
    await db.commit()
    return result.rowcount > 0


# ==================== Game Session CRUD ====================

def generate_room_code() -> str:
    """Generate a unique 6-digit room code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


async def create_game_session(db: AsyncSession, quiz_id: int) -> GameSession:
    """Create a new game session"""
    # Generate unique room code
    while True:
        room_code = generate_room_code()
        existing = await db.execute(
            select(GameSession).where(GameSession.room_code == room_code)
        )
        if not existing.scalar_one_or_none():
            break

    db_session = GameSession(
        quiz_id=quiz_id,
        room_code=room_code,
        status="waiting"
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session


async def get_game_session(db: AsyncSession, session_id: int) -> Optional[GameSession]:
    """Get game session by ID"""
    result = await db.execute(
        select(GameSession)
        .where(GameSession.id == session_id)
        .options(selectinload(GameSession.teams), selectinload(GameSession.quiz))
    )
    return result.scalar_one_or_none()


async def get_game_session_by_room_code(db: AsyncSession, room_code: str) -> Optional[GameSession]:
    """Get game session by room code"""
    result = await db.execute(
        select(GameSession)
        .where(GameSession.room_code == room_code)
        .options(selectinload(GameSession.teams), selectinload(GameSession.quiz))
    )
    return result.scalar_one_or_none()


async def update_game_session_status(
    db: AsyncSession, session_id: int, status: str
) -> Optional[GameSession]:
    """Update game session status"""
    result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    db_session = result.scalar_one_or_none()

    if not db_session:
        return None

    db_session.status = status

    if status == "in_progress" and not db_session.started_at:
        db_session.started_at = datetime.utcnow()
    elif status == "completed":
        db_session.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(db_session)
    return db_session


# ==================== Team CRUD ====================

async def create_team(
    db: AsyncSession, game_session_id: int, team_name: str
) -> Team:
    """Create a new team in a game session"""
    # Get current team count to set join_order
    result = await db.execute(
        select(func.count(Team.id))
        .where(Team.game_session_id == game_session_id)
    )
    team_count = result.scalar()

    db_team = Team(
        game_session_id=game_session_id,
        team_name=team_name,
        join_order=team_count
    )
    db.add(db_team)
    await db.commit()
    await db.refresh(db_team)
    return db_team


async def get_teams_by_session(db: AsyncSession, session_id: int) -> List[Team]:
    """Get all teams in a game session"""
    result = await db.execute(
        select(Team)
        .where(Team.game_session_id == session_id)
        .order_by(Team.join_order)
    )
    return result.scalars().all()


async def update_team_score(
    db: AsyncSession, team_id: int, points: int
) -> Optional[Team]:
    """Update team score and position"""
    result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    db_team = result.scalar_one_or_none()

    if not db_team:
        return None

    db_team.score += points
    db_team.position += points  # Position = tiles moved

    await db.commit()
    await db.refresh(db_team)
    return db_team


# ==================== Answer CRUD ====================

async def create_answer(db: AsyncSession, answer: AnswerSubmit) -> Answer:
    """Create a new answer"""
    db_answer = Answer(
        game_session_id=answer.game_session_id,
        team_id=answer.team_id,
        question_id=answer.question_id,
        submitted_answer=answer.submitted_answer,
        round_number=answer.round_number
    )
    db.add(db_answer)
    await db.commit()
    await db.refresh(db_answer)
    return db_answer


async def grade_answer(db: AsyncSession, answer_grade: AnswerGrade) -> Optional[Answer]:
    """Grade an answer"""
    result = await db.execute(
        select(Answer).where(Answer.id == answer_grade.answer_id)
    )
    db_answer = result.scalar_one_or_none()

    if not db_answer:
        return None

    db_answer.is_correct = answer_grade.is_correct
    db_answer.points_awarded = answer_grade.points_awarded
    db_answer.graded_at = datetime.utcnow()

    await db.commit()
    await db.refresh(db_answer)
    return db_answer


async def get_answers_by_session(db: AsyncSession, session_id: int) -> List[Answer]:
    """Get all answers for a game session"""
    result = await db.execute(
        select(Answer)
        .where(Answer.game_session_id == session_id)
        .order_by(Answer.submitted_at)
    )
    return result.scalars().all()


async def get_answer_by_team_and_question(
    db: AsyncSession, team_id: int, question_id: int
) -> Optional[Answer]:
    """Get answer by team and question"""
    result = await db.execute(
        select(Answer)
        .where(Answer.team_id == team_id, Answer.question_id == question_id)
    )
    return result.scalar_one_or_none()
