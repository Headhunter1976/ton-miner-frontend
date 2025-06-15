import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { TonClient, Address } from "@ton/ton";
import { toNano, beginCell } from '@ton/core';

// Zaktualizowane adresy z Twojego ostatniego wdrożenia
const STAKING_FARM_ADDRESS = "EQC8MN1ykQZtHHHrWHGSOFyMB7tihHyL3paweoV8DFcJ7V3g";
const NFT_COLLECTION_ADDRESS = "EQA1W7wNN-dwYQIcfUZXk8BEZsNGlGiWB3sskFrYLPZis36m";

// Konfiguracja farm mining
const MINING_FARMS = {
    earth: {
        name: "Earth Base",
        emoji: "🌍",
        description: "Podstawowa farma na Ziemi",
        efficiency: 1.0,
        energyCost: 0.5,
        temperature: "20°C",
        unlockLevel: 1,
        background: "from-green-900/30 to-blue-900/30",
        border: "border-green-500/30"
    },
    arctic: {
        name: "Arctic Mine",
        emoji: "🌨️",
        description: "Zimna kopalnia z naturalnym chłodzeniem",
        efficiency: 1.2,
        energyCost: 0.3,
        temperature: "-40°C",
        unlockLevel: 2,
        background: "from-cyan-900/30 to-blue-900/30",
        border: "border-cyan-500/30"
    },
    desert: {
        name: "Desert Solar",
        emoji: "🏜️",
        description: "Pustynna farma solarna",
        efficiency: 1.5,
        energyCost: 0.1,
        temperature: "45°C",
        unlockLevel: 3,
        background: "from-yellow-900/30 to-orange-900/30",
        border: "border-yellow-500/30"
    },
    space: {
        name: "Space Station",
        emoji: "🚀",
        description: "Kosmiczna stacja mining",
        efficiency: 2.0,
        energyCost: 0.8,
        temperature: "-270°C",
        unlockLevel: 4,
        background: "from-purple-900/30 to-indigo-900/30",
        border: "border-purple-500/30"
    }
};

