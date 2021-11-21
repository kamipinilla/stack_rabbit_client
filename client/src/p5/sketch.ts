import { P5Instance as p5 } from 'react-p5-wrapper'
import { getOutcomes } from '../api/stackRabbit'
import Game from '../game/Game'
import { FrameChar, InitialOutcome, Rotation, Shift, StackRabbitInput } from '../types'
import { ActionKey, getDropCount, getFrameInput, getLevel } from './utils'

export default function sketch(t: p5): void {
  const startLevel: number = 19
  const tapId: number = 6
  const reactionTime: number = 15

  let score: number = 0
  let isPaused: boolean = false
  let tetrisLines: number = 0
  let notPredicted = false
  let outcomes: InitialOutcome[]

  let initialInputSequence: string
  let currentInputSequece: string

  let isWaitingOutcome = true
  let game: Game = new Game()
  const size = 30

  t.setup = () => {
    t.createCanvas(size * 10 + 225, size * 20)

    fetchInitialPlacement()
  }

  async function fetchInitialPlacement() {
    const input: StackRabbitInput = {
      board: game.getBoard(),
      currentPiece: game.getPiece(),
      nextPiece: game.getNextPiece(),
      level: getLevel(startLevel, game.getLines()),
      lines: game.getLines(),
      reactionTime,
      tapId,
    }
    outcomes = await getOutcomes(input)
    const bestOutcome = outcomes[0]
    initialInputSequence = bestOutcome.inputSequence
    processOutcomes()
  }

  t.draw = () => {
    if (!isPaused) {
      update()
    }
    display()
  }

  t.keyTyped = () => {
    switch (t.key) {
      case ActionKey.Left: {
        if (game.pieceCanMoveLeft()) {
          game.shiftPieceLeft()
        }
        break
      }
      case ActionKey.Right: {
        if (game.pieceCanMoveRight()) {
          game.shiftPieceRight()
        }
        break
      }
      case ActionKey.RotateRight: {
        game.rotatePieceRight()
        break
      }
      case ActionKey.RotateLeft: {
        game.rotatePieceLeft()
        break
      }
      case ActionKey.Start: {
        isPaused = !isPaused
      }
    }
  }

  function addScoreOfLinesToBurn(): void {
    const level = getLevel(startLevel, game.getLines())
    switch (game.countLinesToBurn()) {
      case 1: {
        score += 40 * (level + 1)
        break
      }
      case 2: {
        score += 100 * (level + 1)
        break
      }
      case 3: {
        score += 300 * (level + 1)
        break
      }
      case 4: {
        score += 1200 * (level + 1)
        tetrisLines += 4
        break
      }
      default: throw Error()
    }
  }

  function update() {
    if (t.frameCount < 90 || isWaitingOutcome || game.isGameOver()) return

    processPlayer()
    updateGame()
  }

  function updateGame() {
    if (t.frameCount % getDropCount(getLevel(startLevel, game.getLines())) === 0) {
      if (game.canDrop()) {
        game.drop()
      } else {
        game.merge()
        if (game.hasLinesToBurn()) {
          addScoreOfLinesToBurn()
          game.burnLines()
        }
        game.updateCurrentPiece()
        fetchOutcomesSafe()
      }
    }
  }

  function fetchOutcomesSafe() {
    isWaitingOutcome = true

    fetchOutcomes()
  }

  function getNextFrameChar(): FrameChar {
      const frameChar = currentInputSequece[0] as FrameChar
      currentInputSequece = currentInputSequece.slice(1)
      return frameChar
  }

  function processPlayer() {
    const frameChar = getNextFrameChar()
    const input = getFrameInput(frameChar)

    const { rotation, shift } = input
    if (rotation !== null) {
      if (rotation === Rotation.Right) {
        game.getPiece().rotateRight()
      } else if (rotation === Rotation.Left) {
        game.getPiece().rotateLeft()
      }
    }

    if (shift !== null) {
      if (shift === Shift.Right) {
        game.getPiece().shiftRight()
      } else if (shift === Shift.Left) {
        game.getPiece().shiftLeft()
      }
    }
  }

  async function fetchOutcomes() {
    const input: StackRabbitInput = {
      board: game.getBoard(),
      currentPiece: game.getPiece(),
      nextPiece: game.getNextPiece(),
      level: getLevel(startLevel, game.getLines()),
      lines: game.getLines(),
      reactionTime,
      tapId,
    }
    outcomes = await getOutcomes(input)
    processOutcomes()
  }

  function processOutcomes() {
    const currentOutcome = outcomes.find(outcome => {
      return outcome.inputSequence === initialInputSequence
    })

    if (currentOutcome === undefined) {
      notPredicted = true

      currentInputSequece = initialInputSequence

      const bestOutcome = outcomes[0]
      initialInputSequence = bestOutcome.inputSequence
    } else {
      const adjustments = currentOutcome.adjustments
      if (adjustments.length === 0) {
        throw Error('Adjustments list empty')
      }
      const bestAdjustment = adjustments[0]
      const adjustmentInputSequence = bestAdjustment.inputSequence
  
      currentInputSequece = initialInputSequence.slice(0, reactionTime) + adjustmentInputSequence
  
      const followUp = bestAdjustment.followUp
      if (followUp === null) {
        throw Error('No follow up')
      }
  
      const followUpInputSequece = followUp.inputSequence
      initialInputSequence = followUpInputSequece
    }

    isWaitingOutcome = false
  }

  function flipVertically() {
    t.scale(1, -1)
    t.translate(0, -t.height)
  }

  function displayBackground() {
    t.background(0)

    t.fill(0)
    if (notPredicted) {
      t.strokeWeight(10)
      t.stroke(255, 0, 0)
    } else {
      t.strokeWeight(2)
      t.stroke(255)
    }
    t.rect(0, 0, size * 10, size * 20)
  }

  function displayBlock(x: number, y: number, isPiece: boolean) {
    t.strokeWeight(2)
    t.stroke(0)
    t.fill(isPiece ? 255 : 0, isPiece ? 255 : 255, 255)

    if (isPiece) {
      t.fill(0, 255, 255)
    } else {
      t.fill(0, 0, 255)
    }

    t.square(size * x, size * y, size)
  }

  function displayBoard() {
    for (let i = 0; i < game.getWidth(); i++) {
      for (let j = 0; j < game.getHeight(); j++) {
        if (game.isPositionFilled(i, j)) {
          displayBlock(i, j, false)
        }
      }
    }
  }

  function displayPiece() {
    const piecePositions = game.getPiecePositions()
    for (const position of piecePositions) {
      displayBlock(position.getX(), position.getY(), true)
    }
  }

  function displayNextPiece() {
    t.strokeWeight(2)
    t.stroke(0)
    t.fill(0, 0, 255)

    const nextPiecePositions = game.getNextPiecePositions()
    const newAnchorX = size * 8
    const newAnchorY = size * -7
    for (const position of nextPiecePositions) {
      const x = position.getX()
      const y = position.getY()
      t.square(newAnchorX + size * x, newAnchorY + size * y, size)
    }
  }

  function show(text: string, x: number, y: number): void {
    t.push()
    t.translate(x, y)
    t.scale(1, -1)
    t.text(text, 0, 0);
    t.pop()
  }

  function displayLines() {
    t.textSize(60)
    show(game.getLines().toString(), 370, 30)
  }

  function displayLevel() {
    t.textSize(60)
    show(getLevel(startLevel, game.getLines()).toString(), 370, 110)
  }

  function displayScore() {
    t.textSize(50)
    show(score.toString(), 310, 500)
  }

  function displayTetrisRate() {
    const lines = game.getLines()
    if (lines === 0) return

    t.textSize(50)
    const rate = Math.floor((tetrisLines * 100) / lines)
    show(rate.toString() + "%", 360, 200)
  }

  function display() {
    flipVertically()
    displayBackground()
    displayBoard()
    displayPiece()
    displayNextPiece()
    displayLines()
    displayLevel()
    displayScore()
    displayTetrisRate()
  }
}