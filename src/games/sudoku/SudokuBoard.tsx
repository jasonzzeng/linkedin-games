import type { CSSProperties } from 'react';
import type { BoardState } from './types';
import { getCol, getConflicts, getRow } from './lib/logic';
import { useCellSize } from '../../lib/useCellSize';

interface SudokuBoardProps {
  board: BoardState;
  initialBoard: BoardState;
  selected: number | null;
  notes: Set<number>[];
  autoCheck: boolean;
  flashing: Set<number>;
  onSelect: (index: number) => void;
}

export function SudokuBoard({
  board,
  initialBoard,
  selected,
  notes,
  autoCheck,
  flashing,
  onSelect,
}: SudokuBoardProps) {
  const cell = useCellSize({ cols: 6, rows: 6, max: 62, min: 38, reservedHeight: 380 });

  const conflicts =
    autoCheck && selected !== null ? new Set(getConflicts(board, selected)) : new Set<number>();
  const selectedValue = selected !== null ? board[selected] : null;

  const style: CSSProperties = {
    gridTemplateColumns: `repeat(6, ${cell}px)`,
    gridTemplateRows: `repeat(6, ${cell}px)`,
  };

  return (
    <div
      style={style}
      className="board-surface grid overflow-hidden rounded-lg border-2 border-line-strong
        bg-surface shadow-sm"
    >
      {board.map((value, index) => {
        const row = getRow(index);
        const col = getCol(index);
        const isGiven = initialBoard[index] !== null;
        const isSelected = selected === index;
        const isPeer = value !== null && value === selectedValue && !isSelected;
        const isConflict = conflicts.has(index);
        const isFlashing = flashing.has(index);

        // 6×6 mini sudoku uses 2-row by 3-column blocks.
        const blockRight = col === 2;
        const blockBottom = row === 1 || row === 3;

        return (
          <button
            key={index}
            type="button"
            aria-label={`Row ${row + 1}, column ${col + 1}${value ? `, ${value}` : ', empty'}`}
            onClick={() => onSelect(index)}
            style={{ fontSize: cell * 0.5 }}
            className={`relative flex items-center justify-center font-semibold leading-none
              transition-colors
              border-r border-b border-line
              ${blockRight ? 'border-r-2 border-r-line-strong' : ''}
              ${blockBottom ? 'border-b-2 border-b-line-strong' : ''}
              ${col === 5 ? 'border-r-0' : ''}
              ${row === 5 ? 'border-b-0' : ''}
              ${isFlashing ? 'animate-flash' : ''}
              ${
                isConflict
                  ? 'bg-danger-soft text-danger'
                  : isSelected
                    ? 'bg-accent-soft'
                    : isPeer
                      ? 'bg-sunken'
                      : 'bg-surface hover:bg-hover'
              }
              ${isSelected ? 'ring-2 ring-inset ring-accent' : ''}`}
          >
            {value !== null ? (
              <span
                className={`tabular ${
                  isConflict ? 'text-danger' : isGiven ? 'text-ink' : 'text-accent'
                }`}
              >
                {value}
              </span>
            ) : (
              notes[index].size > 0 && (
                <span
                  className="tabular grid size-full grid-cols-3 grid-rows-2 p-0.5 text-faint"
                  style={{ fontSize: cell * 0.22 }}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <span key={n} className="flex items-center justify-center leading-none">
                      {notes[index].has(n) ? n : ''}
                    </span>
                  ))}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
