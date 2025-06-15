import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { TonClient, Address } from "@ton/ton";
import { toNano, beginCell } from '@ton/core';

// Zaktualizowane adresy z Twojego ostatniego wdrożenia
const STAKING_FARM_ADDRESS = "EQC8MN1ykQZtHHHrWHGSOFyMB7tihHyL3paweoV8DFcJ7V3g";
const NFT_COLLECTION_ADDRESS = "EQA1W7wNN-dwYQIcfUZXk8BEZsNGlGiWB3sskFrYLPZis36m";

// Konfiguracja typów sprzętu
const EQUIPMENT_TYPES = {
    basic: {
        name: "Basic GPU",
        emoji: "🖥️",
        hashPower: 100,
        price: 0, // Za darmo
        level: 1,
        description: "Podstawowy sprzęt do kopania",
        coinsPerSecond: 0.01
    },
    advanced: {
        name: "Advanced ASIC",
        emoji: "⚡",
        hashPower: 500,
        price: 0.5,
        level: 2,
        description: "Profesjonalny miner ASIC",
        coinsPerSecond: 0.05
    },
    quantum: {
        name: "Quantum Miner",
        emoji: "🚀",
        hashPower: 2000,
        price: 2.0,
        level: 3,
        description: "Futurystyczny quantum processor",
        coinsPerSecond: 0.2
    },
    fusion: {
        name: "Fusion Core",
        emoji: "🌟",
        hashPower: 10000,
        price: 10.0,
        level: 4,
        description: "Najlepszy sprzęt w galaktyce",
        coinsPerSecond: 1.0
    }
};

// Achievements system
const ACHIEVEMENTS = {
    firstMiner: { name: "First Steps", emoji: "👶", description: "Kup swój pierwszy sprzęt", requirement: 1 },
    powerUser: { name: "Power User", emoji: "💪", description: "Osiągnij 1000 H/s", requirement: 1000 },
    tycoon: { name: "Mining Tycoon", emoji: "👑", description: "Osiągnij 10000 H/s", requirement: 10000 },
    collector: { name: "Collector", emoji: "🎒", description: "Posiadaj 5 NFT", requirement: 5 },
    millionaire: { name: "Millionaire", emoji: "💎", description: "Zarobić 1000 TMT", requirement: 1000 }
};

// Daily rewards configuration
const DAILY_REWARDS = [
    { day: 1, reward: 10, type: "coins", emoji: "💰", name: "10 TMT" },
    { day: 2, reward: 20, type: "coins", emoji: "💰", name: "20 TMT" },
    { day: 3, reward: 50, type: "coins", emoji: "💰", name: "50 TMT" },
    { day: 4, reward: 100, type: "coins", emoji: "💰", name: "100 TMT" },
    { day: 5, reward: 0.1, type: "ton", emoji: "💎", name: "0.1 TON" },
    { day: 6, reward: 200, type: "coins", emoji: "💰", name: "200 TMT" },
    { day: 7, reward: 1, type: "nft", emoji: "🎁", name: "Free NFT" }
];

// Lucky wheel prizes
const WHEEL_PRIZES = [
    { id: 1, name: "5 TMT", emoji: "💰", value: 5, type: "coins", color: "bg-green-500" },
    { id: 2, name: "10 TMT", emoji: "💰", value: 10, type: "coins", color: "bg-blue-500" },
    { id: 3, name: "25 TMT", emoji: "💰", value: 25, type: "coins", color: "bg-purple-500" },
    { id: 4, name: "50 TMT", emoji: "💰", value: 50, type: "coins", color: "bg-yellow-500" },
    { id: 5, name: "100 TMT", emoji: "🎯", value: 100, type: "coins", color: "bg-orange-500" },
    { id: 6, name: "0.05 TON", emoji: "💎", value: 0.05, type: "ton", color: "bg-cyan-500" },
    { id: 7, name: "NFT", emoji: "🎁", value: 1, type: "nft", color: "bg-pink-500" },
    { id: 8, name: "Jackpot!", emoji: "🏆", value: 500, type: "coins", color: "bg-gradient-to-r from-yellow-400 to-yellow-600" }
];

// Mock leaderboard data (w prawdziwej aplikacji byłoby z backend)
const MOCK_LEADERBOARD = [
    { name: "CryptoKing", hashPower: 50000, level: 4, avatar: "👑" },
    { name: "MinerPro", hashPower: 25000, level: 4, avatar: "⚡" },
    { name: "HashMaster", hashPower: 15000, level: 3, avatar: "🚀" },
    { name: "BitDigger", hashPower: 8000, level: 3, avatar: "⛏️" },
    { name: "TonFan", hashPower: 5000, level: 2, avatar: "💎" }
];

