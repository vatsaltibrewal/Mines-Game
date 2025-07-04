import React, { useState, useEffect, useCallback } from 'react';
import {
  getAccount, walletClient, publicClient,
  createStartGameTransaction, createRevealTileTransaction, createCashOutTransaction,
  readGameStatus, getWalletBalance, calculateCurrentWinnings, getSharedPoolBalance // <-- Import the new function
} from '../config';
import { formatEther, parseEther } from 'viem';
import Tile from './Tile';
import ResultModal from './ResultModal';
import WalletInfo from './WalletInfo';

const GRID_SIZE = 25;

function Game() {
  const [account, setAccount] = useState(null);
  const [walletBalance, setWalletBalance] = useState('0');
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveProfit, setLiveProfit] = useState('0');
  const [betAmount, setBetAmount] = useState('0.1');
  const [mineCount, setMineCount] = useState(3);
  const [pendingTile, setPendingTile] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, isWin: false, amount: '0' });

  // --- FIX: This function now fetches ALL data and performs the capped profit calculation ---
  const fetchAndUpdateState = useCallback(async (acc) => {
    if (!acc) return;
    try {
      // Fetch all required data concurrently for speed
      const [walletBal, status, poolBalanceBN] = await Promise.all([
        getWalletBalance(acc),
        readGameStatus(acc),
        getSharedPoolBalance()
      ]);

      setWalletBalance(walletBal);

      if (status && status.isActive) {
          setGame(status);

          // --- Capped Profit Logic ---
          const theoreticalProfitBN = await calculateCurrentWinnings(status);
          const betAmountBN = window.BigInt(status.betAmount);
          const theoreticalPayoutBN = betAmountBN + theoreticalProfitBN;
          
          let actualPayoutBN;
          // The contract's balance *before* this bet was placed is the relevant cap
          const effectivePoolBalance = poolBalanceBN - betAmountBN;

          if (theoreticalPayoutBN > effectivePoolBalance) {
            actualPayoutBN = effectivePoolBalance;
          } else {
            actualPayoutBN = theoreticalPayoutBN;
          }
          
          let actualProfitBN = actualPayoutBN - betAmountBN;
          if (actualProfitBN < 0n) {
            actualProfitBN = 0n; // Profit cannot be negative
          }
          
          setLiveProfit(actualProfitBN.toString());

      } else {
          setGame(null);
          setLiveProfit('0');
      }
      return status;
    } catch (err) {
      console.error("Error fetching wallet data:", err);
    }
  }, []);

  const connectWallet = async () => {
    try {
      const acc = await getAccount();
      setAccount(acc);
      await fetchAndUpdateState(acc);
    } catch (err) { console.error("Failed to connect wallet", err); }
  };
  
  const handleDisconnect = () => {
      setAccount(null);
      setGame(null);
      setWalletBalance('0');
      setLiveProfit('0');
  };

  const onStartGame = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const tx = await createStartGameTransaction(mineCount, betAmount);
      const hash = await walletClient().sendTransaction({ ...tx, account });
      await publicClient().waitForTransactionReceipt({ hash });
      await fetchAndUpdateState(account);
    } catch (err) { 
        console.error("Start game failed:", err);
        setGame(null);
    } finally {
        setLoading(false);
    }
  };
  
  const onRevealTile = async (index) => {
    if (!game?.isActive || loading || pendingTile !== null) return;
    setPendingTile(index);
    try {
      const tx = await createRevealTileTransaction(index);
      const hash = await walletClient().sendTransaction({ ...tx, account });
      await publicClient().waitForTransactionReceipt({ hash });
      const newStatus = await fetchAndUpdateState(account);
      if (!newStatus || !newStatus.isActive) {
        setModalState({ isOpen: true, isWin: false, amount: '0' });
      }
    } catch (err) { 
        console.error("Reveal transaction failed:", err);
    } finally {
      setPendingTile(null);
    }
  };

  const onCashOut = async () => {
    if (!game || game.revealedSafeTiles === 0) return;
    
    // The `liveProfit` state is now the correctly capped value, so this is accurate.
    const expectedPayout = (window.BigInt(game.betAmount) + window.BigInt(liveProfit)).toString();

    setLoading(true);
    try {
      const tx = await createCashOutTransaction();
      const hash = await walletClient().sendTransaction({ ...tx, account });
      await publicClient().waitForTransactionReceipt({ hash });
      await fetchAndUpdateState(account);
      setModalState({ isOpen: true, isWin: true, amount: expectedPayout });
    } catch (err) { 
      console.error("Cashout failed:", err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-[#1a2c38] p-8 rounded-2xl shadow-2xl w-full max-w-5xl">
      <ResultModal {...modalState} onClose={() => setModalState({ isOpen: false, isWin: false, amount: '0' })} />
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-white">MineRush</h1>
        {account ? (
            <div className="flex items-center gap-6">
                <div className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                    <span>💰</span>
                    <span>{parseFloat(walletBalance).toFixed(4)} ETH</span>
                </div>
                <WalletInfo account={account} onDisconnect={handleDisconnect} />
            </div>
        ) : (
            <button onClick={connectWallet} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
              Connect Wallet
            </button>
        )}
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0f212e] p-6 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-400">Bet Amount</label>
              <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={game?.isActive || loading} className="w-full bg-gray-800 text-white rounded-md p-2 mt-1"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400">Mines</label>
              <select value={mineCount} onChange={e => setMineCount(parseInt(e.target.value))} disabled={game?.isActive || loading} className="w-full bg-gray-800 text-white rounded-md p-2 mt-1">
                {[...Array(24).keys()].map(i => i + 1).map(num => <option key={num} value={num}>{num}</option>)}
              </select>
            </div>
            {game?.isActive ? (
                <button onClick={onCashOut} disabled={loading || game.revealedSafeTiles === 0 || pendingTile !== null} className="w-full py-3 bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg text-lg disabled:bg-gray-500">
                  Cashout
                </button>
            ) : (
                <button onClick={onStartGame} disabled={loading || !account} className="w-full py-3 bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg text-lg disabled:bg-gray-500">
                  Bet
                </button>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-2 grid grid-cols-5 gap-4">
          {Array.from({ length: GRID_SIZE }).map((_, i) => (
            <Tile 
              key={i} 
              index={i} 
              isRevealed={game?.revealedTiles?.[i]}
              isMine={false}
              onReveal={() => onRevealTile(i)}
              isPending={pendingTile === i}
              disabled={!game?.isActive || loading || pendingTile !== null || game?.revealedTiles?.[i]}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default Game;