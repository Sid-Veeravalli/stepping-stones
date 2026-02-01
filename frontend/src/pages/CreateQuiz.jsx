import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quizAPI, questionAPI } from '../utils/api';
import toast from 'react-hot-toast';
import QuestionModal from '../components/QuestionModal';
import './CreateQuiz.css';

function CreateQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isEditMode = Boolean(quizId);

  // Quiz configuration state
  const [quizName, setQuizName] = useState('');
  const [numTeams, setNumTeams] = useState(3);
  const [numRounds, setNumRounds] = useState(4);
  const [easyCount, setEasyCount] = useState(4);
  const [mediumCount, setMediumCount] = useState(4);
  const [hardCount, setHardCount] = useState(4);
  const [insaneCount, setInsaneCount] = useState(4);

  // Questions state
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [importingFile, setImportingFile] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizAPI.getById(quizId);
      const quiz = response.data;

      setQuizName(quiz.name);
      setNumTeams(quiz.num_teams);
      setNumRounds(quiz.num_rounds);
      setEasyCount(quiz.easy_questions_count);
      setMediumCount(quiz.medium_questions_count);
      setHardCount(quiz.hard_questions_count);
      setInsaneCount(quiz.insane_questions_count);
      setQuestions(quiz.questions || []);
    } catch (error) {
      toast.error('Failed to load quiz');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    // Basic validation only
    if (!quizName.trim()) {
      toast.error('Quiz name is required');
      return;
    }

    if (quizName.length < 3 || quizName.length > 100) {
      toast.error('Quiz name must be between 3 and 100 characters');
      return;
    }

    const totalRequired = numTeams * numRounds;
    const totalQuestions = easyCount + mediumCount + hardCount + insaneCount;

    if (totalQuestions < totalRequired) {
      toast.error(`You need at least ${totalRequired} questions (teams × rounds = ${numTeams} × ${numRounds})`);
      return;
    }

    try {
      const quizData = {
        name: quizName,
        num_teams: numTeams,
        num_rounds: numRounds,
        easy_questions_count: easyCount,
        medium_questions_count: mediumCount,
        hard_questions_count: hardCount,
        insane_questions_count: insaneCount,
      };

      if (isEditMode) {
        await quizAPI.update(quizId, quizData);
        toast.success('Configuration updated!');
      } else {
        const response = await quizAPI.create(quizData);
        const newQuizId = response.data.id;
        toast.success('Quiz configuration saved! Now add questions.');
        // Navigate to edit mode
        navigate(`/quiz/${newQuizId}/edit`);
      }
    } catch (error) {
      const message = error.response?.data?.detail || `Failed to save configuration`;
      toast.error(message);
    }
  };

  const handleCompleteQuiz = async () => {
    // Full validation including questions
    if (!quizName.trim()) {
      toast.error('Quiz name is required');
      return;
    }

    // Validate that we have the required number of questions for each difficulty
    const questionsByDifficulty = {
      Easy: questions.filter(q => q.difficulty === 'Easy').length,
      Medium: questions.filter(q => q.difficulty === 'Medium').length,
      Hard: questions.filter(q => q.difficulty === 'Hard').length,
      Insane: questions.filter(q => q.difficulty === 'Insane').length,
    };

    if (questionsByDifficulty.Easy < easyCount) {
      toast.error(`Need ${easyCount} easy questions, but only have ${questionsByDifficulty.Easy}`);
      return;
    }
    if (questionsByDifficulty.Medium < mediumCount) {
      toast.error(`Need ${mediumCount} medium questions, but only have ${questionsByDifficulty.Medium}`);
      return;
    }
    if (questionsByDifficulty.Hard < hardCount) {
      toast.error(`Need ${hardCount} hard questions, but only have ${questionsByDifficulty.Hard}`);
      return;
    }
    if (questionsByDifficulty.Insane < insaneCount) {
      toast.error(`Need ${insaneCount} insane questions, but only have ${questionsByDifficulty.Insane}`);
      return;
    }

    toast.success('Quiz is complete and ready to launch!');
    navigate('/dashboard');
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (questionData) => {
    if (!quizId) {
      toast.error('Please save the quiz first before adding questions');
      return;
    }

    try {
      if (editingQuestion) {
        // Update existing question
        await questionAPI.update(quizId, editingQuestion.id, questionData);
        setQuestions(questions.map(q =>
          q.id === editingQuestion.id ? { ...q, ...questionData } : q
        ));
        toast.success('Question updated successfully');
      } else {
        // Create new question
        const response = await questionAPI.create(quizId, questionData);
        setQuestions([...questions, response.data]);
        toast.success('Question added successfully');
      }
      setShowQuestionModal(false);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to save question';
      toast.error(message);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question?')) return;

    try {
      await questionAPI.delete(quizId, questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      toast.success('Question deleted');
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!quizId) {
      toast.error('Please save the quiz first before importing questions');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setImportingFile(true);
      const response = await questionAPI.importExcel(quizId, formData);
      toast.success(`Imported ${response.data.imported_count} questions`);
      loadQuiz(); // Reload to get the imported questions
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to import questions';
      toast.error(message);
    } finally {
      setImportingFile(false);
      event.target.value = '';
    }
  };

  const questionsByDifficulty = {
    Easy: questions.filter(q => q.difficulty === 'Easy').length,
    Medium: questions.filter(q => q.difficulty === 'Medium').length,
    Hard: questions.filter(q => q.difficulty === 'Hard').length,
    Insane: questions.filter(q => q.difficulty === 'Insane').length,
  };

  if (loading) {
    return <div className="loading">Loading quiz...</div>;
  }

  return (
    <div className="create-quiz-container forest-bg">
      <div className="create-quiz-header">
        <h1>{isEditMode ? 'Edit Quiz' : 'Create New Quiz'}</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="create-quiz-content">
        {/* Quiz Configuration Section */}
        <div className="quiz-config-section card">
          <h2>Quiz Configuration</h2>

          {!isEditMode && (
            <div className="workflow-info">
              <p><strong>Step 1:</strong> Configure your quiz settings below</p>
              <p><strong>Step 2:</strong> Click "Save Quiz Configuration"</p>
              <p><strong>Step 3:</strong> Add questions (manually or import Excel)</p>
              <p><strong>Step 4:</strong> Click "Complete and Finish" when done</p>
            </div>
          )}

          <div className="form-group">
            <label>Quiz Name *</label>
            <input
              type="text"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              placeholder="Enter quiz name"
              maxLength={100}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Number of Teams (3-5) *</label>
              <input
                type="number"
                value={numTeams}
                onChange={(e) => setNumTeams(parseInt(e.target.value))}
                min={3}
                max={5}
              />
            </div>

            <div className="form-group">
              <label>Number of Rounds (4-10) *</label>
              <input
                type="number"
                value={numRounds}
                onChange={(e) => setNumRounds(parseInt(e.target.value))}
                min={4}
                max={10}
              />
            </div>
          </div>

          <div className="difficulty-distribution">
            <h3>Question Distribution</h3>
            <p className="helper-text">
              Total required: {numTeams * numRounds} questions minimum (teams × rounds)
            </p>
            <p className="helper-text">
              Set how many questions you want per difficulty. Progress bars below show how many you've added.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>Easy Questions (2 pts)</label>
                <input
                  type="number"
                  value={easyCount}
                  onChange={(e) => setEasyCount(parseInt(e.target.value))}
                  min={1}
                />
                <div className="progress-indicator">
                  <span>Added: {questionsByDifficulty.Easy} / Target: {easyCount}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill easy"
                      style={{ width: `${Math.min(100, (questionsByDifficulty.Easy / easyCount) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Medium Questions (2 pts)</label>
                <input
                  type="number"
                  value={mediumCount}
                  onChange={(e) => setMediumCount(parseInt(e.target.value))}
                  min={1}
                />
                <div className="progress-indicator">
                  <span>Added: {questionsByDifficulty.Medium} / Target: {mediumCount}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill medium"
                      style={{ width: `${Math.min(100, (questionsByDifficulty.Medium / mediumCount) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Hard Questions (3 pts)</label>
                <input
                  type="number"
                  value={hardCount}
                  onChange={(e) => setHardCount(parseInt(e.target.value))}
                  min={1}
                />
                <div className="progress-indicator">
                  <span>Added: {questionsByDifficulty.Hard} / Target: {hardCount}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill hard"
                      style={{ width: `${Math.min(100, (questionsByDifficulty.Hard / hardCount) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Insane Questions (3 pts)</label>
                <input
                  type="number"
                  value={insaneCount}
                  onChange={(e) => setInsaneCount(parseInt(e.target.value))}
                  min={1}
                />
                <div className="progress-indicator">
                  <span>Added: {questionsByDifficulty.Insane} / Target: {insaneCount}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill insane"
                      style={{ width: `${Math.min(100, (questionsByDifficulty.Insane / insaneCount) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isEditMode && (
            <div className="save-quiz-notice">
              <p>💡 Save the quiz configuration first before adding questions</p>
              <button className="btn btn-primary" onClick={handleSaveConfiguration}>
                Save Quiz Configuration
              </button>
            </div>
          )}

          {isEditMode && (
            <div className="config-update-section">
              <button className="btn btn-secondary" onClick={handleSaveConfiguration}>
                Update Configuration
              </button>
            </div>
          )}
        </div>

        {/* Questions Section */}
        {isEditMode && (
          <div className="questions-section card">
            <div className="questions-header">
              <h2>Questions ({questions.length})</h2>
              <div className="questions-actions">
                <label className="btn btn-secondary">
                  {importingFile ? 'Importing...' : 'Import from Excel'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileImport}
                    disabled={importingFile}
                    style={{ display: 'none' }}
                  />
                </label>
                <button className="btn btn-primary" onClick={handleAddQuestion}>
                  + Add Question
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="empty-questions">
                <p>No questions yet. Add questions manually or import from Excel.</p>
              </div>
            ) : (
              <div className="questions-list">
                {questions.map((question, index) => (
                  <div key={question.id} className={`question-item ${question.difficulty.toLowerCase()}`}>
                    <div className="question-number">#{index + 1}</div>
                    <div className="question-content">
                      <div className="question-meta">
                        <span className={`badge ${question.difficulty.toLowerCase()}`}>
                          {question.difficulty}
                        </span>
                        <span className="badge">{question.question_type}</span>
                        <span className="time-badge">{question.time_limit}s</span>
                      </div>
                      <p className="question-text">{question.question_text}</p>

                      {question.question_type === 'MCQ' && (
                        <div className="mcq-options">
                          <div className={question.correct_answer === 'A' ? 'option correct' : 'option'}>
                            A. {question.option_a}
                          </div>
                          <div className={question.correct_answer === 'B' ? 'option correct' : 'option'}>
                            B. {question.option_b}
                          </div>
                          <div className={question.correct_answer === 'C' ? 'option correct' : 'option'}>
                            C. {question.option_c}
                          </div>
                          <div className={question.correct_answer === 'D' ? 'option correct' : 'option'}>
                            D. {question.option_d}
                          </div>
                        </div>
                      )}

                      {question.model_answer && (
                        <div className="model-answer">
                          <strong>Model Answer:</strong> {question.model_answer}
                        </div>
                      )}
                    </div>
                    <div className="question-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEditQuestion(question)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {isEditMode && (
          <div className="form-actions">
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
            <button
              className="btn btn-success btn-lg"
              onClick={handleCompleteQuiz}
            >
              ✓ Complete and Finish
            </button>
          </div>
        )}
      </div>

      {/* Question Modal */}
      {showQuestionModal && (
        <QuestionModal
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => setShowQuestionModal(false)}
        />
      )}
    </div>
  );
}

export default CreateQuiz;