// Komponenty pomocnicze
function AnimatedNumber({ value, suffix = "", prefix = "" }) {
    const [displayValue, setDisplayValue] = useState(value);
    
    useEffect(() => {
        if (value !== displayValue) {
            const duration = 1000; // 1 sekunda animacji
            const steps = 30;
            const stepValue = (value - displayValue) / steps;
            const stepTime = duration / steps;
            
            let currentStep = 0;
            const timer = setInterval(() => {
                currentStep++;
                if (currentStep >= steps) {
                    setDisplayValue(value);
                    clearInterval(timer);
                } else {
                    setDisplayValue(prev => prev + stepValue);
                }
            }, stepTime);
            
            return () => clearInterval(timer);
        }
    }, [value, displayValue]);
    
    return (
        <span className="font-bold text-yellow-400 transition-all duration-300">
            {prefix}{displayValue.toFixed(4)}{suffix}
        </span>
    );
}

function CountdownTimer({ seconds, onComplete }) {
    const [timeLeft, setTimeLeft] = useState(seconds);
    
    useEffect(() => {
        if (timeLeft <= 0) {
            onComplete();
            return;
        }
        
        const timer = setTimeout(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [timeLeft, onComplete]);
    
    return (
        <span className="text-xs text-blue-300">
            ⏱️ Następne odświeżenie: {timeLeft}s
        </span>
    );
}

function DailyRewardCard({ reward, day, isClaimed, isToday, onClaim }) {
    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
            isClaimed 
                ? 'bg-gray-600/30 border-gray-500/50 opacity-60' 
                : isToday
                    ? 'bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border-amber-400/70 shadow-lg shadow-amber-500/30 animate-pulse'
                    : 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/50'
        }`}>
            <div className="text-center">
                <div className="text-3xl mb-2">{reward.emoji}</div>
                <p className="font-bold text-white text-sm">Dzień {day}</p>
                <p className="text-xs text-gray-300 mb-3">{reward.name}</p>
                
                {isClaimed ? (
                    <div className="py-2 px-4 bg-gray-600 rounded-lg">
                        <span className="text-gray-300 text-sm">✅ Odebrano</span>
                    </div>
                ) : isToday ? (
                    <button 
                        onClick={() => onClaim(reward)}
                        className="w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-bold rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        🎁 Odbierz
                    </button>
                ) : (
                    <div className="py-2 px-4 bg-gray-700 rounded-lg">
                        <span className="text-gray-400 text-sm">🔒 Zablokowane</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function LuckyWheel({ prizes, onSpin, isSpinning, canSpin }) {
    const [rotation, setRotation] = useState(0);
    
    const handleSpin = () => {
        if (!canSpin || isSpinning) return;
        
        const spins = 5 + Math.random() * 5; // 5-10 pełnych obrotów
        const finalRotation = rotation + spins * 360 + Math.random() * 360;
        
        setRotation(finalRotation);
        
        setTimeout(() => {
            const prizeIndex = Math.floor(Math.random() * prizes.length);
            onSpin(prizes[prizeIndex]);
        }, 3000);
    };
    
    return (
        <div className="text-center">
            <div className="relative w-64 h-64 mx-auto mb-6">
                {/* Wheel */}
                <div 
                    className={`w-full h-full rounded-full border-8 border-yellow-400 transition-transform duration-3000 ease-out ${isSpinning ? 'animate-spin' : ''}`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                        {prizes.map((prize, index) => {
                            const angle = (360 / prizes.length) * index;
                            return (
                                <div
                                    key={prize.id}
                                    className={`absolute w-full h-full ${prize.color}`}
                                    style={{
                                        clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((angle + 360/prizes.length) * Math.PI / 180)}% ${50 - 50 * Math.sin((angle + 360/prizes.length) * Math.PI / 180)}%)`
                                    }}
                                >
                                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                                        <div className="text-xl">{prize.emoji}</div>
                                        <div className="text-xs font-bold">{prize.name}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-yellow-400"></div>
                </div>
            </div>
            
            <button
                onClick={handleSpin}
                disabled={!canSpin || isSpinning}
                className={`py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                    canSpin && !isSpinning
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                }`}
            >
                {isSpinning ? "🎰 Kręci się..." : canSpin ? "🎰 Zakręć kołem!" : "⏰ Przyjdź jutro"}
            </button>
        </div>
    );
}

