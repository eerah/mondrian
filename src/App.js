import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUndo, faMagic, faCog } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './App.css';

const Block = ({ block, index, rotateBlock }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'block',
    item: { ...block, index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!block.placed) {
      rotateBlock(block.id);
    }
  };

  if (block.placed) return null;

  return (
    <div
      ref={drag}
      className="block"
      onContextMenu={handleContextMenu}
      style={{
        width: `${block.width * 40}px`,
        height: `${block.height * 40}px`,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: block.color,
        border: '2px solid #000',
        position: 'relative',
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          rotateBlock(block.id);
        }}
        className="rotate-button"
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          fontSize: '12px',
          padding: '2px',
        }}
      >
        ↻
      </button>
    </div>
  );
};

const Cell = ({ x, y, placeBlock, removeBlock, cell, board }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'block',
    drop: (item) => placeBlock(item, x, y),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const handleClick = () => {
    if (cell) {
      removeBlock(cell.id);
    }
  };

  const getBorderClasses = () => {
    if (!cell) return '';
    let classes = [];
    if (y === 0 || board[y - 1][x] !== cell.id) classes.push('border-top');
    if (x === 7 || board[y][x + 1] !== cell.id) classes.push('border-right');
    if (y === 7 || board[y + 1][x] !== cell.id) classes.push('border-bottom');
    if (x === 0 || board[y][x - 1] !== cell.id) classes.push('border-left');
    return classes.join(' ');
  };

  return (
    <div
      ref={drop}
      className={`cell ${isOver ? 'cell-hover' : ''}`}
      onClick={handleClick}
    >
      {cell && (
        <div
          className={`placed-block ${getBorderClasses()}`}
          style={{
            backgroundColor: cell.color,
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
    </div>
  );
};

function App() {
  const [animationStep, setAnimationStep] = useState(0);
  const [isSolving, setIsSolving] = useState(false);
  const [gameState, setGameState] = useState(() => ({
    board: Array(8).fill().map(() => Array(8).fill(null)),
    placedBlocks: [],
    blocks: [
      { id: 0, width: 1, height: 1, color: '#000000', placed: false },
      { id: 1, width: 1, height: 2, color: '#000000', placed: false },
      { id: 2, width: 1, height: 3, color: '#000000', placed: false },
      { id: 3, width: 3, height: 3, color: '#ffffff', placed: false },
      { id: 4, width: 2, height: 2, color: '#ffffff', placed: false },
      { id: 5, width: 4, height: 3, color: '#FFFF00', placed: false },
      { id: 6, width: 1, height: 5, color: '#0000FF', placed: false },
      { id: 7, width: 1, height: 4, color: '#0000FF', placed: false },
      { id: 8, width: 2, height: 3, color: '#FF0000', placed: false },
      { id: 9, width: 2, height: 4, color: '#FF0000', placed: false },
      { id: 10, width: 2, height: 5, color: '#FF0000', placed: false },
    ],
  }));
  
  const placeBlock = useCallback((block, x, y) => {
    setGameState((prevState) => {
      const currentBlock = prevState.blocks.find((b) => b.id === block.id);
      if (!currentBlock || currentBlock.placed) return prevState;
  
      if (x + currentBlock.width > 8 || y + currentBlock.height > 8) return prevState;
  
      for (let i = 0; i < currentBlock.height; i++) {
        for (let j = 0; j < currentBlock.width; j++) {
          if (prevState.board[y + i][x + j] !== null) {
            return prevState;
          }
        }
      }
  
      const newBoard = prevState.board.map((row) => [...row]);
      for (let i = 0; i < currentBlock.height; i++) {
        for (let j = 0; j < currentBlock.width; j++) {
          newBoard[y + i][x + j] = currentBlock.id;
        }
      }
  
      const newPlacedBlocks = [...prevState.placedBlocks, { ...currentBlock, x, y }];
      const newBlocks = prevState.blocks.map((b) =>
        b.id === currentBlock.id ? { ...b, placed: true } : b
      );
  
      return {
        board: newBoard,
        placedBlocks: newPlacedBlocks,
        blocks: newBlocks,
      };
    });
  }, []);
    const removeBlock = useCallback((blockId) => {
    setGameState((prevState) => {
      const blockToRemove = prevState.placedBlocks.find((b) => b.id === blockId);
      if (!blockToRemove) return prevState;

      const newBoard = prevState.board.map((row) => [...row]);
      for (let i = 0; i < blockToRemove.height; i++) {
        for (let j = 0; j < blockToRemove.width; j++) {
          newBoard[blockToRemove.y + i][blockToRemove.x + j] = null;
        }
      }

      const newPlacedBlocks = prevState.placedBlocks.filter((b) => b.id !== blockId);
      const newBlocks = prevState.blocks.map((b) =>
        b.id === blockId ? { ...b, placed: false } : b
      );

      return {
        board: newBoard,
        placedBlocks: newPlacedBlocks,
        blocks: newBlocks,
      };
    });
  }, []);

  const rotateBlock = useCallback((blockId) => {
    setGameState((prevState) => {
      const blockIndex = prevState.blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return prevState;

      const block = prevState.blocks[blockIndex];
      const newBlock = { ...block, width: block.height, height: block.width };

      let newBoard = prevState.board;
      let newPlacedBlocks = prevState.placedBlocks;

      if (block.placed) {
        const placedBlock = prevState.placedBlocks.find((b) => b.id === blockId);
        if (!placedBlock) return prevState;

        if (placedBlock.x + newBlock.width > 8 || placedBlock.y + newBlock.height > 8) {
          return prevState;
        }

        for (let i = 0; i < newBlock.height; i++) {
          for (let j = 0; j < newBlock.width; j++) {
            if (prevState.board[placedBlock.y + i][placedBlock.x + j] !== null &&
              prevState.board[placedBlock.y + i][placedBlock.x + j] !== blockId) {
              return prevState;
            }
          }
        }

        newBoard = prevState.board.map((row) => [...row]);
        for (let i = 0; i < placedBlock.height; i++) {
          for (let j = 0; j < placedBlock.width; j++) {
            newBoard[placedBlock.y + i][placedBlock.x + j] = null;
          }
        }
        for (let i = 0; i < newBlock.height; i++) {
          for (let j = 0; j < newBlock.width; j++) {
            newBoard[placedBlock.y + i][placedBlock.x + j] = blockId;
          }
        }

        newPlacedBlocks = prevState.placedBlocks.map((b) =>
          b.id === blockId ? { ...newBlock, x: placedBlock.x, y: placedBlock.y } : b
        );
      }

      const newBlocks = [...prevState.blocks];
      newBlocks[blockIndex] = newBlock;

      return {
        ...prevState,
        board: newBoard,
        placedBlocks: newPlacedBlocks,
        blocks: newBlocks,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      board: Array(8).fill().map(() => Array(8).fill(null)),
      placedBlocks: [],
      blocks: gameState.blocks.map((block) => ({ ...block, placed: false })),
    });
  }, [gameState.blocks]);

  const handleSolve = useCallback(() => {
    setIsSolving(true);
  
    const blocksForSolver = gameState.blocks.map(block => ({
      id: block.id,
      width: block.width,
      height: block.height,
      color: block.color
    }));
  
    const prePlacedBlocks = gameState.placedBlocks.map(block => ({
      id: block.id,
      width: block.width,
      height: block.height,
      color: block.color,
      x: block.x,
      y: block.y
    }));
  
    axios.post('https://eerah.pythonanywhere.com/solve', {
      blocks: blocksForSolver,
      pre_placed_blocks: prePlacedBlocks
    })
      .then(response => {
        const solution = response.data;
        if (solution) {
          setAnimationStep(0);
          animateSolution(solution);
        } else {
          console.log("No solution found");
          // Optionally, show a message to the user
        }
      })
      .catch(error => {
        console.error('Error solving the puzzle:', error);
        // Optionally, show an error message to the user
      })
      .finally(() => {
        setIsSolving(false);
      });
  }, [gameState.blocks, gameState.placedBlocks]);

  const animateSolution = useCallback((solution) => {
    const animateStep = (step) => {
      if (step >= solution.length) {
        setIsSolving(false);
        return;
      }
  
      setGameState(prevState => {
        const newBoard = [...prevState.board.map(row => [...row])];
        const block = solution[step];
  
        for (let i = 0; i < block.height; i++) {
          for (let j = 0; j < block.width; j++) {
            newBoard[block.y + i][block.x + j] = block.id;
          }
        }
  
        const newPlacedBlocks = [...prevState.placedBlocks, { ...block, placed: true }];
        const newBlocks = prevState.blocks.map(b =>
          b.id === block.id ? { ...b, placed: true } : b
        );
  
        return {
          board: newBoard,
          placedBlocks: newPlacedBlocks,
          blocks: newBlocks,
        };
      });
  
      setAnimationStep(step + 1);
      setTimeout(() => animateStep(step + 1), 500); // Adjust the delay as needed
    };
  
    animateStep(0);
  }, []);
  
  const { board, placedBlocks, blocks } = gameState;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <header className="game-header">
          <h1 className="game-title">Mondrian Blocks</h1>
          <p className="game-subtitle">White Edition</p>
        </header>
        
        <div className="game-container">
          <div className="game-board">
            {board.map((row, y) =>
              row.map((cell, x) => (
                <Cell
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  placeBlock={placeBlock}
                  removeBlock={removeBlock}
                  cell={cell !== null ? placedBlocks.find((b) => b.id === cell) : null}
                  board={board}
                />
              ))
            )}
          </div>
          
          <div className="block-palette">
            {blocks.map((block, index) => (
              <Block 
                key={block.id} 
                block={block} 
                index={index} 
                rotateBlock={rotateBlock} 
              />
            ))}
          </div>
        </div>
        
        <div className="button-container">
          <button onClick={resetGame} className="button reset-button">
            <FontAwesomeIcon icon={faUndo} /> Reset Game
          </button>
          <button 
            onClick={handleSolve} 
            className="button solve-button" 
            disabled={isSolving}
          >
            {isSolving ? (
              <>
                <FontAwesomeIcon icon={faCog} spin /> Solving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faMagic} /> Solve
              </>
            )}
          </button>
        </div>
        
        {isSolving && <div className="loading-spinner"></div>}
        
        <footer className="game-footer">
          <p>© 2024 Mondrian Blocks Game. All rights reserved.</p>
        </footer>
      </div>
    </DndProvider>
  );
}

export default App;