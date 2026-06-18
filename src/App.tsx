import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Gamepad2, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  RotateCcw, 
  Skull, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Layers,
  Activity,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ==========================================
// GAME CONSTANTS & SOUNDS SYNTHESIS
// ==========================================

const GRID_SIZE = 20;

interface Segment {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface Direction {
  x: number;
  y: number;
}

interface SpecialFood {
  x: number;
  y: number;
  type: 'gold' | 'poison';
  expiresAt: number;
}

// Retro 8-bit sound synthesizers via Web Audio API 
class RetroSoundSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('snake_audio_muted') === 'true';
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('snake_audio_muted', String(this.muted));
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playEatNormal() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Synthesized retro multi-stage crunch & pop chomp sound
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(580, t);
      osc1.frequency.exponentialRampToValueAtTime(120, t + 0.04);
      gain1.gain.setValueAtTime(0.14, t);
      gain1.gain.exponentialRampToValueAtTime(0.005, t + 0.04);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.04);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(450, t + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(920, t + 0.10);
      gain2.gain.setValueAtTime(0.12, t + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.02);
      osc2.stop(t + 0.10);
    } catch (e) {
      console.warn('Synth error', e);
    }
  }

  playEatGold() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [440, 554, 659, 880, 1100];
      
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const playTime = t + idx * 0.04;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, playTime);
        gain.gain.setValueAtTime(0.1, playTime);
        gain.gain.exponentialRampToValueAtTime(0.01, playTime + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(playTime);
        osc.stop(playTime + 0.13);
      });
    } catch (e) {
      console.warn('Synth error', e);
    }
  }

  playEatPoison() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.linearRampToValueAtTime(80, t + 0.3);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    } catch (e) {
      console.warn('Synth error', e);
    }
  }

  playGameOver() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [330, 293, 261, 196, 146];
      
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const playTime = t + idx * 0.14;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, playTime);
        gain.gain.setValueAtTime(0.14, playTime);
        gain.gain.linearRampToValueAtTime(0.01, playTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(playTime);
        osc.stop(playTime + 0.23);
      });
    } catch (e) {
      console.warn('Synth error', e);
    }
  }

  playTickClick() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.setValueAtTime(50, t + 0.01);
      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.02);
    } catch (e) {}
  }

  playLevelUp() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Arpeggiating digital progression
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const playTime = t + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, playTime);
        gain.gain.setValueAtTime(0.12, playTime);
        gain.gain.exponentialRampToValueAtTime(0.005, playTime + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(playTime);
        osc.stop(playTime + 0.16);
      });
    } catch (e) {
      console.warn('Synth error', e);
    }
  }
}

// Single synth instance
const audioSynth = new RetroSoundSynth();

// Obstacles Definition for Labyrinth map
const LABYRINTH_OBSTACLES: Segment[] = [
  // Top Left L-Shape
  { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 }, { x: 5, y: 4 }, { x: 6, y: 4 },
  // Top Right L-Shape
  { x: 15, y: 4 }, { x: 15, y: 5 }, { x: 15, y: 6 }, { x: 14, y: 4 }, { x: 13, y: 4 },
  // Bottom Left L-Shape
  { x: 4, y: 15 }, { x: 4, y: 14 }, { x: 4, y: 13 }, { x: 5, y: 15 }, { x: 6, y: 15 },
  // Bottom Right L-Shape
  { x: 15, y: 15 }, { x: 15, y: 14 }, { x: 15, y: 13 }, { x: 14, y: 15 }, { x: 13, y: 15 }
];

// Obstacles Definition for Spiral map (Inward spiral ring)
const SPIRAL_OBSTACLES: Segment[] = [
  // Outer top wall
  { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 8, y: 2 }, { x: 9, y: 2 }, { x: 10, y: 2 }, { x: 11, y: 2 }, { x: 12, y: 2 }, { x: 13, y: 2 }, { x: 14, y: 2 }, { x: 15, y: 2 }, { x: 16, y: 2 }, { x: 17, y: 2 },
  // Outer right wall
  { x: 17, y: 3 }, { x: 17, y: 4 }, { x: 17, y: 5 }, { x: 17, y: 6 }, { x: 17, y: 7 }, { x: 17, y: 8 }, { x: 17, y: 9 }, { x: 17, y: 10 }, { x: 17, y: 11 }, { x: 17, y: 12 }, { x: 17, y: 13 }, { x: 17, y: 14 }, { x: 17, y: 15 }, { x: 17, y: 16 }, { x: 17, y: 17 },
  // Outer bottom wall
  { x: 2, y: 17 }, { x: 3, y: 17 }, { x: 4, y: 17 }, { x: 5, y: 17 }, { x: 6, y: 17 }, { x: 7, y: 17 }, { x: 8, y: 17 }, { x: 9, y: 17 }, { x: 10, y: 17 }, { x: 11, y: 17 }, { x: 12, y: 17 }, { x: 13, y: 17 }, { x: 14, y: 17 }, { x: 15, y: 17 }, { x: 16, y: 17 },
  // Outer left wall
  { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }, { x: 2, y: 7 }, { x: 2, y: 8 }, { x: 2, y: 9 }, { x: 2, y: 10 }, { x: 2, y: 11 }, { x: 2, y: 12 }, { x: 2, y: 13 }, { x: 2, y: 14 }, { x: 2, y: 15 }, { x: 2, y: 16 },
  // Inner spiral
  { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 }, { x: 10, y: 5 }, { x: 11, y: 5 }, { x: 12, y: 5 }, { x: 13, y: 5 }, { x: 14, y: 5 },
  { x: 14, y: 6 }, { x: 14, y: 7 }, { x: 14, y: 8 }, { x: 14, y: 9 }, { x: 14, y: 10 }, { x: 14, y: 11 }, { x: 14, y: 12 }, { x: 14, y: 14 },
  { x: 13, y: 14 }, { x: 12, y: 14 }, { x: 11, y: 14 }, { x: 10, y: 14 }, { x: 9, y: 14 }, { x: 8, y: 14 }, { x: 7, y: 14 }, { x: 6, y: 14 }, { x: 5, y: 14 },
  { x: 5, y: 12 }, { x: 5, y: 11 }, { x: 5, y: 10 }, { x: 5, y: 9 }, { x: 5, y: 8 }, { x: 5, y: 7 },
  // Core spiral wall
  { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 }, { x: 11, y: 8 },
  { x: 11, y: 9 }, { x: 11, y: 10 }, { x: 11, y: 11 },
  { x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }
];

// Obstacles Definition for Temple map (Sacred pillars layout)
const TEMPLE_OBSTACLES: Segment[] = [
  // Four corner pillars
  { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 5 },
  { x: 14, y: 4 }, { x: 14, y: 5 }, { x: 15, y: 4 }, { x: 15, y: 5 },
  { x: 4, y: 14 }, { x: 4, y: 15 }, { x: 5, y: 14 }, { x: 5, y: 15 },
  { x: 14, y: 14 }, { x: 14, y: 15 }, { x: 15, y: 14 }, { x: 15, y: 15 },
  // Center cross sanctuary
  { x: 9, y: 8 }, { x: 10, y: 8 },
  { x: 8, y: 9 }, { x: 9, y: 9 }, { x: 10, y: 9 }, { x: 11, y: 9 },
  { x: 8, y: 10 }, { x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 },
  { x: 9, y: 11 }, { x: 10, y: 11 }
];

