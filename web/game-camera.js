import { PoseCamera } from './pose-camera.js';
import { AutoCalibration, calibrationHint } from './auto-calibration.js';
import { JumpDetector } from './body-control.js';
import { poseMeasures, fullBody, upperBody, poseControls } from './pose-input.js';
import { drawSkeleton } from './pose-overlay.js';
import { $, show } from './game-ui.js';

const INPUT_MAX_AGE_MS = 350;
const RESUME_MAX_AGE_MS = 800;
const TRACKING_LOST_MS = 1500;
const SCAN_INTERRUPTED_MS = 750;
const VISIBLE_JUMP_HEIGHT = 0.05;
const FULL_BODY_HINT = '全身を映してください';
const HOLD_STILL_HINT = '少し静止してください';

/** ゲームのカメラ操作セッション。映像と推論ワーカーの寿命は PoseCamera が管理する。 */
export class GameCamera {
  constructor({ getScreen, onSetup, onReady, onCalibrated, onJump, recording, experiment }) {
    this.getScreen = getScreen;
    this.onSetup = onSetup;
    this.onReady = onReady;
    this.onCalibrated = onCalibrated;
    this.onJump = onJump;
    this.recording = recording;
    this.experiment = experiment;
    this.device = new PoseCamera({
      video: $('video'),
      onResult: (result, now) => this.handlePose(result, now),
      onError: (error) => this.handleError(error),
      onPhase: (phase) => this.handlePhase(phase),
    });
    this.device.onVideoFrame = (video, time) => experiment.frame(video, time);
    this.calibration = new AutoCalibration();
    this.jumpDetector = new JumpDetector();
    this.generation = 0;
    this.ready = false;
    this.resumeAfterCalibration = false;
    this.scanPhase = '';
    this.scanStartedAt = 0;
    this.lastScanResultAt = -Infinity;
    this.scanReport = null;
    this.baseline = null;
    this.lastPoseAt = 0;
    this.jumpTiming = null;
    this.pendingJumpRender = false;
    this.clearInput();
  }

  clearInput() {
    this.valid = false;
    this.steer = 0;
    this.tuck = 0;
  }

  setScanPhase(phase) {
    if (phase === this.scanPhase) return;
    this.scanPhase = phase;
    $('setup').setAttribute('data-scan-phase', phase);
    $('cancel-camera').hidden = phase !== 'error';
  }

  cancelMeasurements() {
    this.experiment.stop();
    this.recording.cancel();
    this.pendingJumpRender = false;
  }

  resetTracking() {
    this.baseline = null;
    this.calibration.reset();
    this.jumpDetector.reset();
    this.clearInput();
  }

  enterCalibration(resume = false) {
    this.lastScanResultAt = -Infinity;
    this.setScanPhase(this.ready ? 'missing' : 'preparing');
    this.cancelMeasurements();
    this.onSetup();
    this.scanStartedAt = performance.now();
    this.scanReport = null;
    this.resumeAfterCalibration = resume;
    this.resetTracking();
    show('retry-camera', false);
    $('camera-slot').append($('camera-frame'));
    show('camera-frame', true);
    show('guide', true);
    $('camera-status').textContent = FULL_BODY_HINT;
  }

  async open(resume = this.resumeAfterCalibration) {
    this.enterCalibration(resume);
    this.ready = false;
    this.setScanPhase('preparing');
    const generation = ++this.generation;
    $('camera-status').textContent = 'カメラと姿勢認識を準備しています…';
    try {
      const started = await this.device.start();
      // 起動待ちの間にロビー復帰や再試行が起きたら、古い結果で画面を戻さない。
      if (!started || generation !== this.generation) return;
      this.ready = true;
      this.onReady();
      this.setScanPhase('missing');
      this.scanStartedAt = performance.now();
      $('camera-status').textContent = FULL_BODY_HINT;
    } catch (error) {
      if (generation === this.generation) this.handleError(error);
    }
  }

  stop() {
    this.cancelMeasurements();
    this.generation += 1;
    this.device.stop();
    this.ready = false;
    this.lastPoseAt = 0;
    this.resetTracking();
    drawSkeleton($('skeleton'), null, false);
  }

  shouldResumeRun() {
    return this.resumeAfterCalibration || ['playing', 'countdown', 'paused'].includes(this.getScreen());
  }

  handlePhase(phase) {
    if (phase === 'recovering') {
      this.enterCalibration(this.shouldResumeRun());
      this.setScanPhase('preparing');
      $('camera-status').textContent = '姿勢認識を復旧中…';
    } else if (phase === 'camera' || phase === 'model') {
      this.setScanPhase('preparing');
      $('camera-status').textContent = phase === 'camera' ? 'カメラを起動中…' : '姿勢認識モデルを準備中…';
    }
  }

  handleError(error) {
    this.ready = false;
    this.enterCalibration(this.shouldResumeRun());
    this.setScanPhase('error');
    show('retry-camera', true);
    let message = error.message || 'カメラを再接続してください。';
    if (error.name === 'NotAllowedError') message = 'カメラが許可されていません。ブラウザーの設定で許可して再接続してください。';
    if (error.name === 'NotFoundError') message = 'カメラが見つかりません。接続を確認してください。';
    $('camera-status').textContent = message;
  }

