import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  FormControl, 
  Grid, 
  InputLabel, 
  MenuItem, 
  Select, 
  TextField, 
  Typography, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../lib/api';

const BacktestingPanel = () => {
  // Form state
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [initialBalance, setInitialBalance] = useState(10000);
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [stopLossPct, setStopLossPct] = useState(2);
  const [takeProfitPct, setTakeProfitPct] = useState(4);
  
  // Data state
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [availableIntervals, setAvailableIntervals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);
  
  // Fetch available symbols and intervals
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [symbolsResponse, intervalsResponse] = await Promise.all([
          api.get('/backtesting/symbols'),
          api.get('/backtesting/intervals')
        ]);
        
        if (symbolsResponse.data.success) {
          setAvailableSymbols(symbolsResponse.data.symbols);
        }
        
        if (intervalsResponse.data.success) {
          setAvailableIntervals(intervalsResponse.data.intervals);
        }
      } catch (err) {
        console.error('Error fetching backtesting options:', err);
        setError('Failed to load backtesting options');
      }
    };
    
    fetchData();
  }, []);
  
  const handleRunBacktest = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      const response = await api.post('/backtesting/run', {
        symbol,
        interval,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        initial_balance: initialBalance,
        risk_per_trade: riskPerTrade / 100, // Convert from percentage to decimal
        stop_loss_pct: stopLossPct / 100,
        take_profit_pct: takeProfitPct / 100
      });
      
      if (response.data.success) {
        setResults(response.data);
      } else {
        setError(response.data.error || 'Backtest failed');
      }
    } catch (err: any) {
      console.error('Backtest error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare chart data
  const prepareBalanceChartData = () => {
    if (!results || !results.trades || results.trades.length === 0) return [];
    
    const data = [{ timestamp: 0, balance: results.initial_balance }];
    
    results.trades.forEach((trade: any, index: number) => {
      if (trade.status === 'CLOSED') {
        data.push({
          timestamp: trade.timestamp,
          balance: trade.balance_after,
          date: new Date(trade.timestamp).toLocaleDateString()
        });
      }
    });
    
    return data;
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Backtesting Engine
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Test your trading strategy on historical data to evaluate performance
      </Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backtest Configuration
          </Typography>
          
          <Grid container spacing={3}>
            {/* Symbol Selection */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Trading Pair</InputLabel>
                <Select
                  value={symbol}
                  label="Trading Pair"
                  onChange={(e) => setSymbol(e.target.value)}
                >
                  {availableSymbols.map((sym) => (
                    <MenuItem key={sym} value={sym}>{sym}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Interval Selection */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Timeframe</InputLabel>
                <Select
                  value={interval}
                  label="Timeframe"
                  onChange={(e) => setInterval(e.target.value)}
                >
                  {availableIntervals.map((int) => (
                    <MenuItem key={int} value={int}>{int}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Date Range */}
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            
            {/* Trading Parameters */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Initial Balance (USDT)"
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
                InputProps={{ inputProps: { min: 100 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Risk Per Trade (%)"
                type="number"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                InputProps={{ inputProps: { min: 0.1, max: 10, step: 0.1 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Stop Loss (%)"
                type="number"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(Number(e.target.value))}
                InputProps={{ inputProps: { min: 0.5, max: 10, step: 0.1 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Take Profit (%)"
                type="number"
                value={takeProfitPct}
                onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                InputProps={{ inputProps: { min: 0.5, max: 20, step: 0.1 } }}
              />
            </Grid>
            
            {/* Run Button */}
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRunBacktest}
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} color="inherit" />}
                sx={{ mt: 2 }}
              >
                {loading ? 'Running Backtest...' : 'Run Backtest'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Results */}
      {results && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Backtest Results
          </Typography>
          
          {/* Summary Card */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Initial Balance
                  </Typography>
                  <Typography variant="h6">
                    ${results.initial_balance.toFixed(2)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Final Balance
                  </Typography>
                  <Typography variant="h6">
                    ${results.final_balance.toFixed(2)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Profit/Loss
                  </Typography>
                  <Typography 
                    variant="h6" 
                    color={results.profit_loss >= 0 ? 'success.main' : 'error.main'}
                  >
                    ${results.profit_loss.toFixed(2)} ({results.profit_loss_pct.toFixed(2)}%)
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Trades
                  </Typography>
                  <Typography variant="h6">
                    {results.metrics?.total_trades || 0}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Win Rate
                  </Typography>
                  <Typography variant="h6">
                    {((results.metrics?.win_rate || 0) * 100).toFixed(2)}%
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Profit Factor
                  </Typography>
                  <Typography variant="h6">
                    {results.metrics?.profit_factor?.toFixed(2) || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Max Drawdown
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {((results.metrics?.max_drawdown || 0) * 100).toFixed(2)}%
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sharpe Ratio
                  </Typography>
                  <Typography variant="h6">
                    {results.metrics?.sharpe_ratio?.toFixed(2) || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          {/* Balance Chart */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Balance History
              </Typography>
              
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={prepareBalanceChartData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Balance']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      name="Account Balance"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
          
          {/* Trades Table */}
          {results.trades && results.trades.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Trade History
                </Typography>
                
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Side</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>P/L</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.trades.map((trade: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(trade.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Typography 
                              color={trade.side === 'BUY' ? 'success.main' : 'error.main'}
                              fontWeight="bold"
                            >
                              {trade.side}
                            </Typography>
                          </TableCell>
                          <TableCell>${trade.price.toFixed(2)}</TableCell>
                          <TableCell>{trade.quantity.toFixed(6)}</TableCell>
                          <TableCell>${trade.value.toFixed(2)}</TableCell>
                          <TableCell>
                            {trade.pnl ? (
                              <Typography 
                                color={trade.pnl >= 0 ? 'success.main' : 'error.main'}
                              >
                                ${trade.pnl.toFixed(2)} 
                                {trade.pnl_pct && `(${trade.pnl_pct.toFixed(2)}%)`}
                              </Typography>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{trade.status}</TableCell>
                          <TableCell>{trade.reason || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
};

export default BacktestingPanel;