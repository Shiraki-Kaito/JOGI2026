export const COURSE = Object.freeze({
  id: 'cloud-ridge-1500',
  length: 1500,
  halfWidth: 22,
  playerHalfWidth: 6, // 傾き・ジャンプ中の実測半幅約5.5mを切り上げ、腕とスキーを収める
  edgeMargin: 1,
  slope: .78,
  cruiseSpeed: 25.5,
  tuckSpeed: 46.5,
  jumpVelocity: 13.5,
  objectSpacing: 24,
  objectCount: 32,
});

/** コース中心線の横方向オフセット（m）。ゴール後は同じ中心線。 */
export const curve=d=>{d=Math.min(d,COURSE.length);return Math.sin(d*.007)*9+Math.sin(d*.017)*2.5;};
