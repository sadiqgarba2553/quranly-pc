import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('confirmation UI accepts redirected email links and offers resend and recovery',async()=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-confirmation-'));
  const env={...process.env,QURANLY_TEST_PROFILE:profile};delete env.ELECTRON_RUN_AS_NODE;
  const executablePath=process.env.QURANLY_TEST_EXE;
  const app=await electron.launch({executablePath,args:executablePath ? [`--user-data-dir=${profile}`] : ['.'],env});
  try {
    const page=await app.firstWindow();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let userRequests=0,resends=0;
    await page.context().route('https://*.supabase.co/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/auth/v1/resend') {resends++;await route.fulfill({json:{}});return;}
      if(url.pathname==='/auth/v1/user') {
        userRequests++;
        await route.fulfill({json:{id:'00000000-0000-0000-0000-000000000123',aud:'authenticated',role:'authenticated',email:'fixture@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{display_name:'Confirmation test'},app_metadata:{provider:'email'}}});return;
      }
      await route.fulfill({json:[]});
    });
    await page.getByRole('button',{name:'Skip setup'}).click();
    await page.getByRole('link',{name:'Settings',exact:true}).click();
    await page.getByRole('button',{name:/Sign In \/ Register Account/}).click();
    await page.getByRole('button',{name:'Confirm an email link',exact:true}).click();
    await page.getByLabel('Email address',{exact:true}).fill('fixture@example.test');
    await page.getByRole('button',{name:'Resend confirmation email'}).click();
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('a new email has been sent');
    expect(resends).toBe(1);
    const field=page.getByLabel('Email confirmation or recovery link',{exact:true});
    await field.fill('http://localhost:3000/#error=access_denied&error_code=otp_expired');
    await page.getByRole('button',{name:'Confirm email',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('expired or was already used');
    await field.fill('http://localhost:3000/#access_token=incomplete&type=signup');
    await page.getByRole('button',{name:'Confirm email',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('incomplete');
    expect(userRequests).toBe(0);
    const project='https://rplxdjpbsbhorpucacic.supabase.co';
    const access=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({iss:project+'/auth/v1',exp:Math.floor(Date.now()/1000)+3600,sub:'00000000-0000-0000-0000-000000000123'})).toString('base64url')}.${Buffer.from('fixture-signature').toString('base64url')}`;
    await field.fill(`http://localhost:3000/#${new URLSearchParams({access_token:access,refresh_token:'fixture-refresh',type:'signup'})}`);
    await page.getByRole('button',{name:'Confirm email',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Your account',exact:true})).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Email confirmed. You are signed in.');
    expect(userRequests).toBeGreaterThan(0);
    await page.screenshot({path:'test-results/email-confirmation-fixed.png'});
    expect(errors).toEqual([]);
  } finally {await app.close();await fs.rm(profile,{recursive:true,force:true});}
});
