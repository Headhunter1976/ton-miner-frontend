import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { TonClient, Address } from "@ton/ton";
import { toNano, beginCell } from '@ton/core';

// --- Konfiguracja Gry ---

const STAKING_FARM_ADDRESS = "EQC8MN1ykQZtHHHrWHGSOFyMB7tihHyL3paweoV8DFcJ7V3g";
const NFT_COLLECTION_ADDRESS = "EQA1W7wNN-dwYQIcfUZXk8BEZsNGlGiWB3sskFrYLPZis36m";

const MINING_FARMS = {
    earth: { name: "Earth Base", emoji: "🌍", description: "Podstawowa farma na Ziemi", efficiency: 1.0, energyCost: 0.5, temperature: "20°C", unlockLevel: 1, background: "from-green-900/30 to-blue-900/30", border: "border-green-500/30" },
    arctic: { name: "Arctic Mine", emoji: "🌨️", description: "Zimna kopalnia z naturalnym chłodzeniem", efficiency: 1.2, energyCost: 0.3, temperature: "-40°C", unlockLevel: 2, background: "from-cyan-900/30 to-blue-900/30", border: "border-cyan-500/30" },
    desert: { name: "Desert Solar", emoji: "🏜️", description: "Pustynna farma solarna", efficiency: 1.5, energyCost: 0.1, temperature: "45°C", unlockLevel: 3, background: "from-yellow-900/30 to-orange-900/30", border: "border-yellow-500/30" },
    space: { name: "Space Station", emoji: "🚀", description: "Kosmiczna stacja mining", efficiency: 2.0, energyCost: 0.8, temperature: "-270°C", unlockLevel: 4, background: "from-purple-900/30 to-indigo-900/30", border: "border-purple-500/30" }
};

const EQUIPMENT_TYPES = {
    basic: { name: "Basic GPU", emoji: "🖥️", hashPower: 100, price: 0, level: 1, description: "Podstawowy sprzęt do kopania", coinsPerSecond: 0.01 },
    advanced: { name: "Advanced ASIC", emoji: "⚡", hashPower: 500, price: 0.5, level: 2, description: "Profesjonalny miner ASIC", coinsPerSecond: 0.05 },
    quantum: { name: "Quantum Miner", emoji: "⚛️", hashPower: 2000, price: 2.0, level: 3, description: "Futurystyczny quantum processor", coinsPerSecond: 0.2 },
    fusion: { name: "Fusion Core", emoji: "🌟", hashPower: 10000, price: 10.0, level: 4, description: "Najlepszy sprzęt w galaktyce", coinsPerSecond: 1.0 }
};

// ... (Konfiguracje ACHIEVEMENTS, DAILY_REWARDS, SLOT_SYMBOLS pozostają bez zmian)
const ACHIEVEMENTS = { firstMiner: { name: "First Steps", emoji: "👶", description: "Kup swój pierwszy sprzęt", requirement: 1 }, powerUser: { name: "Power User", emoji: "💪", description: "Osiągnij 1000 H/s", requirement: 1000 }, tycoon: { name: "Mining Tycoon", emoji: "👑", description: "Osiągnij 10000 H/s", requirement: 10000 }, collector: { name: "Collector", emoji: "🎒", description: "Posiadaj 5 NFT", requirement: 5 }, millionaire: { name: "Millionaire", emoji: "💎", description: "Zarobić 1000 TMT", requirement: 1000 }, explorer: { name: "Space Explorer", emoji: "🚀", description: "Odblokuj farmę kosmiczną", requirement: 1 }, gamer: { name: "Mini-Game Master", emoji: "🎮", description: "Zagraj w każdą mini-grę", requirement: 3 }, clicker: { name: "Click Master", emoji: "👆", description: "Kliknij 1000 razy", requirement: 1000 } };
const DAILY_REWARDS = [ { day: 1, reward: 10, type: "coins", emoji: "💰", name: "10 TMT" }, { day: 2, reward: 20, type: "coins", emoji: "💰", name: "20 TMT" }, { day: 3, reward: 50, type: "coins", emoji: "💰", name: "50 TMT" }, { day: 4, reward: 100, type: "coins", emoji: "💰", name: "100 TMT" }, { day: 5, reward: 0.1, type: "ton", emoji: "💎", name: "0.1 TON" }, { day: 6, reward: 200, type: "coins", emoji: "💰", name: "200 TMT" }, { day: 7, reward: 1, type: "nft", emoji: "🎁", name: "Free NFT" } ];
const SLOT_SYMBOLS = ["💎", "🎯", "⚡", "🚀", "🌟", "💰", "🎁", "🔥"];


