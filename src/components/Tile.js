import React from 'react';

const Diamond = () => <span role="img" aria-label="diamond">💎</span>;
const Bomb = () => <span role="img" aria-label="bomb">💣</span>;

const Spinner = () => (
  <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-600 rounded-full animate-spin"></div>
);

// --- FIX: Add `isPending` prop ---
function Tile({ index, isRevealed, isMine, onReveal, disabled, isPending }) {
  const handleClick = () => {
    if (disabled || isRevealed || isPending) {
      return;
    }
    onReveal(index);
  };

  const baseStyle = 'w-16 h-16 sm:w-20 sm:h-20 border-2 rounded-lg flex items-center justify-center text-4xl transition-all duration-300';
  const revealedStyle = 'bg-gray-700 border-gray-600';
  const activeStyle = 'bg-blue-600 hover:bg-blue-500 border-blue-400 cursor-pointer';
  const disabledStyle = 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed';
  const bombStyle = 'bg-red-500 border-red-400';
  const pendingStyle = 'bg-blue-800 border-blue-600 cursor-wait';

  let style;
  if (isPending) {
    style = pendingStyle;
  } else if (disabled && !isRevealed) {
    style = disabledStyle;
  } else if (isRevealed) {
    style = isMine ? bombStyle : revealedStyle;
  } else {
    style = activeStyle;
  }
  
  const content = () => {
      if (isPending) return <Spinner />;
      if (isRevealed) return isMine ? <Bomb /> : <Diamond />;
      return null;
  };

  return (
    <div className={`${baseStyle} ${style}`} onClick={handleClick}>
      {content()}
    </div>
  );
}

export default Tile;