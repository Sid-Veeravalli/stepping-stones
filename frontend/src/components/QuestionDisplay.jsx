import { useState, useEffect } from 'react';
import './QuestionDisplay.css';

function QuestionDisplay({ question, onSubmit, disabled, teamId }) {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Reset when question changes
    setSelectedAnswer('');
    setTextAnswer('');
    setSubmitted(false);
  }, [question?.id]);

  const handleSubmit = () => {
    if (disabled) return;

    const answer = question.question_type === 'MCQ' ? selectedAnswer : textAnswer;

    if (!answer.trim()) {
      alert('Please provide an answer');
      return;
    }

    onSubmit(answer);
    setSubmitted(true);
  };

  if (!question) {
    return <div className="question-display">No question available</div>;
  }

  const getDifficultyClass = () => {
    return question.difficulty.toLowerCase();
  };

  return (
    <div className={`question-display ${getDifficultyClass()}`}>
      <div className="question-header">
        <div className="question-meta">
          <span className={`badge ${getDifficultyClass()}`}>
            {question.difficulty}
          </span>
          <span className="badge">{question.question_type}</span>
          <span className="points-badge">
            {question.difficulty === 'Easy' || question.difficulty === 'Medium' ? '2' : '3'} pts
          </span>
        </div>
      </div>

      <div className="question-body">
        <h2 className="question-text">{question.question_text}</h2>

        {question.question_type === 'MCQ' && (
          <div className="mcq-options">
            {['A', 'B', 'C', 'D'].map((option) => {
              const optionText = question[`option_${option.toLowerCase()}`];
              // Skip options that are null or empty
              if (!optionText || optionText.trim() === '') return null;

              return (
                <button
                  key={option}
                  className={`mcq-option ${selectedAnswer === option ? 'selected' : ''}`}
                  onClick={() => !disabled && !submitted && setSelectedAnswer(option)}
                  disabled={disabled || submitted}
                >
                  <span className="option-letter">{option}</span>
                  <span className="option-text">
                    {optionText}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {question.question_type !== 'MCQ' && (
          <div className="text-answer-section">
            <textarea
              className="answer-input"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              disabled={disabled || submitted}
            />
          </div>
        )}

        {!disabled && (
          <div className="submit-section">
            {submitted ? (
              <div className="submitted-notice">
                <span>✓</span> Answer submitted! Waiting for grading...
              </div>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={
                  (question.question_type === 'MCQ' && !selectedAnswer) ||
                  (question.question_type !== 'MCQ' && !textAnswer.trim())
                }
              >
                Submit Answer
              </button>
            )}
          </div>
        )}

        {disabled && (
          <div className="facilitator-view-notice">
            <p>Facilitator View - Players are answering this question</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionDisplay;
