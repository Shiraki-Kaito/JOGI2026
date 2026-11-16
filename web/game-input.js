const LOBBY_INPUT_DELAY_MS = 350;
const ACTIVATION_KEYS = ['Space', 'Enter'];
const BROWSER_SHORTCUT_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'Escape'];

/** 押下中のキーを更新し、画面に応じて単発の操作をゲームへ渡す。 */
export function bindGameInput({ keys, getState, getMode, activeOverlay, openLobby, jump, pause }) {
  const element = (id) => document.getElementById(id);
  let titleKey = null;
  let lobbyUnlockAt = 0;

  function delayLobbyInput() {
    lobbyUnlockAt = performance.now() + LOBBY_INPUT_DELAY_MS;
  }

  function lobbyInputLocked() {
    return titleKey !== null || performance.now() < lobbyUnlockAt;
  }

  function enterLobby(event) {
    if (getState() !== 'title' || element('title-start').disabled) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    delayLobbyInput();
    openLobby();
  }

  function releaseTitleKey() {
    titleKey = null;
    delayLobbyInput();
  }

  function onKeyDown(event) {
    const { code, repeat, target } = event;
    const state = getState();
    const overlay = activeOverlay();
    const resumeShortcut = code === 'Escape' && state === 'paused' && overlay?.id === 'paused';
    if (overlay && !resumeShortcut) return;

    const activationKey = ACTIVATION_KEYS.includes(code);
    if (state === 'title' && activationKey) {
      event.preventDefault();
      if (!repeat) {
        titleKey = code;
        enterLobby();
      }
      return;
    }
    if (code === titleKey) {
      event.preventDefault();
      return;
    }
    if (target?.closest?.('input,textarea,select')) return;
    if (activationKey && target?.closest?.('button,a')) return;
    if (!['playing', 'paused', 'countdown'].includes(state)) return;

    if (BROWSER_SHORTCUT_KEYS.includes(code)) event.preventDefault();
    keys.add(code);
    if ((code === 'Space' || code === 'ArrowUp') && !repeat && getMode() === 'keyboard') jump();
    if (code === 'Escape' && state === 'playing') pause();
    if (code === 'Escape' && state === 'paused') element('resume').click();
  }

  element('title-start').onclick = enterLobby;
  // タイトルを開いた入力がロビーのボタンも押すのを防ぐ。
  document.addEventListener('click', (event) => {
    if (getState() === 'lobby' && lobbyInputLocked()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', (event) => {
    if (event.code === titleKey) {
      event.preventDefault();
      releaseTitleKey();
    }
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    if (titleKey) releaseTitleKey();
    keys.clear();
    pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });

  const touchControls = [
    ['touch-left', 'ArrowLeft'],
    ['touch-right', 'ArrowRight'],
    ['touch-tuck', 'ArrowDown'],
  ];
  for (const [id, key] of touchControls) {
    const button = element(id);
    button.onpointerdown = (event) => {
      if (!['playing', 'countdown'].includes(getState()) || activeOverlay()) return;
      button.setPointerCapture(event.pointerId);
      keys.add(key);
    };
    const release = () => keys.delete(key);
    button.onpointerup = release;
    button.onpointercancel = release;
  }
  element('touch-jump').onpointerdown = () => {
    if (getState() === 'playing' && !activeOverlay()) jump();
  };
  return { lobbyInputLocked };
}
