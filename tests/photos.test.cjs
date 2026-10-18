const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('known reciter aliases use existing portraits and ambiguous names use the silhouette',async()=>{
 const {getReciterAvatarUrl,getReciterPhotoPath}=await import('../src/utils/reciterPhotos.js');
 for(const name of ['Ali Jaber','Abdul Basit','Saad Al-Ghamdi','Abdul Rahman Al-Sudais','Mohammed Ayyub','Muhammad Ayub','Mishary Alafasi']){
  const photo=getReciterPhotoPath(name);assert.ok(photo,name);assert.ok(fs.existsSync(path.join('public',photo)),photo);
 }
 for(const name of ['Mousa Abdullah','Ahmad Abdullah','A New Reciter',null])assert.match(getReciterAvatarUrl(name),/reciter-silhouette\.svg$/);
 assert.equal(getReciterAvatarUrl('Sheikh Ali Jaber'),getReciterAvatarUrl('Ali Jaber'));
});
