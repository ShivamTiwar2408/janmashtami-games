import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayerForm, { formatPhone } from './PlayerForm';
import { clearCurrentPlayer, getCurrentPlayer, getRecentPlayers } from './scoreStore';

// jsdom has no IndexedDB; the recent-players query is stubbed so the form's own
// behaviour is what's under test.
jest.mock('./scoreStore', () => {
  const actual = jest.requireActual('./scoreStore');
  return { ...actual, getRecentPlayers: jest.fn() };
});

const recentMock = getRecentPlayers as jest.MockedFunction<typeof getRecentPlayers>;

beforeEach(() => {
  clearCurrentPlayer();
  recentMock.mockReset().mockResolvedValue([]);
});

const renderForm = (props = {}) =>
  render(<PlayerForm variant="inline" title="Who's playing?" onSubmit={jest.fn()} {...props} />);

it('groups the phone number as it is typed', () => {
  expect(formatPhone('9876543210')).toBe('98765 43210');
  expect(formatPhone('98765')).toBe('98765');
  expect(formatPhone('+91 9876543210')).toBe('98765 43210');
});

it('keeps submit disabled until both fields are valid', async () => {
  renderForm();
  const submit = () => screen.getByRole('button', { name: /Fill both|Start Playing/ });

  expect(submit()).toBeDisabled();

  await userEvent.type(screen.getByLabelText('Your name'), 'Radha');
  expect(submit()).toBeDisabled();

  await userEvent.type(screen.getByLabelText('Phone number'), '98765');
  expect(submit()).toBeDisabled();

  await userEvent.type(screen.getByLabelText('Phone number'), '43210');
  expect(submit()).toBeEnabled();
});

it('hands back a normalised player and remembers them', async () => {
  const onSubmit = jest.fn();
  renderForm({ onSubmit, submitLabel: 'Go' });

  await userEvent.type(screen.getByLabelText('Your name'), '  Radha Rani ');
  await userEvent.type(screen.getByLabelText('Phone number'), '9876543210');
  await userEvent.click(screen.getByRole('button', { name: /Go/ }));

  expect(onSubmit).toHaveBeenCalledWith({ name: 'Radha Rani', phone: '9876543210' });
  expect(getCurrentPlayer()).toEqual({ name: 'Radha Rani', phone: '9876543210' });
});

it('shows a digit count only once typing starts', async () => {
  renderForm();
  expect(screen.queryByText('0/10')).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Phone number'), '987');
  expect(screen.getByText('3/10')).toBeInTheDocument();
});

it('flags a short number without submitting', async () => {
  const onSubmit = jest.fn();
  renderForm({ onSubmit });

  await userEvent.type(screen.getByLabelText('Your name'), 'Gopal');
  await userEvent.type(screen.getByLabelText('Phone number'), '98765');
  // submit is disabled, so drive the form the way Enter would
  await userEvent.keyboard('{Enter}');

  expect(onSubmit).not.toHaveBeenCalled();
  expect(await screen.findByRole('alert')).toHaveTextContent('10-digit number');
  expect(screen.getByLabelText('Phone number')).toHaveAttribute('aria-invalid', 'true');
});

it('lets a returning player skip typing entirely', async () => {
  const onSubmit = jest.fn();
  recentMock.mockResolvedValue([{ name: 'Meera', phone: '9000000002' }]);
  renderForm({ onSubmit });

  const chip = await screen.findByRole('button', { name: /Meera/ });
  await userEvent.click(chip);

  expect(onSubmit).toHaveBeenCalledWith({ name: 'Meera', phone: '9000000002' });
  expect(getCurrentPlayer()).toEqual({ name: 'Meera', phone: '9000000002' });
});

it('omits the shortcuts when nobody has played yet', async () => {
  renderForm();
  await waitFor(() => expect(recentMock).toHaveBeenCalled());
  expect(screen.queryByText(/Tap your name/i)).not.toBeInTheDocument();
});
