import { bcs } from '@mysten/bcs';
import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, custom, defineChain, parseEther, formatEther } from 'viem';
import { publicActionsL2, walletActionsL2 } from 'viem/op-stack';
import MinesGameContract from './MinesGame.json';
import { Buffer } from 'buffer';

const MINES_GAME_CONTRACT_ADDRESS = '0x4e1403aC9aF1D0B19Af331e08cDc0Ee28EedDbB2'; // Make sure this is correct

export const umiDevnet = defineChain({
  id: 42069, sourceId: 42069, name: 'Umi Devnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://devnet.uminetwork.com'] } },
});

const FUNCTION_SERIALIZER = bcs.enum('SerializableTransactionData', {
  EoaBaseTokenTransfer: null, ScriptOrDeployment: null, EntryFunction: null, L2Contract: null,
  EvmContract: bcs.byteVector(),
});

const serializeFunctionCall = (data) => {
  const code = Uint8Array.from(Buffer.from(data.replace('0x', ''), 'hex'));
  const evmFunction = FUNCTION_SERIALIZER.serialize({ EvmContract: code }).toBytes();
  return '0x' + Buffer.from(evmFunction).toString('hex');
};

export const publicClient = () => createPublicClient({ chain: umiDevnet, transport: custom(window.ethereum) }).extend(publicActionsL2());
export const walletClient = () => createWalletClient({ chain: umiDevnet, transport: custom(window.ethereum) }).extend(walletActionsL2());
export const getAccount = async () => {
  const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return account;
};

const getContract = () => new ethers.Contract(MINES_GAME_CONTRACT_ADDRESS, MinesGameContract.abi);

export const getWalletBalance = async (address) => {
  if (!address) return '0';
  const balance = await publicClient().getBalance({ address });
  return formatEther(balance);
};

export const createStartGameTransaction = async (numberOfMines, betAmountInEth) => {
  const contract = getContract();
  const tx = await contract.startGame.populateTransaction(numberOfMines, { value: parseEther(betAmountInEth) });
  return { to: tx.to, data: serializeFunctionCall(tx.data), value: parseEther(betAmountInEth) };
};

export const createRevealTileTransaction = async (tileIndex) => {
  const contract = getContract();
  const tx = await contract.revealTile.populateTransaction(tileIndex);
  return { to: tx.to, data: serializeFunctionCall(tx.data) };
};

export const createCashOutTransaction = async () => {
  const contract = getContract();
  const tx = await contract.cashOut.populateTransaction();
  return { to: tx.to, data: serializeFunctionCall(tx.data) };
};

export const readGameStatus = async (playerAddress) => {
  const contract = getContract();
  const tx = await contract.getGameStatus.populateTransaction(playerAddress);
  const response = await publicClient().call({ to: tx.to, data: serializeFunctionCall(tx.data) });
  if (response.data) {
    const responseBytes = new Uint8Array(response.data);
    const decodedResult = contract.interface.decodeFunctionResult("getGameStatus", responseBytes);
    const game = decodedResult[0];
    return {
      player: game.player, betAmount: game.betAmount.toString(),
      totalMines: Number(game.totalMines), revealedSafeTiles: Number(game.revealedSafeTiles),
      revealedTiles: game.revealedTiles, mineLocations: game.mineLocations.map(loc => Number(loc)),
      isActive: game.isActive,
    };
  }
  return null;
};

// --- FIX: Added BCS serialization to this read-only call ---
export const getSharedPoolBalance = async () => {
  const contract = getContract();
  const populatedTx = await contract.getSharedPoolBalance.populateTransaction();
  
  const response = await publicClient().call({
    to: populatedTx.to,
    data: serializeFunctionCall(populatedTx.data)
  });

  const responseBytes = new Uint8Array(response.data);
  const decodedResult = contract.interface.decodeFunctionResult("getSharedPoolBalance", responseBytes);

  return decodedResult[0];
};

// --- FIX: Added BCS serialization to this read-only call ---
export const calculateCurrentWinnings = async (gameData) => {
  if (!gameData || gameData.revealedSafeTiles === 0) return 0n;
  
  const contract = getContract();
  const populatedTx = await contract.calculateWinnings.populateTransaction(
    gameData.betAmount,
    gameData.totalMines,
    gameData.revealedSafeTiles
  );
  
  const response = await publicClient().call({
    to: populatedTx.to,
    data: serializeFunctionCall(populatedTx.data),
  });

  const responseBytes = new Uint8Array(response.data);
  const decodedResult = contract.interface.decodeFunctionResult("calculateWinnings", responseBytes);
  
  return decodedResult[0];
};