import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../src/components/context/ThemeContext';
import { ToastProvider } from '../src/components/context/ToastContext';
import Topbar from '../src/components/ui/Topbar';
import TradingChart from '../src/components/ui/TradingChart';
import TradingPanel from '../src/components/ui/TradingPanel';
import AccountOverview from '../src/components/ui/AccountOverview';
import ModelStatus from '../src/components/ui/ModelStatus';

// Mock API calls
jest.mock('../src/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock chart library
jest.mock('lightweight-charts', () => ({
  createChart: jest.fn(() => ({
    addCandlestickSeries: jest.fn(() => ({
      setData: jest.fn(),
    })),
    timeScale: {
      fitContent: jest.fn(),
    },
    priceScale: {
      fitContent: jest.fn(),
    },
    resize: jest.fn(),
    remove: jest.fn(),
  })),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
    button: ({ children, ...props }: any) => React.createElement('button', props, children),
  },
  AnimatePresence: ({ children }: any) => React.createElement('div', {}, children),
}));

// Wrapper component for providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <ToastProvider>
      {children}
    </ToastProvider>
  </ThemeProvider>
);

describe('Topbar Component', () => {
  test('renders navigation links', () => {
    render(
      <TestWrapper>
        <Topbar />
      </TestWrapper>
    );
    
    // Check for navigation links - use getAllByText since there are multiple instances
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trading').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
  });

  test('renders theme switcher', () => {
    render(
      <TestWrapper>
        <Topbar />
      </TestWrapper>
    );
    
    // Look for theme toggle buttons by their titles
    expect(screen.getByTitle('Light')).toBeInTheDocument();
    expect(screen.getByTitle('Dark')).toBeInTheDocument();
    expect(screen.getByTitle('System')).toBeInTheDocument();
  });

  test('renders user menu', () => {
    render(
      <TestWrapper>
        <Topbar />
      </TestWrapper>
    );
    
    // Look for user menu button (empty name button)
    const userButtons = screen.getAllByRole('button');
    expect(userButtons.length).toBeGreaterThan(0);
  });
});

describe('TradingChart Component', () => {
  const mockData = [
    {
      openTime: 1640995200000,
      open: 30000,
      high: 30100,
      low: 29900,
      close: 30050,
      volume: 100
    }
  ];

  test('renders chart container', () => {
    render(
      <TestWrapper>
        <TradingChart data={mockData} symbol="BTCUSDT" />
      </TestWrapper>
    );
    
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
  });

  test('shows loading state initially', () => {
    render(
      <TestWrapper>
        <TradingChart data={[]} symbol="BTCUSDT" />
      </TestWrapper>
    );
    
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
  });
});

describe('TradingPanel Component', () => {
  const mockOnTradeSuccess = jest.fn();

  test('renders order form', () => {
    render(
      <TestWrapper>
        <TradingPanel symbol="BTCUSDT" onTradeSuccess={mockOnTradeSuccess} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Trading Panel')).toBeInTheDocument();
    expect(screen.getByText('Order Type')).toBeInTheDocument();
    expect(screen.getByText('Trade Side')).toBeInTheDocument();
    expect(screen.getByText('Amount (BTCUSDT)')).toBeInTheDocument();
  });

  test('handles order side change', () => {
    render(
      <TestWrapper>
        <TradingPanel symbol="BTCUSDT" onTradeSuccess={mockOnTradeSuccess} />
      </TestWrapper>
    );
    
    const buyButton = screen.getByText('BUY');
    const sellButton = screen.getByText('SELL');
    
    expect(buyButton).toHaveClass('bg-green-500');
    expect(sellButton).toHaveClass('bg-gray-100');
    
    fireEvent.click(sellButton);
    
    // After clicking sell, the button should have the active state
    expect(sellButton).toHaveClass('bg-red-500');
  });
});

describe('AccountOverview Component', () => {
  test('renders component', () => {
    render(
      <TestWrapper>
        <AccountOverview />
      </TestWrapper>
    );
    
    // Component shows loading skeleton initially - check for skeleton elements
    const skeletonElements = screen.getAllByRole('generic');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});

describe('ModelStatus Component', () => {
  test('renders component', () => {
    render(
      <TestWrapper>
        <ModelStatus />
      </TestWrapper>
    );
    
    // Component shows ML Model Status
    expect(screen.getByText('ML Model Status')).toBeInTheDocument();
    expect(screen.getByText('Start Training')).toBeInTheDocument();
  });
});

describe('Theme Context', () => {
  test('provides theme context', () => {
    render(
      <TestWrapper>
        <div data-testid="theme-test">Test</div>
      </TestWrapper>
    );
    
    expect(screen.getByTestId('theme-test')).toBeInTheDocument();
  });
});

describe('Toast Context', () => {
  test('provides toast context', () => {
    render(
      <TestWrapper>
        <div data-testid="toast-test">Test</div>
      </TestWrapper>
    );
    
    expect(screen.getByTestId('toast-test')).toBeInTheDocument();
  });
});
