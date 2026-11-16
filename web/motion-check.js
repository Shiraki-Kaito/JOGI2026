import { $, show } from './game-ui.js';
import { compareRecording, summarizeExperiment, validateRecording } from './pose-recording.js';

const DIAGNOSTICS_INTERVAL_MS = 250;
const MAX_RECORDING_FILE_BYTES = 1_500_000;
const DOWNLOAD_URL_LIFETIME_MS = 1000;

function formatTimings(timing, previous) {
  if (!timing) return 'カメラを接続すると処理時間を確認できます。';
  const ms = (value) => Number.isFinite(value) ? `${Math.round(value)}ms` : '—';
  const fps = (value) => value > 0 ? `${value.toFixed(1)}fps` : '—';
  const lines = [
    timing.recovering ? '認識を復旧中…' : `認識：${timing.delegate ?? '準備中'}`,
    `カメラ：${fps(timing.cameraFps)} / 骨格：${fps(timing.poseFps)}`,
    `画像準備：${ms(timing.captureMs)} / 認識処理：${ms(timing.inferenceMs)}`,
  ];
  if (timing.inferenceMedianMs != null) {
    lines.push(`認識処理の中央値：${ms(timing.inferenceMedianMs)}（直近${timing.inferenceSamples}回）`);
  }
  lines.push(`取得開始→描画完了：${ms(timing.visibleAgeMs)} / 描画処理：${ms(timing.renderMs)}`);
  if (previous) {
    lines.push(`切替前の${previous.delegate}：${ms(previous.inferenceMs)} / ${fps(previous.poseFps)}`);
  }
  lines.push('※カメラ内部・モニター表示の遅延は含みません。');
  return lines.join('\n');
}

function formatReplay(report, experiment) {
  const lines = [
    `${report.frames}フレーム`,
    report.poseFps ? `認識更新：約${report.poseFps.toFixed(1)}fps（${Math.round(report.intervalMs)}ms間隔）` : '更新間隔：計測なし',
    report.timings.inferenceMs !== null
      ? `推論：${Math.round(report.timings.inferenceMs)}ms / 結果の古さ：${Math.round(report.timings.resultAgeMs ?? 0)}ms`
      : '推論時間：未記録',
  ];
  for (const { filter, count, events } of report.runs) {
    const totalMs = events.reduce((total, event) => total + event.observedLiftToDetectionMs, 0);
    const mean = events.length ? `${Math.round(totalMs / events.length)}ms` : '—';
    lines.push(`${filter === 'none' ? '標準' : '1€ Filter'}：${count}回検出 / ${mean}（上昇観測→判定）`);
  }
  lines.push(report.label === 'jump' ? '実際に跳んだ回数と比較してください。' : 'ジャンプ以外の記録では、0回が目標です。');
  if (experiment.frames) {
    const lead = experiment.meanLeadMs == null ? '—' : `${Math.round(experiment.meanLeadMs)}ms`;
    lines.push(
      `画像追跡：${experiment.candidates}候補 / 骨格：${experiment.poseCandidates}候補`,
      `追跡処理：${Math.round(experiment.medianMs ?? 0)}ms / 先行して近接した候補：${experiment.matched}回（平均${lead}先）`,
      `対応未確認：${experiment.unmatched}候補`,
      '※近接時刻による仮対応です。正解率・実際のジャンプ遅延ではありません。',
    );
  }
  return lines.join('\n');
}

