export const REGIONS={
 seoul:{name:'서울',latitude:37.5665,longitude:126.978},busan:{name:'부산',latitude:35.1796,longitude:129.0756},
 incheon:{name:'인천',latitude:37.4563,longitude:126.7052},daegu:{name:'대구',latitude:35.8714,longitude:128.6014},
 daejeon:{name:'대전',latitude:36.3504,longitude:127.3845},gwangju:{name:'광주',latitude:35.1595,longitude:126.8526},
 ulsan:{name:'울산',latitude:35.5384,longitude:129.3114},sejong:{name:'세종',latitude:36.4801,longitude:127.289},
 chuncheon:{name:'춘천',latitude:37.8813,longitude:127.7298},gangneung:{name:'강릉',latitude:37.7519,longitude:128.8761},
 cheongju:{name:'청주',latitude:36.6424,longitude:127.489},jeonju:{name:'전주',latitude:35.8242,longitude:127.148},
 jeju:{name:'제주',latitude:33.4996,longitude:126.5312}
};
export const WEATHER_REFRESH_MS=10*60*1000,WEATHER_MAX_AGE_MS=3*60*60*1000;
export function koreanClock(now=Date.now()){
 const d=new Date(now+9*60*60*1000),pad=n=>String(n).padStart(2,'0');
 return {date:`${d.getUTCFullYear()}.${pad(d.getUTCMonth()+1)}.${pad(d.getUTCDate())}`,time:`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,hour:d.getUTCHours()+d.getUTCMinutes()/60};
}
export function weatherKind(code){
 if(code===0)return 'clear';if([1,2,3].includes(code))return 'cloud';if([45,48].includes(code))return 'fog';
 if([71,73,75,77,85,86].includes(code))return 'snow';if([95,96,99].includes(code))return 'storm';
 if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return 'rain';return null;
}
export const WEATHER_LABELS={clear:'맑음',cloud:'구름',fog:'안개',rain:'비',snow:'눈',storm:'뇌우'};
export function roomEnvironment(now=Date.now(),weather=null){
 const clock=koreanClock(now),fresh=weather&&now>=weather.fetchedAt&&now-weather.fetchedAt<=WEATHER_MAX_AGE_MS;
 const current=fresh?weather:null;
 const rise=current?.sunrise?Date.parse(current.sunrise):NaN,set=current?.sunset?Date.parse(current.sunset):NaN;
 let period;
 if(Number.isFinite(rise)&&Number.isFinite(set)&&koreanClock(rise).date===clock.date){
  period=now<rise-30*60000||now>=set+60*60000?'night':now<rise+3*60*60000?'morning':now>=set-60*60000?'evening':'day';
 }else period=clock.hour<5||clock.hour>=20?'night':clock.hour<10?'morning':clock.hour<17?'day':'evening';
 return {...clock,period,periodLabel:({morning:'아침',day:'낮',evening:'저녁',night:'밤'})[period],weather:current?weatherKind(current.code):null,current};
}
export function weatherURL(region){
 const r=REGIONS[region];if(!r)throw new Error('날씨 지역을 선택하세요.');
 const url=new URL('https://api.open-meteo.com/v1/forecast');
 url.search=new URLSearchParams({latitude:r.latitude,longitude:r.longitude,current:'temperature_2m,weather_code,is_day',daily:'sunrise,sunset',timezone:'Asia/Seoul',forecast_days:'1'}).toString();return url.href;
}
export function parseWeather(data,region,now=Date.now()){
 const c=data?.current;
 if(!REGIONS[region]||!c||!Number.isFinite(c.temperature_2m)||!weatherKind(c.weather_code))throw new Error('날씨 응답을 읽지 못했습니다.');
 const observedAt=Date.parse(c.time+'+09:00');
 if(!Number.isFinite(observedAt)||Math.abs(now-observedAt)>WEATHER_MAX_AGE_MS)throw new Error('최신 날씨를 받지 못했습니다.');
 const solar=v=>typeof v==='string'&&Number.isFinite(Date.parse(v+'+09:00'))?v+'+09:00':null;
 return {region,temperature:c.temperature_2m,code:c.weather_code,fetchedAt:now,observedAt,sunrise:solar(data.daily?.sunrise?.[0]),sunset:solar(data.daily?.sunset?.[0])};
}
export async function fetchWeather(region,{fetcher=fetch,now=Date.now(),signal}={}){
 const response=await fetcher(weatherURL(region),{signal});if(!response.ok)throw new Error('날씨 연결에 실패했습니다.');
 return parseWeather(await response.json(),region,now);
}
