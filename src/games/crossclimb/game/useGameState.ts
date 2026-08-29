import { useState, useEffect, useCallback } from 'react';
import type { Puzzle, RowState } from './types';
import { differsByOneLetter } from './differsByOneLetter';
import { PENALTY_HINT, PENALTY_REVEAL } from './constants';

export type GameStage = 'FILL' | 'ARRANGE' | 'FINAL' | 'COMPLETED';

export function useGameState(puzzle: Puzzle) {
  const [rows, setRows] = useState<RowState[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState(1);
  const [stage, setStage] = useState<GameStage>('FILL');
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealsUsed, setRevealsUsed] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [stageBanner, setStageBanner] = useState<string | null>(null);

  useEffect(() => {
    const topRow: RowState = {
      id: 'top', originalIndex: 0, type: 'top', clue: puzzle.topClue, answer: puzzle.topAnswer,
      currentWord: ' '.repeat(puzzle.wordLength), isLocked: true, status: 'normal', revealedIndices: []
    };
    const bottomRow: RowState = {
      id: 'bottom', originalIndex: puzzle.middleRungs.length + 1, type: 'bottom', clue: puzzle.bottomClue, answer: puzzle.bottomAnswer,
      currentWord: ' '.repeat(puzzle.wordLength), isLocked: true, status: 'normal', revealedIndices: []
    };
    const middleRows: RowState[] = puzzle.middleRungs.map((rung, i) => ({
      id: `mid-${i}`, originalIndex: i + 1, type: 'middle', clue: rung.clue, answer: rung.answer,
      currentWord: ' '.repeat(puzzle.wordLength), isLocked: false, status: 'normal', revealedIndices: []
    }));
    
    // Shuffle middle rows
    const shuffledMiddle = [...middleRows].sort(() => Math.random() - 0.5);
    
    setRows([topRow, ...shuffledMiddle, bottomRow]);
    setActiveRowIndex(1);
    setStage('FILL');
    setStartTime(Date.now());
    setElapsedTime(0);
    setPenalties(0);
    setHintsUsed(0);
    setRevealsUsed(0);
    setStageBanner(null);
  }, [puzzle]);

  useEffect(() => {
    if (stage !== 'COMPLETED') {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stage, startTime]);

  const updateRow = useCallback((index: number, updates: Partial<RowState>) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const advanceToNextRow = useCallback((currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    while (nextIndex < rows.length) {
      if (!rows[nextIndex].isLocked && (stage === 'FILL' || rows[nextIndex].type !== 'middle')) {
        setActiveRowIndex(nextIndex);
        return;
      }
      nextIndex++;
    }
  }, [rows, stage]);

  const handleHint = useCallback(() => {
    if (activeRowIndex === -1 || stage === 'COMPLETED') return;
    const row = rows[activeRowIndex];
    if (row.isLocked) return;
    if (row.type === 'middle' && stage !== 'FILL') {
      showToast("Middle rows cannot be edited in this stage.");
      return;
    }

    if (row.currentWord.includes(' ')) {
      let targetIndex = -1;
      for (let i = 0; i < puzzle.wordLength; i++) {
        if (!row.revealedIndices.includes(i) && row.currentWord[i] !== row.answer[i]) {
          targetIndex = i; break;
        }
      }
      if (targetIndex === -1) {
        for (let i = 0; i < puzzle.wordLength; i++) {
          if (!row.revealedIndices.includes(i)) {
            targetIndex = i; break;
          }
        }
      }
      if (targetIndex !== -1) {
        const newWordArr = row.currentWord.split('');
        newWordArr[targetIndex] = row.answer[targetIndex];
        const newWord = newWordArr.join('');
        updateRow(activeRowIndex, {
          currentWord: newWord,
          revealedIndices: [...row.revealedIndices, targetIndex],
          status: 'normal'
        });
        setHintsUsed(h => h + 1);
        setPenalties(p => p + PENALTY_HINT);
        
        if (!newWord.includes(' ')) {
          advanceToNextRow(activeRowIndex);
        }
      }
    } else {
      if (row.currentWord === row.answer) {
        updateRow(activeRowIndex, { status: 'correct' });
        showToast("Your answer for this rung is correct!");
      } else {
        updateRow(activeRowIndex, { status: 'incorrect' });
        showToast("That rung is incorrect.");
      }
      setHintsUsed(h => h + 1);
      setPenalties(p => p + PENALTY_HINT);
    }
  }, [activeRowIndex, puzzle.wordLength, rows, stage, updateRow, showToast, advanceToNextRow]);

  const handleReveal = useCallback(() => {
    if (activeRowIndex === -1 || stage === 'COMPLETED') return;
    const row = rows[activeRowIndex];
    if (row.isLocked) return;
    if (row.type === 'middle' && stage !== 'FILL') {
      showToast("Middle rows cannot be edited in this stage.");
      return;
    }

    updateRow(activeRowIndex, {
      currentWord: row.answer,
      revealedIndices: Array.from({ length: puzzle.wordLength }, (_, i) => i),
      status: 'correct'
    });
    setRevealsUsed(r => r + 1);
    setPenalties(p => p + PENALTY_REVEAL);
    
    advanceToNextRow(activeRowIndex);
  }, [activeRowIndex, puzzle.wordLength, rows, stage, updateRow, showToast, advanceToNextRow]);

  const moveRow = useCallback((fromIndex: number, toIndex: number) => {
    if (stage === 'FINAL' || stage === 'COMPLETED') return; // Lock reorder in final stage
    if (fromIndex <= 0 || fromIndex >= rows.length - 1) return;
    if (toIndex <= 0 || toIndex >= rows.length - 1) return;
    setRows(prev => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
    setActiveRowIndex(toIndex);
  }, [rows.length, stage]);

  const flipMiddle = useCallback(() => {
    if (stage !== 'FINAL') return;
    setRows(prev => {
      const next = [...prev];
      const middle = next.slice(1, next.length - 1);
      middle.reverse();
      next.splice(1, middle.length, ...middle);
      return next;
    });
  }, [stage]);

  // Check stages
  useEffect(() => {
    if (rows.length === 0 || stage === 'COMPLETED') return;
    
    const middleRows = rows.slice(1, rows.length - 1);
    const allMiddleCorrect = middleRows.every(r => r.currentWord === r.answer);

    const checkLadder = (arr: RowState[]) => {
      return arr.every((r, i) => {
        if (i === 0) return true;
        return differsByOneLetter(r.currentWord, arr[i - 1].currentWord);
      });
    };

    const isForwardValid = checkLadder(middleRows);
    const isReverseValid = checkLadder([...middleRows].reverse());
    const middleIsValidChain = isForwardValid || isReverseValid;

    if (stage === 'FILL') {
      if (allMiddleCorrect) {
        if (middleIsValidChain) {
          setStage('FINAL');
          setRows(prev => prev.map((r, i) =>
            (i === 0 || i === prev.length - 1) ? { ...r, isLocked: false } : r
          ));
          setStageBanner("Middle rows complete! Now complete the top & bottom rows to finish the puzzle.");
          setTimeout(() => setStageBanner(null), 3000);
          setActiveRowIndex(0);
        } else {
          setStage('ARRANGE');
        }
      }
    } else if (stage === 'ARRANGE') {
      if (middleIsValidChain) {
        setStage('FINAL');
        setRows(prev => prev.map((r, i) =>
          (i === 0 || i === prev.length - 1) ? { ...r, isLocked: false } : r
        ));
        setStageBanner("Middle rows complete! Now complete the top & bottom rows to finish the puzzle.");
        setTimeout(() => setStageBanner(null), 3000);
        setActiveRowIndex(0);
      } else if (!allMiddleCorrect) {
        setStage('FILL');
      }
    } else if (stage === 'FINAL') {
      const topRow = rows[0];
      const bottomRow = rows[rows.length - 1];

      const isTopCorrect = topRow.currentWord === topRow.answer;
      const isBottomCorrect = bottomRow.currentWord === bottomRow.answer;

      if (isTopCorrect && isBottomCorrect && allMiddleCorrect) {
        setStage('COMPLETED');
      }
    }
  }, [rows.map(r => r.currentWord).join(','), rows.length, stage]);

  return {
    rows,
    activeRowIndex,
    setActiveRowIndex,
    stage,
    elapsedTime,
    penalties,
    hintsUsed,
    revealsUsed,
    updateRow,
    handleHint,
    handleReveal,
    moveRow,
    flipMiddle,
    toastMessage,
    stageBanner,
    advanceToNextRow
  };
}
