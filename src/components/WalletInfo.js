import React from 'react';

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

function WalletInfo({ account, onDisconnect }) {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-gray-800 text-white px-4 py-2 rounded-lg font-mono">
        {truncateAddress(account)}
      </div>
      <button
        onClick={onDisconnect}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
      >
        Disconnect
      </button>
    </div>
  );
}

export default WalletInfo;