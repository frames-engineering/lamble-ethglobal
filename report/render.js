const { chromium } = require('/opt/node-tools/node_modules/playwright');
const names=['01-cover','02-fees-over-time','03-fees-by-venue','04-narrative-heatmap','05-narrative-lifespans','06-tracked-volume','07-launch-activity'];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  for(let i=1;i<=names.length;i++){
    await p.goto('file://'+process.cwd()+'/report/images.html#'+i); await p.reload(); await p.waitForTimeout(200);
    await p.screenshot({path:`report/${names[i-1]}.png`});
  }
  console.log('errors',errs); await b.close();
})();
