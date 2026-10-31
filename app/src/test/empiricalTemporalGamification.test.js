import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStudyTimerStore, MODOS_ESTUDO } from '../store/useStudyTimerStore';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useDBStore } from '../store/useDBStore';

describe('Empirical Challenge: Temporal Monotonicity & Gamification Resilience', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await useDBStore.getState().init();

    // Reset Study Timer Store
    useStudyTimerStore.setState({
      timer: 25 * 60,
      totalSeconds: 25 * 60,
      rodando: false,
      modo: 'pomodoro',
      materiaAtiva: null,
      sessaoId: null,
      targetEndTime: null,
      completed: false,
      isMiniaturized: false
    });

    // Reset Tamagotchi Store
    useTamagotchiStore.setState({
      player: {
        xp: 100,
        hp: 60,
        hp_max: 60,
        level: 3,
        streak: 5,
        streak_max: 5,
        streak_freezes: 1,
        streak_freeze_used_today: false,
        last_study_date: null,
        total_study_days: 5,
        total_sessions: 5,
        hibernations: 0,
        hibernating: false,
        pet_name: 'Tester',
        created_at: new Date('2026-10-01T00:00:00Z').toISOString()
      },
      animationsQueue: []
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Adversarial Challenge 1: System Clock Manipulation during Active Study Timer', () => {
    it('CHALLENGE 1.1: Detects sleep / large deltaMs (+50 min) and immediately pauses instead of completing', () => {
      const timerStore = useStudyTimerStore.getState();
      timerStore.trocarModo('pomodoro');
      timerStore.iniciar();

      expect(useStudyTimerStore.getState().rodando).toBe(true);
      expect(useStudyTimerStore.getState().timer).toBe(25 * 60);

      // Normal tick: advances 1 second
      actTimeAdvance(1000);
      expect(useStudyTimerStore.getState().timer).toBe(25 * 60 - 1);

      // Simulate OS sleep or clock forward jump of 50 minutes: performance.now jumps 50 minutes
      const realPerfNow = performance.now.bind(performance);
      let simulatedPerfOffset = 50 * 60 * 1000; // +50 minutes (3,000,000 ms)
      vi.spyOn(performance, 'now').mockImplementation(() => realPerfNow() + simulatedPerfOffset);

      // Advance timer interval trigger
      vi.advanceTimersByTime(1000);

      const stateAfterJump = useStudyTimerStore.getState();

      // EMPIRICAL VERIFICATION:
      // The timer MUST have paused!
      expect(stateAfterJump.rodando).toBe(false);
      // It must NOT have marked completed
      expect(stateAfterJump.completed).toBe(false);
      // It must NOT have granted fraudulent completion / 0 seconds
      expect(stateAfterJump.timer).toBe(25 * 60 - 1);
    });

    it('CHALLENGE 1.2: Prevents instant completion when Date.now jumps +50m but performance.now is monotonic', () => {
      const timerStore = useStudyTimerStore.getState();
      timerStore.trocarModo('foco'); // 50 minutes
      timerStore.iniciar();

      expect(useStudyTimerStore.getState().rodando).toBe(true);
      expect(useStudyTimerStore.getState().timer).toBe(50 * 60);

      // In browser/OS, changing the system clock jumps Date.now() but does NOT jump performance.now()
      const originalDateNow = Date.now;
      const jumpTime = 50 * 60 * 1000; // +50 min forward
      Date.now = () => originalDateNow() + jumpTime;

      try {
        // Run tick with normal 1s interval
        vi.advanceTimersByTime(1000);

        const state = useStudyTimerStore.getState();

        // EMPIRICAL VERIFICATION:
        // Even though Date.now() advanced past initial targetEndTime,
        // the timer MUST NOT complete instantly!
        expect(state.completed).toBe(false);
        expect(state.rodando).toBe(true);
        // It must have decremented by at most 1-3 seconds, not to 0!
        expect(state.timer).toBeGreaterThanOrEqual(50 * 60 - 3);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('CHALLENGE 1.3: Handles backward clock jump without inflating timer or crashing', () => {
      const timerStore = useStudyTimerStore.getState();
      timerStore.trocarModo('pomodoro');
      timerStore.iniciar();

      // Normal tick
      vi.advanceTimersByTime(1000);
      expect(useStudyTimerStore.getState().timer).toBe(1500 - 1);

      // Backward clock jump: Date.now jumps backward 1 hour
      const originalDateNow = Date.now;
      Date.now = () => originalDateNow() - 60 * 60 * 1000;

      try {
        vi.advanceTimersByTime(1000);

        const state = useStudyTimerStore.getState();
        expect(state.completed).toBe(false);
        expect(state.rodando).toBe(true);
        // Timer should decrement steadily, not explode to 3600+ seconds
        expect(state.timer).toBe(1500 - 2);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('CHALLENGE 1.4: Legitimately completed timer completes after full elapsed duration', () => {
      const timerStore = useStudyTimerStore.getState();
      timerStore.trocarModo('descanso'); // 5 minutes = 300 seconds
      timerStore.iniciar();

      const initialXp = useTamagotchiStore.getState().player.xp;

      // Advance full 300 seconds tick by tick
      for (let i = 0; i < 300; i++) {
        vi.advanceTimersByTime(1000);
      }

      const state = useStudyTimerStore.getState();
      expect(state.timer).toBe(0);
      expect(state.completed).toBe(true);
      expect(state.rodando).toBe(false);

      // Verified XP incremented
      const finalXp = useTamagotchiStore.getState().player.xp;
      expect(finalXp).toBeGreaterThan(initialXp);
    });

    it('CHALLENGE 1.5: Resuming after a long pause does not falsely trigger suspension guard', () => {
      const timerStore = useStudyTimerStore.getState();
      timerStore.trocarModo('pomodoro');
      timerStore.iniciar();

      vi.advanceTimersByTime(2000);
      expect(useStudyTimerStore.getState().timer).toBe(1500 - 2);

      // User pauses
      timerStore.pausar();
      expect(useStudyTimerStore.getState().rodando).toBe(false);

      // 50 minutes elapse in real world while paused
      vi.advanceTimersByTime(50 * 60 * 1000);

      // User resumes
      timerStore.iniciar();
      expect(useStudyTimerStore.getState().rodando).toBe(true);

      // First tick after resume should run normally and NOT pause!
      vi.advanceTimersByTime(1000);
      expect(useStudyTimerStore.getState().rodando).toBe(true);
      expect(useStudyTimerStore.getState().timer).toBe(1500 - 3);
    });
  });

  describe('Adversarial Challenge 2: Streak Freeze & Absence Desync', () => {
    it('CHALLENGE 2.1: User has 1 freeze, misses 1 day (diff = 2), freezes consumed, studies same day -> streak increments to streak + 1', () => {
      const tamagotchiStore = useTamagotchiStore.getState();

      // Setup state:
      // Last study date was 2 days ago (e.g. 2026-10-28)
      // Today is 2026-10-30
      // Current streak: 5
      // Streak freezes available: 1
      const now = new Date('2026-10-30T14:00:00.000Z');
      vi.setSystemTime(now);

      const twoDaysAgo = new Date('2026-10-28T14:00:00.000Z').toISOString();

      useTamagotchiStore.setState({
        player: {
          ...tamagotchiStore.player,
          streak: 5,
          streak_max: 5,
          streak_freezes: 1,
          streak_freeze_used_today: false,
          last_study_date: twoDaysAgo,
          hp: 60
        }
      });

      // Step 1: checkDailyStatus() runs when app opens
      useTamagotchiStore.getState().checkDailyStatus();

      const afterCheck = useTamagotchiStore.getState().player;
      // Freeze consumed: 1 -> 0
      expect(afterCheck.streak_freezes).toBe(0);
      // Streak preserved: 5 (NOT 0!)
      expect(afterCheck.streak).toBe(5);
      // Shield flag activated
      expect(afterCheck.streak_freeze_used_today).toBe(true);
      // HP damage cushioned (half damage = -5 HP instead of -10 HP)
      expect(afterCheck.hp).toBe(55);

      // Step 2: Later the same day, user completes a study session
      vi.setSystemTime(new Date('2026-10-30T18:30:00.000Z'));
      useTamagotchiStore.getState().registerStudySession(25);

      const afterStudy = useTamagotchiStore.getState().player;

      // EMPIRICAL VERIFICATION:
      // Streak must increment to streak + 1 = 6, NOT reset to 1!
      expect(afterStudy.streak).toBe(6);
      expect(afterStudy.streak_max).toBe(6);
      // Flag consumed and reset to false
      expect(afterStudy.streak_freeze_used_today).toBe(false);
      // Study days incremented
      expect(afterStudy.total_study_days).toBe(6);
    });

    it('CHALLENGE 2.2: Studying a second time on the same day after freeze consumption does not increment streak twice', () => {
      const now = new Date('2026-10-30T14:00:00.000Z');
      vi.setSystemTime(now);
      const twoDaysAgo = new Date('2026-10-28T14:00:00.000Z').toISOString();

      useTamagotchiStore.setState({
        player: {
          ...useTamagotchiStore.getState().player,
          streak: 5,
          streak_freezes: 1,
          streak_freeze_used_today: false,
          last_study_date: twoDaysAgo
        }
      });

      // 1. checkDailyStatus
      useTamagotchiStore.getState().checkDailyStatus();
      // 2. First study session -> streak becomes 6
      useTamagotchiStore.getState().registerStudySession(25);
      expect(useTamagotchiStore.getState().player.streak).toBe(6);

      // 3. Second study session 2 hours later on same day
      vi.setSystemTime(new Date('2026-10-30T16:00:00.000Z'));
      useTamagotchiStore.getState().registerStudySession(25);

      // Streak must remain 6 (only increments once per day)
      expect(useTamagotchiStore.getState().player.streak).toBe(6);
      expect(useTamagotchiStore.getState().player.total_study_days).toBe(6);
      // Total sessions increments
      expect(useTamagotchiStore.getState().player.total_sessions).toBe(7);
    });

    it('CHALLENGE 2.3: Zero freezes with diff = 2 resets streak to 0 in checkDailyStatus and 1 after study', () => {
      const now = new Date('2026-10-30T14:00:00.000Z');
      vi.setSystemTime(now);
      const twoDaysAgo = new Date('2026-10-28T14:00:00.000Z').toISOString();

      useTamagotchiStore.setState({
        player: {
          ...useTamagotchiStore.getState().player,
          streak: 8,
          streak_freezes: 0, // No freeze!
          streak_freeze_used_today: false,
          last_study_date: twoDaysAgo
        }
      });

      useTamagotchiStore.getState().checkDailyStatus();
      expect(useTamagotchiStore.getState().player.streak).toBe(0);
      expect(useTamagotchiStore.getState().player.streak_freezes).toBe(0);
      expect(useTamagotchiStore.getState().player.streak_freeze_used_today).toBe(false);

      // Study session restarts streak at 1
      useTamagotchiStore.getState().registerStudySession(25);
      expect(useTamagotchiStore.getState().player.streak).toBe(1);
    });

    it('CHALLENGE 2.4 (VULNERABILITY PROBE): What happens if registerStudySession is called directly without checkDailyStatus?', () => {
      // Scenario: App opens directly to study session or TamagotchiWidget is unmounted.
      // User has 1 freeze, last studied 2 days ago (diff = 2).
      const now = new Date('2026-10-30T14:00:00.000Z');
      vi.setSystemTime(now);
      const twoDaysAgo = new Date('2026-10-28T14:00:00.000Z').toISOString();

      useTamagotchiStore.setState({
        player: {
          ...useTamagotchiStore.getState().player,
          streak: 12,
          streak_freezes: 1,
          streak_freeze_used_today: false,
          last_study_date: twoDaysAgo
        }
      });

      // NOTE: checkDailyStatus() is NOT called!
      // User directly finishes a study session:
      useTamagotchiStore.getState().registerStudySession(25);

      const result = useTamagotchiStore.getState().player;

      // Let us empirically observe what happens:
      // Does registerStudySession protect the streak if checkDailyStatus was never called?
      console.log('UNCHECKED STUDY SESSION RESULT:', {
        streak: result.streak,
        streak_freezes: result.streak_freezes,
        streak_freeze_used_today: result.streak_freeze_used_today
      });

      // Because diff === 2 and streak_freeze_used_today was false,
      // registerStudySession line 209 (diff === 1 || !last_study_date || freezeProtected) evaluates to FALSE!
      // Therefore, streak drops to 1, completely bypassing the freeze shield!
      expect(result.streak).toBe(1);
      // And the freeze was never consumed (streak_freezes remains 1)!
      expect(result.streak_freezes).toBe(1);
    });
  });
});

function actTimeAdvance(ms) {
  vi.advanceTimersByTime(ms);
}
