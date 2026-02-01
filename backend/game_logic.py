"""
Game logic - Dice rolling, question allocation, scoring
"""
import random
from typing import List, Dict, Tuple
from models import Question, Team, DifficultyLevel


# Points mapping for difficulty levels
DIFFICULTY_POINTS = {
    DifficultyLevel.EASY: 2,
    DifficultyLevel.MEDIUM: 2,
    DifficultyLevel.HARD: 3,
    DifficultyLevel.INSANE: 3
}


class GameEngine:
    """
    Manages game state and logic for an active game session
    """

    def __init__(self, quiz_id: int, num_teams: int, num_rounds: int, questions: List[Question]):
        self.quiz_id = quiz_id
        self.num_teams = num_teams
        self.num_rounds = num_rounds
        self.questions = questions

        # Group questions by difficulty
        self.questions_by_difficulty = {
            DifficultyLevel.EASY: [],
            DifficultyLevel.MEDIUM: [],
            DifficultyLevel.HARD: [],
            DifficultyLevel.INSANE: []
        }

        for q in questions:
            self.questions_by_difficulty[q.difficulty].append(q)

        # Shuffle questions within each difficulty level
        for difficulty in self.questions_by_difficulty:
            random.shuffle(self.questions_by_difficulty[difficulty])

        # Pre-allocate questions to ensure equal distribution
        self.question_allocation = self._allocate_questions()
        self.current_allocation_index = 0

    def _allocate_questions(self) -> List[Tuple[int, Question]]:
        """
        Pre-allocate questions to teams ensuring equal distribution across difficulty levels
        Each team should get equal number of questions from each difficulty level

        Returns:
            List of tuples: (team_index, question)
        """
        total_questions_needed = self.num_teams * self.num_rounds
        allocation = []

        # Calculate how many questions each team needs from each difficulty
        # This is based on the quiz configuration
        total_easy = len(self.questions_by_difficulty[DifficultyLevel.EASY])
        total_medium = len(self.questions_by_difficulty[DifficultyLevel.MEDIUM])
        total_hard = len(self.questions_by_difficulty[DifficultyLevel.HARD])
        total_insane = len(self.questions_by_difficulty[DifficultyLevel.INSANE])

        # Create pools for each difficulty
        easy_pool = self.questions_by_difficulty[DifficultyLevel.EASY].copy()
        medium_pool = self.questions_by_difficulty[DifficultyLevel.MEDIUM].copy()
        hard_pool = self.questions_by_difficulty[DifficultyLevel.HARD].copy()
        insane_pool = self.questions_by_difficulty[DifficultyLevel.INSANE].copy()

        # Track questions assigned to each team
        team_assignments = {i: {
            DifficultyLevel.EASY: 0,
            DifficultyLevel.MEDIUM: 0,
            DifficultyLevel.HARD: 0,
            DifficultyLevel.INSANE: 0
        } for i in range(self.num_teams)}

        # Calculate target distribution per team
        questions_per_team = self.num_rounds

        # Round-robin allocation with difficulty balancing
        for round_num in range(self.num_rounds):
            for team_idx in range(self.num_teams):
                # Determine which difficulty level this team needs most
                assigned = team_assignments[team_idx]

                # Choose difficulty based on what's needed and available
                available_difficulties = []
                if easy_pool:
                    available_difficulties.append(DifficultyLevel.EASY)
                if medium_pool:
                    available_difficulties.append(DifficultyLevel.MEDIUM)
                if hard_pool:
                    available_difficulties.append(DifficultyLevel.HARD)
                if insane_pool:
                    available_difficulties.append(DifficultyLevel.INSANE)

                if not available_difficulties:
                    break

                # Pick difficulty that team has least of
                difficulty = min(available_difficulties,
                               key=lambda d: assigned[d])

                # Assign question
                if difficulty == DifficultyLevel.EASY and easy_pool:
                    question = easy_pool.pop(0)
                elif difficulty == DifficultyLevel.MEDIUM and medium_pool:
                    question = medium_pool.pop(0)
                elif difficulty == DifficultyLevel.HARD and hard_pool:
                    question = hard_pool.pop(0)
                elif difficulty == DifficultyLevel.INSANE and insane_pool:
                    question = insane_pool.pop(0)
                else:
                    continue

                allocation.append((team_idx, question))
                team_assignments[team_idx][difficulty] += 1

        return allocation

    def roll_dice(self) -> int:
        """
        Simulate dice roll (1-6)
        Note: The actual question is pre-allocated, dice is just for show
        """
        return random.randint(1, 6)

    def get_next_question(self, team_index: int) -> Question:
        """
        Get the next pre-allocated question for the current team

        Args:
            team_index: Index of the team (0-based)

        Returns:
            Question object
        """
        if self.current_allocation_index >= len(self.question_allocation):
            raise ValueError("No more questions available")

        allocated_team_idx, question = self.question_allocation[self.current_allocation_index]

        # Verify this is for the correct team
        if allocated_team_idx != team_index:
            # Find the next question for this team
            for i in range(self.current_allocation_index, len(self.question_allocation)):
                if self.question_allocation[i][0] == team_index:
                    self.current_allocation_index = i
                    return self.question_allocation[i][1]
            raise ValueError(f"No question allocated for team {team_index}")

        self.current_allocation_index += 1
        return question

    def get_question_points(self, difficulty: DifficultyLevel) -> int:
        """
        Get default points for a question based on difficulty
        """
        return DIFFICULTY_POINTS.get(difficulty, 2)

    def calculate_score(self, difficulty: DifficultyLevel, bonus_points: int = 0) -> int:
        """
        Calculate total score including bonus
        """
        base_points = self.get_question_points(difficulty)
        return base_points + bonus_points

    def is_game_complete(self, current_round: int) -> bool:
        """
        Check if game is complete
        """
        return current_round >= self.num_rounds

    def get_leaderboard(self, teams: List[Team]) -> List[Dict]:
        """
        Generate leaderboard sorted by position (tiles moved)
        """
        leaderboard = []
        for team in teams:
            leaderboard.append({
                "id": team.id,
                "name": team.team_name,
                "position": team.position,
                "score": team.score,
                "join_order": team.join_order
            })

        # Sort by position (descending), then by score, then by join order
        leaderboard.sort(key=lambda x: (-x["position"], -x["score"], x["join_order"]))

        return leaderboard