// --- Komponenty Pomocnicze ---

function AnimatedNumber({ value, suffix = "", prefix = "" }) {
    // ... (bez zmian)
}
function FarmCard({ farmKey, farm, isSelected, isUnlocked, onSelect }) {
    // ... (bez zmian)
}
function NftItem({ item, onStake, isProcessing }) {
    // ... (bez zmian)
}
// ... (Inne komponenty minigier bez zmian)


// --- Główny Komponent Aplikacji ---

function App() {
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const [view, setView] = useState('farm');
    
    // Dane z blockchaina
    const [farmData, setFarmData] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [inventoryError, setInventoryError] = useState(null);
    
    // Stany UI
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // NOWY STAN GRY - ZAPISYWANY W TELEGRAM CLOUD STORAGE
    const [playerData, setPlayerData] = useState({
        selectedFarm: 'earth',
        currentStreak: 1,
        lastClaimDate: null,
        claimedDays: [], // Zmieniono na tablicę dla łatwiejszego zapisu JSON
        gamesPlayed: [],
        totalClicks: 0
    });

    const client = useMemo(() => new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC'
    }), []);
    
    // --- LOGIKA ZAPISU I WCZYTYWANIA DANYCH (TELEGRAM CLOUD STORAGE) ---

    // Funkcja wczytująca stan gry
    const loadGameState = useCallback(() => {
        if (window.Telegram?.WebApp?.CloudStorage) {
            window.Telegram.WebApp.CloudStorage.getItem('playerData', (err, value) => {
                if (err) {
                    console.error("Błąd wczytywania danych z Cloud Storage:", err);
                    return;
                }
                if (value) {
                    try {
                        const loadedData = JSON.parse(value);
                        setPlayerData(prevData => ({...prevData, ...loadedData}));
                        console.log("✅ Dane gracza wczytane z Telegram Cloud Storage.");
                    } catch (e) {
                        console.error("Błąd parsowania danych z Cloud Storage:", e);
                    }
                }
            });
        }
    }, []);

    // Funkcja zapisująca stan gry
    const saveGameState = useCallback((dataToSave) => {
        if (window.Telegram?.WebApp?.CloudStorage) {
            window.Telegram.WebApp.CloudStorage.setItem('playerData', JSON.stringify(dataToSave), (err, success) => {
                if (err) {
                    console.error("Błąd zapisu danych do Cloud Storage:", err);
                }
                if (success) {
                    console.log("💾 Dane gracza zapisane w Telegram Cloud Storage.");
                }
            });
        }
    }, []);

    // Efekt do zapisu danych, gdy się zmienią
    useEffect(() => {
        saveGameState(playerData);
    }, [playerData, saveGameState]);


    // --- GŁÓWNA LOGIKA APLIKACJI ---

    const fetchAllData = useCallback(async () => {
        if (!wallet) return;
        setIsLoading(true);
        console.log("Fetching all data...");
        try {
            await Promise.all([
                fetchFarmData(),
                fetchInventory()
            ]);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [wallet]);

    const handleTransaction = async (address, amount, payload) => {
        // ... (bez zmian)
    };
    
    const fetchFarmData = useCallback(async () => {
        // ... (bez zmian)
    }, [wallet, client]);

    const handleClaim = () => {
        // ... (bez zmian)
    };

    const fetchInventory = useCallback(async () => {
        // ... (bez zmian)
    }, [wallet]);
    
    const handleStake = (nftAddress) => {
        // ... (bez zmian)
    };

    const handleMint = (type) => {
        // ... (bez zmian)
    };
    
    // --- GŁÓWNY USE EFFECT APLIKACJI ---
    useEffect(() => {
        // Inicjalizacja Telegram Web App
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            console.log('✅ Telegram WebApp activated!');
            // Wczytaj dane gracza z chmury
            loadGameState();
        } else {
            console.log('🌐 Running in browser mode');
        }

        // Pobieranie danych z blockchaina po połączeniu portfela
        if (wallet) {
            fetchAllData();
        } else {
            setFarmData(null);
            setInventory([]);
        }
    }, [wallet, fetchAllData, loadGameState]);

    // --- MEMOIZED VALUES (Logika pomocnicza) ---
    const playerStats = useMemo(() => {
        if (!farmData) return { coinsPerSecond: 0, level: 1, totalHashPower: 0, farmEfficiency: 1.0, energyCost: 0.5 };
        const currentFarm = MINING_FARMS[playerData.selectedFarm];
        const totalHashPower = farmData.hashPower;
        const baseCoinsPerSecond = totalHashPower * 0.0001;
        const coinsPerSecond = baseCoinsPerSecond * currentFarm.efficiency;
        let level = 1;
        if (totalHashPower >= 10000) level = 4;
        else if (totalHashPower >= 2000) level = 3;
        else if (totalHashPower >= 500) level = 2;
        return { coinsPerSecond, level, totalHashPower, farmEfficiency: currentFarm.efficiency, energyCost: currentFarm.energyCost };
    }, [farmData, playerData.selectedFarm]);

    const unlockedFarms = useMemo(() => {
        const unlocked = {};
        Object.entries(MINING_FARMS).forEach(([key, farm]) => {
            unlocked[key] = playerStats.level >= farm.unlockLevel;
        });
        return unlocked;
    }, [playerStats.level]);
    
    // ... (pozostałe logiki pomocnicze jak dailyRewardStatus, unlockedAchievements bez zmian, ale używają `playerData`)

    const handleFarmSelect = (farmKey) => {
        if (unlockedFarms[farmKey]) {
            setPlayerData(prev => ({...prev, selectedFarm: farmKey}));
        }
    };
    
    // ... (pozostałe funkcje `handle...` bez zmian, ale modyfikują `playerData` za pomocą `setPlayerData`)


    // --- RENDEROWANIE KOMPONENTU ---
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
                <header className="mb-6">
                    <h1 className="text-4xl font-bold text-amber-400">TON Miner Tycoon</h1>
                    <div className="mt-4"><TonConnectButton /></div>
                </header>
                
                <nav className="flex justify-center border-b border-gray-700 mb-6">
                    <button onClick={() => setView('farm')} className={`py-2 px-4 text-lg ${view === 'farm' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>Farma</button>
                    <button onClick={() => setView('inventory')} className={`py-2 px-4 text-lg ${view === 'inventory' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>Ekwipunek</button>
                    <button onClick={() => setView('shop')} className={`py-2 px-4 text-lg ${view === 'shop' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>Sklep</button>
                    {/* Tutaj można dodać nowe zakładki, np. Osiągnięcia, Minigry */}
                </nav>

                <main>
                    {/* WIDOK FARMY */}
                    {view === 'farm' && (
                        wallet ? (
                            <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3">
                                <h2 className="text-2xl font-bold mb-4 text-center">Panel Farmy</h2>
                                {isLoading ? <p>Wczytywanie danych farmy...</p> : farmData ? (
                                    <>
                                        <p><strong>Moc Obliczeniowa:</strong> {farmData.hashPower} H/s</p>
                                        <p><strong>Oczekujące Nagrody:</strong> <AnimatedNumber value={farmData.pendingRewards / 1e9} suffix=" TMT" /></p>
                                        <button onClick={handleClaim} disabled={isProcessing || !farmData || farmData.pendingRewards === 0} className="w-full mt-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                                            {isProcessing ? "Przetwarzanie..." : "Odbierz Nagrody"}
                                        </button>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            {Object.entries(MINING_FARMS).map(([key, farm]) => (
                                                <FarmCard 
                                                    key={key} 
                                                    farmKey={key} 
                                                    farm={farm} 
                                                    isSelected={playerData.selectedFarm === key} 
                                                    isUnlocked={unlockedFarms[key]} 
                                                    onSelect={handleFarmSelect}
                                                />
                                            ))}
                                        </div>
                                    </>
                                ) : <p>Nie udało się załadować danych farmy.</p>}
                            </div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel, aby zobaczyć swoją farmę.</p></div>
                    )}

                    {/* Pozostałe widoki (inventory, shop) bez zmian */}
                </main>
            </div>
        </div>
    );
}

export default App;
