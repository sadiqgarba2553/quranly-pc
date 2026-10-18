const {test}=require('node:test');
const assert=require('node:assert/strict');
test('local dates and streaks respect the user day across UTC midnight',async()=>{
  const previous=process.env.TZ;process.env.TZ='Africa/Lagos';
  try {
    const {localDateKey,clampGoal}=await import('../src/utils/dates.js');
    const {calculateStreak}=await import('../src/utils/achievements.js');
    const now=new Date('2026-10-17T23:30:00Z');
    assert.equal(localDateKey(now),'2026-10-18');
    assert.equal(calculateStreak({'2026-10-16':600,'2026-10-17':600,'2026-10-18':5},10,now),2);
    assert.equal(calculateStreak({'2026-10-17':600,'2026-10-18':600},10,now),2);
    assert.equal(clampGoal(999),180);assert.equal(clampGoal(-1),1);assert.equal(clampGoal('bad'),10);
  } finally {if(previous===undefined) delete process.env.TZ;else process.env.TZ=previous;}
});
test('account switching isolates reading and memorization along with favorites',async()=>{
  const values=new Map();global.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const {emptyProgress,switchAccountProgress}=await import('../src/utils/accountProgress.js');
  const guest={...emptyProgress(),readingPage:3};
  const first=switchAccountProgress('account-a',guest);
  assert.equal(first.readingPage,3);
  const accountA={...first,readingPage:42,memorizationProgress:{1:{reviewedVerses:[0,1]}}};
  const accountB=switchAccountProgress('account-b',accountA);
  assert.equal(accountB.readingPage,1);assert.deepEqual(accountB.memorizationProgress,{});
  const restored=switchAccountProgress('account-a',accountB);
  assert.equal(restored.readingPage,42);assert.deepEqual(restored.memorizationProgress[1].reviewedVerses,[0,1]);
  delete global.localStorage;
});
