import Board from './game/Board'
import Piece from './game/pieces/Piece'

export interface StackRabbitInput {
  withNextBox: boolean

  board: Board
  currentPiece: Piece
  nextPiece: Piece | null
  level: number
  lines: number
  reactionTime: number
  tapSpeed: string
}

export interface Outcome {
  inputSequence: string
  score: number
}

export type FrameChar = '.' | 'A' | 'B' | 'L' | 'R' | 'E' | 'F' | 'I' | 'G'

export enum Rotation {
  Right = 'Right',
  Left = 'Left',
}

export enum Shift {
  Right = 'Right',
  Left = 'Left',
}
export interface FrameInput {
  rotation: Rotation | null
  shift: Shift | null
}