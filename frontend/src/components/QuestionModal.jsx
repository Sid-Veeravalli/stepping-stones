import { useState, useEffect } from 'react';
import './QuestionModal.css';

function QuestionModal({ question, onSave, onClose }) {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('MCQ');
  const [difficulty, setDifficulty] = useState('Easy');
  const [timeLimit, setTimeLimit] = useState(30);
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [modelAnswer, setModelAnswer] = useState('');

  useEffect(() => {
    if (question) {
      setQuestionText(question.question_text || '');
      setQuestionType(question.question_type || 'MCQ');
      setDifficulty(question.difficulty || 'Easy');
      setTimeLimit(question.time_limit || 30);
      setOptionA(question.option_a || '');
      setOptionB(question.option_b || '');
      setOptionC(question.option_c || '');
      setOptionD(question.option_d || '');
      setCorrectAnswer(question.correct_answer || 'A');
      setModelAnswer(question.model_answer || '');
    }
  }, [question]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!questionText.trim() || questionText.length < 5) {
      alert('Question text must be at least 5 characters');
      return;
    }

    if (timeLimit <= 0) {
      alert('Time limit must be greater than 0');
      return;
    }

    // MCQ specific validation
    if (questionType === 'MCQ') {
      if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
        alert('All 4 options are required for MCQ questions');
        return;
      }
      if (!correctAnswer || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        alert('Please select a correct answer (A, B, C, or D)');
        return;
      }
    }

    const questionData = {
      question_text: questionText,
      question_type: questionType,
      difficulty: difficulty,
      time_limit: timeLimit,
      option_a: questionType === 'MCQ' ? optionA : null,
      option_b: questionType === 'MCQ' ? optionB : null,
      option_c: questionType === 'MCQ' ? optionC : null,
      option_d: questionType === 'MCQ' ? optionD : null,
      correct_answer: questionType === 'MCQ' ? correctAnswer : null,
      model_answer: questionType !== 'MCQ' ? modelAnswer : null,
    };

    onSave(questionData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{question ? 'Edit Question' : 'Add New Question'}</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="question-form">
          <div className="form-group">
            <label>Question Text *</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your question..."
              rows={3}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Question Type *</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                required
              >
                <option value="MCQ">MCQ</option>
                <option value="Fill in the Blanks">Fill in the Blanks</option>
                <option value="What Would You Do?">What Would You Do?</option>
              </select>
            </div>

            <div className="form-group">
              <label>Difficulty *</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                required
              >
                <option value="Easy">Easy (2 pts)</option>
                <option value="Medium">Medium (2 pts)</option>
                <option value="Hard">Hard (3 pts)</option>
                <option value="Insane">Insane (3 pts)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Time Limit (seconds) *</label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                min={5}
                max={300}
                required
              />
            </div>
          </div>

          {questionType === 'MCQ' && (
            <div className="mcq-section">
              <h3>Answer Options</h3>

              <div className="form-group">
                <label>Option A *</label>
                <input
                  type="text"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  placeholder="Enter option A"
                  required
                />
              </div>

              <div className="form-group">
                <label>Option B *</label>
                <input
                  type="text"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  placeholder="Enter option B"
                  required
                />
              </div>

              <div className="form-group">
                <label>Option C *</label>
                <input
                  type="text"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                  placeholder="Enter option C"
                  required
                />
              </div>

              <div className="form-group">
                <label>Option D *</label>
                <input
                  type="text"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                  placeholder="Enter option D"
                  required
                />
              </div>

              <div className="form-group">
                <label>Correct Answer *</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="A"
                      checked={correctAnswer === 'A'}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                    />
                    A
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="B"
                      checked={correctAnswer === 'B'}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                    />
                    B
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="C"
                      checked={correctAnswer === 'C'}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                    />
                    C
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="D"
                      checked={correctAnswer === 'D'}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                    />
                    D
                  </label>
                </div>
              </div>
            </div>
          )}

          {questionType !== 'MCQ' && (
            <div className="form-group">
              <label>Model Answer (Optional)</label>
              <textarea
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
                placeholder="Enter a model answer for reference..."
                rows={3}
              />
              <small>This will help you grade answers during the game</small>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {question ? 'Update Question' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuestionModal;
