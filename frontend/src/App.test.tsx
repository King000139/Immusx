import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders FixLab Prediction header', () => {
  render(<App />);
  expect(screen.getByText(/FixLab Prediction/i)).toBeInTheDocument();
});

test('renders all four nav buttons', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Portfolio/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Wallet/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
});

test('renders Deposit button in header', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /Deposit funds/i })).toBeInTheDocument();
});