export default function App() {
  // ==========================================
  // REACT STATES FOR INTERFACE & SETTINGS
  // ==========================================
  const [uiState, setUiState] = useState<'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('MENU');
  const [uiScore, setUiScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('retro_snake_high');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  
  const [mapType, setMapType] = useState<'classic' | 'boxed' | 'labyrinth' | 'spiral' | 'temple'>('classic');
  const [skinType, setSkinType] = useState<'python' | 'neon' | 'monochrome' | 'dragon' | 'cyberpunk' | 'royal'>('python');
  const [isMuted, setIsMuted] = useState<boolean>(audioSynth.isMuted());
  const [poisonActive, setPoisonActive] = useState<boolean>(false);
  const [poisonTimeLeft, setPoisonTimeLeft] = useState<number>(0);
  const [goldItemCountdown, setGoldItemCountdown] = useState<number | null>(null);
  const [startLevel, setStartLevel] = useState<number>(1);
  const [currentLevel, setCurrentLevel] = useState<number>(1);

  // System temperature mock simulation element (slowly fluctuates near 30-36C)
  const [sysTemp, setSysTemp] = useState<number>(32);

  // ==========================================
  // REF-BASED TRUTH SOURCE FOR RETRO GAME LOOP
  // ==========================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const stateRef = useRef<'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('MENU');
  stateRef.current = uiState; 
  
  const snakeRef = useRef<Segment[]>([]);
  const directionRef = useRef<Direction>({ x: 0, y: -1 });
  const nextDirectionRef = useRef<Direction>({ x: 0, y: -1 });
  
  const foodRef = useRef<Segment>({ x: 10, y: 10 });
  const specialFoodRef = useRef<SpecialFood | null>(null);
  const mapTypeRef = useRef<'classic' | 'boxed' | 'labyrinth' | 'spiral' | 'temple'>('classic');
  mapTypeRef.current = mapType;
  
  const scoreRef = useRef<number>(0);
  const gameIntervalRef = useRef<number>(140); 
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef<number>(0);
  
  // Controls Reversal Status
  const poisonTimerRef = useRef<number>(0); 
  
  // Animation loop management
  const lastUpdateTimeRef = useRef<number>(0);
  const frameIdRef = useRef<number | null>(null);

  // Fluctuating system temperature mockup effect
  useEffect(() => {
    const intv = setInterval(() => {
      setSysTemp(prev => {
        const offset = Math.random() > 0.5 ? 0.4 : -0.4;
        const target = prev + offset;
        return Number(Math.max(30.0, Math.min(36.0, target)).toFixed(1));
      });
    }, 4000);
    return () => clearInterval(intv);
  }, []);

  // ==========================================
  // INITIALIZE / RESET GAME STATE
  // ==========================================
  const handleStartGame = () => {
    const startResult = getRandomStart(mapType);
    snakeRef.current = startResult.snake;
    directionRef.current = startResult.direction;
    nextDirectionRef.current = { ...startResult.direction };

    scoreRef.current = 0;
    setUiScore(0);
    
    // Velocity levels 1-5 adjust initial tick length (faster is harder)
    const levelIntervals = [150, 125, 100, 80, 60];
    gameIntervalRef.current = levelIntervals[startLevel - 1] || 125;
    setCurrentLevel(startLevel);
    
    spawnNormalFood();
    specialFoodRef.current = null;
    setGoldItemCountdown(null);
    
    poisonTimerRef.current = 0;
    setPoisonActive(false);
    setPoisonTimeLeft(0);
    
    particlesRef.current = [];
    floatingTextsRef.current = [];
    screenShakeRef.current = 0;
    
    lastUpdateTimeRef.current = 0;
    setUiState('PLAYING');
    audioSynth.playTickClick();
  };

  const handlePauseToggle = () => {
    if (uiState === 'PLAYING') {
      setUiState('PAUSED');
      audioSynth.playTickClick();
    } else if (uiState === 'PAUSED') {
      setUiState('PLAYING');
      audioSynth.playTickClick();
    }
  };

  const handleReturnToMenu = () => {
    setUiState('MENU');
    audioSynth.playTickClick();
  };

  const handleMuteToggle = () => {
    const isNowMuted = audioSynth.toggleMute();
    setIsMuted(isNowMuted);
  };

  // Helper: Generates starting conditions based on a random board edge
  const getRandomStart = (currentMap: 'classic' | 'boxed' | 'labyrinth' | 'spiral' | 'temple') => {
    const edge = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
    let x = 10;
    let y = 10;
    let dx = 1;
    let dy = 0;

    const isCollidingWithLabyrinthWall = (cx: number, cy: number) => {
      if (currentMap === 'labyrinth') return LABYRINTH_OBSTACLES.some(b => b.x === cx && b.y === cy);
      if (currentMap === 'spiral') return SPIRAL_OBSTACLES.some(b => b.x === cx && b.y === cy);
      if (currentMap === 'temple') return TEMPLE_OBSTACLES.some(b => b.x === cx && b.y === cy);
      return false;
    };

    let attempts = 0;
    let foundValid = false;

    while (!foundValid && attempts < 50) {
      attempts++;
      const coord = Math.floor(Math.random() * 10) + 5; 
      
      if (edge === 0) {
        x = coord;
        y = 0;
        dx = 0;
        dy = 1;
      } else if (edge === 1) {
        x = GRID_SIZE - 1;
        y = coord;
        dx = -1;
        dy = 0;
      } else if (edge === 2) {
        x = coord;
        y = GRID_SIZE - 1;
        dx = 0;
        dy = -1;
      } else {
        x = 0;
        y = coord;
        dx = 1;
        dy = 0;
      }

      if (!isCollidingWithLabyrinthWall(x, y)) {
        foundValid = true;
      }
    }

    const initialSnake: Segment[] = [
      { x: x, y: y },
      { x: x - dx, y: y - dy },
      { x: x - 2 * dx, y: y - 2 * dy }
    ];

    return { snake: initialSnake, direction: { x: dx, y: dy } };
  };

  // ==========================================
  // SPAWNING ALGORITHMS (SAFE FROM SNAKE / MAZES)
  // ==========================================
  const getRandomEmptyCell = (): Segment => {
    let attempts = 0;
    let fallbackAndReset = { x: 10, y: 10 };
    
    while (attempts < 200) {
      attempts++;
      const rx = Math.floor(Math.random() * GRID_SIZE);
      const ry = Math.floor(Math.random() * GRID_SIZE);
      
      const hitsSnake = snakeRef.current.some(seg => seg.x === rx && seg.y === ry);
      
      const hitsMaze = 
        (mapTypeRef.current === 'labyrinth' && LABYRINTH_OBSTACLES.some(w => w.x === rx && w.y === ry)) ||
        (mapTypeRef.current === 'spiral' && SPIRAL_OBSTACLES.some(w => w.x === rx && w.y === ry)) ||
        (mapTypeRef.current === 'temple' && TEMPLE_OBSTACLES.some(w => w.x === rx && w.y === ry));
      
      const hitsOtherFruit = (specialFoodRef.current && specialFoodRef.current.x === rx && specialFoodRef.current.y === ry) ||
                             (foodRef.current.x === rx && foodRef.current.y === ry);

      if (!hitsSnake && !hitsMaze && !hitsOtherFruit) {
        return { x: rx, y: ry };
      }
      fallbackAndReset = { x: rx, y: ry };
    }
    return fallbackAndReset; 
  };

  const spawnNormalFood = () => {
    foodRef.current = getRandomEmptyCell();
  };

  const trySpawnSpecialFood = () => {
    if (specialFoodRef.current) return;

    if (Math.random() < 0.35) {
      const cell = getRandomEmptyCell();
      const randType: 'gold' | 'poison' = Math.random() < 0.4 ? 'gold' : 'poison';
      
      specialFoodRef.current = {
        x: cell.x,
        y: cell.y,
        type: randType,
        expiresAt: randType === 'gold' ? Date.now() + 5000 : Date.now() + 10000 
      };
    }
  };

  // ==========================================
  // PHYSICAL COLLISION AND TICK UPDATE
  // ==========================================
  const updateGameTick = () => {
    const snake = [...snakeRef.current];
    if (snake.length === 0) return;
    
    directionRef.current = { ...nextDirectionRef.current };
    const curDir = directionRef.current;
    
    let nextHeadX = snake[0].x + curDir.x;
    let nextHeadY = snake[0].y + curDir.y;
    
    const map = mapTypeRef.current;
    if (map === 'boxed') {
      if (nextHeadX < 0 || nextHeadX >= GRID_SIZE || nextHeadY < 0 || nextHeadY >= GRID_SIZE) {
        handleGameOver();
        return;
      }
    } else {
      if (nextHeadX < 0) nextHeadX = GRID_SIZE - 1;
      if (nextHeadX >= GRID_SIZE) nextHeadX = 0;
      if (nextHeadY < 0) nextHeadY = GRID_SIZE - 1;
      if (nextHeadY >= GRID_SIZE) nextHeadY = 0;
    }

    if (map === 'labyrinth') {
      const hitsWall = LABYRINTH_OBSTACLES.some(w => w.x === nextHeadX && w.y === nextHeadY);
      if (hitsWall) {
        handleGameOver();
        return;
      }
    } else if (map === 'spiral') {
      const hitsWall = SPIRAL_OBSTACLES.some(w => w.x === nextHeadX && w.y === nextHeadY);
      if (hitsWall) {
        handleGameOver();
        return;
      }
    } else if (map === 'temple') {
      const hitsWall = TEMPLE_OBSTACLES.some(w => w.x === nextHeadX && w.y === nextHeadY);
      if (hitsWall) {
        handleGameOver();
        return;
      }
    }

    const hitsSelf = snake.some((seg, idx) => idx > 0 && seg.x === nextHeadX && seg.y === nextHeadY);
    if (hitsSelf) {
      handleGameOver();
      return;
    }

    const newHead: Segment = { x: nextHeadX, y: nextHeadY };
    snake.unshift(newHead);

    let hasEaten = false;

    if (nextHeadX === foodRef.current.x && nextHeadY === foodRef.current.y) {
      hasEaten = true;
      scoreRef.current += 10;
      setUiScore(scoreRef.current);
      audioSynth.playEatNormal();
      
      spawnParticlesAt(foodRef.current.x, foodRef.current.y, '#ef4444', 16);
      spawnFloatingTextAt(foodRef.current.x, foodRef.current.y, '+10', '#f87171');
      
      gameIntervalRef.current = Math.max(45, gameIntervalRef.current - 2);

      // Active level progress incrementing every 4 apples (40 pts)
      const nextLvl = startLevel + Math.floor(scoreRef.current / 40);
      setCurrentLevel(prev => {
        if (nextLvl > prev) {
          audioSynth.playLevelUp();
          // celebratory blue and cyan visual sparks
          spawnParticlesAt(foodRef.current.x, foodRef.current.y, '#3b82f6', 26);
          spawnFloatingTextAt(foodRef.current.x, foodRef.current.y, `LEVEL ${nextLvl}!`, '#3b82f6', true);
          gameIntervalRef.current = Math.max(40, gameIntervalRef.current - 8);
          return nextLvl;
        }
        return prev;
      });

      spawnNormalFood();
      trySpawnSpecialFood();
    }

    const spec = specialFoodRef.current;
    if (spec && nextHeadX === spec.x && nextHeadY === spec.y) {
      hasEaten = true;
      if (spec.type === 'gold') {
        scoreRef.current += 50;
        setUiScore(scoreRef.current);
        audioSynth.playEatGold();
        
        spawnParticlesAt(spec.x, spec.y, '#eab308', 35);
        spawnFloatingTextAt(spec.x, spec.y, '+50 GOLDEN!', '#facc15', true);
        screenShakeRef.current = 15; 
      } else {
        scoreRef.current = Math.max(0, scoreRef.current - 10);
        setUiScore(scoreRef.current);
        audioSynth.playEatPoison();
        
        spawnParticlesAt(spec.x, spec.y, '#a855f7', 22);
        spawnFloatingTextAt(spec.x, spec.y, 'REVERSED CONTROLS! -10', '#c084fc');
        
        poisonTimerRef.current = 5000;
        setPoisonActive(true);
        setPoisonTimeLeft(5);
        screenShakeRef.current = 8;
      }
      specialFoodRef.current = null;
      setGoldItemCountdown(null);
    }

    if (!hasEaten) {
      snake.pop();
    }

    snakeRef.current = snake;
  };

  const handleGameOver = () => {
    setUiState('GAMEOVER');
    audioSynth.playGameOver();
    screenShakeRef.current = 40; 
    
    if (scoreRef.current > highScore) {
      localStorage.setItem('retro_snake_high', String(scoreRef.current));
      setHighScore(scoreRef.current);
      spawnFloatingTextAt(10, 10, 'NEW HIGH SCORE!', '#10b981', true);
    }
  };

  // ==========================================
  // ANIMATION EFFECTS & SHAKE ENGINE
  // ==========================================
  const spawnParticlesAt = (gridX: number, gridY: number, color: string, count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tileWidth = canvas.width / GRID_SIZE;
    
    const px = gridX * tileWidth + tileWidth / 2;
    const py = gridY * tileWidth + tileWidth / 2;

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1.5;
      const life = Math.random() * 20 + 15;
      newParticles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        alpha: 1,
        size: Math.random() * 3.5 + 1.5,
        life: life,
        maxLife: life
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  const spawnFloatingTextAt = (gridX: number, gridY: number, text: string, color: string, pulse = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tileWidth = canvas.width / GRID_SIZE;
    
    const px = gridX * tileWidth + tileWidth / 2;
    const py = gridY * tileWidth;

    const ft: FloatingText = {
      x: px,
      y: py,
      text: text,
      color: color,
      alpha: 1,
      life: 50,
      maxLife: 50,
      scale: pulse ? 1.5 : 1.0
    };
    floatingTextsRef.current = [...floatingTextsRef.current, ft];
  };

  // ==========================================
  // KEYBOARD CONTROLS DIRECTIVE
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key.toLowerCase() === 'p') {
        handlePauseToggle();
        return;
      }

      if (uiState !== 'PLAYING') return;

      const isReverse = poisonTimerRef.current > 0;
      let targetKy = e.key;

      if (isReverse) {
        if (e.key === 'ArrowUp') targetKy = 'ArrowDown';
        else if (e.key === 'ArrowDown') targetKy = 'ArrowUp';
        else if (e.key === 'ArrowLeft') targetKy = 'ArrowRight';
        else if (e.key === 'ArrowRight') targetKy = 'ArrowLeft';
      }

      const curDir = directionRef.current;

      if (targetKy === 'ArrowUp' && curDir.y === 0) {
        nextDirectionRef.current = { x: 0, y: -1 };
      } else if (targetKy === 'ArrowDown' && curDir.y === 0) {
        nextDirectionRef.current = { x: 0, y: 1 };
      } else if (targetKy === 'ArrowLeft' && curDir.x === 0) {
        nextDirectionRef.current = { x: -1, y: 0 };
      } else if (targetKy === 'ArrowRight' && curDir.x === 0) {
        nextDirectionRef.current = { x: 1, y: 0 };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [uiState]);

  // ON-SCREEN BUTTONS (TOUCH REACTION FLOW)
  const handleVirtualPress = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (uiState !== 'PLAYING') return;
    
    audioSynth.playTickClick();

    const isReverse = poisonTimerRef.current > 0;
    let actualDir = dir;

    if (isReverse) {
      if (dir === 'UP') actualDir = 'DOWN';
      else if (dir === 'DOWN') actualDir = 'UP';
      else if (dir === 'LEFT') actualDir = 'RIGHT';
      else if (dir === 'RIGHT') actualDir = 'LEFT';
    }

    const curDir = directionRef.current;
    if (actualDir === 'UP' && curDir.y === 0) {
      nextDirectionRef.current = { x: 0, y: -1 };
    } else if (actualDir === 'DOWN' && curDir.y === 0) {
      nextDirectionRef.current = { x: 0, y: 1 };
    } else if (actualDir === 'LEFT' && curDir.x === 0) {
      nextDirectionRef.current = { x: -1, y: 0 };
    } else if (actualDir === 'RIGHT' && curDir.x === 0) {
      nextDirectionRef.current = { x: 1, y: 0 };
    }
  };

  // ==========================================
  // UNIFIED ANIMATION & RENDERING THREAD (60 FPS)
  // ==========================================
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;

      const elapsed = timestamp - lastUpdateTimeRef.current;
      
      if (uiState === 'PLAYING') {
        const delta = Math.min(elapsed, 200); 
        
        if (poisonTimerRef.current > 0) {
          poisonTimerRef.current = Math.max(0, poisonTimerRef.current - delta);
          setPoisonTimeLeft(Math.ceil(poisonTimerRef.current / 1000));
          if (poisonTimerRef.current <= 0) {
            setPoisonActive(false);
          }
        }
        
        const spec = specialFoodRef.current;
        if (spec && spec.type === 'gold') {
          const goldLeft = Math.ceil(Math.max(0, spec.expiresAt - Date.now()) / 1000);
          setGoldItemCountdown(goldLeft);
          if (Date.now() > spec.expiresAt) {
            specialFoodRef.current = null;
            setGoldItemCountdown(null);
          }
        } else if (spec && spec.type === 'poison') {
          if (Date.now() > spec.expiresAt) {
            specialFoodRef.current = null;
          }
        }

        if (elapsed >= gameIntervalRef.current) {
          updateGameTick();
          lastUpdateTimeRef.current = timestamp;
        }
      } else {
        lastUpdateTimeRef.current = timestamp;
      }

      // Update Particle physics
      const particles = [...particlesRef.current];
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
      particlesRef.current = particles;

      // Update Floating Texts
      const fts = [...floatingTextsRef.current];
      for (let i = fts.length - 1; i >= 0; i--) {
        const ft = fts[i];
        ft.y -= 0.65; 
        ft.life--;
        ft.alpha = ft.life / ft.maxLife;
        if (ft.life <= 0) {
          fts.splice(i, 1);
        }
      }
      floatingTextsRef.current = fts;

      // Dampen Screen Shake
      if (screenShakeRef.current > 0) {
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 1);
      }

      drawCanvas();

      frameIdRef.current = requestAnimationFrame(loop);
    };

    frameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [uiState, mapType]);

  // ==========================================
  // COMPREHENSIVE CANVAS GRAPHICS DRAW ENGINE
  // ==========================================
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const tileW = w / GRID_SIZE;

    ctx.save();

    if (screenShakeRef.current > 0) {
      const sx = (Math.random() - 0.5) * screenShakeRef.current;
      const sy = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(sx, sy);
    }

    // Deep modern charcoal / base arcade backdrop
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, w, h);

    // Faint radial gradient glow centered on the screen to give the canvas more depth
    const grad = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, Math.max(w, h) * 0.72);
    grad.addColorStop(0, '#02381b'); // Very deep dark-forest-green highlight center
    grad.addColorStop(0.42, '#051910'); 
    grad.addColorStop(1, '#09090b'); // Dark charcoal page matching edge
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dark green bordered tiles on the board
    ctx.strokeStyle = '#05381f'; 
    ctx.lineWidth = 1;
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        ctx.strokeRect(x * tileW, y * tileW, tileW, tileW);
      }
    }

    // Boxed border
    if (mapType === 'boxed') {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.shadowBlur = 0; 
    }

    // Maze Labyrinth / Spiral / Temple Blockades
    if (mapType === 'labyrinth') {
      LABYRINTH_OBSTACLES.forEach(wall => {
        ctx.fillStyle = '#27272a';
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#27272a';
        
        ctx.fillRect(wall.x * tileW + 1, wall.y * tileW + 1, tileW - 2, tileW - 2);
        ctx.strokeRect(wall.x * tileW + 2, wall.y * tileW + 2, tileW - 4, tileW - 4);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#18181b';
        ctx.fillRect(wall.x * tileW + 6, wall.y * tileW + 6, tileW - 12, tileW - 12);
      });
    } else if (mapType === 'spiral') {
      SPIRAL_OBSTACLES.forEach(wall => {
        ctx.fillStyle = '#451a03'; // Deep bronze/rust
        ctx.strokeStyle = '#ea580c'; // Vibrant copper outline
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#451a03';
        
        ctx.fillRect(wall.x * tileW + 1, wall.y * tileW + 1, tileW - 2, tileW - 2);
        ctx.strokeRect(wall.x * tileW + 2, wall.y * tileW + 2, tileW - 4, tileW - 4);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#1c1917';
        ctx.fillRect(wall.x * tileW + 6, wall.y * tileW + 6, tileW - 12, tileW - 12);
      });
    } else if (mapType === 'temple') {
      TEMPLE_OBSTACLES.forEach(wall => {
        ctx.fillStyle = '#1e1b4b'; // Ancient navy/indigo monolith
        ctx.strokeStyle = '#6366f1'; // Sacred violet magic outline
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#1e1b4b';
        
        ctx.fillRect(wall.x * tileW + 1, wall.y * tileW + 1, tileW - 2, tileW - 2);
        ctx.strokeRect(wall.x * tileW + 2, wall.y * tileW + 2, tileW - 4, tileW - 4);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wall.x * tileW + 6, wall.y * tileW + 6, tileW - 12, tileW - 12);
      });
    }

    // Normal Apple
    const fx = foodRef.current.x * tileW;
    const fy = foodRef.current.y * tileW;
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(fx + tileW / 2, fy + tileW / 2 + 1, tileW / 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(fx + tileW / 2 + 2, fy + 3, 2, 4, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Golden / Poison special fruits
    const spec = specialFoodRef.current;
    if (spec) {
      const sx = spec.x * tileW;
      const sy = spec.y * tileW;

      if (spec.type === 'gold') {
        const pulseRatio = 1 + Math.sin(Date.now() * 0.01) * 0.15;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sx + tileW / 2, sy + tileW / 2, (tileW / 2.3) * pulseRatio, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx + tileW / 2 - 3, sy + tileW / 2 - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#a855f7';
        ctx.fillStyle = '#9333ea';
        ctx.beginPath();
        ctx.arc(sx + tileW / 2, sy + tileW / 2, tileW / 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(sx + tileW / 2, sy + tileW / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Snake rendering
    const snake = snakeRef.current;
    if (snake && snake.length > 0) {
      snake.forEach((seg, index) => {
        const isHead = index === 0;
        const px = seg.x * tileW;
        const py = seg.y * tileW;

        // --- SNAKE SLITHER CALCULATOR ---
        // 1. Determine direction unit vector (forward/backward)
        let dirX = directionRef.current.x;
        let dirY = directionRef.current.y;

        if (index > 0) {
          const prev = snake[index - 1];
          let diffX = prev.x - seg.x;
          let diffY = prev.y - seg.y;

          // Wrap-around coordinate adjustment for classic mode
          if (diffX > GRID_SIZE / 2) diffX -= GRID_SIZE;
          else if (diffX < -GRID_SIZE / 2) diffX += GRID_SIZE;

          if (diffY > GRID_SIZE / 2) diffY -= GRID_SIZE;
          else if (diffY < -GRID_SIZE / 2) diffY += GRID_SIZE;

          const len = Math.sqrt(diffX * diffX + diffY * diffY);
          if (len > 0) {
            dirX = diffX / len;
            dirY = diffY / len;
          }
        }

        // Perpendicular unit vector for the lateral wiggle
        const perpX = -dirY;
        const perpY = dirX;

        // Wave propagation down the snake body:
        // Amplitude is 0 at the head (makes gameplay collision 100% precise)
        // and grows along the body segments for a gorgeous real organic slither.
        const slitherAmp = tileW * 0.22 * Math.min(1.0, index * 0.35);
        // Frequency and wavelength variables matching a real, smooth serpentine rhythm
        const waveFreq = 0.012; 
        const waveLength = 0.55; 
        const phase = Date.now() * waveFreq - index * waveLength;
        const slitherOffset = Math.sin(phase) * slitherAmp;

        // Dynamic center of drawing (adds sinuous S-curve offset perpendicular to moving vector)
        const cx = px + tileW / 2 + perpX * slitherOffset;
        const cy = py + tileW / 2 + perpY * slitherOffset;

        // 2. Body Tapering Scale (grows slightly at head/neck, then tapers to tail)
        const totalSegments = snake.length;
        let scale = 1.0;
        if (isHead) {
          scale = 1.1; // Head is slightly wider and distinct
        } else {
          const t = index / totalSegments; // normalized index [0..1]
          if (t < 0.15) {
            // snake neck / upper body is full size
            scale = 0.95 + (t / 0.15) * 0.12; 
          } else {
            // graceful taper down towards the tail tip
            scale = 1.07 - ((t - 0.15) / 0.85) * 0.65; 
          }
        }

        // 3. Render cosmetic skins aligned layout
        if (skinType === 'python') {
          ctx.fillStyle = isHead ? '#10b981' : '#047857';
          ctx.beginPath();
          if (isHead) {
            const size = (tileW - 2) * scale;
            ctx.roundRect(cx - size / 2, cy - size / 2, size, size, 6 * scale);
          } else {
            const size = (tileW - 3) * scale;
            ctx.roundRect(cx - size / 2, cy - size / 2, size, size, 4 * scale);
          }
          ctx.fill();

          // Python spotted pattern along the back
          if (!isHead) {
            ctx.fillStyle = '#fbbf24'; 
            ctx.beginPath();
            ctx.arc(cx, cy, 2.5 * scale, 0, Math.PI * 2);
            ctx.fill();
          }

        } else if (skinType === 'neon') {
          ctx.shadowBlur = 12;
          if (isHead) {
            ctx.fillStyle = '#22d3ee'; 
            ctx.shadowColor = '#22d3ee';
          } else {
            ctx.fillStyle = '#ec4899'; 
            ctx.shadowColor = '#ec4899';
          }

          const size = (tileW - 2) * scale;
          ctx.beginPath();
          ctx.roundRect(cx - size / 2, cy - size / 2, size, size, 5 * scale);
          ctx.fill();
          ctx.shadowBlur = 0; 

        } else if (skinType === 'monochrome') {
          ctx.fillStyle = isHead ? '#f4f4f5' : '#71717a';
          const size = (tileW - 2) * scale;
          ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#09090b';
          ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
        } else if (skinType === 'dragon') {
          ctx.shadowBlur = isHead ? 14 : 4;
          ctx.shadowColor = '#f97316';
          ctx.fillStyle = isHead ? '#ef4444' : (index % 2 === 0 ? '#ea580c' : '#b91c1c'); // scale colors!
          const size = (tileW - 1) * scale;
          ctx.beginPath();
          // Draw dynamic diamond dragon-scale
          ctx.moveTo(cx, cy - size / 2);
          ctx.lineTo(cx + size / 2, cy);
          ctx.lineTo(cx, cy + size / 2);
          ctx.lineTo(cx - size / 2, cy);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          // Dragon flame orange core
          if (!isHead) {
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(cx, cy, 1.8 * scale, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (skinType === 'cyberpunk') {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#06b6d4'; // bright teal glow
          ctx.fillStyle = isHead ? '#06b6d4' : (index % 2 === 0 ? '#4f46e5' : '#1e1b4b'); // Tech network matrix colors
          const size = (tileW - 3) * scale;
          ctx.beginPath();
          ctx.rect(cx - size / 2, cy - size / 2, size, size);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Laser core line
          ctx.fillStyle = '#a21caf'; // bright magenta tech line
          ctx.fillRect(cx - scale, cy - size / 2, 2 * scale, size);
        } else if (skinType === 'royal') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#eab308'; // royal gold glow
          ctx.fillStyle = isHead ? '#ffd700' : '#1e1b4b'; // crown-gold head, velvet navy-blue pearls body
          const size = (isHead ? tileW - 1 : tileW - 2) * scale;
          ctx.beginPath();
          ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Crown jewel rubies inside each segment
          if (!isHead) {
            ctx.fillStyle = '#ec4899'; // Ruby centerpiece
            ctx.beginPath();
            ctx.arc(cx, cy, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Render Eyes relative to dynamic center
        if (isHead) {
          ctx.fillStyle = '#ffffff';
          
          // Using general geometry of head direction and perpendicular vector
          const eyeForward = tileW * 0.22;
          const eyeLateral = tileW * 0.24;
          
          const eyeX1 = cx + dirX * eyeForward - perpX * eyeLateral;
          const eyeY1 = cy + dirY * eyeForward - perpY * eyeLateral;
          
          const eyeX2 = cx + dirX * eyeForward + perpX * eyeLateral;
          const eyeY2 = cy + dirY * eyeForward + perpY * eyeLateral;

          ctx.beginPath();
          ctx.arc(eyeX1, eyeY1, 2 * scale, 0, Math.PI * 2);
          ctx.arc(eyeX2, eyeY2, 2 * scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(eyeX1, eyeY1, 1 * scale, 0, Math.PI * 2);
          ctx.arc(eyeX2, eyeY2, 1 * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Forked Tongue flickering in/out organically
        if (isHead) {
          const tongueCycle = Date.now() % 650; // 650ms loop
          const isTongueOut = tongueCycle < 280; // Visible for 280ms
          
          if (isTongueOut) {
            // Mouth is at front edge of the head
            const mouthX = cx + dirX * (tileW * 0.45 * scale);
            const mouthY = cy + dirY * (tileW * 0.45 * scale);

            // Red flickering extension with harmonic breathing length factor
            const tongueStemLength = (tileW * 0.35 + Math.abs(Math.sin(Date.now() * 0.02)) * (tileW * 0.2)) * scale;
            const stemEndX = mouthX + dirX * tongueStemLength;
            const stemEndY = mouthY + dirY * tongueStemLength;

            const forkLen = tileW * 0.22 * scale;
            const forkLeftX = stemEndX + (dirX * 0.75 - perpX * 0.75) * forkLen;
            const forkLeftY = stemEndY + (dirY * 0.75 - perpY * 0.75) * forkLen;

            const forkRightX = stemEndX + (dirX * 0.75 + perpX * 0.75) * forkLen;
            const forkRightY = stemEndY + (dirY * 0.75 + perpY * 0.75) * forkLen;

            ctx.save();
            ctx.shadowBlur = skinType === 'neon' ? 6 : 0;
            ctx.shadowColor = '#ef4444';
            ctx.strokeStyle = '#ef4444'; // Forked crimson-red tongue
            ctx.lineWidth = 2.2 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(mouthX, mouthY);
            ctx.lineTo(stemEndX, stemEndY);
            
            // Fork 1
            ctx.moveTo(stemEndX, stemEndY);
            ctx.lineTo(forkLeftX, forkLeftY);
            
            // Fork 2
            ctx.moveTo(stemEndX, stemEndY);
            ctx.lineTo(forkRightX, forkRightY);
            
            ctx.stroke();
            ctx.restore();
          }
        }
      });
    }

    // Particles
    const particles = particlesRef.current;
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Floating text overlays
    const fts = floatingTextsRef.current;
    fts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.font = `bold ${11 * ft.scale}px 'Press Start 2P', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    if (poisonTimerRef.current > 0) {
      const alphaPulse = 0.08 + Math.sin(Date.now() * 0.015) * 0.04;
      ctx.strokeStyle = `rgba(147, 51, 234, ${alphaPulse * 5})`;
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, w - 14, h - 14);
    }

    if (stateRef.current === 'GAMEOVER') {
      const pulseRate = Math.abs(Math.sin(Date.now() * 0.007));
      ctx.save();
      // Intense red shockwave flash
      ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + 0.12 * pulseRate})`;
      ctx.fillRect(0, 0, w, h);

      // Dark red vignette closing-in borders
      const rGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75);
      rGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rGrad.addColorStop(1, `rgba(153, 27, 27, ${0.72 + 0.18 * pulseRate})`);
      ctx.fillStyle = rGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    ctx.restore();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col p-4 sm:p-6 overflow-x-hidden font-sans select-none border-4 border-zinc-900">
      
      {/* 1. HEADER SECTION (Bento styled banner) */}
      <header className="flex justify-between items-center mb-5 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 shadow-sm w-full max-w-5xl mx-auto flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tighter uppercase italic flex items-center space-x-2">
            <span>SLITHER ARCADE</span>
          </h1>
        </div>

        {/* Audio Muted Indicator / Toggle */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleMuteToggle}
            className={`p-2 bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition-all border border-zinc-700/50 flex items-center justify-center ${
              isMuted ? 'text-rose-400 border-rose-900/60' : 'text-zinc-400 hover:text-emerald-400'
            }`}
            title={isMuted ? "Unmute system" : "Mute system"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div className="flex flex-col items-end leading-none">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">HIGH SCORE</span>
            <span className="text-lg sm:text-xl font-mono text-emerald-400 font-bold mt-1">
              {String(highScore).padStart(4, '0')}
            </span>
          </div>
        </div>
      </header>

      {/* 2. DYNAMIC SYSTEM STATUS ALERT (If poisoned or gold countdown active) */}
      <div className="w-full max-w-5xl mx-auto">
        <AnimatePresence>
          {poisonActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              className="mb-4 bg-purple-950/80 border border-purple-800 text-purple-300 p-3 rounded-xl flex items-center justify-between text-xs font-mono shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center space-x-2">
                <Skull className="w-4 h-4 text-purple-400 animate-bounce" />
                <span>
                  <strong>CORRUPT DATA INTRUSION:</strong> Direction controls inverted!
                </span>
              </div>
              <div className="bg-purple-900/85 text-purple-200 px-2 py-0.5 rounded font-bold">
                {poisonTimeLeft}s
              </div>
            </motion.div>
          )}

          {goldItemCountdown !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4 bg-amber-950/80 border border-amber-550/60 text-amber-200 p-3 rounded-xl flex items-center justify-between text-xs font-mono shadow-lg animate-pulse"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  <strong>GOLD DISCOVERY INDEX:</strong> Rare treasure detected. Capture immediately!
                </span>
              </div>
              <div className="bg-amber-800 text-amber-100 px-2 py-0.5 rounded font-bold">
                {goldItemCountdown}s
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. CORE ARCHITECTURE BENTO GRID */}
      <main className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full max-w-5xl mx-auto flex-1 items-stretch">
        
        {/* ==========================================
            LEFT COLUMN (BENTO ASIDES: SCORE & ARENA)
            ========================================== */}
        <aside className="col-span-1 md:col-span-3 flex flex-col gap-4">
          
          {/* Current Score Bento Box */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center shadow-lg relative overflow-hidden backdrop-blur-md flex-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl" />
            <Activity className="w-5 h-5 text-zinc-500 mb-2" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Current Session</span>
            <div className="text-6xl font-mono font-black text-emerald-500 my-2 tracking-tighter">
              {uiScore}
            </div>
            
            {/* Realtime Speed & Level displays stacked perfectly */}
            <div className="flex flex-col gap-1.5 w-full items-center mt-2">
              <div className="text-[10.5px] text-zinc-400 bg-zinc-800/50 border border-zinc-805 py-1 px-3.5 rounded-full uppercase tracking-wider font-mono w-full text-center">
                Speed: <span className="font-bold text-emerald-400">{(140 / gameIntervalRef.current).toFixed(1)}x</span>
              </div>
              <div className="text-[10.5px] text-zinc-400 bg-zinc-800/50 border border-zinc-805 py-1 px-3.5 rounded-full uppercase tracking-wider font-mono w-full text-center">
                Level: <span className="font-bold text-cyan-400">{currentLevel}</span>
              </div>
            </div>
          </div>

          {/* Arena Selector Bento Box */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md">
            <div className="flex items-center space-x-1.5 mb-4 border-b border-zinc-800 pb-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Arena</h3>
            </div>
            
            <div className="space-y-2">
              {(['classic', 'boxed', 'labyrinth', 'spiral', 'temple'] as const).map((map) => (
                <button
                  key={map}
                  onClick={() => { setMapType(map); audioSynth.playTickClick(); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono uppercase transition-all duration-150 border ${
                    mapType === map
                      ? 'bg-emerald-500/10 border-emerald-500/80 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{map}</span>
                    <span className="text-[9px] text-zinc-500 lowercase pr-1">
                      {map === 'classic' ? 'wrap' : map === 'boxed' ? 'solid' : map === 'labyrinth' ? 'l-maze' : map === 'spiral' ? 'coils' : 'shrines'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[9px] text-zinc-500 mt-3 italic font-mono leading-relaxed">
              {mapType === 'classic' && "* Standard board. Screen wraps seamlessly."}
              {mapType === 'boxed' && "* Solid borders. Collision causes immediate death."}
              {mapType === 'labyrinth' && "* Symmetric inner blockades inside grid."}
              {mapType === 'spiral' && "* Deep copper/bronze coils inward spiral wall."}
              {mapType === 'temple' && "* Sacred pillar monolith ruins sanctuary."}
            </p>
          </div>

          {/* Starting Level Selection Bento Box */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md">
            <div className="flex items-center space-x-1.5 mb-4 border-b border-zinc-800 pb-2">
              <Trophy className="w-4 h-4 text-zinc-300" />
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">Difficulty Level</h3>
            </div>
            
            <div className="flex flex-col gap-1.5">
              {[
                { lvl: 1, name: 'L1 - Easy', speed: 'Slow' },
                { lvl: 2, name: 'L2 - Normal', speed: 'Medium' },
                { lvl: 3, name: 'L3 - Hard', speed: 'Fast' },
                { lvl: 4, name: 'L4 - Expert', speed: 'Turbo' },
                { lvl: 5, name: 'L5 - Nightmare', speed: 'Insane' },
              ].map((item) => (
                <button
                  key={item.lvl}
                  onClick={() => { setStartLevel(item.lvl); setCurrentLevel(item.lvl); audioSynth.playTickClick(); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all duration-150 border flex justify-between items-center ${
                    startLevel === item.lvl
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)] bg-zinc-850'
                      : 'bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:border-zinc-750/70 hover:text-zinc-200'
                  }`}
                  title={`Select Difficulty Speed Level ${item.lvl}`}
                  disabled={uiState === 'PLAYING'}
                >
                  <span>{item.name}</span>
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                    item.lvl === 1 ? 'text-emerald-400 bg-emerald-950/40' :
                    item.lvl === 2 ? 'text-cyan-400 bg-cyan-950/40' :
                    item.lvl === 3 ? 'text-amber-400 bg-amber-950/40' :
                    item.lvl === 4 ? 'text-orange-400 bg-orange-950/45' :
                    'text-rose-400 bg-rose-950/45 animate-pulse'
                  }`}>
                    {item.speed}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[9px] text-zinc-500 mt-3 font-mono leading-relaxed">
              * Starts with slower or highly accelerated pace. Accelerates further as game score builds up.
            </p>
          </div>
        </aside>

        {/* ==========================================
            MAIN COLUMN (BENTO CONTENT: GAME CANVAS)
            ========================================== */}
        <section className="col-span-1 md:col-span-9 relative flex flex-col justify-center items-center">
          <div className="w-full aspect-square bg-[#09090b] rounded-2xl border-2 border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center relative group">
            
            {/* The canvas */}
            <canvas
              id="gameCanvas"
              ref={canvasRef}
              width={480}
              height={480}
              className="w-full h-full object-contain image-render-pixel"
            />
            
            {/* 1. OVERLAY: START MENU */}
            {uiState === 'MENU' && (
              <div id="startMenu" className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-6 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-full animate-bounce">
                    <RotateCcw className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-6">
                    SLITHER ARCADE
                  </h2>

                  <button
                    onClick={handleStartGame}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold px-10 py-3.5 rounded-full tracking-wider transition-all duration-150 active:scale-95 text-sm uppercase shadow-[0_4px_24px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.45)]"
                  >
                    START GAME
                  </button>
                  <span className="mt-4 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                    Press any action to begin
                  </span>
                </motion.div>
              </div>
            )}

            {/* 2. OVERLAY: GAME PAUSED */}
            {uiState === 'PAUSED' && (
              <div id="paused_menu" className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-10 p-6 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center max-w-xs w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl"
                >
                  <div className="w-12 h-12 bg-zinc-800 border border-zinc-750 text-emerald-400 rounded-full flex items-center justify-center mb-3">
                    <Pause className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-wider font-mono">GAME PAUSED</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mb-5 uppercase">Press resume to play</p>

                  <div className="space-y-2 w-full">
                    <button
                      onClick={handlePauseToggle}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold tracking-wider text-xs rounded-xl transition-all font-mono"
                    >
                      RESUME GAME
                    </button>
                    <button
                      onClick={handleReturnToMenu}
                      className="w-full py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold tracking-wider text-xs rounded-xl transition-all border border-zinc-750/60 font-mono"
                    >
                      RETURN TO MENU
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* 3. OVERLAY: DEFEATED / GAMEOVER */}
            {uiState === 'GAMEOVER' && (
              <div id="gameOverMenu" className="absolute inset-0 bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center z-10 p-6 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="mb-4 bg-rose-500/15 border border-rose-550/40 text-rose-500 p-3.5 rounded-full">
                    <Skull className="w-8 h-8" />
                  </div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase text-white italic mb-6">
                    DEFEATED
                  </h2>

                  <div className="bg-zinc-950/85 border border-zinc-850 p-4 rounded-xl mb-6 w-52 text-left space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 uppercase">SCORE:</span>
                      <span className="text-zinc-200 font-bold">{uiScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 uppercase">HIGH:</span>
                      <span className="text-emerald-400 font-bold">{highScore}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleStartGame}
                    className="bg-white text-zinc-950 hover:bg-zinc-200 font-mono font-bold px-10 py-3.5 rounded-full tracking-wider transition-all duration-150 active:scale-95 text-xs uppercase"
                  >
                    RESTART GAME
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* ==========================================
          COSMETIC SKIN & CONTROLS DASHBOARD (BOTTOM)
          ========================================== */}
      <section id="cosmetic_skin_dashboard" className="w-full max-w-5xl mx-auto mt-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">Custom Skins & Tactile Controls</h3>
          </div>
          <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Live Customization</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* SKIN SELECTOR GROUP */}
          <div className="col-span-1 md:col-span-8 space-y-3">
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider border-l-2 border-emerald-500 pl-2">
              Select Your Serpent Skin Style:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { type: 'python', label: 'Emerald Python', desc: 'Classic gradient scaling pattern' },
                { type: 'neon', label: 'Neon Cyberwave', desc: 'High luminescence cyan & pink' },
                { type: 'monochrome', label: 'Retro Monochrome', desc: 'Sleek greyscale look' },
                { type: 'dragon', label: 'Crimson Dragon', desc: 'Scale-embossed magma glow' },
                { type: 'cyberpunk', label: 'Vibrant Cyberpunk', desc: 'Synthwave neon-purple stripe' },
                { type: 'royal', label: 'Royal Majestic', desc: 'Luxe gold-plated crown shimmer' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => { setSkinType(item.type as any); audioSynth.playTickClick(); }}
                  className={`p-3.5 rounded-xl font-mono text-left transition-all border outline-none duration-150 flex flex-col justify-between h-20 ${
                    skinType === item.type
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] bg-zinc-850'
                      : 'bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:border-zinc-700/60 hover:text-zinc-200'
                  }`}
                  title={`${item.label} skin style`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs uppercase tracking-tight">{item.label}</span>
                    
                    {/* Tiny visual skin color block previews */}
                    <div className="flex gap-0.5 ml-2">
                      {item.type === 'python' && (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                        </>
                      )}
                      {item.type === 'neon' && (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_cyan]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_4px_pink]" />
                        </>
                      )}
                      {item.type === 'monochrome' && (
                        <>
                          <div className="w-1.5 h-1.5 rounded bg-zinc-200" />
                          <div className="w-1.5 h-1.5 rounded bg-zinc-500" />
                        </>
                      )}
                      {item.type === 'dragon' && (
                        <>
                          <div className="w-1.5 h-1.5 rounded-sm bg-red-650 shadow-[0_0_4px_red]" />
                          <div className="w-1.5 h-1.5 rounded-sm bg-orange-600" />
                        </>
                      )}
                      {item.type === 'cyberpunk' && (
                        <>
                          <div className="w-1.5 h-1.5 rounded bg-cyan-500" />
                          <div className="w-1.5 h-1.5 rounded bg-purple-905" />
                        </>
                      )}
                      {item.type === 'royal' && (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-405 shadow-[0_0_4px_gold]" />
                          <div className="w-1.5 h-1.5 rounded bg-indigo-950" />
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-sans tracking-normal mt-1 leading-tight">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* D-PAD TACTILE INTERFACE GROUP UNDER SKIN BOXES */}
          <div className="col-span-1 md:col-span-4 flex flex-col items-center border-t md:border-t-0 md:border-l border-zinc-800/85 pt-5 md:pt-0 pl-0 md:pl-6 justify-center">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-3 block text-center">Tactile Arrow Keys</span>
            <div className="grid grid-cols-3 gap-2 w-full max-w-[150px] aspect-square relative z-10">
              <div></div>
              
              {/* UP BUTTON */}
              <button 
                onTouchStart={(e) => { e.preventDefault(); handleVirtualPress('UP'); }}
                onMouseDown={() => handleVirtualPress('UP')}
                className="w-11 h-11 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 active:bg-emerald-500 rounded-xl flex items-center justify-center text-zinc-400 active:text-black hover:text-emerald-400 transition-all outline-none cursor-pointer select-none shadow-sm active:scale-95 duration-75"
                title="Move Up"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <div></div>

              {/* LEFT BUTTON */}
              <button 
                onTouchStart={(e) => { e.preventDefault(); handleVirtualPress('LEFT'); }}
                onMouseDown={() => handleVirtualPress('LEFT')}
                className="w-11 h-11 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 active:bg-emerald-500 rounded-xl flex items-center justify-center text-zinc-400 active:text-black hover:text-emerald-400 transition-all outline-none cursor-pointer select-none shadow-sm active:scale-95 duration-75"
                title="Move Left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* DOWN BUTTON */}
              <button 
                onTouchStart={(e) => { e.preventDefault(); handleVirtualPress('DOWN'); }}
                onMouseDown={() => handleVirtualPress('DOWN')}
                className="w-11 h-11 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 active:bg-emerald-500 rounded-xl flex items-center justify-center text-zinc-400 active:text-black hover:text-emerald-400 transition-all outline-none cursor-pointer select-none shadow-sm active:scale-95 duration-75"
                title="Move Down"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              {/* RIGHT BUTTON */}
              <button 
                onTouchStart={(e) => { e.preventDefault(); handleVirtualPress('RIGHT'); }}
                onMouseDown={() => handleVirtualPress('RIGHT')}
                className="w-11 h-11 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 active:bg-emerald-500 rounded-xl flex items-center justify-center text-zinc-400 active:text-black hover:text-emerald-400 transition-all outline-none cursor-pointer select-none shadow-sm active:scale-95 duration-75"
                title="Move Right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[9px] text-zinc-500 mt-3 italic font-mono text-center">
              * Perfect mobile touch responses.
            </p>
          </div>

        </div>
      </section>

      {/* ==========================================
          4. FOOTER & MOBILE CONTROLS SECTION
          ========================================== */}
      <footer className="w-full max-w-5xl mx-auto mt-5 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 border-t border-zinc-800 pt-5 flex-shrink-0">
        
        {/* Status indicator bento list with pause controls */}
        <div className="flex gap-2 w-full sm:w-auto">
          
          {/* Inline Pause controls */}
          <button 
            id="pauseBtn"
            onClick={handlePauseToggle}
            disabled={uiState === 'MENU' || uiState === 'GAMEOVER'}
            className="px-5 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-30 disabled:hover:border-zinc-850 text-zinc-300 rounded-xl text-xs uppercase font-semibold font-mono tracking-wider transition-all flex items-center justify-center space-x-2"
          >
            <Pause className="w-3 h-3 text-[#10b981]" />
            <span>PAUSE [P]</span>
          </button>
        </div>

      </footer>

      {/* Decorative credit label */}
      <div className="w-full max-w-5xl mx-auto mt-6 text-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest flex items-center justify-center space-x-2">
        <Activity className="w-3.5 h-3.5 text-zinc-700" />
        <span>PREMIUM RETRO ARCADE SIMULATOR v2.26.0 • ACCENTS VIA SINE SYNTHESIS</span>
      </div>

    </div>
  );
}
