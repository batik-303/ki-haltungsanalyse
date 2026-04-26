/**
 * Moving average filter with configurable window size.
 * Returns the arithmetic mean of the values in the buffer.
 */
export function createMovingAverage(windowSize = 30) {
  const buffer: number[] = []

  return {
    push(value: number): number {
      buffer.push(value)
      if (buffer.length > windowSize) {
        buffer.shift()
      }
      return buffer.reduce((a, b) => a + b, 0) / buffer.length
    },

    reset() {
      buffer.length = 0
    },

    get current(): number {
      if (buffer.length === 0) return 0
      return buffer.reduce((a, b) => a + b, 0) / buffer.length
    },

    get length(): number {
      return buffer.length
    },
  }
}