  handlePose(result, now) {
    if (!this.ready) return;
    const screen = this.getScreen();
    const scanning = screen === 'setup';
    if (scanning) this.lastScanResultAt = now;
    this.experiment.pose(result, now);
    this.device.markApplied?.(performance.now());
    const points = result.landmarks[0];
    const worldPoints = result.worldLandmarks[0];
    const full = fullBody(points, screen === 'playing');
    drawSkeleton($('skeleton'), scanning ? null : points, full, $('video'));

    const usable = scanning ? full : upperBody(points);
    const measures = usable ? poseMeasures(points, worldPoints) : null;
    this.recording.add(now, measures, this.device.diagnostics?.());
    if (!usable) {
      this.clearInput();
      this.jumpDetector.update(now, null, this.baseline);
      $('tracking').textContent = FULL_BODY_HINT;
      if (scanning) {
        this.setScanPhase('missing');
        this.calibration.update(now, null, false);
        $('camera-status').textContent = FULL_BODY_HINT;
      }
      return;
    }

    this.lastPoseAt = now;
    $('tracking').textContent = full ? '全身を認識中' : '上半身を認識中';
    if (scanning) {
      this.collectCalibration(now, measures, calibrationHint(points, worldPoints));
    } else if (this.baseline && screen === 'playing') {
      this.applyControls(now, measures);
    }
  }

  updateScanHint(hint, stability = 1) {
    $('camera-status').textContent = hint === HOLD_STILL_HINT && stability >= 1 ? 'スキャン中' : hint;
  }

  collectCalibration(now, measures, hint) {
    this.setScanPhase('collecting');
    const sample = this.calibration.update(now, measures, hint === HOLD_STILL_HINT);
    this.updateScanHint(hint, sample.stability);
    if (!sample.ready) return;

    this.setScanPhase('ready');
    this.scanReport = {
      collectionMs: performance.now() - this.scanStartedAt,
      samples: sample.samples,
      stability: sample.stability,
    };
    this.baseline = sample.baseline;
    this.calibration.reset();
    this.jumpDetector.reset();
    $('mini-slot').append($('camera-frame'));
    show('guide', false);
    this.onCalibrated(this.resumeAfterCalibration);
    this.resumeAfterCalibration = false;
  }

  setJumpFilter(filter) {
    this.jumpDetector.filter = filter === 'one-euro' ? 'one-euro' : 'none';
    this.jumpDetector.reset();
    this.pendingJumpRender = false;
  }

  applyControls(now, measures) {
    this.experiment.observe(now, measures, this.baseline);
    const controls = poseControls(measures, this.baseline);
    this.steer = controls.steer;
    this.tuck = controls.tuck;
    this.valid = true;
    if (!this.jumpDetector.update(now, measures, this.baseline)) return;
    const detectedAt = performance.now();
    const accepted = this.onJump();
    this.jumpTiming = { sampleAt: now, detectedAt, resultAgeMs: detectedAt - now, accepted, detectedToRenderMs: null };
    this.pendingJumpRender = accepted;
  }

  sample(now) {
    if (this.ready && !document.hidden && ['setup', 'countdown', 'playing', 'paused'].includes(this.getScreen())) {
      this.device.sample(now);
    }
  }

  expireInput(now) {
    if (now - this.lastPoseAt > INPUT_MAX_AGE_MS) this.clearInput();
  }

  needsResumeScan(now) {
    return now - this.lastPoseAt > RESUME_MAX_AGE_MS;
  }

  trackingLost(now) {
    return now - this.lastPoseAt > TRACKING_LOST_MS;
  }

  beginPlaying(now) {
    this.lastPoseAt = now;
    this.jumpDetector.reset();
    this.clearInput();
  }

  checkScanInterruption(now) {
    if (!this.ready || ['preparing', 'error'].includes(this.scanPhase)) return;
    if (now - this.lastScanResultAt <= SCAN_INTERRUPTED_MS) return;
    this.setScanPhase('interrupted');
    $('camera-status').textContent = '認識結果を待っています…';
    drawSkeleton($('skeleton'), null, false, $('video'));
    this.calibration.pause(now);
  }

  markRendered(startedAt, airborneHeight) {
    this.device.markRendered?.(performance.now(), performance.now() - startedAt);
    if (this.pendingJumpRender && airborneHeight > VISIBLE_JUMP_HEIGHT) {
      this.jumpTiming.detectedToRenderMs = performance.now() - this.jumpTiming.detectedAt;
      this.pendingJumpRender = false;
    }
  }

  diagnostics() {
    return {
      ...this.device.diagnostics(),
      jumpDetection: this.jumpDetector.diagnostics(),
      jump: this.jumpTiming ? { ...this.jumpTiming } : null,
      scan: this.scanReport ? { ...this.scanReport } : null,
    };
  }
}
