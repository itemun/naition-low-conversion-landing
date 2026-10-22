(() => {
    'use strict';
    // A fresh random ID identifies this page load only; never read form values or text.
    const bytes = new Uint8Array(16);
    try { crypto.getRandomValues(bytes); } catch (_) { return; }
    const id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const version = 'exp02-accordion-program';
    const qa = new URLSearchParams(location.search).get('analytics_qa') === '1';
    // Avoid collecting the live page embedded by Metrica's map viewer.
    if (new URLSearchParams(location.search).has('_ym_debug')) return;
    const started = performance.now();
    let sequence = 0, queue = [], sending = false, lastTick = performance.now();
    const sections = [], dwell = new Map(), sentDwell = new Map();
    const emit = (kind, target = 'page', value = 0, x = -1, y = -1) => {
        if (sequence >= 3000 || queue.length >= 500) return;
        queue.push({ seq: ++sequence, ms: Math.round(performance.now() - started), kind, target, value, x, y });
    };
    const envelope = events => JSON.stringify({ id, version, qa, device: innerWidth <= 720 ? 'mobile' : 'desktop', events });
    const flush = async () => {
        if (sending || !queue.length) return;
        sending = true;
        const batch = queue.slice(0, 100);
        try {
            const response = await fetch('telemetry/collect.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: envelope(batch), keepalive: true, credentials: 'omit' });
            if (response.ok) queue = queue.filter(e => e.seq > batch.at(-1).seq);
        } catch (_) { /* Keep the bounded queue for the next heartbeat. */ }
        finally { sending = false; }
    };
    const mark = (el, name) => { if (el) el.dataset.analyticsTarget = name; };
    const tick = () => {
        const now = performance.now(), delta = Math.min(now - lastTick, 1500); lastTick = now;
        if (document.visibilityState !== 'visible') return;
        sections.forEach(el => {
            const r = el.getBoundingClientRect();
            const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
            if (visible >= Math.min(r.height, innerHeight) * 0.5) {
                const key = el.dataset.analyticsTarget;
                dwell.set(key, (dwell.get(key) || 0) + delta);
            }
        });
    };
    const snapshotDwell = () => {
        dwell.forEach((ms, key) => {
            const value = Math.round(ms);
            if (sentDwell.get(key) !== value) { emit('dwell', key, value); sentDwell.set(key, value); }
        });
    };
    const end = () => {
        tick(); snapshotDwell(); emit('end');
        // At-least-once delivery; server deduplicates events by page ID + sequence.
        if (navigator.sendBeacon) {
            for (let i = 0; i < queue.length; i += 100) {
                const data = new Blob([envelope(queue.slice(i, i + 100))], { type: 'application/json' });
                if (!navigator.sendBeacon('telemetry/collect.php', data)) break;
            }
        } else void flush();
    };
    window.landingTelemetry = { track(goal, params = {}) {
        const mapping = { registration_page_view:'page', registration_cta_click:'cta', registration_form_view:'form_view', registration_form_start:'form_start', registration_submit_view:'submit_view', registration_validation_error:'validation_error', registration_submit:'submit', registration_submit_error:'submit_error', registration_success:'success' };
        const kind = mapping[goal];
        if (!kind) return;
        const placement = { hero:'cta-hero', program:'cta-program', pricing_1:'cta-1', pricing_2:'cta-2', pricing_3:'cta-3' }[params.placement];
        const field = ['name','phone','email','purpose'].includes(params.field) ? `field-${params.field}` : null;
        emit(kind, field || placement || (kind === 'page' ? 'page' : 'registration'));
        if (kind === 'success' || kind === 'submit_error') void flush();
    } };
    document.addEventListener('DOMContentLoaded', () => {
        const names = ['about','program','injuries','legal','photo','instructors','pricing','registration'];
        mark(document.querySelector('.hero'), 'hero');
        document.querySelectorAll('main > section').forEach((el, i) => mark(el, names[i]));
        mark(document.querySelector('footer'), 'footer');
        sections.push(...document.querySelectorAll('.hero, main > section, footer'));
        [['.feature-card','feature'],['.program-module','module'],['.injury-card','injury'],['.instructor-card','instructor'],['.pricing-card','tariff']].forEach(([selector,prefix]) => document.querySelectorAll(selector).forEach((el,i)=>mark(el,`${prefix}-${i+1}`)));
        let price = 0;
        document.querySelectorAll('.btn-register').forEach(el => mark(el, `cta-${el.dataset.cta || ++price}`));
        ['name','phone','email','purpose'].forEach(name=>mark(document.querySelector(`#registration-form [name="${name}"]`),`field-${name}`));
        mark(document.querySelector('#registration-form button[type="submit"]'),'submit');
        document.addEventListener('click', event => {
            const el = event.target.closest?.('[data-analytics-target]'); if (!el) return;
            const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
            const clamp = n => Math.max(0, Math.min(1, n));
            // Keyboard activation has no meaningful pointer coordinates.
            emit('click', el.dataset.analyticsTarget, 0, event.detail ? clamp((event.clientX-r.left)/r.width) : -1, event.detail ? clamp((event.clientY-r.top)/r.height) : -1);
        }, true);
        document.addEventListener('focusin', event => {
            const target = event.target.dataset?.analyticsTarget;
            if (target?.startsWith('field-')) emit('focus', target);
        });
        let maxDepth = -1;
        const scroll = () => {
            const depth = Math.min(100, Math.floor((scrollY + innerHeight) / Math.max(document.documentElement.scrollHeight, innerHeight) * 20) * 5);
            if (depth > maxDepth) { maxDepth = depth; emit('scroll', 'page', depth); }
        };
        addEventListener('scroll', scroll, { passive: true }); scroll();
        setInterval(tick, 1000);
        setInterval(() => { snapshotDwell(); void flush(); }, 4000);
        document.addEventListener('visibilitychange', () => { if (document.hidden) end(); else lastTick = performance.now(); });
        addEventListener('pagehide', end);
        void flush();
    });
})();