function LeaderboardItem({ player, rank, isCurrentPlayer = false }) {
    const getRankEmoji = (rank) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return `#${rank}`;
    };

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
            isCurrentPlayer 
                ? 'bg-gradient-to-r from-amber-600/30 to-yellow-600/30 border border-amber-500/50 shadow-lg shadow-amber-500/20' 
                : 'bg-gradient-to-r from-gray-600/20 to-gray-500/20 hover:from-gray-600/30 hover:to-gray-500/30'
        }`}>
            <div className="flex items-center gap-3">
                <span className="text-xl font-bold">{getRankEmoji(rank)}</span>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                        <p className={`font-semibold ${isCurrentPlayer ? 'text-amber-300' : 'text-white'}`}>
                            {player.name} {isCurrentPlayer && "(Ty)"}
                        </p>
                        <p className="text-xs text-gray-400">Poziom {player.level}</p>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-cyan-400">{player.hashPower.toLocaleString()} H/s</p>
            </div>
        </div>
    );
}

function AchievementBadge({ achievement, isUnlocked, progress = 0 }) {
    return (
        <div className={`p-3 rounded-lg border transition-all duration-300 ${
            isUnlocked 
                ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/50 shadow-lg shadow-green-500/20' 
                : 'bg-gradient-to-r from-gray-600/10 to-gray-500/10 border-gray-500/30'
        }`}>
            <div className="text-center">
                <div className={`text-3xl mb-1 ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                    {achievement.emoji}
                </div>
                <h4 className={`font-semibold text-sm ${isUnlocked ? 'text-green-300' : 'text-gray-400'}`}>
                    {achievement.name}
                </h4>
                <p className="text-xs text-gray-400 mt-1">{achievement.description}</p>
                {!isUnlocked && progress > 0 && (
                    <div className="mt-2">
                        <div className="w-full bg-gray-700 rounded-full h-1">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (progress / achievement.requirement) * 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-blue-400 mt-1">
                            {progress}/{achievement.requirement}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function EquipmentCard({ type, equipment, onBuy, isProcessing, canAfford, isUnlocked, playerLevel }) {
    const isAvailable = isUnlocked && canAfford;
    const needsLevel = equipment.level > playerLevel;
    
    return (
        <div className={`border p-6 rounded-2xl transition-all duration-300 ${
            isAvailable 
                ? 'border-green-500/50 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:border-green-400/70 hover:shadow-lg hover:shadow-green-500/20 hover:scale-105' 
                : needsLevel
                    ? 'border-purple-500/30 bg-gradient-to-r from-purple-600/10 to-violet-600/10'
                    : 'border-red-500/30 bg-gradient-to-r from-red-600/10 to-pink-600/10'
        }`}>
            <div className="text-center mb-4">
                <div className="text-4xl mb-2">{equipment.emoji}</div>
                <h3 className="text-xl font-semibold text-white">{equipment.name}</h3>
                <p className="text-sm text-gray-300 mt-1">{equipment.description}</p>
                
                <div className="mt-3 space-y-1">
                    <p className="text-sm">⚡ <span className="text-yellow-400 font-bold">{equipment.hashPower} H/s</span></p>
                    <p className="text-sm">💰 <span className="text-green-400 font-bold">{equipment.coinsPerSecond} TMT/s</span></p>
                    <p className="text-sm">🎯 <span className="text-blue-400 font-bold">Poziom {equipment.level}</span></p>
                </div>
                
                <div className="mt-3">
                    {equipment.price === 0 ? (
                        <span className="text-green-400 font-bold text-lg">🎁 DARMOWY</span>
                    ) : (
                        <span className="text-yellow-400 font-bold text-lg">💎 {equipment.price} TON</span>
                    )}
                </div>
            </div>
            
            <button 
                onClick={() => onBuy(type)} 
                disabled={isProcessing || !isAvailable || needsLevel} 
                className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 ${
                    isProcessing 
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                        : needsLevel
                            ? 'bg-purple-600/50 text-purple-300 cursor-not-allowed'
                            : isAvailable
                                ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 active:scale-95'
                                : 'bg-red-600/50 text-red-300 cursor-not-allowed'
                }`}
            >
                {isProcessing ? "⏳ Tworzenie..." : 
                 needsLevel ? `🔒 Wymaga poziom ${equipment.level}` :
                 !canAfford ? "💸 Za drogo" :
                 equipment.price === 0 ? "🎁 Zdobądź za darmo" : "💰 Kup teraz"}
            </button>
        </div>
    );
}

// Komponent dla pojedynczego przedmiotu w ekwipunku
function NftItem({ item, onStake, isProcessing }) {
    // Sprawdź jaki to typ sprzętu na podstawie nazwy
    const equipmentType = Object.values(EQUIPMENT_TYPES).find(eq => 
        item.name.toLowerCase().includes(eq.name.toLowerCase()) || 
        item.name === eq.name
    ) || EQUIPMENT_TYPES.basic;

    return (
        <div className="border border-blue-500/30 bg-gradient-to-r from-gray-700/50 to-gray-600/50 p-4 rounded-xl backdrop-blur-sm hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-105">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        {equipmentType.emoji} {item.name}
                    </h3>
                    <p className="text-sm text-blue-300 mt-1">⚡ {equipmentType.hashPower} H/s</p>
                    <p className="text-xs text-green-300">💰 {equipmentType.coinsPerSecond} TMT/s</p>
                </div>
                <button
                    onClick={() => onStake(item.address)}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
                >
                    {isProcessing ? "⏳ Przetwarzanie..." : "🔌 Podłącz"}
                </button>
            </div>
        </div>
    );
}

function App() {
    // 🚀 TELEGRAM WEBAPP INTEGRATION
    const [telegramUser, setTelegramUser] = useState(null);
    
    useEffect(() => {
        // Sprawdź czy aplikacja działa w Telegram
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            // Pobierz dane użytkownika Telegram
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            if (user) {
                setTelegramUser({
                    firstName: user.first_name,
                    lastName: user.last_name,
                    username: user.username,
                    id: user.id
                });
                console.log('🎮 Telegram user:', user.first_name);
            }
            
            console.log('✅ Telegram WebApp activated!');
        } else {
            console.log('🌐 Running in browser mode');
        }
    }, []);

    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    
    const [view, setView] = useState('farm');
    const [farmData, setFarmData] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [inventoryError, setInventoryError] = useState(null);
    const [walletBalance, setWalletBalance] = useState(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState(null);
    const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(30);

    // Daily rewards state
    const [currentStreak, setCurrentStreak] = useState(1);
    const [lastClaimDate, setLastClaimDate] = useState(null);
    const [claimedDays, setClaimedDays] = useState(new Set());
    
    // Lucky wheel state
    const [isSpinning, setIsSpinning] = useState(false);
    const [canSpin, setCanSpin] = useState(true);
    const [lastSpinDate, setLastSpinDate] = useState(null);
    const [wheelPrize, setWheelPrize] = useState(null);

    const client = useMemo(() => new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC'
    }), []);

    // Oblicz całkowity coins per second i poziom gracza
    const playerStats = useMemo(() => {
        if (!farmData) return { coinsPerSecond: 0, level: 1, totalHashPower: 0 };
        
        const totalHashPower = farmData.hashPower;
        const coinsPerSecond = totalHashPower * 0.0001;
        
        // Poziom na podstawie hash power
        let level = 1;
        if (totalHashPower >= 10000) level = 4;
        else if (totalHashPower >= 2000) level = 3;
        else if (totalHashPower >= 500) level = 2;
        
        return { coinsPerSecond, level, totalHashPower };
    }, [farmData]);

    // Sprawdź czy gracz może odebrać nagrodę dzisiaj
    const dailyRewardStatus = useMemo(() => {
        const today = new Date().toDateString();
        const canClaim = lastClaimDate !== today;
        const todayReward = DAILY_REWARDS[currentStreak - 1] || DAILY_REWARDS[6]; // Cycle back to day 7
        
        return { canClaim, todayReward, today };
    }, [currentStreak, lastClaimDate]);

    // Sprawdź osiągnięcia
    const unlockedAchievements = useMemo(() => {
        const unlocked = {};
        const progress = {};
        
        if (farmData) {
            // First Steps
            unlocked.firstMiner = inventory.length >= ACHIEVEMENTS.firstMiner.requirement;
            progress.firstMiner = inventory.length;
            
            // Power User
            unlocked.powerUser = farmData.hashPower >= ACHIEVEMENTS.powerUser.requirement;
            progress.powerUser = farmData.hashPower;
            
            // Tycoon
            unlocked.tycoon = farmData.hashPower >= ACHIEVEMENTS.tycoon.requirement;
            progress.tycoon = farmData.hashPower;
            
            // Collector
            unlocked.collector = inventory.length >= ACHIEVEMENTS.collector.requirement;
            progress.collector = inventory.length;
            
            // Millionaire (mock - based on pending rewards)
            const totalEarned = farmData.pendingRewards / 1e9;
            unlocked.millionaire = totalEarned >= ACHIEVEMENTS.millionaire.requirement;
            progress.millionaire = totalEarned;
        }
        
        return { unlocked, progress };
    }, [farmData, inventory]);

    // Stwórz leaderboard z obecnym graczem
    const leaderboardWithPlayer = useMemo(() => {
        if (!farmData || !telegramUser) return MOCK_LEADERBOARD;
        
        const currentPlayer = {
            name: telegramUser.firstName || telegramUser.username || "Ty",
            hashPower: farmData.hashPower,
            level: playerStats.level,
            avatar: "🎮",
            isCurrentPlayer: true
        };
        
        // Dodaj gracza do listy i posortuj
        const allPlayers = [...MOCK_LEADERBOARD, currentPlayer];
        return allPlayers.sort((a, b) => b.hashPower - a.hashPower);
    }, [farmData, telegramUser, playerStats.level]);

    // Daily reward functions
    const handleClaimDaily = (reward) => {
        const today = new Date().toDateString();
        setLastClaimDate(today);
        setClaimedDays(prev => new Set([...prev, currentStreak]));
        
        // Increase streak, reset after 7 days
        setCurrentStreak(prev => prev >= 7 ? 1 : prev + 1);
        
        // Mock reward processing
        alert(`🎁 Odebrano nagrodę: ${reward.name}!`);
        
        // In real app, would trigger blockchain transaction
        console.log("Daily reward claimed:", reward);
    };

    // Lucky wheel functions
    const handleWheelSpin = (prize) => {
        setIsSpinning(false);
        setWheelPrize(prize);
        setCanSpin(false);
        setLastSpinDate(new Date().toDateString());
        
        alert(`🎰 Wygrałeś: ${prize.name}!`);
        
        // In real app, would trigger blockchain transaction
        console.log("Wheel prize won:", prize);
    };

    const startWheelSpin = () => {
        if (!canSpin || isSpinning) return;
        setIsSpinning(true);
    };

    // Check if player can spin today
    useEffect(() => {
        const today = new Date().toDateString();
        setCanSpin(lastSpinDate !== today);
    }, [lastSpinDate]);

    // Fetch wallet balance
    const fetchWalletBalance = useCallback(async () => {
        if (!wallet) return;
        try {
            const address = Address.parse(wallet.account.address);
            const balance = await client.getBalance(address);
            setWalletBalance(Number(balance) / 1e9); // Convert from nanoTON to TON
        } catch (error) {
            console.error("Błąd pobierania salda:", error);
        }
    }, [wallet, client]);

    const handleTransaction = async (address, amount, payload) => {
        if (!wallet) return;
        setIsProcessing(true);
        try {
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [{ address, amount, payload }]
            };
            await tonConnectUI.sendTransaction(transaction);
            alert("✅ Transakcja wysłana! Odświeżenie danych może potrwać chwilę.");
            setTimeout(() => {
                fetchAllData();
            }, 15000);
        } catch (error) {
            console.error("Błąd transakcji:", error);
            alert("❌ Transakcja nie powiodła się. Sprawdź konsolę, aby zobaczyć szczegóły.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const fetchFarmData = useCallback(async () => {
        if (!wallet) return;
        try {
            const result = await client.runMethod(
                Address.parse(STAKING_FARM_ADDRESS), 
                "get_player_info", 
                [{ type: 'slice', cell: beginCell().storeAddress(Address.parse(wallet.account.address)).endCell() }]
            );
            const hashPower = result.stack.readBigNumber();
            const pendingRewards = result.stack.readBigNumber();
            setFarmData({ hashPower: Number(hashPower), pendingRewards: Number(pendingRewards) });
            setLastUpdateTime(new Date());
        } catch (error) { 
            console.error("Błąd pobierania danych z farmy:", error); 
        }
    }, [wallet, client]);

    const handleClaim = () => {
        // POPRAWIONY OpCode dla ClaimRewards
        const claimOpCode = 1906195048; // ✅ Poprawny z sources/output/staking_farm_StakingFarm.ts
        
        const body = beginCell()
            .storeUint(claimOpCode, 32)
            .storeUint(BigInt(Date.now()), 64)
            .endCell();
        handleTransaction(STAKING_FARM_ADDRESS, toNano('0.05').toString(), body.toBoc().toString("base64"));
    };

    const fetchInventory = useCallback(async () => {
        if (!wallet) return;
        setInventory([]);
        setInventoryError(null);
        try {
            const playerAddress = Address.parse(wallet.account.address);
            const collectionAddress = Address.parse(NFT_COLLECTION_ADDRESS);

            console.log("Fetching NFTs for address:", playerAddress.toString());
            console.log("From collection:", collectionAddress.toString());

            // NAJPIERW spróbuj przez TonAPI
            const rawAddress = playerAddress.toRawString();
            const apiUrl = `https://testnet.tonapi.io/v2/accounts/${rawAddress}/nfts?collection=${collectionAddress.toString()}&limit=100&offset=0&indirect_ownership=false`;
            console.log("API URL:", apiUrl);
            
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log("API response data:", data);

                if (data.nft_items && data.nft_items.length > 0) {
                    console.log("Found NFTs via API:", data.nft_items.length);
                    const items = data.nft_items.map(item => ({
                        address: item.address,
                        name: item.metadata?.name || "Basic GPU",
                        description: item.metadata?.description || "Sprzęt górniczy"
                    }));
                    setInventory(items);
                    return; // Kończymy tutaj jeśli znaleźliśmy NFT
                }
            }

            // JEŚLI TonAPI nie znalazł NFT, sprawdź stan kolekcji
            console.log("TonAPI didn't find NFTs, checking collection state...");
            
            const collectionUrl = `https://testnet.tonapi.io/v2/nfts/collections/${collectionAddress.toString()}`;
            const collectionResponse = await fetch(collectionUrl);
            
            if (collectionResponse.ok) {
                const collectionData = await collectionResponse.json();
                console.log("Collection data:", collectionData);
                
                const nextItemIndex = collectionData.next_item_index || 0;
                console.log("Collection has", nextItemIndex, "NFTs");
                
                if (nextItemIndex > 0) {
                    // Utwórz NFT na podstawie stanu kolekcji
                    const mockNFTs = [];
                    for (let i = 0; i < nextItemIndex; i++) {
                        mockNFTs.push({
                            address: `collection_nft_${i}`,
                            name: "Basic GPU",
                            description: "Sprzęt górniczy (symulowany - staking niedostępny)"
                        });
                    }
                    console.log("Created mock NFTs based on collection state:", mockNFTs);
                    setInventory(mockNFTs);
                } else {
                    console.log("Collection is empty");
                    setInventory([]);
                }
            } else {
                console.log("Failed to fetch collection data");
                setInventory([]);
            }
        } catch (error) {
            console.error("Błąd pobierania ekwipunku:", error);
            setInventoryError("❌ Nie udało się pobrać ekwipunku. Spróbuj ponownie za chwilę.");
        }
    }, [wallet]);
    
    const fetchAllData = useCallback(async () => {
        if (!wallet) return;
        setIsLoading(true);
        await Promise.all([
            fetchFarmData(),
            fetchInventory(),
            fetchWalletBalance()
        ]);
        setIsLoading(false);
        setAutoRefreshCountdown(30); // Reset countdown
    }, [wallet, fetchFarmData, fetchInventory, fetchWalletBalance]);

    const handleStake = (nftAddress) => {
        // Sprawdź czy to mock NFT
        if (nftAddress.startsWith('collection_nft_')) {
            alert("⚠️ To jest symulowany NFT. Staking nie jest dostępny dla symulowanych NFT. Aby używać stakingu, potrzebujemy prawdziwych adresów NFT z blockchain.");
            return;
        }
        
        const body = beginCell()
            .storeUint(0x5fcc3d14, 32) // Standardowy OpCode dla NftTransfer
            .storeUint(BigInt(Date.now()), 64)
            .storeAddress(Address.parse(STAKING_FARM_ADDRESS))
            .storeAddress(Address.parse(wallet.account.address))
            .storeBit(false)
            .storeCoins(toNano('0.01'))
            .storeBit(false)
            .endCell();
        handleTransaction(nftAddress, toNano('0.1').toString(), body.toBoc().toString("base64"));
    };

    const handleBuyEquipment = (equipmentType) => {
        const equipment = EQUIPMENT_TYPES[equipmentType];
        
        // Stwórz metadata z odpowiednim typem
        const metadataCell = beginCell()
            .storeStringTail(equipment.name)
            .storeRef(
                beginCell()
                    .storeStringTail(`https://example.com/nft/${equipmentType}.json`)
                    .endCell()
            )
            .endCell();
        
        // POPRAWIONY OpCode dla Mint
        const mintOpCode = 3871065451; // ✅ Poprawny z sources/output/nft_collection_NftCollection.ts
        
        const body = beginCell()
            .storeUint(mintOpCode, 32)
            .storeUint(BigInt(Date.now()), 64)
            .storeAddress(Address.parse(wallet.account.address))
            .storeRef(metadataCell)
            .endCell();
        
        // Różne koszty w zależności od typu
        const cost = equipment.price === 0 ? '0.1' : equipment.price.toString();
        handleTransaction(NFT_COLLECTION_ADDRESS, toNano(cost).toString(), body.toBoc().toString("base64"));
    };
    
    // Auto-refresh effect
    useEffect(() => {
        if (!wallet) return;
        
        fetchAllData(); // Initial load
        
        const interval = setInterval(() => {
            fetchAllData();
        }, 30000); // 30 seconds
        
        return () => clearInterval(interval);
    }, [wallet, fetchAllData]);

    // Countdown timer effect
    useEffect(() => {
        if (!wallet) return;
        
        const countdown = setInterval(() => {
            setAutoRefreshCountdown(prev => {
                if (prev <= 1) {
                    return 30; // Reset to 30
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(countdown);
    }, [wallet]);

    // Initial data fetch when wallet connects
    useEffect(() => {
        if (wallet) {
            fetchAllData();
        } else {
            setFarmData(null);
            setInventory([]);
            setWalletBalance(null);
        }
    }, [wallet, fetchAllData]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl shadow-blue-500/20 border border-blue-500/20 p-6 text-center">
                <header className="mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent drop-shadow-lg">
                        ⛏️ TON Miner Tycoon 💎
                    </h1>
                    
                    {/* Telegram User Info */}
                    {telegramUser && (
                        <div className="mt-2 p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                            <p className="text-sm text-indigo-300">
                                👋 Witaj, <span className="font-bold text-white">{telegramUser.firstName}</span>!
                                {dailyRewardStatus.canClaim && <span className="ml-2">🎁</span>}
                            </p>
                        </div>
                    )}
                    
                    {/* Wallet Info Panel */}
                    {wallet && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-blue-300">💰 Saldo:</span>
                                    <span className="text-yellow-400 font-bold">
                                        {walletBalance !== null ? `${walletBalance.toFixed(4)} TON` : "Ładowanie..."}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-purple-300">🎯 Poziom:</span>
                                    <span className="text-pink-400 font-bold">{playerStats.level}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-orange-300">🔥 Streak:</span>
                                    <span className="text-orange-400 font-bold">{currentStreak} dni</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-cyan-300">🎰 Koło:</span>
                                    <span className={`font-bold ${canSpin ? 'text-green-400' : 'text-red-400'}`}>
                                        {canSpin ? "Dostępne" : "Jutro"}
                                    </span>
                                </div>
                                {playerStats.coinsPerSecond > 0 && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-green-300">⚡ Zarobek/s:</span>
                                            <AnimatedNumber value={playerStats.coinsPerSecond} suffix=" TMT/s" />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-300">🔥 Hash Power:</span>
                                            <span className="text-cyan-400 font-bold">{playerStats.totalHashPower} H/s</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="mt-2 text-center">
                                <CountdownTimer 
                                    seconds={autoRefreshCountdown} 
                                    onComplete={() => fetchAllData()} 
                                />
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-4">
                        <TonConnectButton className="hover:scale-105 transition-transform duration-200" />
                    </div>
                </header>
                
                <nav className="flex justify-center border-b border-gray-700/50 mb-6 overflow-x-auto">
                    <button 
                        onClick={() => setView('farm')} 
                        className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                            view === 'farm' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🏭 Farma
                    </button>
                    <button 
                        onClick={() => setView('inventory')} 
                        className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                            view === 'inventory' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🎒 Ekwipunek
                    </button>
                    <button 
                        onClick={() => setView('shop')} 
                        className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                            view === 'shop' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🏪 Sklep
                    </button>
                    <button 
                        onClick={() => setView('rewards')} 
                        className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                            view === 'rewards' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🎁 Nagrody {dailyRewardStatus.canClaim && "●"}
                    </button>
                    <button 
                        onClick={() => setView('wheel')} 
                        className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                            view === 'wheel' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🎰 Koło {canSpin && "●"}
                    </button>
                    <button 
                        onClick={() => setView('leaderboard')} 
                        className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                            view === 'leaderboard' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🏆 Ranking
                    </button>
                    <button 
                        onClick={() => setView('achievements')} 
                        className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                            view === 'achievements' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🏅 Osiągnięcia
                    </button>
                </nav>

                <main>
                    {view === 'farm' && (
                        wallet ? (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl text-left space-y-4 border border-gray-600/30">
                                {isLoading ? (
                                    <div className="text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <p className="text-blue-300">⚡ Wczytywanie danych farmy...</p>
                                    </div>
                                ) : farmData ? (
                                    <>
                                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-xl border border-blue-500/30">
                                            <p className="text-lg"><strong className="text-blue-300">⚡ Moc Obliczeniowa:</strong> <AnimatedNumber value={farmData.hashPower} suffix=" H/s" /></p>
                                        </div>
                                        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-4 rounded-xl border border-green-500/30">
                                            <p className="text-lg"><strong className="text-green-300">💰 Oczekujące Nagrody:</strong> <AnimatedNumber value={farmData.pendingRewards / 1e9} suffix=" TMT" /></p>
                                        </div>
                                        {lastUpdateTime && (
                                            <div className="text-center text-xs text-gray-400">
                                                📅 Ostatnia aktualizacja: {lastUpdateTime.toLocaleTimeString()}
                                            </div>
                                        )}
                                        <button 
                                            onClick={handleClaim} 
                                            disabled={isProcessing || !farmData || farmData.pendingRewards === 0} 
                                            className={`w-full mt-4 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                                                isProcessing 
                                                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                                                    : farmData && farmData.pendingRewards > 0
                                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 animate-pulse'
                                                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                                            }`}
                                        >
                                            {isProcessing ? "⏳ Przetwarzanie..." : "💰 Odbierz Nagrody"}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <p className="text-red-400">❌ Nie udało się załadować danych farmy.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/30">
                                <div className="text-center">
                                    <p className="text-xl text-gray-300 mb-4">🔐 Połącz portfel, aby rozpocząć mining!</p>
                                    <div className="text-6xl mb-4">⛏️</div>
                                </div>
                            </div>
                        )
                    )}

                    {view === 'inventory' && (
                         wallet ? (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl text-left space-y-4 border border-gray-600/30">
                                 <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    🎒 Twój Sprzęt
                                 </h2>
                                {isLoading && inventory.length === 0 && (
                                    <div className="text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <p className="text-blue-300">🔍 Skanowanie portfela...</p>
                                    </div>
                                )}
                                {inventoryError && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/30">{inventoryError}</p>}
                                
                                {inventory.length > 0 && inventory.map(item => (
                                    <NftItem key={item.address} item={item} onStake={handleStake} isProcessing={isProcessing} />
                                ))}

                                {!isLoading && inventory.length === 0 && !inventoryError && (
                                    <div className="text-center p-6">
                                        <div className="text-6xl mb-4">📦</div>
                                        <p className="text-gray-300">Nie masz żadnego sprzętu.</p>
                                        <p className="text-blue-400 mt-2">🏪 Zdobądź go w sklepie!</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/30">
                                <div className="text-center">
                                    <p className="text-xl text-gray-300 mb-4">🔐 Połącz portfel, aby zobaczyć ekwipunek!</p>
                                    <div className="text-6xl mb-4">🎒</div>
                                </div>
                            </div>
                        )
                    )}

                    {view === 'shop' && (
                        wallet ? (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl space-y-4 border border-gray-600/30 max-h-96 overflow-y-auto">
                                <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                    🏪 Sklep ze Sprzętem
                                </h2>
                                
                                <div className="grid gap-4">
                                    {Object.entries(EQUIPMENT_TYPES).map(([type, equipment]) => (
                                        <EquipmentCard
                                            key={type}
                                            type={type}
                                            equipment={equipment}
                                            onBuy={handleBuyEquipment}
                                            isProcessing={isProcessing}
                                            canAfford={walletBalance !== null && walletBalance >= equipment.price}
                                            isUnlocked={playerStats.level >= equipment.level}
                                            playerLevel={playerStats.level}
                                        />
                                    ))}
                                </div>
                                
                                <div className="text-center mt-4 p-3 bg-blue-600/10 rounded-lg border border-blue-500/30">
                                    <p className="text-sm text-blue-300">💡 Zwiększ hash power, aby odblokować lepszy sprzęt!</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/30">
                                <div className="text-center">
                                    <p className="text-xl text-gray-300 mb-4">🔐 Połącz portfel, aby robić zakupy!</p>
                                    <div className="text-6xl mb-4">🏪</div>
                                </div>
                            </div>
                        )
                    )}

                    {view === 'rewards' && (
                        <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl space-y-4 border border-gray-600/30">
                            <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                                🎁 Codzienne Nagrody
                            </h2>
                            
                            <div className="text-center mb-4 p-3 bg-amber-600/10 rounded-lg border border-amber-500/30">
                                <p className="text-amber-300 font-bold">🔥 Obecna seria: {currentStreak} dni</p>
                                <p className="text-xs text-amber-400 mt-1">Nie przegap ani jednego dnia!</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                                {DAILY_REWARDS.map((reward, index) => (
                                    <DailyRewardCard
                                        key={reward.day}
                                        reward={reward}
                                        day={reward.day}
                                        isClaimed={claimedDays.has(reward.day)}
                                        isToday={currentStreak === reward.day && dailyRewardStatus.canClaim}
                                        onClaim={handleClaimDaily}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'wheel' && (
                        <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl space-y-4 border border-gray-600/30">
                            <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                🎰 Koło Fortuny
                            </h2>
                            
                            <LuckyWheel
                                prizes={WHEEL_PRIZES}
                                onSpin={handleWheelSpin}
                                isSpinning={isSpinning}
                                canSpin={canSpin}
                            />
                            
                            {wheelPrize && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl border border-yellow-500/50">
                                    <div className="text-center">
                                        <p className="text-yellow-300 font-bold">🏆 Ostatnia wygrana:</p>
                                        <p className="text-white text-lg">{wheelPrize.emoji} {wheelPrize.name}</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="text-center mt-4 p-3 bg-yellow-600/10 rounded-lg border border-yellow-500/30">
                                <p className="text-sm text-yellow-300">🎯 Jedna szansa dziennie na wielkie nagrody!</p>
                            </div>
                        </div>
                    )}

                    {view === 'leaderboard' && (
                        <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl space-y-4 border border-gray-600/30">
                            <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                🏆 Ranking Minerów
                            </h2>
                            
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {leaderboardWithPlayer.map((player, index) => (
                                    <LeaderboardItem
                                        key={`${player.name}-${index}`}
                                        player={player}
                                        rank={index + 1}
                                        isCurrentPlayer={player.isCurrentPlayer}
                                    />
                                ))}
                            </div>
                            
                            <div className="text-center mt-4 p-3 bg-yellow-600/10 rounded-lg border border-yellow-500/30">
                                <p className="text-sm text-yellow-300">🚀 Zwiększ swoją moc hash, aby wspiąć się w rankingu!</p>
                            </div>
                        </div>
                    )}

                    {view === 'achievements' && (
                        <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl space-y-4 border border-gray-600/30">
                            <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                🏅 Osiągnięcia
                            </h2>
                            
                            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                                {Object.entries(ACHIEVEMENTS).map(([key, achievement]) => (
                                    <AchievementBadge
                                        key={key}
                                        achievement={achievement}
                                        isUnlocked={unlockedAchievements.unlocked[key] || false}
                                        progress={unlockedAchievements.progress[key] || 0}
                                    />
                                ))}
                            </div>
                            
                            <div className="text-center mt-4 p-3 bg-purple-600/10 rounded-lg border border-purple-500/30">
                                <p className="text-sm text-purple-300">
                                    ✨ Odblokowano: {Object.values(unlockedAchievements.unlocked).filter(Boolean).length}/{Object.keys(ACHIEVEMENTS).length}
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;