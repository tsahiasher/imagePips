import React, { useCallback, useRef, useState } from 'react';
import { DominoRotationState, getRotationDetails } from '../domain/domino';
import { canPlaceDomino } from '../domain/placement';
import { CellId } from '../domain/puzzle';
import { DragCandidate } from '../components/PuzzleBoard/PuzzleBoard';
import { GameState, placeDominoOnBoard, returnDominoToTray, rotatePlacedDomino, rotateTrayDomino } from './gameState';

export interface DragState {
  dominoId: string;
  fromBoard: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  rotation: DominoRotationState;
  hasMoved: boolean;
}

export function useDominoDrag(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  boardSvgRef: React.RefObject<SVGSVGElement | null>,
  cellSize: number = 72
) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragCandidate, setDragCandidate] = useState<DragCandidate | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  // Compute cell bounds
  let minRow = 0;
  let minCol = 0;
  if (gameState.puzzle.cells.length > 0) {
    minRow = Math.min(...gameState.puzzle.cells.map((c) => c.row));
    minCol = Math.min(...gameState.puzzle.cells.map((c) => c.col));
  }
  const padding = cellSize * 0.45;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, dominoId: string, fromBoard: boolean) => {
      // If already solved, ignore interactions
      if (gameState.solved) return;

      // Only handle primary pointer (left click or single touch)
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const target = e.currentTarget as HTMLElement | SVGElement;
      try {
        target.setPointerCapture(e.pointerId);
        pointerIdRef.current = e.pointerId;
      } catch {
        // Pointer capture fallback if not supported
      }

      // Find current rotation of this domino
      let rotation: DominoRotationState = 0;
      if (fromBoard) {
        const placement = gameState.placements.find((p) => p.dominoId === dominoId);
        if (placement) rotation = placement.rotation;
      } else {
        rotation = gameState.dominoRotations[dominoId] ?? 0;
      }

      setDragState({
        dominoId,
        fromBoard,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        rotation,
        hasMoved: false
      });
      setDragCandidate(null);
    },
    [gameState]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const dist = Math.hypot(dx, dy);

      const hasMoved = dist > 6 || dragState.hasMoved;

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              hasMoved
            }
          : null
      );

      if (!hasMoved) {
        setDragCandidate(null);
        return;
      }

      // Convert client coordinates to SVG board coordinates
      const svg = boardSvgRef.current;
      if (!svg) {
        setDragCandidate(null);
        return;
      }

      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());

      const domino = gameState.puzzle.dominoes.find((d) => d.id === dragState.dominoId);
      if (!domino) return;

      const { orientation, reversed } = getRotationDetails(dragState.rotation);

      // Find candidate adjacent cell pairs on the board matching this orientation
      const snapRadius = cellSize * 1.35;
      let bestCandidate: { cellA: CellId; cellB: CellId; isLegal: boolean; dist: number } | null = null;
      let minLegalDist = Infinity;
      let minAnyDist = Infinity;
      let bestAnyCandidate: { cellA: CellId; cellB: CellId; isLegal: boolean; dist: number } | null = null;

      for (const cell1 of gameState.puzzle.cells) {
        const targetR = orientation === 'horizontal' ? cell1.row : cell1.row + 1;
        const targetC = orientation === 'horizontal' ? cell1.col + 1 : cell1.col;
        const cell2 = gameState.puzzle.cells.find((c) => c.row === targetR && c.col === targetC);
        if (!cell2) continue;

        const c1X = padding + (cell1.col - minCol + 0.5) * cellSize;
        const c1Y = padding + (cell1.row - minRow + 0.5) * cellSize;
        const c2X = padding + (cell2.col - minCol + 0.5) * cellSize;
        const c2Y = padding + (cell2.row - minRow + 0.5) * cellSize;

        const midX = (c1X + c2X) / 2;
        const midY = (c1Y + c2Y) / 2;

        const dist = Math.hypot(svgPt.x - midX, svgPt.y - midY);
        if (dist > snapRadius) continue;

        const idA = cell1.id;
        const idB = cell2.id;
        const cA = reversed ? idB : idA;
        const cB = reversed ? idA : idB;

        const isLegal = canPlaceDomino(
          gameState.puzzle,
          gameState.placements,
          domino,
          cA,
          cB
        );

        if (isLegal && dist < minLegalDist) {
          minLegalDist = dist;
          bestCandidate = { cellA: cA, cellB: cB, isLegal: true, dist };
        }
        if (dist < minAnyDist) {
          minAnyDist = dist;
          bestAnyCandidate = { cellA: cA, cellB: cB, isLegal, dist };
        }
      }

      // Prioritize legal candidate, otherwise fall back to closest candidate
      const chosen = bestCandidate ?? bestAnyCandidate;

      if (chosen) {
        setDragCandidate({
          dominoId: dragState.dominoId,
          cellA: chosen.cellA,
          cellB: chosen.cellB,
          rotation: dragState.rotation,
          isLegal: chosen.isLegal
        });
      } else {
        setDragCandidate(null);
      }
    },
    [dragState, boardSvgRef, cellSize, padding, minCol, minRow, gameState]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const target = e.currentTarget as HTMLElement | SVGElement;
      if (pointerIdRef.current !== null) {
        try {
          target.releasePointerCapture(pointerIdRef.current);
        } catch {
          // ignore
        }
        pointerIdRef.current = null;
      }

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const dist = Math.hypot(dx, dy);

      // If user merely tapped / clicked without dragging (< 6px):
      if (dist <= 6 && !dragState.hasMoved) {
        if (dragState.fromBoard) {
          // Tap on placed domino -> rotate on board
          setGameState((prev) => rotatePlacedDomino(prev, dragState.dominoId));
        } else {
          // Tap on tray domino -> rotate in tray
          setGameState((prev) => rotateTrayDomino(prev, dragState.dominoId));
        }
        setDragState(null);
        setDragCandidate(null);
        return;
      }

      // Drag release:
      if (dragCandidate && dragCandidate.isLegal) {
        // Snap and place onto the board
        setGameState((prev) => {
          const res = placeDominoOnBoard(
            prev,
            dragCandidate.dominoId,
            dragCandidate.cellA,
            dragCandidate.cellB,
            dragCandidate.rotation
          );
          return res.nextState;
        });
      } else {
        // If dragged from board and released over tray or illegal spot far away:
        if (dragState.fromBoard) {
          // Check if pointer is outside board or over tray
          const svg = boardSvgRef.current;
          let droppedOutsideBoard = true;
          if (svg) {
            const rect = svg.getBoundingClientRect();
            if (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            ) {
              droppedOutsideBoard = false;
            }
          }

          if (droppedOutsideBoard) {
            // Return to tray
            setGameState((prev) => returnDominoToTray(prev, dragState.dominoId));
          } else {
            // Illegal drop on board -> return to previous placement and record invalid drop
            setGameState((prev) => ({
              ...prev,
              invalidDrops: prev.invalidDrops + 1
            }));
          }
        } else {
          // Dragged from tray and dropped illegally -> bounce back to tray
          if (dragCandidate && !dragCandidate.isLegal) {
            setGameState((prev) => ({
              ...prev,
              invalidDrops: prev.invalidDrops + 1
            }));
          }
        }
      }

      setDragState(null);
      setDragCandidate(null);
    },
    [dragState, dragCandidate, boardSvgRef, setGameState]
  );

  return {
    dragState,
    dragCandidate,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  };
}
