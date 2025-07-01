import React, { useState, useEffect, useCallback } from 'react';
import {
  getAccount,
  walletClient,
  publicClient,
  createStartGameTransaction,
  createRevealTileTransaction,
  createCashOutTransaction,
  readGameStatus
} from '../config.js';
import { formatEther, parseEther } from 'viem';
import Tile from './Tile.js';

const GRID_SIZE = 25;

function Game() {
  const [account, setAccount] = useState(null);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true); // Start loading on initial mount
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  // Form inputs
  const [betAmount, setBetAmount] = useState('0.1');
  const [mineCount, setMineCount] = useState(5);

  // --- FIX #2: Check for existing wallet connection on every page load ---
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (err) {
        console.error("Could not check for existing connection:", err);
      } finally {
        // We stop loading after the initial check, even if not connected
        setLoading(false);
      }
    };
    checkExistingConnection();
  }, []);


  const fetchGameStatus = useCallback(async () => {
    if (!account) {
      setGame(null); // Clear game state if no account
      return;
    }
    setLoading(true);
    setError('');
    try {
      const status = await readGameStatus(account);
      if (status && status.isActive) {
        setGame(status);
      } else {
        setGame(null); // Explicitly set to null if no active game found
      }
    } catch (err) {
      console.error("Error fetching game status:", err);
      setError("Could not fetch game status. The network may be busy.");
      setGame(null);
    } finally {
      setLoading(false);
    }
  }, [account]);

  // --- FIX #2 (continued): Fetch game status whenever the account changes ---
  useEffect(() => {
    fetchGameStatus();
  }, [fetchGameStatus]);


  const connectWallet = async () => {
    setLoading(true);
    try {
      const acc = await getAccount();
      setAccount(acc);
    } catch (err) {
      setError("Failed to connect wallet.");
      console.error(err);
    }
    setLoading(false);
  };

  // --- FIX #1: Create a dedicated start game handler for optimistic updates ---
  const handleStartGame = async () => {
    if (mineCount < 1 || mineCount > 24) {
      setError("Mines must be between 1 and 24.");
      return;
    }
    setError('');
    setNotification('');
    setLoading(true);

    try {
      const tx = await createStartGameTransaction(mineCount, betAmount);
      const hash = await walletClient().sendTransaction({ ...tx, account });
      setNotification('Game started! Waiting for confirmation...');
      
      const receipt = await publicClient().waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setNotification('Transaction confirmed! Your game is ready.');
        
        // --- OPTIMISTIC UPDATE ---
        // Don't wait for a refetch. Create a preliminary game object to update the UI instantly.
        const optimisticGame = {
            isActive: true,
            betAmount: parseEther(betAmount).toString(),
            totalMines: mineCount,
            revealedSafeTiles: 0,
            revealedTiles: Array(GRID_SIZE).fill(false),
            mineLocations: [] // We don't know mine locations on the frontend
        };
        setGame(optimisticGame);

      } else {
        setError('Start game transaction failed. Please check your wallet.');
      }
    } catch (err) {
      console.error(err);
      setError(err.shortMessage || err.message);
    } finally {
      setLoading(false);
      // We can still refetch in the background to ensure data consistency
      setTimeout(fetchGameStatus, 1000); 
    }
  };

  // Generic handler for other transactions like reveal and cashout
  const handleTx = async (txPromise) => {
    setError('');
    setNotification('');
    setLoading(true);
    try {
      const tx = await txPromise;
      const hash = await walletClient().sendTransaction({ ...tx, account });
      setNotification('Transaction sent! Waiting for confirmation...');
      await publicClient().waitForTransactionReceipt({ hash });
      setNotification('Transaction confirmed!');
    } catch (err) {
      console.error(err);
      setError(err.shortMessage || err.message);
    } finally {
      setLoading(false);
      // Always refetch state after a reveal or cashout
      fetchGameStatus();
    }
  };

  const onRevealTile = (index) => handleTx(createRevealTileTransaction(index));
  const onCashOut = () => handleTx(createCashOutTransaction());

  if (loading && !game) {
      return <div className="text-center text-white text-xl animate-pulse">Loading Game...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-xl">
      <h1 className="text-4xl font-bold text-center mb-4">Umi Mines</h1>

      {account ? (
        <p className="text-center text-sm text-gray-400 mb-6">Connected: {account}</p>
      ) : (
        <div className="text-center">
          <button onClick={connectWallet} disabled={loading} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold disabled:bg-gray-500">
            Connect Wallet
          </button>
        </div>
      )}

      {error && <p className="text-center text-red-500 my-2">{error}</p>}
      {notification && <p className="text-center text-blue-400 my-2">{notification}</p>}
      
      {account && (
        <>
          {game && game.isActive ? (
            // Game is active, show the grid
            <div className="mt-6">
              <div className="flex flex-wrap justify-between items-center bg-gray-800 p-4 rounded-lg mb-4 gap-4">
                <div>
                  <p className="text-gray-400">Bet Amount</p>
                  <p className="text-xl font-bold">{formatEther(window.BigInt(game.betAmount))} ETH</p>
                </div>
                <div>
                  <p className="text-gray-400">Mines</p>
                  <p className="text-xl font-bold">{game.totalMines}</p>
                </div>
                 <div>
                  <p className="text-gray-400">Safe Tiles Found</p>
                  <p className="text-xl font-bold">{game.revealedSafeTiles}</p>
                </div>
                <button
                  onClick={onCashOut}
                  disabled={loading || game.revealedSafeTiles === 0}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  Cash Out
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 justify-center">
                {Array.from({ length: GRID_SIZE }).map((_, i) => (
                  <Tile
                    key={i}
                    index={i}
                    isRevealed={game.revealedTiles[i]}
                    onReveal={onRevealTile}
                  />
                ))}
              </div>
            </div>
          ) : (
            // No active game, show setup screen
            <div className="mt-6 p-6 bg-gray-800 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-center">Start a New Game</h2>
              <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                <div>
                  <label htmlFor="bet" className="block mb-1 text-sm font-medium text-gray-300">Bet Amount (ETH)</label>
                  <input
                    id="bet"
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg p-2 text-white border border-gray-600 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="mines" className="block mb-1 text-sm font-medium text-gray-300">Number of Mines (1-24)</label>
                  <input
                    id="mines"
                    type="number"
                    value={mineCount}
                    onChange={(e) => setMineCount(parseInt(e.target.value))}
                    className="w-full bg-gray-700 rounded-lg p-2 text-white border border-gray-600 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={handleStartGame}
                  disabled={loading}
                  className="self-end px-8 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold disabled:bg-gray-500"
                >
                  {loading ? 'Processing...' : 'Start Game'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Game;