const appUrl=process.env.SHOPIFY_APP_URL || process.env.APP_URL || process.env.HOST;
const secret=process.env.CRON_SECRET;
if(!appUrl || !secret)throw new Error("Set SHOPIFY_APP_URL and CRON_SECRET before starting the sync worker.");
const endpoint=new URL("/api/sync",appUrl);
if(endpoint.protocol!=="https:" && endpoint.hostname!=="localhost")throw new Error("The sync endpoint must use HTTPS.");
let stopped=false,timer;
const stop=()=>{stopped=true;clearTimeout(timer);};
process.on("SIGINT",stop);process.on("SIGTERM",stop);
async function tick(){
 try{
  const response=await fetch(endpoint,{method:"POST",redirect:"error",headers:{Authorization:"Bearer "+secret},signal:AbortSignal.timeout(240000)});
  if(!response.ok)throw new Error("Sync endpoint returned HTTP "+response.status);
  const result=await response.json();
  for(const report of result.reports || [])console.log(JSON.stringify({at:new Date().toISOString(),...report}));
 }catch(error){console.error("Scheduled sync failed:",error.message);}
 if(!stopped)timer=setTimeout(tick,5*60*1000);
}
console.log("Journal sync worker started; checking every five minutes.");
await tick();
