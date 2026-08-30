import { useEffect, useRef } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { CrossclimbRow, type RowHandle } from './CrossclimbRow';
import { differsByOneLetter } from './game/differsByOneLetter';
import type { RowState } from './game/types';
import type { useGameState } from './game/useGameState';

type GameState = ReturnType<typeof useGameState>;

interface SortableRowProps {
  row: RowState;
  index: number;
  isActive: boolean;
  canReorder: boolean;
  isReadOnly: boolean;
  wordLength: number;
  rowCount: number;
  onClick: () => void;
  onChange: (word: string) => void;
  onComplete: () => void;
  moveRow: (from: number, to: number) => void;
  rowRef: (handle: RowHandle | null) => void;
}

function SortableRow({
  row,
  index,
  isActive,
  canReorder,
  isReadOnly,
  wordLength,
  rowCount,
  onClick,
  onChange,
  onComplete,
  moveRow,
  rowRef,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !canReorder,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
      }}
      className={`relative flex items-center gap-2 ${isDragging ? 'opacity-90' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        aria-label={canReorder ? `Reorder row ${index}` : 'Reordering locked'}
        disabled={!canReorder}
        className={`flex size-11 shrink-0 items-center justify-center rounded-md text-faint
          transition-colors sm:size-8 ${
            canReorder
              ? 'cursor-grab hover:bg-hover hover:text-ink active:cursor-grabbing'
              : 'opacity-30'
          }`}
      >
        <GripVertical size={16} />
      </button>

      <div className="min-w-0 flex-1">
        <CrossclimbRow
          ref={rowRef}
          row={row}
          isActive={isActive}
          wordLength={wordLength}
          isReadOnly={isReadOnly}
          onClick={onClick}
          onChange={onChange}
          onComplete={onComplete}
        />
      </div>

      {/* Keyboard-reachable alternative to dragging. */}
      <div className="flex w-11 shrink-0 flex-col items-center gap-0.5 sm:w-8">
        {isActive && canReorder ? (
          <>
            <button
              type="button"
              onClick={() => moveRow(index, index - 1)}
              disabled={index === 1}
              aria-label="Move row up"
              className="rounded p-2 text-faint transition-colors hover:bg-hover
                hover:text-ink disabled:opacity-25 sm:p-0.5"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              onClick={() => moveRow(index, index + 1)}
              disabled={index === rowCount - 2}
              aria-label="Move row down"
              className="rounded p-2 text-faint transition-colors hover:bg-hover
                hover:text-ink disabled:opacity-25 sm:p-0.5"
            >
              <ChevronDown size={15} />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** A short green bar shown between two rows that differ by exactly one letter. */
function Link({ connected }: { connected: boolean }) {
  return (
    <div className="flex h-2 items-center justify-center" aria-hidden>
      <div
        className={`h-full w-8 rounded-full transition-colors ${
          connected ? 'bg-success' : 'bg-transparent'
        }`}
      />
    </div>
  );
}

interface BoardProps {
  gameState: GameState;
  wordLength: number;
}

export function CrossclimbBoard({ gameState, wordLength }: BoardProps) {
  const { rows, activeRowIndex, setActiveRowIndex, updateRow, moveRow, stage, advanceToNextRow } =
    gameState;
  const rowHandles = useRef<(RowHandle | null)[]>([]);

  useEffect(() => {
    if (activeRowIndex >= 0 && activeRowIndex < rows.length) {
      rowHandles.current[activeRowIndex]?.focus();
    }
  }, [activeRowIndex, rows.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = rows.findIndex((row) => row.id === active.id);
    const to = rows.findIndex((row) => row.id === over.id);
    const isMiddle = (index: number) => index > 0 && index < rows.length - 1;
    if (isMiddle(from) && isMiddle(to)) moveRow(from, to);
  };

  if (rows.length === 0) return null;

  const connected = (a: RowState, b: RowState) =>
    !a.currentWord.includes(' ') &&
    !b.currentWord.includes(' ') &&
    differsByOneLetter(a.currentWord, b.currentWord);

  const middleRows = rows.slice(1, rows.length - 1);
  const lastIndex = rows.length - 1;
  const canReorder = stage !== 'FINAL' && stage !== 'COMPLETED';

  return (
    <div className="w-full max-w-md">
      {/* Top row — locked until the ladder is built. */}
      <div className="flex items-center gap-2">
        <div className="size-11 shrink-0 sm:size-8" aria-hidden />
        <div className="min-w-0 flex-1">
          <CrossclimbRow
            ref={(handle) => {
              rowHandles.current[0] = handle;
            }}
            row={rows[0]}
            isActive={activeRowIndex === 0}
            wordLength={wordLength}
            isReadOnly={rows[0].isLocked || stage === 'COMPLETED'}
            onClick={() => setActiveRowIndex(0)}
            onChange={(word) => updateRow(0, { currentWord: word, status: 'normal' })}
            onComplete={() => advanceToNextRow(0)}
          />
        </div>
        <div className="w-11 shrink-0 sm:w-8" aria-hidden />
      </div>

      <Link connected={connected(rows[0], rows[1])} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={middleRows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          {middleRows.map((row, offset) => {
            const index = offset + 1;
            return (
              <div key={row.id}>
                <SortableRow
                  row={row}
                  index={index}
                  isActive={index === activeRowIndex}
                  canReorder={canReorder}
                  isReadOnly={stage !== 'FILL'}
                  wordLength={wordLength}
                  rowCount={rows.length}
                  onClick={() => setActiveRowIndex(index)}
                  onChange={(word) => updateRow(index, { currentWord: word, status: 'normal' })}
                  onComplete={() => advanceToNextRow(index)}
                  moveRow={moveRow}
                  rowRef={(handle) => {
                    rowHandles.current[index] = handle;
                  }}
                />
                <Link connected={connected(row, rows[index + 1])} />
              </div>
            );
          })}
        </SortableContext>
      </DndContext>

      {/* Bottom row */}
      <div className="flex items-center gap-2">
        <div className="size-11 shrink-0 sm:size-8" aria-hidden />
        <div className="min-w-0 flex-1">
          <CrossclimbRow
            ref={(handle) => {
              rowHandles.current[lastIndex] = handle;
            }}
            row={rows[lastIndex]}
            isActive={activeRowIndex === lastIndex}
            wordLength={wordLength}
            isReadOnly={rows[lastIndex].isLocked || stage === 'COMPLETED'}
            onClick={() => setActiveRowIndex(lastIndex)}
            onChange={(word) => updateRow(lastIndex, { currentWord: word, status: 'normal' })}
            onComplete={() => advanceToNextRow(lastIndex)}
          />
        </div>
        <div className="w-11 shrink-0 sm:w-8" aria-hidden />
      </div>
    </div>
  );
}