// Konfiguracja typów sprzętu
const EQUIPMENT_TYPES = {
    basic: {
        name: "Basic GPU",
        emoji: "🖥️",
        hashPower: 100,
        price: 0,
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
    millionaire: { name: "Millionaire", emoji: "💎", description: "Zarobić 1000 TMT", requirement: 1000 },
    explorer: { name: "Space Explorer", emoji: "🚀", description: "Odblokuj farmę kosmiczną", requirement: 1 },
    gamer: { name: "Mini-Game Master", emoji: "🎮", description: "Zagraj w każdą mini-grę", requirement: 3 },
    clicker: { name: "Click Master", emoji: "👆", description: "Kliknij 1000 razy", requirement: 1000 }
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

// Mock leaderboard data
const MOCK_LEADERBOARD = [
    { name: "CryptoKing", hashPower: 50000, level: 4, avatar: "👑" },
    { name: "MinerPro", hashPower: 25000, level: 4, avatar: "⚡" },
    { name: "HashMaster", hashPower: 15000, level: 3, avatar: "🚀" },
    { name: "BitDigger", hashPower: 8000, level: 3, avatar: "⛏️" },
    { name: "TonFan", hashPower: 5000, level: 2, avatar: "💎" }
];

// Helper Components
function AnimatedNumber({ value, suffix = "", prefix = "" }) {
    const [displayValue, setDisplayValue] = useState(value);
    
    useEffect(() => {
        if (value !== displayValue) {
            const duration = 1000;
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

function FarmCard({ farmKey, farm, isSelected, isUnlocked, onSelect }) {
    return (
        <div 
            onClick={() => isUnlocked && onSelect(farmKey)}
            className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                !isUnlocked 
                    ? 'opacity-50 cursor-not-allowed border-gray-500/30 bg-gray-600/20'
                    : isSelected
                        ? `${farm.border} bg-gradient-to-br ${farm.background} shadow-lg transform scale-105`
                        : `${farm.border} bg-gradient-to-br ${farm.background} hover:scale-102 hover:shadow-md`
            }`}
        >
            <div className="text-center">
                <div className="text-4xl mb-2">{farm.emoji}</div>
                <h3 className="font-bold text-white text-lg">{farm.name}</h3>
                <p className="text-xs text-gray-300 mt-1">{farm.description}</p>
                
                <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-blue-300">🌡️ Temperatura:</span>
                        <span className="text-white font-bold">{farm.temperature}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-green-300">⚡ Efektywność:</span>
                        <span className="text-green-400 font-bold">{(farm.efficiency * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-yellow-300">🔋 Energia:</span>
                        <span className="text-yellow-400 font-bold">{farm.energyCost} TON/dzień</span>
                    </div>
                </div>
                
                {!isUnlocked && (
                    <div className="mt-3 py-1 px-3 bg-gray-600/50 rounded-lg">
                        <span className="text-gray-300 text-xs">🔒 Poziom {farm.unlockLevel}</span>
                    </div>
                )}
                
                {isSelected && (
                    <div className="mt-3 py-1 px-3 bg-amber-500/30 rounded-lg border border-amber-400/50">
                        <span className="text-amber-300 text-xs font-bold">✅ Aktywna farma</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function App() {
    // Telegram WebApp Integration
    const [telegramUser, setTelegramUser] = useState(null);
    
    useEffect(() => {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
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

    // Mining farms state
    const [selectedFarm, setSelectedFarm] = useState('earth');

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

    // Player stats calculation
    const playerStats = useMemo(() => {
        if (!farmData) return { coinsPerSecond: 0, level: 1, totalHashPower: 0, farmEfficiency: 1.0, energyCost: 0.5 };
        
        const currentFarm = MINING_FARMS[selectedFarm];
        const totalHashPower = farmData.hashPower;
        const baseCoinsPerSecond = totalHashPower * 0.0001;
        const coinsPerSecond = baseCoinsPerSecond * currentFarm.efficiency;
        
        let level = 1;
        if (totalHashPower >= 10000) level = 4;
        else if (totalHashPower >= 2000) level = 3;
        else if (totalHashPower >= 500) level = 2;
        
        return { 
            coinsPerSecond, 
            level, 
            totalHashPower,
            farmEfficiency: currentFarm.efficiency,
            energyCost: currentFarm.energyCost
        };
    }, [farmData, selectedFarm]);

    // Check unlocked farms
    const unlockedFarms = useMemo(() => {
        const unlocked = {};
        Object.entries(MINING_FARMS).forEach(([key, farm]) => {
            unlocked[key] = playerStats.level >= farm.unlockLevel;
        });
        return unlocked;
    }, [playerStats.level]);

    // Daily reward status
    const dailyRewardStatus = useMemo(() => {
        const today = new Date().toDateString();
        const canClaim = lastClaimDate !== today;
        const todayReward = DAILY_REWARDS[currentStreak - 1] || DAILY_REWARDS[6];
        
        return { canClaim, todayReward, today };
    }, [currentStreak, lastClaimDate]);

    // Farm selection handler
    const handleFarmSelect = (farmKey) => {
        if (unlockedFarms[farmKey]) {
            setSelectedFarm(farmKey);
        }
    };

    // Daily reward handler
    const handleClaimDaily = (reward) => {
        const today = new Date().toDateString();
        setLastClaimDate(today);
        setClaimedDays(prev => new Set([...prev, currentStreak]));
        setCurrentStreak(prev => prev >= 7 ? 1 : prev + 1);
        
        alert(`🎁 Odebrano nagrodę: ${reward.name}!`);
    };

    // Wheel spin handlers
    const handleWheelSpin = (prize) => {
        setIsSpinning(false);
        setWheelPrize(prize);
        setCanSpin(false);
        setLastSpinDate(new Date().toDateString());
        
        alert(`🎰 Wygrałeś: ${prize.name}!`);
    };

    // Check daily wheel availability
    useEffect(() => {
        const today = new Date().toDateString();
        setCanSpin(lastSpinDate !== today);
    }, [lastSpinDate]);

    // API functions
    const fetchWalletBalance = useCallback(async () => {
        if (!wallet) return;
        try {
            const address = Address.parse(wallet.account.address);
            const balance = await client.getBalance(address);
            setWalletBalance(Number(balance) / 1e9);
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
            alert("✅ Transakcja wysłana!");
            setTimeout(() => {
                fetchAllData();
            }, 15000);
        } catch (error) {
            console.error("Błąd transakcji:", error);
            alert("❌ Transakcja nie powiodła się.");
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
            setFarmData({ hashPower: Number(result.stack.readBigNumber()), pendingRewards: Number(result.stack.readBigNumber()) });
            setLastUpdateTime(new Date());
        } catch (error) { 
            console.error("Błąd pobierania danych z farmy:", error); 
        }
    }, [wallet, client]);

    const handleClaim = () => {
        const claimOpCode = 1906195048;
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
            const rawAddress = playerAddress.toRawString();
            const apiUrl = `https://testnet.tonapi.io/v2/accounts/${rawAddress}/nfts?collection=${collectionAddress.toString()}&limit=100&offset=0&indirect_ownership=false`;
            
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.nft_items && data.nft_items.length > 0) {
                    const items = data.nft_items.map(item => ({ address: item.address, name: item.metadata?.name || "Basic GPU", description: item.metadata?.description || "Sprzęt górniczy" }));
                    setInventory(items);
                    return;
                }
            }

            const collectionUrl = `https://testnet.tonapi.io/v2/nfts/collections/${collectionAddress.toString()}`;
            const collectionResponse = await fetch(collectionUrl);
            if (collectionResponse.ok) {
                const collectionData = await collectionResponse.json();
                const nextItemIndex = collectionData.next_item_index || 0;
                if (nextItemIndex > 0) {
                    const mockNFTs = [];
                    for (let i = 0; i < nextItemIndex; i++) {
                        mockNFTs.push({
                            address: `collection_nft_${i}`,
                            name: "Basic GPU",
                            description: "Sprzęt górniczy (symulowany)"
                        });
                    }
                    setInventory(mockNFTs);
                }
            }
        } catch (error) {
            console.error("Błąd pobierania ekwipunku:", error);
            setInventoryError("❌ Nie udało się pobrać ekwipunku.");
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
        setAutoRefreshCountdown(30);
    }, [wallet, fetchFarmData, fetchInventory, fetchWalletBalance]);

    const handleBuyEquipment = (equipmentType) => {
        const equipment = EQUIPMENT_TYPES[equipmentType];
        const metadataCell = beginCell()
            .storeStringTail(equipment.name)
            .storeRef(
                beginCell()
                    .storeStringTail(`https://example.com/nft/${equipmentType}.json`)
                    .endCell()
            )
            .endCell();
        
        const mintOpCode = 3871065451;
        const body = beginCell()
            .storeUint(mintOpCode, 32)
            .storeUint(BigInt(Date.now()), 64)
            .storeAddress(Address.parse(wallet.account.address))
            .storeRef(metadataCell)
            .endCell();
        
        const cost = equipment.price === 0 ? '0.1' : equipment.price.toString();
        handleTransaction(NFT_COLLECTION_ADDRESS, toNano(cost).toString(), body.toBoc().toString("base64"));
    };
    
    // Auto-refresh effects
    useEffect(() => {
        if (!wallet) return;
        fetchAllData();
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, [wallet, fetchAllData]);

    useEffect(() => {
        if (!wallet) return;
        const countdown = setInterval(() => {
            setAutoRefreshCountdown(prev => prev <= 1 ? 30 : prev - 1);
        }, 1000);
        return () => clearInterval(countdown);
    }, [wallet]);

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
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent drop-shadow-lg">⛏️ TON Miner Tycoon 💎</h1>
                    {telegramUser && (<div className="mt-2 p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30"><p className="text-sm text-indigo-300">👋 Witaj, <span className="font-bold text-white">{telegramUser.firstName}</span>!</p></div>)}
                    {wallet && (<div className="mt-2 p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30"><div className="grid grid-cols-2 gap-2 text-sm"><div className="flex justify-between"><span className="text-blue-300">💰 Saldo:</span><span className="text-yellow-400 font-bold">{walletBalance !== null ? `${walletBalance.toFixed(4)} TON` : "Ładowanie..."}</span></div><div className="flex justify-between"><span className="text-purple-300">🎯 Poziom:</span><span className="text-pink-400 font-bold">{playerStats.level}</span></div></div><div className="mt-2 text-center"><CountdownTimer seconds={autoRefreshCountdown} onComplete={fetchAllData} /></div></div>)}
                    <div className="mt-4"><TonConnectButton className="hover:scale-105 transition-transform duration-200" /></div>
                </header>
                
                <nav className="flex justify-center border-b border-gray-700/50 mb-6 overflow-x-auto">
                    <button onClick={() => setView('farm')} className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${view === 'farm' ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'}`}>🏭 Farma</button>
                    <button onClick={() => setView('shop')} className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${view === 'shop' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'}`}>🏪 Sklep</button>
                    <button onClick={() => setView('inventory')} className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${view === 'inventory' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>🎒 Ekwipunek</button>
                    <button onClick={() => setView('games')} className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap ${view === 'games' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>🎮 Minigry</button>
                    <button onClick={() => setView('rewards')} className={`py-3 px-3 text-xs font-semibold transition-all duration-300 rounded-t-lg whitespace-nowrap relative ${view === 'rewards' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}`}>{dailyRewardStatus.canClaim && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}🎁 Nagrody</button>
                </nav>

                <main>
                    {view === 'farm' && (
                        <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl space-y-4 border border-gray-600/30">
                            {isLoading ? <div className="text-center"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div><p className="text-blue-300">⚡ Wczytywanie danych farmy...</p></div> : <><div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-xl border border-blue-500/30"><p className="text-lg"><strong className="text-blue-300">⚡ Moc Obliczeniowa:</strong> <AnimatedNumber value={farmData.hashPower} suffix=" H/s" /></p><p className="text-sm text-blue-400 mt-1">📈 Z bonusem farmy: <AnimatedNumber value={farmData.hashPower * playerStats.farmEfficiency} suffix=" H/s" /></p></div><div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-4 rounded-xl border border-green-500/30"><p className="text-lg"><strong className="text-green-300">💰 Oczekujące Nagrody:</strong> <AnimatedNumber value={farmData.pendingRewards / 1e9} suffix=" TMT" /></p><p className="text-sm text-green-400 mt-1">⚡ Zarobek/s: <AnimatedNumber value={playerStats.coinsPerSecond} suffix=" TMT/s" /></p></div><button onClick={handleClaim} disabled={isProcessing || !farmData || farmData.pendingRewards === 0} className={`w-full mt-4 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${isProcessing ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : farmData && farmData.pendingRewards > 0 ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 animate-pulse' : 'bg-gray-500 text-gray-300 cursor-not-allowed'}`}>{isProcessing ? "⏳ Przetwarzanie..." : "💰 Odbierz Nagrody"}</button></>}
                        </div>
                    )}
                    
                    {view === 'locations' && (
                        <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl space-y-4 border border-gray-600/30"><h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">🌍 Lokacje Mining</h2><div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">{Object.entries(MINING_FARMS).map(([farmKey, farm]) => (<FarmCard key={farmKey} farmKey={farmKey} farm={farm} isSelected={selectedFarm === farmKey} isUnlocked={unlockedFarms[farmKey]} onSelect={handleFarmSelect} />))}</div></div>
                    )}

                    {view === 'inventory' && (
                        wallet ? (
                            <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3"><h2 className="text-2xl font-bold mb-4">Twój Sprzęt</h2>{isLoading ? <p>Skanowanie portfela...</p> : inventoryError ? <p className="text-red-400 text-sm">{inventoryError}</p> : inventory.length > 0 ? inventory.map(item => (<NftItem key={item.address} item={item} onStake={() => {}} isProcessing={isProcessing} />)) : <p>Nie masz żadnego sprzętu.</p>}</div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel.</p></div>
                    )}

                    {view === 'shop' && (
                        wallet ? (
                            <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3"><h2 className="text-2xl font-bold mb-4">Sklep ze Sprzętem</h2>{Object.entries(EQUIPMENT_TYPES).map(([key, eq]) => (<div key={key} className="border border-gray-600 p-4 rounded-lg"><h3 className="text-xl font-semibold">{eq.emoji} {eq.name}</h3><p className="text-sm text-gray-400 mt-1">Moc: {eq.hashPower} H/s</p><p className="text-sm text-gray-400">Koszt: {eq.price === 0.1 ? '0.1 TON (na start)' : `${eq.price} TON`}</p><button onClick={() => handleBuyEquipment(key)} disabled={isProcessing || playerStats.level < eq.level} className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">{playerStats.level < eq.level ? `🔒 Wymaga Poziom ${eq.level}` : (isProcessing ? "Przetwarzanie..." : "Kup")}</button></div>))}</div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel.</p></div>
                    )}

                    {view === 'games' && (
                        <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3">
                            <h2 className="text-2xl font-bold mb-4">Minigry</h2>
                            <SlotMachine onWin={(amount) => handleGameWin('slots', amount)} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;