def check_mcq_answer(question: Question, submitted_answer: str) -> bool:
    """
    Check if MCQ answer is correct

    Args:
        question: Question object
        submitted_answer: User's answer ('A', 'B', 'C', or 'D')

    Returns:
        True if correct, False otherwise
    """
    if not question.correct_answer:
        return False

    return submitted_answer.strip().upper() == question.correct_answer.strip().upper()


def validate_quiz_completion(
    quiz_easy_count: int,
    quiz_medium_count: int,
    quiz_hard_count: int,
    quiz_insane_count: int,
    actual_easy: int,
    actual_medium: int,
    actual_hard: int,
    actual_insane: int,
    num_teams: int,
    num_rounds: int
) -> Tuple[bool, str]:
    """
    Validate that quiz has enough questions to be completed

    Returns:
        (is_valid, error_message)
    """
    total_needed = num_teams * num_rounds
    total_configured = quiz_easy_count + quiz_medium_count + quiz_hard_count + quiz_insane_count
    total_actual = actual_easy + actual_medium + actual_hard + actual_insane

    errors = []

    # Check total count
    if total_actual < total_needed:
        errors.append(f"Total questions: {total_actual}/{total_needed} (need {total_needed - total_actual} more)")

    # Check minimum per difficulty
    if actual_easy < quiz_easy_count:
        errors.append(f"Easy questions: {actual_easy}/{quiz_easy_count} (need {quiz_easy_count - actual_easy} more)")

    if actual_medium < quiz_medium_count:
        errors.append(f"Medium questions: {actual_medium}/{quiz_medium_count} (need {quiz_medium_count - actual_medium} more)")

    if actual_hard < quiz_hard_count:
        errors.append(f"Hard questions: {actual_hard}/{quiz_hard_count} (need {quiz_hard_count - actual_hard} more)")

    if actual_insane < quiz_insane_count:
        errors.append(f"Insane questions: {actual_insane}/{quiz_insane_count} (need {quiz_insane_count - actual_insane} more)")

    if errors:
        return False, "Quiz validation failed:\n" + "\n".join(errors)

    return True, "Quiz is valid"
