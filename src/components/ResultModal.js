import React from 'react';
import { formatEther } from 'viem';

function ResultModal({ isOpen, onClose, isWin, amount }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center">
        {isWin ? (
          <>
            <h2 className="text-4xl font-bold text-green-400 mb-4">You Won!</h2>
            <p className="text-lg">You successfully cashed out:</p>
            <p className="text-2xl font-bold my-2">{formatEther(window.BigInt(amount))} ETH</p>
          </>
        ) : (
          <>
            <h2 className="text-4xl font-bold text-red-500 mb-4">Game Over</h2>
            <p className="text-lg">You hit a mine. Better luck next time!</p>
          </>
        )}
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

export default ResultModal;