(() => {
    const $ = id => document.getElementById(id);
    let data = {sessions:[],events:[]}, bySession = new Map(), filtered = [];
    const labels = {hero:'Первый экран',about:'О курсе',program:'Программа',injuries:'Виды травм',legal:'Юридические аспекты',photo:'Фотография',instructors:'Инструкторы',pricing:'Тарифы',registration:'Регистрация',footer:'Подвал','cta-floating':'Плавающая кнопка записи','cta-hero':'Кнопка на первом экране','cta-program':'Кнопка после программы','cta-1':'Базовый: записаться','cta-2':'Расширенный: записаться','cta-3':'Корпоративный: записаться','field-name':'Поле имени','field-phone':'Поле телефона','field-email':'Поле email','field-purpose':'Цель обучения',submit:'Отправить заявку',page:'Страница'};
    const kinds = {page:'Загрузка',click:'Клик',focus:'Фокус поля',dwell:'Время видимости',scroll:'Глубина просмотра',cta:'Кнопка записи',form_view:'Первое поле видно',form_start:'Начало заполнения',submit_view:'Кнопка отправки видна',validation_error:'Ошибка поля',submit:'Отправка',submit_error:'Ошибка отправки',success:'Успешная заявка',end:'Вкладка скрыта / уход'};
    const name = key => labels[key] || key;
    const el = (tag,text) => {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
    const events = s => bySession.get(s.id) || [];
    const has = (s,kind) => events(s).some(e=>e.kind===kind);
    const pct = (n,d) => d ? `${(100*n/d).toFixed(1)}%` : '—';
    const med = values => {if(!values.length)return '—';values.sort((a,b)=>a-b);const i=Math.floor(values.length/2);return (((values[i]+values[Math.floor((values.length-1)/2)])/2)/1000).toFixed(1)+' с';};
    const table = (id,heads,rows) => {const t=el('table'),h=el('tr');heads.forEach(x=>h.append(el('th',x)));t.append(h);rows.forEach(row=>{const tr=el('tr');row.forEach(v=>{const td=el('td');if(v instanceof Node)td.append(v);else td.textContent=v;tr.append(td);});t.append(tr);});$(id).replaceChildren(t);};
    const options = (id,items) => {const old=$(id).value;$(id).replaceChildren(...items.map(([v,t])=>{const o=el('option',t);o.value=v;return o;}));if(items.some(([v])=>v===old))$(id).value=old;};
    const dwellMs = (s,target) => Math.max(0,...events(s).filter(e=>e.kind==='dwell'&&e.target===target).map(e=>e.value));
    const render = () => {
        filtered=data.sessions.filter(s=>(!$('version').value||s.version===$('version').value)&&(!$('device').value||s.device===$('device').value)&&($('qa').checked||!s.qa)&&(!$('from').value||s.started >= $('from').value+':00Z')&&(!$('to').value||s.started <= $('to').value+':59Z')&&(!$('outcome').value||has(s,'success')===($('outcome').value==='yes')));
        const successes=filtered.filter(s=>has(s,'success')).length;
        $('summary').replaceChildren(...[['Загрузки страницы',filtered.length],['Подтверждения API',successes],['Конверсия по телеметрии',pct(successes,filtered.length)],['С ошибкой отправки',filtered.filter(s=>has(s,'submit_error')).length]].map(([label,value])=>{const d=el('div');d.className='stat';d.append(el('strong',value),el('span',label));return d;}));
        table('funnel',['Событие','Загрузки','Доля'],['page','cta','form_view','focus','form_start','submit','success','validation_error','submit_error'].map(k=>{const n=filtered.filter(s=>has(s,k)).length;return [kinds[k],n,pct(n,filtered.length)];}));
        table('sections',['Секция','Видели ≥ ~1 с','Охват','Медиана среди видевших'],['hero','about','program','injuries','legal','photo','instructors','pricing','registration','footer'].map(target=>{const times=filtered.map(s=>dwellMs(s,target)).filter(v=>v>0);const bar=el('div');bar.style.cssText='min-width:120px;background:#edf3ef';const fill=el('div',pct(times.length,filtered.length));fill.style.cssText=`min-width:40px;width:${filtered.length?100*times.length/filtered.length:0}%;background:#8bcbb2;padding:4px`;bar.append(fill);return[name(target),times.length,bar,med(times)];}));
        const clicks=filtered.flatMap(events).filter(e=>e.kind==='click');
        const targets=[...new Set(clicks.map(e=>e.target))].sort((a,b)=>clicks.filter(e=>e.target===b).length-clicks.filter(e=>e.target===a).length);
        options('target',targets.map(t=>[t,name(t)]));
        table('clicks',['Элемент','Клики','Загрузки с кликом'],targets.map(t=>[name(t),clicks.filter(e=>e.target===t).length,filtered.filter(s=>events(s).some(e=>e.kind==='click'&&e.target===t)).length]));
        renderHeat();
        const groups=[filtered.filter(s=>has(s,'success')),filtered.filter(s=>!has(s,'success'))];
        const latency = group => group.flatMap(s=>{const ev=events(s),cta=ev.find(e=>e.kind==='cta'),start=ev.find(e=>e.kind==='form_start'&&(!cta||e.time_ms>=cta.time_ms));return cta&&start?[start.time_ms-cta.time_ms]:[];});
        table('compare',['Показатель','С заявкой','Без подтверждения'],[
            ['Загрузки',...groups.map(g=>g.length)],
            ['Видели первое поле',...groups.map(g=>pct(g.filter(s=>has(s,'form_view')).length,g.length))],
            ['Фокусировали поле',...groups.map(g=>pct(g.filter(s=>has(s,'focus')).length,g.length))],
            ['Медиана: клик → ввод (если оба есть)',...groups.map(g=>med(latency(g)))],
            ['Медиана видимости регистрации (среди видевших)',...groups.map(g=>med(g.map(s=>dwellMs(s,'registration')).filter(v=>v>0)))],
            ['Начали ввод',...groups.map(g=>pct(g.filter(s=>has(s,'form_start')).length,g.length))],
        ]);
        options('session',filtered.map(s=>[s.id,`${s.started} · ${s.device} · ${has(s,'success')?'заявка':'без подтверждения'} · ${s.id.slice(0,8)}`]));renderTimeline();
    };
    const renderHeat = () => {
        const target=$('target').value,clicks=filtered.flatMap(events).filter(e=>e.kind==='click'&&e.target===target),points=clicks.filter(e=>e.x>=0&&e.y>=0),bins=new Map();
        points.forEach(e=>{const key=`${Math.min(29,Math.floor(e.x*30))},${Math.min(11,Math.floor(e.y*12))}`;bins.set(key,(bins.get(key)||0)+1);});
        const max=Math.max(1,...bins.values()),svg=$('heat');svg.replaceChildren();
        bins.forEach((n,key)=>{const [x,y]=key.split(',').map(Number),r=document.createElementNS('http://www.w3.org/2000/svg','rect');r.setAttribute('x',x*20);r.setAttribute('y',y*20);r.setAttribute('width',20);r.setAttribute('height',20);r.setAttribute('fill',`hsl(${45-45*n/max} 85% 50%)`);r.setAttribute('opacity',.25+.75*n/max);const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=`${n} кликов`;r.append(title);svg.append(r);});
        $('heat-note').textContent=target?`${name(target)}: ${points.length} кликов с координатами; ${clicks.length-points.length} без координат (например, клавиатура). Цвет нормирован внутри элемента.`:'Кликов пока нет.';
    };
    const renderTimeline=()=>{const ev=bySession.get($('session').value)||[];table('timeline',['От загрузки','Действие','Элемент','Детали'],ev.map(e=>[(e.time_ms/1000).toFixed(1)+' с',kinds[e.kind]||e.kind,name(e.target),e.kind==='dwell'?(e.value/1000).toFixed(1)+' с накоплено':e.kind==='scroll'?e.value+'%':e.kind==='click'&&e.x>=0?`${Math.round(e.x*100)}%, ${Math.round(e.y*100)}%`:'']));};
    const load=async()=>{try{const r=await fetch('?export=1',{cache:'no-store'});if(!r.ok)throw Error('Отчёт недоступен. Проверьте вход в админку.');data=await r.json();bySession=new Map();data.events.forEach(e=>{if(!bySession.has(e.sid))bySession.set(e.sid,[]);bySession.get(e.sid).push(e);});options('version',[['','Все версии'],...[...new Set(data.sessions.map(s=>s.version))].map(v=>[v,v])]);$('status').className='';$('status').textContent=`Обновлено ${data.generated_at}. Загружено ${data.sessions.length} записей, ${data.events.length} событий.`;render();}catch(e){$('status').className='error';$('status').textContent=e.message;}};
    ['version','device','outcome','from','to','qa'].forEach(id=>$(id).addEventListener('change',render));$('target').addEventListener('change',renderHeat);$('session').addEventListener('change',renderTimeline);$('refresh').addEventListener('click',load);void load();
})();
