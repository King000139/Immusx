import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders FixLab Prediction header', () => {
  render(<App />);
  expect(screen.getByText(/FixLab Prediction/i)).toBeInTheDocument();
});

test('renders Markets navigation button', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /Markets/i })).toBeInTheDocument();
});

test('renders Admin navigation button', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
});
