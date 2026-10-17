import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DominoDefinition, DominoRotationState, getRotationDetails } from '../domain/domino';
import { canPlaceDomino, DominoPlacement, placeDomino } from '../domain/placement';
import { CellId, Puzzle, makeCellId, parseCellId } from '../domain/puzzle';
import { DragCandidate } from '../components/PuzzleBoard/PuzzleBoard';
import {
  GameState,
  ensureTimerStarted,
  evaluatePostMoveState,
  placeDominoOnBoard,
  returnDominoToTray,
  rotateTrayDomino
} from './gameState';

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

export interface SelectedPlacement {
  dominoId: string;
  original: DominoPlacement;
  candidate: DominoPlacement;
  anchorRow: number;
  anchorCol: number;
  anchorIsHalfA: boolean;
  step: number; // 0: Right, 1: Down, 2: Left, 3: Up
  totalSteps: number;
  initialTotalSteps: number;
  isLegal: boolean;
}

/**
 * Finds the candidate cell pair for a domino rotated 90 degrees clockwise.
 * If selected when vertical: rotates around the top square.
 * If selected when horizontal: rotates around the left square.
 * The anchor square remains strictly pinned across all 4 rotation quadrants.
 */
function getRotationStepCandidate(
  puzzle: Puzzle,
  otherPlacements: DominoPlacement[],
  domino: DominoDefinition,
  anchorRow: number,
  anchorCol: number,
  anchorIsHalfA: boolean,
  step: number
): { placement: DominoPlacement; isLegal: boolean } {
  let otherRow = anchorRow;
  let otherCol = anchorCol;

  // 0: Right, 1: Down, 2: Left, 3: Up
  if (step === 0) otherCol += 1;
  else if (step === 1) otherRow += 1;
  else if (step === 2) otherCol -= 1;
  else if (step === 3) otherRow -= 1;

  const anchorId = makeCellId(anchorRow, anchorCol);
  const otherId = makeCellId(otherRow, otherCol);

  const cellA = anchorIsHalfA ? anchorId : otherId;
  const cellB = anchorIsHalfA ? otherId : anchorId;
  const orientation = step % 2 === 0 ? 'horizontal' : 'vertical';
  const rotation: DominoRotationState = anchorIsHalfA
    ? (step as DominoRotationState)
    : (((step + 2) % 4) as DominoRotationState);
  const reversed = rotation === 2 || rotation === 3;

  const candPlacement: DominoPlacement = {
    dominoId: domino.id,
    cellA,
    cellB,
    orientation,
    reversed,
    rotation
  };

  const isLegal = canPlaceDomino(
    puzzle,
    otherPlacements,
    domino,
    candPlacement.cellA,
    candPlacement.cellB
  );

  return { placement: candPlacement, isLegal };
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

  // Selection state for placed dominoes
  const [selectedPlacement, setSelectedPlacement] = useState<SelectedPlacement | null>(null);
  const selectedPlacementRef = useRef<SelectedPlacement | null>(null);
  selectedPlacementRef.current = selectedPlacement;

  // Cumulative rotation angles for smooth clockwise animations
  const [dominoAngles, setDominoAngles] = useState<Record<string, number>>({});

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitOrRevertSelected = useCallback(() => {
    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
    }
    const sel = selectedPlacementRef.current;
    if (!sel) return;

    selectedPlacementRef.current = null;
    setSelectedPlacement(null);

    if (sel.isLegal) {
      const hasChanged =
        sel.candidate.cellA !== sel.original.cellA ||
        sel.candidate.cellB !== sel.original.cellB ||
        sel.candidate.rotation !== sel.original.rotation;

      if (hasChanged) {
        setGameState((prev) => {
          let next = ensureTimerStarted(prev, performance.now());
          const updatedPlacements = placeDomino(next.placements, sel.candidate);
          next = {
            ...next,
            placements: updatedPlacements,
            rotations: next.rotations + 1
          };
          return evaluatePostMoveState(next);
        });
      }
    } else {
      // Revert to original placement if candidate is illegal when unselecting
      setGameState((prev) => {
        const restoredPlacements = placeDomino(prev.placements, sel.original);
        return {
          ...prev,
          placements: restoredPlacements
        };
      });
      // Restore angle to original placement
      setDominoAngles((prev) => ({
        ...prev,
        [sel.dominoId]: sel.original.rotation * 90
      }));
    }
  }, [setGameState]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }
    };
  }, []);

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

      // If a different domino is currently selected, commit/revert it first
      if (selectedPlacementRef.current && selectedPlacementRef.current.dominoId !== dominoId) {
        commitOrRevertSelected();
      }

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
        const placement =
          selectedPlacementRef.current?.dominoId === dominoId
            ? selectedPlacementRef.current.candidate
            : gameState.placements.find((p) => p.dominoId === dominoId);
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
    [gameState, commitOrRevertSelected]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const dist = Math.hypot(dx, dy);

      const hasMoved = dist > 6 || dragState.hasMoved;

      if (hasMoved && selectedPlacementRef.current) {
        commitOrRevertSelected();
      }

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

        const otherPlacements = gameState.placements.filter((p) => p.dominoId !== domino.id);
        const isLegal = canPlaceDomino(
          gameState.puzzle,
          otherPlacements,
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
    [dragState, boardSvgRef, cellSize, padding, minCol, minRow, gameState, commitOrRevertSelected]
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
          const currentSel = selectedPlacementRef.current;
          const domino = gameState.puzzle.dominoes.find((d) => d.id === dragState.dominoId);
          const currentPlacement = gameState.placements.find((p) => p.dominoId === dragState.dominoId);

          if (domino && currentPlacement) {
            if (!currentSel || currentSel.dominoId !== dragState.dominoId) {
              // Click on unselected domino: First click selects.
              // Do not unselect automatically, only when another domino is clicked.
              if (currentSel) {
                commitOrRevertSelected();
              }
              const parsedA = parseCellId(currentPlacement.cellA);
              const parsedB = parseCellId(currentPlacement.cellB);
              let anchorRow: number;
              let anchorCol: number;
              let initialStep: number;

              if (currentPlacement.orientation === 'vertical') {
                // If selected when vertical: rotate around top square
                anchorRow = Math.min(parsedA.row, parsedB.row);
                anchorCol = parsedA.col;
                initialStep = 1; // Down
              } else {
                // If selected when horizontal: rotate around left square
                anchorRow = parsedA.row;
                anchorCol = Math.min(parsedA.col, parsedB.col);
                initialStep = 0; // Right
              }

              const anchorId = makeCellId(anchorRow, anchorCol);
              const anchorIsHalfA = currentPlacement.cellA === anchorId;
              const initialTotalSteps = initialStep;

              const newSel: SelectedPlacement = {
                dominoId: dragState.dominoId,
                original: currentPlacement,
                candidate: currentPlacement,
                anchorRow,
                anchorCol,
                anchorIsHalfA,
                step: initialStep,
                totalSteps: initialTotalSteps,
                initialTotalSteps,
                isLegal: true
              };
              setSelectedPlacement(newSel);

              setDominoAngles((prev) => ({
                ...prev,
                [dragState.dominoId]: initialTotalSteps * 90
              }));

              // Do not start any timer on first click - stays selected until another domino is clicked
              if (selectionTimerRef.current) {
                clearTimeout(selectionTimerRef.current);
                selectionTimerRef.current = null;
              }
            } else {
              // Click on already selected domino: Second click rotates the domino
              const otherPlacements = gameState.placements.filter(
                (p) => p.dominoId !== dragState.dominoId
              );
              const nextTotalSteps = currentSel.totalSteps + 1;
              const nextStep = nextTotalSteps % 4;
              const cand = getRotationStepCandidate(
                gameState.puzzle,
                otherPlacements,
                domino,
                currentSel.anchorRow,
                currentSel.anchorCol,
                currentSel.anchorIsHalfA,
                nextStep
              );

              const nextAngle = nextTotalSteps * 90;
              setDominoAngles((prev) => ({
                ...prev,
                [dragState.dominoId]: nextAngle
              }));

              const updatedSel: SelectedPlacement = {
                dominoId: dragState.dominoId,
                original: currentSel.original,
                candidate: cand.placement,
                anchorRow: currentSel.anchorRow,
                anchorCol: currentSel.anchorCol,
                anchorIsHalfA: currentSel.anchorIsHalfA,
                step: nextStep,
                totalSteps: nextTotalSteps,
                initialTotalSteps: currentSel.initialTotalSteps,
                isLegal: cand.isLegal
              };
              setSelectedPlacement(updatedSel);

              // Clear previous timer
              if (selectionTimerRef.current) {
                clearTimeout(selectionTimerRef.current);
                selectionTimerRef.current = null;
              }

              // If in legal position, unselect and commit after 1 second.
              // If not in legal position, give user 1.5s to click again; if they stop, revert to original placement and unselect.
              if (cand.isLegal) {
                selectionTimerRef.current = setTimeout(() => {
                  commitOrRevertSelected();
                }, 1000);
              } else {
                selectionTimerRef.current = setTimeout(() => {
                  commitOrRevertSelected();
                }, 1500);
              }
            }
          }
        } else {
          // Tap on tray domino -> rotate in tray
          if (selectedPlacementRef.current) {
            commitOrRevertSelected();
          }
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
            // Return to tray and reset to horizontal
            setGameState((prev) => {
              const returned = returnDominoToTray(prev, dragState.dominoId);
              return {
                ...returned,
                dominoRotations: {
                  ...returned.dominoRotations,
                  [dragState.dominoId]: 0
                }
              };
            });
          } else {
            // Illegal drop on board -> return to previous placement and record invalid drop
            setGameState((prev) => ({
              ...prev,
              invalidDrops: prev.invalidDrops + 1
            }));
          }
        } else {
          // Dragged from tray and NOT dropped on legal board cells -> turn back to horizontal
          setGameState((prev) => ({
            ...prev,
            invalidDrops: (dragCandidate && !dragCandidate.isLegal) ? prev.invalidDrops + 1 : prev.invalidDrops,
            dominoRotations: {
              ...prev.dominoRotations,
              [dragState.dominoId]: 0
            }
          }));
        }
      }

      setDragState(null);
      setDragCandidate(null);
    },
    [dragState, dragCandidate, boardSvgRef, setGameState, gameState, commitOrRevertSelected]
  );

  // Placements with the currently selected domino reflecting its rotated candidate position
  const effectivePlacements = useMemo(() => {
    if (!selectedPlacement) return gameState.placements;
    return gameState.placements.map((p) =>
      p.dominoId === selectedPlacement.dominoId ? selectedPlacement.candidate : p
    );
  }, [gameState.placements, selectedPlacement]);

  return {
    dragState,
    dragCandidate,
    selectedPlacement,
    selectedDominoId: selectedPlacement?.dominoId ?? null,
    draggingDominoId: dragState?.hasMoved ? dragState.dominoId : null,
    dominoAngles,
    effectivePlacements,
    deselectDomino: commitOrRevertSelected,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  };
}
