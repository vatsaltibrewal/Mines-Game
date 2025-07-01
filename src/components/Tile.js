import React from 'react';

// A simple diamond or bomb SVG for demonstration
const Diamond = () => <span role="img" aria-label="diamond">💎</span>;
const Bomb = () => <span role="img" aria-label="bomb">💣</span>;

function Tile({ index, isRevealed, isMine, onReveal }) {
  const handleClick = () => {
    if (!isRevealed) {
      onReveal(index);
    }
  };

  // Styling for the tile
  const baseStyle = 'w-16 h-16 sm:w-20 sm:h-20 border-2 rounded-lg flex items-center justify-center text-4xl cursor-pointer transition-all duration-300';
  const revealedStyle = 'bg-gray-700 border-gray-600';
  const hiddenStyle = 'bg-blue-600 hover:bg-blue-500 border-blue-400';
  const bombStyle = 'bg-red-500 border-red-400';

  let style = isRevealed ? revealedStyle : hiddenStyle;
  if (isRevealed && isMine) {
    style = bombStyle;
  }

  return (
    <div className={`${baseStyle} ${style}`} onClick={handleClick}>
      {isRevealed && (isMine ? <Bomb /> : <Diamond />)}
    </div>
  );
}

export default Tile;