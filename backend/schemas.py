"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class QuestionTypeEnum(str, Enum):
    MCQ = "MCQ"
    FILL_IN_THE_BLANKS = "Fill in the Blanks"
    WHAT_WOULD_YOU_DO = "What Would You Do?"


class DifficultyEnum(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"
    INSANE = "Insane"


class GameStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# ==================== Facilitator Schemas ====================

class FacilitatorCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one number')
        return v


class FacilitatorLogin(BaseModel):
    username: str
    password: str


class FacilitatorResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


# ==================== Question Schemas ====================

class QuestionBase(BaseModel):
    model_config = {"protected_namespaces": ()}

    question_text: str = Field(..., min_length=5)
    question_type: QuestionTypeEnum
    difficulty: DifficultyEnum
    time_limit: int = Field(..., gt=0, description="Time limit in seconds")
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[str] = None  # 'A', 'B', 'C', or 'D' for MCQs
    model_answer: Optional[str] = None  # For Fill/What Would You Do


class QuestionCreate(QuestionBase):
    @model_validator(mode='after')
    def validate_mcq_fields(self):
        if self.question_type == QuestionTypeEnum.MCQ:
            # Check all options are provided
            if not all([self.option_a, self.option_b, self.option_c, self.option_d]):
                raise ValueError('MCQ questions must have all 4 options (A, B, C, D)')
            # Check correct answer is provided and valid
            if not self.correct_answer or self.correct_answer not in ['A', 'B', 'C', 'D']:
                raise ValueError('MCQ questions must have a correct answer (A, B, C, or D)')
        return self


class QuestionUpdate(QuestionBase):
    pass


class QuestionResponse(QuestionBase):
    id: int
    quiz_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ==================== Quiz Schemas ====================

class QuizCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    num_teams: int = Field(..., ge=3, le=5, description="Number of teams (3-5)")
    num_rounds: int = Field(..., ge=4, le=10, description="Number of rounds (4-10)")
    easy_questions_count: int = Field(..., ge=1, description="Number of easy questions")
    medium_questions_count: int = Field(..., ge=1, description="Number of medium questions")
    hard_questions_count: int = Field(..., ge=1, description="Number of hard questions")
    insane_questions_count: int = Field(..., ge=1, description="Number of insane questions")

    @model_validator(mode='after')
    def validate_question_counts(self):
        # Validate that sum of questions >= teams * rounds
        total_required = self.num_teams * self.num_rounds
        total_questions = (self.easy_questions_count + self.medium_questions_count +
                          self.hard_questions_count + self.insane_questions_count)
        if total_questions < total_required:
            raise ValueError(f'Total questions ({total_questions}) must be at least {total_required} (teams × rounds)')
        return self


class QuizUpdate(BaseModel):
    name: Optional[str] = None
    num_teams: Optional[int] = Field(None, ge=3, le=5)
    num_rounds: Optional[int] = Field(None, ge=4, le=10)
    easy_questions_count: Optional[int] = Field(None, ge=1)
    medium_questions_count: Optional[int] = Field(None, ge=1)
    hard_questions_count: Optional[int] = Field(None, ge=1)
    insane_questions_count: Optional[int] = Field(None, ge=1)


class QuizResponse(BaseModel):
    id: int
    name: str
    facilitator_id: int
    num_teams: int
    num_rounds: int
    easy_questions_count: int
    medium_questions_count: int
    hard_questions_count: int
    insane_questions_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuizWithQuestions(QuizResponse):
    questions: List[QuestionResponse] = []


# ==================== Game Session Schemas ====================

class GameSessionCreate(BaseModel):
    quiz_id: int


class GameSessionResponse(BaseModel):
    id: int
    quiz_id: int
    room_code: str
    status: GameStatus
    current_round: int
    current_team_index: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ==================== Team Schemas ====================

class TeamJoin(BaseModel):
    room_code: str
    team_name: str = Field(..., min_length=2, max_length=50)


class TeamResponse(BaseModel):
    id: int
    game_session_id: int
    team_name: str
    position: int
    score: int
    join_order: int

    model_config = {"from_attributes": True}


# ==================== Answer Schemas ====================

class AnswerSubmit(BaseModel):
    game_session_id: int
    team_id: int
    question_id: int
    submitted_answer: str
    round_number: int


class AnswerGrade(BaseModel):
    answer_id: int
    is_correct: bool
    points_awarded: int  # Can include bonus points


class AnswerResponse(BaseModel):
    id: int
    game_session_id: int
    team_id: int
    question_id: int
    submitted_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    points_awarded: int
    round_number: int
    submitted_at: datetime
    graded_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ==================== Excel Import Schema ====================

class ExcelQuestionImport(BaseModel):
    model_config = {"populate_by_name": True}

    Question: str
    Type: str
    Difficulty: str
    Time: int
    Answer: Optional[str] = None
    OptionA: Optional[str] = Field(None, alias="Option A")
    OptionB: Optional[str] = Field(None, alias="Option B")
    OptionC: Optional[str] = Field(None, alias="Option C")
    OptionD: Optional[str] = Field(None, alias="Option D")


# ==================== WebSocket Messages ====================

class WSMessage(BaseModel):
    type: str
    data: dict


class DiceRollMessage(BaseModel):
    team_id: int
    dice_value: int


class QuestionServedMessage(BaseModel):
    question_id: int
    question: QuestionResponse
    team_id: int


class LeaderboardUpdate(BaseModel):
    teams: List[TeamResponse]
