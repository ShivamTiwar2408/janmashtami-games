import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameResultPanel from './GameResultPanel';
import { clearCurrentPlayer, setCurrentPlayer, submitScore } from './scoreStore';

// jsdom has no IndexedDB; the store's own logic is covered in scoreStore.test.ts,
// so here we only care that the panel drives it correctly.
jest.mock('./scoreStore', () => {
  const actual = jest.requireActual('./scoreStore');
  return { ...actual, submitScore: jest.fn() };
});

const submitScoreMock = submitScore as jest.MockedFunction<typeof submitScore>;

const board = (meId: string) => ({
  meId,
  rank: 2,
  isNewBest: true,
  previousBest: 300,
  entries: [
    {
      id: 'arrange|1111111111|meera',
      gameId: 'arrange',
      name: 'Meera',
      phone: '1111111111',
      best: 900,
      lastScore: 900,
      plays: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: meId,
      gameId: 'arrange',
      name: 'Radha',
      phone: '9876543210',
      best: 640,
      lastScore: 640,
      plays: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ],
});

const renderPanel = (props: Partial<React.ComponentProps<typeof GameResultPanel>> = {}) =>
  render(
    <GameResultPanel
      gameId="arrange"
      gameTitle="Krishna Lila Stories"
      score={640}
      onPlayAgain={jest.fn()}
      onBack={jest.fn()}
      {...props}
    />
  );

beforeEach(() => {
  jest.useRealTimers();
  clearCurrentPlayer();
  submitScoreMock.mockReset();
});

describe('a player the app already knows', () => {
  const me = 'arrange|9876543210|radha';

  beforeEach(() => {
    setCurrentPlayer({ name: 'Radha', phone: '9876543210' });
    submitScoreMock.mockResolvedValue(board(me));
  });

  it('records the score without asking anything, then reveals the board', async () => {
    renderPanel();

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    await waitFor(() => expect(submitScoreMock).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(submitScoreMock).toHaveBeenCalledWith(
      'arrange',
      { name: 'Radha', phone: '9876543210' },
      640
    );

    // Both players are listed, own row flagged, and the panel is no longer hidden.
    expect(await screen.findByText('Meera')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText('640')).toBeInTheDocument();
    expect(screen.getByText('you')).toBeInTheDocument();
    expect(screen.getByText('★ New Personal Best')).toBeInTheDocument();
    expect(screen.getByText('Rank #2 of 2')).toBeInTheDocument();
  });

  it('runs the play-again callback', async () => {
    const onPlayAgain = jest.fn();
    renderPanel({ onPlayAgain, playAgainLabel: 'Try Again' });

    await userEvent.click(screen.getByRole('button', { name: /Try Again/ }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('records each finished run exactly once', async () => {
    renderPanel();
    await waitFor(() => expect(submitScoreMock).toHaveBeenCalledTimes(1), { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 250));
    expect(submitScoreMock).toHaveBeenCalledTimes(1);
  });
});

describe('a player the app has never seen', () => {
  const me = 'arrange|9876543210|radha';

  it('asks for name and phone before recording, and rejects a short number', async () => {
    submitScoreMock.mockResolvedValue(board(me));
    renderPanel();

    // Nothing is written until we know who played.
    expect(submitScoreMock).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Your name'), 'Radha');
    await userEvent.type(screen.getByLabelText('Phone number'), '98765');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('10-digit number');
    expect(submitScoreMock).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Phone number'), '43210');
    await userEvent.click(screen.getByRole('button', { name: /Show Leaderboard/ }));

    await waitFor(() =>
      expect(submitScoreMock).toHaveBeenCalledWith(
        'arrange',
        { name: 'Radha', phone: '9876543210' },
        640
      )
    );
    expect(await screen.findByText('Meera')).toBeInTheDocument();
  });

  it('surfaces a storage failure instead of pretending the score was saved', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    submitScoreMock.mockRejectedValue(new Error('quota'));
    setCurrentPlayer({ name: 'Radha', phone: '9876543210' });

    renderPanel();

    expect(await screen.findByText(/isn't on the board/, {}, { timeout: 3000 })).toBeInTheDocument();
    (console.error as jest.Mock).mockRestore();
  });
});
