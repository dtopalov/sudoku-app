export function getErrorMessage(errorCode: string | null): string {
  const messages: Record<string, string> = {
    INVALID_MOVE_CONFLICT: 'This number conflicts with another cell in the same row, column, or box.',
    FAILED_TO_SUBMIT_MOVE: 'Failed to submit your move. Please try again.',
    FAILED_TO_CREATE_SESSION: 'Failed to create a new game. Please try again.',
    FAILED_TO_JOIN_SESSION: 'Failed to join the game. Please try again.',
    FAILED_TO_LOAD_LEADERBOARD: 'Failed to load leaderboard.',
    FAILED_TO_SOLVE: 'Failed to auto-solve the puzzle. Please try again.',
  };

  return messages[errorCode!] ?? 'An error occurred. Please try again.';
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export enum Keys {
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  ArrowUp = 'ArrowUp',
  Backspace = 'Backspace',
  Delete = 'Delete',
  Clear = 'Clear',
  End = 'End',
  Home = 'Home',
  PageDown = 'PageDown',
  PageUp = 'PageUp',
  Tab = 'Tab',
}
