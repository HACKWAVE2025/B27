import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import JSConfetti from 'js-confetti';
import { useNavigate } from 'react-router-dom';

// Corrected the CSS import path based on your file structure
import '../styles/game.css'; 

// --- Import all assets for the Emotion Game ---
import videoFile from '../assets/video.mp4';
import dogImage from '../assets/dog.png';
import catImage from '../assets/cat.png';
import tigerImage from '../assets/tiger.png';
import zebraImage from '../assets/zebra.png';
import monkeyImage from '../assets/monkey.png';
import horseImage from '../assets/horse.png';
import gameBackImage from '../assets/Gameback.jpg';
import tigerLaughVideo from '../assets/tigerlaugh.mp4';
import happyDogGIF from '../assets/Happy_Dog_GIF.gif';

// --- Import the Emotion Detection Hook ---
// Assuming it's in a sub-folder as per your original code
import useEmotionDetection from './EmotionDetection/useEmotionDetection';


// -----------------------------------------------------------------
// --- GAME 1: Your Original Emotion Game (Refactored)
// -----------------------------------------------------------------
const EmotionGame = ({ onBack }) => {
  // --- All of your original Game.jsx state ---
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [letters, setLetters] = useState([]);
  const [dropZones, setDropZones] = useState([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [questionEmotions, setQuestionEmotions] = useState([]);
  const [recentReport, setRecentReport] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const emotionDisplayRef = useRef(null);
  const confettiRef = useRef(null);
  const navigate = useNavigate();

  // --- All of your original Game.jsx logic (useEffect, handlers) ---
  const emotionColors = {
    happy: 'rgba(167, 139, 250, 0.3)', 
    sad: 'rgba(253, 186, 116, 0.3)', 
    angry: 'rgba(110, 231, 183, 0.3)', 
    surprise: 'rgba(244, 114, 182, 0.3)',
    fear: 'rgba(252, 231, 122, 0.3)', 
    disgust: 'rgba(245, 194, 143, 0.3)', 
    neutral: 'rgba(255, 129, 2, 0.3)', 
  };

  useEffect(() => {
    confettiRef.current = new JSConfetti();
  }, []);

  useEffect(() => {
    if (gameStarted && !gameCompleted) {
      setIsGameRunning(true);
    }
    if (gameCompleted) {
      setIsGameRunning(false); 
      confettiRef.current.addConfetti({
        confettiColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'],
        confettiRadius: 6, 
        confettiNumber: 300, 
        spread: 80, 
        origin: { y: 0.5 }, 
      });
      const cleanupTimer = setTimeout(() => {
        setReadyToNavigate(true);
      }, 1000); 

      return () => clearTimeout(cleanupTimer);
    }
  }, [gameStarted, gameCompleted]);

  useEffect(() => {
    if (readyToNavigate) {
      const navigationTimer = setTimeout(() => {
        localStorage.removeItem('child_token');
        localStorage.removeItem('userId');
        navigate('/');
      }, 4000); 

      return () => clearTimeout(navigationTimer);
    }
  }, [readyToNavigate, navigate]);

  useEffect(() => {
    if (gameCompleted) {
      const fetchRecentReport = async () => {
        try {
          const userId = localStorage.getItem('userId');
          const token = localStorage.getItem('child_token');
          if (!userId || !token) {
            throw new Error('User not logged in');
          }

          const response = await axios.get(`http://localhost:3000/child/game-reports/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit: 1 },
          });

          setRecentReport(response.data[0]);
        } catch (err) {
          setReportError('Failed to load recent game report');
          console.error('Error fetching report:', err);
        }
      };

      fetchRecentReport();
    }
  }, [gameCompleted]);

  const handleEmotionsCollected = (emotions) => {
    setQuestionEmotions(emotions);
    const emotionCounts = emotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});
    const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
      emotionCounts[a] > emotionCounts[b] ? a : b
    );
    setCurrentEmotion(dominantEmotion.toLowerCase());

    const userId = localStorage.getItem('userId');
    if (!userId || !currentWord) return;

    axios
      .post(
        'http://localhost:3000/child/save-emotion',
        {
          userId,
          emotion: dominantEmotion.toLowerCase(),
          question: currentWord.correct,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('child_token')}` },
        }
      )
      .then((res) => console.log('Emotion saved:', res.data))
      .catch((error) => console.error('Error saving emotion:', error));
  };

  useEmotionDetection(videoRef, canvasRef, emotionDisplayRef, isGameRunning, handleEmotionsCollected);

  const words = [
    { correct: 'dog', jumbled: 'gdo', image: dogImage },
    { correct: 'cat', jumbled: 'tac', image: catImage },
    { correct: 'tiger', jumbled: 'ietgr', image: tigerImage },
    { correct: 'horse', jumbled: 'soehr', image: horseImage },
  ];

  useEffect(() => {
    setShuffledWords([...words].sort(() => Math.random() - 0.5));
  }, []);

  useEffect(() => {
    if (shuffledWords.length > 0) {
      const word = shuffledWords[wordIndex];
      setCurrentWord(word);
      setLetters(word.jumbled.split(''));
      setDropZones(Array(word.correct.length).fill(null));
      setQuestionEmotions([]);
    }
  }, [wordIndex, shuffledWords]);

  const handleDragStart = (e, letter) => {
    e.dataTransfer.setData('text/plain', letter);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const letter = e.dataTransfer.getData('text/plain');
    const newDropZones = [...dropZones];
    newDropZones[index] = letter;
    setDropZones(newDropZones);

    if (newDropZones.every((zone) => zone !== null)) {
      const arrangedWord = newDropZones.join('');
      const isCorrect = arrangedWord === currentWord.correct;
      const newScore = isCorrect ? score + 1 : score;

      axios
        .post(
          'http://localhost:3000/child/save-game',
          {
            userId: localStorage.getItem('userId'),
            score: newScore,
            emotions: questionEmotions,
            question: currentWord.correct,
            isCorrect,
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('child_token')}` },
          }
        )
        .then((res) => console.log('Game progress saved:', res.data))
        .catch((error) => console.error('Error saving game progress:', error));

      if (isCorrect) {
        setFeedback('Correct!');
        setScore(newScore);
        if (newScore >= words.length) {
          setGameCompleted(true);
        } else {
          setTimeout(() => {
            setWordIndex((prev) => prev + 1);
            setFeedback(null);
            setDropZones(Array(currentWord.correct.length).fill(null));
          }, 1000);
        }
      } else {
        setFeedback('Try Again!');
        setTimeout(() => {
          setDropZones(Array(currentWord.correct.length).fill(null));
          setFeedback(null);
        }, 1000);
      }
    }
  };

  const shouldShowTigerVideo =
    currentWord &&
    currentWord.correct === 'tiger' &&
    currentEmotion &&
    ['happy', 'angry', 'sad'].includes(currentEmotion.toLowerCase());

  const shouldShowDogGIF =
    currentWord &&
    currentWord.correct === 'dog' &&
    currentEmotion &&
    ['sad', 'neutral'].includes(currentEmotion.toLowerCase());

  // --- This is your original JSX return ---
  return (
    <div
      className="game-container emotion-game-styles" /* Added a class for namespacing */
      style={
        gameStarted
          ? {
              backgroundImage: `url(${gameBackImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : {}
      }
    >
      {!gameStarted && (
        <video autoPlay loop muted playsInline className="background-video">
          <source src={videoFile} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {currentEmotion && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: emotionColors[currentEmotion.toLowerCase()],
            zIndex: 0,
            transition: 'background-color 0.5s ease',
          }}
        />
      )}

      <video
        ref={videoRef}
        style={{ display: isGameRunning ? 'none' : 'none' }} 
        autoPlay
        playsInline
        muted
        width="640"
        height="480"
      />

      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, display: isGameRunning ? 'block' : 'none' }}
        width="640"
        height="480"
      />

      <div
        ref={emotionDisplayRef}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: 'black',
          zIndex: 2,
          display: isGameRunning || gameCompleted ? 'block' : 'none', 
        }}
      >
        Emotion: N/A 
      </div>

      <div className="content">
        {!gameStarted ? (
          <>
            {/* --- NEW: Added Back Button --- */}
            
            <h1 style={{left:"240px"}}>Welcome to the Game</h1>
            <button onClick={() => setGameStarted(true)} className="start-button">
              Start Game
            </button>
            <button className="game-back-btn" onClick={onBack}>
              &larr; Back to Games
            </button>
          </>
        ) : !gameCompleted ? (
          <div className="game-content">
            <h1>What is this animal?</h1>
            <div className="animal-container">
              {currentWord && (
                shouldShowTigerVideo ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="animal-video"
                    src={tigerLaughVideo}
                    type="video/mp4"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : shouldShowDogGIF ? (
                  <img src={happyDogGIF} alt="Happy Dog" className="animal-image" />
                ) : (
                  <img src={currentWord.image} alt="Animal" className="animal-image" />
                )
              )}
            </div>

            <div className="letters-container">
              {letters.map((letter, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, letter)}
                  className="draggable-letter"
                >
                  {letter}
                </div>
              ))}
            </div>

            <div className="dropzones-container">
              {dropZones.map((zone, index) => (
                <div
                  key={index}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`dropzone ${zone ? 'filled' : ''}`}
                >
                  {zone || '_'}
                </div>
              ))}
            </div>

            {feedback && (
              <p className={`feedback ${feedback === 'Correct!' ? 'correct' : 'wrong'}`}>
                {feedback}
              </p>
            )}
            <p className="score">Score: {score}</p>
          </div>
        ) : (
          <div className="game-content">
            <h1>Congratulations! You Won!</h1>
            <p className="score">Final Score: {score}</p>
            {reportError ? (
              <p className="report-error">{reportError}</p>
            ) : recentReport ? (
              <div className="report-details">
                <h2>Latest Game Report</h2>
                <p><strong>Animal:</strong> {recentReport.question}</p>
                <p><strong>Score:</strong> {recentReport.score}</p>
                <p><strong>Emotion:</strong> {recentReport.emotions[0] || 'Unknown'}</p>
                <p><strong>Correct:</strong> {recentReport.isCorrect ? 'Yes' : 'No'}</p>
                <p><strong>Completed At:</strong> {new Date(recentReport.completedAt).toLocaleString()}</p>
              </div>
            ) : (
              <p>Loading recent game report...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


// -----------------------------------------------------------------
// --- GAME 2: The New Memory Game (Refactored)
// -----------------------------------------------------------------
const MemoryGame = ({ onBack }) => {
  const symbols = [
    { id: 1, char: '🔴', color: '#FF5252' },
    { id: 2, char: '🔵', color: '#4285F4' },
    { id: 3, char: '🟡', color: '#FFD600' },
    { id: 4, char: '🟢', color: '#0F9D58' },
    { id: 5, char: '⭐', color: '#FFC107' },
    { id: 6, char: '🟣', color: '#9C27B0' },
  ];

  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [score, setScore] = useState(0);
  const confettiRef = useRef(null); // Added confetti

  useEffect(() => {
    confettiRef.current = new JSConfetti();
    initializeGame();
  }, []);

  useEffect(() => {
    if (gameWon) {
      confettiRef.current.addConfetti({
        confettiColors: ['#FFC107', '#4285F4', '#FF5252', '#0F9D58'],
        confettiRadius: 6,
        confettiNumber: 300,
      });
    }
  }, [gameWon]);

  const initializeGame = () => {
    const cardPairs = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((card, index) => ({ ...card, uniqueId: index }));

    setCards(cardPairs);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameWon(false);
    setStartTime(Date.now());
    setEndTime(null);
    setScore(0);
  };

  const handleCardClick = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) {
      return;
    }

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(moves + 1);

      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(card => card.uniqueId === firstId);
      const secondCard = cards.find(card => card.uniqueId === secondId);

      if (firstCard.id === secondCard.id) {
        setMatched([...matched, firstId, secondId]);
        setFlipped([]);

        if (matched.length + 2 === cards.length) {
          const finishedTime = Date.now();
          setEndTime(finishedTime);
          const timeTaken = (finishedTime - startTime) / 1000;
          const timeBonus = Math.max(0, 30 - Math.floor(timeTaken));
          const finalScore = Math.max(0, 100 - moves * 2 + timeBonus); // Ensure score isn't negative
          setScore(finalScore);
          setGameWon(true);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    // Used a specific class for memory game styles
    <div className="game-container memory-game"> 
      <h1 className="game-title">Memory Match Game</h1>
      <div className="memory-info">Moves: {moves}</div>

      {gameWon && (
        <div className="memory-win-message">
          🎉 Congratulations! 🎉
          <br />
          You won the game!
          <br />
          Final Score: {Math.round(score)}
        </div>
      )}

      <div className="memory-game-board">
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.uniqueId);
          const isMatched = matched.includes(card.uniqueId);

          const cardClasses = [
            'memory-card',
            (isFlipped || isMatched) ? 'flipped' : '',
            isMatched ? 'matched' : '',
          ].join(' ');

          return (
            <div
              key={card.uniqueId}
              className={cardClasses}
              style={{
                // Set the color of the symbol
                color: (isFlipped || isMatched) ? card.color : '#4b6a88',
              }}
              onClick={() => handleCardClick(card.uniqueId)}
            >
              {(isFlipped || isMatched) ? card.char : '?'}
            </div>
          );
        })}
      </div>

      <div className="memory-controls">
        <button className="memory-game-btn" onClick={initializeGame}>
          Restart Game
        </button>
        {/* Added the Back button */}
        <button className="memory-game-btn" onClick={onBack}>
          Back to Games
        </button>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------
// --- Game Selection Menu Component ---
// -----------------------------------------------------------------
const GameSelector = ({ onSelectGame }) => {
  return (
    <div className="game-selector-container">
      <h1 className="game-selector-title">Choose Your Game!</h1>
      <div className="game-card-row">
        <div className="game-card" onClick={() => onSelectGame('emotion')}>
          <div className="game-card-icon">🧠</div>
          <h2>Emotion Quiz</h2>
          <p>Use your facial expressions to answer questions!</p>
        </div>
        <div className="game-card" onClick={() => onSelectGame('memory')}>
          <div className="game-card-icon">🧩</div>
          <h2>Memory Match</h2>
          <p>Test your memory and match all the hidden pairs!</p>
        </div>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------
// --- Main Game Component (Parent) ---
// This is the component that decides which screen to show
// -----------------------------------------------------------------
const Game = () => {
  const [selectedGame, setSelectedGame] = useState(null); // null, 'emotion', 'memory'

  // This function renders the correct component based on state
  const renderGame = () => {
    switch (selectedGame) {
      case 'emotion':
        return <EmotionGame onBack={() => setSelectedGame(null)} />;
      case 'memory':
        return <MemoryGame onBack={() => setSelectedGame(null)} />;
      default:
        return <GameSelector onSelectGame={setSelectedGame} />;
    }
  };

  return (
    // This outer container provides the consistent background
    <div className="game-page-container">
      {renderGame()}
    </div>
  );
};

export default Game;

