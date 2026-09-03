import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameIntro from './GameIntro';
import { clearCurrentPlayer, getLeaderboard, getRecentPlayers } from './scoreStore';

// jsdom has no IndexedDB, so the two reads this screen makes are stubbed.
jest.mock('./scoreStore', () => {
  const actual = jest.requireActual('./scoreStore');
  return { ...actual, getLeaderboard: jest.fn(), getRecentPlayers: jest.fn() };
});

const boardMock = getLeaderboard as jest.MockedFunction<typeof getLeaderboard>;
const recentMock = getRecentPlayers as jest.MockedFunction<typeof getRecentPlayers>;

beforeEach(() => {
  clearCurrentPlayer();
  boardMock.mockReset().mockResolvedValue([]);
  recentMock.mockReset().mockResolvedValue([]);
});

const renderIntro = (props = {}) =>
  render(
    <GameIntro
      gameId="test-game"
      emoji="🪈"
      title="Test Game"
      tagline="A tagline"
      onStart={jest.fn()}
      onBack={jest.fn()}
      {...props}
    />
  );

const enterDetails = async () => {
  await userEvent.type(screen.getByLabelText('Your name'), 'Radha');
  await userEvent.type(screen.getByLabelText('Phone number'), '9876543210');
};

it('takes details before the game starts', async () => {
  const onStart = jest.fn();
  renderIntro({ onStart, ctaLabel: 'Play Now' });

  await userEvent.click(screen.getByRole('button', { name: /Play Now/ }));
  expect(onStart).not.toHaveBeenCalled();

  await enterDetails();
  // Scoped to the modal: the attract CTA behind it carries the same label.
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Play Now/ }));

  expect(onStart).toHaveBeenCalledTimes(1);
});

it('opens the details form on Enter, for a big screen with a keyboard', async () => {
  renderIntro();
  await userEvent.keyboard('{Enter}');
  expect(await screen.findByLabelText('Your name')).toBeInTheDocument();
});

it('Back leaves without starting anything', async () => {
  const onBack = jest.fn();
  const onStart = jest.fn();
  renderIntro({ onBack, onStart });

  await userEvent.click(screen.getByRole('button', { name: /Back/ }));

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onStart).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();
});

it('lists every player who has scored, not just the podium', async () => {
  const row = (name: string, best: number) => ({
    id: `test-game|${best}|${name}`,
    gameId: 'test-game',
    name,
    phone: '9000000000',
    best,
    lastScore: best,
    plays: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  boardMock.mockResolvedValue([
    row('Meera', 400),
    row('Gopal', 300),
    row('Nanda', 200),
    row('Yashoda', 100),
  ]);

  renderIntro();

  expect(await screen.findByText(/Meera/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/Nanda/)).toBeInTheDocument());
  // The fourth-placed player is on the board too — it scrolls rather than cuts.
  expect(screen.getByText(/Yashoda/)).toBeInTheDocument();
  expect(screen.getByText(/4 players/)).toBeInTheDocument();
});