/** 「動きの確認」の表示と操作を接続する。記録の進行時刻はゲームループから受け取る。 */
export function mountMotionCheck({ recording, experiment, camera, pause, isPaused, isCameraMode, setLowLatency }) {
  let open = false;
  let reported = false;
  let lastDisplayAt = -Infinity;
  let lowLatency = false;
  let previousEngine = null;

  function reportRecording() {
    const report = compareRecording(recording.data);
    window.bearSkiLastReplay = () => structuredClone(report);
    $('recording-summary').textContent = formatReplay(report, summarizeExperiment(recording.data.experiment));
    $('recording-download').disabled = false;
    reported = true;
  }

  function displayDiagnostics() {
    const timing = camera.device.diagnostics?.();
    $('live-timings').textContent = formatTimings(timing, previousEngine);
    $('inference-switch').disabled = !isCameraMode() || !camera.ready;
    $('inference-switch').textContent = timing?.delegate === 'CPU' ? 'GPUで試す' : 'CPUで試す';

    const tracking = experiment.worker
      ? ` / ${Math.round(experiment.stats.processingMs ?? 0)}ms / 追跡点${experiment.stats.tracked ?? 0}/6`
      : '';
    $('flow-status').textContent = `画像追跡：${experiment.status}${tracking}`;
    $('flow-toggle').textContent = experiment.worker ? '画像追跡の実験を止める' : '画像追跡を比較する（実験）';
    $('flow-toggle').disabled = !camera.ready || !$('video').requestVideoFrameCallback;
  }

  function update(now) {
    if (!open) return;
    const phase = recording.tick(now);
    if (now - lastDisplayAt > DIAGNOSTICS_INTERVAL_MS) {
      lastDisplayAt = now;
      displayDiagnostics();
    }
    $('recording-start').disabled = ['waiting', 'recording'].includes(phase) || !camera.baseline || !camera.ready;
    const status = $('recording-status');
    if (phase === 'waiting') {
      const seconds = Math.ceil((recording.startAt - now) / 1000);
      status.textContent = `あと${seconds}秒で記録開始。カメラから離れてください。`;
    } else if (phase === 'recording') {
      const seconds = Math.ceil((recording.endAt - now) / 1000);
      status.textContent = `記録中：残り${seconds}秒`;
    } else if (phase === 'done' && !reported) {
      status.textContent = '記録完了';
      reportRecording();
    } else if (phase === 'cancelled') {
      status.textContent = '記録を中止しました。';
    }
  }

  function closePanel() {
    recording.cancel();
    open = false;
    show('motion-check', false);
  }

  $('recording-open').onclick = () => {
    pause();
    show('paused', false);
    open = true;
    lastDisplayAt = -Infinity;
    show('motion-check', true);
    $('recording-status').textContent = camera.baseline && camera.ready
      ? '記録する動きを選んでください。' : 'からだで遊び、姿勢合わせ後に一時停止して開いてください。';
    update(performance.now());
  };
  $('recording-close').onclick = () => {
    closePanel();
    if (isPaused()) show('paused', true);
  };
  $('recording-start').onclick = () => {
    if (!camera.baseline || !camera.ready) return;
    experiment.resetComparison();
    recording.start(performance.now(), camera.baseline, $('recording-label').value);
    reported = false;
    $('recording-summary').textContent = '';
    $('recording-download').disabled = true;
    update(performance.now());
  };
  $('recording-download').onclick = () => {
    if (!recording.data || !reported) return;
    const blob = new Blob([JSON.stringify(recording.data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bear-ski-motion.json';
    try {
      link.click();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
    }
  };
  $('recording-import').onchange = async ({ target }) => {
    try {
      const file = target.files?.[0];
      if (!file) return;
      if (file.size > MAX_RECORDING_FILE_BYTES) throw new Error('記録ファイルが大きすぎます。');
      recording.cancel();
      recording.data = validateRecording(JSON.parse(await file.text()));
      recording.phase = 'done';
      reportRecording();
      $('recording-status').textContent = '端末内で再生・比較しました。';
    } catch (error) {
      $('recording-status').textContent = error.message;
    } finally {
      target.value = '';
    }
  };

  $('jump-filter').onchange = () => camera.setJumpFilter($('jump-filter').value);
  $('flow-toggle').onclick = () => {
    if (experiment.worker) experiment.stop();
    else if (camera.ready) experiment.start();
    update(performance.now());
  };
  $('render-quality').onclick = () => {
    lowLatency = !lowLatency;
    setLowLatency(lowLatency);
    $('render-quality').textContent = lowLatency ? '通常の描画に戻す' : '描画を軽くする';
  };
  $('inference-switch').onclick = async () => {
    if (!isCameraMode() || !camera.ready) return;
    const timing = camera.device.diagnostics?.();
    previousEngine = timing ? {
      delegate: timing.delegate,
      inferenceMs: timing.inferenceMedianMs ?? timing.inferenceMs,
      poseFps: timing.poseFps,
    } : null;
    camera.device.preferredDelegate = timing?.delegate === 'CPU' ? 'GPU' : 'CPU';
    closePanel();
    await camera.open(true);
  };

  return { update };
}
