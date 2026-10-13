/** Pure angle math for the two-stage wheel: immediate free spin, server-selected landing. */
export function alignedVisibleAngle(previousAngle:number, visibleDegrees:number):number {
  const normalized=((visibleDegrees%360)+360)%360;
  return Math.floor(previousAngle/360)*360+normalized;
}

export function targetAngle(startAngle:number,gameIndex:number):number {
  if(!Number.isInteger(gameIndex)||gameIndex<0||gameIndex>5)throw new Error('Unknown wheel segment.');
  const target=(((-gameIndex*60)%360)+360)%360;
  const current=((startAngle%360)+360)%360;
  const forward=(target-current+360)%360;
  // Two complete turns plus a landing adjustment, always clockwise.
  return startAngle+720+forward;
}
